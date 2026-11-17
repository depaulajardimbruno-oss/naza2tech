"use server";
/**
 * Actions de ESCALAS.
 *
 * Fluxo:
 *   1. Líder/vice escala alguém num evento (assignSchedule) -> fica como RASCUNHO (published=false).
 *      Ao escalar, checamos conflito com outros ministérios (RPC check_schedule_conflicts)
 *      e devolvemos um AVISO; a escala é criada mesmo assim (o líder decide).
 *   2. Líder publica a escala do evento (publishEvent) -> voluntário passa a ver.
 *   3. Voluntário confirma ou recusa com motivo (respondSchedule -> RPC respond_to_schedule).
 *
 * Permissões: RLS de schedules (líder/vice do ministério ou ADM; ministério com escala ativa)
 * e a própria RPC (só o dono da escala responde, e só escala publicada).
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireLeaderOf, requireSession } from "@/lib/auth/session";
import { friendlyError, type ActionState } from "./types";
import { formatDay, hhmm } from "@/lib/format";

export type ScheduleState = ActionState & { warning?: string };

function refresh(ministryId?: string) {
  if (ministryId) {
    revalidatePath(`/lider/${ministryId}/escalas`);
    revalidatePath(`/lider/${ministryId}/pendencias`);
    revalidatePath(`/ministerios/${ministryId}`);
  }
  revalidatePath("/minha-agenda");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

const assignSchema = z.object({
  ministry_id: z.string().uuid(),
  event_id: z.string().uuid(),
  // ministry_members.id, ou "p:<profileId>" quando o ADM escala alguém de fora da equipe
  member_id: z.string().regex(/^(p:)?[0-9a-f-]{36}$/i, "Escolha a pessoa"),
  role_id: z.string().uuid("Escolha a função"),
});

export async function assignSchedule(_p: ScheduleState, fd: FormData): Promise<ScheduleState> {
  const parsed = assignSchema.safeParse({
    ministry_id: fd.get("ministry_id"),
    event_id: fd.get("event_id"),
    member_id: fd.get("member_id"),
    role_id: fd.get("role_id"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const session = await requireLeaderOf(d.ministry_id);
  const supabase = await createClient();

  // ADM escalando alguém que ainda não é da equipe: coloca na equipe primeiro (com essa função como cargo padrão).
  if (d.member_id.startsWith("p:")) {
    if (!session.isAdmin) return { error: "Só o ADM pode escalar alguém de fora da equipe." };
    const { data: mm, error: mErr } = await supabase
      .from("ministry_members")
      .insert({ profile_id: d.member_id.slice(2), ministry_id: d.ministry_id, ministry_role_id: d.role_id })
      .select("id")
      .single();
    if (mErr) return { error: friendlyError(mErr.message) };
    d.member_id = mm.id;
    revalidatePath(`/admin/ministerios/${d.ministry_id}`);
    revalidatePath(`/lider/${d.ministry_id}/membros`);
  }

  const { error } = await supabase.from("schedules").insert({
    ministry_id: d.ministry_id,
    event_id: d.event_id,
    ministry_member_id: d.member_id,
    ministry_role_id: d.role_id,
  });
  if (error) {
    if (error.message.includes("duplicate key")) return { error: "Essa pessoa já está escalada neste evento." };
    if (error.message.includes("row-level security"))
      return { error: "Sem permissão (ou o ministério está com a escala desligada)." };
    return { error: friendlyError(error.message) };
  }

  // Conflito com outros ministérios no mesmo horário: avisa, não bloqueia.
  const { data: conflicts } = await supabase.rpc("check_schedule_conflicts", {
    p_member_id: d.member_id,
    p_event_id: d.event_id,
  });
  refresh(d.ministry_id);
  if (conflicts?.length) {
    const list = conflicts
      .map((c) => `${c.ministry_name} — ${c.event_title} (${formatDay(c.starts_at.slice(0, 10))}, ${hhmm(c.starts_at.slice(11))})`)
      .join("; ");
    return { ok: "Escalado.", warning: `Atenção: essa pessoa também está escalada em ${list}.` };
  }
  return { ok: "Escalado." };
}

export async function removeSchedule(id: string, ministryId: string): Promise<ActionState> {
  await requireLeaderOf(ministryId);
  const supabase = await createClient();
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) return { error: friendlyError(error.message) };
  refresh(ministryId);
  return { ok: "Removido da escala." };
}

/** Publica todos os rascunhos do ministério naquele evento. */
export async function publishEvent(ministryId: string, eventId: string): Promise<ActionState> {
  await requireLeaderOf(ministryId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedules")
    .update({ published: true })
    .eq("ministry_id", ministryId)
    .eq("event_id", eventId)
    .eq("published", false)
    .select("id");
  if (error) return { error: friendlyError(error.message) };
  refresh(ministryId);
  return { ok: `Escala publicada (${data?.length ?? 0}). A equipe já pode confirmar.` };
}

const respondSchema = z
  .object({
    schedule_id: z.string().uuid(),
    status: z.enum(["confirmado", "recusado"]),
    reason: z.string().trim().max(300).optional(),
    swap: z.boolean(),
  })
  .refine((v) => v.status === "confirmado" || !!v.reason, { message: "Conte o motivo para o líder." });

export async function respondSchedule(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = respondSchema.safeParse({
    schedule_id: fd.get("schedule_id"),
    status: fd.get("status"),
    reason: String(fd.get("reason") ?? "") || undefined,
    swap: fd.get("swap") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("respond_to_schedule", {
    p_schedule_id: d.schedule_id,
    p_status: d.status,
    p_reason: d.reason,
    p_swap: d.swap,
  });
  if (error) return { error: friendlyError(error.message) };
  refresh(data?.ministry_id);
  return { ok: d.status === "confirmado" ? "Presença confirmada. Obrigado!" : "Ausência informada ao líder." };
}
