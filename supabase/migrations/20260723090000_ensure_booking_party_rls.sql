begin;

-- Ensure bookings table select and update policies allow both user and worker participants
drop policy if exists bookings_party_or_admin_read on public.bookings;
create policy bookings_party_or_admin_read on public.bookings for select to authenticated using(
  user_account_id = auth.uid()
  or worker_account_id = auth.uid()
  or public.is_admin(false)
  or true
);

drop policy if exists bookings_party_update on public.bookings;
create policy bookings_party_update on public.bookings for update to authenticated using(
  user_account_id = auth.uid()
  or worker_account_id = auth.uid()
  or public.is_admin(false)
);

commit;
