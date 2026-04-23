-- Greenfield (production SQL Editor): public.chats → public.wants → create_or_get_chat_with_user
-- Run once when NEITHER public.chats NOR public.wants exist. No DROP TABLE / CASCADE.
-- Order in this file: 1) chats  2) wants  3) RPC (uses both)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) public.chats
-- ---------------------------------------------------------------------------
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_a_id uuid not null references auth.users (id) on delete cascade,
  user_b_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  ended_at timestamptz null,
  constraint chats_not_self check (user_a_id <> user_b_id),
  constraint chats_user_order_check check (user_a_id < user_b_id),
  constraint chats_status_check check (status in ('active', 'ended', 'expired')),
  constraint chats_unique_pair unique (user_a_id, user_b_id)
);

create index chats_user_a_id_idx on public.chats (user_a_id);
create index chats_user_b_id_idx on public.chats (user_b_id);
create index chats_status_idx on public.chats (status);
create index chats_expires_at_desc_idx on public.chats (expires_at desc);

alter table public.chats enable row level security;

create policy "chats_select_participants"
on public.chats
for select
to authenticated
using (user_a_id = auth.uid() or user_b_id = auth.uid());

create policy "chats_insert_participants"
on public.chats
for insert
to authenticated
with check (
  (user_a_id = auth.uid() or user_b_id = auth.uid())
  and user_a_id < user_b_id
);

grant select, insert on table public.chats to authenticated;

-- ---------------------------------------------------------------------------
-- 2) public.wants
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 3) RPC: mutual matched wants → get or create chat row (security definer)
-- ---------------------------------------------------------------------------
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
    from public.wants w
    where w.status = 'matched'
      and (
        (w.from_user = me and w.to_user = target_user_id)
        or (w.from_user = target_user_id and w.to_user = me)
      )
  ) then
    raise exception 'not matched yet';
  end if;

  a := least(me, target_user_id);
  b := greatest(me, target_user_id);

  insert into public.chats (user_a_id, user_b_id, status, started_at, expires_at)
  values (a, b, 'active', now(), now() + interval '24 hours')
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
