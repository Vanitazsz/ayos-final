BEGIN;

CREATE OR REPLACE FUNCTION public.generate_matches_weighted_core(p_service_request_id uuid)
RETURNS SETOF public.match_candidates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  request public.service_requests;
  weights jsonb;
  matched_count integer;
BEGIN
  SELECT *
  INTO request
  FROM public.service_requests
  WHERE id = p_service_request_id
  FOR UPDATE;

  IF request.user_account_id IS DISTINCT FROM auth.uid()
    OR request.status NOT IN ('OPEN', 'MATCHED')
  THEN
    RAISE EXCEPTION USING errcode = '42501', message = 'Service request unavailable';
  END IF;

  SELECT value
  INTO weights
  FROM public.system_settings
  WHERE key = 'matching.weights';

  weights := coalesce(
    weights,
    '{"distance":0.30,"rating":0.20,"completed_jobs":0.10,"response_history":0.10,"cancellation_history":0.05,"priority":0.05}'::jsonb
  );

  DELETE FROM public.match_candidates
  WHERE service_request_id = request.id;

  INSERT INTO public.match_candidates(
    service_request_id,
    worker_id,
    score,
    rank,
    factors,
    eligible
  )
  WITH candidates AS (
    SELECT
      wp.account_id worker_id,
      ws.years,
      wp.recommendation_priority,
      extensions.st_distance(wp.service_origin, request.service_location) distance_meters,
      coalesce(avg(rv.stars) FILTER (WHERE rv.moderation_status = 'PUBLISHED'), 0) rating,
      count(DISTINCT b.id) FILTER (WHERE b.status = 'COMPLETED') completed_jobs,
      coalesce(
        count(DISTINCT b.id) FILTER (WHERE b.accepted_at IS NOT NULL)::numeric
          / nullif(count(DISTINCT b.id), 0),
        1
      ) response_rate,
      coalesce(
        count(DISTINCT b.id) FILTER (WHERE b.status = 'CANCELLED')::numeric
          / nullif(count(DISTINCT b.id), 0),
        0
      ) cancellation_rate
    FROM public.worker_profiles wp
    JOIN public.worker_skills ws
      ON ws.worker_id = wp.account_id
     AND ws.category_id = request.category_id
    LEFT JOIN public.reviews rv ON rv.worker_account_id = wp.account_id
    LEFT JOIN public.bookings b ON b.worker_account_id = wp.account_id
    WHERE wp.account_id <> request.user_account_id
      AND wp.approval_status = 'APPROVED'
      AND wp.is_available
      AND wp.service_origin IS NOT NULL
      AND wp.service_radius_meters IS NOT NULL
      AND extensions.st_dwithin(
        wp.service_origin,
        request.service_location,
        wp.service_radius_meters
      )
    GROUP BY wp.account_id, ws.years, wp.recommendation_priority, wp.service_origin
  ), scored AS (
    SELECT
      *,
      round((
        greatest(0, 100 - (distance_meters / 1000) * 5)
          * (weights->>'distance')::numeric
        + (rating / 5 * 100) * (weights->>'rating')::numeric
        + least(completed_jobs, 100) * (weights->>'completed_jobs')::numeric
        + response_rate * 100 * (weights->>'response_history')::numeric
        + (1 - cancellation_rate) * 100 * (weights->>'cancellation_history')::numeric
        + (CASE WHEN recommendation_priority THEN 100 ELSE 0 END)
          * (weights->>'priority')::numeric
      )::numeric, 4) total_score
    FROM candidates
  ), ranked AS (
    SELECT
      *,
      row_number() OVER (ORDER BY total_score DESC, worker_id)::integer rank
    FROM scored
  )
  SELECT
    request.id,
    worker_id,
    total_score,
    rank,
    jsonb_build_object(
      'category', true,
      'available', true,
      'years', years,
      'rating', rating,
      'completed_jobs', completed_jobs,
      'response_rate', response_rate,
      'cancellation_rate', cancellation_rate,
      'distance_meters', round(distance_meters::numeric, 2),
      'recommendation_priority', recommendation_priority,
      'weights', weights
    ),
    true
  FROM ranked
  WHERE rank <= 5;

  GET DIAGNOSTICS matched_count = ROW_COUNT;

  IF matched_count > 0 THEN
    UPDATE public.service_requests
    SET status = 'MATCHED'
    WHERE id = request.id;
  ELSE
    PERFORM pgmq.send(
      'no_match_notifications',
      jsonb_build_object(
        'service_request_id', request.id,
        'user_account_id', request.user_account_id
      ),
      300
    );
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.match_candidates
  WHERE service_request_id = request.id
  ORDER BY rank;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_activate_verified_worker(p_worker_id uuid)
RETURNS public.worker_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  result public.worker_profiles;
  plumbing_id uuid;
BEGIN
  IF NOT public.is_admin(true) THEN
    RAISE EXCEPTION USING errcode = '42501', message = 'AAL2 administrator required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.accounts
    WHERE id = p_worker_id
      AND role = 'WORKER'
      AND status <> 'SUSPENDED'
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING errcode = 'P0002', message = 'Worker account not found';
  END IF;

  UPDATE public.accounts
  SET status = 'ACTIVE', updated_at = now()
  WHERE id = p_worker_id;

  SELECT id
  INTO plumbing_id
  FROM public.service_categories
  WHERE lower(name) = 'plumbing'
    AND is_active
  LIMIT 1;

  IF plumbing_id IS NOT NULL THEN
    INSERT INTO public.worker_skills(worker_id, category_id)
    VALUES (p_worker_id, plumbing_id)
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public.worker_profiles
  SET approval_status = 'APPROVED',
      approved_at = coalesce(approved_at, now()),
      is_available = true,
      service_radius_meters = coalesce(service_radius_meters, 50000),
      updated_at = now()
  WHERE account_id = p_worker_id
  RETURNING * INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_activate_verified_worker(uuid)
FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_activate_verified_worker(uuid)
TO authenticated;

DROP FUNCTION IF EXISTS public.save_my_worker_matching_setup(
  numeric,
  numeric,
  integer,
  text,
  jsonb,
  boolean
);

CREATE FUNCTION public.save_my_worker_matching_setup(
  p_latitude numeric,
  p_longitude numeric,
  p_radius_meters integer,
  p_service_area text,
  p_online boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  worker public.worker_profiles;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.accounts account
    WHERE account.id = auth.uid()
      AND account.role = 'WORKER'
      AND account.status = 'ACTIVE'
      AND account.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING errcode = '42501', message = 'WORKER_ROLE_REQUIRED';
  END IF;

  IF p_latitude NOT BETWEEN -90 AND 90
    OR p_longitude NOT BETWEEN -180 AND 180
    OR p_radius_meters NOT BETWEEN 100 AND 200000
    OR length(btrim(coalesce(p_service_area, ''))) NOT BETWEEN 2 AND 200
  THEN
    RAISE EXCEPTION USING
      errcode = '22023',
      message = 'INVALID_WORKER_MATCHING_SETUP';
  END IF;

  SELECT *
  INTO worker
  FROM public.worker_profiles
  WHERE account_id = auth.uid()
  FOR UPDATE;

  IF worker.account_id IS NULL THEN
    RAISE EXCEPTION USING errcode = 'P0002', message = 'WORKER_PROFILE_NOT_FOUND';
  END IF;

  IF p_online
    AND (
      worker.approval_status <> 'APPROVED'
      OR NOT EXISTS (
        SELECT 1
        FROM public.worker_skills skill
        JOIN public.service_categories category
          ON category.id = skill.category_id
        WHERE skill.worker_id = worker.account_id
          AND category.is_active
      )
      OR NOT private.worker_has_service_rate(worker.account_id)
    )
  THEN
    RAISE EXCEPTION USING errcode = '55000', message = 'WORKER_NOT_READY';
  END IF;

  UPDATE public.worker_profiles
  SET service_origin = private.make_location(p_latitude, p_longitude),
      service_radius_meters = p_radius_meters,
      service_area = btrim(p_service_area),
      is_available = p_online,
      updated_at = now()
  WHERE account_id = worker.account_id;

  RETURN public.get_my_worker_matching_readiness();
END;
$$;

REVOKE ALL ON FUNCTION public.save_my_worker_matching_setup(
  numeric,
  numeric,
  integer,
  text,
  boolean
)
FROM public, anon;
GRANT EXECUTE ON FUNCTION public.save_my_worker_matching_setup(
  numeric,
  numeric,
  integer,
  text,
  boolean
)
TO authenticated;

DROP TABLE public.worker_availability;

SELECT pg_notify('pgrst', 'reload schema');
COMMIT;
