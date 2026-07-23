-- Make browser-reported accuracy advisory and temporarily remove taxonomy
-- enforcement from live matching. Existing taxonomy data remains intact.

create or replace function public.update_worker_presence(
  p_latitude numeric,
  p_longitude numeric,
  p_accuracy_meters numeric default null,
  p_online boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_accuracy numeric(8,2);
begin
  if p_latitude is null or p_longitude is null
    or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180
  then
    raise exception using errcode='22023', message='INVALID_WORKER_LOCATION';
  end if;

  if not exists(
    select 1
    from public.worker_profiles wp
    join public.accounts a on a.id=wp.account_id
    where wp.account_id=auth.uid()
      and a.status='ACTIVE'
      and wp.approval_status='APPROVED'
  ) then
    raise exception using errcode='42501', message='WORKER_NOT_READY';
  end if;

  safe_accuracy := case
    when p_accuracy_meters is null
      or p_accuracy_meters < 0
      or p_accuracy_meters > 10000
      or p_accuracy_meters::text in ('NaN','Infinity','-Infinity')
    then null
    else round(p_accuracy_meters, 2)
  end;

  insert into public.worker_presence(
    worker_id, location, accuracy_meters, online, last_seen_at
  )
  values(
    auth.uid(),
    private.make_location(p_latitude,p_longitude),
    safe_accuracy,
    p_online,
    now()
  )
  on conflict(worker_id) do update
  set location=excluded.location,
      accuracy_meters=excluded.accuracy_meters,
      online=excluded.online,
      last_seen_at=now(),
      updated_at=now();

  return jsonb_build_object(
    'online',p_online,
    'lastSeenAt',now(),
    'accuracyMeters',safe_accuracy
  );
end
$$;
create or replace function private.refresh_live_dispatch(p_service_request_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
  req public.service_requests;
  started timestamptz;
  dispatch_expires timestamptz;
  wave smallint;
begin
  select * into req from public.service_requests where id=p_service_request_id;
  select started_at,expires_at into started,dispatch_expires
  from public.live_dispatch_sessions where service_request_id=p_service_request_id;
  if req.id is null or started is null then return; end if;

  wave := case
    when extract(epoch from(now()-started))>=60 then 3
    when extract(epoch from(now()-started))>=30 then 2
    else 1
  end;

  update public.service_request_dispatches
  set status='EXPIRED',updated_at=now()
  where service_request_id=req.id
    and status in ('OFFERED','VIEWED','ACCEPTED')
    and (expires_at<=now() or dispatch_expires<=now());

  if dispatch_expires<=now() then return; end if;

  insert into public.service_request_dispatches(
    service_request_id,worker_id,status,wave,distance_meters,
    approximate_latitude,approximate_longitude,expires_at
  )
  select
    req.id,
    wp.account_id,
    'OFFERED',
    wave,
    round(extensions.st_distance(p.location,req.location))::integer,
    round((extensions.st_y(p.location::extensions.geometry)
      + ((hashtextextended(req.id::text||wp.account_id::text,0)%120-60)::numeric/10000))::numeric,3),
    round((extensions.st_x(p.location::extensions.geometry)
      + ((hashtextextended(wp.account_id::text||req.id::text,0)%120-60)::numeric/10000))::numeric,3),
    dispatch_expires
  from public.worker_profiles wp
  join public.accounts a on a.id=wp.account_id
  join public.worker_presence p on p.worker_id=wp.account_id
  where a.status='ACTIVE'
    and wp.approval_status='APPROVED'
    and wp.is_available
    and p.online
    and p.last_seen_at>now()-interval '30 seconds'
    and extensions.st_distance(p.location,req.location)<=
      case wave
        when 1 then least(5000,coalesce(wp.service_radius_meters,5000))
        when 2 then least(10000,coalesce(wp.service_radius_meters,10000))
        else coalesce(wp.service_radius_meters,10000)
      end
    and exists(
      select 1 from public.worker_availability av
      where av.worker_id=wp.account_id
        and av.day_of_week=extract(dow from req.scheduled_at at time zone av.timezone)::smallint
        and (req.scheduled_at at time zone av.timezone)::time between av.start_time and av.end_time
    )
  on conflict(service_request_id,worker_id) do update
  set wave=greatest(public.service_request_dispatches.wave,excluded.wave),
      distance_meters=excluded.distance_meters,
      approximate_latitude=excluded.approximate_latitude,
      approximate_longitude=excluded.approximate_longitude,
      updated_at=now()
  where public.service_request_dispatches.status in ('OFFERED','VIEWED');
end
$$;
create or replace function private.live_dispatch_diagnostics(
  p_service_request_id uuid,
  p_wave smallint
)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  request public.service_requests;
  result jsonb;
begin
  select * into request from public.service_requests where id=p_service_request_id;
  with eligibility as (
    select
      wp.account_id,
      (a.status='ACTIVE') as active,
      (wp.approval_status='APPROVED') as approved,
      wp.is_available as available,
      (presence.online and presence.last_seen_at>now()-interval '30 seconds') as fresh_presence,
      (
        presence.location is not null
        and extensions.st_distance(presence.location,request.location)<=
          case p_wave
            when 1 then least(5000,coalesce(wp.service_radius_meters,5000))
            when 2 then least(10000,coalesce(wp.service_radius_meters,10000))
            else coalesce(wp.service_radius_meters,10000)
          end
      ) as within_wave,
      exists(
        select 1 from public.worker_availability av
        where av.worker_id=wp.account_id
          and av.day_of_week=extract(dow from request.scheduled_at at time zone av.timezone)::smallint
          and (request.scheduled_at at time zone av.timezone)::time between av.start_time and av.end_time
      ) as scheduled
    from public.worker_profiles wp
    join public.accounts a on a.id=wp.account_id
    left join public.worker_presence presence on presence.worker_id=wp.account_id
  ), counts as (
    select
      count(*) filter(where active) active_count,
      count(*) filter(where active and approved) approved_count,
      count(*) filter(where active and approved and available) available_count,
      count(*) filter(where active and approved and available and fresh_presence) fresh_count,
      count(*) filter(where active and approved and available and fresh_presence and within_wave) wave_count,
      count(*) filter(where active and approved and available and fresh_presence and within_wave and scheduled) scheduled_count
    from eligibility
  )
  select jsonb_build_object(
    'reasonCode',case
      when active_count=0 then 'NO_ACTIVE_WORKERS'
      when approved_count=0 then 'NO_APPROVED_WORKERS'
      when available_count=0 then 'WORKERS_OFFLINE'
      when fresh_count=0 then 'NO_FRESH_PRESENCE'
      when wave_count=0 then 'OUTSIDE_SEARCH_RADIUS'
      when scheduled_count=0 then 'OUTSIDE_WORKING_HOURS'
      else 'WAITING_FOR_RESPONSE'
    end,
    'counts',jsonb_build_object(
      'active',active_count,
      'skilled',active_count,
      'approved',approved_count,
      'available',available_count,
      'freshPresence',fresh_count,
      'withinWave',wave_count,
      'scheduled',scheduled_count,
      'subdivisionCompatible',wave_count
    )
  ) into result from counts;
  return result;
end
$$;
create or replace function public.get_my_worker_matching_readiness()
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  worker public.worker_profiles;
  account public.accounts;
  schedule_count integer;
  schedule jsonb;
begin
  select * into account from public.accounts where id=auth.uid();
  if account.id is null or account.role<>'WORKER' or account.deleted_at is not null then
    raise exception using errcode='42501',message='WORKER_ROLE_REQUIRED';
  end if;
  select * into worker from public.worker_profiles where account_id=auth.uid();
  if worker.account_id is null then
    raise exception using errcode='P0002',message='WORKER_PROFILE_NOT_FOUND';
  end if;

  select count(*),coalesce(jsonb_agg(jsonb_build_object(
    'dayOfWeek',availability.day_of_week,
    'startTime',to_char(availability.start_time,'HH24:MI'),
    'endTime',to_char(availability.end_time,'HH24:MI'),
    'timezone',availability.timezone
  ) order by availability.day_of_week),'[]'::jsonb)
  into schedule_count,schedule
  from public.worker_availability availability
  where availability.worker_id=worker.account_id;

  return jsonb_build_object(
    'accountEligible',account.status='ACTIVE',
    'verificationStatus',worker.approval_status,
    'skillsReady',true,
    'serviceAreaReady',worker.service_origin is not null and worker.service_radius_meters is not null,
    'scheduleReady',schedule_count>0,
    'online',worker.is_available,
    'setupComplete',
      account.status='ACTIVE'
      and worker.approval_status='APPROVED'
      and worker.service_origin is not null
      and worker.service_radius_meters is not null
      and schedule_count>0,
    'matchable',
      account.status='ACTIVE'
      and worker.approval_status='APPROVED'
      and worker.service_origin is not null
      and worker.service_radius_meters is not null
      and schedule_count>0
      and worker.is_available,
    'latitude',case when worker.service_origin is null then null else round(extensions.st_y(worker.service_origin::extensions.geometry)::numeric,6) end,
    'longitude',case when worker.service_origin is null then null else round(extensions.st_x(worker.service_origin::extensions.geometry)::numeric,6) end,
    'serviceRadiusMeters',worker.service_radius_meters,
    'serviceArea',worker.service_area,
    'schedule',schedule
  );
end
$$;
grant execute on function public.update_worker_presence(numeric,numeric,numeric,boolean) to authenticated;
grant execute on function public.get_my_worker_matching_readiness() to authenticated;
select pg_notify('pgrst','reload schema');
