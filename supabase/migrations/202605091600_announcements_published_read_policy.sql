-- Readable name for published SELECT policy; admin SELECT/INSERT/UPDATE/DELETE unchanged.
-- Idempotent for DBs created before the rename.

drop policy if exists "announcements_select_published" on public.announcements;
drop policy if exists "Authenticated users can read published announcements" on public.announcements;

create policy "Authenticated users can read published announcements"
on public.announcements
for select
to authenticated
using (is_published = true);
