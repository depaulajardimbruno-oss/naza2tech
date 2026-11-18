-- =====================================================================
-- Equipe: só LÍDER TITULAR (pode haver vários) ou ADM coloca/remove pessoas.
-- Vice-líder continua podendo ALTERAR membros (cargo, e o titular a flag de vice),
-- mas não insere nem remove. Decisão do cliente, 17/11/2026.
-- =====================================================================
drop policy members_write on public.ministry_members;

create policy members_insert on public.ministry_members for insert to authenticated
  with check (public.is_admin() or public.is_main_leader_of(ministry_id));

create policy members_delete on public.ministry_members for delete to authenticated
  using (public.is_admin() or public.is_main_leader_of(ministry_id));

create policy members_update on public.ministry_members for update to authenticated
  using (public.is_admin() or public.is_leader_of(ministry_id))
  with check (public.is_admin() or public.is_leader_of(ministry_id));
