-- create_or_get_chat_with_user: allow chat when a single matched want links the pair
-- (B accepts A's offer → one row A→B matched; no second B→A row required.)

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
