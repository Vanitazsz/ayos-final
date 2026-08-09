-- Customer-owned tracking actions. Arrival still requires a recent persisted
-- worker location within the existing 50 meter validation radius.

create or replace function public.confirm_customer_arrival(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  request public.service_requests;
  latest_location public.location_updates;
  result public.bookings;
  distance_meters numeric;
begin
  select * into booking
  from public.bookings
  where id = p_booking_id
  for update;

  if booking.id is null then
    raise exception using errcode = '42501', message = 'BOOKING_UNAVAILABLE';
  end if;
  if auth.uid() <> booking.user_account_id then
    raise exception using errcode = '42501', message = 'CUSTOMER_REQUIRED';
  end if;

  if booking.status in (
    'WORKER_ARRIVED', 'SERVICE_STARTED', 'IN_PROGRESS',
    'PENDING_CONFIRMATION', 'COMPLETED'
  ) then
    return jsonb_build_object(
      'success', true,
      'status', booking.status,
      'alreadyConfirmed', true
    );
  end if;
  if booking.status <> 'WORKER_EN_ROUTE' then
    raise exception using errcode = 'P0001', message = 'CUSTOMER_ARRIVAL_NOT_AVAILABLE';
  end if;

  select * into request
  from public.service_requests
  where id = booking.service_request_id;
  select * into latest_location
  from public.location_updates
  where booking_id = booking.id
    and account_id = booking.worker_account_id
  order by recorded_at desc
  limit 1;

  if latest_location.id is null
    or latest_location.recorded_at < now() - interval '5 minutes' then
    raise exception using errcode = '42501', message = 'WORKER_LOCATION_UNAVAILABLE';
  end if;
  if request.service_location is null then
    raise exception using errcode = '42501', message = 'WORKER_ARRIVAL_NOT_VALIDATED';
  end if;

  distance_meters := extensions.st_distance(
    request.service_location,
    latest_location.location
  );
  if distance_meters > 50 then
    raise exception using errcode = '42501', message = 'WORKER_NOT_WITHIN_ARRIVAL_RADIUS';
  end if;

  update public.bookings
  set status = 'WORKER_ARRIVED',
      version = version + 1,
      updated_at = now()
  where id = booking.id
  returning * into result;

  insert into public.booking_status_events(
    booking_id, from_status, to_status, actor_id, reason
  ) values (
    result.id, booking.status, result.status, auth.uid(), 'CUSTOMER_CONFIRMED_ARRIVAL'
  );
  insert into public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), 'CUSTOMER_CONFIRMED_ARRIVAL', 'booking', result.id::text,
    jsonb_build_object('distance_meters', round(distance_meters, 1))
  );

  return jsonb_build_object(
    'success', true,
    'status', result.status,
    'alreadyConfirmed', false,
    'distanceMeters', round(distance_meters, 1)
  );
end;
$$;

revoke all on function public.confirm_customer_arrival(uuid) from public, anon;
grant execute on function public.confirm_customer_arrival(uuid) to authenticated;

create or replace function public.confirm_customer_completion(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  result public.bookings;
begin
  select * into booking
  from public.bookings
  where id = p_booking_id
  for update;

  if booking.id is null then
    raise exception using errcode = '42501', message = 'BOOKING_UNAVAILABLE';
  end if;
  if auth.uid() <> booking.user_account_id then
    raise exception using errcode = '42501', message = 'CUSTOMER_REQUIRED';
  end if;
  if booking.status = 'COMPLETED' then
    return jsonb_build_object(
      'success', true,
      'status', booking.status,
      'alreadyConfirmed', true
    );
  end if;
  if booking.status <> 'PENDING_CONFIRMATION' then
    raise exception using errcode = 'P0001', message = 'CUSTOMER_COMPLETION_NOT_AVAILABLE';
  end if;

  result := public.transition_booking(
    booking.id,
    'COMPLETED',
    null,
    'CUSTOMER_CONFIRMED_COMPLETION'
  );
  return jsonb_build_object(
    'success', true,
    'status', result.status,
    'alreadyConfirmed', false
  );
end;
$$;

revoke all on function public.confirm_customer_completion(uuid) from public, anon;
grant execute on function public.confirm_customer_completion(uuid) to authenticated;

notify pgrst, 'reload schema';
