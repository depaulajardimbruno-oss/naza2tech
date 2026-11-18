-- Conflito de escala NÃO considera escalas que a pessoa já recusou
-- (ela não vai estar lá, então não ocupa o horário).
create or replace function public.check_schedule_conflicts(p_member_id uuid, p_event_id uuid)
returns table (schedule_id uuid, ministry_name text, event_title text, starts_at timestamp)
language sql stable security definer set search_path = '' as $$
  with target as (
    select mm.profile_id, mm.ministry_id,
           (e.event_date + coalesce(e.arrival_time, e.start_time)) as t_start,
           case when e.end_time is not null then e.event_date + e.end_time
                else (e.event_date + e.start_time) + interval '3 hours' end as t_end
      from public.ministry_members mm, public.events e
     where mm.id = p_member_id and e.id = p_event_id
       and (public.is_admin() or public.is_leader_of(mm.ministry_id))
  )
  select s.id, mi.name, e2.title, (e2.event_date + e2.start_time)
    from target t
    join public.ministry_members mm2 on mm2.profile_id = t.profile_id
    join public.schedules s          on s.ministry_member_id = mm2.id
    join public.events e2            on e2.id = s.event_id
    join public.ministries mi        on mi.id = s.ministry_id
   where not (s.ministry_member_id = p_member_id and s.event_id = p_event_id)
     and s.status <> 'recusado'
     and (e2.event_date + coalesce(e2.arrival_time, e2.start_time)) < t.t_end
     and t.t_start <
         case when e2.end_time is not null then e2.event_date + e2.end_time
              else (e2.event_date + e2.start_time) + interval '3 hours' end;
$$;
