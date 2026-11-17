/**
 * MINHAS ESCALAS (voluntário): escalas PUBLICADAS em que a pessoa está,
 * de todos os ministérios dela. Confirmar / "Não posso" (motivo obrigatório).
 * Também mostra quem mais está na equipe daquele evento (mesmo ministério).
 * ?ver=anteriores mostra o histórico.
 */
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDay, hhmm, todayBR } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScheduleStatusBadge } from "@/components/schedules/status-badge";
import { RespondButtons } from "@/components/schedules/respond-buttons";

export default async function MinhasEscalasPage({ searchParams }: PageProps<"/minha-agenda">) {
  const s = await requireSession();
  const past = (await searchParams).ver === "anteriores";
  const myMemberIds = s.memberships.map((m) => m.id);
  const supabase = await createClient();
  const today = todayBR();

  const { data: mine } = myMemberIds.length
    ? await supabase
        .from("schedules")
        .select(
          "id, status, decline_reason, swap_requested, ministry_id, event_id, ministry:ministries(name), role:ministry_roles(name), event:events!inner(title, event_date, start_time, end_time, arrival_time)"
        )
        .in("ministry_member_id", myMemberIds)
        .eq("published", true)
        .filter("event.event_date", past ? "lt" : "gte", today)
        .limit(past ? 30 : 100)
    : { data: [] };

  // Equipe de cada evento (mesmo ministério), para a pessoa saber com quem vai servir.
  const eventIds = [...new Set((mine ?? []).map((x) => x.event_id))];
  const { data: team } = eventIds.length
    ? await supabase
        .from("schedules")
        .select("id, event_id, ministry_id, status, role:ministry_roles(name), member:ministry_members(profile:profiles(full_name, nickname))")
        .in("event_id", eventIds)
        .eq("published", true)
    : { data: [] };

  const list = (mine ?? []).sort((a, b) =>
    (a.event.event_date + a.event.start_time).localeCompare(b.event.event_date + b.event.start_time) * (past ? -1 : 1)
  );
  const pending = list.filter((x) => x.status === "pendente").length;

  return (
    <>
      <PageHeader
        title="Minhas escalas"
        description={
          past ? "Escalas que já aconteceram." : pending ? `Você tem ${pending} escala(s) aguardando sua resposta.` : "Suas próximas escalas."
        }
      >
        <Button asChild variant="ghost" size="sm">
          <Link href={past ? "/minha-agenda" : "/minha-agenda?ver=anteriores"}>{past ? "Próximas" : "Anteriores"}</Link>
        </Button>
      </PageHeader>

      {!list.length ? (
        <EmptyState
          title={past ? "Nenhuma escala anterior" : "Nenhuma escala por enquanto"}
          description={past ? undefined : "Quando o líder publicar uma escala com você, ela aparece aqui."}
        />
      ) : (
        <div className="space-y-3">
          {list.map((x) => {
            const mates = (team ?? []).filter((t) => t.event_id === x.event_id && t.ministry_id === x.ministry_id && t.id !== x.id);
            return (
              <Card key={x.id} className={x.status === "pendente" && !past ? "border-warning/50" : undefined}>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground first-letter:uppercase">{formatDay(x.event.event_date)}</p>
                      <p className="text-lg font-semibold">{x.event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {x.event.arrival_time && `Chegada ${hhmm(x.event.arrival_time)} · `}
                        Início {hhmm(x.event.start_time)}
                        {x.event.end_time && ` · até ${hhmm(x.event.end_time)}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <ScheduleStatusBadge status={x.status} published />
                      <Badge variant="secondary">
                        {x.ministry?.name} · {x.role?.name}
                      </Badge>
                    </div>
                  </div>

                  {mates.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Com você:{" "}
                      {mates
                        .map((t) => `${t.member?.profile?.nickname || t.member?.profile?.full_name} (${t.role?.name})`)
                        .join(", ")}
                    </p>
                  )}
                  {x.status === "recusado" && x.decline_reason && (
                    <p className="text-sm text-muted-foreground">
                      Seu motivo: {x.decline_reason}
                      {x.swap_requested && " · pediu troca"}
                    </p>
                  )}
                  {!past && <RespondButtons scheduleId={x.id} status={x.status} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
