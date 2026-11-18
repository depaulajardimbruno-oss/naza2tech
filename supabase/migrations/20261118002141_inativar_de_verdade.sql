-- =====================================================================
-- "Inativar" passa a tirar de uso de verdade (decisão do cliente: quem tem
-- vínculo não é excluído, é INATIVADO).
--  1) Usuário inativo perde TODAS as permissões no banco (não só a de ADM):
--     helpers de membro/líder exigem profiles.active. O app também desloga.
--  2) Ministério inativo não aceita escala nova (policy schedules_write).
-- =====================================================================

create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.active);
$$;
revoke execute on function public.is_active_user() from public, anon;
grant execute on function public.is_active_user() to authenticated;

create or replace function public.is_member_of(p_ministry uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_active_user() and exists (select 1 from public.ministry_members m
                 where m.profile_id = auth.uid() and m.ministry_id = p_ministry);
$$;

create or replace function public.is_leader_of(p_ministry uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_active_user() and exists (select 1 from public.ministry_members m
                 where m.profile_id = auth.uid() and m.ministry_id = p_ministry
                   and (m.is_leader or m.is_vice_leader));
$$;

create or replace function public.is_main_leader_of(p_ministry uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_active_user() and exists (select 1 from public.ministry_members m
                 where m.profile_id = auth.uid() and m.ministry_id = p_ministry and m.is_leader);
$$;

create or replace function public.is_any_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_active_user() and exists (select 1 from public.ministry_members m where m.profile_id = auth.uid());
$$;

create or replace function public.is_any_leader() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_active_user() and exists (select 1 from public.ministry_members m
                 where m.profile_id = auth.uid() and (m.is_leader or m.is_vice_leader));
$$;

create or replace function public.shares_ministry_with(p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_active_user() and exists (select 1
                 from public.ministry_members a
                 join public.ministry_members b on b.ministry_id = a.ministry_id
                 where a.profile_id = auth.uid() and b.profile_id = p_profile);
$$;

-- Inativo não responde escala
create or replace function public.respond_to_schedule(
  p_schedule_id uuid,
  p_status      public.schedule_status,
  p_reason      text default null,
  p_swap        boolean default false
) returns public.schedules
language plpgsql security definer set search_path = '' as $$
declare s public.schedules;
begin
  if not public.is_active_user() then
    raise exception 'Usuário inativo';
  end if;
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
     and mm.profile_id = auth.uid()
     and sc.published
  returning sc.* into s;

  if not found then
    raise exception 'Escala não encontrada ou sem permissão';
  end if;
  return s;
end $$;

-- Escala nova só em ministério ATIVO e com escala ligada
drop policy schedules_write on public.schedules;
create policy schedules_write on public.schedules for all to authenticated
  using (public.is_admin() or public.is_leader_of(ministry_id))
  with check (
    (public.is_admin() or public.is_leader_of(ministry_id))
    and exists (select 1 from public.ministries m where m.id = ministry_id and m.scales_enabled and m.is_active)
  );
