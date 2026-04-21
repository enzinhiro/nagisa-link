alter table public.chats
  add column if not exists expires_at timestamptz;

update public.chats
set expires_at = created_at + interval '24 hours'
where expires_at is null;

alter table public.chats
  alter column expires_at set not null;

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
