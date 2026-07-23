begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select has_table(
  'public',
  'service_request_dispatches',
  'live dispatch table exists'
);

select ok(
  exists (
    select 1
    from pg_index index_definition
    join pg_class table_definition
      on table_definition.oid = index_definition.indrelid
    join pg_namespace table_schema
      on table_schema.oid = table_definition.relnamespace
    where table_schema.nspname = 'public'
      and table_definition.relname = 'service_request_dispatches'
      and index_definition.indisunique
      and (
        select array_agg(attribute.attname order by key_position.ordinality)
        from unnest(index_definition.indkey) with ordinality key_position(attnum, ordinality)
        join pg_attribute attribute
          on attribute.attrelid = table_definition.oid
         and attribute.attnum = key_position.attnum
      ) = array['service_request_id','worker_id']
  ),
  'dispatch offers are unique per request and worker'
);

select has_function(
  'private',
  'refresh_live_dispatch',
  array['uuid'],
  'live dispatch refresh function exists'
);

select * from finish();
rollback;
