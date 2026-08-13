begin;

-- Add soft-delete support to conversations. This is the delta from
-- 20260729110000_matched_only_realtime_messaging.sql, which was already applied
-- to production before it gained the deleted_at / deleted_by columns, so the
-- edited migration would be skipped by `supabase db push`. Adding them here in
-- a new migration guarantees they reach environments where that file is recorded
-- as applied.

alter table public.conversations
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.accounts(id) on delete set null;

create or replace function public.chat_can_read(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin(false)
    or (
      public.chat_is_member(p_conversation_id)
      and public.chat_is_matched(p_conversation_id)
      and exists(
        select 1
        from public.conversations conversation
        where conversation.id = p_conversation_id
          and conversation.archived_at is null
          and conversation.deleted_at is null
      )
    )
$$;

create or replace function public.chat_can_send(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.chat_is_member(p_conversation_id)
    and public.chat_is_matched(p_conversation_id)
    and exists(
      select 1
      from public.conversations conversation
      left join public.bookings booking
        on booking.id = conversation.booking_id
      left join public.service_requests request
        on request.id = conversation.service_request_id
      where conversation.id = p_conversation_id
        and conversation.archived_at is null
        and conversation.deleted_at is null
        and (
          (
            conversation.booking_id is not null
            and booking.status not in ('COMPLETED', 'CANCELLED')
          )
          or (
            conversation.booking_id is null
            and request.status in ('OPEN', 'MATCHED')
          )
        )
    )
$$;

revoke execute on function public.chat_can_read(uuid) from public, anon;
revoke execute on function public.chat_can_send(uuid) from public, anon;

grant execute on function public.chat_can_read(uuid) to authenticated;
grant execute on function public.chat_can_send(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
