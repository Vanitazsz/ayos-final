-- Minimal commands and policies required to connect the verified Admin, User,
-- and Worker interfaces. Existing business tables and lifecycle rules remain
-- authoritative.

create or replace function public.admin_create_notification(
  p_audience public.notification_audience,
  p_title text,
  p_body text,
  p_category text,
  p_scheduled_at timestamptz default null
) returns public.notifications
language plpgsql security definer set search_path = '' as $$
declare
  result public.notifications;
  schedule_delay integer;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2 administrator required';
  end if;
  if length(trim(p_title)) not between 1 and 160
    or length(trim(p_body)) not between 1 and 4000
    or length(trim(p_category)) not between 1 and 80 then
    raise exception using errcode = '22023', message = 'Invalid notification';
  end if;
  if p_scheduled_at is not null and p_scheduled_at <= now() then
    raise exception using errcode = '22023', message = 'Scheduled time must be in the future';
  end if;

  insert into public.notifications(
    audience, title, body, category, status, scheduled_at, sent_at
  ) values (
    p_audience,
    trim(p_title),
    trim(p_body),
    upper(trim(p_category)),
    case when p_scheduled_at is null
      then 'SENT'::public.notification_status
      else 'SCHEDULED'::public.notification_status
    end,
    p_scheduled_at,
    case when p_scheduled_at is null then now() else null end
  ) returning * into result;

  if p_scheduled_at is not null then
    schedule_delay := greatest(0, extract(epoch from (p_scheduled_at - now()))::integer);
    perform pgmq.send(
      'scheduled_notifications',
      jsonb_build_object('notification_id', result.id),
      schedule_delay
    );
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'NOTIFICATION_CREATED',
    'notification',
    result.id::text,
    jsonb_build_object('audience', p_audience, 'status', result.status)
  );
  return result;
end $$;

create or replace function public.admin_upsert_service_category(
  p_category_id uuid,
  p_name text,
  p_description text,
  p_is_active boolean
) returns public.service_categories
language plpgsql security definer set search_path = '' as $$
declare
  result public.service_categories;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2 administrator required';
  end if;
  if length(trim(p_name)) not between 2 and 120
    or (p_description is not null and length(trim(p_description)) > 1000) then
    raise exception using errcode = '22023', message = 'Invalid service category';
  end if;

  if p_category_id is null then
    insert into public.service_categories(name, description, is_active)
    values (trim(p_name), nullif(trim(p_description), ''), p_is_active)
    returning * into result;
  else
    update public.service_categories
    set name = trim(p_name),
        description = nullif(trim(p_description), ''),
        is_active = p_is_active,
        updated_at = now()
    where id = p_category_id
    returning * into result;
    if result.id is null then
      raise exception using errcode = 'P0002', message = 'Service category not found';
    end if;
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'SERVICE_CATEGORY_UPSERTED',
    'service_category',
    result.id::text,
    jsonb_build_object('active', result.is_active)
  );
  return result;
end $$;

create or replace function public.attach_request_media(
  p_service_request_id uuid,
  p_storage_path text,
  p_content_type text,
  p_byte_size integer
) returns public.request_media
language plpgsql security definer set search_path = '' as $$
declare result public.request_media;
begin
  if not exists (
    select 1 from public.service_requests r
    where r.id = p_service_request_id and r.user_account_id = auth.uid()
  ) then
    raise exception using errcode = '42501', message = 'Service request unavailable';
  end if;
  if split_part(p_storage_path, '/', 1) <> auth.uid()::text
    or p_content_type not in ('image/jpeg', 'image/png', 'image/webp')
    or p_byte_size not between 1 and 15728640 then
    raise exception using errcode = '22023', message = 'Invalid request media';
  end if;
  insert into public.request_media(service_request_id, storage_path, content_type, byte_size)
  values (p_service_request_id, p_storage_path, p_content_type, p_byte_size)
  returning * into result;
  return result;
end $$;

create or replace function public.attach_review_media(
  p_review_id uuid,
  p_storage_path text,
  p_content_type text,
  p_byte_size integer
) returns public.review_media
language plpgsql security definer set search_path = '' as $$
declare result public.review_media;
begin
  if not exists (
    select 1 from public.reviews r
    where r.id = p_review_id and r.user_account_id = auth.uid()
  ) then
    raise exception using errcode = '42501', message = 'Review unavailable';
  end if;
  if split_part(p_storage_path, '/', 1) <> auth.uid()::text
    or p_content_type not in ('image/jpeg', 'image/png', 'image/webp')
    or p_byte_size not between 1 and 15728640 then
    raise exception using errcode = '22023', message = 'Invalid review media';
  end if;
  insert into public.review_media(review_id, storage_path, content_type, byte_size)
  values (p_review_id, p_storage_path, p_content_type, p_byte_size)
  returning * into result;
  return result;
end $$;

create or replace function public.save_ai_analysis(p_analysis_id uuid)
returns public.ai_analyses
language plpgsql security definer set search_path = '' as $$
declare result public.ai_analyses;
begin
  update public.ai_analyses
  set saved = true
  where id = p_analysis_id and account_id = auth.uid()
  returning * into result;
  if result.id is null then
    raise exception using errcode = '42501', message = 'AI analysis unavailable';
  end if;
  return result;
end $$;

create policy matching_worker_request_read
on public.service_requests for select to authenticated
using (
  exists (
    select 1 from public.match_candidates candidate
    where candidate.service_request_id = service_requests.id
      and candidate.worker_id = auth.uid()
      and candidate.eligible
  )
);

create policy matching_worker_request_media_read
on public.request_media for select to authenticated
using (
  exists (
    select 1 from public.match_candidates candidate
    where candidate.service_request_id = request_media.service_request_id
      and candidate.worker_id = auth.uid()
      and candidate.eligible
  )
);

create policy storage_matching_worker_request_media_read
on storage.objects for select to authenticated
using (
  bucket_id = 'request-media'
  and exists (
    select 1
    from public.request_media media
    join public.match_candidates candidate
      on candidate.service_request_id = media.service_request_id
    where media.storage_path = storage.objects.name
      and candidate.worker_id = auth.uid()
      and candidate.eligible
  )
);

revoke execute on function public.admin_create_notification(
  public.notification_audience, text, text, text, timestamptz
), public.admin_upsert_service_category(uuid, text, text, boolean),
public.attach_request_media(uuid, text, text, integer),
public.attach_review_media(uuid, text, text, integer),
public.save_ai_analysis(uuid)
from public, anon;

grant execute on function public.admin_create_notification(
  public.notification_audience, text, text, text, timestamptz
), public.admin_upsert_service_category(uuid, text, text, boolean),
public.attach_request_media(uuid, text, text, integer),
public.attach_review_media(uuid, text, text, integer),
public.save_ai_analysis(uuid)
to authenticated;
