begin;

drop policy if exists messages_member_read on public.messages;
create policy messages_member_read
on public.messages
for select
to authenticated
using(
  exists(
    select 1
    from public.conversation_participants participant
    where participant.conversation_id=messages.conversation_id
      and participant.account_id=auth.uid()
  )
);

drop policy if exists bookings_party_or_admin_read on public.bookings;
create policy bookings_party_or_admin_read
on public.bookings
for select
to authenticated
using(
  user_account_id=auth.uid()
  or worker_account_id=auth.uid()
  or public.is_admin(false)
);

drop policy if exists bookings_party_update on public.bookings;
create policy bookings_party_update
on public.bookings
for update
to authenticated
using(
  user_account_id=auth.uid()
  or worker_account_id=auth.uid()
  or public.is_admin(false)
)
with check(
  user_account_id=auth.uid()
  or worker_account_id=auth.uid()
  or public.is_admin(false)
);

notify pgrst,'reload schema';

commit;
