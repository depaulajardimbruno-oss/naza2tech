-- =====================================================================
-- Cadastro completo de pessoa + correções de segurança no perfil
-- ---------------------------------------------------------------------
-- 1) profiles.nickname: "como prefere ser chamado" (visível a líderes, como o nome).
-- 2) profile_details: dados PESSOAIS (aniversário, endereço, estado civil, batismo,
--    contato de emergência). Tabela separada de propósito: líderes enxergam
--    profiles (nome/contato) para montar equipe, mas NÃO enxergam estes dados.
--    RLS: só a própria pessoa e o ADM leem/escrevem.
-- 3) guard_profile_role passa a proteger também `active` e `email`
--    (antes um usuário desativado podia se reativar editando o próprio perfil;
--     e-mail é a credencial de login, quem troca é o ADM pelo painel).
-- Todos os campos novos são opcionais.
-- =====================================================================

alter table public.profiles add column nickname text;

create table public.profile_details (
  profile_id        uuid primary key references public.profiles(id) on delete cascade,
  birth_date        date,
  gender            text check (gender in ('masculino', 'feminino')),
  marital_status    text check (marital_status in ('solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel')),
  address_zip       text,
  address_street    text,
  address_number    text,
  address_complement text,
  address_district  text,
  address_city      text,
  address_state     text check (address_state is null or length(address_state) = 2),
  member_since      date,
  baptized          boolean,
  baptism_date      date,
  emergency_name    text,
  emergency_phone   text,
  updated_at        timestamptz not null default now()
);

alter table public.profile_details enable row level security;

create policy details_select on public.profile_details for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
create policy details_insert on public.profile_details for insert to authenticated
  with check (profile_id = auth.uid() or public.is_admin());
create policy details_update on public.profile_details for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

create trigger profile_details_touch before update on public.profile_details
  for each row execute function public.touch_updated_at();

create or replace function public.guard_profile_role() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role_global is distinct from old.role_global then
      raise exception 'Apenas administradores podem alterar o perfil global';
    end if;
    if new.active is distinct from old.active then
      raise exception 'Apenas administradores podem ativar ou desativar usuários';
    end if;
    if new.email is distinct from old.email then
      raise exception 'O e-mail de acesso só pode ser alterado pelo administrador';
    end if;
  end if;
  return new;
end $$;
