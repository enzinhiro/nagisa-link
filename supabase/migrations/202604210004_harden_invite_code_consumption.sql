-- Harden invite code consumption for one-time use
alter table public.invite_codes
  add column if not exists is_used boolean not null default false,
  add column if not exists used_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists used_by_email text;

-- Backfill from legacy fields if present
update public.invite_codes
set
  is_used = true,
  used_by_user_id = coalesce(used_by_user_id, used_by),
  used_at = coalesce(used_at, now())
where used_by is not null
  and is_used = false;

-- Case-insensitive uniqueness for invite codes
create unique index if not exists idx_invite_codes_code_upper_unique
  on public.invite_codes ((upper(code)));

drop function if exists public.consume_invite_code(text);

create or replace function public.validate_invite_code(input_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text;
  is_valid boolean;
begin
  normalized_code := upper(trim(input_code));

  if normalized_code is null or normalized_code = '' then
    return false;
  end if;

  select exists (
    select 1
    from public.invite_codes ic
    where upper(ic.code) = normalized_code
      and ic.is_active = true
      and coalesce(ic.is_used, false) = false
      and ic.used_at is null
  )
  into is_valid;

  return is_valid;
end;
$$;

create or replace function public.consume_invite_code(
  input_code text,
  input_email text,
  input_user_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text;
  normalized_email text;
  updated_rows integer;
begin
  normalized_code := upper(trim(input_code));
  normalized_email := lower(trim(input_email));

  if normalized_code is null or normalized_code = '' then
    return false;
  end if;

  if normalized_email is null or normalized_email = '' then
    return false;
  end if;

  update public.invite_codes
     set is_used = true,
         used_by_user_id = coalesce(input_user_id, used_by_user_id),
         used_by_email = normalized_email,
         used_at = now()
   where upper(code) = normalized_code
     and is_active = true
     and coalesce(is_used, false) = false
     and used_at is null;

  get diagnostics updated_rows = row_count;
  return updated_rows = 1;
end;
$$;

revoke all on function public.validate_invite_code(text) from public;
revoke all on function public.consume_invite_code(text, text, uuid) from public;

grant execute on function public.validate_invite_code(text) to anon;
grant execute on function public.validate_invite_code(text) to authenticated;
grant execute on function public.consume_invite_code(text, text, uuid) to anon;
grant execute on function public.consume_invite_code(text, text, uuid) to authenticated;
