begin;

-- Allow either the assigned worker or the booking customer to remove an
-- attached proof-of-work photo while the booking is still in a proof-eligible
-- state. The client removes the storage object through the Storage API (the
-- booking-proof bucket relies on the general storage_owner_delete RLS policy,
-- owner_id = auth.uid()), while this security-definer RPC removes the metadata
-- row and records an audit entry.
--
-- The previous version only allowed the worker. Customer-submitted proof rows
-- (booking_proof_media.submitted_by = 'customer') are uploaded into the
-- customer's own storage folder (first path segment = auth.uid()), so the
-- customer branch mirrors the attach_booking_proof gate for that role.

create or replace function public.delete_booking_proof(
  p_booking_id uuid,
  p_storage_path text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  removed public.booking_proof_media;
begin
  select *
  into booking
  from public.bookings
  where id = p_booking_id;
  if booking.id is null
    or booking.status not in ('SERVICE_STARTED', 'IN_PROGRESS', 'COMPLETED')
  then
    raise exception using errcode = '42501', message = 'BOOKING_PROOF_UNAVAILABLE';
  end if;

  select *
  into removed
  from public.booking_proof_media
  where booking_id = p_booking_id
    and storage_path = p_storage_path
  order by created_at desc
  limit 1;
  if removed.id is null then
    raise exception using errcode = '22023', message = 'BOOKING_PROOF_NOT_FOUND';
  end if;

  if removed.submitted_by = 'worker' then
    if booking.worker_account_id <> auth.uid() then
      raise exception using errcode = '42501', message = 'BOOKING_PROOF_UNAVAILABLE';
    end if;
    if split_part(p_storage_path, '/', 1) <> auth.uid()::text then
      raise exception using errcode = '42501', message = 'INVALID_BOOKING_PROOF';
    end if;
  elsif removed.submitted_by = 'customer' then
    if booking.user_account_id <> auth.uid() then
      raise exception using errcode = '42501', message = 'BOOKING_PROOF_UNAVAILABLE';
    end if;
    if split_part(p_storage_path, '/', 1) <> auth.uid()::text then
      raise exception using errcode = '42501', message = 'INVALID_BOOKING_PROOF';
    end if;
  else
    raise exception using errcode = '22023', message = 'BOOKING_PROOF_NOT_FOUND';
  end if;

  delete from public.booking_proof_media
  where id = removed.id;

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    'BOOKING_PROOF_REMOVED',
    'booking',
    booking.id::text,
    jsonb_build_object('proof_id', removed.id)
  );
end
$$;

revoke all on function public.delete_booking_proof(uuid, text)
from public, anon;
grant execute on function public.delete_booking_proof(uuid, text)
to authenticated;

notify pgrst, 'reload schema';

commit;
