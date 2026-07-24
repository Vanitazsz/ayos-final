begin;
do $$ begin
  alter publication supabase_realtime add table public.bookings;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.booking_status_events;
exception when duplicate_object then null;
end $$;
notify pgrst, 'reload schema';
commit;
