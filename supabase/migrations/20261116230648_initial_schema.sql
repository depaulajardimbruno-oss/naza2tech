-- =====================================================================
-- Gestão de Ministérios e Escalas — Schema Supabase (PostgreSQL)
-- Ordem: extensões > enums > tabelas > índices > funções > triggers > RLS
-- Fuso dos eventos: America/Sao_Paulo
-- =====================================================================

-- ---------- ENUMS ----------
create type public.global_role as enum ('admin', 'user');
create type public.schedule_status as enum ('pendente', 'confirmado', 'recusado');

-- ---------- TABELAS ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text,
  phone       text,                       -- WhatsApp no formato E.164 (+5511999999999)
  avatar_url  text,
  role_global public.global_role not null default 'user',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.ministries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.ministry_roles (
  id          uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.ministries(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (ministry_id, name),
  unique (id, ministry_id)                -- permite FK composta (garante consistência)
);

create table public.ministry_members (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  ministry_id      uuid not null references public.ministries(id) on delete cascade,
  ministry_role_id uuid,                  -- cargo "padrão" da pessoa no ministério
  is_leader        boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (profile_id, ministry_id),
  unique (id, ministry_id),
  foreign key (ministry_role_id, ministry_id)
    references public.ministry_roles(id, ministry_id) on delete set null (ministry_role_id)
);

create table public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  event_date   date not null,
  start_time   time not null,
  arrival_time time,                      -- chegada / passagem de som
  end_time     time,                      -- opcional; se nulo assume início + 3h
  notes        text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table public.schedules (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events(id) on delete cascade,
  ministry_id      uuid not null references public.ministries(id) on delete cascade,
  ministry_member_id uuid not null,
  ministry_role_id uuid not null,         -- função NESTE evento (pode diferir do cargo padrão)
  status           public.schedule_status not null default 'pendente',
  decline_reason   text,
  swap_requested   boolean not null default false,
  published        boolean not null default false,  -- voluntário só vê escala publicada
  responded_at     timestamptz,
  created_at       timestamptz not null default now(),
  unique (event_id, ministry_member_id),
  foreign key (ministry_member_id, ministry_id)
    references public.ministry_members(id, ministry_id) on delete cascade,
  foreign key (ministry_role_id, ministry_id)
    references public.ministry_roles(id, ministry_id),
  constraint decline_needs_reason
    check (status <> 'recusado' or length(btrim(coalesce(decline_reason, ''))) > 0)
);

-- Log de lembretes (evita envio duplicado e dá auditoria)
create table public.notification_log (
  id          uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  kind        text not null check (kind in ('48h', '24h', 'pendente')),
  channel     text not null default 'whatsapp',
  ok          boolean not null default true,
  error       text,
  created_at  timestamptz not null default now()
);

-- ---------- ÍNDICES ----------
create index on public.ministry_members (profile_id);
create index on public.ministry_members (ministry_id);
create index on public.ministry_roles   (ministry_id);
create index on public.events           (event_date);
create index on public.schedules        (event_id);
create index on public.schedules        (ministry_id);
create index on public.schedules        (ministry_member_id);
create index on public.schedules        (ministry_id, event_id);
create index on public.schedules        (event_id) where status = 'pendente';
create index on public.notification_log (schedule_id, kind, created_at desc);

-- ---------- FUNÇÕES AUXILIARES (RLS) ----------
-- SECURITY DEFINER evita recursão de RLS ao consultar ministry_members.
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.role_global = 'admin' and p.active);
$$;

create function public.is_leader_of(p_ministry uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ministry_members m
                 where m.profile_id = auth.uid() and m.ministry_id = p_ministry and m.is_leader);
$$;

create function public.is_member_of(p_ministry uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ministry_members m
                 where m.profile_id = auth.uid() and m.ministry_id = p_ministry);
$$;

create function public.is_any_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ministry_members m where m.profile_id = auth.uid());
$$;

create function public.is_any_leader() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ministry_members m
                 where m.profile_id = auth.uid() and m.is_leader);
$$;

create function public.shares_ministry_with(p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1
                 from public.ministry_members a
                 join public.ministry_members b on b.ministry_id = a.ministry_id
                 where a.profile_id = auth.uid() and b.profile_id = p_profile);
$$;

-- ---------- TRIGGERS ----------
-- Cria profile automaticamente no signup
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
          new.email,
          new.raw_user_meta_data ->> 'avatar_url');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

create function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Impede que um usuário se promova a admin (auth.uid() nulo = service role / SQL editor)
create function public.guard_profile_role() returns trigger
language plpgsql as $$
begin
  if new.role_global is distinct from old.role_global
     and auth.uid() is not null and not public.is_admin() then
    raise exception 'Apenas administradores podem alterar o perfil global';
  end if;
  return new;
end $$;

create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_profile_role();

-- Só ADM define/remove líderes
create function public.guard_leader_flag() returns trigger
language plpgsql as $$
begin
  if auth.uid() is null or public.is_admin() then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT' and new.is_leader then
    raise exception 'Apenas o ADM pode definir líderes';
  elsif tg_op = 'UPDATE' and new.is_leader is distinct from old.is_leader then
    raise exception 'Apenas o ADM pode alterar liderança';
  elsif tg_op = 'DELETE' and old.is_leader then
    raise exception 'Apenas o ADM pode remover um líder';
  end if;
  return coalesce(new, old);
end $$;

create trigger members_guard_leader before insert or update or delete on public.ministry_members
  for each row execute function public.guard_leader_flag();

-- ---------- RPCs ----------
-- Voluntário responde à própria escala (sem policy de UPDATE direta p/ ele)
create function public.respond_to_schedule(
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
     and mm.profile_id = auth.uid()
     and sc.published
  returning sc.* into s;

  if not found then
    raise exception 'Escala não encontrada ou sem permissão';
  end if;
  return s;
end $$;

-- Conflito: mesma pessoa escalada em outro ministério com horário sobreposto.
-- DEFINER porque o líder não enxerga escalas de outros ministérios via RLS.
create function public.check_schedule_conflicts(p_member_id uuid, p_event_id uuid)
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
     and (e2.event_date + coalesce(e2.arrival_time, e2.start_time)) <
         t.t_end
     and t.t_start <
         case when e2.end_time is not null then e2.event_date + e2.end_time
              else (e2.event_date + e2.start_time) + interval '3 hours' end;
$$;

-- Lembretes devidos (chamada SOMENTE pela Edge Function com service_role)
--  48h: faltam <=48h e >24h | 24h: faltam <=24h e >0 | pendente: não respondeu,
--  evento em <=72h, no máx. 1 cobrança a cada 24h. Só escalas publicadas.
create function public.reminders_due(p_now timestamptz default now())
returns table (
  schedule_id uuid, kind text, status public.schedule_status,
  profile_id uuid, full_name text, phone text, email text,
  ministry_name text, role_name text, event_title text,
  starts_at timestamptz, arrival_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  with base as (
    select s.id as sid, s.status, p.id as pid, p.full_name, p.phone, p.email,
           mi.name as mname, r.name as rname, e.title,
           ((e.event_date + e.start_time) at time zone 'America/Sao_Paulo') as starts_at,
           ((e.event_date + coalesce(e.arrival_time, e.start_time)) at time zone 'America/Sao_Paulo') as arrival_at
      from public.schedules s
      join public.events e            on e.id = s.event_id
      join public.ministry_members mm on mm.id = s.ministry_member_id
      join public.profiles p          on p.id = mm.profile_id and p.active
      join public.ministries mi       on mi.id = s.ministry_id and mi.is_active
      join public.ministry_roles r    on r.id = s.ministry_role_id
     where s.published and s.status <> 'recusado'
  ), k as (
    select b.*, '48h'::text as kind from base b
     where b.starts_at <= p_now + interval '48 hours' and b.starts_at > p_now + interval '24 hours'
    union all
    select b.*, '24h' from base b
     where b.starts_at <= p_now + interval '24 hours' and b.starts_at > p_now
    union all
    select b.*, 'pendente' from base b
     where b.status = 'pendente' and b.starts_at <= p_now + interval '72 hours' and b.starts_at > p_now
  )
  select k.sid, k.kind, k.status, k.pid, k.full_name, k.phone, k.email,
         k.mname, k.rname, k.title, k.starts_at, k.arrival_at
    from k
   where not exists (
     select 1 from public.notification_log n
      where n.schedule_id = k.sid and n.kind = k.kind and n.ok
        and (k.kind <> 'pendente' or n.created_at > p_now - interval '24 hours')
   );
$$;

revoke all on function public.reminders_due(timestamptz) from public, anon, authenticated;
grant execute on function public.reminders_due(timestamptz) to service_role;
grant execute on function public.respond_to_schedule(uuid, public.schedule_status, text, boolean) to authenticated;
grant execute on function public.check_schedule_conflicts(uuid, uuid) to authenticated;

-- ---------- ROW LEVEL SECURITY ----------
alter table public.profiles         enable row level security;
alter table public.ministries       enable row level security;
alter table public.ministry_roles   enable row level security;
alter table public.ministry_members enable row level security;
alter table public.events           enable row level security;
alter table public.schedules        enable row level security;
alter table public.notification_log enable row level security;  -- sem policies = só service_role

-- profiles
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or public.is_admin() or public.is_any_leader() or public.shares_ministry_with(id)
);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
create policy profiles_admin_delete on public.profiles for delete to authenticated
  using (public.is_admin());

-- ministries
create policy ministries_select on public.ministries for select to authenticated using (
  public.is_admin() or public.is_member_of(id)
);
create policy ministries_admin_write on public.ministries for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ministry_roles (cargos): ADM cria; membros/líderes leem
create policy mroles_select on public.ministry_roles for select to authenticated using (
  public.is_admin() or public.is_member_of(ministry_id)
);
create policy mroles_admin_write on public.ministry_roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ministry_members: equipe visível ao próprio ministério; líder gerencia (flag is_leader é guardada por trigger)
create policy members_select on public.ministry_members for select to authenticated using (
  public.is_admin() or public.is_member_of(ministry_id)
);
create policy members_write on public.ministry_members for all to authenticated
  using (public.is_admin() or public.is_leader_of(ministry_id))
  with check (public.is_admin() or public.is_leader_of(ministry_id));

-- events: calendário da igreja visível a quem serve; só ADM cria
create policy events_select on public.events for select to authenticated using (
  public.is_admin() or public.is_any_member()
);
create policy events_admin_write on public.events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- schedules: líder vê rascunhos; voluntário só publicadas do(s) seu(s) ministério(s)
create policy schedules_select on public.schedules for select to authenticated using (
  public.is_admin()
  or public.is_leader_of(ministry_id)
  or (published and public.is_member_of(ministry_id))
);
create policy schedules_write on public.schedules for all to authenticated
  using (public.is_admin() or public.is_leader_of(ministry_id))
  with check (public.is_admin() or public.is_leader_of(ministry_id));
-- Voluntário NÃO tem UPDATE direto: responde via public.respond_to_schedule()

-- ---------- BOOTSTRAP DO PRIMEIRO ADM (rodar 1x no SQL Editor) ----------
-- update public.profiles set role_global = 'admin' where email = 'seu-email@igreja.com';
