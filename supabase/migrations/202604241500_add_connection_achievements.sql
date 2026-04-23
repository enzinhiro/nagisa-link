-- Quiet "つながり実績" for internal testing.
-- Rules:
-- - Increment both users when a chat is first established between a pair.
-- - Same pair counts only once.

alter table public.profiles
  add column if not exists connection_achievement_count integer not null default 0
  check (connection_achievement_count >= 0);

create table if not exists public.connection_achievements (
  user_low_id uuid not null references auth.users(id) on delete cascade,
  user_high_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_low_id, user_high_id),
  constraint connection_achievements_order_check check (user_low_id < user_high_id)
);

-- Optional backfill from existing chats so current users are not always 0.
insert into public.connection_achievements (user_low_id, user_high_id)
select distinct
  least(c.user_a_id, c.user_b_id),
  greatest(c.user_a_id, c.user_b_id)
from public.chats c
on conflict (user_low_id, user_high_id) do nothing;

with counts as (
  select user_id, count(*)::integer as cnt
  from (
    select user_low_id as user_id from public.connection_achievements
    union all
    select user_high_id as user_id from public.connection_achievements
  ) t
  group by user_id
)
update public.profiles p
set connection_achievement_count = coalesce(c.cnt, 0)
from counts c
where p.id = c.user_id;

create or replace function public.award_connection_achievement_for_pair(user_1 uuid, user_2 uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  low_id uuid;
  high_id uuid;
  inserted_low uuid;
begin
  if user_1 is null or user_2 is null or user_1 = user_2 then
    return;
  end if;

  low_id := least(user_1, user_2);
  high_id := greatest(user_1, user_2);

  insert into public.connection_achievements (user_low_id, user_high_id)
  values (low_id, high_id)
  on conflict (user_low_id, user_high_id) do nothing
  returning user_low_id into inserted_low;

  if inserted_low is null then
    return;
  end if;

  update public.profiles
  set connection_achievement_count = connection_achievement_count + 1
  where id in (low_id, high_id);
end;
$$;

revoke all on function public.award_connection_achievement_for_pair(uuid, uuid) from public;
grant execute on function public.award_connection_achievement_for_pair(uuid, uuid) to authenticated;

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

  insert into public.chats (user_a_id, user_b_id, status, expires_at)
  values (a, b, 'active', now() + interval '24 hours')
  on conflict (user_a_id, user_b_id) do nothing
  returning id into chat_id;

  if chat_id is not null then
    perform public.award_connection_achievement_for_pair(a, b);
    return chat_id;
  end if;

  select c.id into chat_id
  from public.chats c
  where c.user_a_id = a and c.user_b_id = b
  limit 1;

  return chat_id;
end;
$$;

revoke all on function public.create_or_get_chat_with_user(uuid) from public;
grant execute on function public.create_or_get_chat_with_user(uuid) to authenticated;
