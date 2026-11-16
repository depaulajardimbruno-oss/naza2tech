-- search_path fixo nas funções de trigger
alter function public.touch_updated_at()   set search_path = '';
alter function public.guard_profile_role() set search_path = '';
alter function public.guard_leader_flag()  set search_path = '';

-- Nenhuma SECURITY DEFINER acessível por anon/public via REST
revoke all on function public.is_admin()                        from public, anon;
revoke all on function public.is_leader_of(uuid)                from public, anon;
revoke all on function public.is_member_of(uuid)                from public, anon;
revoke all on function public.is_any_member()                   from public, anon;
revoke all on function public.is_any_leader()                   from public, anon;
revoke all on function public.shares_ministry_with(uuid)        from public, anon;
revoke all on function public.respond_to_schedule(uuid, public.schedule_status, text, boolean) from public, anon;
revoke all on function public.check_schedule_conflicts(uuid, uuid) from public, anon;

-- Trigger de signup: ninguém chama via API
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Helpers de RLS: só authenticated (as policies rodam no contexto do usuário)
grant execute on function public.is_admin()                 to authenticated;
grant execute on function public.is_leader_of(uuid)         to authenticated;
grant execute on function public.is_member_of(uuid)         to authenticated;
grant execute on function public.is_any_member()            to authenticated;
grant execute on function public.is_any_leader()            to authenticated;
grant execute on function public.shares_ministry_with(uuid) to authenticated;
