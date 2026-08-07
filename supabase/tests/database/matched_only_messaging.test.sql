begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

select has_column(
  'public',
  'conversations',
  'archived_at',
  'conversations support retained deletion'
);
select has_function(
  'public',
  'archive_closed_conversation',
  array['uuid'],
  'closed conversation archive RPC exists'
);
select has_function(
  'public',
  'delete_closed_conversation',
  array['uuid'],
  'closed conversation delete RPC exists'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.delete_closed_conversation(uuid)',
    'EXECUTE'
  ),
  true,
  'authenticated clients can permanently delete a closed conversation'
);
select is(
  has_function_privilege(
    'anon',
    'public.delete_closed_conversation(uuid)',
    'EXECUTE'
  ),
  false,
  'anonymous clients cannot permanently delete a conversation'
);
select hasnt_function(
  'public',
  'start_direct_chat',
  array['uuid'],
  'unrestricted direct chat RPC is removed'
);
select is(
  has_table_privilege('authenticated', 'public.conversations', 'insert'),
  false,
  'authenticated clients cannot create conversations directly'
);
select is(
  has_table_privilege(
    'authenticated',
    'public.conversation_participants',
    'insert'
  ),
  false,
  'authenticated clients cannot add arbitrary participants'
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
    'matched-chat-customer@example.test',
    '',
    now(),
    '{}',
    '{"role":"USER","name":"Matched Chat Customer"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a2000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'matched-chat-worker@example.test',
    '',
    now(),
    '{}',
    '{"role":"WORKER","name":"Matched Chat Worker"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a3000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'matched-chat-outsider@example.test',
    '',
    now(),
    '{}',
    '{"role":"USER","name":"Matched Chat Outsider"}',
    now(),
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
) values (
  'a4000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'Home',
  '1 Matched Chat Street',
  'Matched Barangay',
  'Matched City',
  'Matched Province',
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
  selected_worker_id,
  service_location
) values (
  'a5000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  (select id from public.service_categories where is_active order by created_at limit 1),
  'a4000000-0000-0000-0000-000000000001',
  'MATCHED',
  'Validate matched-only realtime messaging.',
  now() + interval '1 day',
  1000,
  'a2000000-0000-0000-0000-000000000001',
  extensions.st_setsrid(
    extensions.st_makepoint(121, 14),
    4326
  )::extensions.geography
);

insert into public.conversations(
  id,
  service_request_id,
  worker_account_id
) values
  (
    'a6000000-0000-0000-0000-000000000001',
    'a5000000-0000-0000-0000-000000000001',
    'a2000000-0000-0000-0000-000000000001'
  ),
  (
    'a6000000-0000-0000-0000-000000000002',
    null,
    null
  );

insert into public.conversation_participants(conversation_id, account_id)
values
  (
    'a6000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001'
  ),
  (
    'a6000000-0000-0000-0000-000000000001',
    'a2000000-0000-0000-0000-000000000001'
  ),
  (
    'a6000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000001'
  ),
  (
    'a6000000-0000-0000-0000-000000000002',
    'a2000000-0000-0000-0000-000000000001'
  );

select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select ok(
  public.chat_can_read('a6000000-0000-0000-0000-000000000001'),
  'customer can read a valid matched conversation'
);
select ok(
  not public.chat_can_read('a6000000-0000-0000-0000-000000000002'),
  'customer cannot read an unlinked direct conversation'
);
select throws_ok(
  $$select public.send_chat_message(
    'a6000000-0000-0000-0000-000000000002',
    'Blocked direct message'
  )$$,
  '42501',
  'CHAT_UNAVAILABLE',
  'direct conversation sending is rejected'
);
select lives_ok(
  $$select public.send_chat_message(
    'a6000000-0000-0000-0000-000000000001',
    'Allowed matched message'
  )$$,
  'matched customer can send'
);
select lives_ok(
  $$select public.start_worker_conversation(
    'a5000000-0000-0000-0000-000000000001',
    'a2000000-0000-0000-0000-000000000001'
  )$$,
  'customer can open the selected worker conversation'
);
select throws_ok(
  $$select public.archive_closed_conversation(
    'a6000000-0000-0000-0000-000000000001'
  )$$,
  '42501',
  'CONVERSATION_NOT_ARCHIVABLE',
  'active matched conversation cannot be deleted'
);
select throws_ok(
  $$select public.delete_closed_conversation(
    'a6000000-0000-0000-0000-000000000001'
  )$$,
  '42501',
  'CONVERSATION_NOT_ARCHIVABLE',
  'active matched conversation cannot be permanently deleted'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"a3000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select ok(
  not public.chat_can_read('a6000000-0000-0000-0000-000000000001'),
  'outsider cannot read the matched conversation'
);
select throws_ok(
  $$select public.send_chat_message(
    'a6000000-0000-0000-0000-000000000001',
    'Blocked outsider message'
  )$$,
  '42501',
  'CHAT_UNAVAILABLE',
  'outsider cannot send to the matched conversation'
);

reset role;
update public.service_requests
set selected_worker_id = null
where id = 'a5000000-0000-0000-0000-000000000001';

select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select ok(
  not public.chat_can_read('a6000000-0000-0000-0000-000000000001'),
  'conversation is unavailable when its worker is no longer selected'
);
select throws_ok(
  $$select public.start_worker_conversation(
    'a5000000-0000-0000-0000-000000000001',
    'a2000000-0000-0000-0000-000000000001'
  )$$,
  '42501',
  'CONVERSATION_UNAVAILABLE',
  'customer cannot open a conversation with an unselected worker'
);

reset role;
update public.service_requests
set selected_worker_id = 'a2000000-0000-0000-0000-000000000001'
where id = 'a5000000-0000-0000-0000-000000000001';

update public.service_requests
set status = 'CANCELLED'
where id = 'a5000000-0000-0000-0000-000000000001';

select set_config(
  'request.jwt.claims',
  '{"sub":"a2000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select throws_ok(
  $$select public.send_chat_message(
    'a6000000-0000-0000-0000-000000000001',
    'Blocked closed message'
  )$$,
  '42501',
  'CHAT_UNAVAILABLE',
  'closed matched conversation is read-only'
);
select lives_ok(
  $$select public.archive_closed_conversation(
    'a6000000-0000-0000-0000-000000000001'
  )$$,
  'participant can delete a closed conversation'
);
select ok(
  not public.chat_can_read('a6000000-0000-0000-0000-000000000001'),
  'archived conversation is hidden from the participant'
);

reset role;
select is(
  (
    select count(*)
    from public.conversations
    where id = 'a6000000-0000-0000-0000-000000000001'
      and archived_at is not null
  ),
  1::bigint,
  'archived conversation is retained for administration'
);
select is(
  (
    select count(*)
    from public.messages
    where conversation_id = 'a6000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'archived original messages are retained'
);

-- Permanent deletion uses its own closed conversation so the archived row
-- above remains untouched. The request is created closed so the gate allows
-- the owner to permanently delete it.
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
  'a8000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  (select id from public.service_categories where is_active order by created_at limit 1),
  'a4000000-0000-0000-0000-000000000001',
  'CANCELLED',
  'Validate permanent conversation deletion.',
  now() + interval '1 day',
  1000,
  'a2000000-0000-0000-0000-000000000001',
  extensions.st_setsrid(
    extensions.st_makepoint(121, 14),
    4326
  )::extensions.geography
);

insert into public.conversations(
  id,
  service_request_id,
  worker_account_id
) values (
  'a7000000-0000-0000-0000-000000000001',
  'a8000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001'
);

insert into public.conversation_participants(conversation_id, account_id)
values
  (
    'a7000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001'
  ),
  (
    'a7000000-0000-0000-0000-000000000001',
    'a2000000-0000-0000-0000-000000000001'
  );

insert into public.messages(conversation_id, sender_id, body)
values (
  'a7000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'Message to be removed with the conversation.'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a3000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select throws_ok(
  $$select public.delete_closed_conversation(
    'a7000000-0000-0000-0000-000000000001'
  )$$,
  '42501',
  'CONVERSATION_NOT_ARCHIVABLE',
  'outsider cannot permanently delete a conversation'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select lives_ok(
  $$select public.delete_closed_conversation(
    'a7000000-0000-0000-0000-000000000001'
  )$$,
  'participant can permanently delete a closed conversation'
);

reset role;
select is(
  (
    select count(*)
    from public.conversations
    where id = 'a7000000-0000-0000-0000-000000000001'
  ),
  0::bigint,
  'deleted conversation row is removed'
);
select is(
  (
    select count(*)
    from public.messages
    where conversation_id = 'a7000000-0000-0000-0000-000000000001'
  ),
  0::bigint,
  'deleted conversation messages cascade away'
);
select is(
  (
    select count(*)
    from public.conversation_participants
    where conversation_id = 'a7000000-0000-0000-0000-000000000001'
  ),
  0::bigint,
  'deleted conversation participants cascade away'
);

select * from finish();
rollback;
