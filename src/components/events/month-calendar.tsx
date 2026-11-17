/**
 * Calendário mensal em grade (domingo a sábado). Server component, só desenha.
 * - Cada dia é um link que seleciona o dia (?dia=YYYY-MM-DD); o detalhe aparece abaixo.
 * - Desktop: até 2 eventos por dia (hora + título) e "+N".  Celular: só bolinhas coloridas.
 * - Cor = ministério (ver lib/ministry-color.ts); azul = evento geral da igreja.
 */
import Link from "next/link";
import { cn } from "@/lib/utils";
import { hhmm } from "@/lib/format";
import { ministryColor } from "@/lib/ministry-color";
import type { EventRow } from "./events-list";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MAX_CHIPS = 2;

export function MonthCalendar({
  weeks,
  byDate,
  today,
  selected,
  hrefFor,
}: {
  weeks: { date: string; inMonth: boolean }[][];
  byDate: Record<string, EventRow[]>;
  today: string;
  selected: string | null;
  hrefFor: (date: string) => string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map(({ date, inMonth }) => {
          const events = byDate[date] ?? [];
          const isToday = date === today;
          const isSelected = date === selected;
          return (
            <Link
              key={date}
              href={hrefFor(date)}
              scroll={false}
              aria-label={`${date}: ${events.length} evento(s)`}
              className={cn(
                "min-h-16 border-b border-r p-1.5 transition-colors hover:bg-accent/40 md:min-h-28",
                !inMonth && "opacity-40",
                isSelected && "bg-accent/60 ring-1 ring-inset ring-primary"
              )}
            >
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs",
                  isToday && "bg-primary font-semibold text-primary-foreground"
                )}
              >
                {Number(date.slice(8))}
              </span>

              {/* desktop: chips */}
              <div className="mt-1 hidden space-y-1 md:block">
                {events.slice(0, MAX_CHIPS).map((e) => (
                  <div
                    key={e.id}
                    className="truncate rounded px-1.5 py-0.5 text-[11px] leading-tight"
                    style={{ background: `${ministryColor(e.ministry_id)}26`, borderLeft: `2px solid ${ministryColor(e.ministry_id)}` }}
                  >
                    <span className="text-muted-foreground">{hhmm(e.start_time)}</span> {e.title}
                  </div>
                ))}
                {events.length > MAX_CHIPS && (
                  <div className="px-1 text-[11px] text-muted-foreground">+{events.length - MAX_CHIPS} mais</div>
                )}
              </div>

              {/* celular: bolinhas */}
              <div className="mt-1 flex flex-wrap gap-0.5 md:hidden">
                {events.slice(0, 4).map((e) => (
                  <span key={e.id} className="size-1.5 rounded-full" style={{ background: ministryColor(e.ministry_id) }} />
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
