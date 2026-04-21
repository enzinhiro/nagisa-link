-- invite codes table and RPC functions
create extension if not exists pgcrypto;

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(trim(code)) > 0),
  is_active boolean not null default true,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_invite_codes_is_active
  on public.invite_codes (is_active);

create index if not exists idx_invite_codes_used_by
  on public.invite_codes (used_by);

alter table public.invite_codes enable row level security;

-- No table policies on invite_codes by design.
-- Clients must use RPC functions below.

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
  normalized_code := trim(input_code);

  if normalized_code is null or normalized_code = '' then
    return false;
  end if;

  select exists (
    select 1
    from public.invite_codes ic
    where ic.code = normalized_code
      and ic.is_active = true
      and ic.used_by is null
  )
  into is_valid;

  return is_valid;
end;
$$;

create or replace function public.consume_invite_code(input_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text;
  updated_rows integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  normalized_code := trim(input_code);
  if normalized_code is null or normalized_code = '' then
    return false;
  end if;

  update public.invite_codes
     set used_by = auth.uid(),
         used_at = now()
   where code = normalized_code
     and is_active = true
     and used_by is null;

  get diagnostics updated_rows = row_count;
  return updated_rows = 1;
end;
$$;

revoke all on function public.validate_invite_code(text) from public;
revoke all on function public.consume_invite_code(text) from public;

grant execute on function public.validate_invite_code(text) to anon;
grant execute on function public.validate_invite_code(text) to authenticated;
grant execute on function public.consume_invite_code(text) to authenticated;
