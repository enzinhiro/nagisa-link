create or replace function public.is_active_user()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid;
  usable boolean;
begin
  me := auth.uid();
  if me is null then
    return false;
  end if;

  -- Keep admin operations available even if admin account is suspended by mistake.
  if lower(coalesce(auth.jwt() ->> 'email', '')) = 'enzin-office@gmail.com' then
    return true;
  end if;

  select (not p.is_suspended)
    into usable
  from public.profiles p
  where p.id = me;

  return coalesce(usable, false);
end;
$$;

revoke all on function public.is_active_user() from public;
grant execute on function public.is_active_user() to authenticated;

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid() and public.is_active_user());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid() and public.is_active_user())
with check (id = auth.uid() and public.is_active_user());

drop policy if exists "wants_insert_as_sender" on public.wants;
create policy "wants_insert_as_sender"
on public.wants
for insert
to authenticated
with check (from_user = auth.uid() and public.is_active_user());

drop policy if exists "wants_update_as_receiver" on public.wants;
create policy "wants_update_as_receiver"
on public.wants
for update
to authenticated
using (to_user = auth.uid() and public.is_active_user())
with check (to_user = auth.uid() and public.is_active_user());

drop policy if exists "messages_insert_chat_participants" on public.messages;
create policy "messages_insert_chat_participants"
on public.messages
for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and public.is_active_user()
  and exists (
    select 1
    from public.chats c
    where c.id = messages.chat_id
      and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
  )
);

drop policy if exists "reports_insert_participant" on public.reports;
create policy "reports_insert_participant"
on public.reports
for insert
to authenticated
with check (
  reporter_user_id = auth.uid()
  and public.is_active_user()
  and exists (
    select 1
    from public.chats c
    where c.id = reports.chat_id
      and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
  )
);
