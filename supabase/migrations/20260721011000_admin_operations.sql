create or replace function public.admin_upsert_service(p_id uuid,p_name text,p_category_id uuid,p_minimum_price_minor bigint,p_maximum_price_minor bigint,p_duration_minutes integer,p_is_active boolean)
returns public.services language plpgsql security definer set search_path='' as $$
declare result public.services; generated_slug text;
begin
  if not public.is_admin(true) then raise exception using errcode='42501',message='AAL2_ADMIN_REQUIRED'; end if;
  generated_slug:=trim(both '-' from regexp_replace(lower(btrim(p_name)),'[^a-z0-9]+','-','g'));
  if p_id is null then insert into public.services(category_id,slug,name,minimum_price_minor,maximum_price_minor,estimated_duration_minutes,is_active)
    values(p_category_id,generated_slug,btrim(p_name),p_minimum_price_minor,p_maximum_price_minor,p_duration_minutes,p_is_active) returning * into result;
  else update public.services set category_id=p_category_id,name=btrim(p_name),minimum_price_minor=p_minimum_price_minor,maximum_price_minor=p_maximum_price_minor,estimated_duration_minutes=p_duration_minutes,is_active=p_is_active,updated_at=now() where id=p_id returning * into result; end if;
  if result.id is null then raise exception using errcode='P0002',message='SERVICE_NOT_FOUND'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'SERVICE_UPSERTED','service',result.id::text); return result;
end $$;
create or replace function public.admin_upsert_category(p_id uuid,p_name text,p_is_active boolean) returns public.service_categories
language plpgsql security definer set search_path='' as $$
declare result public.service_categories; generated_slug text;
begin if not public.is_admin(true) then raise exception using errcode='42501',message='AAL2_ADMIN_REQUIRED'; end if;
generated_slug:=trim(both '-' from regexp_replace(lower(btrim(p_name)),'[^a-z0-9]+','-','g'));
if p_id is null then insert into public.service_categories(name,slug,is_active) values(btrim(p_name),generated_slug,p_is_active) returning * into result;
else update public.service_categories set name=btrim(p_name),slug=coalesce(slug,generated_slug),is_active=p_is_active,updated_at=now() where id=p_id returning * into result;end if;
if result.id is null then raise exception using errcode='P0002',message='CATEGORY_NOT_FOUND';end if;return result;end $$;
create or replace function public.admin_set_worker_availability(p_worker_id uuid,p_available boolean) returns public.worker_profiles
language plpgsql security definer set search_path='' as $$ declare result public.worker_profiles;begin if not public.is_admin(true) then raise exception using errcode='42501',message='AAL2_ADMIN_REQUIRED';end if;update public.worker_profiles set is_available=p_available,updated_at=now() where account_id=p_worker_id and approval_status='APPROVED' returning * into result;if result.account_id is null then raise exception using errcode='P0002',message='APPROVED_WORKER_NOT_FOUND';end if;return result;end $$;
create or replace function public.admin_publish_campaign(p_campaign_id uuid) returns public.notification_campaigns
language plpgsql security definer set search_path='' as $$
declare campaign public.notification_campaigns;recipient record;notification_id uuid;
begin if not public.is_admin(true) then raise exception using errcode='42501',message='AAL2_ADMIN_REQUIRED';end if;select * into campaign from public.notification_campaigns where id=p_campaign_id and status in ('DRAFT','SCHEDULED') for update;if campaign.id is null then raise exception using errcode='P0002',message='CAMPAIGN_NOT_PUBLISHABLE';end if;
for recipient in select a.id from public.accounts a where a.status='ACTIVE' and a.deleted_at is null and (campaign.audience='EVERYONE' or (campaign.audience='USERS' and a.role='USER') or (campaign.audience='WORKERS' and a.role='WORKER')) loop
 insert into public.notifications(recipient_id,title,body,category,status,sent_at,source_key) values(recipient.id,campaign.title,campaign.body,'CAMPAIGN','SENT',now(),'campaign:'||campaign.id::text) returning id into notification_id;
 insert into public.notification_deliveries(campaign_id,recipient_id,notification_id,status,delivered_at) values(campaign.id,recipient.id,notification_id,'DELIVERED',now()) on conflict do nothing;end loop;
update public.notification_campaigns set status='SENT',sent_at=now(),updated_at=now() where id=campaign.id returning * into campaign;return campaign;end $$;
revoke all on function public.admin_upsert_service(uuid,text,uuid,bigint,bigint,integer,boolean),public.admin_upsert_category(uuid,text,boolean),public.admin_set_worker_availability(uuid,boolean),public.admin_publish_campaign(uuid) from public,anon;
grant execute on function public.admin_upsert_service(uuid,text,uuid,bigint,bigint,integer,boolean),public.admin_upsert_category(uuid,text,boolean),public.admin_set_worker_availability(uuid,boolean),public.admin_publish_campaign(uuid) to authenticated;
