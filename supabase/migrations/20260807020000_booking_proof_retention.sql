begin;

-- Daily retention sweep for proof-of-work photos.
--
-- Proof images live in the private 'booking-proof' Storage bucket (the client
-- uploads them via uploadBookingProof + attachBookingProof). To bound storage
-- growth, a scheduled job purges proofs once their booking is old enough:
--   - CANCELLED bookings: 7 days after cancellation (safety net; proofs are
--     normally only attached when a job completes).
--   - COMPLETED bookings: 30 days after completion (after the review window).
--
-- Storage objects must be removed through the Storage API (raw SQL deletes from
-- storage.objects are blocked by Supabase's storage guard), so the metadata
-- sweep is delegated to an Edge Function via net.http_post, mirroring the
-- queue-consumer cron wiring.

-- Returns the proofs eligible for retention on a given day. The Edge Function
-- removes the storage objects via the service-role Storage API and then deletes
-- the metadata rows for the ones that were removed successfully.
create or replace function public.list_expired_booking_proofs(
  p_cancelled_days integer,
  p_completed_days integer
)
returns table (
  id uuid,
  storage_path text,
  byte_size integer
)
language sql
stable
set search_path = ''
as $$
  select proof.id, proof.storage_path, proof.byte_size
  from public.booking_proof_media proof
  join public.bookings booking on booking.id = proof.booking_id
  where (
        booking.status = 'CANCELLED'
    and booking.cancelled_at < now() - make_interval(days => p_cancelled_days)
  ) or (
        booking.status = 'COMPLETED'
    and booking.completed_at < now() - make_interval(days => p_completed_days)
  )
  limit 1000
$$;

revoke all on function public.list_expired_booking_proofs(integer, integer)
from public, anon;
grant execute on function public.list_expired_booking_proofs(integer, integer)
to service_role;

-- Cron wrapper: invoke the booking-proof-retention Edge Function with the same
-- shared queue secret used by the queue-consumer job.
create or replace function private.invoke_booking_proof_retention()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  invocation_secret text;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'project_url' limit 1;
  select decrypted_secret into invocation_secret
  from vault.decrypted_secrets
  where name = 'queue_consumer_secret' limit 1;
  if project_url is null or invocation_secret is null then
    return;
  end if;
  perform net.http_post(
    url := project_url || '/functions/v1/booking-proof-retention',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-ayos-queue-secret', invocation_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end
$$;

select cron.schedule(
  'ayos-booking-proof-retention',
  '0 3 * * *',
  'select private.invoke_booking_proof_retention()'
);

notify pgrst, 'reload schema';

commit;
