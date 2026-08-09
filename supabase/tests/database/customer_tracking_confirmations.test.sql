begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

select has_function(
  'public',
  'confirm_customer_arrival',
  array['uuid'],
  'customer arrival confirmation RPC exists'
);
select has_function(
  'public',
  'confirm_customer_completion',
  array['uuid'],
  'customer completion confirmation RPC exists'
);

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tracking-customer@example.test', '', now(), '{}', '{"role":"USER","name":"Tracking Customer"}', now(), now()),
  ('d2000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tracking-worker@example.test', '', now(), '{}', '{"role":"WORKER","name":"Tracking Worker"}', now(), now()),
  ('d3000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tracking-outsider@example.test', '', now(), '{}', '{"role":"USER","name":"Tracking Outsider"}', now(), now());

insert into public.accounts(id, role, email)
values
  ('d1000000-0000-0000-0000-000000000001', 'USER', 'tracking-customer@example.test'),
  ('d2000000-0000-0000-0000-000000000001', 'WORKER', 'tracking-worker@example.test'),
  ('d3000000-0000-0000-0000-000000000001', 'USER', 'tracking-outsider@example.test')
on conflict (id) do nothing;

insert into public.user_profiles(account_id, display_name)
values
  ('d1000000-0000-0000-0000-000000000001', 'Tracking Customer'),
  ('d3000000-0000-0000-0000-000000000001', 'Tracking Outsider')
on conflict (account_id) do nothing;

insert into public.worker_profiles(account_id, display_name, approval_status, is_available)
values ('d2000000-0000-0000-0000-000000000001', 'Tracking Worker', 'APPROVED', true)
on conflict (account_id) do nothing;

insert into public.service_categories(id, name, is_active)
values ('d4000000-0000-0000-0000-000000000001', 'Tracking Category', true);

insert into public.addresses(
  id, account_id, label, line1, barangay, city, province, is_default, location
) values (
  'd5000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001',
  'Home', '1 Tracking Street', 'Barangay 1', 'Tracking City', 'Tracking Province', true,
  extensions.st_setsrid(extensions.st_makepoint(121, 14), 4326)::extensions.geography
);

insert into public.service_requests(
  id, user_account_id, category_id, address_id, status, description,
  scheduled_at, budget, selected_worker_id, service_location
) values (
  'd6000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001',
  'd4000000-0000-0000-0000-000000000001',
  'd5000000-0000-0000-0000-000000000001',
  'BOOKED', 'Customer tracking confirmation request', now(), 1000,
  'd2000000-0000-0000-0000-000000000001',
  extensions.st_setsrid(extensions.st_makepoint(121, 14), 4326)::extensions.geography
);

insert into public.bookings(
  id, service_request_id, user_account_id, worker_account_id, status, version, agreed_service_amount
) values (
  'd7000000-0000-0000-0000-000000000001',
  'd6000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001',
  'd2000000-0000-0000-0000-000000000001',
  'WORKER_EN_ROUTE', 2, 1000
);

insert into public.location_updates(booking_id, account_id, location, recorded_at)
values (
  'd7000000-0000-0000-0000-000000000001',
  'd2000000-0000-0000-0000-000000000001',
  private.make_location(14, 121.01),
  now()
);

select set_config('request.jwt.claims', '{"sub":"d1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.confirm_customer_arrival('d7000000-0000-0000-0000-000000000001')$$,
  '42501',
  'WORKER_NOT_WITHIN_ARRIVAL_RADIUS',
  'customer arrival cannot bypass worker proximity validation'
);
select is(
  (select status::text from public.bookings where id = 'd7000000-0000-0000-0000-000000000001'),
  'WORKER_EN_ROUTE',
  'denied arrival leaves the canonical status unchanged'
);

reset role;
insert into public.location_updates(booking_id, account_id, location, recorded_at)
values (
  'd7000000-0000-0000-0000-000000000001',
  'd2000000-0000-0000-0000-000000000001',
  private.make_location(14, 121),
  now() + interval '1 second'
);

select set_config('request.jwt.claims', '{"sub":"d1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.confirm_customer_arrival('d7000000-0000-0000-0000-000000000001')$$,
  'customer can confirm arrival after persisted worker proximity is valid'
);
select is(
  (select status::text from public.bookings where id = 'd7000000-0000-0000-0000-000000000001'),
  'WORKER_ARRIVED',
  'customer arrival advances the canonical status'
);
select is(
  (select count(*) from public.booking_status_events where booking_id = 'd7000000-0000-0000-0000-000000000001' and to_status = 'WORKER_ARRIVED'),
  1::bigint,
  'customer arrival creates one auditable status event'
);
select lives_ok(
  $$select public.confirm_customer_arrival('d7000000-0000-0000-0000-000000000001')$$,
  'repeated customer arrival confirmation is idempotent'
);
select is(
  (select count(*) from public.booking_status_events where booking_id = 'd7000000-0000-0000-0000-000000000001' and to_status = 'WORKER_ARRIVED'),
  1::bigint,
  'repeated arrival creates no duplicate status event'
);
select set_config('request.jwt.claims', '{"sub":"d2000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.confirm_customer_arrival('d7000000-0000-0000-0000-000000000001')$$,
  '42501',
  'CUSTOMER_REQUIRED',
  'worker cannot invoke the customer arrival RPC'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"d3000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.confirm_customer_arrival('d7000000-0000-0000-0000-000000000001')$$,
  '42501',
  'CUSTOMER_REQUIRED',
  'outsider cannot invoke the customer arrival RPC'
);

reset role;
update public.bookings
set status = 'PENDING_CONFIRMATION', version = version + 1
where id = 'd7000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claims', '{"sub":"d1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.confirm_customer_completion('d7000000-0000-0000-0000-000000000001')$$,
  'customer can confirm completion from pending confirmation'
);
select is(
  (select status::text from public.bookings where id = 'd7000000-0000-0000-0000-000000000001'),
  'COMPLETED',
  'customer completion advances the booking'
);
select is(
  (select status::text from public.service_requests where id = 'd6000000-0000-0000-0000-000000000001'),
  'CLOSED',
  'customer completion closes the service request'
);
select lives_ok(
  $$select public.confirm_customer_completion('d7000000-0000-0000-0000-000000000001')$$,
  'repeated customer completion confirmation is idempotent'
);
select is(
  (select count(*) from public.booking_status_events where booking_id = 'd7000000-0000-0000-0000-000000000001' and to_status = 'COMPLETED'),
  1::bigint,
  'repeated completion creates no duplicate status event'
);
select is(
  (select count(*) from public.payments where booking_id = 'd7000000-0000-0000-0000-000000000001'),
  0::bigint,
  'customer completion does not settle payment'
);
select set_config('request.jwt.claims', '{"sub":"d2000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.confirm_customer_completion('d7000000-0000-0000-0000-000000000001')$$,
  '42501',
  'CUSTOMER_REQUIRED',
  'worker cannot invoke the customer completion RPC'
);

reset role;
select * from finish();
rollback;
