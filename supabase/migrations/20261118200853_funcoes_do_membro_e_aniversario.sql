-- =====================================================================
-- 1) Várias funções por membro (ex.: "Foto | Chat"). Antes só havia
--    ministry_members.ministry_role_id (cargo PRINCIPAL, usado como sugestão
--    padrão ao escalar). A tabela abaixo guarda TODAS as funções que a pessoa faz.
-- 2) Aniversário sem ano (planilha da Mídia só tem dia/mês): guardamos o ano
--    1904 (bissexto, aceita 29/02) e marcamos birth_year_unknown = true.
-- 3) Cargos novos da Mídia usados na planilha de voluntários.
-- =====================================================================

create table public.ministry_member_roles (
  ministry_member_id uuid not null references public.ministry_members(id) on delete cascade,
  ministry_role_id   uuid not null references public.ministry_roles(id)  on delete restrict,
  created_at timestamptz not null default now(),
  primary key (ministry_member_id, ministry_role_id)
);
create index ministry_member_roles_role_idx on public.ministry_member_roles (ministry_role_id);
alter table public.ministry_member_roles enable row level security;

-- Visível a quem é do mesmo ministério (ou ADM); líder/vice/ADM gerenciam.
create policy mmr_select on public.ministry_member_roles for select to authenticated using (
  public.is_admin() or exists (
    select 1 from public.ministry_members m
    where m.id = ministry_member_id and public.is_member_of(m.ministry_id))
);
create policy mmr_write on public.ministry_member_roles for all to authenticated
  using (public.is_admin() or exists (
    select 1 from public.ministry_members m
    where m.id = ministry_member_id and public.is_leader_of(m.ministry_id)))
  with check (public.is_admin() or exists (
    select 1 from public.ministry_members m
    where m.id = ministry_member_id and public.is_leader_of(m.ministry_id)));

-- Aniversário sem ano
alter table public.profile_details add column birth_year_unknown boolean not null default false;

create function public.set_birth_year_unknown() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.birth_year_unknown := new.birth_date is not null and extract(year from new.birth_date) = 1904;
  return new;
end $$;
create trigger profile_details_birth_year
  before insert or update of birth_date on public.profile_details
  for each row execute function public.set_birth_year_unknown();

-- Cargos novos da Mídia (os que já existem são mantidos)
insert into public.ministry_roles (ministry_id, name)
select m.id, r.name
from public.ministries m
cross join (values ('Chat'), ('Câmera'), ('Vídeo'), ('Design'), ('Edição de vídeo')) as r(name)
where m.name = 'Mídia'
  and not exists (select 1 from public.ministry_roles x where x.ministry_id = m.id and x.name = r.name);
