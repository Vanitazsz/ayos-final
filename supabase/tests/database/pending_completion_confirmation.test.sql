begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select enum_has_labels(
  'public',
  'booking_status',
  array[
    'PENDING',
    'ACCEPTED',
    'WORKER_PREPARING',
    'WORKER_EN_ROUTE',
    'WORKER_ARRIVED',
    'SERVICE_STARTED',
    'IN_PROGRESS',
    'PENDING_CONFIRMATION',
    'COMPLETED',
    'CANCELLED'
  ],
  'booking status includes pending customer confirmation'
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
    'completion-user@example.test',
    '',
    now(),
    '{}',
    '{"role":"USER","name":"Completion User"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a2000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'completion-worker@example.test',
    '',
    now(),
    '{}',
    '{"role":"WORKER","name":"Completion Worker"}',
    now(),
    now()
  );

insert into public.accounts(id, role, email)
values
  (
    'a1000000-0000-0000-0000-000000000001',
    'USER',
    'completion-user@example.test'
  ),
  (
    'a2000000-0000-0000-0000-000000000001',
    'WORKER',
    'completion-worker@example.test'
  )
on conflict (id) do nothing;

insert into public.user_profiles(account_id, display_name)
values (
  'a1000000-0000-0000-0000-000000000001',
  'Completion User'
)
on conflict (account_id) do nothing;

insert into public.worker_profiles(account_id, display_name)
values (
  'a2000000-0000-0000-0000-000000000001',
  'Completion Worker'
)
on conflict (account_id) do nothing;

update public.worker_profiles
set approval_status = 'APPROVED',
    is_available = true
where account_id = 'a2000000-0000-0000-0000-000000000001';

insert into public.service_categories(id, name, is_active)
values ('a3000000-0000-0000-0000-000000000001', 'Completion Category', true);

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
  'a4000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'Home',
  '1 Completion Street',
  'Test Barangay',
  'Test City',
  'Test Province',
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
  selected_worker_id,
  service_location
) values (
  'a5000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'a3000000-0000-0000-0000-000000000001',
  'a4000000-0000-0000-0000-000000000001',
  'BOOKED',
  'Pending completion confirmation workflow',
  now() + interval '1 day',
  2500,
  'a2000000-0000-0000-0000-000000000001',
  extensions.st_setsrid(extensions.st_makepoint(121, 14), 4326)::extensions.geography
);

insert into public.bookings(
  id,
  service_request_id,
  user_account_id,
  worker_account_id,
  status,
  version,
  agreed_service_amount
) values (
  'a6000000-0000-0000-0000-000000000001',
  'a5000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001',
  'IN_PROGRESS',
  0,
  2500
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a2000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.transition_booking(
    'a6000000-0000-0000-0000-000000000001',
    'COMPLETED',
    0,
    null
  )$$,
  'P0001',
  'INVALID_BOOKING_TRANSITION',
  'worker cannot skip customer confirmation'
);
select lives_ok(
  $$select public.transition_booking(
    'a6000000-0000-0000-0000-000000000001',
    'PENDING_CONFIRMATION',
    0,
    null
  )$$,
  'worker can request customer completion confirmation'
);
select lives_ok(
  $$select public.transition_booking(
    'a6000000-0000-0000-0000-000000000001',
    'PENDING_CONFIRMATION',
    0,
    null
  )$$,
  'repeating an already-applied transition is idempotent'
);
select is(
  (
    select status::text
    from public.bookings
    where id = 'a6000000-0000-0000-0000-000000000001'
  ),
  'PENDING_CONFIRMATION',
  'booking waits for customer confirmation'
);
select is(
  (
    select completed_at
    from public.bookings
    where id = 'a6000000-0000-0000-0000-000000000001'
  ),
  null::timestamptz,
  'pending confirmation does not set completion time'
);
select is(
  (
    select status::text
    from public.service_requests
    where id = 'a5000000-0000-0000-0000-000000000001'
  ),
  'BOOKED',
  'pending confirmation keeps the request open'
);
select is(
  (
    select count(*)
    from public.addresses
    where id = 'a4000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'assigned worker retains address access while confirmation is pending'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.transition_booking(
    'a6000000-0000-0000-0000-000000000001',
    'COMPLETED',
    1,
    null
  )$$,
  'customer can confirm completion'
);
select is(
  (
    select status::text
    from public.bookings
    where id = 'a6000000-0000-0000-0000-000000000001'
  ),
  'COMPLETED',
  'customer confirmation completes the booking'
);
select isnt(
  (
    select completed_at
    from public.bookings
    where id = 'a6000000-0000-0000-0000-000000000001'
  ),
  null::timestamptz,
  'customer confirmation records completion time'
);
select is(
  (
    select status::text
    from public.service_requests
    where id = 'a5000000-0000-0000-0000-000000000001'
  ),
  'CLOSED',
  'customer confirmation closes the request'
);

reset role;
select * from finish();
rollback;
