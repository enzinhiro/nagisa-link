alter table public.wants
  drop constraint if exists wants_status_check;

alter table public.wants
  add constraint wants_status_check
  check (status in ('pending', 'accepted', 'rejected'));

drop policy if exists "wants_update_own_receiver" on public.wants;
create policy "wants_update_own_receiver"
on public.wants
for update
to authenticated
using (to_user_id = auth.uid())
with check (to_user_id = auth.uid());
