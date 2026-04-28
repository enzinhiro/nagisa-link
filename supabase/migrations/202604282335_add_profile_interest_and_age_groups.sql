alter table public.profiles
  add column if not exists child_age_groups text[] not null default '{}'::text[],
  add column if not exists mom_interest_tags text[] not null default '{}'::text[];

update public.profiles
set child_age_groups = array[trim(child_age_group)]
where coalesce(array_length(child_age_groups, 1), 0) = 0
  and char_length(trim(coalesce(child_age_group, ''))) > 0
  and trim(child_age_group) not in ('未設定', '選択してください');

create or replace view public.public_profiles as
select
  p.id,
  p.nickname,
  p.avatar_seed,
  p.area,
  p.child_age_group,
  p.child_age_groups,
  p.child_gender,
  p.child_interest_tags,
  p.mom_interest_tags,
  p.want_to_connect,
  p.intro,
  p.connection_preference,
  p.meeting_range,
  p.connection_achievement_count,
  p.created_at
from public.profiles p
where p.profile_completed = true
  and coalesce(p.is_suspended, false) = false;

revoke all on table public.public_profiles from public;
grant select on table public.public_profiles to authenticated;
