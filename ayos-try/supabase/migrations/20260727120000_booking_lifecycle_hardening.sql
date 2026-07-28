begin;

-- Booking state changes must use the audited RPCs below. A booking participant
-- may read their booking, but must not be able to bypass lifecycle validation
-- with a direct table update.
revoke update on public.bookings from authenticated;
drop policy if exists bookings_party_update on public.bookings;

drop function if exists public.transition_booking(
  uuid,
  public.booking_status,
  integer,
  text
);
drop function if exists public.cancel_booking(
  uuid,
  integer,
  text,
  text,
  text,
  text
);

create or replace function public.transition_booking(
  p_booking_id uuid,
  p_target_status public.booking_status,
  p_expected_version integer,
  p_reason text default null
) returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_booking public.bookings;
  result public.bookings;
  allowed boolean;
begin
  select *
  into current_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if current_booking.id is null or not public.is_booking_party(p_booking_id) then
    raise exception using errcode = '42501', message = 'BOOKING_UNAVAILABLE';
  end if;
  if current_booking.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'BOOKING_VERSION_CONFLICT';
  end if;
  if p_target_status = 'CANCELLED' then
    raise exception using errcode = '22023', message = 'USE_CANCEL_BOOKING';
  end if;
  if auth.uid() <> current_booking.worker_account_id and not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'WORKER_OR_ADMIN_REQUIRED';
  end if;

  allowed := case current_booking.status
    when 'PENDING' then p_target_status = 'ACCEPTED'
    when 'ACCEPTED' then p_target_status = 'WORKER_PREPARING'
    when 'WORKER_PREPARING' then p_target_status = 'WORKER_EN_ROUTE'
    when 'WORKER_EN_ROUTE' then p_target_status = 'WORKER_ARRIVED'
    when 'WORKER_ARRIVED' then p_target_status = 'SERVICE_STARTED'
    when 'SERVICE_STARTED' then p_target_status = 'IN_PROGRESS'
    when 'IN_PROGRESS' then p_target_status = 'COMPLETED'
    else false
  end;
  if not allowed then
    raise exception using errcode = 'P0001', message = 'INVALID_BOOKING_TRANSITION';
  end if;

  update public.bookings
  set status = p_target_status,
      version = version + 1,
      accepted_at = case
        when p_target_status = 'ACCEPTED' then coalesce(accepted_at, now())
        else accepted_at
      end,
      completed_at = case
        when p_target_status = 'COMPLETED' then coalesce(completed_at, now())
        else completed_at
      end
  where id = current_booking.id
  returning * into result;

  insert into public.booking_status_events(
    booking_id,
    from_status,
    to_status,
    actor_id,
    reason
  ) values (
    result.id,
    current_booking.status,
    result.status,
    auth.uid(),
    nullif(btrim(p_reason), '')
  );

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    'BOOKING_STATUS_CHANGED',
    'booking',
    result.id::text,
    jsonb_build_object(
      'from_status', current_booking.status,
      'to_status', result.status,
      'from_version', current_booking.version,
      'to_version', result.version
    )
  );

  if p_target_status = 'COMPLETED' then
    update public.service_requests
    set status = 'CLOSED',
        updated_at = now()
    where id = result.service_request_id;
  end if;

  return result;
end
$$;

create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_expected_version integer,
  p_stage text,
  p_reason_code text,
  p_details text,
  p_policy_version text
) returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_booking public.bookings;
  result public.bookings;
begin
  select *
  into current_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if current_booking.id is null or not public.is_booking_party(current_booking.id) then
    raise exception using errcode = '42501', message = 'BOOKING_UNAVAILABLE';
  end if;
  if current_booking.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'BOOKING_VERSION_CONFLICT';
  end if;
  if current_booking.status in ('COMPLETED', 'CANCELLED') then
    raise exception using errcode = '55000', message = 'BOOKING_CANNOT_BE_CANCELLED';
  end if;
  if p_stage not in (
    'BEFORE_ACCEPTANCE',
    'BEFORE_TRAVEL',
    'EN_ROUTE',
    'ARRIVED',
    'SERVICE_STARTED',
    'IN_PROGRESS'
  ) or coalesce(p_reason_code, '') !~ '^[A-Z][A-Z0-9_]{2,79}$'
    or length(btrim(coalesce(p_details, ''))) not between 3 and 1000
    or length(btrim(coalesce(p_policy_version, ''))) not between 1 and 80
  then
    raise exception using errcode = '22023', message = 'INVALID_CANCELLATION';
  end if;

  update public.bookings
  set status = 'CANCELLED',
      cancelled_at = now(),
      version = version + 1
  where id = current_booking.id
  returning * into result;

  insert into public.cancellations(
    booking_id,
    cancelled_by,
    reason,
    policy_version,
    job_stage,
    reason_code,
    initiator_role
  ) values (
    result.id,
    auth.uid(),
    btrim(p_details),
    btrim(p_policy_version),
    p_stage,
    p_reason_code,
    public.current_role()
  );

  insert into public.booking_status_events(
    booking_id,
    from_status,
    to_status,
    actor_id,
    reason
  ) values (
    result.id,
    current_booking.status,
    'CANCELLED',
    auth.uid(),
    p_reason_code || ': ' || btrim(p_details)
  );

  update public.service_requests
  set status = 'CANCELLED',
      updated_at = now()
  where id = result.service_request_id;

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    'BOOKING_CANCELLED',
    'booking',
    result.id::text,
    jsonb_build_object(
      'stage', p_stage,
      'reason_code', p_reason_code,
      'policy_version', btrim(p_policy_version),
      'from_version', current_booking.version,
      'to_version', result.version
    )
  );

  return result;
end
$$;

revoke all on function public.transition_booking(
  uuid,
  public.booking_status,
  integer,
  text
) from public, anon;
revoke all on function public.cancel_booking(
  uuid,
  integer,
  text,
  text,
  text,
  text
) from public, anon;
grant execute on function public.transition_booking(
  uuid,
  public.booking_status,
  integer,
  text
) to authenticated;
grant execute on function public.cancel_booking(
  uuid,
  integer,
  text,
  text,
  text,
  text
) to authenticated;

notify pgrst, 'reload schema';

commit;
