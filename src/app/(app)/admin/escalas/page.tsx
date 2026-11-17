/**
 * VISÃO GERENCIAL DAS ESCALAS (ADM) — somente leitura.
 *
 * Filtros (GET, link compartilhável):
 *   ?periodo=semana|2sem|4sem|8sem (padrão 2sem)  ?ministerio=<uuid>  ?status=confirmado|pendente|recusado|rascunho
 * Blocos:
 *   1. Números do período (escalados, confirmados, aguardando, não vão, rascunhos, % confirmado)
 *   2. Evento a evento: equipe de cada ministério com status
 *   3. Carga por pessoa: quantas vezes cada um está escalado (evitar sobrecarga)
 * Para mexer na escala, o link leva à aba Escalas do ministério (ADM tem acesso a todos).
 */
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDay, hhmm, todayBR } from "@/lib/format";
import { ministryColor } from "@/lib/ministry-color";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { ScheduleStatusBadge } from "@/components/schedules/status-badge";

const PERIODS = { semana: ["Próximos 7 dias", 7], "2sem": ["Próximas 2 semanas", 14], "4sem": ["Próximas 4 semanas", 28], "8sem": ["Próximas 8 semanas", 56] } as const;
const STATUS = { confirmado: "Confirmados", pendente: "Aguardando", recusado: "Não vão", rascunho: "Rascunhos" } as const;
type Period = keyof typeof PERIODS;

export default async function AdminEscalasPage({ searchParams }: PageProps<"/admin/escalas">) {
  await requireAdmin();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const periodo: Period = (one(sp.periodo) in PERIODS ? one(sp.periodo) : "2sem") as Period;
  const ministerio = one(sp.ministerio);
  const status = one(sp.status) in STATUS ? (one(sp.status) as keyof typeof STATUS) : "";

  const supabase = await createClient();
  const [{ data: ministries }, { data: rows }] = await Promise.all([
    supabase.from("ministries").select("id, name").eq("scales_enabled", true).eq("is_active", true).order("name"),
    (() => {
      let q = supabase
        .from("schedules")
        .select(
          "id, status, published, decline_reason, swap_requested, ministry_id, ministry:ministries(name), role:ministry_roles(name), member:ministry_members(profile:profiles(id, full_name, nickname)), event:events!inner(id, title, event_date, start_time)"
        )
        .gte("event.event_date", todayBR())
        .lte("event.event_date", todayBR(PERIODS[periodo][1]));
      if (ministerio) q = q.eq("ministry_id", ministerio);
      return q;
    })(),
  ]);

  const all = rows ?? [];
  const kind = (r: (typeof all)[number]) => (!r.published ? "rascunho" : r.status);
  const list = status ? all.filter((r) => kind(r) === status) : all;

  // 1) números (sempre sobre o período/ministério, sem o filtro de status)
  const n = { total: all.length, confirmado: 0, pendente: 0, recusado: 0, rascunho: 0 };
  for (const r of all) n[kind(r)]++;
  const published = n.confirmado + n.pendente + n.recusado;
  const pct = published ? Math.round((n.confirmado / published) * 100) : 0;

  // 2) evento -> ministério -> pessoas
  type Row = (typeof list)[number];
  const events = new Map<string, { e: Row["event"]; byMinistry: Map<string, Row[]> }>();
  for (const r of list) {
    const ev = events.get(r.event.id) ?? { e: r.event, byMinistry: new Map() };
    ev.byMinistry.set(r.ministry_id, [...(ev.byMinistry.get(r.ministry_id) ?? []), r]);
    events.set(r.event.id, ev);
  }
  const orderedEvents = [...events.values()].sort((a, b) =>
    (a.e.event_date + a.e.start_time).localeCompare(b.e.event_date + b.e.start_time)
  );

  // 3) carga por pessoa (ignora quem recusou)
  const load = new Map<string, { id: string; name: string; count: number; ministries: Set<string> }>();
  for (const r of all) {
    if (r.status === "recusado" || !r.member?.profile) continue;
    const p = r.member.profile;
    const cur = load.get(p.id) ?? { id: p.id, name: p.nickname || p.full_name, count: 0, ministries: new Set<string>() };
    cur.count++;
    if (r.ministry?.name) cur.ministries.add(r.ministry.name);
    load.set(p.id, cur);
  }
  const ranking = [...load.values()].sort((a, b) => b.count - a.count).slice(0, 15);

  const stat = (label: string, value: number | string, cls = "") => (
    <Card>
      <CardContent className="pt-5">
        <p className={`text-2xl font-bold ${cls}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );

  return (
    <>
      <PageHeader title="Escalas" description="Visão geral de todos os ministérios. Para editar, abra a escala do ministério." />

      <form method="get" className="mb-6 flex flex-wrap items-center gap-2">
        <NativeSelect name="periodo" defaultValue={periodo} aria-label="Período" className="w-auto">
          {Object.entries(PERIODS).map(([k, [label]]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="ministerio" defaultValue={ministerio} aria-label="Ministério" className="w-auto min-w-44">
          <option value="">Todos os ministérios</option>
          {ministries?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="status" defaultValue={status} aria-label="Status" className="w-auto">
          <option value="">Todos os status</option>
          {Object.entries(STATUS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit">Filtrar</Button>
        {(ministerio || status || periodo !== "2sem") && (
          <Button asChild variant="ghost">
            <Link href="/admin/escalas">Limpar</Link>
          </Button>
        )}
      </form>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stat("Escalados", n.total)}
        {stat("Confirmados", n.confirmado, "text-success")}
        {stat("Aguardando", n.pendente, "text-warning")}
        {stat("Não vão", n.recusado, "text-destructive")}
        {stat("Rascunhos", n.rascunho, "text-muted-foreground")}
        {stat("Confirmação", `${pct}%`)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {orderedEvents.length === 0 ? (
            <EmptyState title="Nenhuma escala no período" description="Ajuste os filtros ou peça aos líderes para montar as escalas." />
          ) : (
            orderedEvents.map(({ e, byMinistry }) => (
              <Card key={e.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <span className="font-normal text-muted-foreground">{formatDay(e.event_date)} · </span>
                    {e.title} <span className="text-sm font-normal text-muted-foreground">{hhmm(e.start_time)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {[...byMinistry.entries()].map(([mid, people]) => (
                    <div key={mid} className="rounded-lg border p-3" style={{ borderLeft: `3px solid ${ministryColor(mid)}` }}>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold">{people[0].ministry?.name}</p>
                        <Link href={`/lider/${mid}/escalas`} className="text-xs text-muted-foreground hover:text-foreground">
                          Editar →
                        </Link>
                      </div>
                      <ul className="space-y-1.5">
                        {people.map((p) => (
                          <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="min-w-0 truncate">
                              {p.member?.profile?.nickname || p.member?.profile?.full_name}
                              <span className="text-muted-foreground"> · {p.role?.name}</span>
                              {p.status === "recusado" && p.decline_reason && (
                                <span className="block truncate text-xs text-muted-foreground">
                                  {p.decline_reason}
                                  {p.swap_requested && " · pediu troca"}
                                </span>
                              )}
                            </span>
                            <ScheduleStatusBadge status={p.status} published={p.published} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Carga por pessoa</CardTitle>
            <CardDescription>Vezes escalada no período (sem contar recusas).</CardDescription>
          </CardHeader>
          <CardContent>
            {ranking.length ? (
              <ul className="space-y-2 text-sm">
                {ranking.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{r.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{[...r.ministries].join(", ")}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-xs font-semibold">{r.count}×</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados no período.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
