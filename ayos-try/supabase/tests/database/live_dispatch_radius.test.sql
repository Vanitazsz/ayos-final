begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

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

select * from finish();
rollback;
