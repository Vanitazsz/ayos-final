begin;

create or replace function public.attach_review_media(
  p_review_id uuid,
  p_storage_path text,
  p_content_type text,
  p_byte_size bigint
) returns public.review_media
language plpgsql security definer set search_path=''
as $$
declare result public.review_media;
begin
  if not exists (
    select 1 from public.reviews
    where id=p_review_id and user_account_id=auth.uid()
  ) then raise exception using errcode='42501', message='Review unavailable'; end if;
  if p_storage_path not like auth.uid()::text || '/%' then
    raise exception using errcode='42501', message='Invalid storage ownership';
  end if;
  if p_content_type not in ('image/jpeg','image/png','image/webp','image/heic')
     or p_byte_size not between 1 and 10485760 then
    raise exception using errcode='22023', message='Invalid review media';
  end if;
  insert into public.review_media(review_id,storage_path,content_type,byte_size)
  values(p_review_id,p_storage_path,p_content_type,p_byte_size)
  returning * into result;
  return result;
end $$;

revoke all on function public.attach_review_media(uuid,text,text,bigint) from public;
grant execute on function public.attach_review_media(uuid,text,text,bigint) to authenticated;

create or replace function public.set_review_vote(p_review_id uuid, p_helpful boolean)
returns public.review_votes
language plpgsql security definer set search_path=''
as $$
declare result public.review_votes;
begin
  if not exists(select 1 from public.reviews where id=p_review_id and moderation_status='PUBLISHED') then
    raise exception using errcode='22023', message='Published review required';
  end if;
  insert into public.review_votes(review_id,account_id,helpful)
  values(p_review_id,auth.uid(),p_helpful)
  on conflict(review_id,account_id) do update set helpful=excluded.helpful
  returning * into result;
  return result;
end $$;

revoke all on function public.set_review_vote(uuid,boolean) from public;
grant execute on function public.set_review_vote(uuid,boolean) to authenticated;

create or replace function public.generate_matches(p_service_request_id uuid)
returns setof public.match_candidates
language plpgsql security definer set search_path=''
as $$
declare request public.service_requests; weights jsonb; matched_count integer;
begin
  select * into request from public.service_requests where id=p_service_request_id for update;
  if request.user_account_id is distinct from auth.uid() or request.status not in ('OPEN','MATCHED') then
    raise exception using errcode='42501',message='Service request unavailable';
  end if;
  select value into weights from public.system_settings where key='matching.weights';
  weights:=coalesce(weights,'{"distance":0.30,"availability":0.20,"rating":0.20,"completed_jobs":0.10,"response_history":0.10,"cancellation_history":0.05,"priority":0.05}'::jsonb);
  delete from public.match_candidates where service_request_id=request.id;
  insert into public.match_candidates(service_request_id,worker_id,score,rank,factors,eligible)
  with candidates as (
    select wp.account_id worker_id,ws.years,wp.recommendation_priority,
      extensions.st_distance(wp.service_origin,request.service_location) distance_meters,
      coalesce(avg(rv.stars) filter(where rv.moderation_status='PUBLISHED'),0) rating,
      count(distinct b.id) filter(where b.status='COMPLETED') completed_jobs,
      coalesce(count(distinct b.id) filter(where b.accepted_at is not null)::numeric/nullif(count(distinct b.id),0),1) response_rate,
      coalesce(count(distinct b.id) filter(where b.status='CANCELLED')::numeric/nullif(count(distinct b.id),0),0) cancellation_rate
    from public.worker_profiles wp
    join public.worker_skills ws on ws.worker_id=wp.account_id and ws.category_id=request.category_id
    left join public.reviews rv on rv.worker_account_id=wp.account_id
    left join public.bookings b on b.worker_account_id=wp.account_id
    where wp.account_id<>request.user_account_id and wp.approval_status='APPROVED' and wp.is_available
      and wp.service_origin is not null and wp.service_radius_meters is not null
      and extensions.st_dwithin(wp.service_origin,request.service_location,wp.service_radius_meters)
      and exists(select 1 from public.worker_availability wa where wa.worker_id=wp.account_id and wa.day_of_week=extract(dow from request.scheduled_at)::integer and request.scheduled_at::time between wa.start_time and wa.end_time)
    group by wp.account_id,ws.years,wp.recommendation_priority,wp.service_origin
  ), scored as (
    select *,round((
      greatest(0,100-(distance_meters/1000)*5)*(weights->>'distance')::numeric+
      100*(weights->>'availability')::numeric+
      (rating/5*100)*(weights->>'rating')::numeric+
      least(completed_jobs,100)*(weights->>'completed_jobs')::numeric+
      response_rate*100*(weights->>'response_history')::numeric+
      (1-cancellation_rate)*100*(weights->>'cancellation_history')::numeric+
      (case when recommendation_priority then 100 else 0 end)*(weights->>'priority')::numeric
    )::numeric,4) total_score
    from candidates
  ), ranked as (
    select *,row_number() over(order by total_score desc,worker_id)::integer rank from scored
  )
  select request.id,worker_id,total_score,rank,
    jsonb_build_object('category',true,'available',true,'years',years,'rating',rating,'completed_jobs',completed_jobs,'response_rate',response_rate,'cancellation_rate',cancellation_rate,'distance_meters',round(distance_meters::numeric,2),'recommendation_priority',recommendation_priority,'weights',weights),true
  from ranked where rank<=5;
  get diagnostics matched_count=row_count;
  if matched_count>0 then update public.service_requests set status='MATCHED' where id=request.id;
  else perform pgmq.send('no_match_notifications',jsonb_build_object('service_request_id',request.id,'user_account_id',request.user_account_id),300); end if;
  return query select * from public.match_candidates where service_request_id=request.id order by rank;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('service-request-media','service-request-media',false,15728640,array['image/jpeg','image/png','image/webp','image/heic','audio/m4a','audio/mp4','audio/mpeg','audio/wav']),
 ('review-media','review-media',false,10485760,array['image/jpeg','image/png','image/webp','image/heic']),
 ('verification-documents','verification-documents',false,15728640,array['image/jpeg','image/png','image/webp','application/pdf']),
 ('chat-attachments','chat-attachments',false,15728640,array['image/jpeg','image/png','image/webp','application/pdf']),
 ('support-attachments','support-attachments',false,15728640,array['image/jpeg','image/png','image/webp','application/pdf']),
 ('report-exports','report-exports',false,52428800,array['text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/pdf'])
on conflict(id) do nothing;

create policy "authenticated_uploads_owned_path" on storage.objects for insert to authenticated
with check (
  bucket_id = any(array['service-request-media','review-media','verification-documents','chat-attachments','support-attachments'])
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "authenticated_reads_owned_path" on storage.objects for select to authenticated
using (
  bucket_id = any(array['service-request-media','review-media','verification-documents','chat-attachments','support-attachments','report-exports'])
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin(false))
);
create policy "authenticated_updates_owned_path" on storage.objects for update to authenticated
using ((storage.foldername(name))[1] = auth.uid()::text)
with check ((storage.foldername(name))[1] = auth.uid()::text);
create policy "authenticated_deletes_owned_path" on storage.objects for delete to authenticated
using ((storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.cancel_admin_bootstrap(email text, token_hash text)
returns void language plpgsql security definer set search_path=''
as $$
begin
  if auth.role()<>'service_role' then raise exception using errcode='42501',message='SERVICE_ROLE_REQUIRED'; end if;
  delete from private.admin_bootstrap_requests request
  where request.email=lower(btrim($1)) and request.token_hash=$2;
end $$;

commit;
