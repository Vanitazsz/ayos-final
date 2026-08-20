-- Allow workers assigned to a booking to read customer-attached request-media
-- from the storage bucket.  Ties access to the actual booking row so it is
-- revoked as soon as the worker is no longer the assigned party.

create policy worker_booking_request_media_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'request-media'
  and exists (
    select 1
    from public.request_media rm
    join public.service_requests sr on sr.id = rm.service_request_id
    join public.bookings b on b.service_request_id = sr.id
    where rm.storage_path = name
      and b.worker_account_id = auth.uid()
  )
);
