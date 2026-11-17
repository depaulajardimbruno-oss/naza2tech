/**
 * Eventos do ministério (líder/ADM). Cria e remove só eventos DESTE ministério;
 * eventos gerais da igreja são do ADM. Vale para ministérios com ou sem escala.
 */
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { NewEventDialog } from "@/components/events/new-event-dialog";
import { EventsList, type EventRow } from "@/components/events/events-list";
import { todayBR } from "@/lib/format";

export default async function LeaderEventsPage({ params }: PageProps<"/lider/[ministryId]/eventos">) {
  const { ministryId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*, ministry:ministries(id, name)")
    .eq("ministry_id", ministryId)
    .gte("event_date", todayBR())
    .order("event_date")
    .order("start_time");

  return (
    <>
      <PageHeader title="Eventos do ministério" description="Aparecem na agenda de toda a igreja.">
        <NewEventDialog ministryId={ministryId} />
      </PageHeader>
      {data?.length ? (
        <EventsList events={data as EventRow[]} canDelete={() => true} />
      ) : (
        <EmptyState title="Nenhum evento futuro" description="Crie um evento para o ministério aparecer na agenda." />
      )}
    </>
  );
}
