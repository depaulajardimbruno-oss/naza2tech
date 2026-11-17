"use server";
/**
 * Actions do CADASTRO DE PESSOA.
 *  - saveMyPerson     : a própria pessoa (página Conta)
 *  - adminSavePerson  : ADM editando qualquer usuário (/admin/usuarios/[id])
 *  - adminChangeEmail : ADM troca o e-mail de login (Auth + profiles)
 *  - adminResetPassword: ADM gera nova senha provisória
 * O RLS de profiles/profile_details também garante "só a pessoa ou o ADM".
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireSession } from "@/lib/auth/session";
import { parsePerson, splitPerson } from "@/lib/people/schema";
import { friendlyError, type ActionState } from "./types";

async function savePerson(profileId: string, fd: FormData): Promise<ActionState> {
  const parsed = parsePerson(fd);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { profile, details } = splitPerson(parsed.data);

  const supabase = await createClient();
  const { error: e1 } = await supabase.from("profiles").update(profile).eq("id", profileId);
  if (e1) return { error: friendlyError(e1.message) };
  const { error: e2 } = await supabase.from("profile_details").upsert({ profile_id: profileId, ...details });
  if (e2) return { error: friendlyError(e2.message) };

  revalidatePath("/", "layout");
  return { ok: "Cadastro salvo." };
}

export async function saveMyPerson(_p: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireSession();
  return savePerson(s.userId, fd);
}

export async function adminSavePerson(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  return savePerson(String(fd.get("profile_id")), fd);
}

export async function adminChangeEmail(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(fd.get("profile_id"));
  const parsed = z.string().trim().toLowerCase().email("E-mail inválido").safeParse(fd.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const admin = createAdminClient();
  if (!admin) return { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY na Vercel." };
  const { error } = await admin.auth.admin.updateUserById(id, { email: parsed.data, email_confirm: true });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return { error: "Esse e-mail já é usado por outra conta." };
    return { error: friendlyError(error.message) };
  }
  await admin.from("profiles").update({ email: parsed.data }).eq("id", id);
  revalidatePath(`/admin/usuarios/${id}`);
  revalidatePath("/admin/usuarios");
  return { ok: "E-mail de acesso alterado. A pessoa passa a entrar com o novo e-mail." };
}

/** Gera senha provisória nova. A senha volta para a tela uma única vez (não é salva). */
export async function adminResetPassword(profileId: string): Promise<ActionState & { password?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) return { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY na Vercel." };
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const password = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => chars[b % chars.length]).join("");
  const { error } = await admin.auth.admin.updateUserById(profileId, { password });
  if (error) return { error: friendlyError(error.message) };
  return { ok: "Senha redefinida.", password };
}
