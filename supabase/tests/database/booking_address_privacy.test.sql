begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

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
    '98000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'privacy-user@example.test',
    '',
    now(),
    '{}',
    '{"role":"USER","name":"Privacy User"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '98000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'privacy-worker@example.test',
    '',
    now(),
    '{}',
    '{"role":"WORKER","name":"Privacy Worker"}',
    now(),
    now()
  );
insert into public.service_categories(id, name, is_active)
values ('98000000-0000-0000-0000-000000000003', 'Privacy Service', true);
update public.accounts
set status = 'ACTIVE'
where id = '98000000-0000-0000-0000-000000000002';
update public.worker_profiles
set approval_status = 'APPROVED',
    is_available = true,
    service_origin = extensions.st_setsrid(extensions.st_makepoint(121, 14), 4326)::extensions.geography,
    service_radius_meters = 10000
where account_id = '98000000-0000-0000-0000-000000000002';
insert into public.worker_skills(worker_id, category_id, years, rate_minor)
values (
  '98000000-0000-0000-0000-000000000002',
  '98000000-0000-0000-0000-000000000003',
  3,
  100000
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
) values (
  '98000000-0000-0000-0000-000000000004',
  '98000000-0000-0000-0000-000000000001',
  'Home',
  'Private Exact Address',
  'Privacy Barangay',
  'Privacy City',
  'Privacy Province',
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
  '98000000-0000-0000-0000-000000000005',
  '98000000-0000-0000-0000-000000000001',
  '98000000-0000-0000-0000-000000000003',
  '98000000-0000-0000-0000-000000000004',
  'BOOKED',
  'Validate private address visibility for assigned worker.',
  now() + interval '1 day',
  1000,
  '98000000-0000-0000-0000-000000000002',
  extensions.st_setsrid(extensions.st_makepoint(121, 14), 4326)::extensions.geography
);
insert into public.bookings(
  id,
  service_request_id,
  user_account_id,
  worker_account_id,
  status,
  agreed_service_amount
) values (
  '98000000-0000-0000-0000-000000000006',
  '98000000-0000-0000-0000-000000000005',
  '98000000-0000-0000-0000-000000000001',
  '98000000-0000-0000-0000-000000000002',
  'PENDING',
  1000
);

select set_config(
  'request.jwt.claims',
  '{"sub":"98000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select is(
  (
    select count(*)
    from public.addresses
    where id = '98000000-0000-0000-0000-000000000004'
  ),
  0::bigint,
  'assigned worker cannot read exact address before acceptance'
);

reset role;
update public.bookings
set status = 'ACCEPTED'
where id = '98000000-0000-0000-0000-000000000006';
set local role authenticated;
select is(
  (
    select count(*)
    from public.addresses
    where id = '98000000-0000-0000-0000-000000000004'
  ),
  1::bigint,
  'accepted worker can read the exact service address'
);

select * from finish();
rollback;
