-- =====================================================================
-- VICE-LÍDER de ministério
-- ---------------------------------------------------------------------
-- Decisão do cliente (17/11/2026):
--   - Cada ministério pode ter vice-líder(es).
--   - Vice faz TUDO que o líder faz no ministério (membros, eventos, escalas),
--     por isso is_leader_of() passa a considerar vice também.
--   - Só o LÍDER titular (ou ADM) nomeia/remove vice. Vice não nomeia vice.
--   - Ninguém é líder e vice ao mesmo tempo.
-- =====================================================================

alter table public.ministry_members
  add column is_vice_leader boolean not null default false,
  add constraint leader_or_vice check (not (is_leader and is_vice_leader));

-- Líder titular (só is_leader). Usado para quem pode nomear vice.
create function public.is_main_leader_of(p_ministry uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ministry_members m
                 where m.profile_id = auth.uid() and m.ministry_id = p_ministry and m.is_leader);
$$;

-- Líder OU vice: todas as policies de "líder" passam a valer para o vice.
create or replace function public.is_leader_of(p_ministry uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ministry_members m
                 where m.profile_id = auth.uid() and m.ministry_id = p_ministry
                   and (m.is_leader or m.is_vice_leader));
$$;

create or replace function public.is_any_leader() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ministry_members m
                 where m.profile_id = auth.uid() and (m.is_leader or m.is_vice_leader));
$$;

-- Guarda: líder titular só pode mexer em is_leader se for ADM; vice só pelo titular ou ADM.
create or replace function public.guard_leader_flag() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_ministry uuid := coalesce(new.ministry_id, old.ministry_id);
begin
  if auth.uid() is null or public.is_admin() then
    return coalesce(new, old);
  end if;

  -- is_leader (titular): só ADM
  if (tg_op = 'INSERT' and new.is_leader)
     or (tg_op = 'UPDATE' and new.is_leader is distinct from old.is_leader)
     or (tg_op = 'DELETE' and old.is_leader) then
    raise exception 'Apenas o ADM pode definir ou remover o líder do ministério';
  end if;

  -- is_vice_leader: só o líder titular do ministério
  if ((tg_op = 'INSERT' and new.is_vice_leader)
      or (tg_op = 'UPDATE' and new.is_vice_leader is distinct from old.is_vice_leader)
      or (tg_op = 'DELETE' and old.is_vice_leader))
     and not public.is_main_leader_of(v_ministry) then
    raise exception 'Apenas o líder do ministério (ou o ADM) pode nomear ou remover vice-líder';
  end if;

  return coalesce(new, old);
end $$;

revoke execute on function public.is_main_leader_of(uuid) from public, anon;
grant execute on function public.is_main_leader_of(uuid) to authenticated;
