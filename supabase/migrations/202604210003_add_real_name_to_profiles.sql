-- add private real name for admin/safety operations
alter table public.profiles
  add column if not exists real_name text;

-- Enforce real_name only when profile is marked completed.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_real_name_required_when_completed'
  ) then
    alter table public.profiles
      add constraint profiles_real_name_required_when_completed
      check (
        profile_completed = false
        or (real_name is not null and char_length(trim(real_name)) > 0)
      );
  end if;
end $$;

