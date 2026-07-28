begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

select has_function(
  'public',
  'select_worker_for_quote',
  array['uuid', 'uuid'],
  'customer quote selection RPC exists'
);
select has_function(
  'public',
  'submit_selected_worker_quote',
  array['uuid', 'bigint', 'text', 'integer'],
  'selected worker quote RPC exists'
);
select has_function(
  'public',
  'accept_service_offer',
  array['uuid'],
  'offer acceptance RPC remains available'
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
    'a1000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'quote-customer@example.test',
    '',
    now(),
    '{}',
    '{"role":"USER","name":"Quote Customer"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a2000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'quote-worker@example.test',
    '',
    now(),
    '{}',
    '{"role":"WORKER","name":"Quote Worker"}',
    now(),
    now()
  );

insert into public.industries(id, slug, name, is_active)
values (
  'a3000000-0000-0000-0000-000000000001',
  'quote-services',
  'Quote Services',
  true
);
insert into public.service_categories(id, industry_id, slug, name, is_active)
values (
  'a4000000-0000-0000-0000-000000000001',
  'a3000000-0000-0000-0000-000000000001',
  'quote-service',
  'Quote Service',
  true
);
update public.accounts
set status = 'ACTIVE'
where id = 'a2000000-0000-0000-0000-000000000001';
update public.worker_profiles
set approval_status = 'APPROVED',
    is_available = true,
    service_origin = extensions.st_setsrid(
      extensions.st_makepoint(121, 14),
      4326
    )::extensions.geography,
    service_radius_meters = 10000,
    primary_industry_id = 'a3000000-0000-0000-0000-000000000001'
where account_id = 'a2000000-0000-0000-0000-000000000001';
insert into public.worker_skills(worker_id, category_id, years, rate_minor)
values (
  'a2000000-0000-0000-0000-000000000001',
  'a4000000-0000-0000-0000-000000000001',
  5,
  null
);
insert into public.worker_availability(
  worker_id,
  day_of_week,
  start_time,
  end_time
)
values (
  'a2000000-0000-0000-0000-000000000001',
  extract(dow from now() + interval '1 day')::smallint,
  '00:00',
  '23:59'
);
insert into public.worker_presence(
  worker_id,
  location,
  accuracy_meters,
  online,
  last_seen_at
)
values (
  'a2000000-0000-0000-0000-000000000001',
  extensions.st_setsrid(
    extensions.st_makepoint(121, 14),
    4326
  )::extensions.geography,
  5,
  true,
  now()
);
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
)
values (
  'a5000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'Home',
  '1 Quote Street',
  'Quote Barangay',
  'Quote City',
  'Quote Province',
  true,
  extensions.st_setsrid(
    extensions.st_makepoint(121, 14),
    4326
  )::extensions.geography
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
)
values (
  'a6000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'a4000000-0000-0000-0000-000000000001',
  'a5000000-0000-0000-0000-000000000001',
  'OPEN',
  'Validate the selected worker quote workflow.',
  now() + interval '1 day',
  2500,
  extensions.st_setsrid(
    extensions.st_makepoint(121, 14),
    4326
  )::extensions.geography
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select lives_ok(
  $$select public.start_live_dispatch(
    'a6000000-0000-0000-0000-000000000001',
    10000
  )$$,
  'customer can dispatch a request to a no-rate worker'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"a2000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select lives_ok(
  $$select public.respond_to_dispatch(
    (
      select id
      from public.service_request_dispatches
      where service_request_id = 'a6000000-0000-0000-0000-000000000001'
        and worker_id = auth.uid()
    ),
    'ACCEPTED'
  )$$,
  'no-rate worker can accept the dispatch'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select lives_ok(
  $$select public.select_worker_for_quote(
    'a6000000-0000-0000-0000-000000000001',
    'a2000000-0000-0000-0000-000000000001'
  )$$,
  'customer can select the accepted worker for a quote'
);
select is(
  (
    select selected_worker_id
    from public.service_requests
    where id = 'a6000000-0000-0000-0000-000000000001'
  ),
  'a2000000-0000-0000-0000-000000000001'::uuid,
  'selected worker is persisted on the request'
);
select is(
  (
    select status::text
    from public.service_requests
    where id = 'a6000000-0000-0000-0000-000000000001'
  ),
  'MATCHED',
  'request remains matched while awaiting the quote'
);
select is(
  (
    select count(*)
    from public.bookings
    where service_request_id = 'a6000000-0000-0000-0000-000000000001'
  ),
  0::bigint,
  'selecting a no-rate worker does not create a booking'
);
select is(
  (
    select status
    from public.service_request_dispatches
    where service_request_id = 'a6000000-0000-0000-0000-000000000001'
      and worker_id = 'a2000000-0000-0000-0000-000000000001'
  ),
  'SELECTED',
  'selected dispatch is persisted'
);
select is(
  (
    select count(*)
    from public.conversations
    where service_request_id = 'a6000000-0000-0000-0000-000000000001'
      and worker_account_id = 'a2000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'customer and worker share one pre-booking conversation'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"a2000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select lives_ok(
  $$select public.submit_selected_worker_quote(
    'a6000000-0000-0000-0000-000000000001',
    185000,
    'Fixed quote for the requested service.',
    90
  )$$,
  'selected worker can submit a real quote'
);
select is(
  (
    select amount
    from public.service_request_offers
    where service_request_id = 'a6000000-0000-0000-0000-000000000001'
      and worker_id = auth.uid()
      and status in ('SUBMITTED', 'UPDATED')
  ),
  1850::numeric,
  'quote amount is derived from the worker submission'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select lives_ok(
  $$select public.accept_service_offer(
    (
      select id
      from public.service_request_offers
      where service_request_id = 'a6000000-0000-0000-0000-000000000001'
        and worker_id = 'a2000000-0000-0000-0000-000000000001'
    )
  )$$,
  'customer can accept the selected worker quote'
);
select is(
  (
    select agreed_service_amount
    from public.bookings
    where service_request_id = 'a6000000-0000-0000-0000-000000000001'
  ),
  1850::numeric,
  'booking uses the accepted quote instead of the customer budget'
);
select is(
  (
    select count(*)
    from public.bookings
    where service_request_id = 'a6000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'quote acceptance creates exactly one booking'
);
select is(
  (
    select count(*)
    from public.conversations
    where service_request_id = 'a6000000-0000-0000-0000-000000000001'
      and worker_account_id = 'a2000000-0000-0000-0000-000000000001'
      and booking_id is not null
  ),
  1::bigint,
  'pre-booking conversation is attached to the booking'
);

select * from finish();
rollback;
