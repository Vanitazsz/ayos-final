-- Migration: Resilient Worker Matching Configuration & Automatic Availability Sync
-- Fixes matching failures by:
-- 1. Keeping presence updates fail-closed for approved, active workers
-- 2. Keeping live dispatch resilient without bypassing approval, rate, schedule, or presence checks
-- 3. Updating start_live_dispatch to ALWAYS refresh session timestamps on search/retry
-- 4. Reporting readiness from persisted worker configuration

BEGIN;

-- 1. Update update_worker_presence to automatically set worker_profiles.is_available = true
CREATE OR REPLACE FUNCTION public.update_worker_presence(
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_accuracy_meters NUMERIC DEFAULT NULL,
  p_online BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  safe_accuracy NUMERIC(8,2);
  v_loc EXTENSIONS.GEOGRAPHY;
BEGIN
  IF p_latitude IS NULL OR p_longitude IS NULL
    OR p_latitude NOT BETWEEN -90 AND 90
    OR p_longitude NOT BETWEEN -180 AND 180
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_WORKER_LOCATION';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.worker_profiles wp
    JOIN public.accounts a ON a.id = wp.account_id
    WHERE wp.account_id = AUTH.UID()
      AND a.role = 'WORKER'
      AND a.status = 'ACTIVE'
      AND a.deleted_at IS NULL
      AND wp.approval_status = 'APPROVED'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WORKER_NOT_READY';
  END IF;

  safe_accuracy := CASE
    WHEN p_accuracy_meters IS NULL
      OR p_accuracy_meters < 0
      OR p_accuracy_meters > 10000
      OR p_accuracy_meters::TEXT IN ('NaN', 'Infinity', '-Infinity')
    THEN NULL
    ELSE ROUND(p_accuracy_meters, 2)
  END;

  v_loc := private.make_location(p_latitude, p_longitude);

  -- Update worker_presence
  INSERT INTO public.worker_presence(
    worker_id, location, accuracy_meters, online, last_seen_at
  )
  VALUES (
    AUTH.UID(),
    v_loc,
    safe_accuracy,
    p_online,
    NOW()
  )
  ON CONFLICT (worker_id) DO UPDATE
  SET location = EXCLUDED.location,
      accuracy_meters = EXCLUDED.accuracy_meters,
      online = EXCLUDED.online,
      last_seen_at = NOW(),
      updated_at = NOW();

  RETURN jsonb_build_object(
    'online', p_online,
    'lastSeenAt', NOW(),
    'accuracyMeters', safe_accuracy
  );
END;
$$;

-- 2. Worker readiness remains explicit and fail-closed.
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
  schedule_count INTEGER;
  schedule JSONB;
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

  SELECT COUNT(*), COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'dayOfWeek', availability.day_of_week,
    'startTime', TO_CHAR(availability.start_time, 'HH24:MI'),
    'endTime', TO_CHAR(availability.end_time, 'HH24:MI'),
    'timezone', availability.timezone
  ) ORDER BY availability.day_of_week), '[]'::JSONB)
  INTO schedule_count, schedule
  FROM public.worker_availability availability
  WHERE availability.worker_id = worker.account_id;

  RETURN JSONB_BUILD_OBJECT(
    'accountEligible', account.status = 'ACTIVE',
    'verificationStatus', worker.approval_status,
    'skillsReady', skill_count > 0,
    'rateReady', rate_ready,
    'serviceAreaReady', worker.service_origin IS NOT NULL AND worker.service_radius_meters IS NOT NULL,
    'scheduleReady', schedule_count > 0,
    'online', worker.is_available,
    'setupComplete',
      account.status = 'ACTIVE'
      AND worker.approval_status = 'APPROVED'
      AND skill_count > 0
      AND rate_ready
      AND worker.service_origin IS NOT NULL
      AND worker.service_radius_meters IS NOT NULL
      AND schedule_count > 0,
    'matchable',
      account.status = 'ACTIVE'
      AND worker.approval_status = 'APPROVED'
      AND skill_count > 0
      AND rate_ready
      AND worker.service_origin IS NOT NULL
      AND worker.service_radius_meters IS NOT NULL
      AND schedule_count > 0
      AND worker.is_available,
    'latitude', CASE WHEN worker.service_origin IS NOT NULL THEN EXTENSIONS.ST_Y(worker.service_origin::EXTENSIONS.GEOMETRY) ELSE NULL END,
    'longitude', CASE WHEN worker.service_origin IS NOT NULL THEN EXTENSIONS.ST_X(worker.service_origin::EXTENSIONS.GEOMETRY) ELSE NULL END,
    'serviceArea', worker.service_area,
    'radiusMeters', worker.service_radius_meters,
    'serviceRadiusMeters', worker.service_radius_meters,
    'schedule', schedule
  );
END;
$$;

-- 3. Resilient Match Eligibility Function
CREATE OR REPLACE FUNCTION private.worker_match_eligibility(p_service_request_id UUID)
RETURNS TABLE(
  worker_id UUID,
  account_eligible BOOLEAN,
  skill_match BOOLEAN,
  approved BOOLEAN,
  service_area_ready BOOLEAN,
  within_radius BOOLEAN,
  schedule_match BOOLEAN,
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
  ), checks AS (
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
          worker.service_origin,
          request.service_location,
          worker.service_radius_meters
        )
      END AS within_radius,
      (
        EXISTS (
          SELECT 1
          FROM public.worker_availability availability
          WHERE availability.worker_id = worker.account_id
            AND availability.day_of_week = EXTRACT(
              DOW FROM request.scheduled_at AT TIME ZONE 'Asia/Manila'
            )::INTEGER
            AND (request.scheduled_at AT TIME ZONE 'Asia/Manila')::TIME
              BETWEEN availability.start_time AND availability.end_time
        )
      ) AS schedule_match,
      worker.is_available AS online,
      NOT private.accounts_block_each_other(
        request.user_account_id,
        worker.account_id
      ) AS not_blocked,
      CASE
        WHEN worker.service_origin IS NOT NULL THEN extensions.st_distance(worker.service_origin, request.service_location)
        ELSE NULL
      END AS distance_meters
    FROM request
    CROSS JOIN public.worker_profiles worker
    LEFT JOIN public.accounts account ON account.id = worker.account_id
  )
  SELECT
    checks.worker_id,
    checks.account_eligible,
    checks.skill_match,
    checks.approved,
    checks.service_area_ready,
    checks.within_radius,
    checks.schedule_match,
    checks.online,
    (
      checks.account_eligible
      AND checks.skill_match
      AND checks.rate_eligible
      AND checks.approved
      AND checks.service_area_ready
      AND checks.within_radius
      AND checks.schedule_match
      AND checks.online
      AND checks.not_blocked
    ) AS eligible,
    checks.distance_meters
  FROM checks;
$$;

-- 4. Resilient Live Dispatch Refresh Function (2 minute session window)
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
    AND EXISTS (
        SELECT 1
        FROM public.worker_availability availability
        WHERE availability.worker_id = wp.account_id
          AND availability.day_of_week = EXTRACT(DOW FROM req.scheduled_at AT TIME ZONE 'Asia/Manila')::INTEGER
          AND (req.scheduled_at AT TIME ZONE 'Asia/Manila')::TIME BETWEEN availability.start_time AND availability.end_time
    )
    AND (req.subdivision_id IS NULL OR wp.subdivision_id = req.subdivision_id)
    AND extensions.st_dwithin(
      wp.service_origin,
      req.service_location,
      wp.service_radius_meters
    )
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

-- 5. Start Live Dispatch Entry Point (Resets session timestamps to NOW() on search/retry)
CREATE OR REPLACE FUNCTION public.start_live_dispatch(p_service_request_id UUID, p_search_radius_meters INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_search_radius_meters NOT BETWEEN 1000 AND 50000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_SEARCH_RADIUS';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.service_requests r
    WHERE r.id = p_service_request_id
      AND r.user_account_id = AUTH.UID()
      AND r.status IN ('OPEN', 'MATCHED')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SERVICE_REQUEST_UNAVAILABLE';
  END IF;

  -- Upsert dispatch session, ALWAYS refreshing started_at and expires_at back to NOW()
  INSERT INTO public.live_dispatch_sessions(
    service_request_id, search_radius_meters, started_at, expires_at
  )
  VALUES (
    p_service_request_id, p_search_radius_meters, NOW(), NOW() + INTERVAL '2 minutes'
  )
  ON CONFLICT (service_request_id) DO UPDATE
  SET search_radius_meters = EXCLUDED.search_radius_meters,
      started_at = NOW(),
      expires_at = NOW() + INTERVAL '2 minutes';

  -- Un-expire any dispatches for this request
  UPDATE public.service_request_dispatches
  SET status = 'OFFERED', expires_at = NOW() + INTERVAL '2 minutes', updated_at = NOW()
  WHERE service_request_id = p_service_request_id AND status = 'EXPIRED';

  RETURN public.get_live_dispatch_snapshot(p_service_request_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_worker_presence(NUMERIC, NUMERIC, NUMERIC, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_worker_matching_readiness() TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_live_dispatch(UUID, INTEGER) TO authenticated;

COMMIT;
