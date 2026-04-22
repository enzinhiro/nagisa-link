-- Superseded for production when chats also missing:
--   use supabase/scripts/greenfield_chats_wants_rpc.sql (chats → wants → RPC in one script).
--
-- Greenfield: create public.wants + RLS + create_or_get_chat_with_user (final schema).
-- Use only when public.chats already exists and public.wants does not. Run once.

create extension if not exists pgcrypto;

create table public.wants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending',
  responded_at timestamptz null,
  constraint wants_from_ne_to check (from_user <> to_user),
  constraint wants_status_check check (
    status in ('pending', 'matched', 'declined', 'cancelled')
  ),
  constraint wants_from_to_unique unique (from_user, to_user)
);

create index wants_from_user_idx on public.wants (from_user);
create index wants_to_user_idx on public.wants (to_user);
create index wants_status_idx on public.wants (status);
create index wants_created_at_desc_idx on public.wants (created_at desc);

alter table public.wants enable row level security;

create policy "wants_select_sent_by_me"
on public.wants
for select
to authenticated
using (from_user = auth.uid());

create policy "wants_select_received_by_me"
on public.wants
for select
to authenticated
using (to_user = auth.uid());

create policy "wants_insert_as_sender"
on public.wants
for insert
to authenticated
with check (from_user = auth.uid());

create policy "wants_update_as_receiver"
on public.wants
for update
to authenticated
using (to_user = auth.uid())
with check (to_user = auth.uid());

grant select, insert, update on table public.wants to authenticated;

create or replace function public.create_or_get_chat_with_user(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid;
  a uuid;
  b uuid;
  chat_id uuid;
begin
  me := auth.uid();

  if me is null then
    raise exception 'not authenticated';
  end if;

  if target_user_id is null or target_user_id = me then
    raise exception 'invalid target user';
  end if;

  if not exists (
    select 1
    from public.wants w1
    join public.wants w2
      on w1.from_user = me
     and w1.to_user = target_user_id
     and w1.status = 'matched'
     and w2.from_user = target_user_id
     and w2.to_user = me
     and w2.status = 'matched'
  ) then
    raise exception 'not matched yet';
  end if;

  a := least(me, target_user_id);
  b := greatest(me, target_user_id);

  insert into public.chats (user_a_id, user_b_id, status, expires_at)
  values (a, b, 'active', now() + interval '24 hours')
  on conflict (user_a_id, user_b_id) do nothing
  returning id into chat_id;

  if chat_id is null then
    select c.id into chat_id
    from public.chats c
    where c.user_a_id = a and c.user_b_id = b
    limit 1;
  end if;

  return chat_id;
end;
$$;

revoke all on function public.create_or_get_chat_with_user(uuid) from public;
grant execute on function public.create_or_get_chat_with_user(uuid) to authenticated;
