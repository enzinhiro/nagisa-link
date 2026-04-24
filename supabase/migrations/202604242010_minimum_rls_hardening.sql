-- Minimum RLS hardening before public release.
-- Scope:
-- 1) Strengthen reports_insert_participant
-- 2) Restore is_active_user() check for profiles_insert_own
-- 3) Unify profiles admin policies with is_admin_user()

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
