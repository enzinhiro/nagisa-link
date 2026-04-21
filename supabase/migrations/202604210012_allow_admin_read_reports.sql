drop policy if exists "reports_select_admin" on public.reports;
create policy "reports_select_admin"
on public.reports
for select
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'enzin-office@gmail.com');
