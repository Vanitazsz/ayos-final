begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

select has_table('public','pending_worker_registrations','pending worker registrations table exists');
select col_is_pk('public','pending_worker_registrations','resume_token','resume token is the primary key');
select has_column('public','pending_worker_registrations','email','pending registration stores the applicant email');
select has_column('public','pending_worker_registrations','payload','pending registration stores the full application payload');
select has_column('public','pending_worker_registrations','expires_at','pending registration expires');
select has_function('public','save_pending_worker_registration',array['text','text','jsonb'],'save RPC exists');
select has_function('public','get_pending_worker_registration',array['text'],'get RPC exists');
select has_function('public','clear_pending_worker_registration',array['text'],'clear RPC exists');

-- save / get round-trip
select lives_ok(
  $$select public.save_pending_worker_registration('token-a', 'worker@example.test', '{"email":"worker@example.test"}'::jsonb)$$,
  'save accepts a valid payload'
);
select is(
  (select public.get_pending_worker_registration('token-a')),
  '{"email":"worker@example.test"}'::jsonb,
  'get returns the saved payload'
);

-- save upserts the same token
select lives_ok(
  $$select public.save_pending_worker_registration('token-a', 'other@example.test', '{"email":"other@example.test"}'::jsonb)$$,
  'save upserts an existing token'
);
select is(
  (select public.get_pending_worker_registration('token-a')),
  '{"email":"other@example.test"}'::jsonb,
  'get returns the updated payload after upsert'
);

-- get returns null for an unknown token
select is(
  (select public.get_pending_worker_registration('missing-token')),
  null,
  'get returns null for an unknown token'
);

-- get returns null once the row has expired
insert into public.pending_worker_registrations(resume_token, email, payload, expires_at)
values ('expired-token', 'expired@example.test', '{"email":"expired@example.test"}'::jsonb, now() - interval '1 minute');
select is(
  (select public.get_pending_worker_registration('expired-token')),
  null,
  'get hides expired rows'
);

-- clear removes the row
select lives_ok(
  $$select public.clear_pending_worker_registration('token-a')$$,
  'clear deletes a pending registration'
);
select is(
  (select public.get_pending_worker_registration('token-a')),
  null,
  'get returns null after clear'
);

-- oversized payloads are rejected
select throws_ok(
  $$select public.save_pending_worker_registration('big-token', 'big@example.test', jsonb_build_object('data', repeat('x', 6*1024*1024 + 1)))$$,
  '22023',
  'PAYLOAD_TOO_LARGE',
  'oversized payloads are rejected'
);

-- empty tokens are rejected
select throws_ok(
  $$select public.save_pending_worker_registration('', 'empty@example.test', '{}'::jsonb)$$,
  '22023',
  'INVALID_RESUME_TOKEN',
  'empty resume tokens are rejected'
);

select * from finish();
rollback;
