"use server";
/**
 * Actions de MEMBROS de ministério.
 * Quem pode: ADM ou líder do ministério. Colocar/remover pessoas: só ADM ou líder TITULAR;
 * trocar cargo: líder ou vice.
 * Exceção: marcar/desmarcar LÍDER é só ADM (trigger no banco também garante).
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireLeaderOf } from "@/lib/auth/session";
import { friendlyError, type ActionState } from "./types";

function paths(ministryId: string) {
  return [`/admin/ministerios/${ministryId}`, `/lider/${ministryId}/membros`, `/ministerios/${ministryId}`];
}

/** Garante que quem chama é ADM ou LÍDER TITULAR (vice não coloca/remove pessoas). */
async function requireMainLeader(ministryId: string) {
  const s = await requireLeaderOf(ministryId);
  if (!s.isAdmin && !s.mainLeaderOf.includes(ministryId)) return null;
  return s;
}

/** Colocar pessoa na equipe: só ADM ou líder titular. */
export async function addMember(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ministry_id = String(fd.get("ministry_id"));
  const profile_id = String(fd.get("profile_id") ?? "");
  const ministry_role_id = String(fd.get("ministry_role_id") ?? "") || null;
  if (!profile_id) return { error: "Selecione uma pessoa" };

  if (!(await requireMainLeader(ministry_id))) return { error: "Só o líder do ministério pode colocar pessoas na equipe." };
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

/** Remover pessoa da equipe: só ADM ou líder titular. */
export async function removeMember(memberId: string, ministryId: string): Promise<ActionState> {
  if (!(await requireMainLeader(ministryId))) return { error: "Só o líder do ministério pode remover pessoas da equipe." };
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
  if (error) {
    if (error.message.includes("leader_or_vice")) return { error: "Tire a vice-liderança antes de tornar líder." };
    return { error: friendlyError(error.message) };
  }
  paths(ministryId).forEach((p) => revalidatePath(p));
  revalidatePath("/", "layout");
  return { ok: isLeader ? "Definido como líder." : "Liderança removida." };
}

/**
 * Nomeia/remove VICE-LÍDER. Pode: ADM ou o líder TITULAR do ministério.
 * O trigger guard_leader_flag repete essa regra no banco.
 */
export async function setMemberVice(memberId: string, ministryId: string, isVice: boolean): Promise<ActionState> {
  const s = await requireLeaderOf(ministryId);
  if (!s.isAdmin && !s.mainLeaderOf.includes(ministryId))
    return { error: "Só o líder do ministério pode nomear vice-líder." };
  const supabase = await createClient();
  const { error } = await supabase.from("ministry_members").update({ is_vice_leader: isVice }).eq("id", memberId);
  if (error) {
    if (error.message.includes("leader_or_vice")) return { error: "O líder não pode ser vice ao mesmo tempo." };
    return { error: friendlyError(error.message) };
  }
  paths(ministryId).forEach((p) => revalidatePath(p));
  revalidatePath("/", "layout");
  return { ok: isVice ? "Definido como vice-líder." : "Vice-liderança removida." };
}
