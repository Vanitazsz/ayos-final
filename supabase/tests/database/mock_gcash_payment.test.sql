begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Setup test users
insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gcash-customer@example.test', '', now(), '{}', '{"role":"USER","name":"GCash Customer"}', now(), now()),
  ('b2000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gcash-worker@example.test', '', now(), '{}', '{"role":"WORKER","name":"GCash Worker"}', now(), now()),
  ('b3000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gcash-outsider@example.test', '', now(), '{}', '{"role":"USER","name":"GCash Outsider"}', now(), now());

insert into public.accounts(id, role, email)
values
  ('b1000000-0000-0000-0000-000000000001', 'USER', 'gcash-customer@example.test'),
  ('b2000000-0000-0000-0000-000000000001', 'WORKER', 'gcash-worker@example.test'),
  ('b3000000-0000-0000-0000-000000000001', 'USER', 'gcash-outsider@example.test')
on conflict (id) do nothing;

insert into public.user_profiles(account_id, display_name)
values
  ('b1000000-0000-0000-0000-000000000001', 'GCash Customer'),
  ('b3000000-0000-0000-0000-000000000001', 'GCash Outsider')
on conflict (account_id) do nothing;

insert into public.worker_profiles(account_id, display_name, approval_status, is_available)
values ('b2000000-0000-0000-0000-000000000001', 'GCash Worker', 'APPROVED', true)
on conflict (account_id) do nothing;

insert into public.service_categories(id, name, is_active)
values ('b4000000-0000-0000-0000-000000000001', 'GCash Category', true)
on conflict (id) do nothing;

insert into public.addresses(id, account_id, label, line1, barangay, city, province, is_default, location)
values ('b5000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Home', '1 Main St', 'Barangay 1', 'City', 'Province', true, extensions.st_setsrid(extensions.st_makepoint(121, 14), 4326)::extensions.geography)
on conflict (id) do nothing;

insert into public.service_requests(id, user_account_id, category_id, address_id, status, description, scheduled_at, budget, selected_worker_id, service_location)
values
  ('b6000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'CLOSED', 'GCash request 1', now(), 3000, 'b2000000-0000-0000-0000-000000000001', extensions.st_setsrid(extensions.st_makepoint(121, 14), 4326)::extensions.geography),
  ('b6000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'BOOKED', 'GCash request 2', now(), 3000, 'b2000000-0000-0000-0000-000000000001', extensions.st_setsrid(extensions.st_makepoint(121, 14), 4326)::extensions.geography);

insert into public.bookings(id, service_request_id, user_account_id, worker_account_id, status, version, agreed_service_amount)
values
  ('b7000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'COMPLETED', 1, 3000),
  ('b7000000-0000-0000-0000-000000000002', 'b6000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'IN_PROGRESS', 0, 3000);

-- Expected reference: MOCK-GCASH-B70000000000

-- Test 1: Fail when worker tries to invoke simulate_gcash_booking_payment
select set_config('request.jwt.claims', '{"sub":"b2000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.simulate_gcash_booking_payment('b7000000-0000-0000-0000-000000000001', 'MOCK-GCASH-B70000000000')$$,
  '42501',
  'Only the booking customer can simulate GCash payment',
  'worker cannot invoke gcash payment'
);

-- Test 2: Fail when outsider user tries to invoke
reset role;
select set_config('request.jwt.claims', '{"sub":"b3000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.simulate_gcash_booking_payment('b7000000-0000-0000-0000-000000000001', 'MOCK-GCASH-B70000000000')$$,
  '42501',
  'Only the booking customer can simulate GCash payment',
  'outsider user cannot invoke gcash payment'
);

-- Test 3: Fail when booking is not completed
reset role;
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.simulate_gcash_booking_payment('b7000000-0000-0000-0000-000000000002', 'MOCK-GCASH-B70000000002')$$,
  '22023',
  'Booking is not completed',
  'incomplete booking rejected'
);

-- Test 4: Fail when reference number is invalid
select throws_ok(
  $$select public.simulate_gcash_booking_payment('b7000000-0000-0000-0000-000000000001', 'INVALID-REF-1234')$$,
  '22023',
  'Invalid GCash mock reference number',
  'invalid reference number rejected'
);

-- Test 5: Customer-owned completed booking simulation succeeds
select lives_ok(
  $$select public.simulate_gcash_booking_payment('b7000000-0000-0000-0000-000000000001', 'MOCK-GCASH-B70000000000')$$,
  'customer gcash simulation succeeds'
);

-- Test 6: Verify payments row created with correct fields
select is(
  (select method::text from public.payments where booking_id = 'b7000000-0000-0000-0000-000000000001'),
  'GCASH',
  'payment method is GCASH'
);
select is(
  (select provider from public.payments where booking_id = 'b7000000-0000-0000-0000-000000000001'),
  'MOCK_GCASH',
  'payment provider is MOCK_GCASH'
);
select is(
  (select status::text from public.payments where booking_id = 'b7000000-0000-0000-0000-000000000001'),
  'SUCCESSFUL',
  'payment status is SUCCESSFUL'
);

-- Test 7: Verify receipt created
select is(
  (select count(*) from public.receipts r join public.payments p on r.payment_id = p.id where p.booking_id = 'b7000000-0000-0000-0000-000000000001'),
  1::bigint,
  'receipt created for GCash payment'
);

-- Test 7: Verify worker wallet credited with net earnings (3000 - 10% = 2700 = 270000 minor)
reset role;
select set_config('request.jwt.claims', '{"sub":"b2000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(
  (select available_minor from public.wallets where account_id = 'b2000000-0000-0000-0000-000000000001'),
  270000::bigint,
  'worker wallet credited 270000 minor'
);

-- Test 9: Verify wallet transaction metadata
select is(
  (select metadata->>'simulated' from public.wallet_transactions where wallet_account_id = 'b2000000-0000-0000-0000-000000000001' and booking_id = 'b7000000-0000-0000-0000-000000000001'),
  'true',
  'wallet transaction metadata tagged with simulated: true'
);
select is(
  (select metadata->>'reference_number' from public.wallet_transactions where wallet_account_id = 'b2000000-0000-0000-0000-000000000001' and booking_id = 'b7000000-0000-0000-0000-000000000001'),
  'MOCK-GCASH-B70000000000',
  'wallet transaction metadata contains reference number'
);

-- Test 10: Idempotent retry returns existing payment and does not double-credit worker wallet
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.simulate_gcash_booking_payment('b7000000-0000-0000-0000-000000000001', 'MOCK-GCASH-B70000000000')$$,
  'repeated call is idempotent'
);
select set_config('request.jwt.claims', '{"sub":"b2000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(
  (select count(*) from public.wallet_transactions where wallet_account_id = 'b2000000-0000-0000-0000-000000000001' and booking_id = 'b7000000-0000-0000-0000-000000000001'),
  1::bigint,
  'repeated call creates only one wallet transaction'
);

-- Test 11: Cash confirmation on a GCash-completed booking is a no-op that returns the payment
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(
  (
    select status::text
    from public.confirm_cash_payment('b7000000-0000-0000-0000-000000000001', 'test-idempotency-key-1234567890')
  ),
  'SUCCESSFUL',
  'cash confirmation returns the existing successful GCash payment'
);

-- Test 12: Mock-only balances cannot fund payout requests
reset role;
insert into public.payout_methods(id, account_id, method_type, label, details_encrypted, is_default)
values ('b8000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'GCASH', 'Worker GCash', 'enc_details', true);

select set_config('request.jwt.claims', '{"sub":"b2000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.request_payout('b8000000-0000-0000-0000-000000000001', 100000, 'payout-key-1234567890123456')$$,
  '22023',
  'INSUFFICIENT_BALANCE',
  'payout request rejected when funded only by mock earnings'
);

reset role;
select * from finish();
rollback;
