begin;

-- Grant select on user_profiles to authenticated users for chat, booking, and search display
drop policy if exists user_profile_self_or_admin_read on public.user_profiles;
create policy user_profile_authenticated_read on public.user_profiles for select to authenticated using(true);

commit;
