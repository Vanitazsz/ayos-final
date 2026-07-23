begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select has_column(
  'public',
  'live_dispatch_sessions',
  'search_radius_meters',
  'live dispatch sessions persist the customer-selected search radius'
);

select has_function(
  'public',
  'start_live_dispatch',
  array['uuid', 'integer'],
  'live dispatch start RPC accepts a search radius'
);

select ok(
  position(
    '75 seconds' in pg_get_functiondef(
      'private.refresh_live_dispatch(uuid)'::regprocedure
    )
  ) > 0,
  'live dispatch preserves the worker-presence grace window'
);

select * from finish();
rollback;
