-- Allow booking parties and admins to read customer-submitted payment proofs.
--
-- Customers upload their receipt via uploadBookingProof into the private
-- 'booking-proof' Storage bucket and the path is recorded on
-- payments.proof_path (20260817000000_payment_proof_path.sql). The bucket's
-- existing read policies are scoped to objects referenced by booking_proof_media
-- or review_media, so a payment proof path is only visible to its storage owner
-- and the admin drawer's createSignedUrl('booking-proof', path) is denied.
-- Add a matching read policy scoped to objects referenced by payments.proof_path
-- for the booking's parties or admins.

begin;

drop policy if exists booking_proof_payment_party_or_admin_read
  on storage.objects;

create policy booking_proof_payment_party_or_admin_read
on storage.objects for select to authenticated
using (
  bucket_id = 'booking-proof'
  and exists (
    select 1
    from public.payments payment
    join public.bookings booking on booking.id = payment.booking_id
    where payment.proof_path = name
      and (
        auth.uid() in (booking.user_account_id, booking.worker_account_id)
        or public.is_admin(false)
      )
  )
);

notify pgrst, 'reload schema';

commit;
