create extension if not exists pgcrypto;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  note text,
  constraint reports_not_self check (reporter_user_id <> target_user_id),
  constraint reports_reason_check check (
    reason in ('uncomfortable', 'solicitation', 'pressured_contact', 'suspicious_profile', 'other')
  )
);

create index if not exists idx_reports_chat_created_at
  on public.reports (chat_id, created_at);

alter table public.reports enable row level security;

drop policy if exists "reports_insert_participant" on public.reports;
create policy "reports_insert_participant"
on public.reports
for insert
to authenticated
with check (
  reporter_user_id = auth.uid()
  and exists (
    select 1
    from public.chats c
    where c.id = reports.chat_id
      and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
  )
);

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
on public.reports
for select
to authenticated
using (reporter_user_id = auth.uid());
