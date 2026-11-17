/**
 * Eventos (ADM): cadastra qualquer evento — geral da igreja ou de um ministério.
 * Mostra os próximos eventos; a visão completa com filtros é /agenda.
 */
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { NewEventDialog } from "@/components/events/new-event-dialog";
import { EventsList, type EventRow } from "@/components/events/events-list";
import { todayBR } from "@/lib/format";

export default async function EventosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*, ministry:ministries(id, name)")
    .gte("event_date", todayBR())
    .order("event_date")
    .order("start_time")
    .limit(200);

  return (
    <>
      <PageHeader title="Eventos" description="Cultos e compromissos da igreja.">
        <NewEventDialog ministryId={null} />
      </PageHeader>
      {data?.length ? (
        <EventsList events={data as EventRow[]} canDelete={() => true} />
      ) : (
        <EmptyState title="Nenhum evento futuro" description="Crie o primeiro evento no botão acima." />
      )}
    </>
  );
}
