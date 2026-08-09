-- Retire the old wallet-account simulation path after the manual proof flow.
-- Keep the function name as a compatibility guard that fails closed instead of
-- attempting writes against the retired wallet_transactions shape.

create or replace function public.simulate_wallet_topup(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using
    errcode = '0A000',
    message = 'MANUAL_TOPUP_REQUIRED';
end;
$$;

revoke all on function public.simulate_wallet_topup(numeric) from public, anon;
grant execute on function public.simulate_wallet_topup(numeric) to authenticated;

-- The legacy worker-arrival command remains supported by the worker screen,
-- but its location helper takes numeric arguments in the active schema.
create or replace function public.validate_and_confirm_worker_arrival(
  p_booking_id uuid,
  p_worker_lat float8,
  p_worker_lng float8
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking record;
  distance_meters float8;
  max_radius_meters constant float8 := 50.0;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select b.id, b.worker_account_id, b.status, b.service_request_id, request.service_location
  into booking
  from public.bookings b
  join public.service_requests request on request.id = b.service_request_id
  where b.id = p_booking_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Booking not found';
  end if;
  if booking.worker_account_id <> auth.uid() then
    raise exception using errcode = '42501', message = 'Only the assigned worker can confirm arrival';
  end if;
  if booking.status not in ('WORKER_EN_ROUTE', 'WORKER_PREPARING', 'ACCEPTED') then
    raise exception using errcode = '22000', message = 'Booking is not eligible for arrival confirmation';
  end if;

  if booking.service_location is null then
    update public.bookings
    set status = 'WORKER_ARRIVED', updated_at = now()
    where id = p_booking_id;
    return jsonb_build_object(
      'success', true,
      'within_proximity', true,
      'distance_meters', 0,
      'status', 'WORKER_ARRIVED'
    );
  end if;

  distance_meters := extensions.st_distance(
    booking.service_location,
    private.make_location(p_worker_lat::numeric, p_worker_lng::numeric)
  );

  if distance_meters <= max_radius_meters then
    update public.bookings
    set status = 'WORKER_ARRIVED', updated_at = now()
    where id = p_booking_id;
    return jsonb_build_object(
      'success', true,
      'within_proximity', true,
      'distance_meters', round(distance_meters::numeric, 1),
      'status', 'WORKER_ARRIVED'
    );
  end if;

  return jsonb_build_object(
    'success', false,
    'within_proximity', false,
    'distance_meters', round(distance_meters::numeric, 1),
    'max_radius_meters', max_radius_meters,
    'status', booking.status,
    'message', format(
      'You are %s meters away. Please get within 50 meters of the destination.',
      round(distance_meters::numeric, 0)
    )
  );
end;
$$;

revoke all on function public.validate_and_confirm_worker_arrival(uuid, float8, float8) from public, anon;
grant execute on function public.validate_and_confirm_worker_arrival(uuid, float8, float8) to authenticated;

notify pgrst, 'reload schema';
