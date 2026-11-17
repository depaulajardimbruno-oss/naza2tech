/**
 * INÍCIO (dashboard), em blocos por perfil:
 *  1. Minhas próximas escalas (todos)       -> responder em /minha-agenda
 *  2. Pendências de escala (líder/vice/ADM) -> próximas 4 semanas por ministério
 *       ADM vê todos os ministérios com escala; líder/vice vê os seus.
 *  3. Meus ministérios (cards)
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

  return (
    <>
      <PageHeader title={`Olá, ${first}`} description="Seu resumo da semana." />

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
