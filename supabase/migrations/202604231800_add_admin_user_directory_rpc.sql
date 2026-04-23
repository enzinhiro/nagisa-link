create or replace function public.admin_list_users()
returns table (
  id uuid,
  real_name text,
  nickname text,
  email text,
  area text,
  created_at timestamptz,
  is_suspended boolean,
  invite_used boolean,
  invite_code text
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
    p.is_suspended,
    (inv.code is not null) as invite_used,
    inv.code as invite_code
  from public.profiles p
  left join auth.users au on au.id = p.id
  left join lateral (
    select ic.code
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
  is_suspended boolean,
  invite_used boolean,
  invite_code text,
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
    p.is_suspended,
    (inv.code is not null) as invite_used,
    inv.code as invite_code,
    p.intro,
    p.want_to_connect
  from public.profiles p
  left join auth.users au on au.id = p.id
  left join lateral (
    select ic.code
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

create or replace function public.admin_set_user_suspension(input_user_id uuid, input_suspended boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows integer;
begin
  if not public.is_admin_user() then
    raise exception 'forbidden';
  end if;

  if input_user_id is null then
    return false;
  end if;

  update public.profiles
     set is_suspended = coalesce(input_suspended, false),
         suspended_at = case when coalesce(input_suspended, false) then now() else null end
   where id = input_user_id;

  get diagnostics updated_rows = row_count;
  return updated_rows = 1;
end;
$$;

revoke all on function public.admin_list_users() from public;
revoke all on function public.admin_get_user_detail(uuid) from public;
revoke all on function public.admin_set_user_suspension(uuid, boolean) from public;

grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_get_user_detail(uuid) to authenticated;
grant execute on function public.admin_set_user_suspension(uuid, boolean) to authenticated;
