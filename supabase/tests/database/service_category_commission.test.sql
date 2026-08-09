begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

select has_column(
  'public',
  'service_categories',
  'commission_rate_percent',
  'service categories expose an optional commission override'
);
select has_function(
  'public',
  'get_effective_commission_rate',
  array['uuid'],
  'effective commission rate RPC exists'
);
select has_function(
  'public',
  'get_my_wallet_topups',
  array[]::text[],
  'worker-owned top-up status read RPC exists'
);
select ok(
  exists(
    select 1
    from pg_constraint
    where conrelid = 'public.service_categories'::regclass
      and conname = 'service_categories_commission_rate_percent_check'
      and position('commission_rate_percent' in pg_get_constraintdef(oid)) > 0
  ),
  'commission override has a database constraint'
);

insert into private.admin_bootstrap_requests(email, token_hash, display_name, expires_at)
values (
  'commission-admin@example.test',
  encode(extensions.digest('commission-admin-token', 'sha256'), 'hex'),
  'Commission Admin',
  now() + interval '5 minutes'
);

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'commission-customer@example.test', '', now(), '{}', '{"role":"USER","name":"Commission Customer"}', now(), now()),
  ('c2000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'commission-worker@example.test', '', now(), '{}', '{"role":"WORKER","name":"Commission Worker"}', now(), now()),
  ('c3000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'commission-outsider@example.test', '', now(), '{}', '{"role":"USER","name":"Commission Outsider"}', now(), now()),
  ('c9000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'commission-admin@example.test', '', now(), '{}', '{"role":"ADMIN","name":"Commission Admin","admin_bootstrap_token":"commission-admin-token"}', now(), now());

insert into public.accounts(id, role, status, email, mfa_enabled)
values
  ('c1000000-0000-0000-0000-000000000001', 'USER', 'ACTIVE', 'commission-customer@example.test', false),
  ('c2000000-0000-0000-0000-000000000001', 'WORKER', 'ACTIVE', 'commission-worker@example.test', false),
  ('c3000000-0000-0000-0000-000000000001', 'USER', 'ACTIVE', 'commission-outsider@example.test', false),
  ('c9000000-0000-0000-0000-000000000001', 'ADMIN', 'ACTIVE', 'commission-admin@example.test', true)
on conflict (id) do nothing;

insert into public.user_profiles(account_id, display_name)
values
  ('c1000000-0000-0000-0000-000000000001', 'Commission Customer'),
  ('c3000000-0000-0000-0000-000000000001', 'Commission Outsider')
on conflict (account_id) do update set display_name = excluded.display_name;

insert into public.worker_profiles(account_id, display_name, approval_status, is_available)
values ('c2000000-0000-0000-0000-000000000001', 'Commission Worker', 'APPROVED', true)
on conflict (account_id) do update set
  display_name = excluded.display_name,
  approval_status = excluded.approval_status,
  is_available = excluded.is_available;

insert into public.admin_profiles(account_id, display_name)
values ('c9000000-0000-0000-0000-000000000001', 'Commission Admin')
on conflict (account_id) do update set display_name = excluded.display_name;

insert into public.service_categories(id, name, is_active, commission_rate_percent)
values ('c4000000-0000-0000-0000-000000000001', 'Commission Category', true, null);

insert into public.addresses(id, account_id, label, line1, barangay, city, province, is_default, location)
values ('c5000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Home', '1 Commission Street', 'Barangay 1', 'Commission City', 'Commission Province', true, extensions.st_setsrid(extensions.st_makepoint(121, 14), 4326)::extensions.geography);

insert into public.service_requests(
  id, user_account_id, category_id, address_id, status, description,
  scheduled_at, budget, selected_worker_id, service_location
) values
  ('c6000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'CLOSED', 'Commission request one', now(), 1000, 'c2000000-0000-0000-0000-000000000001', extensions.st_setsrid(extensions.st_makepoint(121, 14), 4326)::extensions.geography),
  ('c6000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'CLOSED', 'Commission request two', now(), 1000, 'c2000000-0000-0000-0000-000000000001', extensions.st_setsrid(extensions.st_makepoint(121, 14), 4326)::extensions.geography),
  ('c6000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'CLOSED', 'Commission request three', now(), 1000, 'c2000000-0000-0000-0000-000000000001', extensions.st_setsrid(extensions.st_makepoint(121, 14), 4326)::extensions.geography);

insert into public.bookings(
  id, service_request_id, user_account_id, worker_account_id, status, version, agreed_service_amount
) values
  ('c7000000-0000-0000-0000-000000000001', 'c6000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'COMPLETED', 1, 1000),
  ('c7000000-0000-0000-0000-000000000002', 'c6000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'COMPLETED', 1, 1000),
  ('c7000000-0000-0000-0000-000000000003', 'c6000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'COMPLETED', 1, 1000);

insert into public.system_settings(key, value)
values ('platform_settings.commission_rate', '10'::jsonb)
on conflict(key) do update set value = excluded.value;

select set_config('request.jwt.claims', '{"sub":"c1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(
  public.get_effective_commission_rate('c4000000-0000-0000-0000-000000000001'),
  10::numeric,
  'NULL category override inherits the global commission rate'
);
reset role;

update public.service_categories
set commission_rate_percent = 7.50
where id = 'c4000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claims', '{"sub":"c1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(
  public.get_effective_commission_rate('c4000000-0000-0000-0000-000000000001'),
  7.50::numeric,
  'category override is used by the effective-rate RPC'
);
reset role;

select throws_ok(
  $$update public.service_categories set commission_rate_percent = 50.01 where id = 'c4000000-0000-0000-0000-000000000001'$$,
  '23514',
  'new row for relation "service_categories" violates check constraint "service_categories_commission_rate_percent_check"',
  'commission override rejects values above 50 percent'
);

select set_config('request.jwt.claims', '{"sub":"c1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.get_effective_commission_rate('ffffffff-ffff-ffff-ffff-ffffffffffff')$$,
  '22023',
  'SERVICE_CATEGORY_NOT_FOUND',
  'effective-rate RPC rejects an unknown service category'
);
reset role;

update public.system_settings
set value = '50.01'::jsonb
where key = 'platform_settings.commission_rate';
select set_config('request.jwt.claims', '{"sub":"c1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.get_effective_commission_rate('c4000000-0000-0000-0000-000000000001')$$,
  '22023',
  'INVALID_PLATFORM_COMMISSION_RATE',
  'effective-rate RPC rejects an invalid global commission rate'
);
reset role;
update public.system_settings
set value = '10'::jsonb
where key = 'platform_settings.commission_rate';

select set_config('request.jwt.claims', '{"sub":"c1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select ok(
  public.get_platform_fee_settings()->'serviceCategoryOverrides' @> jsonb_build_array(
    jsonb_build_object('id', 'c4000000-0000-0000-0000-000000000001', 'commissionRatePercent', 7.50)
  ),
  'fee settings expose category override records for the admin contract'
);

select lives_ok(
  $$select public.deduct_booking_commission('c7000000-0000-0000-0000-000000000001', 'CASH')$$,
  'deduct commission resolves the booking category and settles payment'
);
select is(
  (select commission_rate from public.payments where booking_id = 'c7000000-0000-0000-0000-000000000001'),
  0.0750::numeric,
  'deduct commission stores the effective ratio'
);
select is(
  (select commission_amount from public.payments where booking_id = 'c7000000-0000-0000-0000-000000000001'),
  75.00::numeric,
  'deduct commission calculates the effective amount'
);

select set_config('request.jwt.claims', '{"sub":"c1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.confirm_cash_payment('c7000000-0000-0000-0000-000000000002', 'customer-confirm-0000001')$$,
  'customer cash confirmation records the first party'
);
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.confirm_cash_payment('c7000000-0000-0000-0000-000000000002', 'worker-confirm-0000001')$$,
  'worker cash confirmation completes the second party'
);
select is(
  (select commission_rate from public.payments where booking_id = 'c7000000-0000-0000-0000-000000000002'),
  0.0750::numeric,
  'cash confirmation stores the effective ratio'
);
select is(
  (select commission_amount from public.payments where booking_id = 'c7000000-0000-0000-0000-000000000002'),
  75.00::numeric,
  'cash confirmation calculates the effective amount'
);

select set_config('request.jwt.claims', '{"sub":"c1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.simulate_gcash_booking_payment('c7000000-0000-0000-0000-000000000003', 'MOCK-GCASH-C70000000000')$$,
  'simulated GCash payment uses the effective category rate'
);
select is(
  (select commission_rate from public.payments where booking_id = 'c7000000-0000-0000-0000-000000000003'),
  0.0750::numeric,
  'simulated GCash stores the effective ratio'
);

reset role;
insert into public.wallet_accounts(account_id)
values ('c2000000-0000-0000-0000-000000000001')
on conflict(account_id) do nothing;
insert into public.wallet_topups(
  wallet_account_id, status, amount_centavos, provider, idempotency_key,
  channel, reference_number, proof_path, submitted_at
) values (
  (select id from public.wallet_accounts where account_id = 'c2000000-0000-0000-0000-000000000001'),
  'PENDING', 25000, 'MANUAL', 'commission-topup-idempotency-1',
  'GCASH', 'GCASH-COMMISSION-1', 'c2000000-0000-0000-0000-000000000001/proof.png', now()
);
select set_config(
  'test.commission_topup_id',
  (select id::text from public.wallet_topups limit 1),
  true
);

select set_config('request.jwt.claims', '{"sub":"c2000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(
  (select count(*) from public.get_my_wallet_topups()),
  1::bigint,
  'worker can read only the worker-owned manual top-ups'
);
select is(
  (select status from public.get_my_wallet_topups() limit 1),
  'PENDING',
  'worker sees the pending approval status'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"c3000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(
  (select count(*) from public.get_my_wallet_topups()),
  0::bigint,
  'another worker or customer cannot read the top-up record'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"c9000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select ok(public.is_admin(true), 'AAL2 administrator can use the commission settings contract');
select lives_ok(
  $$select public.admin_review_wallet_topup(current_setting('test.commission_topup_id')::uuid, 'APPROVED', null)$$,
  'AAL2 admin approval completes a manual top-up'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"c2000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(
  (select status from public.get_my_wallet_topups() limit 1),
  'SUCCESSFUL',
  'worker sees the approved successful status'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"c9000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select lives_ok(
  $$select public.admin_set_service_category_commission_rate('c4000000-0000-0000-0000-000000000001', 12.50)$$,
  'AAL2 admin can set a service-category commission override'
);
select is(
  (select commission_rate_percent from public.service_categories where id = 'c4000000-0000-0000-0000-000000000001'),
  12.50::numeric,
  'admin commission update persists the override'
);
reset role;

select * from finish();
rollback;
