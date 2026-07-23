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
notify pgrst, 'reload schema';
commit;
