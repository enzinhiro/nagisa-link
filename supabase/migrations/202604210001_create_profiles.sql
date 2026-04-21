-- profiles table for onboarding completion gate
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) > 0),
  area text not null check (char_length(trim(area)) > 0),
  child_age_group text not null check (char_length(trim(child_age_group)) > 0),
  child_gender text not null check (char_length(trim(child_gender)) > 0),
  child_interest_tags text[] not null default '{}'::text[],
  want_to_connect text not null check (char_length(trim(want_to_connect)) > 0),
  connection_preference text not null check (char_length(trim(connection_preference)) > 0),
  meeting_range text not null check (char_length(trim(meeting_range)) > 0),
  intro text not null check (char_length(trim(intro)) > 0),
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_child_interest_tags_max_5
    check (coalesce(array_length(child_interest_tags, 1), 0) <= 5)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
