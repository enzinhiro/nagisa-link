create extension if not exists pgcrypto;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  body text not null check (char_length(trim(body)) > 0),
  type text not null default 'notice' check (type in ('notice', 'event', 'update', 'perk', 'important')),
  is_published boolean not null default true,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_announcements_updated_at on public.announcements;
create trigger trg_announcements_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

create index if not exists announcements_published_created_idx
  on public.announcements (is_published, created_at desc);

alter table public.announcements enable row level security;

grant select on table public.announcements to authenticated;

drop policy if exists "announcements_select_published_or_admin" on public.announcements;
drop policy if exists "announcements_select_published" on public.announcements;
drop policy if exists "Authenticated users can read published announcements" on public.announcements;
create policy "Authenticated users can read published announcements"
on public.announcements
for select
to authenticated
using (is_published = true);

drop policy if exists "announcements_select_admin_all" on public.announcements;
create policy "announcements_select_admin_all"
on public.announcements
for select
to authenticated
using (public.is_admin_user());

drop policy if exists "announcements_insert_admin" on public.announcements;
create policy "announcements_insert_admin"
on public.announcements
for insert
to authenticated
with check (public.is_admin_user());

drop policy if exists "announcements_update_admin" on public.announcements;
create policy "announcements_update_admin"
on public.announcements
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "announcements_delete_admin" on public.announcements;
create policy "announcements_delete_admin"
on public.announcements
for delete
to authenticated
using (public.is_admin_user());

alter table public.profiles
  add column if not exists announcements_last_read_at timestamptz null;
