/**
 * MONTAR ESCALA (líder/vice) — só abre se o ministério usa escala.
 *
 * Mostra os próximos eventos que o ministério serve:
 *   eventos gerais da igreja (ministry_id nulo) + eventos do próprio ministério.
 * Em cada evento: equipe escalada (status), "+ Escalar" e "Publicar".
 * Rascunhos (published=false) só o líder vê; ao publicar, a equipe vê e responde.
 * Período: ?semanas=6 (padrão) ou 12.
 */
import Link from "next/link";
import { Trash2Icon, SendIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireScalesEnabled } from "@/lib/auth/scales";
import { removeSchedule, publishEvent } from "@/lib/actions/schedules";
import { formatDay, hhmm, todayBR } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/forms/action-button";
import { EmptyState } from "@/components/layout/empty-state";
import { ScheduleStatusBadge } from "@/components/schedules/status-badge";
import { AssignForm, type MemberOption } from "@/components/schedules/assign-form";

export default async function EscalasPage({ params, searchParams }: PageProps<"/lider/[ministryId]/escalas">) {
  const { ministryId } = await params;
  await requireScalesEnabled(ministryId);
  const sp = await searchParams;
  const weeks = sp.semanas === "12" ? 12 : 6;

  const supabase = await createClient();
  const today = todayBR();
  const until = todayBR(weeks * 7);

  const [{ data: events }, { data: members }, { data: roles }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, event_date, start_time, end_time, ministry_id")
      .or(`ministry_id.is.null,ministry_id.eq.${ministryId}`)
      .gte("event_date", today)
      .lte("event_date", until)
      .order("event_date")
      .order("start_time"),
    supabase
      .from("ministry_members")
      .select("id, ministry_role_id, profile:profiles(full_name, nickname, active)")
      .eq("ministry_id", ministryId),
    supabase.from("ministry_roles").select("id, name").eq("ministry_id", ministryId).order("name"),
  ]);

  const eventIds = (events ?? []).map((e) => e.id);
  const { data: schedules } = eventIds.length
    ? await supabase
        .from("schedules")
        .select(
          "id, event_id, ministry_member_id, status, published, decline_reason, swap_requested, role:ministry_roles(name), member:ministry_members(profile:profiles(full_name, nickname))"
        )
        .eq("ministry_id", ministryId)
        .in("event_id", eventIds)
    : { data: [] };

  const byEvent = new Map<string, NonNullable<typeof schedules>>();
  for (const s of schedules ?? []) byEvent.set(s.event_id, [...(byEvent.get(s.event_id) ?? []), s]);

  const options: MemberOption[] = (members ?? [])
    .filter((m) => m.profile?.active !== false)
    .map((m) => ({ id: m.id, name: m.profile?.nickname || m.profile?.full_name || "?", defaultRoleId: m.ministry_role_id }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  if (!events?.length)
    return <EmptyState title="Nenhum evento no período" description="Os cultos e eventos do ministério aparecem aqui." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>
          Próximas {weeks} semanas. <Badge variant="outline">Rascunho</Badge> só você vê; publique para a equipe confirmar.
        </p>
        <Button asChild variant="ghost" size="sm">
          <Link href={`?semanas=${weeks === 6 ? 12 : 6}`}>{weeks === 6 ? "Ver 12 semanas" : "Ver 6 semanas"}</Link>
        </Button>
      </div>

      {events.map((e) => {
        const team = byEvent.get(e.id) ?? [];
        const drafts = team.filter((s) => !s.published).length;
        // quem já está neste evento não aparece de novo no "Pessoa…"
        const taken = new Set(team.map((s) => s.ministry_member_id));
        return (
          <Card key={e.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                <span>
                  <span className="first-letter:uppercase text-muted-foreground font-normal">{formatDay(e.event_date)} · </span>
                  {e.title}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {hhmm(e.start_time)}
                    {e.end_time ? `–${hhmm(e.end_time)}` : ""}
                  </span>
                </span>
                {drafts > 0 && (
                  <ActionButton
                    size="sm"
                    action={async () => {
                      "use server";
                      return publishEvent(ministryId, e.id);
                    }}
                  >
                    <SendIcon /> Publicar ({drafts})
                  </ActionButton>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {team.length > 0 && (
                <ul className="divide-y rounded-lg border">
                  {team.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <span className="font-medium">{s.member?.profile?.nickname || s.member?.profile?.full_name}</span>
                        <span className="text-muted-foreground"> · {s.role?.name}</span>
                        {s.status === "recusado" && s.decline_reason && (
                          <p className="text-xs text-muted-foreground">
                            Motivo: {s.decline_reason}
                            {s.swap_requested && " · pediu troca"}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <ScheduleStatusBadge status={s.status} published={s.published} />
                        <ActionButton
                          variant="ghost"
                          size="icon"
                          aria-label="Tirar da escala"
                          confirm="Tirar esta pessoa da escala?"
                          action={async () => {
                            "use server";
                            return removeSchedule(s.id, ministryId);
                          }}
                        >
                          <Trash2Icon className="text-muted-foreground" />
                        </ActionButton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <AssignForm
                ministryId={ministryId}
                eventId={e.id}
                members={options.filter((o) => !taken.has(o.id))}
                roles={roles ?? []}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
