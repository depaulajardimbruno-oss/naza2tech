"use server";
/** Actions de USUÁRIOS: criar conta (ADM e líder), promover/rebaixar admin e ativar/desativar (só ADM). */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireSession } from "@/lib/auth/session";
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

// ---------- CRIAR USUÁRIO (ADM e LÍDER) ----------
/**
 * Cadastra alguém que ainda não se cadastrou sozinho.
 *
 * Quem pode o quê (a regra é aplicada AQUI, porque o cliente admin ignora o RLS):
 *   ADM          -> qualquer ministério; pode marcar líder, vice-líder e criar outro ADM.
 *   Líder titular -> só nos ministérios que lidera; pode marcar vice-líder.
 *   Vice-líder   -> só nos ministérios em que é vice; sempre como voluntário.
 *
 * Se o e-mail já tem conta, NÃO cria outra: só vincula aos ministérios marcados
 * (e aplica líder/ADM se quem pediu for ADM). Assim o líder consegue "trazer" alguém
 * que já usa o app sem precisar do ADM.
 *
 * Conta nova = já confirmada + SENHA PROVISÓRIA (mostrada uma vez). Motivo: o e-mail
 * padrão do Supabase não entrega para endereços externos de forma confiável.
 */
const newUserSchema = z.object({
  full_name: z.string().trim().min(2, "Informe o nome").max(100),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  ministries: z.array(z.string().uuid()).default([]),
  leader_of: z.array(z.string().uuid()).default([]),
  vice_of: z.array(z.string().uuid()).default([]),
  is_admin: z.boolean().default(false),
});

export type CreateUserState = ActionState & { password?: string; email?: string };

function tempPassword() {
  // Sem caracteres ambíguos (0/O, 1/l/I) para ditar ou mandar por mensagem.
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export async function createUser(_p: CreateUserState, fd: FormData): Promise<CreateUserState> {
  const session = await requireSession();
  if (!session.isAdmin && session.leaderOf.length === 0) return { error: "Apenas ADM ou líder pode cadastrar pessoas." };

  const admin = createAdminClient();
  if (!admin) return { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY na Vercel." };

  const parsed = newUserSchema.safeParse({
    full_name: fd.get("full_name"),
    email: fd.get("email"),
    phone: fd.get("phone") ?? "",
    ministries: fd.getAll("ministries").map(String),
    leader_of: fd.getAll("leader_of").map(String),
    vice_of: fd.getAll("vice_of").map(String),
    is_admin: fd.get("is_admin") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  // ---- Permissões ----
  if (!session.isAdmin) {
    if (d.is_admin || d.leader_of.length) return { error: "Só o ADM pode criar líderes ou administradores." };
    if (d.vice_of.some((m) => !session.mainLeaderOf.includes(m)))
      return { error: "Só o líder do ministério pode nomear vice-líder." };
    const outside = [...d.ministries, ...d.vice_of].filter((m) => !session.leaderOf.includes(m));
    if (outside.length) return { error: "Você só pode cadastrar pessoas nos ministérios que lidera." };
    if (!d.ministries.length && !d.vice_of.length) return { error: "Marque o ministério da pessoa." };
  }
  if (d.vice_of.some((m) => d.leader_of.includes(m)))
    return { error: "A mesma pessoa não pode ser líder e vice no mesmo ministério." };
  const memberOf = [...new Set([...d.ministries, ...d.leader_of, ...d.vice_of])]; // líder/vice também são membros

  // ---- Conta: existente ou nova ----
  const { data: existing } = await admin.from("profiles").select("id").eq("email", d.email).maybeSingle();
  let profileId = existing?.id;
  let password: string | undefined;

  if (!profileId) {
    password = tempPassword();
    const { data, error } = await admin.auth.admin.createUser({
      email: d.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: d.full_name, phone: d.phone || null },
    });
    if (error) return { error: friendlyError(error.message) };
    profileId = data.user.id;
    await admin.from("profiles").update({ full_name: d.full_name, phone: d.phone || null }).eq("id", profileId);
  }

  if (session.isAdmin && d.is_admin) {
    await admin.from("profiles").update({ role_global: "admin" }).eq("id", profileId);
  }

  // ---- Vínculos (ignora os que já existem; promove a líder quando pedido) ----
  if (memberOf.length) {
    const { error: mErr } = await admin.from("ministry_members").upsert(
      memberOf.map((ministry_id) => ({ profile_id: profileId!, ministry_id })),
      { onConflict: "profile_id,ministry_id", ignoreDuplicates: true }
    );
    if (!mErr && d.leader_of.length) {
      await admin
        .from("ministry_members")
        .update({ is_leader: true, is_vice_leader: false })
        .eq("profile_id", profileId)
        .in("ministry_id", d.leader_of);
    }
    if (!mErr && d.vice_of.length) {
      // Não rebaixa quem já é líder titular (a constraint leader_or_vice impediria mesmo).
      await admin
        .from("ministry_members")
        .update({ is_vice_leader: true })
        .eq("profile_id", profileId)
        .eq("is_leader", false)
        .in("ministry_id", d.vice_of);
    }
    if (mErr) return { error: `Falhou ao vincular ministérios: ${friendlyError(mErr.message)}`, password, email: d.email };
  }

  revalidatePath("/admin/usuarios");
  revalidatePath("/", "layout");
  if (!password) return { ok: "Essa pessoa já tinha conta: foi vinculada ao(s) ministério(s) marcado(s)." };
  return { ok: "Usuário criado.", password, email: d.email };
}
