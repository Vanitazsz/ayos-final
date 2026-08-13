begin;

-- Reassignment must give the new worker/customer pair a usable conversation.
-- The old thread (user <-> previous worker) is kept in the DB as hidden
-- history: it becomes "unmatched" once the booking's worker_account_id
-- changes, so chat_can_read/chat_can_send already hide it from consumers.
--
-- The previous UNIQUE constraint on conversations.booking_id blocked ever
-- creating a second conversation for a booking, so a reassigned (or trashed)
-- booking could never get a fresh thread. It is replaced with a plain lookup
-- index; "one matched conversation" is now enforced by logic instead of the
-- schema.

alter table public.conversations
  drop constraint if exists conversations_booking_id_key;

create index if not exists conversations_booking_idx
  on public.conversations(booking_id)
  where deleted_at is null;

-- Get (or create) the active conversation for a booking that is matched to
-- the booking's CURRENT user + worker pair. Locks the booking row so two
-- concurrent callers cannot create duplicate threads.
create or replace function public.chat_ensure_booking_conversation(p_booking_id uuid)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  existing public.conversations;
  result public.conversations;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select *
  into booking
  from public.bookings
  where id = p_booking_id
  for update;

  if booking.id is null then
    raise exception using errcode = 'P0002', message = 'CONVERSATION_UNAVAILABLE';
  end if;

  if booking.status in ('COMPLETED', 'CANCELLED') then
    raise exception using errcode = '45001', message = 'CONVERSATION_CLOSED';
  end if;

  if auth.uid() not in (booking.user_account_id, booking.worker_account_id)
     and not public.is_admin(false) then
    raise exception using errcode = '42501', message = 'CONVERSATION_UNAVAILABLE';
  end if;

  select c.*
  into existing
  from public.conversations c
  join public.conversation_participants customer
    on customer.conversation_id = c.id
   and customer.account_id = booking.user_account_id
  join public.conversation_participants worker
    on worker.conversation_id = c.id
   and worker.account_id = booking.worker_account_id
  where c.booking_id = booking.id
    and c.deleted_at is null
  order by c.created_at asc
  limit 1;

  if existing.id is not null then
    return existing;
  end if;

  insert into public.conversations(booking_id, service_request_id)
  values (booking.id, booking.service_request_id)
  returning * into result;

  insert into public.conversation_participants(conversation_id, account_id)
  values
    (result.id, booking.user_account_id),
    (result.id, booking.worker_account_id)
  on conflict do nothing;

  return result;
end
$$;

revoke execute on function public.chat_ensure_booking_conversation(uuid) from public, anon;
grant execute on function public.chat_ensure_booking_conversation(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
