-- public.messages for chat UI (GET /rest/v1/messages). Safe if table already exists.

create extension if not exists pgcrypto;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  sender_user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  constraint messages_body_not_blank check (char_length(trim(body)) > 0),
  constraint messages_body_max_500 check (char_length(body) <= 500)
);

create index if not exists idx_messages_chat_created_at on public.messages (chat_id, created_at);

alter table public.messages enable row level security;

drop policy if exists "messages_select_chat_participants" on public.messages;
create policy "messages_select_chat_participants"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.chats c
    where c.id = messages.chat_id
      and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
  )
);

drop policy if exists "messages_insert_chat_participants" on public.messages;
create policy "messages_insert_chat_participants"
on public.messages
for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and exists (
    select 1
    from public.chats c
    where c.id = messages.chat_id
      and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
  )
);

grant select, insert on table public.messages to authenticated;
