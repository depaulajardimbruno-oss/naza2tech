-- =====================================================================
-- Ministério com "visão geral" (ministries.sees_all): quem é membro dele
-- enxerga TODOS os ministérios (equipe, cargos e escalas publicadas), só leitura.
-- Escrever continua sendo de líder/vice/ADM. Uso: "Pastoral e Secretaria".
-- Implementação: is_member_of() passa a valer também para membros desses ministérios;
-- todas as policies de leitura já usam essa função.
-- =====================================================================

alter table public.ministries add column sees_all boolean not null default false;

create or replace function public.is_member_of(p_ministry uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_active_user() and exists (
    select 1 from public.ministry_members m
    where m.profile_id = auth.uid()
      and (m.ministry_id = p_ministry
           or exists (select 1 from public.ministries x
                      where x.id = m.ministry_id and x.sees_all and x.is_active)));
$$;

-- Ministério e cargos
insert into public.ministries (name, description, scales_enabled, sees_all)
select 'Pastoral e Secretaria', 'Pastores e secretaria. Quem é membro enxerga todos os ministérios (somente leitura).', false, true
where not exists (select 1 from public.ministries where name = 'Pastoral e Secretaria');

insert into public.ministry_roles (ministry_id, name)
select m.id, r.name
from public.ministries m cross join (values ('Pastor'), ('Secretária')) as r(name)
where m.name = 'Pastoral e Secretaria'
  and not exists (select 1 from public.ministry_roles x where x.ministry_id = m.id and x.name = r.name);
