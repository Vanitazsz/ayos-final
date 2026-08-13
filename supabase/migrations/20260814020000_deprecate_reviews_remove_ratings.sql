begin;

-- Deprecate and remove the customer review feature.
--
-- The `reviews` / `review_media` tables and their RPCs (create_review,
-- attach_review_media, set_review_vote, moderate_review) are removed. Worker
-- feedback now lives on `bookings.worker_proof_rating/comment` (submitted with
-- proof of work via attach_booking_proof) and `worker_feedback`. Functions that
-- aggregated review ratings for matching / live dispatch / worker ranking are
-- rewritten to return a neutral 0 rating while keeping their JSON contracts.

-- Storage: the review-media bucket is deleted via the Storage dashboard
-- (postgres is not the owner of storage.objects / storage.buckets, so the
-- protect_delete trigger and policy DDL cannot run from the migration role).
-- The storage.objects policy booking_proof_review_media_party_or_admin_read
-- (which referenced the removed review tables) is dropped automatically by the
-- drop table ... cascade below.

-- 1. Drop review RPCs --------------------------------------------------------

drop function if exists public.create_review(uuid, integer, text, boolean);
drop function if exists public.attach_review_media(uuid, text, text, bigint);
drop function if exists public.set_review_vote(uuid, boolean);
drop function if exists public.moderate_review(uuid, public.review_moderation_status);

-- 2. Rewrite functions that aggregated review ratings ------------------------

-- public.generate_matches: rating is now a neutral 0 (matching no longer uses
-- customer reviews; the JSON `factors.rating` key is preserved for clients).
create or replace function public.generate_matches(p_service_request_id uuid)
returns setof public.match_candidates
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.service_requests;
  weights jsonb;
  matched_count integer;
begin
  select * into request
  from public.service_requests
  where id = p_service_request_id
  for update;

  if request.id is null
    or request.user_account_id is distinct from auth.uid()
    or request.status not in ('OPEN', 'MATCHED')
  then
    raise exception using errcode = '42501', message = 'Service request unavailable';
  end if;

  select value into weights
  from public.system_settings
  where key = 'matching.weights';
  weights := coalesce(
    weights,
    '{"distance":0.30,"availability":0.20,"rating":0.20,"completed_jobs":0.10,"response_history":0.10,"cancellation_history":0.05,"priority":0.05}'::jsonb
  );

  delete from public.match_candidates
  where service_request_id = request.id;

  insert into public.match_candidates(
    service_request_id,
    worker_id,
    score,
    rank,
    factors,
    eligible
  )
  with candidates as (
    select
      worker.account_id as worker_id,
      skill.years,
      worker.recommendation_priority,
      eligibility.distance_meters,
      0 as rating,
      count(distinct booking.id) filter (where booking.status = 'COMPLETED') as completed_jobs,
      coalesce(
        count(distinct booking.id) filter (where booking.accepted_at is not null)::numeric
          / nullif(count(distinct booking.id), 0),
        1
      ) as response_rate,
      coalesce(
        count(distinct booking.id) filter (where booking.status = 'CANCELLED')::numeric
          / nullif(count(distinct booking.id), 0),
        0
      ) as cancellation_rate
    from private.worker_match_eligibility(request.id) eligibility
    join public.worker_profiles worker on worker.account_id = eligibility.worker_id
    join public.worker_skills skill
      on skill.worker_id = worker.account_id
      and skill.category_id = request.category_id
    left join public.bookings booking on booking.worker_account_id = worker.account_id
    where eligibility.eligible
    group by
      worker.account_id,
      skill.years,
      worker.recommendation_priority,
      eligibility.distance_meters
  ), scored as (
    select
      candidates.*,
      round((
        greatest(0, 100 - (distance_meters / 1000) * 5) * (weights->>'distance')::numeric
        + 100 * (weights->>'availability')::numeric
        + (rating / 5 * 100) * (weights->>'rating')::numeric
        + least(completed_jobs * 5, 100) * (weights->>'completed_jobs')::numeric
        + response_rate * 100 * (weights->>'response_history')::numeric
        + (1 - cancellation_rate) * 100 * (weights->>'cancellation_history')::numeric
        + (case when recommendation_priority then 100 else 0 end) * (weights->>'priority')::numeric
      )::numeric, 4) as total_score
    from candidates
  ), ranked as (
    select
      scored.*,
      row_number() over(order by total_score desc, worker_id)::integer as candidate_rank
    from scored
  )
  select
    request.id,
    worker_id,
    total_score,
    candidate_rank,
    jsonb_build_object(
      'category', true,
      'available', true,
      'years', years,
      'rating', rating,
      'completed_jobs', completed_jobs,
      'response_rate', response_rate,
      'cancellation_rate', cancellation_rate,
      'distance_meters', round(distance_meters::numeric, 2),
      'recommendation_priority', recommendation_priority,
      'weights', weights
    ),
    true
  from ranked
  where candidate_rank <= 5;

  get diagnostics matched_count = row_count;
  if matched_count > 0 then
    update public.service_requests set status = 'MATCHED' where id = request.id;
  else
    perform pgmq.send(
      'no_match_notifications',
      jsonb_build_object(
        'service_request_id', request.id,
        'user_account_id', request.user_account_id
      ),
      300
    );
  end if;

  return query
  select candidate.*
  from public.match_candidates candidate
  where candidate.service_request_id = request.id
  order by candidate.rank;
end
$$;

-- public.generate_matches_weighted_core: same neutral-rating treatment.
create or replace function public.generate_matches_weighted_core(p_service_request_id uuid)
returns setof public.match_candidates
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.service_requests;
  weights jsonb;
  matched_count integer;
begin
  select *
  into request
  from public.service_requests
  where id = p_service_request_id
  for update;

  if request.user_account_id is distinct from auth.uid()
    or request.status not in ('OPEN', 'MATCHED')
  then
    raise exception using errcode = '42501', message = 'Service request unavailable';
  end if;

  select value
  into weights
  from public.system_settings
  where key = 'matching.weights';

  weights := coalesce(
    weights,
    '{"distance":0.30,"rating":0.20,"completed_jobs":0.10,"response_history":0.10,"cancellation_history":0.05,"priority":0.05}'::jsonb
  );

  delete from public.match_candidates
  where service_request_id = request.id;

  insert into public.match_candidates(
    service_request_id,
    worker_id,
    score,
    rank,
    factors,
    eligible
  )
  with candidates as (
    select
      wp.account_id worker_id,
      ws.years,
      wp.recommendation_priority,
      extensions.st_distance(wp.service_origin, request.service_location) distance_meters,
      0 rating,
      count(distinct b.id) filter (where b.status = 'COMPLETED') completed_jobs,
      coalesce(
        count(distinct b.id) filter (where b.accepted_at is not null)::numeric
          / nullif(count(distinct b.id), 0),
        1
      ) response_rate,
      coalesce(
        count(distinct b.id) filter (where b.status = 'CANCELLED')::numeric
          / nullif(count(distinct b.id), 0),
        0
      ) cancellation_rate
    from public.worker_profiles wp
    join public.worker_skills ws
      on ws.worker_id = wp.account_id
     and ws.category_id = request.category_id
    left join public.bookings b on b.worker_account_id = wp.account_id
    where wp.account_id <> request.user_account_id
      and wp.approval_status = 'APPROVED'
      and wp.is_available
      and wp.service_origin is not null
      and wp.service_radius_meters is not null
      and extensions.st_dwithin(
        wp.service_origin,
        request.service_location,
        wp.service_radius_meters
      )
    group by wp.account_id, ws.years, wp.recommendation_priority, wp.service_origin
  ), scored as (
    select
      *,
      round((
        greatest(0, 100 - (distance_meters / 1000) * 5)
          * (weights->>'distance')::numeric
        + (rating / 5 * 100) * (weights->>'rating')::numeric
        + least(completed_jobs, 100) * (weights->>'completed_jobs')::numeric
        + response_rate * 100 * (weights->>'response_history')::numeric
        + (1 - cancellation_rate) * 100 * (weights->>'cancellation_history')::numeric
        + (case when recommendation_priority then 100 else 0 end)
          * (weights->>'priority')::numeric
      )::numeric, 4) total_score
    from candidates
  ), ranked as (
    select
      *,
      row_number() over (order by total_score desc, worker_id)::integer rank
    from scored
  )
  select
    request.id,
    worker_id,
    total_score,
    rank,
    jsonb_build_object(
      'category', true,
      'available', true,
      'years', years,
      'rating', rating,
      'completed_jobs', completed_jobs,
      'response_rate', response_rate,
      'cancellation_rate', cancellation_rate,
      'distance_meters', round(distance_meters::numeric, 2),
      'recommendation_priority', recommendation_priority,
      'weights', weights
    ),
    true
  from ranked
  where rank <= 5;

  get diagnostics matched_count = row_count;

  if matched_count > 0 then
    update public.service_requests
    set status = 'MATCHED'
    where id = request.id;
  else
    perform pgmq.send(
      'no_match_notifications',
      jsonb_build_object(
        'service_request_id', request.id,
        'user_account_id', request.user_account_id
      ),
      300
    );
  end if;

  return query
  select *
  from public.match_candidates
  where service_request_id = request.id
  order by rank;
end;
$$;

-- public.get_live_dispatch_snapshot: keep the JSON contract, drop the review
-- aggregation.
create or replace function public.get_live_dispatch_snapshot(
  p_service_request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.service_requests;
  session public.live_dispatch_sessions;
  result jsonb;
begin
  select *
  into request
  from public.service_requests
  where id = p_service_request_id
    and user_account_id = auth.uid();
  if request.id is null then
    raise exception using errcode = '42501', message = 'SERVICE_REQUEST_UNAVAILABLE';
  end if;

  perform private.refresh_live_dispatch(request.id);
  select *
  into session
  from public.live_dispatch_sessions
  where service_request_id = request.id;
  if session.started_at is null then
    raise exception using errcode = 'P0001', message = 'LIVE_DISPATCH_NOT_STARTED';
  end if;

  select jsonb_build_object(
    'serviceRequestId', request.id,
    'startedAt', session.started_at,
    'expiresAt', session.expires_at,
    'wave', coalesce(max(dispatch.wave), 1),
    'searchRadiusMeters', session.search_radius_meters,
    'diagnostics', private.live_dispatch_diagnostics(request.id, coalesce(max(dispatch.wave), 1)::smallint),
    'candidates', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'dispatchId', dispatch.id,
          'workerId', dispatch.worker_id,
          'status', dispatch.status,
          'name', worker.display_name,
          'avatar', worker.avatar_path,
          'distanceMeters', dispatch.distance_meters,
          'latitude', dispatch.approximate_latitude,
          'longitude', dispatch.approximate_longitude,
          'rating', 0,
          'reviewCount', 0,
          'rateMinor', skill.rate_minor
        )
        order by
          (dispatch.status = 'ACCEPTED') desc,
          dispatch.distance_meters
      ) filter (where dispatch.id is not null),
      '[]'::jsonb
    )
  )
  into result
  from public.service_request_dispatches dispatch
  join public.worker_profiles worker on worker.account_id = dispatch.worker_id
  join public.worker_skills skill
    on skill.worker_id = dispatch.worker_id
    and skill.category_id = request.category_id
  where dispatch.service_request_id = request.id
    and dispatch.status <> 'EXPIRED';
  return result;
end
$$;

-- public.permanently_delete: reviews can no longer be trashed/deleted.
create or replace function public.permanently_delete(p_trash_id uuid, p_confirmation text)
returns void
language plpgsql security definer set search_path = '' as $$
declare entry public.trash_entries;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  select item.* into entry
  from public.trash_entries item
  where item.id = p_trash_id and item.restored_at is null
  for update;
  if entry.id is null then
    raise exception using errcode = 'P0002', message = 'TRASH_ENTRY_NOT_FOUND';
  end if;
  if trim(coalesce(p_confirmation, '')) <> 'DELETE ' || entry.entity_id then
    raise exception using errcode = '22023', message = 'DELETE_CONFIRMATION_MISMATCH';
  end if;
  if entry.entity_type = 'service_template' then
    delete from public.service_templates template
    where template.id = entry.entity_id::uuid and template.archived_at is not null;
  else
    raise exception using errcode = '42501', message = 'TRASH_ENTITY_DELETE_NOT_ALLOWED';
  end if;
  delete from public.trash_entries item where item.id = entry.id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'PERMANENTLY_DELETED', entry.entity_type, entry.entity_id);
exception when foreign_key_violation then
  raise exception using errcode = '23503', message = 'DELETE_BLOCKED_BY_RELATED_RECORDS';
end $$;

-- public.empty_trash: reviews are no longer part of trash.
create or replace function public.empty_trash(p_confirmation text)
returns integer
language plpgsql security definer set search_path = '' as $$
declare entry public.trash_entries; deleted_count integer := 0;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  if trim(coalesce(p_confirmation, '')) <> 'EMPTY TRASH' then
    raise exception using errcode = '22023', message = 'EMPTY_TRASH_CONFIRMATION_MISMATCH';
  end if;
  for entry in
    select item.* from public.trash_entries item
    where item.restored_at is null and item.entity_type = 'service_template'
    order by item.deleted_at
    for update
  loop
    if entry.entity_type = 'service_template' then
      delete from public.service_templates template
      where template.id = entry.entity_id::uuid and template.archived_at is not null;
    end if;
    delete from public.trash_entries item where item.id = entry.id;
    deleted_count := deleted_count + 1;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id)
    values (auth.uid(), 'PERMANENTLY_DELETED', entry.entity_type, entry.entity_id);
  end loop;
  return deleted_count;
exception when foreign_key_violation then
  raise exception using errcode = '23503', message = 'DELETE_BLOCKED_BY_RELATED_RECORDS';
end $$;

-- 3. Drop review tables and their type ---------------------------------------

drop table if exists
  public.review_ai_insights,
  public.review_replies,
  public.review_reports,
  public.review_votes,
  public.review_media,
  public.reviews
cascade;

drop type if exists public.review_moderation_status;

-- 4. booking_proof_media.submitted_by is added by 20260814030000
-- (worker_proof_rating_comment), which runs after this migration.

notify pgrst, 'reload schema';

commit;
