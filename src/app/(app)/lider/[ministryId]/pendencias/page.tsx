/**
 * PENDÊNCIAS do ministério (líder/vice), próximas 8 semanas, por prioridade:
 *   1. Não vão (recusaram)  -> achar substituto
 *   2. Aguardando resposta  -> cobrar (os lembretes automáticos entram na Fase 3)
 *   3. Rascunhos            -> publicar
 * Para resolver, o líder vai à aba Escalas.
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireScalesEnabled } from "@/lib/auth/scales";
import { formatDay, hhmm, todayBR } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/empty-state";
import { ScheduleStatusBadge } from "@/components/schedules/status-badge";

export default async function PendenciasPage({ params }: PageProps<"/lider/[ministryId]/pendencias">) {
  const { ministryId } = await params;
  await requireScalesEnabled(ministryId);
  const supabase = await createClient();

  const { data } = await supabase
    .from("schedules")
    .select(
      "id, status, published, decline_reason, swap_requested, role:ministry_roles(name), member:ministry_members(profile:profiles(full_name, nickname, phone)), event:events!inner(title, event_date, start_time)"
    )
    .eq("ministry_id", ministryId)
    .gte("event.event_date", todayBR())
    .lte("event.event_date", todayBR(56));

  const rows = (data ?? []).sort((a, b) =>
    (a.event.event_date + a.event.start_time).localeCompare(b.event.event_date + b.event.start_time)
  );
  const groups = [
    { title: "Não vão", desc: "Recusaram: escale um substituto.", items: rows.filter((r) => r.published && r.status === "recusado") },
    { title: "Aguardando resposta", desc: "Publicado e ainda sem confirmação.", items: rows.filter((r) => r.published && r.status === "pendente") },
    { title: "Rascunhos", desc: "Escalados, mas a equipe ainda não vê. Publique na aba Escalas.", items: rows.filter((r) => !r.published) },
  ];

  if (groups.every((g) => !g.items.length))
    return <EmptyState title="Tudo em dia" description="Nenhuma pendência nas próximas 8 semanas." />;

  return (
    <div className="space-y-4">
      {groups
        .filter((g) => g.items.length)
        .map((g) => (
          <Card key={g.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {g.title} ({g.items.length})
              </CardTitle>
              <CardDescription>{g.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y rounded-lg border">
                {g.items.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div>
                      <p>
                        <span className="font-medium">{r.member?.profile?.nickname || r.member?.profile?.full_name}</span>
                        <span className="text-muted-foreground"> · {r.role?.name}</span>
                      </p>
                      <p className="text-xs text-muted-foreground first-letter:uppercase">
                        {formatDay(r.event.event_date)} · {r.event.title} {hhmm(r.event.start_time)}
                        {r.member?.profile?.phone && ` · ${r.member.profile.phone}`}
                      </p>
                      {r.decline_reason && (
                        <p className="text-xs text-muted-foreground">
                          Motivo: {r.decline_reason}
                          {r.swap_requested && " · pediu troca"}
                        </p>
                      )}
                    </div>
                    <ScheduleStatusBadge status={r.status} published={r.published} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      <Button asChild variant="outline">
        <Link href={`/lider/${ministryId}/escalas`}>Ir para Escalas</Link>
      </Button>
    </div>
  );
}
