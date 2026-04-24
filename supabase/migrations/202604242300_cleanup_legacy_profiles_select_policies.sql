-- Cleanup legacy profiles policies that could allow broader reads.
-- Keep only the current 5-policy model in production.

drop policy if exists "profiles_select_completed_for_discovery" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
