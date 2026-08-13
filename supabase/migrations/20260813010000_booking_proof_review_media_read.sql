begin;

-- Allow booking parties and admins to read customer-submitted proof-of-work
-- photos.
--
-- Customers upload their proof via uploadBookingProof into the private
-- 'booking-proof' Storage bucket, but the metadata row is recorded in
-- review_media (attached to their review) rather than booking_proof_media, so
-- the booking_proof_party_or_admin_read policy does not cover those objects and
-- their signed URLs are denied. Add a matching read policy scoped to objects
-- referenced by review_media for the booking's parties or admins.

drop policy if exists booking_proof_review_media_party_or_admin_read
  on storage.objects;

create policy booking_proof_review_media_party_or_admin_read
on storage.objects for select to authenticated
using (
  bucket_id = 'booking-proof'
  and exists (
    select 1
    from public.review_media media
    join public.reviews review on review.id = media.review_id
    join public.bookings booking on booking.id = review.booking_id
    where media.storage_path = name
      and (
        auth.uid() in (booking.user_account_id, booking.worker_account_id)
        or public.is_admin(false)
      )
  )
);

notify pgrst, 'reload schema';

commit;
