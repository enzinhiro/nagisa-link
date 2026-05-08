create extension if not exists pgcrypto;

create table if not exists public.perks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null unique,
  name text not null,
  area text not null,
  address text,
  categories text[] not null default '{}'::text[],
  benefit text not null,
  description text,
  website_url text,
  usage_text text not null default 'お店でこの画面をご提示ください。',
  condition_text text,
  is_published boolean not null default false,
  display_order integer not null default 100
);

drop trigger if exists trg_perks_updated_at on public.perks;
create trigger trg_perks_updated_at
before update on public.perks
for each row execute function public.set_updated_at();

create index if not exists perks_published_order_idx
  on public.perks (is_published, display_order, created_at desc);

alter table public.perks enable row level security;

drop policy if exists "perks_select_published_or_admin" on public.perks;
create policy "perks_select_published_or_admin"
on public.perks
for select
to authenticated
using (is_published = true or public.is_admin_user());

drop policy if exists "perks_insert_admin" on public.perks;
create policy "perks_insert_admin"
on public.perks
for insert
to authenticated
with check (public.is_admin_user());

drop policy if exists "perks_update_admin" on public.perks;
create policy "perks_update_admin"
on public.perks
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "perks_delete_admin" on public.perks;
create policy "perks_delete_admin"
on public.perks
for delete
to authenticated
using (public.is_admin_user());

insert into public.perks (
  slug,
  name,
  area,
  address,
  categories,
  benefit,
  description,
  website_url,
  usage_text,
  condition_text,
  is_published,
  display_order
)
values (
  'tanagokoro-zushi-hayama',
  'たなごころ整心整体院　逗子葉山店',
  '逗子',
  '逗子市逗子1-7-8 1F右',
  array['からだ・整体']::text[],
  'NAGISA Link会員は施術料金5%オフ',
  '心身のつらさを整えて、リフレッシュしたいママにおすすめの整体院です。逗子・葉山エリアで、からだのケアをしたい方はぜひお試しください。',
  'https://tanagokoro-zushi.com/',
  'お店でこの画面をご提示ください。',
  '予約時にNAGISA Linkの特典利用を伝えてください。',
  true,
  100
)
on conflict (slug) do update set
  name = excluded.name,
  area = excluded.area,
  address = excluded.address,
  categories = excluded.categories,
  benefit = excluded.benefit,
  description = excluded.description,
  website_url = excluded.website_url,
  usage_text = excluded.usage_text,
  condition_text = excluded.condition_text,
  is_published = excluded.is_published,
  display_order = excluded.display_order,
  updated_at = now();
