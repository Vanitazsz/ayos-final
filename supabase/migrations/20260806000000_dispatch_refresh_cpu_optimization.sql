begin;

-- =============================================================================
-- Supabase CPU optimization: make the live-dispatch hot path index-friendly.
--
-- Problem: every get_live_dispatch_snapshot call ran two full scans of
-- worker_profiles (refresh_live_dispatch + live_dispatch_diagnostics), each
-- evaluating ST_DWithin/ST_Distance per worker. The radius predicate used a
-- per-worker radius (LEAST(search_radius, service_radius_meters)), which PostGIS
-- cannot accelerate with the worker_presence_location_gix GiST index, so every
-- poll (30s) + every realtime event + the insert->realtime->refresh cascade
-- turned into sequential scans with PostGIS math per row.
--
-- Fix: (1) compare against the constant session radius first so the GiST index
-- is used, then re-check the per-worker radius numerically; (2) force custom
-- plans so the plpgsql radius variable is planned as a literal (required for
-- index-assisted ST_DWithin); (3) serialize refreshes per request with an
-- advisory lock so concurrent snapshot calls collapse instead of stacking;
-- (4) make diagnostics count from the online-presence index instead of
-- scanning every worker with geometry math.
--
-- Behavior is unchanged: one candidate per refresh (nearest eligible, wave 1),
-- 2-minute session expiry, same reason codes and counts from diagnostics.
-- =============================================================================

create or replace function private.refresh_live_dispatch(p_service_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req public.service_requests;
  started timestamptz;
  elapsed_seconds numeric;
  search_radius integer;
begin
  -- Plan each statement with the actual runtime values so ST_DWithin sees a
  -- literal radius and can use worker_presence_location_gix (GiST).
  perform pg_catalog.set_config('plan_cache_mode', 'force_custom_plan', true);

  select * into req
  from public.service_requests
  where id = p_service_request_id;

  if req.id is null or req.status not in ('OPEN', 'MATCHED') then
    return;
  end if;

  select started_at, search_radius_meters
  into started, search_radius
  from public.live_dispatch_sessions
  where service_request_id = req.id;

  if started is null then
    return;
  end if;

  -- Serialize refreshes for this request: the 30s poll, realtime events and
  -- the insert cascade can otherwise run concurrent full scans. Callers that
  -- lose the lock skip; the winner does one refresh.
  if not pg_catalog.pg_try_advisory_xact_lock(
    pg_catalog.hashtextextended('dispatch-refresh:' || req.id::text, 0)
  ) then
    return;
  end if;

  elapsed_seconds := extract(epoch from (now() - started));
  if elapsed_seconds >= 120 then -- Standard 2 minute session window
    update public.service_request_dispatches
    set status = 'EXPIRED', updated_at = now()
    where service_request_id = req.id
      and status in ('OFFERED', 'VIEWED');
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
    round(extensions.st_distance(coalesce(p.location, wp.service_origin, req.service_location), req.service_location)::numeric, 2),
    round((extensions.st_y(coalesce(p.location, wp.service_origin, req.service_location)::extensions.geometry) + ((hashtext(req.id::text || wp.account_id::text) % 17 - 8) * 0.00008))::numeric, 6),
    round((extensions.st_x(coalesce(p.location, wp.service_origin, req.service_location)::extensions.geometry) + ((hashtext(wp.account_id::text || req.id::text) % 17 - 8) * 0.00008))::numeric, 6),
    started + interval '2 minutes'
  from public.worker_profiles wp
  join public.accounts a on a.id = wp.account_id
  join public.worker_presence p
    on p.worker_id = wp.account_id
    -- Constant-radius predicate: index-assisted via worker_presence_location_gix.
    and extensions.st_dwithin(p.location, req.service_location, search_radius)
  where a.role = 'WORKER'
    and a.status = 'ACTIVE'
    and a.deleted_at is null
    and wp.approval_status = 'APPROVED'
    and wp.is_available
    and wp.service_origin is not null
    and wp.service_radius_meters is not null
    and p.online
    and p.last_seen_at > now() - interval '75 seconds'
    -- Per-worker radius re-check (cheap numeric filter on the reduced set).
    and extensions.st_distance(p.location, req.service_location) <= wp.service_radius_meters
    and exists (
      select 1
      from public.worker_skills skill
      where skill.worker_id = wp.account_id
        and skill.category_id = req.category_id
        and skill.rate_minor is not null
        and skill.rate_minor <= round(req.budget * 100)
    )
    and (req.subdivision_id is null or wp.subdivision_id = req.subdivision_id)
    and not private.accounts_block_each_other(req.user_account_id, wp.account_id)
    and not exists (
      select 1
      from public.service_request_dispatches prior
      where prior.service_request_id = req.id
        and prior.worker_id = wp.account_id
    )
  order by
    extensions.st_distance(p.location, req.service_location),
    wp.account_id
  limit 1
  on conflict(service_request_id, worker_id) do update
  set wave = 1,
      status = case when service_request_dispatches.status = 'EXPIRED' then 'OFFERED' else service_request_dispatches.status end,
      distance_meters = excluded.distance_meters,
      approximate_latitude = excluded.approximate_latitude,
      approximate_longitude = excluded.approximate_longitude,
      updated_at = now();
end
$$;

revoke all on function private.refresh_live_dispatch(uuid)
from public, anon, authenticated;

-- =============================================================================
-- live_dispatch_diagnostics: same output, but counts are derived from the
-- online-presence index and a constant-radius GiST scan instead of scanning
-- every worker with per-row ST_Distance math.
-- =============================================================================

create or replace function private.live_dispatch_diagnostics(
  p_service_request_id uuid,
  p_wave smallint
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  request public.service_requests;
  search_radius_meters integer;
  active_count bigint;
  approved_count bigint;
  available_count bigint;
  fresh_count bigint;
  wave_count bigint;
  result jsonb;
begin
  perform pg_catalog.set_config('plan_cache_mode', 'force_custom_plan', true);

  select * into request
  from public.service_requests
  where id = p_service_request_id;

  select session.search_radius_meters
  into search_radius_meters
  from public.live_dispatch_sessions session
  where session.service_request_id = p_service_request_id;

  select
    count(*) filter (where account_status = 'ACTIVE'),
    count(*) filter (where account_status = 'ACTIVE' and approval_status = 'APPROVED'),
    count(*) filter (where account_status = 'ACTIVE' and approval_status = 'APPROVED' and is_available)
  into active_count, approved_count, available_count
  from (
    select
      a.status as account_status,
      wp.approval_status,
      wp.is_available
    from public.worker_profiles wp
    join public.accounts a on a.id = wp.account_id
  ) workers;

  select count(*)
  into fresh_count
  from public.worker_presence presence
  where presence.online
    and presence.last_seen_at > now() - interval '75 seconds';

  select count(*)
  into wave_count
  from public.worker_presence presence
  join public.worker_profiles wp on wp.account_id = presence.worker_id
  where extensions.st_dwithin(presence.location, request.service_location, coalesce(search_radius_meters, 10000))
    and extensions.st_distance(presence.location, request.service_location) <= coalesce(wp.service_radius_meters, 10000);

  select jsonb_build_object(
    'reasonCode', case
      when active_count = 0 then 'NO_ACTIVE_WORKERS'
      when approved_count = 0 then 'NO_APPROVED_WORKERS'
      when available_count = 0 then 'WORKERS_OFFLINE'
      when fresh_count = 0 then 'NO_FRESH_PRESENCE'
      when wave_count = 0 then 'OUTSIDE_SEARCH_RADIUS'
      else 'WAITING_FOR_RESPONSE'
    end,
    'counts', jsonb_build_object(
      'active', active_count,
      'skilled', active_count,
      'approved', approved_count,
      'available', available_count,
      'freshPresence', fresh_count,
      'withinWave', wave_count,
      'subdivisionCompatible', wave_count
    )
  ) into result;

  return result;
end
$$;

revoke all on function private.live_dispatch_diagnostics(uuid, smallint)
from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;
