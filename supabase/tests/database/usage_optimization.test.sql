begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

select has_function(
  'public',
  'record_auth_session_event',
  array['uuid','text','inet','text'],
  'session logging uses an atomic idempotent RPC'
);
select has_function(
  'public',
  'admin_database_health_snapshot',
  array[]::text[],
  'administrators can read a bounded database health snapshot'
);
select has_function(
  'public',
  'admin_preview_temporary_cleanup',
  array['timestamptz'],
  'temporary cleanup is preview-only'
);
select has_index(
  'public',
  'worker_presence',
  'worker_presence_live_idx',
  'latest worker presence has a live lookup index'
);
select has_index(
  'public',
  'worker_presence',
  'worker_presence_location_gix',
  'latest worker presence has a PostGIS index'
);
select has_index(
  'public',
  'location_updates',
  'location_updates_booking_time_idx',
  'booking tracking snapshots have a booking/time index'
);
select has_index(
  'public',
  'booking_status_events',
  'booking_status_events_booking_id_fkey_idx',
  'booking status event foreign-key reads are indexed'
);
select has_index(
  'public',
  'location_updates',
  'location_updates_account_id_fkey_idx',
  'location account foreign-key reads are indexed'
);
select has_index(
  'public',
  'messages',
  'messages_sender_id_fkey_idx',
  'message sender foreign-key reads are indexed'
);
select has_index(
  'public',
  'service_requests',
  'service_requests_address_id_fkey_idx',
  'service request address foreign-key reads are indexed'
);
select is(
  (
    select count(*)
    from pg_catalog.pg_policy policy
    join pg_catalog.pg_class relation
      on relation.oid = policy.polrelid
    join pg_catalog.pg_namespace namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname in ('public', 'storage', 'realtime')
      and (
        replace(
          replace(
            replace(
              replace(
                coalesce(
                  pg_catalog.pg_get_expr(policy.polqual, policy.polrelid),
                  ''
                ),
                '( SELECT auth.uid() AS uid)',
                ''
              ),
              '( SELECT auth.jwt() AS jwt)',
              ''
            ),
            '( SELECT auth.role() AS role)',
            ''
          ),
          '( SELECT current_setting',
          ''
        ) like any (array[
          '%auth.uid()%',
          '%auth.jwt()%',
          '%auth.role()%',
          '%current_setting(%'
        ])
        or replace(
          replace(
            replace(
              replace(
                coalesce(
                  pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid),
                  ''
                ),
                '( SELECT auth.uid() AS uid)',
                ''
              ),
              '( SELECT auth.jwt() AS jwt)',
              ''
            ),
            '( SELECT auth.role() AS role)',
            ''
          ),
          '( SELECT current_setting',
          ''
        ) like any (array[
          '%auth.uid()%',
          '%auth.jwt()%',
          '%auth.role()%',
          '%current_setting(%'
        ])
      )
  ),
  0::bigint,
  'RLS auth.uid calls use one init plan per statement'
);
select is(
  (
    select count(*)
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'industries'
      and policyname = 'taxonomy_read'
  ),
  0::bigint,
  'the equivalent duplicate taxonomy policy is removed'
);

insert into auth.users(
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  'b1000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'session-idempotency@example.test',
  '',
  now(),
  '{}',
  '{"role":"USER","name":"Session User"}',
  now(),
  now()
);

insert into public.accounts(id, role, email)
values (
  'b1000000-0000-0000-0000-000000000001',
  'USER',
  'session-idempotency@example.test'
)
on conflict (id) do nothing;

select is(
  (
    select public.record_auth_session_event(
      'b1000000-0000-0000-0000-000000000001',
      repeat('a', 64),
      '127.0.0.1'::inet,
      'database test'
    )#>>'{event,id}'
  ),
  (
    select public.record_auth_session_event(
      'b1000000-0000-0000-0000-000000000001',
      repeat('a', 64),
      '127.0.0.1'::inet,
      'database test'
    )#>>'{event,id}'
  ),
  'concurrent-equivalent session writes resolve to the same event'
);
select is(
  (
    select count(*)
    from public.authentication_events
    where account_id = 'b1000000-0000-0000-0000-000000000001'
      and event_type = 'SIGNED_IN'
      and session_id_hash = repeat('a', 64)
  ),
  1::bigint,
  'session logging stores one row per session hash'
);

select * from finish();
rollback;
