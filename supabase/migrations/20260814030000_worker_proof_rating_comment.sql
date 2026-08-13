begin;

-- Record the worker's proof-of-work summary (rating + comment) alongside the
-- proof photos.
--
-- `booking_proof_media` stores only photo metadata. Workers also record a 1-5
-- rating and a short comment with their proof of work, which admins display
-- alongside the proof photos. Store the summary on `bookings` (one per booking,
-- not per photo) and extend `attach_booking_proof` so the worker can persist it
-- during submission. The `worker_feedback` table remains the separate record of
-- the worker's feedback about the customer; it is not removed here.

-- 1. booking-level worker proof summary --------------------------------------

alter table public.bookings
  add column worker_proof_rating smallint
    check (worker_proof_rating between 1 and 5),
  add column worker_proof_comment text
    check (length(worker_proof_comment) <= 5000);

alter table public.booking_proof_media
  add column submitted_by text not null default 'worker'
    check (submitted_by in ('worker', 'customer'));

-- 2. attach_booking_proof accepts rating + comment ---------------------------

drop function if exists public.attach_booking_proof(uuid, text, text, integer);

create or replace function public.attach_booking_proof(
  p_booking_id uuid,
  p_storage_path text,
  p_content_type text,
  p_byte_size integer,
  p_submitted_by text default 'worker',
  p_rating integer default null,
  p_comment text default null
) returns public.booking_proof_media
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  result public.booking_proof_media;
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
  if p_submitted_by = 'customer' then
    if booking.user_account_id <> auth.uid() then
      raise exception using errcode = '42501', message = 'BOOKING_PROOF_UNAVAILABLE';
    end if;
    if p_rating is not null or p_comment is not null then
      raise exception using errcode = '22023', message = 'INVALID_BOOKING_PROOF';
    end if;
  elsif p_submitted_by = 'worker' then
    if booking.worker_account_id <> auth.uid() then
      raise exception using errcode = '42501', message = 'BOOKING_PROOF_UNAVAILABLE';
    end if;
    if p_rating is not null and p_rating not between 1 and 5 then
      raise exception using errcode = '22023', message = 'INVALID_BOOKING_PROOF';
    end if;
    if p_comment is not null and length(btrim(p_comment)) > 5000 then
      raise exception using errcode = '22023', message = 'INVALID_BOOKING_PROOF';
    end if;
  else
    raise exception using errcode = '22023', message = 'INVALID_BOOKING_PROOF';
  end if;
  if split_part(p_storage_path, '/', 1) <> auth.uid()::text
    or p_content_type not in ('image/jpeg', 'image/png', 'image/webp')
    or p_byte_size not between 1 and 15728640
    or not exists (
      select 1
      from storage.objects object
      where object.bucket_id = 'booking-proof'
        and object.name = p_storage_path
        and object.owner_id = auth.uid()::text
    )
  then
    raise exception using errcode = '22023', message = 'INVALID_BOOKING_PROOF';
  end if;

  insert into public.booking_proof_media(
    booking_id,
    worker_id,
    storage_path,
    content_type,
    byte_size,
    submitted_by
  ) values (
    booking.id,
    booking.worker_account_id,
    p_storage_path,
    p_content_type,
    p_byte_size,
    p_submitted_by
  )
  returning * into result;

  if p_submitted_by = 'worker'
    and (p_rating is not null or p_comment is not null)
  then
    update public.bookings
    set worker_proof_rating = coalesce(p_rating, worker_proof_rating),
        worker_proof_comment = coalesce(btrim(p_comment), worker_proof_comment)
    where id = booking.id;
  end if;

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    'BOOKING_PROOF_ATTACHED',
    'booking',
    booking.id::text,
    jsonb_build_object(
      'proof_id', result.id,
      'submitted_by', result.submitted_by,
      'rating', p_rating,
      'has_comment', p_comment is not null
    )
  );
  return result;
end
$$;

revoke all on function public.attach_booking_proof(uuid, text, text, integer, text, integer, text)
from public, anon;
grant execute on function public.attach_booking_proof(uuid, text, text, integer, text, integer, text)
to authenticated;

notify pgrst, 'reload schema';

commit;
