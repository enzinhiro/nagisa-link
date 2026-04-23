create or replace function public.admin_list_users()
returns table (
  id uuid,
  real_name text,
  nickname text,
  email text,
  area text,
  created_at timestamptz,
  profile_completed boolean,
  is_suspended boolean,
  invite_used boolean,
  invite_code text,
  invite_note text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'forbidden';
  end if;

  return query
  select
    p.id,
    p.real_name,
    p.nickname,
    au.email::text,
    p.area,
    p.created_at,
    p.profile_completed,
    p.is_suspended,
    (inv.code is not null) as invite_used,
    inv.code as invite_code,
    inv.note as invite_note
  from public.profiles p
  left join auth.users au on au.id = p.id
  left join lateral (
    select ic.code, ic.note, ic.used_at
    from public.invite_codes ic
    where ic.used_by_user_id = p.id
      or (
        au.email is not null
        and lower(coalesce(ic.used_by_email, '')) = lower(au.email::text)
      )
    order by ic.used_at desc nulls last, ic.created_at desc
    limit 1
  ) inv on true
  order by p.created_at desc;
end;
$$;

create or replace function public.admin_get_user_detail(input_user_id uuid)
returns table (
  id uuid,
  real_name text,
  nickname text,
  email text,
  area text,
  created_at timestamptz,
  profile_completed boolean,
  is_suspended boolean,
  invite_used boolean,
  invite_code text,
  invite_note text,
  invite_used_at timestamptz,
  intro text,
  want_to_connect text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'forbidden';
  end if;

  return query
  select
    p.id,
    p.real_name,
    p.nickname,
    au.email::text,
    p.area,
    p.created_at,
    p.profile_completed,
    p.is_suspended,
    (inv.code is not null) as invite_used,
    inv.code as invite_code,
    inv.note as invite_note,
    inv.used_at as invite_used_at,
    p.intro,
    p.want_to_connect
  from public.profiles p
  left join auth.users au on au.id = p.id
  left join lateral (
    select ic.code, ic.note, ic.used_at
    from public.invite_codes ic
    where ic.used_by_user_id = p.id
      or (
        au.email is not null
        and lower(coalesce(ic.used_by_email, '')) = lower(au.email::text)
      )
    order by ic.used_at desc nulls last, ic.created_at desc
    limit 1
  ) inv on true
  where p.id = input_user_id
  limit 1;
end;
$$;

revoke all on function public.admin_list_users() from public;
revoke all on function public.admin_get_user_detail(uuid) from public;

grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_get_user_detail(uuid) to authenticated;
