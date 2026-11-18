-- =====================================================================
-- INTEGRIDADE NAS EXCLUSÕES: nada é apagado se tiver dependência.
-- ---------------------------------------------------------------------
-- Decisão do cliente (17/11/2026): não pode excluir usuário, ministério,
-- cargo, evento ou membro que tenha algo ligado; o sistema avisa O QUE
-- está ligado para a pessoa resolver antes (ex.: tirar da escala).
--
-- 1) FKs de negócio passam de CASCADE/SET NULL para RESTRICT
--    (o próprio Postgres recusa a exclusão, mesmo fora do app).
--    Continuam CASCADE só as extensões do mesmo registro:
--      profile_details (ficha da pessoa), notification_log (log da escala),
--      event_template_runs (controle interno dos cultos fixos).
--    events.created_by continua SET NULL (é só autoria).
--    profiles -> auth.users continua CASCADE, mas como profiles agora é
--    RESTRICT para membros/escalas, excluir o login também é bloqueado.
-- 2) public.delete_blockers(entidade, id): lista as dependências em
--    português para a tela mostrar antes/no lugar de excluir.
-- =====================================================================

-- ---------- 1) RESTRICT ----------
alter table public.ministry_roles
  drop constraint ministry_roles_ministry_id_fkey,
  add constraint ministry_roles_ministry_id_fkey foreign key (ministry_id)
    references public.ministries(id) on delete restrict;

alter table public.ministry_members
  drop constraint ministry_members_ministry_id_fkey,
  add constraint ministry_members_ministry_id_fkey foreign key (ministry_id)
    references public.ministries(id) on delete restrict,
  drop constraint ministry_members_profile_id_fkey,
  add constraint ministry_members_profile_id_fkey foreign key (profile_id)
    references public.profiles(id) on delete restrict,
  drop constraint ministry_members_ministry_role_id_ministry_id_fkey,
  add constraint ministry_members_ministry_role_id_ministry_id_fkey foreign key (ministry_role_id, ministry_id)
    references public.ministry_roles(id, ministry_id) on delete restrict;

alter table public.events
  drop constraint events_ministry_id_fkey,
  add constraint events_ministry_id_fkey foreign key (ministry_id)
    references public.ministries(id) on delete restrict;

alter table public.schedules
  drop constraint schedules_event_id_fkey,
  add constraint schedules_event_id_fkey foreign key (event_id)
    references public.events(id) on delete restrict,
  drop constraint schedules_ministry_id_fkey,
  add constraint schedules_ministry_id_fkey foreign key (ministry_id)
    references public.ministries(id) on delete restrict,
  drop constraint schedules_ministry_member_id_ministry_id_fkey,
  add constraint schedules_ministry_member_id_ministry_id_fkey foreign key (ministry_member_id, ministry_id)
    references public.ministry_members(id, ministry_id) on delete restrict,
  drop constraint schedules_ministry_role_id_ministry_id_fkey,
  add constraint schedules_ministry_role_id_ministry_id_fkey foreign key (ministry_role_id, ministry_id)
    references public.ministry_roles(id, ministry_id) on delete restrict;

alter table public.event_templates
  drop constraint event_templates_ministry_id_fkey,
  add constraint event_templates_ministry_id_fkey foreign key (ministry_id)
    references public.ministries(id) on delete restrict;

-- ---------- 2) O que impede a exclusão ----------
-- p_entity: 'usuario' | 'ministerio' | 'cargo' | 'evento' | 'membro'
-- Retorna uma linha por tipo de dependência: item, total e alguns exemplos.
-- Permissão: ADM vê tudo; líder/vice só do próprio ministério (evento/membro/cargo).
create or replace function public.delete_blockers(p_entity text, p_id uuid)
returns table (item text, total bigint, exemplos text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_ministry uuid;
begin
  if p_entity = 'evento' then
    select e.ministry_id into v_ministry from public.events e where e.id = p_id;
  elsif p_entity = 'membro' then
    select mm.ministry_id into v_ministry from public.ministry_members mm where mm.id = p_id;
  elsif p_entity = 'cargo' then
    select r.ministry_id into v_ministry from public.ministry_roles r where r.id = p_id;
  end if;

  if not (public.is_admin() or (v_ministry is not null and public.is_leader_of(v_ministry))) then
    raise exception 'Sem permissão';
  end if;

  if p_entity = 'usuario' then
    return query
      select 'Ministérios'::text, count(*), string_agg(m.name, ', ' order by m.name)
        from public.ministry_members mm join public.ministries m on m.id = mm.ministry_id
       where mm.profile_id = p_id
      having count(*) > 0
    union all
      select 'Escalas', count(*),
             string_agg(to_char(e.event_date, 'DD/MM') || ' ' || e.title || ' (' || m.name || ')', '; '
                        order by e.event_date) filter (where e.event_date >= current_date)
        from public.schedules s
        join public.ministry_members mm on mm.id = s.ministry_member_id
        join public.events e on e.id = s.event_id
        join public.ministries m on m.id = s.ministry_id
       where mm.profile_id = p_id
      having count(*) > 0;

  elsif p_entity = 'ministerio' then
    return query
      select 'Cargos'::text, count(*), string_agg(r.name, ', ' order by r.name)
        from public.ministry_roles r where r.ministry_id = p_id having count(*) > 0
    union all
      select 'Membros', count(*), string_agg(p.full_name, ', ' order by p.full_name)
        from public.ministry_members mm join public.profiles p on p.id = mm.profile_id
       where mm.ministry_id = p_id having count(*) > 0
    union all
      select 'Eventos', count(*), string_agg(to_char(e.event_date, 'DD/MM') || ' ' || e.title, '; ' order by e.event_date)
        from public.events e where e.ministry_id = p_id having count(*) > 0
    union all
      select 'Cultos fixos', count(*), string_agg(t.title, ', ')
        from public.event_templates t where t.ministry_id = p_id having count(*) > 0
    union all
      select 'Escalas', count(*), null::text
        from public.schedules s where s.ministry_id = p_id having count(*) > 0;

  elsif p_entity = 'cargo' then
    return query
      select 'Membros com esse cargo'::text, count(*), string_agg(p.full_name, ', ' order by p.full_name)
        from public.ministry_members mm join public.profiles p on p.id = mm.profile_id
       where mm.ministry_role_id = p_id having count(*) > 0
    union all
      select 'Escalas com essa função', count(*),
             string_agg(to_char(e.event_date, 'DD/MM') || ' ' || e.title, '; ' order by e.event_date)
        from public.schedules s join public.events e on e.id = s.event_id
       where s.ministry_role_id = p_id having count(*) > 0;

  elsif p_entity = 'evento' then
    return query
      select 'Escalas'::text, count(*), string_agg(p.full_name || ' (' || m.name || ')', ', ' order by m.name, p.full_name)
        from public.schedules s
        join public.ministry_members mm on mm.id = s.ministry_member_id
        join public.profiles p on p.id = mm.profile_id
        join public.ministries m on m.id = s.ministry_id
       where s.event_id = p_id having count(*) > 0;

  elsif p_entity = 'membro' then
    return query
      select 'Escalas'::text, count(*),
             string_agg(to_char(e.event_date, 'DD/MM') || ' ' || e.title, '; ' order by e.event_date)
        from public.schedules s join public.events e on e.id = s.event_id
       where s.ministry_member_id = p_id having count(*) > 0;
  else
    raise exception 'Entidade inválida: %', p_entity;
  end if;
end $$;

revoke execute on function public.delete_blockers(text, uuid) from public, anon;
grant execute on function public.delete_blockers(text, uuid) to authenticated;
