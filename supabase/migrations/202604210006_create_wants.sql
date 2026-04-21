create extension if not exists pgcrypto;

create table if not exists public.wants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  constraint wants_from_to_unique unique (from_user_id, to_user_id),
  constraint wants_not_self check (from_user_id <> to_user_id),
  constraint wants_status_check check (status in ('pending'))
);

alter table public.wants enable row level security;

drop policy if exists "wants_insert_own_sender" on public.wants;
create policy "wants_insert_own_sender"
on public.wants
for insert
to authenticated
with check (from_user_id = auth.uid());

drop policy if exists "wants_select_own_related" on public.wants;
create policy "wants_select_own_related"
on public.wants
for select
to authenticated
using (from_user_id = auth.uid() or to_user_id = auth.uid());
