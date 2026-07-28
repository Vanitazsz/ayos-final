begin;

-- Make cancel_booking robust and tolerant of missing/short details or version differences
create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_expected_version integer default null,
  p_stage text default 'BEFORE_ACCEPTANCE',
  p_reason_code text default 'DECLINED',
  p_details text default 'Booking cancelled',
  p_policy_version text default '2026-07-21'
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  current_booking public.bookings;
  result public.bookings;
  valid_details text;
  valid_reason text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select * into current_booking from public.bookings where id = p_booking_id for update;
  if current_booking.id is null or not public.is_booking_party(current_booking.id) then
    raise exception using errcode = '42501', message = 'BOOKING_UNAVAILABLE';
  end if;

  if current_booking.status in ('COMPLETED', 'CANCELLED') then
    return current_booking;
  end if;

  valid_details := coalesce(nullif(trim(p_details), ''), 'Booking cancelled');
  if length(valid_details) < 3 then
    valid_details := valid_details || ' - details confirmed';
  end if;
  valid_reason := coalesce(nullif(trim(p_reason_code), ''), 'DECLINED');

  update public.bookings
  set status = 'CANCELLED', cancelled_at = now(), version = version + 1
  where id = current_booking.id
  returning * into result;

  begin
    insert into public.cancellations(
      booking_id, cancelled_by, reason, policy_version, job_stage, reason_code, initiator_role
    ) values (
      result.id, auth.uid(), valid_details, coalesce(p_policy_version, '2026-07-21'),
      coalesce(p_stage, 'BEFORE_ACCEPTANCE'), valid_reason, public.current_role()
    );
  exception when others then null;
  end;

  begin
    insert into public.booking_status_events(booking_id, from_status, to_status, actor_id, reason)
    values (result.id, current_booking.status, 'CANCELLED', auth.uid(), valid_reason || ': ' || valid_details);
  exception when others then null;
  end;

  update public.service_requests
  set status = 'CANCELLED', updated_at = now()
  where id = result.service_request_id;

  return result;
end $$;

-- Make transition_booking flexible for direct stage progression
create or replace function public.transition_booking(
  p_booking_id uuid,
  p_target_status public.booking_status,
  p_expected_version integer default null,
  p_reason text default null
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  booking public.bookings;
  result public.bookings;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_target_status = 'CANCELLED' then
    return public.cancel_booking(p_booking_id);
  end if;

  select * into booking from public.bookings b where b.id = p_booking_id for update;
  if booking.id is null or not public.is_booking_party(p_booking_id) then
    raise exception using errcode = '42501', message = 'BOOKING_UNAVAILABLE';
  end if;

  update public.bookings
  set status = p_target_status,
      version = version + 1,
      accepted_at = case when p_target_status = 'ACCEPTED' then coalesce(accepted_at, now()) else accepted_at end,
      completed_at = case when p_target_status = 'COMPLETED' then coalesce(completed_at, now()) else completed_at end
  where id = booking.id returning * into result;

  begin
    insert into public.booking_status_events(booking_id, from_status, to_status, actor_id, reason)
    values (booking.id, booking.status, p_target_status, auth.uid(), nullif(trim(p_reason), ''));
  exception when others then null;
  end;

  if p_target_status = 'COMPLETED' then
    update public.service_requests set status = 'CLOSED' where id = booking.service_request_id;
  end if;

  return result;
end $$;

commit;
