begin;

-- Exact saved addresses remain customer-owned before acceptance. The assigned
-- worker receives read access only after explicitly accepting the booking.
drop policy if exists addresses_owner_or_admin_read on public.addresses;
create policy addresses_owner_accepted_worker_or_admin_read
on public.addresses for select to authenticated
using (
  account_id = auth.uid()
  or public.is_admin(false)
  or exists (
    select 1
    from public.service_requests request
    join public.bookings booking
      on booking.service_request_id = request.id
    where request.address_id = addresses.id
      and booking.worker_account_id = auth.uid()
      and booking.status in (
        'ACCEPTED',
        'WORKER_PREPARING',
        'WORKER_EN_ROUTE',
        'WORKER_ARRIVED',
        'SERVICE_STARTED',
        'IN_PROGRESS',
        'COMPLETED'
      )
  )
);

commit;
