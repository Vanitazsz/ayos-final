-- Migration: Online Workers Are Always Ready (remove worker hours) + Accurate Service Radius
-- 1. worker_availability no longer gates matching, readiness, estimates, or admin availability.
--    Being online (Available for matching switch + fresh presence heartbeat) is enough.
-- 2. The service radius is measured from the worker's LIVE presence location (falling back to
--    the registered service_origin) and is capped at min(worker service radius, customer search
--    radius), so an online worker near the job is no longer excluded by a stale home base.
-- 3. save_my_worker_matching_setup accepts an empty schedule and clears availability rows.

BEGIN;

-- =====================================================================
-- 1. private.worker_match_eligibility
--    - schedule_match removed (schedule no longer gates eligibility)
--    - within_radius / distance_meters anchored on fresh presence, fallback service_origin
-- =====================================================================
DROP FUNCTION IF EXISTS private.worker_match_eligibility(UUID);
CREATE FUNCTION private.worker_match_eligibility(p_service_request_id UUID)
RETURNS TABLE(
  worker_id UUID,
  account_eligible BOOLEAN,
  skill_match BOOLEAN,
  approved BOOLEAN,
  service_area_ready BOOLEAN,
  within_radius BOOLEAN,
  online BOOLEAN,
  eligible BOOLEAN,
  distance_meters DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH request AS (
    SELECT service_request.*
    FROM public.service_requests service_request
    WHERE service_request.id = p_service_request_id
  ),
  worker_position AS (
    SELECT
      presence.worker_id,
      CASE
        WHEN presence.online AND presence.last_seen_at > NOW() - INTERVAL '75 seconds'
        THEN presence.location
      END AS live_location
    FROM public.worker_presence presence
  ),
  checks AS (
    SELECT
      worker.account_id AS worker_id,
      (
        account.role = 'WORKER'
        AND account.status = 'ACTIVE'
        AND account.deleted_at IS NULL
      ) AS account_eligible,
      (
        EXISTS (
          SELECT 1
          FROM public.worker_skills skill
          JOIN public.service_categories category ON category.id = skill.category_id
          WHERE skill.worker_id = worker.account_id
            AND skill.category_id = request.category_id
            AND category.is_active
        )
      ) AS skill_match,
      EXISTS (
        SELECT 1
        FROM public.worker_skills skill
        WHERE skill.worker_id = worker.account_id
          AND skill.category_id = request.category_id
          AND skill.rate_minor IS NOT NULL
          AND skill.rate_minor <= ROUND(request.budget * 100)
      ) AS rate_eligible,
      worker.approval_status = 'APPROVED' AS approved,
      (
        worker.service_origin IS NOT NULL
        AND worker.service_radius_meters IS NOT NULL
      ) AS service_area_ready,
      CASE
        WHEN worker.service_origin IS NULL OR worker.service_radius_meters IS NULL THEN FALSE
        ELSE extensions.st_dwithin(
          COALESCE(worker_position.live_location, worker.service_origin),
          request.service_location,
          worker.service_radius_meters
        )
      END AS within_radius,
      worker.is_available AS online,
      NOT private.accounts_block_each_other(
        request.user_account_id,
        worker.account_id
      ) AS not_blocked,
      CASE
        WHEN worker.service_origin IS NULL THEN NULL
        ELSE extensions.st_distance(
          COALESCE(worker_position.live_location, worker.service_origin),
          request.service_location
        )
      END AS distance_meters
    FROM request
    CROSS JOIN public.worker_profiles worker
    LEFT JOIN public.accounts account ON account.id = worker.account_id
    LEFT JOIN worker_position ON worker_position.worker_id = worker.account_id
  )
  SELECT
    checks.worker_id,
    checks.account_eligible,
    checks.skill_match,
    checks.approved,
    checks.service_area_ready,
    checks.within_radius,
    checks.online,
    (
      checks.account_eligible
      AND checks.skill_match
      AND checks.rate_eligible
      AND checks.approved
      AND checks.service_area_ready
      AND checks.within_radius
      AND checks.online
      AND checks.not_blocked
    ) AS eligible,
    checks.distance_meters
  FROM checks;
$$;

REVOKE ALL ON FUNCTION private.worker_match_eligibility(UUID)
FROM public, anon, authenticated;

-- =====================================================================
-- 2. private.refresh_live_dispatch
--    - availability gate removed
--    - service_origin-anchored radius gate removed; radius is measured from
--      live presence and capped at LEAST(search_radius, worker service radius)
-- =====================================================================
CREATE OR REPLACE FUNCTION private.refresh_live_dispatch(p_service_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  req public.service_requests;
  started TIMESTAMPTZ;
  elapsed_seconds NUMERIC;
  search_radius INTEGER;
BEGIN
  SELECT * INTO req
  FROM public.service_requests
  WHERE id = p_service_request_id;

  IF req.id IS NULL OR req.status NOT IN ('OPEN', 'MATCHED') THEN
    RETURN;
  END IF;

  SELECT started_at, search_radius_meters
  INTO started, search_radius
  FROM public.live_dispatch_sessions
  WHERE service_request_id = req.id;

  IF started IS NULL THEN
    RETURN;
  END IF;

  elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - started));
  IF elapsed_seconds >= 120 THEN -- Standard 2 minute session window
    UPDATE public.service_request_dispatches
    SET status = 'EXPIRED', updated_at = NOW()
    WHERE service_request_id = req.id
      AND status IN ('OFFERED', 'VIEWED');
    RETURN;
  END IF;

  INSERT INTO public.service_request_dispatches(
    service_request_id,
    worker_id,
    wave,
    distance_meters,
    approximate_latitude,
    approximate_longitude,
    expires_at
  )
  SELECT
    req.id,
    wp.account_id,
    1,
    ROUND(extensions.st_distance(COALESCE(p.location, wp.service_origin, req.service_location), req.service_location)::NUMERIC, 2),
    ROUND((extensions.st_y(COALESCE(p.location, wp.service_origin, req.service_location)::extensions.geometry) + ((HASHTEXT(req.id::TEXT || wp.account_id::TEXT) % 17 - 8) * 0.00008))::NUMERIC, 6),
    ROUND((extensions.st_x(COALESCE(p.location, wp.service_origin, req.service_location)::extensions.geometry) + ((HASHTEXT(wp.account_id::TEXT || req.id::TEXT) % 17 - 8) * 0.00008))::NUMERIC, 6),
    started + INTERVAL '2 minutes'
  FROM public.worker_profiles wp
  JOIN public.accounts a ON a.id = wp.account_id
  JOIN public.worker_presence p ON p.worker_id = wp.account_id
  WHERE a.role = 'WORKER'
    AND a.status = 'ACTIVE'
    AND a.deleted_at IS NULL
    AND wp.approval_status = 'APPROVED'
    AND wp.is_available
    AND wp.service_origin IS NOT NULL
    AND wp.service_radius_meters IS NOT NULL
    AND p.online
    AND p.last_seen_at > NOW() - INTERVAL '75 seconds'
    AND EXISTS (
      SELECT 1
      FROM public.worker_skills skill
      WHERE skill.worker_id = wp.account_id
        AND skill.category_id = req.category_id
        AND skill.rate_minor IS NOT NULL
        AND skill.rate_minor <= ROUND(req.budget * 100)
    )
    AND (req.subdivision_id IS NULL OR wp.subdivision_id = req.subdivision_id)
    AND extensions.st_dwithin(
      p.location,
      req.service_location,
      LEAST(search_radius, wp.service_radius_meters)
    )
    AND NOT private.accounts_block_each_other(
      req.user_account_id,
      wp.account_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.service_request_dispatches prior
      WHERE prior.service_request_id = req.id
        AND prior.worker_id = wp.account_id
    )
  ORDER BY
    extensions.st_distance(p.location, req.service_location),
    wp.account_id
  LIMIT 1
  ON CONFLICT(service_request_id, worker_id) DO UPDATE
  SET wave = 1,
      status = CASE WHEN service_request_dispatches.status = 'EXPIRED' THEN 'OFFERED' ELSE service_request_dispatches.status END,
      distance_meters = EXCLUDED.distance_meters,
      approximate_latitude = EXCLUDED.approximate_latitude,
      approximate_longitude = EXCLUDED.approximate_longitude,
      updated_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION private.refresh_live_dispatch(UUID)
FROM public, anon, authenticated;

-- =====================================================================
-- 3. public.get_worker_rate_estimate
--    - availability gate removed
--    - service_origin-anchored radius gate removed; live-presence radius used
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_worker_rate_estimate(
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
    and (
      customer_subdivision_id is null
      or worker.subdivision_id = customer_subdivision_id
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

REVOKE ALL ON FUNCTION public.get_worker_rate_estimate(
  uuid, numeric, numeric, timestamptz, integer, bigint
) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_worker_rate_estimate(
  uuid, numeric, numeric, timestamptz, integer, bigint
) TO authenticated;

-- =====================================================================
-- 4. private.live_dispatch_diagnostics
--    - schedule count / OUTSIDE_WORKING_HOURS removed
--    - within_wave computed from session search radius + worker radius off live presence
-- =====================================================================
CREATE OR REPLACE FUNCTION private.live_dispatch_diagnostics(
  p_service_request_id UUID,
  p_wave SMALLINT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  request public.service_requests;
  search_radius_meters INTEGER;
  result JSONB;
BEGIN
  SELECT * INTO request
  FROM public.service_requests
  WHERE id = p_service_request_id;

  SELECT session.search_radius_meters
  INTO search_radius_meters
  FROM public.live_dispatch_sessions session
  WHERE session.service_request_id = p_service_request_id;

  WITH eligibility AS (
    SELECT
      wp.account_id,
      (a.status = 'ACTIVE') AS active,
      (wp.approval_status = 'APPROVED') AS approved,
      wp.is_available AS available,
      (
        presence.online
        AND presence.last_seen_at > NOW() - INTERVAL '75 seconds'
      ) AS fresh_presence,
      (
        presence.location IS NOT NULL
        AND extensions.st_distance(
          presence.location,
          request.service_location
        ) <= LEAST(
          COALESCE(search_radius_meters, 10000),
          COALESCE(wp.service_radius_meters, 10000)
        )
      ) AS within_wave
    FROM public.worker_profiles wp
    JOIN public.accounts a ON a.id = wp.account_id
    LEFT JOIN public.worker_presence presence ON presence.worker_id = wp.account_id
  ),
  counts AS (
    SELECT
      COUNT(*) FILTER (WHERE active) active_count,
      COUNT(*) FILTER (WHERE active AND approved) approved_count,
      COUNT(*) FILTER (WHERE active AND approved AND available) available_count,
      COUNT(*) FILTER (WHERE active AND approved AND available AND fresh_presence) fresh_count,
      COUNT(*) FILTER (WHERE active AND approved AND available AND fresh_presence AND within_wave) wave_count
    FROM eligibility
  )
  SELECT JSONB_BUILD_OBJECT(
    'reasonCode', CASE
      WHEN active_count = 0 THEN 'NO_ACTIVE_WORKERS'
      WHEN approved_count = 0 THEN 'NO_APPROVED_WORKERS'
      WHEN available_count = 0 THEN 'WORKERS_OFFLINE'
      WHEN fresh_count = 0 THEN 'NO_FRESH_PRESENCE'
      WHEN wave_count = 0 THEN 'OUTSIDE_SEARCH_RADIUS'
      ELSE 'WAITING_FOR_RESPONSE'
    END,
    'counts', JSONB_BUILD_OBJECT(
      'active', active_count,
      'skilled', active_count,
      'approved', approved_count,
      'available', available_count,
      'freshPresence', fresh_count,
      'withinWave', wave_count,
      'subdivisionCompatible', wave_count
    )
  ) INTO result FROM counts;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION private.live_dispatch_diagnostics(UUID, SMALLINT)
FROM public, anon, authenticated;

-- =====================================================================
-- 5. public.get_my_worker_matching_readiness
--    - schedule no longer required for setupComplete / matchable
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_my_worker_matching_readiness()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  worker public.worker_profiles;
  account public.accounts;
  skill_count INTEGER;
  rate_ready BOOLEAN;
BEGIN
  SELECT * INTO account FROM public.accounts WHERE id = AUTH.UID();
  IF account.id IS NULL OR account.role <> 'WORKER' OR account.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WORKER_ROLE_REQUIRED';
  END IF;

  SELECT * INTO worker FROM public.worker_profiles WHERE account_id = AUTH.UID();
  IF worker.account_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'WORKER_PROFILE_NOT_FOUND';
  END IF;

  SELECT COUNT(*)
  INTO skill_count
  FROM public.worker_skills skill
  JOIN public.service_categories category ON category.id = skill.category_id
  WHERE skill.worker_id = worker.account_id
    AND category.is_active;

  rate_ready := private.worker_has_service_rate(worker.account_id);

  RETURN JSONB_BUILD_OBJECT(
    'accountEligible', account.status = 'ACTIVE',
    'verificationStatus', worker.approval_status,
    'skillsReady', skill_count > 0,
    'rateReady', rate_ready,
    'serviceAreaReady', worker.service_origin IS NOT NULL AND worker.service_radius_meters IS NOT NULL,
    'online', worker.is_available,
    'setupComplete',
      account.status = 'ACTIVE'
      AND worker.approval_status = 'APPROVED'
      AND skill_count > 0
      AND rate_ready
      AND worker.service_origin IS NOT NULL
      AND worker.service_radius_meters IS NOT NULL,
    'matchable',
      account.status = 'ACTIVE'
      AND worker.approval_status = 'APPROVED'
      AND skill_count > 0
      AND rate_ready
      AND worker.service_origin IS NOT NULL
      AND worker.service_radius_meters IS NOT NULL
      AND worker.is_available,
    'latitude', CASE WHEN worker.service_origin IS NOT NULL THEN EXTENSIONS.ST_Y(worker.service_origin::EXTENSIONS.GEOMETRY) ELSE NULL END,
    'longitude', CASE WHEN worker.service_origin IS NOT NULL THEN EXTENSIONS.ST_X(worker.service_origin::EXTENSIONS.GEOMETRY) ELSE NULL END,
    'serviceArea', worker.service_area,
    'radiusMeters', worker.service_radius_meters,
    'serviceRadiusMeters', worker.service_radius_meters
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_worker_matching_readiness()
FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_worker_matching_readiness() TO authenticated;

-- =====================================================================
-- 6. public.save_my_worker_matching_setup
--    - p_schedule is now optional (0-7 entries); empty clears availability
--    - signature unchanged
-- =====================================================================
CREATE OR REPLACE FUNCTION public.save_my_worker_matching_setup(
  p_latitude numeric,
  p_longitude numeric,
  p_radius_meters integer,
  p_service_area text,
  p_schedule jsonb default '[]',
  p_online boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  worker public.worker_profiles;
  schedule_count integer;
begin
  if not exists (
    select 1
    from public.accounts account
    where account.id = auth.uid()
      and account.role = 'WORKER'
      and account.status = 'ACTIVE'
      and account.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'WORKER_ROLE_REQUIRED';
  end if;

  if p_latitude not between -90 and 90
    or p_longitude not between -180 and 180
    or p_radius_meters not between 100 and 200000
    or length(btrim(coalesce(p_service_area, ''))) not between 2 and 200
    or jsonb_typeof(p_schedule) is distinct from 'array'
    or jsonb_array_length(p_schedule) not between 0 and 7
  then
    raise exception using
      errcode = '22023',
      message = 'INVALID_WORKER_MATCHING_SETUP';
  end if;

  if jsonb_array_length(p_schedule) > 0 then
    if exists (
      select 1
      from jsonb_array_elements(p_schedule) entry
      where jsonb_typeof(entry) is distinct from 'object'
        or coalesce(entry->>'dayOfWeek', '') !~ '^[0-6]$'
        or coalesce(entry->>'startTime', '') !~
          '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        or coalesce(entry->>'endTime', '') !~
          '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        or (entry->>'startTime')::time >= (entry->>'endTime')::time
    ) then
      raise exception using errcode = '22023', message = 'INVALID_WORKER_SCHEDULE';
    end if;

    select count(distinct (entry->>'dayOfWeek')::integer)
    into schedule_count
    from jsonb_array_elements(p_schedule) entry;

    if schedule_count <> jsonb_array_length(p_schedule) then
      raise exception using
        errcode = '22023',
        message = 'DUPLICATE_WORKER_SCHEDULE_DAY';
    end if;
  end if;

  select *
  into worker
  from public.worker_profiles
  where account_id = auth.uid()
  for update;

  if worker.account_id is null then
    raise exception using errcode = 'P0002', message = 'WORKER_PROFILE_NOT_FOUND';
  end if;

  if p_online
    and (
      worker.approval_status <> 'APPROVED'
      or not exists (
        select 1
        from public.worker_skills skill
        join public.service_categories category
          on category.id = skill.category_id
        where skill.worker_id = worker.account_id
          and category.is_active
      )
      or not private.worker_has_service_rate(worker.account_id)
    )
  then
    raise exception using errcode = '55000', message = 'WORKER_NOT_READY';
  end if;

  delete from public.worker_availability
  where worker_id = worker.account_id;

  if jsonb_array_length(p_schedule) > 0 then
    insert into public.worker_availability(
      worker_id,
      day_of_week,
      start_time,
      end_time,
      timezone
    )
    select
      worker.account_id,
      (entry->>'dayOfWeek')::smallint,
      (entry->>'startTime')::time,
      (entry->>'endTime')::time,
      'Asia/Manila'
    from jsonb_array_elements(p_schedule) entry;
  end if;

  update public.worker_profiles
  set service_origin = private.make_location(p_latitude, p_longitude),
      service_radius_meters = p_radius_meters,
      service_area = btrim(p_service_area),
      is_available = p_online,
      updated_at = now()
  where account_id = worker.account_id;

  return public.get_my_worker_matching_readiness();
end
$$;

REVOKE ALL ON FUNCTION public.save_my_worker_matching_setup(
  numeric, numeric, integer, text, jsonb, boolean
) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.save_my_worker_matching_setup(
  numeric, numeric, integer, text, jsonb, boolean
) TO authenticated;

-- =====================================================================
-- 7. public.admin_set_worker_availability
--    - availability rows no longer required to bring a worker online
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_set_worker_availability(
  p_worker_id uuid,
  p_available boolean
)
returns public.worker_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.worker_profiles;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  if p_available
    and not exists (
      select 1
      from public.worker_profiles worker
      join public.accounts account on account.id = worker.account_id
      where worker.account_id = p_worker_id
        and account.role = 'WORKER'
        and account.status = 'ACTIVE'
        and account.deleted_at is null
        and worker.approval_status = 'APPROVED'
        and worker.service_origin is not null
        and worker.service_radius_meters is not null
        and private.worker_has_service_rate(worker.account_id)
    )
  then
    raise exception using errcode = '55000', message = 'WORKER_NOT_READY';
  end if;

  update public.worker_profiles
  set is_available = p_available,
      updated_at = now()
  where account_id = p_worker_id
  returning * into result;

  if result.account_id is null then
    raise exception using errcode = 'P0002', message = 'WORKER_NOT_FOUND';
  end if;

  return result;
end
$$;

REVOKE ALL ON FUNCTION public.admin_set_worker_availability(uuid, boolean)
FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_worker_availability(uuid, boolean) TO authenticated;

-- =====================================================================
-- 8. public.get_match_diagnostics
--    - schedule step / OUTSIDE_WORKING_HOURS removed
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_match_diagnostics(p_service_request_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  request public.service_requests;
  category_name text;
  active_workers bigint;
  skilled_workers bigint;
  approved_workers bigint;
  configured_workers bigint;
  nearby_workers bigint;
  online_workers bigint;
  reason_code text;
begin
  select * into request
  from public.service_requests
  where id = p_service_request_id;

  if request.id is null or request.user_account_id is distinct from auth.uid() then
    raise exception using errcode = '42501', message = 'SERVICE_REQUEST_UNAVAILABLE';
  end if;

  select name into category_name
  from public.service_categories
  where id = request.category_id;

  select
    count(*) filter (where eligibility.account_eligible),
    count(*) filter (where eligibility.account_eligible and eligibility.skill_match),
    count(*) filter (where eligibility.account_eligible and eligibility.skill_match and eligibility.approved),
    count(*) filter (where eligibility.account_eligible and eligibility.skill_match and eligibility.approved and eligibility.service_area_ready),
    count(*) filter (where eligibility.account_eligible and eligibility.skill_match and eligibility.approved and eligibility.service_area_ready and eligibility.within_radius),
    count(*) filter (where eligibility.eligible)
  into active_workers, skilled_workers, approved_workers, configured_workers,
    nearby_workers, online_workers
  from private.worker_match_eligibility(request.id) eligibility;

  reason_code := case
    when active_workers = 0 then 'NO_ACTIVE_WORKERS'
    when skilled_workers = 0 then 'NO_CATEGORY_WORKERS'
    when approved_workers = 0 then 'NO_APPROVED_WORKERS'
    when configured_workers = 0 then 'WORKERS_MISSING_SERVICE_AREA'
    when nearby_workers = 0 then 'OUTSIDE_SERVICE_RADIUS'
    when online_workers = 0 then 'WORKERS_OFFLINE'
    else 'NO_MATCHES'
  end;

  return jsonb_build_object(
    'serviceRequestId', request.id,
    'category', category_name,
    'reasonCode', reason_code,
    'counts', jsonb_build_object(
      'active', active_workers,
      'skilled', skilled_workers,
      'approved', approved_workers,
      'configured', configured_workers,
      'nearby', nearby_workers,
      'online', online_workers
    )
  );
end
$$;

REVOKE ALL ON FUNCTION public.get_match_diagnostics(uuid)
FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_match_diagnostics(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
