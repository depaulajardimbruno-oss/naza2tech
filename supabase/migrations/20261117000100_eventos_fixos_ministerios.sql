-- Modelos fixos podem pertencer a um ministério (ex.: Coral, JNI Tribo).
-- Início conforme o site (JNI sáb 19h, Coral seg 19h30); término não informado => nulo
-- (o motor de conflitos assume início + 3h quando end_time é nulo).
alter table public.event_templates add column ministry_id uuid references public.ministries(id) on delete cascade;

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
        values (r.title, d, r.start_time, r.end_time, r.notes, r.ministry_id);
        insert into public.event_template_runs (template_id, event_date) values (r.id, d);
        v_count := v_count + 1;
      end if;
    end loop;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.materialize_fixed_events(int) from public, anon, authenticated;

insert into public.event_templates (title, weekday, start_time, ministry_id)
select 'Culto JNI Tribo', 6, time '19:00', id from public.ministries where name = 'JNI Tribo'
union all
select 'Ensaio do Coral', 1, time '19:30', id from public.ministries where name = 'Coral'
on conflict do nothing;

select public.materialize_fixed_events(8);
