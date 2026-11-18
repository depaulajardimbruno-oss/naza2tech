-- =====================================================================
-- Último acesso dos usuários (para o ADM)
-- auth.users.last_sign_in_at fica no schema auth, que o app não lê.
-- Esta função expõe SÓ id + último login + criação da conta, e só para ADM.
-- =====================================================================
create or replace function public.admin_user_sign_ins()
returns table (id uuid, last_sign_in_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores';
  end if;
  return query select u.id, u.last_sign_in_at, u.created_at from auth.users u;
end $$;

revoke execute on function public.admin_user_sign_ins() from public, anon;
grant execute on function public.admin_user_sign_ins() to authenticated;
