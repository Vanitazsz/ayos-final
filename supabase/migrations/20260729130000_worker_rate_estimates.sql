begin;

create or replace function public.get_worker_rate_estimate(
  p_category_id uuid,
  p_latitude numeric,
  p_longitude numeric,
  p_scheduled_at timestamptz,
  p_search_radius_meters integer,
  p_max_budget_minor bigint
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  request_location extensions.geography;
  customer_subdivision_id uuid;
  result jsonb;
begin
  if auth.uid() is null or public.current_role() <> 'USER' then
    raise exception using errcode = '42501', message = 'USER_REQUIRED';
  end if;
  if p_category_id is null
    or p_latitude is null
    or p_longitude is null
    or p_scheduled_at is null
    or p_search_radius_meters is null
    or p_max_budget_minor is null
    or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180
    or p_scheduled_at <= now()
    or p_search_radius_meters not between 1000 and 50000
    or p_max_budget_minor < 100
  then
    raise exception using errcode = '22023', message = 'INVALID_RATE_ESTIMATE_INPUT';
  end if;

  request_location := extensions.st_setsrid(
    extensions.st_makepoint(p_longitude, p_latitude),
    4326
  )::extensions.geography;

  select profile.subdivision_id
  into customer_subdivision_id
  from public.user_profiles profile
  where profile.account_id = auth.uid();

  select jsonb_build_object(
    'minimumRateMinor', min(skill.rate_minor),
    'maximumRateMinor', max(skill.rate_minor),
    'workerCount', count(*)
  )
  into result
  from public.worker_profiles worker
  join public.accounts account on account.id = worker.account_id
  join public.worker_skills skill
    on skill.worker_id = worker.account_id
   and skill.category_id = p_category_id
  join public.service_categories category
    on category.id = skill.category_id
   and category.is_active
  join public.worker_presence presence
    on presence.worker_id = worker.account_id
  where account.role = 'WORKER'
    and account.status = 'ACTIVE'
    and account.deleted_at is null
    and worker.approval_status = 'APPROVED'
    and worker.is_available
    and worker.service_origin is not null
    and worker.service_radius_meters is not null
    and skill.rate_minor is not null
    and skill.rate_minor <= p_max_budget_minor
    and presence.online
    and presence.last_seen_at > now() - interval '75 seconds'
    and exists (
      select 1
      from public.worker_availability availability
      where availability.worker_id = worker.account_id
        and availability.day_of_week = extract(
          dow from p_scheduled_at at time zone 'Asia/Manila'
        )::integer
        and (p_scheduled_at at time zone 'Asia/Manila')::time
          between availability.start_time and availability.end_time
    )
    and (
      customer_subdivision_id is null
      or worker.subdivision_id = customer_subdivision_id
    )
    and extensions.st_dwithin(
      worker.service_origin,
      request_location,
      worker.service_radius_meters
    )
    and extensions.st_dwithin(
      presence.location,
      request_location,
      least(p_search_radius_meters, worker.service_radius_meters)
    )
    and not private.accounts_block_each_other(auth.uid(), worker.account_id);

  return coalesce(
    result,
    jsonb_build_object(
      'minimumRateMinor', null,
      'maximumRateMinor', null,
      'workerCount', 0
    )
  );
end
$$;

revoke all on function public.get_worker_rate_estimate(
  uuid,
  numeric,
  numeric,
  timestamptz,
  integer,
  bigint
) from public, anon;
grant execute on function public.get_worker_rate_estimate(
  uuid,
  numeric,
  numeric,
  timestamptz,
  integer,
  bigint
) to authenticated;

create or replace function private.worker_match_eligibility(p_service_request_id uuid)
returns table(
  worker_id uuid,
  account_eligible boolean,
  skill_match boolean,
  approved boolean,
  service_area_ready boolean,
  within_radius boolean,
  schedule_match boolean,
  online boolean,
  eligible boolean,
  distance_meters double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  with request as (
    select service_request.*
    from public.service_requests service_request
    where service_request.id = p_service_request_id
  ), checks as (
    select
      worker.account_id as worker_id,
      (
        account.role = 'WORKER'
        and account.status = 'ACTIVE'
        and account.deleted_at is null
      ) as account_eligible,
      exists (
        select 1
        from public.worker_skills skill
        join public.service_categories category on category.id = skill.category_id
        where skill.worker_id = worker.account_id
          and skill.category_id = request.category_id
          and category.is_active
      ) as skill_match,
      exists (
        select 1
        from public.worker_skills skill
        where skill.worker_id = worker.account_id
          and skill.category_id = request.category_id
          and skill.rate_minor is not null
          and skill.rate_minor <= round(request.budget * 100)
      ) as rate_eligible,
      worker.approval_status = 'APPROVED' as approved,
      (
        worker.service_origin is not null
        and worker.service_radius_meters is not null
      ) as service_area_ready,
      case
        when worker.service_origin is null or worker.service_radius_meters is null then false
        else extensions.st_dwithin(
          worker.service_origin,
          request.service_location,
          worker.service_radius_meters
        )
      end as within_radius,
      exists (
        select 1
        from public.worker_availability availability
        where availability.worker_id = worker.account_id
          and availability.day_of_week = extract(
            dow from request.scheduled_at at time zone 'Asia/Manila'
          )::integer
          and (request.scheduled_at at time zone 'Asia/Manila')::time
            between availability.start_time and availability.end_time
      ) as schedule_match,
      worker.is_available as online,
      not private.accounts_block_each_other(
        request.user_account_id,
        worker.account_id
      ) as not_blocked,
      case
        when worker.service_origin is null then null
        else extensions.st_distance(worker.service_origin, request.service_location)
      end as distance_meters
    from request
    cross join public.worker_profiles worker
    left join public.accounts account on account.id = worker.account_id
  )
  select
    checks.worker_id,
    checks.account_eligible,
    checks.skill_match,
    checks.approved,
    checks.service_area_ready,
    checks.within_radius,
    checks.schedule_match,
    checks.online,
    checks.account_eligible
      and checks.skill_match
      and checks.rate_eligible
      and checks.approved
      and checks.service_area_ready
      and checks.within_radius
      and checks.schedule_match
      and checks.online
      and checks.not_blocked as eligible,
    checks.distance_meters
  from checks
$$;

create or replace function private.refresh_live_dispatch(p_service_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.service_requests;
  session public.live_dispatch_sessions;
  next_wave smallint;
begin
  select * into request
  from public.service_requests
  where id = p_service_request_id;
  select * into session
  from public.live_dispatch_sessions
  where service_request_id = p_service_request_id;
  if request.id is null
    or request.status not in ('OPEN', 'MATCHED')
    or session.service_request_id is null
  then
    return;
  end if;

  update public.service_request_dispatches
  set status = 'EXPIRED', updated_at = now()
  where service_request_id = request.id
    and status in ('OFFERED', 'VIEWED')
    and expires_at <= now();

  if session.expires_at <= now()
    or exists (
      select 1
      from public.service_request_dispatches dispatch
      where dispatch.service_request_id = request.id
        and dispatch.status in ('OFFERED', 'VIEWED', 'ACCEPTED', 'SELECTED')
    )
  then
    return;
  end if;

  select least(3, count(*) + 1)::smallint
  into next_wave
  from public.service_request_dispatches dispatch
  where dispatch.service_request_id = request.id;

  insert into public.service_request_dispatches(
    service_request_id,
    worker_id,
    wave,
    distance_meters,
    approximate_latitude,
    approximate_longitude,
    expires_at
  )
  select
    request.id,
    worker.account_id,
    next_wave,
    round(extensions.st_distance(presence.location, request.service_location)::numeric, 2),
    round((
      extensions.st_y(presence.location::extensions.geometry)
      + (mod(abs(hashtext(request.id::text || worker.account_id::text)), 17) - 8) * 0.00008
    )::numeric, 6),
    round((
      extensions.st_x(presence.location::extensions.geometry)
      + (mod(abs(hashtext(worker.account_id::text || request.id::text)), 17) - 8) * 0.00008
    )::numeric, 6),
    least(session.expires_at, now() + interval '30 seconds')
  from public.worker_profiles worker
  join public.accounts account on account.id = worker.account_id
  join public.worker_presence presence on presence.worker_id = worker.account_id
  join public.worker_skills skill
    on skill.worker_id = worker.account_id
    and skill.category_id = request.category_id
  where account.role = 'WORKER'
    and account.status = 'ACTIVE'
    and account.deleted_at is null
    and worker.approval_status = 'APPROVED'
    and worker.is_available
    and worker.service_origin is not null
    and worker.service_radius_meters is not null
    and skill.rate_minor is not null
    and skill.rate_minor <= round(request.budget * 100)
    and presence.online
    and presence.last_seen_at > now() - interval '75 seconds'
    and exists (
      select 1
      from public.worker_availability availability
      where availability.worker_id = worker.account_id
        and availability.day_of_week = extract(
          dow from request.scheduled_at at time zone 'Asia/Manila'
        )::integer
        and (request.scheduled_at at time zone 'Asia/Manila')::time
          between availability.start_time and availability.end_time
    )
    and (
      request.subdivision_id is null
      or worker.subdivision_id = request.subdivision_id
    )
    and extensions.st_dwithin(
      worker.service_origin,
      request.service_location,
      worker.service_radius_meters
    )
    and extensions.st_dwithin(
      presence.location,
      request.service_location,
      least(
        session.search_radius_meters,
        coalesce(worker.service_radius_meters, session.search_radius_meters)
      )
    )
    and not private.accounts_block_each_other(
      request.user_account_id,
      worker.account_id
    )
    and not exists (
      select 1
      from public.service_request_dispatches prior
      where prior.service_request_id = request.id
        and prior.worker_id = worker.account_id
    )
  order by
    extensions.st_distance(presence.location, request.service_location),
    worker.account_id
  limit 1;
end
$$;

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
      select 1
      from public.service_request_dispatches dispatch
      where dispatch.service_request_id = request.id
        and dispatch.worker_id = p_worker_id
        and dispatch.status = 'ACCEPTED'
        and dispatch.expires_at > now()
    )
    or not exists (
      select 1
      from private.worker_match_eligibility(request.id) eligibility
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
  if worker_rate_minor is null
    or worker_rate_minor > round(request.budget * 100)
  then
    raise exception using errcode = 'P0001', message = 'WORKER_RATE_UNAVAILABLE';
  end if;

  insert into public.bookings(
    service_request_id, user_account_id, worker_account_id, agreed_service_amount
  ) values (
    request.id,
    auth.uid(),
    p_worker_id,
    worker_rate_minor::numeric / 100
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
  set status = case
        when worker_id = p_worker_id then 'SELECTED'
        else 'EXPIRED'
      end,
      updated_at = now()
  where service_request_id = request.id;
  update public.worker_presence
  set online = false, updated_at = now()
  where worker_id = p_worker_id;

  perform pgmq.send(
    'booking_timeouts',
    jsonb_build_object(
      'booking_id', booking.id,
      'due_at', booking.response_due_at,
      'attempt', 0
    )
  );
  return booking;
end
$$;

revoke all on function public.select_worker(uuid, uuid) from public, anon;
grant execute on function public.select_worker(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
