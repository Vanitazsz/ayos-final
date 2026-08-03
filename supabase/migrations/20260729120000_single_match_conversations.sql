begin;

create or replace function public.chat_is_matched(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.conversations conversation
    where conversation.id = p_conversation_id
      and (
        (
          conversation.booking_id is not null
          and exists(
            select 1
            from public.bookings booking
            where booking.id = conversation.booking_id
              and (
                conversation.service_request_id is null
                or conversation.service_request_id = booking.service_request_id
              )
              and (
                select count(*)
                from public.conversation_participants participant
                where participant.conversation_id = conversation.id
              ) = 2
              and exists(
                select 1
                from public.conversation_participants customer
                where customer.conversation_id = conversation.id
                  and customer.account_id = booking.user_account_id
              )
              and exists(
                select 1
                from public.conversation_participants worker
                where worker.conversation_id = conversation.id
                  and worker.account_id = booking.worker_account_id
              )
          )
        )
        or (
          conversation.booking_id is null
          and conversation.service_request_id is not null
          and conversation.worker_account_id is not null
          and exists(
            select 1
            from public.service_requests request
            where request.id = conversation.service_request_id
              and request.selected_worker_id = conversation.worker_account_id
              and (
                select count(*)
                from public.conversation_participants participant
                where participant.conversation_id = conversation.id
              ) = 2
              and exists(
                select 1
                from public.conversation_participants customer
                where customer.conversation_id = conversation.id
                  and customer.account_id = request.user_account_id
              )
              and exists(
                select 1
                from public.conversation_participants worker
                where worker.conversation_id = conversation.id
                  and worker.account_id = request.selected_worker_id
              )
          )
        )
      )
  )
$$;

create or replace function public.start_worker_conversation(
  p_service_request_id uuid,
  p_worker_id uuid
) returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.service_requests;
  result public.conversations;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select *
  into request
  from public.service_requests
  where id = p_service_request_id
  for update;

  if request.id is null
    or request.user_account_id is distinct from auth.uid()
    or request.status not in ('OPEN', 'MATCHED')
    or request.selected_worker_id is distinct from p_worker_id
  then
    raise exception using errcode = '42501', message = 'CONVERSATION_UNAVAILABLE';
  end if;

  insert into public.conversations(service_request_id, worker_account_id)
  values (request.id, request.selected_worker_id)
  on conflict (service_request_id, worker_account_id)
    where booking_id is null
  do update set updated_at = now()
  returning * into result;

  insert into public.conversation_participants(conversation_id, account_id)
  values
    (result.id, request.user_account_id),
    (result.id, request.selected_worker_id)
  on conflict do nothing;

  return result;
end
$$;

delete from public.conversations conversation
where not public.chat_is_matched(conversation.id);

revoke execute on function public.chat_is_matched(uuid) from public, anon;
revoke execute on function public.start_worker_conversation(uuid, uuid) from public, anon;
grant execute on function public.chat_is_matched(uuid) to authenticated;
grant execute on function public.start_worker_conversation(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
