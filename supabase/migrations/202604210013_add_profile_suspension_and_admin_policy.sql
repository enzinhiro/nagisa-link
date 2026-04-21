alter table public.profiles
  add column if not exists is_suspended boolean not null default false,
  add column if not exists suspended_at timestamptz;

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
on public.profiles
for select
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'enzin-office@gmail.com');

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'enzin-office@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'enzin-office@gmail.com');
