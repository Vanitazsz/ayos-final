begin;

-- Fix worker feedback persistence during the job-completion flow.
--
-- The previous guard required booking.status = 'COMPLETED', but the worker
-- submits feedback from CompleteJobModal while the booking is still
-- IN_PROGRESS (before completeJob moves it to PENDING_CONFIRMATION and the
-- customer later confirms COMPLETED). The RPC therefore always raised
-- WORKER_FEEDBACK_NOT_ALLOWED, and the client silently fell back to a local
-- AsyncStorage copy, so worker_feedback rows were rarely created.
--
-- Relax the guard to the active service stages plus the completion stages
-- (mirroring attach_booking_proof), and make submission single-shot: on
-- conflict the existing record is returned unchanged instead of being
-- overwritten, so a worker cannot resubmit/rewrite feedback for a booking.

create or replace function public.submit_worker_feedback(
  p_booking_id uuid,
  p_rating integer,
  p_comment text,
  p_tags jsonb
) returns public.worker_feedback
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  result public.worker_feedback;
begin
  select *
  into booking
  from public.bookings
  where id = p_booking_id;
  if booking.id is null
    or booking.worker_account_id is distinct from auth.uid()
    or booking.status not in (
      'SERVICE_STARTED', 'IN_PROGRESS', 'PENDING_CONFIRMATION', 'COMPLETED'
    )
  then
    raise exception using errcode = '42501', message = 'WORKER_FEEDBACK_NOT_ALLOWED';
  end if;
  if p_rating not between 1 and 5 then
    raise exception using errcode = '22023', message = 'Invalid rating';
  end if;
  insert into public.worker_feedback(
    booking_id,
    worker_account_id,
    user_account_id,
    rating,
    comment,
    tags
  ) values (
    booking.id,
    booking.worker_account_id,
    booking.user_account_id,
    p_rating,
    coalesce(btrim(p_comment), ''),
    coalesce(p_tags, '[]'::jsonb)
  )
  on conflict (booking_id) do nothing
  returning * into result;
  if result is null then
    select *
    into result
    from public.worker_feedback
    where booking_id = booking.id;
  end if;
  return result;
end
$$;

revoke all on function public.submit_worker_feedback(uuid, integer, text, jsonb)
from public, anon;
grant execute on function public.submit_worker_feedback(uuid, integer, text, jsonb)
to authenticated;

notify pgrst, 'reload schema';

commit;
