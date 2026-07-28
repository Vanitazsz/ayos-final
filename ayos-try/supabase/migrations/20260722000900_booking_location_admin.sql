alter table public.bookings
  add column if not exists worker_start_lat double precision,
  add column if not exists worker_start_lng double precision;

create or replace function public.snapshot_booking_worker_origin()
returns trigger language plpgsql security definer set search_path = '' as $$
declare origin extensions.geography;
begin
  if new.worker_start_lat is null or new.worker_start_lng is null then
    select service_origin into origin
    from public.worker_profiles
    where account_id = new.worker_account_id;
    if origin is not null then
      new.worker_start_lat := extensions.st_y(origin::extensions.geometry);
      new.worker_start_lng := extensions.st_x(origin::extensions.geometry);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists snapshot_booking_worker_origin on public.bookings;
create trigger snapshot_booking_worker_origin
before insert on public.bookings for each row
execute function public.snapshot_booking_worker_origin();

update public.bookings b
set worker_start_lat = extensions.st_y(w.service_origin::extensions.geometry),
    worker_start_lng = extensions.st_x(w.service_origin::extensions.geometry)
from public.worker_profiles w
where w.account_id = b.worker_account_id
  and w.service_origin is not null
  and (b.worker_start_lat is null or b.worker_start_lng is null);

create or replace function public.admin_cancel_booking(
  p_booking_id uuid,
  p_reason text
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare current_booking public.bookings; result public.bookings; stage text;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  if length(trim(coalesce(p_reason, ''))) not between 3 and 1000 then
    raise exception using errcode = '22023', message = 'INVALID_CANCELLATION_REASON';
  end if;
  select * into current_booking from public.bookings where id = p_booking_id for update;
  if current_booking.id is null or current_booking.status in ('COMPLETED', 'CANCELLED') then
    raise exception using errcode = '55000', message = 'BOOKING_CANNOT_BE_CANCELLED';
  end if;
  stage := case current_booking.status
    when 'PENDING' then 'BEFORE_ACCEPTANCE'
    when 'ACCEPTED' then 'BEFORE_TRAVEL'
    when 'WORKER_PREPARING' then 'BEFORE_TRAVEL'
    when 'WORKER_EN_ROUTE' then 'EN_ROUTE'
    when 'WORKER_ARRIVED' then 'ARRIVED'
    when 'SERVICE_STARTED' then 'SERVICE_STARTED'
    else 'IN_PROGRESS' end;
  update public.bookings set status = 'CANCELLED', cancelled_at = now(), version = version + 1
  where id = current_booking.id returning * into result;
  insert into public.cancellations(
    booking_id, cancelled_by, reason, policy_version, job_stage,
    reason_code, initiator_role, resolution_status
  ) values (
    result.id, auth.uid(), trim(p_reason), '2026-07-22', stage,
    'ADMIN_CANCELLED', 'ADMIN', 'CONFIRMED'
  );
  insert into public.booking_status_events(booking_id, from_status, to_status, actor_id, reason)
  values(result.id, current_booking.status, 'CANCELLED', auth.uid(), 'ADMIN_CANCELLED: ' || trim(p_reason));
  update public.service_requests set status = 'CANCELLED', updated_at = now()
  where id = result.service_request_id;
  return result;
end $$;

create or replace function public.admin_reassign_booking(
  p_booking_id uuid,
  p_worker_id uuid,
  p_reason text
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare current_booking public.bookings; replacement public.bookings; conversation_id uuid;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  if length(trim(coalesce(p_reason, ''))) not between 3 and 1000 then
    raise exception using errcode = '22023', message = 'INVALID_REASSIGNMENT_REASON';
  end if;
  select * into current_booking from public.bookings where id = p_booking_id for update;
  if current_booking.id is null or current_booking.status in ('COMPLETED', 'CANCELLED') then
    raise exception using errcode = '55000', message = 'BOOKING_CANNOT_BE_REASSIGNED';
  end if;
  if not exists (
    select 1 from public.match_candidates mc
    join public.worker_profiles wp on wp.account_id = mc.worker_id
    where mc.service_request_id = current_booking.service_request_id
      and mc.worker_id = p_worker_id and mc.eligible and wp.approval_status = 'APPROVED'
  ) then
    raise exception using errcode = '22023', message = 'WORKER_NOT_AN_ELIGIBLE_MATCH';
  end if;
  update public.bookings set status = 'CANCELLED', cancelled_at = now(), version = version + 1
  where id = current_booking.id;
  insert into public.cancellations(
    booking_id, cancelled_by, reason, policy_version, job_stage,
    reason_code, initiator_role, resolution_status
  ) values (
    current_booking.id, auth.uid(), trim(p_reason), '2026-07-22', 'BEFORE_ACCEPTANCE',
    'ADMIN_REASSIGNED', 'ADMIN', 'CONFIRMED'
  );
  insert into public.booking_status_events(booking_id, from_status, to_status, actor_id, reason)
  values(current_booking.id, current_booking.status, 'CANCELLED', auth.uid(), 'ADMIN_REASSIGNED: ' || trim(p_reason));
  insert into public.bookings(
    service_request_id, user_account_id, worker_account_id, agreed_service_amount, currency
  ) values (
    current_booking.service_request_id, current_booking.user_account_id, p_worker_id,
    current_booking.agreed_service_amount, current_booking.currency
  ) returning * into replacement;
  insert into public.booking_status_events(booking_id, to_status, actor_id, reason)
  values(replacement.id, 'PENDING', auth.uid(), 'Admin reassignment from booking ' || current_booking.id::text);
  insert into public.conversations(booking_id) values(replacement.id) returning id into conversation_id;
  insert into public.conversation_participants(conversation_id, account_id)
  values(conversation_id, replacement.user_account_id), (conversation_id, replacement.worker_account_id);
  perform pgmq.send('booking_timeouts', jsonb_build_object('booking_id', replacement.id, 'due_at', replacement.response_due_at, 'attempt', 0));
  update public.service_requests
  set status = 'BOOKED', selected_worker_id = p_worker_id, updated_at = now()
  where id = current_booking.service_request_id;
  return replacement;
end $$;

revoke all on function public.admin_cancel_booking(uuid, text) from public, anon;
revoke all on function public.admin_reassign_booking(uuid, uuid, text) from public, anon;
grant execute on function public.admin_cancel_booking(uuid, text) to authenticated;
grant execute on function public.admin_reassign_booking(uuid, uuid, text) to authenticated;
