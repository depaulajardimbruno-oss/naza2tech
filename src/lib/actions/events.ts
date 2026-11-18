"use server";
/**
 * Actions de EVENTOS (agenda da igreja).
 * - ministryId nulo  => evento geral da igreja (só ADM).
 * - ministryId       => evento do ministério (ADM ou líder dele).
 * O RLS (policy events_write) repete essa regra no banco.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireLeaderOf, requireSession } from "@/lib/auth/session";
import { friendlyError, type ActionState } from "./types";
import { blockersMessage } from "./blockers";

const time = z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido");
const eventSchema = z.object({
  title: z.string().trim().min(2, "Título muito curto").max(120),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  start_time: time,
  end_time: time.optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function createEvent(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ministryId = String(fd.get("ministry_id") ?? "") || null;
  const session = ministryId ? await requireLeaderOf(ministryId) : await requireAdmin();

  const parsed = eventSchema.safeParse({
    title: fd.get("title"),
    event_date: fd.get("event_date"),
    start_time: fd.get("start_time"),
    end_time: fd.get("end_time") ?? "",
    notes: fd.get("notes") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.end_time && d.end_time <= d.start_time) return { error: "O fim deve ser depois do início." };

  const supabase = await createClient();
  const { error } = await supabase.from("events").insert({
    title: d.title,
    event_date: d.event_date,
    start_time: d.start_time,
    end_time: d.end_time || null,
    notes: d.notes || null,
    ministry_id: ministryId,
    created_by: session.userId,
  });
  if (error) return { error: friendlyError(error.message) };

  revalidatePath("/agenda");
  revalidatePath("/admin/eventos");
  if (ministryId) revalidatePath(`/lider/${ministryId}/eventos`);
  return { ok: "Evento criado." };
}

export async function deleteEvent(id: string): Promise<ActionState> {
  await requireSession();
  const supabase = await createClient();
  const blocked = await blockersMessage(supabase, "evento", id).catch(() => null);
  if (blocked && !blocked.startsWith("Não foi possível")) return { error: blocked };
  // O RLS decide se pode: filtra por 0 linhas se não for ADM/líder dono.
  const { data, error } = await supabase.from("events").delete().eq("id", id).select("id");
  if (error) return { error: friendlyError(error.message) };
  if (!data?.length) return { error: "Você não tem permissão para remover este evento." };
  revalidatePath("/agenda");
  revalidatePath("/admin/eventos");
  revalidatePath("/lider", "layout");
  return { ok: "Evento removido." };
}
