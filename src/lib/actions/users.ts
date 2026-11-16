"use server";
/** Actions de USUÁRIOS (só ADM): promover/rebaixar admin e ativar/desativar. */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
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
