alter table public.profiles
add column if not exists avatar_seed integer;

alter table public.profiles
drop constraint if exists profiles_avatar_seed_non_negative;

alter table public.profiles
add constraint profiles_avatar_seed_non_negative
check (avatar_seed is null or avatar_seed >= 0);
