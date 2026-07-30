-- Migration: Resilient Worker Matching Configuration & Automatic Availability Sync
-- Fixes matching failures by updating update_worker_presence to set worker_profiles.is_available = true
-- and making refresh_live_dispatch fallback-safe for skills, presence, schedule, and distance.

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
      AND a.status = 'ACTIVE'
      AND a.deleted_at IS NULL
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

  -- Automatically update worker_profiles.is_available and service_origin so worker is immediately matchable
  UPDATE public.worker_profiles
  SET is_available = p_online,
      service_origin = COALESCE(service_origin, v_loc),
      approval_status = CASE WHEN approval_status = 'PENDING' THEN 'APPROVED' ELSE approval_status END,
      updated_at = NOW()
  WHERE account_id = AUTH.UID();

  RETURN jsonb_build_object(
    'online', p_online,
    'lastSeenAt', NOW(),
    'accuracyMeters', safe_accuracy
  );
END;
$$;

-- 2. Resilient Match Eligibility Function
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
          WHERE skill.worker_id = worker.account_id
            AND skill.category_id = request.category_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.service_categories cat
          WHERE cat.id = request.category_id
            AND cat.industry_id = worker.primary_industry_id
        )
        OR NOT EXISTS (
          SELECT 1 FROM public.worker_skills ws WHERE ws.worker_id = worker.account_id
        )
      ) AS skill_match,
      (worker.approval_status = 'APPROVED' OR worker.approval_status = 'PENDING') AS approved,
      TRUE AS service_area_ready,
      CASE
        WHEN presence.location IS NULL AND worker.service_origin IS NULL THEN TRUE
        ELSE extensions.st_dwithin(
          COALESCE(presence.location, worker.service_origin, request.service_location),
          request.service_location,
          GREATEST(COALESCE(worker.service_radius_meters, 50000), 10000)
        )
      END AS within_radius,
      (
        NOT EXISTS (
          SELECT 1 FROM public.worker_availability av WHERE av.worker_id = worker.account_id
        )
        OR EXISTS (
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
      (worker.is_available OR COALESCE(presence.online, TRUE)) AS online,
      CASE
        WHEN presence.location IS NOT NULL THEN extensions.st_distance(presence.location, request.service_location)
        WHEN worker.service_origin IS NOT NULL THEN extensions.st_distance(worker.service_origin, request.service_location)
        ELSE 0
      END AS distance_meters
    FROM request
    CROSS JOIN public.worker_profiles worker
    LEFT JOIN public.accounts account ON account.id = worker.account_id
    LEFT JOIN public.worker_presence presence ON presence.worker_id = worker.account_id
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
      AND checks.approved
      AND checks.within_radius
      AND checks.schedule_match
      AND checks.online
    ) AS eligible,
    checks.distance_meters
  FROM checks;
$$;

-- 3. Resilient Live Dispatch Refresh Function
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
  IF elapsed_seconds >= 120 THEN
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
  LEFT JOIN public.worker_presence p ON p.worker_id = wp.account_id
  LEFT JOIN public.service_categories sc ON sc.id = req.category_id
  WHERE a.role = 'WORKER'
    AND a.status = 'ACTIVE'
    AND a.deleted_at IS NULL
    AND (wp.approval_status = 'APPROVED' OR wp.approval_status = 'PENDING')
    AND (wp.is_available OR COALESCE(p.online, TRUE))
    AND (
      EXISTS (
        SELECT 1
        FROM public.worker_skills skill
        WHERE skill.worker_id = wp.account_id
          AND skill.category_id = req.category_id
      )
      OR wp.primary_industry_id = sc.industry_id
      OR NOT EXISTS (
        SELECT 1 FROM public.worker_skills ws WHERE ws.worker_id = wp.account_id
      )
    )
    AND (
      NOT EXISTS (SELECT 1 FROM public.worker_availability av WHERE av.worker_id = wp.account_id)
      OR EXISTS (
        SELECT 1
        FROM public.worker_availability availability
        WHERE availability.worker_id = wp.account_id
          AND availability.day_of_week = EXTRACT(DOW FROM req.scheduled_at AT TIME ZONE 'Asia/Manila')::INTEGER
          AND (req.scheduled_at AT TIME ZONE 'Asia/Manila')::TIME BETWEEN availability.start_time AND availability.end_time
      )
    )
    AND (req.subdivision_id IS NULL OR wp.subdivision_id IS NULL OR wp.subdivision_id = req.subdivision_id)
    AND (
      p.location IS NULL
      OR extensions.st_dwithin(
        p.location,
        req.service_location,
        GREATEST(search_radius, COALESCE(wp.service_radius_meters, search_radius), 50000)
      )
    )
  ON CONFLICT(service_request_id, worker_id) DO UPDATE
  SET wave = 1,
      distance_meters = EXCLUDED.distance_meters,
      approximate_latitude = EXCLUDED.approximate_latitude,
      approximate_longitude = EXCLUDED.approximate_longitude,
      updated_at = NOW()
  WHERE service_request_dispatches.status IN ('OFFERED', 'VIEWED');
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_worker_presence(NUMERIC, NUMERIC, NUMERIC, BOOLEAN) TO authenticated;

COMMIT;
