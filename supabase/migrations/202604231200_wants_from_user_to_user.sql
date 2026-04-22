-- Safe migration: public.wants from legacy (from_user_id / to_user_id, accepted/rejected)
-- to app schema (from_user / to_user, pending/matched/declined/cancelled).
-- No DROP TABLE. No CASCADE.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'wants'
      and c.relkind = 'r'
  ) then
    raise exception 'public.wants is missing; apply migrations that create wants (e.g. 202604210006) first.';
  end if;
end $$;

-- A: add new / optional columns (nullable first where needed)
alter table public.wants add column if not exists from_user uuid;
alter table public.wants add column if not exists to_user uuid;
alter table public.wants add column if not exists responded_at timestamptz;
alter table public.wants add column if not exists created_at timestamptz default now();

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wants'
      and column_name = 'status'
  ) then
    alter table public.wants add column status text not null default 'pending';
  end if;
end $$;

-- Normalize legacy status values before (re)adding check constraint
alter table public.wants drop constraint if exists wants_status_check;

update public.wants
set status = 'matched'
where status = 'accepted';

update public.wants
set status = 'declined'
where status = 'rejected';

update public.wants
set status = 'pending'
where status is null
   or status not in ('pending', 'matched', 'declined', 'cancelled');

alter table public.wants
  add constraint wants_status_check
  check (status in ('pending', 'matched', 'declined', 'cancelled'));

-- B: copy legacy id columns into new columns when present (each column guarded separately)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wants'
      and column_name = 'from_user_id'
  ) then
    update public.wants
    set from_user = from_user_id
    where from_user is null
      and from_user_id is not null;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wants'
      and column_name = 'to_user_id'
  ) then
    update public.wants
    set to_user = to_user_id
    where to_user is null
      and to_user_id is not null;
  end if;
end $$;

-- created_at backfill if nullable rows exist (e.g. odd partial state)
update public.wants
set created_at = coalesce(created_at, now())
where created_at is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wants'
      and column_name = 'created_at'
      and is_nullable = 'YES'
  ) then
    alter table public.wants alter column created_at set not null;
  end if;
end $$;

-- Require populated from_user / to_user before NOT NULL
do $$
begin
  if exists (
    select 1
    from public.wants
    where from_user is null
       or to_user is null
    limit 1
  ) then
    raise exception 'wants migration: from_user/to_user still null for one or more rows; fix data then retry.';
  end if;
end $$;

alter table public.wants alter column from_user set not null;
alter table public.wants alter column to_user set not null;

-- Drop legacy constraints that reference old columns / old unique pair
alter table public.wants drop constraint if exists wants_from_to_unique;
alter table public.wants drop constraint if exists wants_not_self;

-- Drop FK constraints that still target legacy *_id columns (names vary by PG version)
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'wants'
      and c.contype = 'f'
      and exists (
        select 1
        from unnest(c.conkey) as ck(attnum)
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = ck.attnum
        where a.attname in ('from_user_id', 'to_user_id')
      )
  loop
    execute format('alter table public.wants drop constraint if exists %I', r.conname);
  end loop;
end $$;

-- D: duplicate check before new unique (fails migration if duplicates)
do $$
begin
  if exists (
    select 1
    from public.wants
    group by from_user, to_user
    having count(*) > 1
  ) then
    raise exception 'wants migration: duplicate (from_user, to_user) pairs exist; resolve duplicates then retry.';
  end if;
end $$;

-- Self-send check + unique pair (drop if re-run)
alter table public.wants drop constraint if exists wants_from_ne_to;
alter table public.wants drop constraint if exists wants_from_to_unique;

alter table public.wants
  add constraint wants_from_ne_to check (from_user <> to_user);

alter table public.wants
  add constraint wants_from_to_unique unique (from_user, to_user);

-- Foreign keys on new columns (idempotent)
alter table public.wants drop constraint if exists wants_from_user_fkey;
alter table public.wants drop constraint if exists wants_to_user_fkey;

alter table public.wants
  add constraint wants_from_user_fkey foreign key (from_user) references auth.users (id) on delete cascade;

alter table public.wants
  add constraint wants_to_user_fkey foreign key (to_user) references auth.users (id) on delete cascade;

-- E: indexes
create index if not exists wants_from_user_idx on public.wants (from_user);
create index if not exists wants_to_user_idx on public.wants (to_user);
create index if not exists wants_status_idx on public.wants (status);
create index if not exists wants_created_at_desc_idx on public.wants (created_at desc);

-- RLS: replace policies (names from old + new migrations)
alter table public.wants enable row level security;

drop policy if exists "wants_insert_own_sender" on public.wants;
drop policy if exists "wants_select_own_related" on public.wants;
drop policy if exists "wants_update_own_receiver" on public.wants;
drop policy if exists "wants_select_sent_by_me" on public.wants;
drop policy if exists "wants_select_received_by_me" on public.wants;
drop policy if exists "wants_insert_as_sender" on public.wants;
drop policy if exists "wants_update_as_receiver" on public.wants;

create policy "wants_select_sent_by_me"
on public.wants
for select
to authenticated
using (from_user = auth.uid());

create policy "wants_select_received_by_me"
on public.wants
for select
to authenticated
using (to_user = auth.uid());

create policy "wants_insert_as_sender"
on public.wants
for insert
to authenticated
with check (from_user = auth.uid());

create policy "wants_update_as_receiver"
on public.wants
for update
to authenticated
using (to_user = auth.uid())
with check (to_user = auth.uid());

grant select, insert, update on table public.wants to authenticated;

-- RPC: mutual matched rows + new column names
create or replace function public.create_or_get_chat_with_user(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid;
  a uuid;
  b uuid;
  chat_id uuid;
begin
  me := auth.uid();

  if me is null then
    raise exception 'not authenticated';
  end if;

  if target_user_id is null or target_user_id = me then
    raise exception 'invalid target user';
  end if;

  if not exists (
    select 1
    from public.wants w1
    join public.wants w2
      on w1.from_user = me
     and w1.to_user = target_user_id
     and w1.status = 'matched'
     and w2.from_user = target_user_id
     and w2.to_user = me
     and w2.status = 'matched'
  ) then
    raise exception 'not matched yet';
  end if;

  a := least(me, target_user_id);
  b := greatest(me, target_user_id);

  insert into public.chats (user_a_id, user_b_id, status, expires_at)
  values (a, b, 'active', now() + interval '24 hours')
  on conflict (user_a_id, user_b_id) do nothing
  returning id into chat_id;

  if chat_id is null then
    select c.id into chat_id
    from public.chats c
    where c.user_a_id = a and c.user_b_id = b
    limit 1;
  end if;

  return chat_id;
end;
$$;

revoke all on function public.create_or_get_chat_with_user(uuid) from public;
grant execute on function public.create_or_get_chat_with_user(uuid) to authenticated;

-- F: drop legacy columns only when they still exist (no CASCADE)
alter table public.wants drop column if exists from_user_id;
alter table public.wants drop column if exists to_user_id;
