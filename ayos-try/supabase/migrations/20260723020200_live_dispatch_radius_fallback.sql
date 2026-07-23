begin;
create or replace function private.refresh_live_dispatch(p_service_request_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare req public.service_requests; started timestamptz; elapsed_seconds numeric; current_wave smallint; search_radius numeric;
begin
  select * into req from public.service_requests where id=p_service_request_id;
  if req.id is null or req.status not in ('OPEN','MATCHED') then return; end if;
  select started_at into started from public.live_dispatch_sessions where service_request_id=req.id;
  if started is null then return; end if;
  elapsed_seconds:=extract(epoch from(now()-started));
  if elapsed_seconds>=120 then
    update public.service_request_dispatches set status='EXPIRED',updated_at=now()
    where service_request_id=req.id and status in ('OFFERED','VIEWED');
    return;
  end if;
  current_wave:=case when elapsed_seconds>=60 then 3 when elapsed_seconds>=30 then 2 else 1 end;
  search_radius:=case current_wave when 1 then 5000 when 2 then 10000 else 200000 end;
  insert into public.service_request_dispatches(service_request_id,worker_id,wave,distance_meters,approximate_latitude,approximate_longitude,expires_at)
  select req.id,wp.account_id,current_wave,round(extensions.st_distance(p.location,req.service_location)::numeric,2),
    round((extensions.st_y(p.location::extensions.geometry)+(mod(abs(hashtext(req.id::text||wp.account_id::text)),17)-8)*0.00008)::numeric,6),
    round((extensions.st_x(p.location::extensions.geometry)+(mod(abs(hashtext(wp.account_id::text||req.id::text)),17)-8)*0.00008)::numeric,6),
    started+interval '2 minutes'
  from public.worker_profiles wp
  join public.accounts account on account.id=wp.account_id
  join public.worker_presence p on p.worker_id=wp.account_id
  where account.role='WORKER' and account.status='ACTIVE' and account.deleted_at is null
    and wp.approval_status='APPROVED' and wp.is_available and p.online and p.last_seen_at>now()-interval '30 seconds'
    and exists(select 1 from public.worker_skills skill where skill.worker_id=wp.account_id and skill.category_id=req.category_id)
    and exists(select 1 from public.worker_availability availability where availability.worker_id=wp.account_id
      and availability.day_of_week=extract(dow from req.scheduled_at at time zone 'Asia/Manila')::integer
      and (req.scheduled_at at time zone 'Asia/Manila')::time between availability.start_time and availability.end_time)
    and extensions.st_dwithin(p.location,req.service_location,least(search_radius,coalesce(wp.service_radius_meters,search_radius)))
  on conflict(service_request_id,worker_id) do update set
    wave=greatest(service_request_dispatches.wave,excluded.wave),distance_meters=excluded.distance_meters,
    approximate_latitude=excluded.approximate_latitude,approximate_longitude=excluded.approximate_longitude,updated_at=now()
  where service_request_dispatches.status in ('OFFERED','VIEWED');
end $$;
create or replace function private.live_dispatch_diagnostics(p_service_request_id uuid,p_wave smallint)
returns jsonb language sql stable security definer set search_path='' as $$
  with request as (
    select r.*,case p_wave when 1 then 5000 when 2 then 10000 else 200000 end::numeric search_radius
    from public.service_requests r where r.id=p_service_request_id
  ), checks as (
    select wp.account_id,
      account.status='ACTIVE' and account.deleted_at is null as active,
      exists(select 1 from public.worker_skills skill where skill.worker_id=wp.account_id and skill.category_id=request.category_id) as skilled,
      wp.approval_status='APPROVED' as approved,
      wp.is_available as available,
      presence.online and presence.last_seen_at>now()-interval '30 seconds' as fresh_presence,
      case when presence.location is null then false else extensions.st_dwithin(presence.location,request.service_location,least(request.search_radius,coalesce(wp.service_radius_meters,request.search_radius))) end as within_wave,
      exists(select 1 from public.worker_availability availability where availability.worker_id=wp.account_id
        and availability.day_of_week=extract(dow from request.scheduled_at at time zone 'Asia/Manila')::integer
        and (request.scheduled_at at time zone 'Asia/Manila')::time between availability.start_time and availability.end_time) as scheduled,
      request.subdivision_id is null or wp.subdivision_id is null or request.subdivision_id=wp.subdivision_id as subdivision_compatible
    from request cross join public.worker_profiles wp
    join public.accounts account on account.id=wp.account_id
    left join public.worker_presence presence on presence.worker_id=wp.account_id
  ), counts as (
    select count(*) filter(where active) active,
      count(*) filter(where active and skilled) skilled,
      count(*) filter(where active and skilled and approved) approved,
      count(*) filter(where active and skilled and approved and available) available,
      count(*) filter(where active and skilled and approved and available and fresh_presence) fresh_presence,
      count(*) filter(where active and skilled and approved and available and fresh_presence and within_wave) within_wave,
      count(*) filter(where active and skilled and approved and available and fresh_presence and within_wave and scheduled) scheduled,
      count(*) filter(where active and skilled and approved and available and fresh_presence and within_wave and scheduled and subdivision_compatible) subdivision_compatible
    from checks
  ) select jsonb_build_object(
    'reasonCode',case when active=0 then 'NO_ACTIVE_WORKERS' when skilled=0 then 'NO_CATEGORY_WORKERS' when approved=0 then 'NO_APPROVED_WORKERS'
      when available=0 then 'WORKERS_OFFLINE' when fresh_presence=0 then 'NO_FRESH_PRESENCE' when within_wave=0 then 'OUTSIDE_SEARCH_RADIUS'
      when scheduled=0 then 'OUTSIDE_WORKING_HOURS' else 'WAITING_FOR_RESPONSE' end,
    'counts',jsonb_build_object('active',active,'skilled',skilled,'approved',approved,'available',available,'freshPresence',fresh_presence,
      'withinWave',within_wave,'scheduled',scheduled,'subdivisionCompatible',subdivision_compatible)
  ) from counts
$$;
create or replace function public.get_live_dispatch_snapshot(p_service_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare req public.service_requests; started timestamptz; dispatch_expires timestamptz; current_wave smallint; result jsonb;
begin
  select * into req from public.service_requests where id=p_service_request_id;
  if req.id is null or req.user_account_id<>auth.uid() then raise exception using errcode='42501',message='SERVICE_REQUEST_UNAVAILABLE'; end if;
  perform private.refresh_live_dispatch(req.id);
  select started_at,expires_at into started,dispatch_expires from public.live_dispatch_sessions where service_request_id=req.id;
  if started is null then raise exception using errcode='P0001',message='LIVE_DISPATCH_NOT_STARTED'; end if;
  current_wave:=case when extract(epoch from(now()-started))>=60 then 3 when extract(epoch from(now()-started))>=30 then 2 else 1 end;
  select jsonb_build_object('serviceRequestId',req.id,'startedAt',started,'expiresAt',dispatch_expires,'wave',current_wave,
    'diagnostics',private.live_dispatch_diagnostics(req.id,current_wave),
    'candidates',coalesce(jsonb_agg(jsonb_build_object('dispatchId',dispatch.id,'workerId',dispatch.worker_id,'status',dispatch.status,
      'name',worker.display_name,'avatar',worker.avatar_path,'distanceMeters',dispatch.distance_meters,'latitude',dispatch.approximate_latitude,
      'longitude',dispatch.approximate_longitude,'rating',coalesce(stats.rating,0),'reviewCount',coalesce(stats.review_count,0))
      order by(dispatch.status='ACCEPTED') desc,dispatch.distance_meters) filter(where dispatch.id is not null),'[]'::jsonb))
  into result from public.service_request_dispatches dispatch join public.worker_profiles worker on worker.account_id=dispatch.worker_id
  left join lateral(select avg(review.stars)::numeric(3,2) rating,count(*) review_count from public.reviews review
    where review.worker_account_id=dispatch.worker_id and review.moderation_status='PUBLISHED') stats on true
  where dispatch.service_request_id=req.id and dispatch.status<>'EXPIRED';
  return result;
end $$;
create or replace function public.get_my_worker_live_status()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare worker public.worker_profiles; presence public.worker_presence; subdivision_name text;
begin
  select * into worker from public.worker_profiles where account_id=auth.uid();
  if worker.account_id is null then raise exception using errcode='42501',message='WORKER_ROLE_REQUIRED'; end if;
  select * into presence from public.worker_presence where worker_id=auth.uid();
  select name into subdivision_name from public.subdivisions where id=worker.subdivision_id;
  return jsonb_build_object('subdivisionId',worker.subdivision_id,'subdivisionName',subdivision_name,'serviceArea',worker.service_area,
    'radiusMeters',worker.service_radius_meters,'presenceOnline',coalesce(presence.online,false),'lastSeenAt',presence.last_seen_at,
    'latitude',case when presence.location is null then null else round(extensions.st_y(presence.location::extensions.geometry)::numeric,6) end,
    'longitude',case when presence.location is null then null else round(extensions.st_x(presence.location::extensions.geometry)::numeric,6) end,
    'accuracyMeters',presence.accuracy_meters);
end $$;
revoke all on function public.get_my_worker_live_status() from public,anon;
grant execute on function public.get_my_worker_live_status() to authenticated;
notify pgrst,'reload schema';
commit;
