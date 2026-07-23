begin;

alter table public.live_dispatch_sessions
  add column if not exists search_radius_meters integer not null default 10000
  check (search_radius_meters between 1000 and 50000);

create or replace function private.refresh_live_dispatch(p_service_request_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
  req public.service_requests;
  started timestamptz;
  elapsed_seconds numeric;
  search_radius integer;
begin
  select * into req from public.service_requests where id=p_service_request_id;
  if req.id is null or req.status not in ('OPEN','MATCHED') then return; end if;

  select started_at, search_radius_meters into started, search_radius
  from public.live_dispatch_sessions
  where service_request_id=req.id;
  if started is null then return; end if;

  elapsed_seconds := extract(epoch from(now()-started));
  if elapsed_seconds >= 120 then
    update public.service_request_dispatches set status='EXPIRED',updated_at=now()
    where service_request_id=req.id and status in ('OFFERED','VIEWED');
    return;
  end if;

  insert into public.service_request_dispatches(service_request_id,worker_id,wave,distance_meters,approximate_latitude,approximate_longitude,expires_at)
  select req.id,wp.account_id,1,round(extensions.st_distance(p.location,req.service_location)::numeric,2),
    round((extensions.st_y(p.location::extensions.geometry)+(mod(abs(hashtext(req.id::text||wp.account_id::text)),17)-8)*0.00008)::numeric,6),
    round((extensions.st_x(p.location::extensions.geometry)+(mod(abs(hashtext(wp.account_id::text||req.id::text)),17)-8)*0.00008)::numeric,6),
    started+interval '2 minutes'
  from public.worker_profiles wp
  join public.accounts a on a.id=wp.account_id
  join public.worker_presence p on p.worker_id=wp.account_id
  where a.role='WORKER' and a.status='ACTIVE' and a.deleted_at is null
    and wp.approval_status='APPROVED' and wp.is_available and p.online and p.last_seen_at>now()-interval '30 seconds'
    and exists(select 1 from public.worker_skills s where s.worker_id=wp.account_id and s.category_id=req.category_id)
    and exists(select 1 from public.worker_availability av where av.worker_id=wp.account_id
      and av.day_of_week=extract(dow from req.scheduled_at at time zone 'Asia/Manila')::integer
      and (req.scheduled_at at time zone 'Asia/Manila')::time between av.start_time and av.end_time)
    and (req.subdivision_id is null or wp.subdivision_id=req.subdivision_id)
    and extensions.st_dwithin(p.location,req.service_location,least(search_radius,coalesce(wp.service_radius_meters,search_radius)))
  on conflict(service_request_id,worker_id) do update set
    wave=1,distance_meters=excluded.distance_meters,
    approximate_latitude=excluded.approximate_latitude,approximate_longitude=excluded.approximate_longitude,updated_at=now()
  where service_request_dispatches.status in ('OFFERED','VIEWED');
end $$;

drop function if exists public.start_live_dispatch(uuid);

create or replace function public.start_live_dispatch(p_service_request_id uuid,p_search_radius_meters integer)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if p_search_radius_meters not between 1000 and 50000 then
    raise exception using errcode='22023',message='INVALID_SEARCH_RADIUS';
  end if;
  if not exists(select 1 from public.service_requests r where r.id=p_service_request_id and r.user_account_id=auth.uid() and r.status in ('OPEN','MATCHED')) then
    raise exception using errcode='42501',message='SERVICE_REQUEST_UNAVAILABLE';
  end if;
  insert into public.live_dispatch_sessions(service_request_id,search_radius_meters)
  values(p_service_request_id,p_search_radius_meters)
  on conflict(service_request_id) do nothing;
  perform private.refresh_live_dispatch(p_service_request_id);
  return public.get_live_dispatch_snapshot(p_service_request_id);
end $$;

create or replace function public.get_live_dispatch_snapshot(p_service_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare req public.service_requests; started timestamptz; dispatch_expires timestamptz; search_radius integer; result jsonb;
begin
  select * into req from public.service_requests where id=p_service_request_id;
  if req.id is null or req.user_account_id<>auth.uid() then raise exception using errcode='42501',message='SERVICE_REQUEST_UNAVAILABLE'; end if;
  perform private.refresh_live_dispatch(req.id);
  select started_at,expires_at,search_radius_meters into started,dispatch_expires,search_radius from public.live_dispatch_sessions where service_request_id=req.id;
  if started is null then raise exception using errcode='P0001',message='LIVE_DISPATCH_NOT_STARTED'; end if;
  select jsonb_build_object('serviceRequestId',req.id,'startedAt',started,'expiresAt',dispatch_expires,
    'wave',1,'searchRadiusMeters',search_radius,
    'candidates',coalesce(jsonb_agg(jsonb_build_object('dispatchId',d.id,'workerId',d.worker_id,'status',d.status,'name',wp.display_name,'avatar',wp.avatar_path,
      'distanceMeters',d.distance_meters,'latitude',d.approximate_latitude,'longitude',d.approximate_longitude,'rating',coalesce(stats.rating,0),'reviewCount',coalesce(stats.review_count,0)) order by (d.status='ACCEPTED') desc,d.distance_meters) filter(where d.id is not null),'[]'::jsonb))
  into result from public.service_request_dispatches d join public.worker_profiles wp on wp.account_id=d.worker_id
  left join lateral(select avg(r.stars)::numeric(3,2) rating,count(*) review_count from public.reviews r where r.worker_account_id=d.worker_id and r.moderation_status='PUBLISHED') stats on true
  where d.service_request_id=req.id and d.status<>'EXPIRED';
  return result;
end $$;

revoke all on function private.refresh_live_dispatch(uuid) from public,anon,authenticated;
grant execute on function public.start_live_dispatch(uuid,integer),public.get_live_dispatch_snapshot(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
