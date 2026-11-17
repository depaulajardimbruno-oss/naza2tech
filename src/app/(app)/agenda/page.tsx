/**
 * AGENDA DA IGREJA — todo usuário logado vê todos os eventos.
 *
 * Filtros (via query string, funcionam sem JS e são compartilháveis por link):
 *   ?ministerio=<uuid> | geral   (vazio = todos)
 *   ?periodo=proximos|semana|mes|passados   (padrão: proximos)
 *   ?q=texto                      (busca no título)
 *
 * Quem cria eventos: ADM (qualquer) e líder (do seu ministério) — ver /admin/eventos
 * e /lider/[id]/eventos. Aqui é só leitura.
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { EventsList, type EventRow } from "@/components/events/events-list";
import { todayBR } from "@/lib/format";

const PERIODS = {
  proximos: "Próximos",
  semana: "Próximos 7 dias",
  mes: "Próximos 30 dias",
  passados: "Já aconteceram",
} as const;
type Period = keyof typeof PERIODS;

export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const ministerio = one(sp.ministerio);
  const q = one(sp.q).trim();
  const periodo: Period = one(sp.periodo) in PERIODS ? (one(sp.periodo) as Period) : "proximos";

  const supabase = await createClient();
  const today = todayBR();

  let query = supabase
    .from("events")
    .select("*, ministry:ministries(id, name)")
    .limit(300);

  if (periodo === "passados") query = query.lt("event_date", today).order("event_date", { ascending: false });
  else {
    query = query.gte("event_date", today).order("event_date").order("start_time");
    if (periodo === "semana") query = query.lte("event_date", todayBR(7));
    if (periodo === "mes") query = query.lte("event_date", todayBR(30));
  }
  if (ministerio === "geral") query = query.is("ministry_id", null);
  else if (ministerio) query = query.eq("ministry_id", ministerio);
  if (q) query = query.ilike("title", `%${q.replace(/[%,]/g, " ")}%`);

  const [{ data: events }, { data: ministries }, session] = await Promise.all([
    query,
    supabase.from("ministries").select("id, name").eq("is_active", true).order("name"),
    getSession(),
  ]);

  const canDelete = (e: EventRow) =>
    !!session && (session.isAdmin || (e.ministry_id !== null && session.leaderOf.includes(e.ministry_id)));
  const filtered = !!(ministerio || q || periodo !== "proximos");

  return (
    <>
      <PageHeader title="Agenda" description="Tudo que acontece na igreja e nos ministérios." />

      <form className="mb-6 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]" method="get">
        <Input name="q" defaultValue={q} placeholder="Buscar evento..." aria-label="Buscar evento" />
        <NativeSelect name="ministerio" defaultValue={ministerio} aria-label="Ministério">
          <option value="">Todos os ministérios</option>
          <option value="geral">Igreja (geral)</option>
          {ministries?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="periodo" defaultValue={periodo} aria-label="Período">
          {Object.entries(PERIODS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <div className="flex gap-2">
          <Button type="submit">Filtrar</Button>
          {filtered && (
            <Button asChild variant="ghost">
              <Link href="/agenda">Limpar</Link>
            </Button>
          )}
        </div>
      </form>

      {events?.length ? (
        <EventsList events={events as EventRow[]} canDelete={canDelete} />
      ) : (
        <EmptyState
          title={filtered ? "Nada com esses filtros" : "Agenda vazia"}
          description={filtered ? "Tente outro ministério ou período." : "Os eventos aparecem aqui assim que forem cadastrados."}
        />
      )}
    </>
  );
}
