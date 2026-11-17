-- =====================================================================
-- Telefones no padrão BR + correção do cadastro
-- 1) handle_new_user agora grava o telefone do cadastro (antes era perdido:
--    vinha em user_metadata.phone mas o trigger não copiava para profiles).
-- 2) Normaliza telefones já gravados para (DD) 99999-9999 / (DD) 9999-9999.
--    O app grava sempre nesse formato (src/lib/phone.ts).
-- =====================================================================
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, email, phone, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
          new.email,
          nullif(new.raw_user_meta_data ->> 'phone', ''),
          new.raw_user_meta_data ->> 'avatar_url');
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.format_phone_br(p text) returns text
language sql immutable set search_path = '' as $$
  with d as (select regexp_replace(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '^55(\d{10,11})$', '\1') as n)
  select case
    when length(n) = 11 then format('(%s) %s-%s', substr(n,1,2), substr(n,3,5), substr(n,8,4))
    when length(n) = 10 then format('(%s) %s-%s', substr(n,1,2), substr(n,3,4), substr(n,7,4))
    when n = '' then null
    else p end
  from d;
$$;

update public.profiles set phone = public.format_phone_br(phone) where phone is not null;
update public.profile_details set emergency_phone = public.format_phone_br(emergency_phone) where emergency_phone is not null;
