-- =====================================================================
-- Agenda aberta a todos + "escala" opcional por ministério
-- ---------------------------------------------------------------------
-- Regras de negócio (decisão do cliente, 16/11/2026):
--   1. Agenda: TODO usuário autenticado vê TODOS os eventos, com filtros.
--   2. Escala é um recurso opcional por ministério (ministries.scales_enabled).
--      Ministérios sem escala (ex.: Casais) só publicam eventos na agenda.
--   3. Evento pode pertencer a um ministério (ministry_id) ou ser geral
--      da igreja (ministry_id nulo, ex.: culto de domingo).
--   4. ADM cria qualquer evento; líder cria/edita eventos do SEU ministério.
-- =====================================================================

-- 1) Interruptor de escala por ministério
alter table public.ministries
  add column scales_enabled boolean not null default false;

-- Quem já faz escala semanal hoje (ver supabase/seed.sql)
update public.ministries set scales_enabled = true
where name in ('Louvor','Coral','Mídia','Intercessores','Cidadania','Culto Infantil','Preteen');

-- 2) Evento pertence (opcionalmente) a um ministério
alter table public.events
  add column ministry_id uuid references public.ministries(id) on delete set null;
create index on public.events (ministry_id);
create index on public.events (event_date);

-- 3) Nomes de ministério são públicos para quem está logado (filtro da agenda)
drop policy ministries_select on public.ministries;
create policy ministries_select on public.ministries
  for select to authenticated using (true);

-- 4) Agenda: leitura para todos; escrita para ADM ou líder do ministério dono
drop policy events_select on public.events;
create policy events_select on public.events
  for select to authenticated using (true);

drop policy events_admin_write on public.events;
create policy events_write on public.events for all to authenticated
  using (public.is_admin() or (ministry_id is not null and public.is_leader_of(ministry_id)))
  with check (public.is_admin() or (ministry_id is not null and public.is_leader_of(ministry_id)));

-- 5) Só se cria escala em ministério com escala ativada
drop policy schedules_write on public.schedules;
create policy schedules_write on public.schedules for all to authenticated
  using (public.is_admin() or public.is_leader_of(ministry_id))
  with check (
    (public.is_admin() or public.is_leader_of(ministry_id))
    and exists (select 1 from public.ministries m where m.id = ministry_id and m.scales_enabled)
  );
