-- =====================================================================
-- Eventos FIXOS (cultos semanais) — modelo + geração automática
-- ---------------------------------------------------------------------
-- event_templates      : modelo semanal (dia da semana + horário).
-- event_template_runs  : registro de cada data já gerada. Serve para NÃO recriar
--                        uma ocorrência que o ADM apagou de propósito.
-- materialize_fixed_events(p_weeks): cria em public.events as ocorrências dos
--                        próximos N semanas (padrão 8). Roda todo dia 03:00 BRT
--                        via pg_cron e pode ser chamada à mão (service_role/postgres).
-- Escalas continuam apontando para events.id: cada culto vira um evento real.
-- Dia da semana segue o Postgres: 0 = domingo ... 6 = sábado.
-- =====================================================================

create table public.event_templates (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  weekday    smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time   time,
  notes      text,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (title, weekday, start_time)
);

create table public.event_template_runs (
  template_id uuid not null references public.event_templates(id) on delete cascade,
  event_date  date not null,
  primary key (template_id, event_date)
);

alter table public.event_templates     enable row level security;
alter table public.event_template_runs enable row level security;  -- sem policies = só service_role

create policy templates_select on public.event_templates for select to authenticated using (true);
create policy templates_admin_write on public.event_templates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.materialize_fixed_events(p_weeks int default 8)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_count int := 0;
  r record;
  d date;
begin
  for r in select * from public.event_templates where active loop
    for d in select g::date from generate_series(v_today, v_today + (p_weeks * 7), interval '1 day') g loop
      if extract(dow from d)::int = r.weekday
         and not exists (select 1 from public.event_template_runs x where x.template_id = r.id and x.event_date = d)
      then
        insert into public.events (title, event_date, start_time, end_time, notes, ministry_id)
        values (r.title, d, r.start_time, r.end_time, r.notes, null);
        insert into public.event_template_runs (template_id, event_date) values (r.id, d);
        v_count := v_count + 1;
      end if;
    end loop;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.materialize_fixed_events(int) from public, anon, authenticated;

-- Cultos fixos da Naza2 Campinas (horários confirmados pelo cliente em 17/11/2026)
insert into public.event_templates (title, weekday, start_time, end_time) values
  ('Culto de Oração',   3, '20:00', '21:00'),  -- quarta
  ('Culto Devocional',  0, '09:00', '10:00'),  -- domingo manhã
  ('Escola Bíblica',    0, '10:00', '11:00'),  -- domingo
  ('Culto da Família',  0, '19:00', '20:00')   -- domingo noite (+ Infantil)
on conflict do nothing;

-- Gera já as próximas 8 semanas e agenda a renovação diária (06:00 UTC = 03:00 BRT)
select public.materialize_fixed_events(8);
create extension if not exists pg_cron;
select cron.schedule('materialize-fixed-events', '0 6 * * *', $$select public.materialize_fixed_events(8)$$);
