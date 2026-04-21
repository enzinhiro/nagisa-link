-- Signup calls consume_invite_code before auth.signUp (no session).
-- Legacy consume_invite_code(text) required auth.uid() and was granted only to
-- authenticated, which breaks anon RPC and surfaces as a generic "confirm failed" error.
-- This migration aligns the remote DB with 004/005 behavior: columns + anon-safe RPCs.

create extension if not exists pgcrypto;

alter table public.invite_codes
  add column if not exists is_used boolean not null default false,
  add column if not exists used_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists used_by_email text;

update public.invite_codes
set
  is_used = true,
  used_by_user_id = coalesce(used_by_user_id, used_by),
  used_at = coalesce(used_at, now())
where used_by is not null
  and is_used = false;

create unique index if not exists idx_invite_codes_code_upper_unique
  on public.invite_codes ((upper(code)));

drop function if exists public.consume_invite_code(text);
drop function if exists public.consume_invite_code(text, text, uuid);

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
      and ic.used_by is null
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
  if updated_rows = 1 then
    return true;
  end if;

  if exists (
    select 1
    from public.invite_codes ic
    where upper(ic.code) = normalized_code
      and ic.is_active = true
      and coalesce(ic.is_used, false) = true
      and lower(coalesce(ic.used_by_email, '')) = normalized_email
      and (
        input_user_id is null
        or ic.used_by_user_id is null
        or ic.used_by_user_id = input_user_id
      )
  ) then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.link_invite_code_user(
  input_email text,
  input_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  updated_rows integer;
begin
  normalized_email := lower(trim(input_email));

  if normalized_email is null or normalized_email = '' or input_user_id is null then
    return false;
  end if;

  update public.invite_codes
     set used_by_user_id = input_user_id
   where lower(coalesce(used_by_email, '')) = normalized_email
     and is_used = true
     and is_active = true
     and (used_by_user_id is null or used_by_user_id = input_user_id);

  get diagnostics updated_rows = row_count;
  return updated_rows > 0;
end;
$$;

create or replace function public.has_consumed_invite(
  input_email text,
  input_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  has_record boolean;
begin
  normalized_email := lower(trim(coalesce(input_email, '')));

  select exists (
    select 1
    from public.invite_codes ic
    where ic.is_used = true
      and (
        (input_user_id is not null and ic.used_by_user_id = input_user_id)
        or (normalized_email <> '' and lower(coalesce(ic.used_by_email, '')) = normalized_email)
      )
  )
  into has_record;

  return has_record;
end;
$$;

revoke all on function public.validate_invite_code(text) from public;
revoke all on function public.consume_invite_code(text, text, uuid) from public;
revoke all on function public.link_invite_code_user(text, uuid) from public;
revoke all on function public.has_consumed_invite(text, uuid) from public;

grant execute on function public.validate_invite_code(text) to anon;
grant execute on function public.validate_invite_code(text) to authenticated;
grant execute on function public.consume_invite_code(text, text, uuid) to anon;
grant execute on function public.consume_invite_code(text, text, uuid) to authenticated;
grant execute on function public.link_invite_code_user(text, uuid) to authenticated;
grant execute on function public.has_consumed_invite(text, uuid) to authenticated;
