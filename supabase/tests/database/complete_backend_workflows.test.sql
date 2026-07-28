begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into private.admin_bootstrap_requests(email, token_hash, display_name, expires_at)
values ('integration-admin@example.test', encode(extensions.digest('integration-admin-token','sha256'),'hex'), 'Integration Admin', now() + interval '5 minutes');
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
  ('00000000-0000-0000-0000-000000000000','81000000-0000-0000-0000-000000000001','authenticated','authenticated','integration-admin@example.test','',now(),'{}','{"admin_bootstrap_token":"integration-admin-token"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','82000000-0000-0000-0000-000000000001','authenticated','authenticated','integration-user@example.test','',now(),'{}','{"role":"USER","name":"Integration User"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','83000000-0000-0000-0000-000000000001','authenticated','authenticated','integration-worker@example.test','',now(),'{}','{"role":"WORKER","name":"Integration Worker"}',now(),now());
update public.accounts set mfa_enabled = true where id = '81000000-0000-0000-0000-000000000001';
update public.worker_profiles set approval_status = 'APPROVED', is_available = true where account_id = '83000000-0000-0000-0000-000000000001';
insert into public.service_categories(id,name,is_active) values ('84000000-0000-0000-0000-000000000001','Integration Category',true);
insert into public.addresses(id,account_id,label,line1,barangay,city,province,is_default,location)
values ('85000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000001','Home','1 Test Street','Test Barangay','Test City','Test Province',true,extensions.st_setsrid(extensions.st_makepoint(121,14),4326)::extensions.geography);
insert into public.service_requests(id,user_account_id,category_id,address_id,status,description,scheduled_at,budget,selected_worker_id,service_location)
values
  ('86000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000001','84000000-0000-0000-0000-000000000001','85000000-0000-0000-0000-000000000001','BOOKED','Cancellation workflow request',now()+interval '1 day',1000,'83000000-0000-0000-0000-000000000001',extensions.st_setsrid(extensions.st_makepoint(121,14),4326)::extensions.geography),
  ('86000000-0000-0000-0000-000000000002','82000000-0000-0000-0000-000000000001','84000000-0000-0000-0000-000000000001','85000000-0000-0000-0000-000000000001','BOOKED','Transition guard request',now()+interval '2 days',1200,'83000000-0000-0000-0000-000000000001',extensions.st_setsrid(extensions.st_makepoint(121,14),4326)::extensions.geography);
insert into public.bookings(id,service_request_id,user_account_id,worker_account_id,status,version,agreed_service_amount)
values
  ('87000000-0000-0000-0000-000000000001','86000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001','PENDING',0,1000),
  ('87000000-0000-0000-0000-000000000002','86000000-0000-0000-0000-000000000002','82000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001','PENDING',0,1200);
insert into storage.objects(bucket_id,name,owner_id,metadata)
values
  ('topup-proofs','83000000-0000-0000-0000-000000000001/manual/proof.jpg','83000000-0000-0000-0000-000000000001','{"mimetype":"image/jpeg","size":1024}'),
  ('support-attachments','82000000-0000-0000-0000-000000000001/support/proof.jpg','82000000-0000-0000-0000-000000000001','{"mimetype":"image/jpeg","size":1024}');
insert into public.notifications(id,recipient_id,title,body,category,status)
values ('88000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000001','Integration notice','Integration notification body','SYSTEM','DRAFT');

select set_config('request.jwt.claims','{"sub":"82000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select lives_ok(
  $$select public.cancel_booking('87000000-0000-0000-0000-000000000001',0,'BEFORE_ACCEPTANCE','CUSTOMER_CHANGED_PLANS','Customer changed the requested schedule.','refund-v1')$$,
  'booking party can submit a structured cancellation'
);
select is((select status::text from public.bookings where id='87000000-0000-0000-0000-000000000001'),'CANCELLED','booking is cancelled atomically');
select is((select reason_code from public.cancellations where booking_id='87000000-0000-0000-0000-000000000001'),'CUSTOMER_CHANGED_PLANS','cancellation reason code is structured');
select is((select status::text from public.service_requests where id='86000000-0000-0000-0000-000000000001'),'CANCELLED','request follows cancellation state');
select is((select count(*) from public.service_requests),2::bigint,'authorized direct request reads do not recurse');
select throws_ok(
  $$select public.transition_booking('87000000-0000-0000-0000-000000000002','CANCELLED',0,'bypass')$$,
  '22023','USE_CANCEL_BOOKING','generic transition rejects cancellation bypass'
);
select lives_ok(
  $$select public.create_support_ticket(null,'Attachment help','I need help with the attached proof.','GENERAL','NORMAL')$$,
  'ticket owner can create a persisted support thread'
);
select lives_ok(
  $$select public.attach_support_message_media((select id from public.support_ticket_messages where sender_id='82000000-0000-0000-0000-000000000001' order by created_at desc limit 1),'82000000-0000-0000-0000-000000000001/support/proof.jpg','image/jpeg',1024)$$,
  'ticket owner can attach owned private support media'
);
select is((select count(*) from public.support_message_attachments),1::bigint,'support attachment is persisted once');

reset role;
select set_config('request.jwt.claims','{"sub":"83000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select lives_ok(
  $$select public.submit_manual_wallet_topup(50000,'GCASH','GCASH-REFERENCE-001','83000000-0000-0000-0000-000000000001/manual/proof.jpg','manual-topup-key-00000001')$$,
  'worker can submit an owned manual top-up proof'
);
select is((select status from public.wallet_topups where reference_number='GCASH-REFERENCE-001'),'PENDING','manual top-up waits for review');
select lives_ok(
  $$select public.submit_manual_wallet_topup(50000,'GCASH','GCASH-REFERENCE-001','83000000-0000-0000-0000-000000000001/manual/proof.jpg','manual-topup-key-00000001')$$,
  'manual top-up submission is idempotent'
);
select is((select count(*) from public.wallet_topups where reference_number='GCASH-REFERENCE-001'),1::bigint,'idempotent retry creates one top-up');

reset role;
select set_config('request.jwt.claims','{"sub":"81000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
set local role authenticated;
select throws_ok(
  $$select public.admin_review_wallet_topup((select id from public.wallet_topups where reference_number='GCASH-REFERENCE-001'),'APPROVED',null)$$,
  '42501','AAL2_ADMIN_REQUIRED','AAL1 administrator cannot approve wallet funds'
);

reset role;
select set_config('request.jwt.claims','{"sub":"81000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}',true);
set local role authenticated;
select lives_ok(
  $$select public.admin_review_wallet_topup((select id from public.wallet_topups where reference_number='GCASH-REFERENCE-001'),'APPROVED','Reference and proof verified')$$,
  'AAL2 administrator can approve a manual top-up'
);
select is((select status from public.wallet_topups where reference_number='GCASH-REFERENCE-001'),'SUCCESSFUL','approved top-up becomes successful');
select is((select count(*) from public.wallet_transactions where source_type='WALLET_TOPUP'),1::bigint,'approval credits the immutable ledger exactly once');
select throws_ok(
  $$select public.admin_review_wallet_topup((select id from public.wallet_topups where reference_number='GCASH-REFERENCE-001'),'APPROVED','retry')$$,
  '55000','TOPUP_CANNOT_BE_REVIEWED','completed top-up cannot be approved twice'
);
select lives_ok($$select public.admin_duplicate_notification('88000000-0000-0000-0000-000000000001')$$,'administrator can duplicate a notification');
select lives_ok($$select public.admin_send_notification_now('88000000-0000-0000-0000-000000000001')$$,'administrator can send a draft immediately');
select lives_ok($$select public.admin_archive_notification('88000000-0000-0000-0000-000000000001')$$,'administrator can archive a notification');
select is((select count(*) from public.trash_entries where entity_type='notification' and entity_id='88000000-0000-0000-0000-000000000001'),1::bigint,'notification archive creates a recoverable Trash record');

reset role;
select * from finish();
rollback;
