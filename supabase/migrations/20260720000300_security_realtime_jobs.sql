-- RLS, direct-access grants, private Storage, Realtime, and background jobs.
do $$ declare t text; begin
  foreach t in array array[
    'accounts','user_profiles','worker_profiles','admin_profiles','worker_verifications','worker_availability','service_categories','worker_skills','addresses',
    'ai_analyses','service_requests','request_media','match_candidates','bookings','booking_status_events','cancellations','location_updates',
    'payments','cash_confirmations','receipts','refunds','reviews','review_media','conversations','conversation_participants','messages',
    'message_attachments','message_translations','notifications','support_tickets','content_pages','system_settings','trash_entries','audit_logs',
    'report_exports','favorites','job_failures'
  ] loop execute format('alter table public.%I enable row level security', t); end loop;
end $$;

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.service_categories, public.content_pages to anon;
grant select on all tables in schema public to authenticated;
grant update(display_name,avatar_path,notification_preferences) on public.user_profiles to authenticated;
grant update(display_name,avatar_path,bio,experience,service_area,latitude,longitude,is_available) on public.worker_profiles to authenticated;
grant insert, update, delete on public.worker_availability, public.worker_skills, public.addresses, public.favorites to authenticated;
grant insert on public.worker_verifications to authenticated;
grant update(identity_data,document_paths) on public.worker_verifications to authenticated;
grant insert on public.messages, public.message_attachments, public.support_tickets to authenticated;
grant update(read_at) on public.notifications to authenticated;

create policy accounts_self_or_admin_read on public.accounts for select to authenticated using(id=auth.uid() or public.is_admin(false));
create policy user_profile_self_or_admin_read on public.user_profiles for select to authenticated using(account_id=auth.uid() or public.is_admin(false));
create policy user_profile_self_update on public.user_profiles for update to authenticated using(account_id=auth.uid()) with check(account_id=auth.uid());
create policy worker_profile_discovery_read on public.worker_profiles for select to authenticated using(approval_status='APPROVED' or account_id=auth.uid() or public.is_admin(false));
create policy worker_profile_self_update on public.worker_profiles for update to authenticated using(account_id=auth.uid()) with check(account_id=auth.uid() and (approval_status='APPROVED' or not is_available));
create policy admin_profile_self_or_admin on public.admin_profiles for select to authenticated using(account_id=auth.uid() or public.is_admin(false));

create policy verification_owner_or_admin_read on public.worker_verifications for select to authenticated using(worker_id=auth.uid() or public.is_admin(false));
create policy verification_owner_insert on public.worker_verifications for insert to authenticated with check(worker_id=auth.uid() and public.current_role()='WORKER' and status='PENDING');
create policy verification_owner_pending_update on public.worker_verifications for update to authenticated using(worker_id=auth.uid() and status in ('PENDING','NEEDS_DOCUMENTS')) with check(worker_id=auth.uid() and status in ('PENDING','NEEDS_DOCUMENTS'));
create policy availability_read on public.worker_availability for select to authenticated using(true);
create policy availability_owner_write on public.worker_availability for all to authenticated using(worker_id=auth.uid()) with check(worker_id=auth.uid());
create policy categories_public_read on public.service_categories for select to anon, authenticated using(is_active or public.is_admin(false));
create policy skills_read on public.worker_skills for select to authenticated using(true);
create policy skills_owner_write on public.worker_skills for all to authenticated using(worker_id=auth.uid()) with check(worker_id=auth.uid());
create policy addresses_owner_or_admin_read on public.addresses for select to authenticated using(account_id=auth.uid() or public.is_admin(false));
create policy addresses_owner_write on public.addresses for all to authenticated using(account_id=auth.uid()) with check(account_id=auth.uid());

create policy analyses_owner_or_admin on public.ai_analyses for select to authenticated using(account_id=auth.uid() or public.is_admin(false));
create policy requests_authorized_read on public.service_requests for select to authenticated using(user_account_id=auth.uid() or selected_worker_id=auth.uid() or public.is_admin(false));
create policy request_media_authorized_read on public.request_media for select to authenticated using(exists(select 1 from public.service_requests r where r.id=service_request_id and (r.user_account_id=auth.uid() or r.selected_worker_id=auth.uid())) or public.is_admin(false));
create policy matches_authorized_read on public.match_candidates for select to authenticated using(worker_id=auth.uid() or exists(select 1 from public.service_requests r where r.id=service_request_id and r.user_account_id=auth.uid()) or public.is_admin(false));
create policy bookings_party_or_admin_read on public.bookings for select to authenticated using(public.is_booking_party(id));
create policy booking_events_party_or_admin_read on public.booking_status_events for select to authenticated using(public.is_booking_party(booking_id));
create policy cancellations_party_or_admin_read on public.cancellations for select to authenticated using(public.is_booking_party(booking_id));
create policy locations_party_or_admin_read on public.location_updates for select to authenticated using(public.is_booking_party(booking_id));

create policy payments_party_or_admin_read on public.payments for select to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id and public.is_booking_party(b.id)));
create policy confirmations_party_or_admin_read on public.cash_confirmations for select to authenticated using(exists(select 1 from public.payments p where p.id=payment_id and public.is_booking_party(p.booking_id)));
create policy receipts_party_or_admin_read on public.receipts for select to authenticated using(exists(select 1 from public.payments p where p.id=payment_id and public.is_booking_party(p.booking_id)));
create policy refunds_party_or_admin_read on public.refunds for select to authenticated using(exists(select 1 from public.payments p where p.id=payment_id and public.is_booking_party(p.booking_id)));
create policy reviews_visible_read on public.reviews for select to authenticated using(moderation_status='PUBLISHED' or user_account_id=auth.uid() or worker_account_id=auth.uid() or public.is_admin(false));
create policy review_media_visible_read on public.review_media for select to authenticated using(exists(select 1 from public.reviews r where r.id=review_id and (r.moderation_status='PUBLISHED' or r.user_account_id=auth.uid() or r.worker_account_id=auth.uid())) or public.is_admin(false));

create policy conversations_member_read on public.conversations for select to authenticated using(public.is_conversation_participant(id));
create policy participants_member_read on public.conversation_participants for select to authenticated using(public.is_conversation_participant(conversation_id));
create policy messages_member_read on public.messages for select to authenticated using(public.is_conversation_participant(conversation_id));
create policy messages_member_insert on public.messages for insert to authenticated with check(sender_id=auth.uid() and public.is_conversation_participant(conversation_id));
create policy attachments_member_read on public.message_attachments for select to authenticated using(exists(select 1 from public.messages m where m.id=message_id and public.is_conversation_participant(m.conversation_id)));
create policy attachments_sender_insert on public.message_attachments for insert to authenticated with check(exists(select 1 from public.messages m where m.id=message_id and m.sender_id=auth.uid() and public.is_conversation_participant(m.conversation_id)));
create policy translations_member_read on public.message_translations for select to authenticated using(exists(select 1 from public.messages m where m.id=message_id and public.is_conversation_participant(m.conversation_id)));

create policy notifications_recipient_read on public.notifications for select to authenticated using(recipient_id=auth.uid() or (audience='EVERYONE') or (audience='USERS' and public.current_role()='USER') or (audience='WORKERS' and public.current_role()='WORKER') or public.is_admin(false));
create policy notifications_recipient_update on public.notifications for update to authenticated using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());
create policy tickets_owner_or_admin_read on public.support_tickets for select to authenticated using(owner_id=auth.uid() or public.is_admin(false));
create policy tickets_owner_insert on public.support_tickets for insert to authenticated with check(owner_id=auth.uid());
create policy content_published_read on public.content_pages for select to anon, authenticated using(published_at is not null or public.is_admin(false));
create policy settings_admin_read on public.system_settings for select to authenticated using(public.is_admin(false));
create policy trash_admin_read on public.trash_entries for select to authenticated using(public.is_admin(true));
create policy audit_admin_read on public.audit_logs for select to authenticated using(public.is_admin(true));
create policy exports_admin_read on public.report_exports for select to authenticated using(public.is_admin(true));
create policy favorites_owner_read on public.favorites for select to authenticated using(user_account_id=auth.uid());
create policy favorites_owner_write on public.favorites for all to authenticated using(user_account_id=auth.uid()) with check(user_account_id=auth.uid());
create policy job_failures_admin_read on public.job_failures for select to authenticated using(public.is_admin(true));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('request-media','request-media',false,15728640,array['image/jpeg','image/png','image/webp']),
 ('verification-documents','verification-documents',false,15728640,array['image/jpeg','image/png','application/pdf']),
 ('message-attachments','message-attachments',false,15728640,array['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/wav']),
 ('review-media','review-media',false,15728640,array['image/jpeg','image/png','image/webp']),
 ('profile-images','profile-images',false,5242880,array['image/jpeg','image/png','image/webp']),
 ('report-exports','report-exports',false,52428800,array['text/csv','application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy storage_owner_upload on storage.objects for insert to authenticated with check(bucket_id in ('request-media','verification-documents','message-attachments','review-media','profile-images') and (storage.foldername(name))[1]=auth.uid()::text);
create policy storage_owner_update on storage.objects for update to authenticated using(owner_id=auth.uid()::text) with check(owner_id=auth.uid()::text);
create policy storage_owner_delete on storage.objects for delete to authenticated using(owner_id=auth.uid()::text);
create policy storage_authorized_read on storage.objects for select to authenticated using(
  owner_id=auth.uid()::text
  or public.is_admin(false)
  or (bucket_id='message-attachments' and exists(
    select 1 from public.message_attachments a join public.messages m on m.id=a.message_id
    where a.storage_path=name and public.is_conversation_participant(m.conversation_id)
  ))
  or (bucket_id='request-media' and exists(
    select 1 from public.request_media rm join public.service_requests sr on sr.id=rm.service_request_id
    where rm.storage_path=name and (sr.user_account_id=auth.uid() or sr.selected_worker_id=auth.uid())
  ))
  or (bucket_id='review-media' and exists(
    select 1 from public.review_media media join public.reviews review on review.id=media.review_id
    where media.storage_path=name and (review.user_account_id=auth.uid() or (review.worker_account_id=auth.uid() and review.moderation_status='PUBLISHED'))
  ))
);
create policy report_exports_admin_storage on storage.objects for all to authenticated using(bucket_id='report-exports' and public.is_admin(true)) with check(bucket_id='report-exports' and public.is_admin(true));

-- Supabase owns and already enables RLS on realtime.messages. Hosted projects
-- allow application policies here but reject ALTER TABLE ownership operations.
create policy realtime_booking_read on realtime.messages for select to authenticated using(
  extension='broadcast' and split_part(realtime.topic(),':',1)='booking' and public.is_booking_party(split_part(realtime.topic(),':',2)::uuid)
);
create policy realtime_conversation_read on realtime.messages for select to authenticated using(
  extension='broadcast' and split_part(realtime.topic(),':',1)='conversation' and public.is_conversation_participant(split_part(realtime.topic(),':',2)::uuid)
);
create policy realtime_notification_read on realtime.messages for select to authenticated using(
  extension='broadcast' and realtime.topic()='user:'||auth.uid()::text||':notifications'
);

create or replace function public.broadcast_application_change() returns trigger language plpgsql security definer set search_path='' as $$
declare topic text;
begin
  if tg_table_name='bookings' then topic := 'booking:'||new.id::text||':status';
  elsif tg_table_name='location_updates' then topic := 'booking:'||new.booking_id::text||':location';
  elsif tg_table_name='messages' then topic := 'conversation:'||new.conversation_id::text||':messages';
  elsif tg_table_name='notifications' and new.recipient_id is not null then topic := 'user:'||new.recipient_id::text||':notifications';
  end if;
  if topic is not null then perform realtime.broadcast_changes(topic,tg_op,tg_op,tg_table_name,tg_table_schema,new,old); end if;
  return coalesce(new,old);
end $$;
create trigger broadcast_booking_change after insert or update on public.bookings for each row execute function public.broadcast_application_change();
create trigger broadcast_location_change after insert on public.location_updates for each row execute function public.broadcast_application_change();
create trigger broadcast_message_change after insert on public.messages for each row execute function public.broadcast_application_change();
create trigger broadcast_notification_change after insert or update on public.notifications for each row execute function public.broadcast_application_change();

select pgmq.create('booking_timeouts');
select pgmq.create('no_match_notifications');
select pgmq.create('scheduled_notifications');
select pgmq.create('provider_work');

create or replace function private.invoke_queue_consumer() returns void language plpgsql security definer set search_path='' as $$
declare project_url text; invocation_secret text;
begin
  select decrypted_secret into project_url from vault.decrypted_secrets where name='project_url' limit 1;
  select decrypted_secret into invocation_secret from vault.decrypted_secrets where name='queue_consumer_secret' limit 1;
  if project_url is null or invocation_secret is null then return; end if;
  perform net.http_post(url:=project_url||'/functions/v1/queue-consumer',headers:=jsonb_build_object('content-type','application/json','x-ayos-queue-secret',invocation_secret),body:='{}'::jsonb,timeout_milliseconds:=10000);
end $$;
select cron.schedule('ayos-queue-consumer','* * * * *','select private.invoke_queue_consumer()');
