create extension if not exists pgcrypto;

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  is_active boolean not null default true,
  is_used boolean not null default false,
  used_by uuid references auth.users(id) on delete set null,
  used_by_user_id uuid references auth.users(id) on delete set null,
  used_by_email text,
  used_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

alter table public.invite_codes
  add column if not exists is_active boolean not null default true,
  add column if not exists is_used boolean not null default false,
  add column if not exists used_by uuid references auth.users(id) on delete set null,
  add column if not exists used_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists used_by_email text,
  add column if not exists used_at timestamptz,
  add column if not exists note text,
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists idx_invite_codes_code_upper_unique
  on public.invite_codes ((upper(code)));

create index if not exists idx_invite_codes_used_by_user_id
  on public.invite_codes (used_by_user_id);

alter table public.profiles
  add column if not exists is_suspended boolean not null default false,
  add column if not exists suspended_at timestamptz,
  add column if not exists profile_completed boolean not null default false;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  note text,
  status text not null default 'unhandled',
  constraint reports_not_self check (reporter_user_id <> target_user_id),
  constraint reports_reason_check check (
    reason in ('uncomfortable', 'solicitation', 'pressured_contact', 'suspicious_profile', 'other')
  ),
  constraint reports_status_check check (status in ('unhandled', 'reviewing', 'resolved'))
);

alter table public.reports
  add column if not exists status text not null default 'unhandled',
  add column if not exists note text;

create index if not exists idx_reports_chat_created_at
  on public.reports (chat_id, created_at);

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
  return email in ('enzin-office@gmail.com', 'enzin.office@gmail.com');
end;
$$;

create or replace function public.admin_list_invite_codes()
returns table (
  id uuid,
  code text,
  created_at timestamptz,
  is_used boolean,
  is_active boolean,
  used_by_user_id uuid,
  used_by_email text,
  used_at timestamptz,
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
    ic.used_by_user_id,
    ic.used_by_email,
    ic.used_at,
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
        -- retry
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

  update public.invite_codes
     set note = nullif(trim(coalesce(input_note, '')), '')
   where id = input_invite_id;

  get diagnostics updated_rows = row_count;
  return updated_rows = 1;
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

  update public.invite_codes
     set is_active = coalesce(input_is_active, true)
   where id = input_invite_id
     and coalesce(is_used, false) = false;

  get diagnostics updated_rows = row_count;
  return updated_rows = 1;
end;
$$;

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

  update public.profiles
     set is_suspended = coalesce(input_suspended, false),
         suspended_at = case when coalesce(input_suspended, false) then now() else null end
   where id = input_user_id;

  get diagnostics updated_rows = row_count;
  return updated_rows = 1;
end;
$$;

alter table public.reports enable row level security;

drop policy if exists "reports_select_admin" on public.reports;
create policy "reports_select_admin"
on public.reports
for select
to authenticated
using (public.is_admin_user());

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin"
on public.reports
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

revoke all on function public.is_admin_user() from public;
revoke all on function public.admin_list_invite_codes() from public;
revoke all on function public.admin_create_invite_code(text) from public;
revoke all on function public.admin_update_invite_note(uuid, text) from public;
revoke all on function public.admin_set_invite_code_active(uuid, boolean) from public;
revoke all on function public.admin_list_users() from public;
revoke all on function public.admin_get_user_detail(uuid) from public;
revoke all on function public.admin_set_user_suspension(uuid, boolean) from public;

grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.admin_list_invite_codes() to authenticated;
grant execute on function public.admin_create_invite_code(text) to authenticated;
grant execute on function public.admin_update_invite_note(uuid, text) to authenticated;
grant execute on function public.admin_set_invite_code_active(uuid, boolean) to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_get_user_detail(uuid) to authenticated;
grant execute on function public.admin_set_user_suspension(uuid, boolean) to authenticated;
