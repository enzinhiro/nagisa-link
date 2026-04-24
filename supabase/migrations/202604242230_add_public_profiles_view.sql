-- Public-safe profile projection for non-admin member screens.
-- Keeps personal/admin fields out of general profile reads.

create or replace view public.public_profiles as
select
  p.id,
  p.nickname,
  p.avatar_seed,
  p.area,
  p.child_age_group,
  p.child_gender,
  p.child_interest_tags,
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
