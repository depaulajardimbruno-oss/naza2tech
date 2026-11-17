/**
 * Lista de eventos agrupada por dia. Server component, só desenha.
 * `canDelete(event)` decide se mostra o botão de remover (UX; o RLS é a barreira real).
 * `mine` (opcional): escalas do usuário logado por evento -> mostra "Você está escalado"
 * com status e os botões Confirmar / Não posso ali mesmo.
 */
import { Badge } from "@/components/ui/badge";
import { DeleteEventButton } from "./delete-event-button";
import { formatDay, hhmm } from "@/lib/format";
import type { Tables } from "@/types/database";
import { ScheduleStatusBadge } from "@/components/schedules/status-badge";
import { RespondButtons } from "@/components/schedules/respond-buttons";
import type { MyScale } from "@/components/schedules/my-scale";

export type EventRow = Tables<"events"> & {
  ministry: { id: string; name: string } | null;
};

export function EventsList({
  events,
  canDelete,
  mine = {},
}: {
  events: EventRow[];
  canDelete: (e: EventRow) => boolean;
  mine?: Record<string, MyScale[]>;
}) {
  const days = new Map<string, EventRow[]>();
  for (const e of events)
    days.set(e.event_date, [...(days.get(e.event_date) ?? []), e]);

  return (
    <div className="space-y-6">
      {[...days.entries()].map(([date, items]) => (
        <section key={date}>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground first-letter:uppercase">
            {formatDay(date)}
          </h2>
          <ul className="divide-y rounded-xl border bg-card">
            {items.map((e) => (
              <li key={e.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{e.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {hhmm(e.start_time)}
                      {e.end_time ? ` – ${hhmm(e.end_time)}` : ""}
                    </p>
                    {e.notes && (
                      <p className="text-sm text-muted-foreground">{e.notes}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={e.ministry ? "secondary" : "outline"}>
                      {e.ministry?.name ?? "Igreja"}
                    </Badge>
                    {canDelete(e) && (
                      <DeleteEventButton id={e.id} title={e.title} />
                    )}
                  </div>
                </div>
                {mine[e.id]?.map((my) => (
                  <div
                    key={my.id}
                    className="mt-3 space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span>
                        <span className="font-semibold">
                          Você está escalado
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {my.ministry} · {my.role}
                        </span>
                      </span>
                      <ScheduleStatusBadge status={my.status} published />
                    </div>
                    <RespondButtons scheduleId={my.id} status={my.status} />
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
