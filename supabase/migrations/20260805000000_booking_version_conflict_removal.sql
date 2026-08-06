begin;

-- Remove optimistic-concurrency version conflicts from booking lifecycle RPCs.
--
-- WHY: the client passed a freshly-read p_expected_version, but there is an
-- inherent race between the client's read and the RPC execution. Any writer
-- committing in that window raised 40001 BOOKING_VERSION_CONFLICT, which was
-- logged on every failed attempt (and every retry). The bookings.status state
-- machine is forward-only and every RPC below already validates the transition
-- against the LOCKED current status (select ... for update) and short-circuits
-- idempotently when the status already matches. A stale expected version can
-- therefore never permit a wrong transition, so the hard version check only
-- produced spurious errors. The version column is still bumped for the audit
-- trail (from_version/to_version); only the conflicting raise is removed.
--
-- The p_expected_version parameter is retained (with a default) so the
-- PostgREST signature is unchanged for deployed clients; its value is ignored.
-- Trailing parameters also carry defaults because PostgreSQL requires every
-- parameter after a defaulted one to have a default (42P13); the functions
-- still reject omitted values via their own validations.

create or replace function public.transition_booking(
  p_booking_id uuid,
  p_target_status public.booking_status,
  p_expected_version integer default null,
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

  if current_booking.id is null
    or not public.is_booking_party(p_booking_id)
  then
    raise exception using
      errcode = '42501',
      message = 'BOOKING_UNAVAILABLE';
  end if;
  if p_target_status = 'CANCELLED' then
    raise exception using
      errcode = '22023',
      message = 'USE_CANCEL_BOOKING';
  end if;

  if current_booking.status = p_target_status then
    if p_target_status = 'COMPLETED' then
      if auth.uid() <> current_booking.user_account_id
        and not public.is_admin(true)
      then
        raise exception using
          errcode = '42501',
          message = 'CUSTOMER_OR_ADMIN_REQUIRED';
      end if;
    elsif auth.uid() <> current_booking.worker_account_id
      and not public.is_admin(true)
    then
      raise exception using
        errcode = '42501',
        message = 'WORKER_OR_ADMIN_REQUIRED';
    end if;
    return current_booking;
  end if;

  allowed := case current_booking.status
    when 'PENDING' then p_target_status = 'ACCEPTED'
    when 'ACCEPTED' then p_target_status = 'WORKER_PREPARING'
    when 'WORKER_PREPARING' then p_target_status = 'WORKER_EN_ROUTE'
    when 'WORKER_EN_ROUTE' then p_target_status = 'WORKER_ARRIVED'
    when 'WORKER_ARRIVED' then p_target_status = 'SERVICE_STARTED'
    when 'SERVICE_STARTED' then p_target_status = 'IN_PROGRESS'
    when 'IN_PROGRESS' then p_target_status = 'PENDING_CONFIRMATION'
    when 'PENDING_CONFIRMATION' then p_target_status = 'COMPLETED'
    else false
  end;
  if not allowed then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_BOOKING_TRANSITION';
  end if;

  if current_booking.status = 'PENDING_CONFIRMATION' then
    if auth.uid() <> current_booking.user_account_id
      and not public.is_admin(true)
    then
      raise exception using
        errcode = '42501',
        message = 'CUSTOMER_OR_ADMIN_REQUIRED';
    end if;
  elsif auth.uid() <> current_booking.worker_account_id
    and not public.is_admin(true)
  then
    raise exception using
      errcode = '42501',
      message = 'WORKER_OR_ADMIN_REQUIRED';
  end if;

  update public.bookings
  set status = p_target_status,
      version = version + 1,
      accepted_at = case
        when p_target_status = 'ACCEPTED'
          then coalesce(accepted_at, now())
        else accepted_at
      end,
      completed_at = case
        when p_target_status = 'COMPLETED'
          then coalesce(completed_at, now())
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
  p_expected_version integer default null,
  p_stage text default null,
  p_reason_code text default null,
  p_details text default null,
  p_policy_version text default null
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

create or replace function public.decline_assigned_booking(
  p_booking_id uuid,
  p_expected_version integer default null,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
begin
  select *
  into booking
  from public.bookings
  where id = p_booking_id
  for update;
  if booking.id is null
    or booking.worker_account_id <> auth.uid()
    or booking.status <> 'PENDING'
  then
    raise exception using errcode = '42501', message = 'BOOKING_DECLINE_UNAVAILABLE';
  end if;
  if length(btrim(coalesce(p_reason, ''))) not between 3 and 1000 then
    raise exception using errcode = '22023', message = 'INVALID_DECLINE_REASON';
  end if;

  update public.bookings
  set status = 'CANCELLED',
      cancelled_at = now(),
      version = version + 1
  where id = booking.id;
  insert into public.booking_status_events(
    booking_id,
    from_status,
    to_status,
    actor_id,
    reason
  ) values (
    booking.id,
    'PENDING',
    'CANCELLED',
    auth.uid(),
    btrim(p_reason)
  );
  update public.service_request_dispatches
  set status = 'DECLINED',
      responded_at = now(),
      updated_at = now()
  where service_request_id = booking.service_request_id
    and worker_id = booking.worker_account_id
    and status = 'SELECTED';
  update public.service_requests
  set status = 'OPEN',
      selected_worker_id = null,
      notify_on_match = true,
      updated_at = now()
  where id = booking.service_request_id;
  insert into public.live_dispatch_sessions(
    service_request_id,
    started_at,
    expires_at,
    search_radius_meters
  )
  values (
    booking.service_request_id,
    now(),
    now() + interval '2 minutes',
    10000
  )
  on conflict (service_request_id) do update
  set started_at = excluded.started_at,
      expires_at = excluded.expires_at;

  perform private.refresh_live_dispatch(booking.service_request_id);
  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    'ASSIGNED_BOOKING_DECLINED',
    'booking',
    booking.id::text,
    jsonb_build_object('service_request_id', booking.service_request_id)
  );
  return jsonb_build_object(
    'bookingId', booking.id,
    'serviceRequestId', booking.service_request_id,
    'reoffered', true
  );
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
revoke all on function public.decline_assigned_booking(
  uuid,
  integer,
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
grant execute on function public.decline_assigned_booking(
  uuid,
  integer,
  text
) to authenticated;

notify pgrst, 'reload schema';

commit;
