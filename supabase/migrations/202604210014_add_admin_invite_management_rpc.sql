create or replace function public.is_admin_user()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  email text;
begin
  email := lower(coalesce(auth.jwt() ->> 'email', ''));
  return email = 'enzin-office@gmail.com';
end;
$$;

create or replace function public.admin_list_invite_codes()
returns table (
  id uuid,
  code text,
  created_at timestamptz,
  is_used boolean,
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
    ic.used_by_email,
    ic.note
  from public.invite_codes ic
  order by ic.created_at desc;
end;
$$;

create or replace function public.admin_create_invite_code(input_note text default null)
returns table (
  id uuid,
  code text,
  created_at timestamptz,
  note text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_code text;
begin
  if not public.is_admin_user() then
    raise exception 'forbidden';
  end if;

  loop
    generated_code := 'NAGI-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    begin
      return query
      insert into public.invite_codes (code, note)
      values (generated_code, nullif(trim(coalesce(input_note, '')), ''))
      returning invite_codes.id, invite_codes.code, invite_codes.created_at, invite_codes.note;
      return;
    exception
      when unique_violation then
        -- retry with another generated code
    end;
  end loop;
end;
$$;

create or replace function public.admin_update_invite_note(input_invite_id uuid, input_note text)
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
     set note = nullif(trim(coalesce(input_note, '')), '')
   where id = input_invite_id;

  get diagnostics updated_rows = row_count;
  return updated_rows = 1;
end;
$$;

revoke all on function public.is_admin_user() from public;
revoke all on function public.admin_list_invite_codes() from public;
revoke all on function public.admin_create_invite_code(text) from public;
revoke all on function public.admin_update_invite_note(uuid, text) from public;

grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.admin_list_invite_codes() to authenticated;
grant execute on function public.admin_create_invite_code(text) to authenticated;
grant execute on function public.admin_update_invite_note(uuid, text) to authenticated;
