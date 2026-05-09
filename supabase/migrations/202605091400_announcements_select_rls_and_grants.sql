-- Harden announcements read access:
-- 1) Grant SELECT so API role can read subject to RLS (matches typical Supabase public schema grants).
-- 2) Split SELECT policies: published rows for all authenticated users; full visibility for admins.
--    (Admin INSERT/UPDATE/DELETE policies are unchanged.)

grant select on table public.announcements to authenticated;

drop policy if exists "announcements_select_published_or_admin" on public.announcements;

drop policy if exists "announcements_select_published" on public.announcements;
drop policy if exists "Authenticated users can read published announcements" on public.announcements;
create policy "Authenticated users can read published announcements"
on public.announcements
for select
to authenticated
using (is_published = true);

drop policy if exists "announcements_select_admin_all" on public.announcements;
create policy "announcements_select_admin_all"
on public.announcements
for select
to authenticated
using (public.is_admin_user());
