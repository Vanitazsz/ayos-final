alter table public.booking_status_events alter column actor_id drop not null;

create or replace function public.admin_upsert_content(content_key public.content_key, title text, body text, version text, publish boolean)
returns public.content_pages language plpgsql security definer set search_path='' as $$
declare result public.content_pages;
begin
  if not public.is_admin(true) then raise exception using errcode='42501',message='AAL2 administrator required'; end if;
  insert into public.content_pages(key,title,body,version,published_at,updated_by)
  values(content_key,trim(title),body,trim(version),case when publish then now() else null end,auth.uid())
  on conflict(key) do update set title=excluded.title,body=excluded.body,version=excluded.version,published_at=excluded.published_at,updated_by=auth.uid()
  returning * into result;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'CONTENT_UPDATED','content_page',result.id::text);
  return result;
end $$;

create or replace function public.set_admin_mfa_enabled(enabled boolean) returns public.accounts language plpgsql security definer set search_path='' as $$
declare result public.accounts;
begin
  if public.current_role() <> 'ADMIN' or coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then raise exception using errcode='42501',message='AAL2 administrator required'; end if;
  update public.accounts set mfa_enabled=enabled where id=auth.uid() returning * into result;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'ADMIN_MFA_CHANGED','account',auth.uid()::text,jsonb_build_object('enabled',enabled));
  return result;
end $$;

create or replace function public.admin_set_setting(setting_key text, setting_value jsonb)
returns public.system_settings language plpgsql security definer set search_path='' as $$
declare result public.system_settings;
begin
  if not public.is_admin(true) then raise exception using errcode='42501',message='AAL2 administrator required'; end if;
  insert into public.system_settings(key,value,updated_by) values(setting_key,setting_value,auth.uid())
  on conflict(key) do update set value=excluded.value,updated_by=auth.uid(),updated_at=now() returning * into result;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'SETTING_UPDATED','system_setting',setting_key);
  return result;
end $$;

create or replace function public.moderate_review(review_id uuid, decision public.review_moderation_status)
returns public.reviews language plpgsql security definer set search_path='' as $$
declare result public.reviews;
begin
  if not public.is_admin(true) or decision not in ('PUBLISHED','REJECTED') then raise exception using errcode='42501',message='AAL2 administrator required'; end if;
  update public.reviews set moderation_status=decision,moderated_by=auth.uid(),moderated_at=now() where id=review_id returning * into result;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'REVIEW_MODERATED','review',review_id::text,jsonb_build_object('decision',decision));
  return result;
end $$;

create or replace function public.update_support_ticket(p_ticket_id uuid, p_next_status public.ticket_status, p_resolution text default null)
returns public.support_tickets language plpgsql security definer set search_path='' as $$
declare result public.support_tickets;
begin
  if not public.is_admin(true) then raise exception using errcode='42501',message='AAL2 administrator required'; end if;
  update public.support_tickets t set status=p_next_status,resolution=p_resolution,
    escalated_at=case when p_next_status='ESCALATED' then now() else t.escalated_at end,
    resolved_at=case when p_next_status='RESOLVED' then now() else t.resolved_at end,
    closed_at=case when p_next_status='CLOSED' then now() else t.closed_at end
  where t.id=p_ticket_id returning * into result;
  return result;
end $$;

create or replace function public.read_job_batch(queue_name text, visibility_seconds integer default 60, batch_size integer default 10)
returns setof jsonb language plpgsql security definer set search_path='' as $$
begin
  if auth.role() <> 'service_role' then raise exception using errcode='42501',message='Service role required'; end if;
  return query execute format('select to_jsonb(x) from pgmq.read(%L,%s,%s) x',queue_name,greatest(visibility_seconds,10),least(greatest(batch_size,1),100));
end $$;
create or replace function public.archive_job(queue_name text, message_id bigint) returns boolean language plpgsql security definer set search_path='' as $$
declare archived boolean;
begin
  if auth.role() <> 'service_role' then raise exception using errcode='42501',message='Service role required'; end if;
  execute format('select pgmq.archive(%L,%s)',queue_name,message_id) into archived; return archived;
end $$;
create or replace function public.expire_booking_request(target_booking uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare booking public.bookings;
begin
  if auth.role() <> 'service_role' then raise exception using errcode='42501',message='Service role required'; end if;
  select * into booking from public.bookings where id=target_booking for update;
  if booking.status <> 'PENDING' or booking.response_due_at > now() then return false; end if;
  update public.bookings set status='CANCELLED',cancelled_at=now(),version=version+1 where id=booking.id;
  insert into public.booking_status_events(booking_id,from_status,to_status,reason) values(booking.id,'PENDING','CANCELLED','Booking response timed out');
  update public.service_requests set status='OPEN',selected_worker_id=null,notify_on_match=true where id=booking.service_request_id;
  insert into public.notifications(recipient_id,title,body,category,status,sent_at) values(booking.user_account_id,'Worker response timed out','Choose another recommended worker.','BOOKING','SENT',now());
  return true;
end $$;

revoke execute on function public.read_job_batch(text,integer,integer), public.archive_job(text,bigint), public.expire_booking_request(uuid) from public, anon, authenticated;
grant execute on function public.read_job_batch(text,integer,integer), public.archive_job(text,bigint), public.expire_booking_request(uuid) to service_role;
grant execute on function public.admin_upsert_content(public.content_key,text,text,text,boolean), public.admin_set_setting(text,jsonb), public.moderate_review(uuid,public.review_moderation_status), public.update_support_ticket(uuid,public.ticket_status,text), public.set_admin_mfa_enabled(boolean) to authenticated;

-- PostgreSQL grants function execution to PUBLIC by default. Remove that implicit
-- access so exposed RPCs are callable only by roles granted explicitly above or
-- by the authenticated grants established in the domain migration.
revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_admin(boolean), public.current_role() to anon;
