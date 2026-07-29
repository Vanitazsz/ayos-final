begin;

-- Allow authenticated users (workers and customers) to update bookings directly.
-- The transition_booking RPC is SECURITY DEFINER so it already bypasses RLS/GRANT,
-- but the client-side fallback paths (departForJob, arriveAtJob, startJob, completeJob)
-- use supabase.from('bookings').update(...) which requires both the RLS policy
-- (bookings_party_update) AND the SQL GRANT to pass.
grant update on public.bookings to authenticated;

commit;
