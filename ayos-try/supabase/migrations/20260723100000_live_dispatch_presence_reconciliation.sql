begin;

-- The configurable-radius migration replaced the earlier browser presence
-- grace. Keep stationary foreground workers eligible between 20-second
-- heartbeats while still expiring genuinely disconnected workers quickly.
create or replace function private.refresh_live_dispatch(p_service_request_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  req public.service_requests;
  started timestamptz;
  elapsed_seconds numeric;
  search_radius integer;
begin
  select * into req
  from public.service_requests
  where id=p_service_request_id;

  if req.id is null or req.status not in ('OPEN','MATCHED') then
    return;
  end if;

  select started_at, search_radius_meters
  into started, search_radius
  from public.live_dispatch_sessions
  where service_request_id=req.id;

  if started is null then
    return;
  end if;

  elapsed_seconds := extract(epoch from(now()-started));
  if elapsed_seconds >= 120 then
    update public.service_request_dispatches
    set status='EXPIRED', updated_at=now()
    where service_request_id=req.id
      and status in ('OFFERED','VIEWED');
    return;
  end if;

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
    req.id,
    wp.account_id,
    1,
    round(extensions.st_distance(p.location,req.service_location)::numeric,2),
    round((extensions.st_y(p.location::extensions.geometry)+(mod(abs(hashtext(req.id::text||wp.account_id::text)),17)-8)*0.00008)::numeric,6),
    round((extensions.st_x(p.location::extensions.geometry)+(mod(abs(hashtext(wp.account_id::text||req.id::text)),17)-8)*0.00008)::numeric,6),
    started+interval '2 minutes'
  from public.worker_profiles wp
  join public.accounts a on a.id=wp.account_id
  join public.worker_presence p on p.worker_id=wp.account_id
  where a.role='WORKER'
    and a.status='ACTIVE'
    and a.deleted_at is null
    and wp.approval_status='APPROVED'
    and wp.is_available
    and p.online
    and p.last_seen_at>now()-interval '75 seconds'
    and exists(
      select 1
      from public.worker_skills skill
      where skill.worker_id=wp.account_id
        and skill.category_id=req.category_id
    )
    and exists(
      select 1
      from public.worker_availability availability
      where availability.worker_id=wp.account_id
        and availability.day_of_week=extract(dow from req.scheduled_at at time zone 'Asia/Manila')::integer
        and (req.scheduled_at at time zone 'Asia/Manila')::time between availability.start_time and availability.end_time
    )
    and (req.subdivision_id is null or wp.subdivision_id=req.subdivision_id)
    and extensions.st_dwithin(
      p.location,
      req.service_location,
      least(search_radius,coalesce(wp.service_radius_meters,search_radius))
    )
  on conflict(service_request_id,worker_id) do update
  set wave=1,
      distance_meters=excluded.distance_meters,
      approximate_latitude=excluded.approximate_latitude,
      approximate_longitude=excluded.approximate_longitude,
      updated_at=now()
  where service_request_dispatches.status in ('OFFERED','VIEWED');
end
$$;

revoke all on function private.refresh_live_dispatch(uuid)
from public, anon, authenticated;

notify pgrst,'reload schema';

commit;
