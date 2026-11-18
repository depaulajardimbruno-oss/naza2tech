-- =====================================================================
-- Aniversariantes: lista os próximos aniversários (dia/mês) para quem é membro
-- de algum ministério ou ADM. profile_details é privado (só a própria pessoa e o ADM),
-- então a leitura passa por esta função, que devolve SÓ nome + dia + mês (nunca o ano
-- nem a idade) de usuários ativos. Data de "hoje" no fuso de São Paulo.
-- 29/02 em ano não bissexto cai em 01/03.
-- =====================================================================
create function public.upcoming_birthdays(p_days int default 30)
returns table (profile_id uuid, name text, day int, month int, days_until int)
language sql stable security definer set search_path = '' as $$
  with hoje as (select (now() at time zone 'America/Sao_Paulo')::date as t)
  select p.id,
         coalesce(nullif(p.nickname, ''), p.full_name),
         extract(day from d.birth_date)::int,
         extract(month from d.birth_date)::int,
         (n.next_date - h.t)::int
  from hoje h
  join public.profile_details d on d.birth_date is not null
  join public.profiles p on p.id = d.profile_id and p.active
  cross join lateral (
    select min(c) as next_date
    from (
      select (make_date(y, 1, 1)
              + ((extract(month from d.birth_date)::int - 1) * interval '1 month')
              + ((extract(day from d.birth_date)::int - 1) * interval '1 day'))::date as c
      from generate_series(extract(year from h.t)::int, extract(year from h.t)::int + 1) y
    ) z
    where c >= h.t
  ) n
  where (public.is_admin() or public.is_any_member())
    and (n.next_date - h.t) <= greatest(p_days, 0)
  order by (n.next_date - h.t), 2;
$$;
revoke execute on function public.upcoming_birthdays(int) from public, anon;
grant execute on function public.upcoming_birthdays(int) to authenticated;
