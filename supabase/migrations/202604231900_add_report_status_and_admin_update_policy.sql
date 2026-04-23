alter table public.reports
  add column if not exists status text not null default 'unhandled';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reports_status_check'
  ) then
    alter table public.reports
      add constraint reports_status_check
      check (status in ('unhandled', 'reviewing', 'resolved'));
  end if;
end $$;

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin"
on public.reports
for update
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'enzin-office@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'enzin-office@gmail.com');
