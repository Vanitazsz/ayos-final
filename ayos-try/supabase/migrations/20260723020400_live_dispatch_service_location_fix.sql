-- service_requests stores its geography in service_location, not location.
-- Correct both functions introduced by the previous live-dispatch migration.

do $$
declare
  definition text;
begin
  definition := pg_get_functiondef(
    'private.refresh_live_dispatch(uuid)'::regprocedure
  );
  definition := replace(definition, 'req.location', 'req.service_location');
  execute definition;

  definition := pg_get_functiondef(
    'private.live_dispatch_diagnostics(uuid,smallint)'::regprocedure
  );
  definition := replace(
    definition,
    'request.location',
    'request.service_location'
  );
  execute definition;
end
$$;

select pg_notify('pgrst','reload schema');
