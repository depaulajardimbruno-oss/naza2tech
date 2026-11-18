/**
 * INÍCIO (dashboard), em blocos por perfil:
 *  1. Minhas próximas escalas (todos)       -> responder em /minha-agenda
 *  2. Pendências de escala (líder/vice/ADM) -> próximas 4 semanas por ministério
 *       ADM vê todos os ministérios com escala; líder/vice vê os seus.
 *  3. Meus ministérios (cards)
 *  + Aniversários: faixa "hoje" e card com os próximos 30 dias (função upcoming_birthdays:
 *    devolve só nome, dia e mês — nunca a idade).
 */
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { pendingByMinistry } from "@/lib/schedules/pending";
import { formatDay, hhmm, todayBR } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { ScheduleStatusBadge } from "@/components/schedules/status-badge";

export default async function DashboardPage() {
  const s = await requireSession();
  const supabase = await createClient();
  const first = (s.profile.nickname || s.profile.full_name).split(" ")[0] || "você";
  const myMemberIds = s.memberships.map((m) => m.id);

  // 1) Minhas próximas escalas
  const { data: mine } = myMemberIds.length
    ? await supabase
        .from("schedules")
        .select("id, status, ministry:ministries(name), role:ministry_roles(name), event:events!inner(title, event_date, start_time)")
        .in("ministry_member_id", myMemberIds)
        .eq("published", true)
        .gte("event.event_date", todayBR())
    : { data: [] };
  const next = (mine ?? [])
    .sort((a, b) => (a.event.event_date + a.event.start_time).localeCompare(b.event.event_date + b.event.start_time))
    .slice(0, 4);
  const waitingMe = (mine ?? []).filter((x) => x.status === "pendente").length;

  // 2) Pendências dos ministérios que lidero (ADM: todos com escala)
  const { data: scaleMinistries } = await supabase
    .from("ministries")
    .select("id, name")
    .eq("scales_enabled", true)
    .eq("is_active", true)
    .order("name");
  const led = (scaleMinistries ?? []).filter((m) => s.isAdmin || s.leaderOf.includes(m.id));
  const pending = await pendingByMinistry(
    supabase,
    led.map((m) => m.id)
  );

  // 4) Aniversariantes (hoje + próximos 30 dias)
  const { data: bdays } = await supabase.rpc("upcoming_birthdays", { p_days: 30 });
  const today = (bdays ?? []).filter((b) => b.days_until === 0);
  const upcoming = (bdays ?? []).filter((b) => b.days_until > 0);
  const when = (n: number) => (n === 1 ? "amanhã" : `em ${n} dias`);

  return (
    <>
      <PageHeader title={`Olá, ${first}`} description="Seu resumo da semana." />

      {today.length > 0 && (
        <div className="mb-6 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
          🎂 <strong>Hoje é aniversário de {today.map((b) => b.name).join(", ")}!</strong> Dê os parabéns.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Minhas escalas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Minhas próximas escalas
              {waitingMe > 0 && <Badge variant="warning">{waitingMe} para responder</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {next.length ? (
              <ul className="divide-y rounded-lg border">
                {next.map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{x.event.title}</p>
                      <p className="text-xs text-muted-foreground first-letter:uppercase">
                        {formatDay(x.event.event_date)}, {hhmm(x.event.start_time)} · {x.ministry?.name} ({x.role?.name})
                      </p>
                    </div>
                    <ScheduleStatusBadge status={x.status} published />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma escala publicada com você por enquanto.</p>
            )}
            <Button asChild variant={waitingMe ? "default" : "outline"} size="sm">
              <Link href="/minha-agenda">{waitingMe ? "Responder agora" : "Ver minhas escalas"}</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Aniversários */}
        <Card>
          <CardHeader>
            <CardTitle>Aniversários</CardTitle>
            <CardDescription>Próximos 30 dias.</CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length ? (
              <ul className="divide-y rounded-lg border">
                {upcoming.slice(0, 8).map((b) => (
                  <li key={b.profile_id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="font-medium">{b.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {String(b.day).padStart(2, "0")}/{String(b.month).padStart(2, "0")} · {when(b.days_until)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum aniversário nos próximos 30 dias.</p>
            )}
          </CardContent>
        </Card>

        {/* 2. Pendências (líder/vice/ADM) */}
        {led.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pendências de escala</CardTitle>
              <CardDescription>Próximas 4 semanas.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y rounded-lg border">
                {led.map((m) => {
                  const c = pending.get(m.id) ?? { recusados: 0, aguardando: 0, rascunhos: 0 };
                  const ok = !c.recusados && !c.aguardando && !c.rascunhos;
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/lider/${m.id}/pendencias`}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-white/5"
                      >
                        <span className="font-medium">{m.name}</span>
                        <span className="flex flex-wrap justify-end gap-1">
                          {ok && <span className="text-xs text-muted-foreground">em dia</span>}
                          {c.recusados > 0 && <Badge variant="destructive">{c.recusados} {c.recusados === 1 ? "não vai" : "não vão"}</Badge>}
                          {c.aguardando > 0 && <Badge variant="warning">{c.aguardando} aguardando</Badge>}
                          {c.rascunhos > 0 && <Badge variant="outline">{c.rascunhos} {c.rascunhos === 1 ? "rascunho" : "rascunhos"}</Badge>}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 3. Meus ministérios */}
      <h2 className="mb-3 mt-8 text-lg font-semibold">Meus ministérios</h2>
      {s.memberships.length === 0 ? (
        <EmptyState
          title="Você ainda não está em nenhum ministério"
          description={
            s.isAdmin
              ? "Cadastre os ministérios e vincule os voluntários em Administração."
              : "Peça ao líder do seu ministério ou ao administrador para incluir você."
          }
        >
          {s.isAdmin && (
            <Button asChild>
              <Link href="/admin/ministerios">Ir para Ministérios</Link>
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {s.memberships.map((m) => {
            const leads = m.is_leader || m.is_vice_leader;
            return (
              <Link key={m.id} href={leads ? `/lider/${m.ministry_id}` : `/ministerios/${m.ministry_id}`}>
                <Card className="h-full hover:bg-accent/40">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {m.ministry.name}
                      {m.is_leader && <Badge>Líder</Badge>}
                      {m.is_vice_leader && <Badge variant="secondary">Vice-líder</Badge>}
                    </CardTitle>
                    <CardDescription>{m.role?.name ?? "Sem cargo definido"}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {leads ? "Gerenciar equipe e escalas" : "Ver o ministério"}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
