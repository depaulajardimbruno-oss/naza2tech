-- Fase 3: WhatsApp (escala publicada avisa, lembrete 24h antes, resposta via webhook).
-- notification_log já existia (kind: 48h/24h/pendente) mas sem nenhuma policy -> RLS
-- bloqueava tudo por padrão. Líder/ADM só precisam inserir/ver o log da própria escala.
create policy notification_log_insert on public.notification_log for insert to authenticated
with check (exists (
  select 1 from public.schedules sc
   where sc.id = schedule_id and (public.is_admin() or public.is_leader_of(sc.ministry_id))
));
create policy notification_log_select on public.notification_log for select to authenticated
using (exists (
  select 1 from public.schedules sc
   where sc.id = schedule_id and (public.is_admin() or public.is_leader_of(sc.ministry_id))
));

-- Resposta via WhatsApp (webhook sem sessão de usuário): mesma regra de
-- respond_to_schedule, mas recebe o profile_id já resolvido pelo telefone
-- em vez de auth.uid(). Só o backend (service_role) pode chamar.
create function public.respond_to_schedule_as(
  p_profile_id  uuid,
  p_schedule_id uuid,
  p_status      public.schedule_status,
  p_reason      text default null,
  p_swap        boolean default false
) returns public.schedules
language plpgsql security definer set search_path = '' as $$
declare s public.schedules;
begin
  if p_status not in ('confirmado', 'recusado') then
    raise exception 'Status inválido';
  end if;
  if p_status = 'recusado' and length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Informe o motivo da ausência';
  end if;

  update public.schedules sc
     set status         = p_status,
         decline_reason = case when p_status = 'recusado' then btrim(p_reason) end,
         swap_requested = (p_status = 'recusado' and p_swap),
         responded_at   = now()
    from public.ministry_members mm
   where sc.id = p_schedule_id
     and mm.id = sc.ministry_member_id
     and mm.profile_id = p_profile_id
     and sc.published
  returning sc.* into s;

  if not found then
    raise exception 'Escala não encontrada ou sem permissão';
  end if;
  return s;
end $$;

revoke all on function public.respond_to_schedule_as(uuid, uuid, public.schedule_status, text, boolean) from public, anon, authenticated;
grant execute on function public.respond_to_schedule_as(uuid, uuid, public.schedule_status, text, boolean) to service_role;
