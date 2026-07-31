-- ROLLBACK SCRIPT: Revert 20260731020000_worker_arrival_proximity.sql
-- Run this script if you need to remove the validate_and_confirm_worker_arrival function.

BEGIN;

DROP FUNCTION IF EXISTS public.validate_and_confirm_worker_arrival(UUID, FLOAT8, FLOAT8);

COMMIT;
