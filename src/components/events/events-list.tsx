/**
 * Lista de eventos agrupada por dia. Server component, só desenha.
 * `canDelete(event)` decide se mostra o botão de remover (UX; o RLS é a barreira real).
 */
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/forms/action-button";
import { deleteEvent } from "@/lib/actions/events";
import { formatDay, hhmm } from "@/lib/format";
import type { Tables } from "@/types/database";

export type EventRow = Tables<"events"> & { ministry: { id: string; name: string } | null };

export function EventsList({ events, canDelete }: { events: EventRow[]; canDelete: (e: EventRow) => boolean }) {
  const days = new Map<string, EventRow[]>();
  for (const e of events) days.set(e.event_date, [...(days.get(e.event_date) ?? []), e]);

  return (
    <div className="space-y-6">
      {[...days.entries()].map(([date, items]) => (
        <section key={date}>
          <h2 className="mb-2 text-sm font-semibold capitalize text-muted-foreground">{formatDay(date)}</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {items.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {hhmm(e.start_time)}
                    {e.end_time ? ` – ${hhmm(e.end_time)}` : ""}
                  </p>
                  {e.notes && <p className="text-sm text-muted-foreground">{e.notes}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={e.ministry ? "secondary" : "outline"}>{e.ministry?.name ?? "Igreja"}</Badge>
                  {canDelete(e) && (
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      confirm={`Remover "${e.title}"?`}
                      action={() => deleteEvent(e.id)}
                    >
                      Remover
                    </ActionButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
