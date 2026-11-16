"use server";
/**
 * Actions de MEMBROS de ministério.
 * Quem pode: ADM ou líder do ministério (requireLeaderOf aceita os dois).
 * Exceção: marcar/desmarcar LÍDER é só ADM (trigger no banco também garante).
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireLeaderOf } from "@/lib/auth/session";
import { friendlyError, type ActionState } from "./types";

function paths(ministryId: string) {
  return [`/admin/ministerios/${ministryId}`, `/lider/${ministryId}/membros`, `/ministerios/${ministryId}`];
}

export async function addMember(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ministry_id = String(fd.get("ministry_id"));
  const profile_id = String(fd.get("profile_id") ?? "");
  const ministry_role_id = String(fd.get("ministry_role_id") ?? "") || null;
  if (!profile_id) return { error: "Selecione uma pessoa" };

  await requireLeaderOf(ministry_id);
  const supabase = await createClient();
  const { error } = await supabase.from("ministry_members").insert({ ministry_id, profile_id, ministry_role_id });
  if (error) {
    if (error.message.includes("duplicate key")) return { error: "Essa pessoa já está neste ministério." };
    return { error: friendlyError(error.message) };
  }
  paths(ministry_id).forEach((p) => revalidatePath(p));
  return { ok: "Membro adicionado." };
}

export async function setMemberRole(memberId: string, ministryId: string, roleId: string | null): Promise<ActionState> {
  await requireLeaderOf(ministryId);
  const supabase = await createClient();
  const { error } = await supabase.from("ministry_members").update({ ministry_role_id: roleId }).eq("id", memberId);
  if (error) return { error: friendlyError(error.message) };
  paths(ministryId).forEach((p) => revalidatePath(p));
  return { ok: "Cargo atualizado." };
}

export async function removeMember(memberId: string, ministryId: string): Promise<ActionState> {
  await requireLeaderOf(ministryId);
  const supabase = await createClient();
  const { error } = await supabase.from("ministry_members").delete().eq("id", memberId);
  if (error) return { error: friendlyError(error.message) };
  paths(ministryId).forEach((p) => revalidatePath(p));
  revalidatePath("/", "layout");
  return { ok: "Membro removido." };
}

/** Só ADM. */
export async function setMemberLeader(memberId: string, ministryId: string, isLeader: boolean): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("ministry_members").update({ is_leader: isLeader }).eq("id", memberId);
  if (error) return { error: friendlyError(error.message) };
  paths(ministryId).forEach((p) => revalidatePath(p));
  revalidatePath("/", "layout");
  return { ok: isLeader ? "Definido como líder." : "Liderança removida." };
}
