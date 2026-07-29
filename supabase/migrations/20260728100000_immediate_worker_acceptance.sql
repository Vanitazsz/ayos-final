begin;

-- Customer acceptance creates the booking immediately using the customer's
-- budget when the worker has not configured a rate. Repeated acceptance is
-- idempotent for the same active request.
create or replace function public.select_worker(
  p_service_request_id uuid,
  p_worker_id uuid
) returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.service_requests;
  worker_rate_minor bigint;
  booking public.bookings;
  conversation_id uuid;
begin
  select * into request
  from public.service_requests
  where id = p_service_request_id
  for update;

  if request.user_account_id is distinct from auth.uid()
    or request.status not in ('OPEN', 'MATCHED') then
    raise exception using errcode = '42501', message = 'SERVICE_REQUEST_UNAVAILABLE';
  end if;
  if private.accounts_block_each_other(request.user_account_id, p_worker_id)
    or not exists (
      select 1 from public.service_request_dispatches dispatch
      where dispatch.service_request_id = request.id
        and dispatch.worker_id = p_worker_id
        and dispatch.status = 'ACCEPTED'
        and dispatch.expires_at > now()
    )
    or not exists (
      select 1 from private.worker_match_eligibility(request.id) eligibility
      where eligibility.worker_id = p_worker_id
        and eligibility.eligible
    ) then
    raise exception using errcode = 'P0001', message = 'WORKER_UNAVAILABLE';
  end if;

  select b.* into booking
  from public.bookings b
  where b.service_request_id = request.id
    and b.user_account_id = auth.uid()
    and b.worker_account_id = p_worker_id
    and b.status <> 'CANCELLED'
  limit 1;
  if booking.id is not null then
    return booking;
  end if;

  select skill.rate_minor into worker_rate_minor
  from public.worker_skills skill
  where skill.worker_id = p_worker_id
    and skill.category_id = request.category_id;

  insert into public.bookings(
    service_request_id, user_account_id, worker_account_id, agreed_service_amount
  ) values (
    request.id,
    auth.uid(),
    p_worker_id,
    coalesce(worker_rate_minor::numeric / 100, request.budget)
  ) returning * into booking;

  insert into public.booking_status_events(booking_id, to_status, actor_id)
  values (booking.id, 'PENDING', auth.uid());

  insert into public.conversations(booking_id)
  values (booking.id)
  returning id into conversation_id;
  insert into public.conversation_participants(conversation_id, account_id)
  values (conversation_id, auth.uid()), (conversation_id, p_worker_id);

  update public.service_requests
  set status = 'BOOKED', selected_worker_id = p_worker_id
  where id = request.id;
  update public.service_request_dispatches
  set status = case when worker_id = p_worker_id then 'SELECTED' else 'EXPIRED' end,
      updated_at = now()
  where service_request_id = request.id;
  update public.worker_presence
  set online = false, updated_at = now()
  where worker_id = p_worker_id;

  perform pgmq.send(
    'booking_timeouts',
    jsonb_build_object('booking_id', booking.id, 'due_at', booking.response_due_at, 'attempt', 0)
  );
  return booking;
end
$$;

revoke all on function public.select_worker(uuid, uuid) from public, anon;
grant execute on function public.select_worker(uuid, uuid) to authenticated;

commit;
