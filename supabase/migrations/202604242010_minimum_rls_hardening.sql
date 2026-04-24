-- Minimum RLS hardening before public release.
-- Scope:
-- 1) Strengthen reports_insert_participant
-- 2) Restore is_active_user() check for profiles_insert_own
-- 3) Unify profiles admin policies with is_admin_user()

create or replace function public.is_admin_user()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  email text;
begin
  email := lower(coalesce(auth.jwt() ->> 'email', ''));
  return email in ('enzin-office@gmail.com', 'enzin.office@gmail.com');
end;
$$;

create or replace function public.is_active_user()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  me uuid;
  suspended boolean;
begin
  me := auth.uid();
  if me is null then
    return false;
  end if;

  select p.is_suspended
    into suspended
  from public.profiles p
  where p.id = me;

  -- Initial users without a profile row are treated as active.
  if suspended is null then
    return true;
  end if;

  return not suspended;
end;
$$;

revoke all on function public.is_admin_user() from public;
revoke all on function public.is_active_user() from public;
grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.is_active_user() to authenticated;

alter table public.reports enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "reports_insert_participant" on public.reports;
create policy "reports_insert_participant"
on public.reports
for insert
to authenticated
with check (
  reporter_user_id = auth.uid()
  and public.is_active_user()
  and target_user_id <> auth.uid()
  and exists (
    select 1
    from public.chats c
    where c.id = reports.chat_id
      and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
      and reports.target_user_id in (c.user_a_id, c.user_b_id)
  )
);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and public.is_active_user()
);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
on public.profiles
for select
to authenticated
using (public.is_admin_user());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
