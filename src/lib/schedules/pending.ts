/**
 * Resumo de PENDÊNCIAS de escala por ministério (próximas N semanas).
 * Usado no Início (dashboard) e na aba Pendências do líder.
 *   recusados  = alguém disse que não vai -> precisa de substituto
 *   aguardando = publicado e a pessoa ainda não respondeu
 *   rascunhos  = escalado mas ainda não publicado (a equipe não vê)
 * O RLS já limita: líder/vice vê os rascunhos do próprio ministério; ADM vê tudo.
 */
import type { createClient } from "@/lib/supabase/server";
import { todayBR } from "@/lib/format";

type Client = Awaited<ReturnType<typeof createClient>>;
export type PendingCount = { recusados: number; aguardando: number; rascunhos: number };

export async function pendingByMinistry(supabase: Client, ministryIds: string[], weeks = 4) {
  const result = new Map<string, PendingCount>();
  if (!ministryIds.length) return result;
  const { data } = await supabase
    .from("schedules")
    .select("ministry_id, status, published, event:events!inner(event_date)")
    .in("ministry_id", ministryIds)
    .gte("event.event_date", todayBR())
    .lte("event.event_date", todayBR(weeks * 7));

  for (const s of data ?? []) {
    const c = result.get(s.ministry_id) ?? { recusados: 0, aguardando: 0, rascunhos: 0 };
    if (!s.published) c.rascunhos++;
    else if (s.status === "recusado") c.recusados++;
    else if (s.status === "pendente") c.aguardando++;
    result.set(s.ministry_id, c);
  }
  return result;
}
