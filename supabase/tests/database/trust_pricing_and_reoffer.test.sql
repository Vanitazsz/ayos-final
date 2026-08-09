begin;
create extension if not exists pgtap with schema extensions;
select plan(51);

select has_column('public', 'worker_skills', 'rate_minor', 'worker skills store worker-owned rates');
select has_table('public', 'account_blocks', 'account blocks are persisted');
select has_table('public', 'account_reports', 'account reports are persisted');
select has_table('public', 'booking_disputes', 'booking disputes are persisted');
select has_table('public', 'booking_proof_media', 'proof-of-work metadata is persisted');
select has_table('public', 'worker_industries', 'worker industries are persisted');
select has_function('public', 'save_my_worker_skills', array['uuid[]', 'jsonb'], 'multi-industry worker rate save RPC exists');
select has_function(
  'public',
  'get_my_worker_skills',
  array[]::text[],
  'worker saved-skill read RPC exists'
);
select has_function('public', 'decline_assigned_booking', array['uuid', 'integer', 'text'], 'assigned booking decline RPC exists');
select has_function(
  'public',
  'get_worker_rate_estimate',
  array['uuid', 'numeric', 'numeric', 'timestamp with time zone', 'integer', 'bigint'],
  'worker rate estimate RPC exists'
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
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'trust-user@example.test',
    '',
    now(),
    '{}',
    '{"role":"USER","name":"Trust User"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '92000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'trust-worker-one@example.test',
    '',
    now(),
    '{}',
    '{"role":"WORKER","name":"Trust Worker One"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '92000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'trust-worker-two@example.test',
    '',
    now(),
    '{}',
    '{"role":"WORKER","name":"Trust Worker Two"}',
    now(),
    now()
  );

insert into public.industries(id, slug, name, is_active)
values ('93000000-0000-0000-0000-000000000001', 'trust-services', 'Trust Services', true);
insert into public.industries(id, slug, name, is_active)
values ('93000000-0000-0000-0000-000000000002', 'trust-electrical', 'Trust Electrical', true);
insert into public.service_categories(id, industry_id, slug, name, is_active)
values (
  '94000000-0000-0000-0000-000000000001',
  '93000000-0000-0000-0000-000000000001',
  'trust-service',
  'Trust Service',
  true
);
update public.accounts
set status = 'ACTIVE'
where id in (
  '92000000-0000-0000-0000-000000000001',
  '92000000-0000-0000-0000-000000000002'
);
update public.worker_profiles
set approval_status = 'APPROVED',
    is_available = true,
    service_origin = extensions.st_setsrid(extensions.st_makepoint(121, 14), 4326)::extensions.geography,
    service_radius_meters = 10000,
    primary_industry_id = '93000000-0000-0000-0000-000000000001'
where account_id in (
  '92000000-0000-0000-0000-000000000001',
  '92000000-0000-0000-0000-000000000002'
);

insert into public.worker_skills(worker_id, category_id, years, rate_minor)
values
  (
    '92000000-0000-0000-0000-000000000001',
    '94000000-0000-0000-0000-000000000001',
    4,
    50000
  ),
  (
    '92000000-0000-0000-0000-000000000002',
    '94000000-0000-0000-0000-000000000001',
    3,
    70000
  );
insert into public.worker_availability(worker_id, day_of_week, start_time, end_time)
select worker_id, extract(dow from now() + interval '1 day')::smallint, '00:00', '23:59'
from (
  values
    ('92000000-0000-0000-0000-000000000001'::uuid),
    ('92000000-0000-0000-0000-000000000002'::uuid)
) workers(worker_id);
insert into public.worker_presence(worker_id, location, accuracy_meters, online, last_seen_at)
select
  worker_id,
  extensions.st_setsrid(extensions.st_makepoint(121, 14), 4326)::extensions.geography,
  5,
  true,
  now()
from (
  values
    ('92000000-0000-0000-0000-000000000001'::uuid),
    ('92000000-0000-0000-0000-000000000002'::uuid)
) workers(worker_id);

select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select is(
  (
    public.get_worker_rate_estimate(
      '94000000-0000-0000-0000-000000000001',
      14,
      121,
      now() + interval '1 day',
      10000,
      100000
    )->>'minimumRateMinor'
  )::bigint,
  50000::bigint,
  'estimate uses the lowest eligible worker rate'
);
select is(
  (
    public.get_worker_rate_estimate(
      '94000000-0000-0000-0000-000000000001',
      14,
      121,
      now() + interval '1 day',
      10000,
      60000
    )->>'workerCount'
  )::integer,
  1,
  'estimate excludes rates above the customer budget'
);
select is(
  (
    public.get_worker_rate_estimate(
      '94000000-0000-0000-0000-000000000001',
      14,
      121,
      now() + interval '1 day',
      10000,
      40000
    )->>'workerCount'
  )::integer,
  0,
  'estimate returns no workers instead of inventing a fallback price'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"92000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.save_my_worker_skills(
    array[
      '93000000-0000-0000-0000-000000000001'::uuid,
      '93000000-0000-0000-0000-000000000002'::uuid
    ],
    '[{"categoryId":"94000000-0000-0000-0000-000000000001","years":4,"rateMinor":50000}]'::jsonb
  )$$,
  'worker can persist an owned real service rate'
);
select is(
  public.get_my_worker_skills()->'skills'->0->>'categoryId',
  '94000000-0000-0000-0000-000000000001',
  'saved-skill read model returns the exact persisted skill'
);
select is(
  (public.get_my_worker_skills()->'skills'->0->>'rateMinor')::bigint,
  50000::bigint,
  'saved-skill read model returns the exact persisted rate'
);
select is(
  (select count(*) from public.worker_industries where worker_id = auth.uid()),
  2::bigint,
  'worker selected industries are persisted'
);
select is(
  public.get_my_worker_skills()->'selectedIndustryIds'->>1,
  '93000000-0000-0000-0000-000000000002',
  'saved-skill read model returns every selected industry'
);

reset role;
insert into public.addresses(
  id,
  account_id,
  label,
  line1,
  barangay,
  city,
  province,
  is_default,
  location
) values (
  '95000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000001',
  'Home',
  '1 Trust Street',
  'Trust Barangay',
  'Trust City',
  'Trust Province',
  true,
  extensions.st_setsrid(extensions.st_makepoint(121, 14), 4326)::extensions.geography
);
insert into public.service_requests(
  id,
  user_account_id,
  category_id,
  address_id,
  status,
  description,
  scheduled_at,
  budget,
  service_location
) values (
  '96000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000001',
  '94000000-0000-0000-0000-000000000001',
  '95000000-0000-0000-0000-000000000001',
  'OPEN',
  'Validate sequential worker dispatch and pricing.',
  now() + interval '1 day',
  2000,
  extensions.st_setsrid(extensions.st_makepoint(121, 14), 4326)::extensions.geography
);

select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select lives_ok(
  $$select public.start_live_dispatch('96000000-0000-0000-0000-000000000001', 10000)$$,
  'customer can start eligible live dispatch'
);
select is(
  (
    select count(*)
    from public.service_request_dispatches
    where service_request_id = '96000000-0000-0000-0000-000000000001'
      and status = 'OFFERED'
  ),
  1::bigint,
  'only one worker is offered the request at a time'
);

reset role;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (
      select worker_id
      from public.service_request_dispatches
      where service_request_id = '96000000-0000-0000-0000-000000000001'
        and status = 'OFFERED'
      limit 1
    ),
    'role',
    'authenticated',
    'aal',
    'aal1'
  )::text,
  true
);
set local role authenticated;
select is(
  (public.get_my_dispatch_offers()->0->>'rateMinor')::bigint,
  50000::bigint,
  'worker dispatch offer exposes the worker saved service rate'
);
select lives_ok(
  $$select public.respond_to_dispatch(
    (
      select id
      from public.service_request_dispatches
      where service_request_id = '96000000-0000-0000-0000-000000000001'
        and status = 'OFFERED'
      limit 1
    ),
    'DECLINED'
  )$$,
  'declining an offer automatically advances dispatch'
);

reset role;
select is(
  (
    select count(*)
    from public.service_request_dispatches
    where service_request_id = '96000000-0000-0000-0000-000000000001'
      and status = 'OFFERED'
  ),
  1::bigint,
  'the next eligible worker receives the re-offer'
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (
      select worker_id
      from public.service_request_dispatches
      where service_request_id = '96000000-0000-0000-0000-000000000001'
        and status = 'OFFERED'
      limit 1
    ),
    'role',
    'authenticated',
    'aal',
    'aal1'
  )::text,
  true
);
set local role authenticated;
reset role;
update public.worker_skills
set rate_minor = null
where worker_id = (
  select worker_id
  from public.service_request_dispatches
  where service_request_id = '96000000-0000-0000-0000-000000000001'
    and status = 'OFFERED'
  limit 1
);
set local role authenticated;
select throws_ok(
  $$select public.respond_to_dispatch(
    (
      select id
      from public.service_request_dispatches
      where service_request_id = '96000000-0000-0000-0000-000000000001'
        and status = 'OFFERED'
      limit 1
    ),
    'ACCEPTED'
  )$$,
  '55000',
  'WORKER_NOT_READY',
  'worker without a service rate cannot accept a dispatch'
);

reset role;
update public.worker_skills
set rate_minor = 60000
where worker_id = (
  select worker_id
  from public.service_request_dispatches
  where service_request_id = '96000000-0000-0000-0000-000000000001'
    and status = 'OFFERED'
  limit 1
);
set local role authenticated;
select lives_ok(
  $$select public.respond_to_dispatch(
    (
      select id
      from public.service_request_dispatches
      where service_request_id = '96000000-0000-0000-0000-000000000001'
        and status = 'OFFERED'
      limit 1
    ),
    'ACCEPTED'
  )$$,
  'next worker can accept the re-offer'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select lives_ok(
  $$select public.select_worker(
    '96000000-0000-0000-0000-000000000001',
    (
      select worker_id
      from public.service_request_dispatches
      where service_request_id = '96000000-0000-0000-0000-000000000001'
        and status = 'ACCEPTED'
      limit 1
    )
  )$$,
  'customer can explicitly select the accepted eligible worker'
);
select is(
  (
    select agreed_service_amount
    from public.bookings
    where service_request_id = '96000000-0000-0000-0000-000000000001'
  ),
  (
    select skill.rate_minor::numeric / 100
    from public.worker_skills skill
    join public.bookings booking on booking.worker_account_id = skill.worker_id
    where booking.service_request_id = '96000000-0000-0000-0000-000000000001'
      and skill.category_id = '94000000-0000-0000-0000-000000000001'
  ),
  'selected worker saved rate is the booking amount'
);
select is(
  (
    select status::text
    from public.service_requests
    where id = '96000000-0000-0000-0000-000000000001'
  ),
  'BOOKED',
  'selected service request is booked'
);
select is(
  (
    select selected_worker_id
    from public.service_requests
    where id = '96000000-0000-0000-0000-000000000001'
  ),
  (
    select worker_account_id
    from public.bookings
    where service_request_id = '96000000-0000-0000-0000-000000000001'
  ),
  'service request stores the booked worker'
);
select is(
  (
    select count(*)
    from public.service_request_dispatches
    where service_request_id = '96000000-0000-0000-0000-000000000001'
      and status = 'SELECTED'
  ),
  1::bigint,
  'accepted dispatch is marked selected'
);

reset role;
update public.worker_skills
set rate_minor = null
where worker_id = (
  select worker_account_id
  from public.bookings
  where service_request_id = '96000000-0000-0000-0000-000000000001'
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (
      select worker_account_id
      from public.bookings
      where service_request_id = '96000000-0000-0000-0000-000000000001'
    ),
    'role',
    'authenticated',
    'aal',
    'aal1'
  )::text,
  true
);
set local role authenticated;
select throws_ok(
  $$select public.transition_booking(
    (
      select id
      from public.bookings
      where service_request_id = '96000000-0000-0000-0000-000000000001'
    ),
    'ACCEPTED',
    0,
    null
  )$$,
  '55000',
  'WORKER_NOT_READY',
  'worker without a service rate cannot accept a booking'
);

reset role;
update public.worker_skills
set rate_minor = 60000
where worker_id = (
  select worker_account_id
  from public.bookings
  where service_request_id = '96000000-0000-0000-0000-000000000001'
);
set local role authenticated;
select lives_ok(
  $$select public.transition_booking(
    (
      select id
      from public.bookings
      where service_request_id = '96000000-0000-0000-0000-000000000001'
    ),
    'ACCEPTED',
    0,
    null
  )$$,
  'rate-ready worker can accept the booking'
);

-- The 40001 BOOKING_VERSION_CONFLICT raise was removed because the status
-- state machine is forward-only and the RPC validates against the locked row.
-- A stale expected_version must be tolerated and a repeat transition must be
-- idempotent, while illegal transitions still fail.
select lives_ok(
  $$select public.transition_booking(
    (
      select id
      from public.bookings
      where service_request_id = '96000000-0000-0000-0000-000000000001'
    ),
    'WORKER_PREPARING',
    0,
    null
  )$$,
  'a stale expected_version does not raise a version conflict'
);
select is(
  (
    select version
    from public.bookings
    where service_request_id = '96000000-0000-0000-0000-000000000001'
  ),
  2,
  'the transition advances the version for the audit trail'
);
select lives_ok(
  $$select public.transition_booking(
    (
      select id
      from public.bookings
      where service_request_id = '96000000-0000-0000-0000-000000000001'
    ),
    'WORKER_PREPARING',
    1,
    null
  )$$,
  'repeating the same transition is an idempotent no-op'
);
select is(
  (
    select version
    from public.bookings
    where service_request_id = '96000000-0000-0000-0000-000000000001'
  ),
  2,
  'the idempotent repeat does not bump the version'
);
select throws_ok(
  $$select public.transition_booking(
    (
      select id
      from public.bookings
      where service_request_id = '96000000-0000-0000-0000-000000000001'
    ),
    'ACCEPTED',
    2,
    null
  )$$,
  'P0001',
  'INVALID_BOOKING_TRANSITION',
  'illegal transitions are still rejected by the state machine'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select lives_ok(
  $$select public.report_booking_participant(
    (
      select id
      from public.bookings
      where service_request_id = '96000000-0000-0000-0000-000000000001'
    ),
    'CONDUCT_CONCERN',
    'Customer submitted a test conduct concern.'
  )$$,
  'booking participant report is persisted'
);
select lives_ok(
  $$select public.open_booking_dispute(
    (
      select id
      from public.bookings
      where service_request_id = '96000000-0000-0000-0000-000000000001'
    ),
    'Customer submitted a test booking dispute.'
  )$$,
  'booking dispute is persisted'
);
select lives_ok(
  $$select public.block_account(
    (
      select worker_account_id
      from public.bookings
      where service_request_id = '96000000-0000-0000-0000-000000000001'
    ),
    'Customer blocked this booking participant.'
  )$$,
  'booking participant can be blocked'
);

reset role;
select ok(
  private.accounts_block_each_other(
    '91000000-0000-0000-0000-000000000001',
    (
      select worker_account_id
      from public.bookings
      where service_request_id = '96000000-0000-0000-0000-000000000001'
    )
  ),
  'matching block is enforced bidirectionally'
);
update public.bookings
set status = 'COMPLETED',
    completed_at = now()
where service_request_id = '96000000-0000-0000-0000-000000000001';
insert into storage.objects(bucket_id, name, owner_id, metadata)
select
  'booking-proof',
  worker_account_id::text || '/proof.jpg',
  worker_account_id::text,
  '{"mimetype":"image/jpeg","size":1024}'
from public.bookings
where service_request_id = '96000000-0000-0000-0000-000000000001';
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (
      select worker_account_id
      from public.bookings
      where service_request_id = '96000000-0000-0000-0000-000000000001'
    ),
    'role',
    'authenticated',
    'aal',
    'aal1'
  )::text,
  true
);
set local role authenticated;
select lives_ok(
  $$select public.attach_booking_proof(
    (
      select id
      from public.bookings
      where service_request_id = '96000000-0000-0000-0000-000000000001'
    ),
    auth.uid()::text || '/proof.jpg',
    'image/jpeg',
    1024
  )$$,
  'worker can attach after-job proof tied to the booking'
);
select is(
  (
    select count(*)
    from public.booking_proof_media
    where booking_id = (
      select id
      from public.bookings
      where service_request_id = '96000000-0000-0000-0000-000000000001'
    )
  ),
  1::bigint,
  'proof-of-work metadata is stored once'
);
select lives_ok(
  $$select public.delete_booking_proof(
    (
      select id
      from public.bookings
      where service_request_id = '96000000-0000-0000-0000-000000000001'
    ),
    auth.uid()::text || '/proof.jpg'
  )$$,
  'worker can remove their after-job proof before feedback is confirmed'
);
select is(
  (
    select count(*)
    from public.booking_proof_media
    where booking_id = (
      select id
      from public.bookings
      where service_request_id = '96000000-0000-0000-0000-000000000001'
    )
  ),
  0::bigint,
  'proof-of-work metadata is removed'
);
reset role;
select is(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'booking-proof'
      and name = (
        select worker_account_id::text || '/proof.jpg'
        from public.bookings
        where service_request_id = '96000000-0000-0000-0000-000000000001'
      )
  ),
  1::bigint,
  'the storage object is left for client-side deletion via the Storage API'
);
set local role authenticated;
select is(
  (
    select status::text
    from public.confirm_cash_payment(
      (
        select id
        from public.bookings
        where service_request_id = '96000000-0000-0000-0000-000000000001'
      ),
      'trust-worker-cash-confirmation'
    )
  ),
  'AWAITING_CONFIRMATIONS',
  'first cash confirmation waits for the other booking party'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select is(
  (
    select status::text
    from public.confirm_cash_payment(
      (
        select id
        from public.bookings
        where service_request_id = '96000000-0000-0000-0000-000000000001'
      ),
      'trust-customer-cash-confirmation'
    )
  ),
  'SUCCESSFUL',
  'second booking party confirmation completes the cash payment'
);
select is(
  (
    select count(*)
    from public.receipts
    where payment_id = (
      select id
      from public.payments
      where booking_id = (
        select id
        from public.bookings
        where service_request_id = '96000000-0000-0000-0000-000000000001'
      )
    )
  ),
  1::bigint,
  'successful cash settlement creates one receipt'
);
select lives_ok(
  $$select public.create_review(
    (
      select id
      from public.bookings
      where service_request_id = '96000000-0000-0000-0000-000000000001'
    ),
    5,
    'Verified service review.',
    true
  )$$,
  'customer can create a review after successful service payment'
);
select is(
  (
    select count(*)
    from public.reviews
    where booking_id = (
      select id
      from public.bookings
      where service_request_id = '96000000-0000-0000-0000-000000000001'
    )
  ),
  1::bigint,
  'post-service review is persisted once'
);

select * from finish();
rollback;
