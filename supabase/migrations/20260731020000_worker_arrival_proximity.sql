-- Migration: Add validate_and_confirm_worker_arrival RPC function
-- Ensures worker is within 50 meters of booking destination before transitioning to WORKER_ARRIVED

CREATE OR REPLACE FUNCTION public.validate_and_confirm_worker_arrival(
  p_booking_id UUID,
  p_worker_lat FLOAT8,
  p_worker_lng FLOAT8
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_booking RECORD;
  v_destination_lat FLOAT8;
  v_destination_lng FLOAT8;
  v_distance_meters FLOAT8;
  v_max_radius_meters CONSTANT FLOAT8 := 50.0;
  v_auth_uid UUID := auth.uid();
BEGIN
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT b.id, b.worker_id, b.status, b.service_request_id, sr.location
  INTO v_booking
  FROM public.bookings b
  JOIN public.service_requests sr ON sr.id = b.service_request_id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.worker_id <> v_auth_uid THEN
    RAISE EXCEPTION 'Only the assigned worker can confirm arrival' USING ERRCODE = '42501';
  END IF;

  IF v_booking.status <> 'WORKER_EN_ROUTE' AND v_booking.status <> 'WORKER_PREPARING' AND v_booking.status <> 'ACCEPTED' THEN
    RAISE EXCEPTION 'Booking status % is not eligible for arrival confirmation', v_booking.status USING ERRCODE = '22000';
  END IF;

  IF v_booking.location IS NULL THEN
    -- Fallback if location not set: allow arrival
    UPDATE public.bookings
    SET status = 'WORKER_ARRIVED',
        updated_at = NOW()
    WHERE id = p_booking_id;

    RETURN jsonb_build_object(
      'success', true,
      'within_proximity', true,
      'distance_meters', 0,
      'status', 'WORKER_ARRIVED'
    );
  END IF;

  v_destination_lng := ST_X(v_booking.location::geometry);
  v_destination_lat := ST_Y(v_booking.location::geometry);

  v_distance_meters := ST_Distance(
    v_booking.location,
    ST_SetSRID(ST_MakePoint(p_worker_lng, p_worker_lat), 4326)::geography
  );

  IF v_distance_meters <= v_max_radius_meters THEN
    UPDATE public.bookings
    SET status = 'WORKER_ARRIVED',
        updated_at = NOW()
    WHERE id = p_booking_id;

    RETURN jsonb_build_object(
      'success', true,
      'within_proximity', true,
      'distance_meters', ROUND(v_distance_meters::numeric, 1),
      'status', 'WORKER_ARRIVED'
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'within_proximity', false,
      'distance_meters', ROUND(v_distance_meters::numeric, 1),
      'max_radius_meters', v_max_radius_meters,
      'status', v_booking.status,
      'message', FORMAT('You are %s meters away. Please get within 50 meters of the destination.', ROUND(v_distance_meters::numeric, 0))
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_and_confirm_worker_arrival(UUID, FLOAT8, FLOAT8) TO authenticated;
