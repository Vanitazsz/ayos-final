begin;

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
    raise exception using errcode = 'P0001', message = 'INVALID_BOOKING_TRANSITION';
  end if;

  if current_booking.status = 'PENDING_CONFIRMATION' then
    if auth.uid() <> current_booking.user_account_id and not public.is_admin(true) then
      raise exception using
        errcode = '42501',
        message = 'CUSTOMER_OR_ADMIN_REQUIRED';
    end if;
  elsif auth.uid() <> current_booking.worker_account_id and not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'WORKER_OR_ADMIN_REQUIRED';
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

revoke all on function public.transition_booking(
  uuid,
  public.booking_status,
  integer,
  text
) from public, anon;
grant execute on function public.transition_booking(
  uuid,
  public.booking_status,
  integer,
  text
) to authenticated;

drop policy if exists addresses_owner_accepted_worker_or_admin_read
on public.addresses;
create policy addresses_owner_accepted_worker_or_admin_read
on public.addresses for select to authenticated
using (
  account_id = auth.uid()
  or public.is_admin(false)
  or exists (
    select 1
    from public.service_requests request
    join public.bookings booking
      on booking.service_request_id = request.id
    where request.address_id = addresses.id
      and booking.worker_account_id = auth.uid()
      and booking.status in (
        'ACCEPTED',
        'WORKER_PREPARING',
        'WORKER_EN_ROUTE',
        'WORKER_ARRIVED',
        'SERVICE_STARTED',
        'IN_PROGRESS',
        'PENDING_CONFIRMATION',
        'COMPLETED'
      )
  )
);

notify pgrst, 'reload schema';

commit;
