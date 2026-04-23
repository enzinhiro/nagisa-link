-- Fix: allow first profile insert for new users without existing profiles row.
-- Keep suspension block for profile updates.

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());
