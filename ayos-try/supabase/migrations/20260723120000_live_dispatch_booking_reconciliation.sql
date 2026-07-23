begin;

drop function if exists public.start_live_dispatch(uuid);

create or replace function public.start_live_dispatch(p_service_request_id uuid, p_search_radius_meters integer)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v_request service_requests%rowtype; v_session live_dispatch_sessions%rowtype;
begin
  select * into v_request from service_requests where id=p_service_request_id and customer_id=auth.uid();
  if not found then raise exception using errcode='P0001', message='Service request not found'; end if;
  if p_search_radius_meters is null or p_search_radius_meters < 1000 or p_search_radius_meters > 50000 then raise exception using errcode='22023', message='Search radius must be between 1 and 50 km'; end if;
  insert into live_dispatch_sessions(service_request_id, started_at, expires_at, search_radius_meters)
    values (p_service_request_id, now(), now()+interval '2 minutes', p_search_radius_meters)
    on conflict (service_request_id) do update set started_at=case when live_dispatch_sessions.expires_at <= now() then excluded.started_at else live_dispatch_sessions.started_at end,
      expires_at=case when live_dispatch_sessions.expires_at <= now() then excluded.expires_at else live_dispatch_sessions.expires_at end,
      search_radius_meters=case when live_dispatch_sessions.expires_at <= now() then excluded.search_radius_meters else live_dispatch_sessions.search_radius_meters end;
  perform private.refresh_live_dispatch(p_service_request_id);
  select * into v_session from live_dispatch_sessions where service_request_id=p_service_request_id;
  return public.get_live_dispatch_snapshot(p_service_request_id);
end $$;

grant execute on function public.start_live_dispatch(uuid, integer) to authenticated;

create or replace function public.get_live_dispatch_snapshot(p_service_request_id uuid)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare req service_requests%rowtype; session_row live_dispatch_sessions%rowtype; result jsonb;
begin
  select * into req from service_requests where id=p_service_request_id and user_account_id=auth.uid();
  if not found then raise exception using errcode='42501', message='SERVICE_REQUEST_UNAVAILABLE'; end if;
  perform private.refresh_live_dispatch(p_service_request_id);
  select * into session_row from live_dispatch_sessions where service_request_id=p_service_request_id;
  if session_row.started_at is null then raise exception using errcode='P0001', message='LIVE_DISPATCH_NOT_STARTED'; end if;
  select jsonb_build_object('serviceRequestId',req.id,'startedAt',session_row.started_at,'expiresAt',session_row.expires_at,
    'wave',1,'searchRadiusMeters',session_row.search_radius_meters,
    'diagnostics',private.live_dispatch_diagnostics(req.id,1),
    'candidates',coalesce(jsonb_agg(jsonb_build_object('dispatchId',d.id,'workerId',d.worker_id,'status',d.status,'name',wp.display_name,'avatar',wp.avatar_path,'distanceMeters',d.distance_meters,'latitude',d.approximate_latitude,'longitude',d.approximate_longitude,'rating',coalesce(stats.rating,0),'reviewCount',coalesce(stats.review_count,0)) order by (d.status='ACCEPTED') desc,d.distance_meters) filter(where d.id is not null),'[]'::jsonb)) into result
  from service_request_dispatches d join worker_profiles wp on wp.account_id=d.worker_id
  left join lateral(select avg(r.stars)::numeric(3,2) rating,count(*) review_count from reviews r where r.worker_account_id=d.worker_id and r.moderation_status='PUBLISHED') stats on true
  where d.service_request_id=req.id and d.status<>'EXPIRED';
  return result;
end $$;

grant execute on function public.get_live_dispatch_snapshot(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
