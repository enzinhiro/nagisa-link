create or replace function public.admin_list_invite_codes()
returns table (
  id uuid,
  code text,
  created_at timestamptz,
  is_used boolean,
  is_active boolean,
  used_by_email text,
  note text
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
    ic.id,
    ic.code,
    ic.created_at,
    coalesce(ic.is_used, false) as is_used,
    coalesce(ic.is_active, true) as is_active,
    ic.used_by_email,
    ic.note
  from public.invite_codes ic
  order by ic.created_at desc;
end;
$$;

create or replace function public.admin_set_invite_code_active(input_invite_id uuid, input_is_active boolean)
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

  if input_invite_id is null then
    return false;
  end if;

  update public.invite_codes
     set is_active = coalesce(input_is_active, true)
   where id = input_invite_id
     and coalesce(is_used, false) = false;

  get diagnostics updated_rows = row_count;
  return updated_rows = 1;
end;
$$;

revoke all on function public.admin_list_invite_codes() from public;
revoke all on function public.admin_set_invite_code_active(uuid, boolean) from public;

grant execute on function public.admin_list_invite_codes() to authenticated;
grant execute on function public.admin_set_invite_code_active(uuid, boolean) to authenticated;
