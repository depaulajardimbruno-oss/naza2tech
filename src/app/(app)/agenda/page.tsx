/**
 * AGENDA DA IGREJA — todo usuário logado vê todos os eventos.
 *
 * Duas visões (?vista=):
 *   mes   (padrão) calendário em grade, navegável por mês (?mes=YYYY-MM) e por dia (?dia=YYYY-MM-DD)
 *   lista  eventos agrupados por dia, com período (?periodo=proximos|semana|mes|passados)
 *
 * Filtros (valem nas duas visões; ficam na URL, então o link é compartilhável):
 *   ?ministerio=<uuid> | geral   (vazio = todos)      ?q=texto (busca no título)
 *   ?minhas=1  só eventos em que o usuário está escalado
 * Escalas do usuário (publicadas) aparecem destacadas no calendário e com
 * Confirmar / Não posso no detalhe do dia — visível só para ele.
 *   O seletor de ministério lista só os do usuário (ADM: todos).
 *
 * Quem cria eventos: ADM (qualquer) e líder (do seu ministério) — ver /admin/eventos
 * e /lider/[id]/eventos. Aqui é só leitura (e remover, se tiver permissão).
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { EventsList, type EventRow } from "@/components/events/events-list";
import { AgendaFilters } from "@/components/events/agenda-filters";
import { MonthCalendar } from "@/components/events/month-calendar";
import type { MyScale } from "@/components/schedules/my-scale";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { monthTitle, monthWeeks, shiftMonth, todayBR } from "@/lib/format";

const PERIODS = ["proximos", "semana", "mes", "passados"] as const;
type Period = (typeof PERIODS)[number];

export default async function AgendaPage({
  searchParams,
}: PageProps<"/agenda">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) ?? "";

  const today = todayBR();
  const vista = one(sp.vista) === "lista" ? "lista" : "mes";
  const ministerio = one(sp.ministerio);
  const q = one(sp.q).trim();
  const periodo: Period = (PERIODS as readonly string[]).includes(
    one(sp.periodo),
  )
    ? (one(sp.periodo) as Period)
    : "proximos";
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(one(sp.mes))
    ? one(sp.mes)
    : today.slice(0, 7);
  const minhas = one(sp.minhas) === "1";
  const diaParam = /^\d{4}-\d{2}-\d{2}$/.test(one(sp.dia)) ? one(sp.dia) : "";

  /** Query string atual (sem vazios), usada para montar links preservando os filtros. */
  const current: Record<string, string> = {};
  for (const [k, v] of Object.entries({
    vista,
    ministerio,
    minhas: minhas ? "1" : "",
    q,
    periodo: vista === "lista" ? periodo : "",
    mes: vista === "mes" ? mes : "",
    dia: diaParam,
  })) {
    if (v && !(k === "vista" && v === "mes")) current[k] = v;
  }
  const href = (over: Record<string, string>) => {
    const p = new URLSearchParams({ ...current, ...over });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/agenda?${p.toString()}`;
  };

  const supabase = await createClient();
  let query = supabase
    .from("events")
    .select("*, ministry:ministries(id, name)");

  const weeks = monthWeeks(mes);
  if (vista === "mes") {
    query = query
      .gte("event_date", weeks[0][0].date)
      .lte("event_date", weeks[weeks.length - 1][6].date)
      .order("event_date")
      .order("start_time")
      .limit(1000);
  } else {
    query = query.limit(300);
    if (periodo === "passados")
      query = query
        .lt("event_date", today)
        .order("event_date", { ascending: false });
    else {
      query = query
        .gte("event_date", today)
        .order("event_date")
        .order("start_time");
      if (periodo === "semana") query = query.lte("event_date", todayBR(7));
      if (periodo === "mes") query = query.lte("event_date", todayBR(30));
    }
  }
  if (ministerio === "geral") query = query.is("ministry_id", null);
  else if (ministerio) query = query.eq("ministry_id", ministerio);
  if (q) query = query.ilike("title", `%${q.replace(/[%,]/g, " ")}%`);

  const [{ data }, { data: allMinistries }, session] = await Promise.all([
    query,
    supabase
      .from("ministries")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    getSession(),
  ]);
  const allEvents = (data ?? []) as EventRow[];

  // Minhas escalas (publicadas) nesses eventos -> destaque só para mim
  const myMemberIds = session?.memberships.map((m) => m.id) ?? [];
  const { data: myRows } =
    myMemberIds.length && allEvents.length
      ? await supabase
          .from("schedules")
          .select(
            "id, event_id, status, ministry:ministries(name), role:ministry_roles(name)",
          )
          .in("ministry_member_id", myMemberIds)
          .in(
            "event_id",
            allEvents.map((e) => e.id),
          )
          .eq("published", true)
      : { data: [] };
  const myScales: Record<string, MyScale[]> = {};
  for (const r of myRows ?? [])
    (myScales[r.event_id] ??= []).push({
      id: r.id,
      status: r.status,
      ministry: r.ministry?.name ?? "",
      role: r.role?.name ?? "",
    });
  const events = minhas ? allEvents.filter((e) => myScales[e.id]) : allEvents;

  // Seletor de ministério: ADM vê todos; os demais veem só os ministérios de que participam.
  // (Os EVENTOS continuam visíveis a todos em "Todos" — só a lista do filtro é restrita.)
  // Se o link já traz um ministério fora dessa lista, ele é incluído para o seletor não ficar em branco.
  const mine = new Set(session?.memberships.map((m) => m.ministry_id));
  const ministries = (allMinistries ?? []).filter(
    (m) => session?.isAdmin || mine.has(m.id) || m.id === ministerio,
  );

  const canDelete = (e: EventRow) =>
    !!session &&
    (session.isAdmin ||
      (e.ministry_id !== null && session.leaderOf.includes(e.ministry_id)));

  // Calendário: agrupa por dia e escolhe o dia em destaque (o clicado, ou hoje se estiver no mês)
  const byDate: Record<string, EventRow[]> = {};
  for (const e of events) (byDate[e.event_date] ??= []).push(e);
  const selected = diaParam || (today.startsWith(mes) ? today : null);
  const selectedEvents = selected ? (byDate[selected] ?? []) : [];

  const tab = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Tudo que acontece na igreja e nos ministérios."
      >
        <div className="flex rounded-full border p-0.5">
          <Link
            href={href({ vista: "mes", periodo: "" })}
            className={tab(vista === "mes")}
          >
            Calendário
          </Link>
          <Link
            href={href({ vista: "lista", mes: "", dia: "" })}
            className={tab(vista === "lista")}
          >
            Lista
          </Link>
        </div>
      </PageHeader>

      <AgendaFilters ministries={ministries} params={current} />

      {vista === "mes" ? (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{monthTitle(mes)}</h2>
            <div className="flex items-center gap-1">
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label="Mês anterior"
              >
                <Link href={href({ mes: shiftMonth(mes, -1), dia: "" })}>
                  <ChevronLeftIcon />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={href({ mes: today.slice(0, 7), dia: today })}>
                  Hoje
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label="Próximo mês"
              >
                <Link href={href({ mes: shiftMonth(mes, 1), dia: "" })}>
                  <ChevronRightIcon />
                </Link>
              </Button>
            </div>
          </div>

          <MonthCalendar
            weeks={weeks}
            byDate={byDate}
            today={today}
            selected={selected}
            hrefFor={(date) => `${href({ dia: date })}#detalhe-dia`}
            mine={myScales}
          />

          <div id="detalhe-dia" className="mt-6 scroll-mt-20">
            {selectedEvents.length ? (
              <EventsList
                events={selectedEvents}
                canDelete={canDelete}
                mine={myScales}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {selected
                  ? "Nenhum evento neste dia."
                  : "Toque em um dia para ver os eventos."}
              </p>
            )}
          </div>
        </>
      ) : events.length ? (
        <EventsList events={events} canDelete={canDelete} mine={myScales} />
      ) : (
        <EmptyState
          title={
            ministerio || q || minhas || periodo !== "proximos"
              ? "Nada com esses filtros"
              : "Agenda vazia"
          }
          description="Tente outro ministério ou período."
        />
      )}
    </>
  );
}
