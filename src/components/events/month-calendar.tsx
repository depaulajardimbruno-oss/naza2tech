/**
 * Calendário mensal em grade (domingo a sábado). Server component, só desenha.
 * - Cada dia é um link que seleciona o dia (?dia=YYYY-MM-DD); o detalhe aparece abaixo.
 * - Desktop: até 2 eventos por dia (título; hora só em telas largas) e "+N".  Celular: só bolinhas coloridas.
 * - Cor = ministério (ver lib/ministry-color.ts); azul = evento geral da igreja.
 * - `mine`: eventos em que o USUÁRIO está escalado ganham destaque + bolinha de status
 *   (amarelo = responder, verde = vai, vermelho = não vai) e aparecem primeiro no dia.
 */
import Link from "next/link";
import { cn } from "@/lib/utils";
import { hhmm } from "@/lib/format";
import { ministryColor } from "@/lib/ministry-color";
import type { EventRow } from "./events-list";
import {
  mainStatus,
  STATUS_BG,
  STATUS_TEXT,
  type MyScale,
} from "@/components/schedules/my-scale";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MAX_CHIPS = 2;

export function MonthCalendar({
  weeks,
  byDate,
  today,
  selected,
  hrefFor,
  mine = {},
}: {
  weeks: { date: string; inMonth: boolean }[][];
  byDate: Record<string, EventRow[]>;
  today: string;
  selected: string | null;
  hrefFor: (date: string) => string;
  mine?: Record<string, MyScale[]>;
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
          // eventos em que estou escalado primeiro
          const events = [...(byDate[date] ?? [])].sort(
            (a, b) => Number(!!mine[b.id]) - Number(!!mine[a.id]),
          );
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
                isSelected && "bg-accent/60 ring-1 ring-inset ring-primary",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs",
                  isToday && "bg-primary font-semibold text-primary-foreground",
                )}
              >
                {Number(date.slice(8))}
              </span>

              {/* desktop: chips */}
              <div className="mt-1 hidden space-y-1 md:block">
                {events.slice(0, MAX_CHIPS).map((e) => {
                  const my = mine[e.id];
                  const st = my ? mainStatus(my) : null;
                  return (
                    <div
                      key={e.id}
                      title={`${hhmm(e.start_time)} · ${e.title}${st ? ` · ${STATUS_TEXT[st]}` : ""}`}
                      className={cn(
                        "line-clamp-2 rounded px-1.5 py-0.5 text-[11px] leading-tight",
                        st && "font-semibold ring-1 ring-inset ring-white/25",
                      )}
                      style={{
                        background: `${ministryColor(e.ministry_id)}26`,
                        borderLeft: `2px solid ${ministryColor(e.ministry_id)}`,
                      }}
                    >
                      {st && (
                        <span
                          className={cn(
                            "mr-1 inline-block size-2 rounded-full align-middle",
                            STATUS_BG[st],
                          )}
                        />
                      )}
                      <span className="hidden font-normal text-muted-foreground xl:inline">
                        {hhmm(e.start_time)}{" "}
                      </span>
                      {e.title}
                    </div>
                  );
                })}
                {events.length > MAX_CHIPS && (
                  <div className="px-1 text-[11px] text-muted-foreground">
                    +{events.length - MAX_CHIPS} mais
                  </div>
                )}
              </div>

              {/* celular: bolinhas */}
              <div className="mt-1 flex flex-wrap gap-0.5 md:hidden">
                {events.slice(0, 4).map((e) => {
                  const st = mine[e.id] ? mainStatus(mine[e.id]) : null;
                  return st ? (
                    <span
                      key={e.id}
                      className={cn(
                        "size-2.5 rounded-full ring-2 ring-white/70",
                        STATUS_BG[st],
                      )}
                    />
                  ) : (
                    <span
                      key={e.id}
                      className="size-1.5 rounded-full"
                      style={{ background: ministryColor(e.ministry_id) }}
                    />
                  );
                })}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
