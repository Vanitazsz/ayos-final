-- Keep the admin customer list synchronized with new registrations and profile updates.

do $$
begin
  alter publication supabase_realtime add table public.accounts;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.user_profiles;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.worker_profiles;
exception when duplicate_object then null;
end $$;
