create extension if not exists pgcrypto;

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active',
  constraint chats_not_self check (user_a_id <> user_b_id),
  constraint chats_status_check check (status in ('active')),
  constraint chats_user_order_check check (user_a_id < user_b_id),
  constraint chats_unique_pair unique (user_a_id, user_b_id)
);

alter table public.chats enable row level security;

drop policy if exists "chats_select_participants" on public.chats;
create policy "chats_select_participants"
on public.chats
for select
to authenticated
using (user_a_id = auth.uid() or user_b_id = auth.uid());

drop policy if exists "chats_insert_participants" on public.chats;
create policy "chats_insert_participants"
on public.chats
for insert
to authenticated
with check (
  (user_a_id = auth.uid() or user_b_id = auth.uid())
  and user_a_id < user_b_id
);

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

  -- 両方向 accepted のときのみチャット作成を許可
  if not exists (
    select 1
    from public.wants w1
    join public.wants w2
      on w1.from_user_id = me
     and w1.to_user_id = target_user_id
     and w1.status = 'accepted'
     and w2.from_user_id = target_user_id
     and w2.to_user_id = me
     and w2.status = 'accepted'
  ) then
    raise exception 'not matched yet';
  end if;

  a := least(me, target_user_id);
  b := greatest(me, target_user_id);

  insert into public.chats (user_a_id, user_b_id, status)
  values (a, b, 'active')
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
