"use server";
/** Actions de USUÁRIOS (só ADM): criar conta, promover/rebaixar admin e ativar/desativar. */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { friendlyError, type ActionState } from "./types";

export async function setUserAdmin(profileId: string, isAdmin: boolean): Promise<ActionState> {
  const s = await requireAdmin();
  if (profileId === s.userId && !isAdmin) return { error: "Você não pode remover seu próprio acesso de administrador." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role_global: isAdmin ? "admin" : "user" })
    .eq("id", profileId);
  if (error) return { error: friendlyError(error.message) };
  revalidatePath("/admin/usuarios");
  return { ok: "Perfil atualizado." };
}

export async function setUserActive(profileId: string, active: boolean): Promise<ActionState> {
  const s = await requireAdmin();
  if (profileId === s.userId && !active) return { error: "Você não pode desativar a si mesmo." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ active }).eq("id", profileId);
  if (error) return { error: friendlyError(error.message) };
  revalidatePath("/admin/usuarios");
  return { ok: active ? "Usuário ativado." : "Usuário desativado." };
}

// ---------- CRIAR USUÁRIO (ADM) ----------
/**
 * O ADM cadastra alguém que ainda não se cadastrou sozinho.
 * Fluxo escolhido: conta criada já confirmada + SENHA PROVISÓRIA gerada aqui.
 *   Motivo: o e-mail padrão do Supabase só entrega para membros do time do projeto
 *   e tem limite baixo por hora, então "convite por e-mail" não chega de forma confiável
 *   enquanto não houver um SMTP próprio. O ADM manda a senha pelo WhatsApp e a pessoa
 *   troca em Conta → Trocar senha.
 * O trigger handle_new_user cria o profile; aqui completamos telefone e ministérios.
 */
const newUserSchema = z.object({
  full_name: z.string().trim().min(2, "Informe o nome").max(100),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  ministries: z.array(z.string().uuid()).default([]),
});

export type CreateUserState = ActionState & { password?: string; email?: string };

function tempPassword() {
  // Sem caracteres ambíguos (0/O, 1/l/I) para ditar ou mandar por mensagem.
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export async function createUser(_p: CreateUserState, fd: FormData): Promise<CreateUserState> {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) return { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY na Vercel." };

  const parsed = newUserSchema.safeParse({
    full_name: fd.get("full_name"),
    email: fd.get("email"),
    phone: fd.get("phone") ?? "",
    ministries: fd.getAll("ministries").map(String),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const password = tempPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email: d.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: d.full_name, phone: d.phone || null },
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return { error: "Já existe uma conta com esse e-mail." };
    return { error: friendlyError(error.message) };
  }

  const id = data.user.id;
  await admin.from("profiles").update({ full_name: d.full_name, phone: d.phone || null }).eq("id", id);
  if (d.ministries.length) {
    const { error: mErr } = await admin
      .from("ministry_members")
      .insert(d.ministries.map((ministry_id) => ({ profile_id: id, ministry_id })));
    if (mErr) return { error: `Conta criada, mas falhou ao vincular ministérios: ${friendlyError(mErr.message)}`, password, email: d.email };
  }

  revalidatePath("/admin/usuarios");
  revalidatePath("/", "layout");
  return { ok: "Usuário criado.", password, email: d.email };
}
