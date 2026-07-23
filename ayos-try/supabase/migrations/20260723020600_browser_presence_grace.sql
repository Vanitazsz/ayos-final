-- Foreground web tabs can briefly pause timers while users switch windows.
-- Keep a worker eligible long enough for the client to resume and heartbeat.

do $$
declare
  definition text;
begin
  definition := pg_get_functiondef(
    'private.refresh_live_dispatch(uuid)'::regprocedure
  );
  definition := replace(
    definition,
    'p.last_seen_at > (now() - ''00:00:30''::interval)',
    'p.last_seen_at > (now() - ''00:01:15''::interval)'
  );
  definition := replace(
    definition,
    'p.last_seen_at>now()-interval ''30 seconds''',
    'p.last_seen_at>now()-interval ''75 seconds'''
  );
  execute definition;

  definition := pg_get_functiondef(
    'private.live_dispatch_diagnostics(uuid,smallint)'::regprocedure
  );
  definition := replace(
    definition,
    'presence.last_seen_at > (now() - ''00:00:30''::interval)',
    'presence.last_seen_at > (now() - ''00:01:15''::interval)'
  );
  definition := replace(
    definition,
    'presence.last_seen_at>now()-interval ''30 seconds''',
    'presence.last_seen_at>now()-interval ''75 seconds'''
  );
  execute definition;
end
$$;
select pg_notify('pgrst','reload schema');
