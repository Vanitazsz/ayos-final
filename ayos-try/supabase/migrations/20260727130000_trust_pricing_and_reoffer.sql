begin;

-- Worker-owned pricing -------------------------------------------------------

alter table public.worker_skills
  add column if not exists rate_minor bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'worker_skills_rate_minor_check'
      and conrelid = 'public.worker_skills'::regclass
  ) then
    alter table public.worker_skills
      add constraint worker_skills_rate_minor_check
      check (rate_minor is null or rate_minor >= 100);
  end if;
end
$$;

create or replace function public.save_my_worker_skills(
  p_primary_industry_id uuid,
  p_skills jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  skill_count integer;
begin
  if not exists (
    select 1
    from public.accounts account
    where account.id = auth.uid()
      and account.role = 'WORKER'
      and account.status = 'ACTIVE'
      and account.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'WORKER_ROLE_REQUIRED';
  end if;
  if not exists (
    select 1
    from public.industries industry
    where industry.id = p_primary_industry_id
      and industry.is_active
  ) or jsonb_typeof(p_skills) is distinct from 'array'
    or jsonb_array_length(p_skills) not between 1 and 10
  then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_SKILLS';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_skills) entry
    where jsonb_typeof(entry) is distinct from 'object'
      or coalesce(entry->>'categoryId', '') !~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      or coalesce(entry->>'years', '') !~ '^[0-9]{1,2}$'
      or (entry->>'years')::integer not between 0 and 80
      or (
        entry ? 'rateMinor'
        and entry->'rateMinor' <> 'null'::jsonb
        and (
          jsonb_typeof(entry->'rateMinor') <> 'number'
          or (entry->>'rateMinor')::numeric <> trunc((entry->>'rateMinor')::numeric)
          or (entry->>'rateMinor')::numeric < 100
        )
      )
  ) then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_SKILLS';
  end if;

  select count(distinct (entry->>'categoryId')::uuid)
  into skill_count
  from jsonb_array_elements(p_skills) entry;
  if skill_count <> jsonb_array_length(p_skills) then
    raise exception using errcode = '22023', message = 'DUPLICATE_WORKER_SKILL';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_skills) entry
    left join public.service_categories category
      on category.id = (entry->>'categoryId')::uuid
    where category.id is null
      or not category.is_active
      or category.industry_id <> p_primary_industry_id
  ) then
    raise exception using errcode = '22023', message = 'SKILL_OUTSIDE_INDUSTRY';
  end if;

  update public.worker_profiles
  set primary_industry_id = p_primary_industry_id,
      updated_at = now()
  where account_id = auth.uid();

  delete from public.worker_skills
  where worker_id = auth.uid();

  insert into public.worker_skills(
    worker_id,
    category_id,
    years,
    rate_minor
  )
  select
    auth.uid(),
    (entry->>'categoryId')::uuid,
    (entry->>'years')::integer,
    case
      when entry->'rateMinor' is null or entry->'rateMinor' = 'null'::jsonb
        then null
      else (entry->>'rateMinor')::bigint
    end
  from jsonb_array_elements(p_skills) entry;

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    'WORKER_SKILLS_AND_RATES_UPDATED',
    'worker_profile',
    auth.uid()::text,
    jsonb_build_object(
      'primary_industry_id', p_primary_industry_id,
      'skill_count', skill_count
    )
  );

  return jsonb_build_object(
    'primaryIndustryId', p_primary_industry_id,
    'skillCount', skill_count
  );
end
$$;

revoke all on function public.save_my_worker_skills(uuid, jsonb)
from public, anon;
grant execute on function public.save_my_worker_skills(uuid, jsonb)
to authenticated;

-- Report, block, and dispute controls ---------------------------------------

create table public.account_blocks (
  blocker_id uuid not null references public.accounts(id) on delete cascade,
  blocked_id uuid not null references public.accounts(id) on delete cascade,
  reason text check (reason is null or length(reason) between 3 and 500),
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.account_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.accounts(id) on delete restrict,
  reported_id uuid not null references public.accounts(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete set null,
  reason_code text not null check (reason_code ~ '^[A-Z][A-Z0-9_]{2,79}$'),
  details text not null check (length(details) between 10 and 2000),
  status text not null default 'OPEN'
    check (status in ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED')),
  reviewed_by uuid references public.admin_profiles(account_id) on delete set null,
  reviewed_at timestamptz,
  resolution text check (resolution is null or length(resolution) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

create table public.booking_disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  opened_by uuid not null references public.accounts(id) on delete restrict,
  reason text not null check (length(reason) between 10 and 2000),
  status text not null default 'OPEN'
    check (status in ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED')),
  resolved_by uuid references public.admin_profiles(account_id) on delete set null,
  resolved_at timestamptz,
  resolution text check (resolution is null or length(resolution) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index booking_disputes_one_active_idx
on public.booking_disputes(booking_id)
where status in ('OPEN', 'REVIEWING');

alter table public.account_blocks enable row level security;
alter table public.account_reports enable row level security;
alter table public.booking_disputes enable row level security;
revoke all on public.account_blocks, public.account_reports, public.booking_disputes
from anon, authenticated;
grant select on public.account_blocks, public.account_reports, public.booking_disputes
to authenticated;

create policy account_blocks_owner_or_admin_read
on public.account_blocks for select to authenticated
using (blocker_id = auth.uid() or public.is_admin(false));

create policy account_reports_reporter_or_admin_read
on public.account_reports for select to authenticated
using (reporter_id = auth.uid() or public.is_admin(false));

create policy booking_disputes_party_or_admin_read
on public.booking_disputes for select to authenticated
using (
  public.is_admin(false)
  or exists (
    select 1
    from public.bookings booking
    where booking.id = booking_id
      and auth.uid() in (booking.user_account_id, booking.worker_account_id)
  )
);

create trigger set_account_reports_updated_at
before update on public.account_reports
for each row execute function public.set_updated_at();

create trigger set_booking_disputes_updated_at
before update on public.booking_disputes
for each row execute function public.set_updated_at();

create or replace function private.accounts_block_each_other(
  p_left_account_id uuid,
  p_right_account_id uuid
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_blocks block
    where (block.blocker_id = p_left_account_id and block.blocked_id = p_right_account_id)
       or (block.blocker_id = p_right_account_id and block.blocked_id = p_left_account_id)
  )
$$;

revoke all on function private.accounts_block_each_other(uuid, uuid)
from public, anon, authenticated;

create or replace function public.block_account(
  p_account_id uuid,
  p_reason text
) returns public.account_blocks
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.account_blocks;
begin
  if auth.uid() is null or p_account_id = auth.uid() then
    raise exception using errcode = '22023', message = 'INVALID_BLOCK_TARGET';
  end if;
  if length(btrim(coalesce(p_reason, ''))) not between 3 and 500 then
    raise exception using errcode = '22023', message = 'INVALID_BLOCK_REASON';
  end if;
  if not exists (
    select 1
    from public.accounts account
    where account.id = p_account_id
  ) then
    raise exception using errcode = 'P0002', message = 'ACCOUNT_NOT_FOUND';
  end if;

  insert into public.account_blocks(blocker_id, blocked_id, reason)
  values (auth.uid(), p_account_id, btrim(p_reason))
  on conflict (blocker_id, blocked_id) do update
  set reason = excluded.reason
  returning * into result;

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    'ACCOUNT_BLOCKED',
    'account',
    p_account_id::text,
    '{}'::jsonb
  );
  return result;
end
$$;

create or replace function public.report_booking_participant(
  p_booking_id uuid,
  p_reason_code text,
  p_details text
) returns public.account_reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  reported_id uuid;
  result public.account_reports;
begin
  select *
  into booking
  from public.bookings
  where id = p_booking_id;
  if booking.id is null
    or auth.uid() not in (booking.user_account_id, booking.worker_account_id)
  then
    raise exception using errcode = '42501', message = 'BOOKING_UNAVAILABLE';
  end if;
  if coalesce(p_reason_code, '') !~ '^[A-Z][A-Z0-9_]{2,79}$'
    or length(btrim(coalesce(p_details, ''))) not between 10 and 2000
  then
    raise exception using errcode = '22023', message = 'INVALID_REPORT';
  end if;
  reported_id := case
    when auth.uid() = booking.user_account_id then booking.worker_account_id
    else booking.user_account_id
  end;

  insert into public.account_reports(
    reporter_id,
    reported_id,
    booking_id,
    reason_code,
    details
  ) values (
    auth.uid(),
    reported_id,
    booking.id,
    p_reason_code,
    btrim(p_details)
  )
  returning * into result;

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    'BOOKING_PARTICIPANT_REPORTED',
    'booking',
    booking.id::text,
    jsonb_build_object('report_id', result.id, 'reported_id', reported_id)
  );
  return result;
end
$$;

create or replace function public.open_booking_dispute(
  p_booking_id uuid,
  p_reason text
) returns public.booking_disputes
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  result public.booking_disputes;
begin
  select *
  into booking
  from public.bookings
  where id = p_booking_id;
  if booking.id is null
    or auth.uid() not in (booking.user_account_id, booking.worker_account_id)
  then
    raise exception using errcode = '42501', message = 'BOOKING_UNAVAILABLE';
  end if;
  if length(btrim(coalesce(p_reason, ''))) not between 10 and 2000 then
    raise exception using errcode = '22023', message = 'INVALID_DISPUTE';
  end if;

  insert into public.booking_disputes(booking_id, opened_by, reason)
  values (booking.id, auth.uid(), btrim(p_reason))
  on conflict (booking_id) where status in ('OPEN', 'REVIEWING') do update
  set reason = excluded.reason,
      updated_at = now()
  returning * into result;

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    'BOOKING_DISPUTE_OPENED',
    'booking',
    booking.id::text,
    jsonb_build_object('dispute_id', result.id)
  );
  return result;
end
$$;

revoke all on function public.block_account(uuid, text)
from public, anon;
revoke all on function public.report_booking_participant(uuid, text, text)
from public, anon;
revoke all on function public.open_booking_dispute(uuid, text)
from public, anon;
grant execute on function public.block_account(uuid, text)
to authenticated;
grant execute on function public.report_booking_participant(uuid, text, text)
to authenticated;
grant execute on function public.open_booking_dispute(uuid, text)
to authenticated;

-- Private proof-of-work photos ----------------------------------------------

create table public.booking_proof_media (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(account_id) on delete restrict,
  storage_path text not null unique,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size between 1 and 15728640),
  created_at timestamptz not null default now()
);

create index booking_proof_media_booking_idx
on public.booking_proof_media(booking_id, created_at);

alter table public.booking_proof_media enable row level security;
revoke all on public.booking_proof_media from anon, authenticated;
grant select on public.booking_proof_media to authenticated;

create policy booking_proof_media_party_or_admin_read
on public.booking_proof_media for select to authenticated
using (
  public.is_admin(false)
  or exists (
    select 1
    from public.bookings booking
    where booking.id = booking_id
      and auth.uid() in (booking.user_account_id, booking.worker_account_id)
  )
);

insert into storage.buckets(
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'booking-proof',
  'booking-proof',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy booking_proof_owner_upload
on storage.objects for insert to authenticated
with check (
  bucket_id = 'booking-proof'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy booking_proof_party_or_admin_read
on storage.objects for select to authenticated
using (
  bucket_id = 'booking-proof'
  and exists (
    select 1
    from public.booking_proof_media proof
    join public.bookings booking on booking.id = proof.booking_id
    where proof.storage_path = name
      and (
        auth.uid() in (booking.user_account_id, booking.worker_account_id)
        or public.is_admin(false)
      )
  )
);

create or replace function public.attach_booking_proof(
  p_booking_id uuid,
  p_storage_path text,
  p_content_type text,
  p_byte_size integer
) returns public.booking_proof_media
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  result public.booking_proof_media;
begin
  select *
  into booking
  from public.bookings
  where id = p_booking_id;
  if booking.id is null
    or booking.worker_account_id <> auth.uid()
    or booking.status not in ('SERVICE_STARTED', 'IN_PROGRESS', 'COMPLETED')
  then
    raise exception using errcode = '42501', message = 'BOOKING_PROOF_UNAVAILABLE';
  end if;
  if split_part(p_storage_path, '/', 1) <> auth.uid()::text
    or p_content_type not in ('image/jpeg', 'image/png', 'image/webp')
    or p_byte_size not between 1 and 15728640
    or not exists (
      select 1
      from storage.objects object
      where object.bucket_id = 'booking-proof'
        and object.name = p_storage_path
        and object.owner_id = auth.uid()::text
    )
  then
    raise exception using errcode = '22023', message = 'INVALID_BOOKING_PROOF';
  end if;

  insert into public.booking_proof_media(
    booking_id,
    worker_id,
    storage_path,
    content_type,
    byte_size
  ) values (
    booking.id,
    auth.uid(),
    p_storage_path,
    p_content_type,
    p_byte_size
  )
  returning * into result;

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    'BOOKING_PROOF_ATTACHED',
    'booking',
    booking.id::text,
    jsonb_build_object('proof_id', result.id)
  );
  return result;
end
$$;

revoke all on function public.attach_booking_proof(uuid, text, text, integer)
from public, anon;
grant execute on function public.attach_booking_proof(uuid, text, text, integer)
to authenticated;

-- Matching, pricing, and automatic next-worker re-offer ---------------------

create or replace function private.worker_match_eligibility(p_service_request_id uuid)
returns table(
  worker_id uuid,
  account_eligible boolean,
  skill_match boolean,
  approved boolean,
  service_area_ready boolean,
  within_radius boolean,
  schedule_match boolean,
  online boolean,
  eligible boolean,
  distance_meters double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  with request as (
    select service_request.*
    from public.service_requests service_request
    where service_request.id = p_service_request_id
  ), checks as (
    select
      worker.account_id as worker_id,
      (
        account.role = 'WORKER'
        and account.status = 'ACTIVE'
        and account.deleted_at is null
      ) as account_eligible,
      exists (
        select 1
        from public.worker_skills skill
        join public.service_categories category on category.id = skill.category_id
        where skill.worker_id = worker.account_id
          and skill.category_id = request.category_id
          and category.is_active
      ) as skill_match,
      worker.approval_status = 'APPROVED' as approved,
      (
        worker.service_origin is not null
        and worker.service_radius_meters is not null
      ) as service_area_ready,
      case
        when worker.service_origin is null or worker.service_radius_meters is null then false
        else extensions.st_dwithin(
          worker.service_origin,
          request.service_location,
          worker.service_radius_meters
        )
      end as within_radius,
      exists (
        select 1
        from public.worker_availability availability
        where availability.worker_id = worker.account_id
          and availability.day_of_week = extract(
            dow from request.scheduled_at at time zone 'Asia/Manila'
          )::integer
          and (request.scheduled_at at time zone 'Asia/Manila')::time
            between availability.start_time and availability.end_time
      ) as schedule_match,
      worker.is_available as online,
      not private.accounts_block_each_other(
        request.user_account_id,
        worker.account_id
      ) as not_blocked,
      case
        when worker.service_origin is null then null
        else extensions.st_distance(worker.service_origin, request.service_location)
      end as distance_meters
    from request
    cross join public.worker_profiles worker
    left join public.accounts account on account.id = worker.account_id
  )
  select
    checks.worker_id,
    checks.account_eligible,
    checks.skill_match,
    checks.approved,
    checks.service_area_ready,
    checks.within_radius,
    checks.schedule_match,
    checks.online,
    checks.account_eligible
      and checks.skill_match
      and checks.approved
      and checks.service_area_ready
      and checks.within_radius
      and checks.schedule_match
      and checks.online
      and checks.not_blocked as eligible,
    checks.distance_meters
  from checks
$$;

create or replace function private.refresh_live_dispatch(p_service_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.service_requests;
  session public.live_dispatch_sessions;
  next_wave smallint;
begin
  select *
  into request
  from public.service_requests
  where id = p_service_request_id;
  select *
  into session
  from public.live_dispatch_sessions
  where service_request_id = p_service_request_id;
  if request.id is null
    or request.status not in ('OPEN', 'MATCHED')
    or session.service_request_id is null
  then
    return;
  end if;

  update public.service_request_dispatches
  set status = 'EXPIRED',
      updated_at = now()
  where service_request_id = request.id
    and status in ('OFFERED', 'VIEWED')
    and expires_at <= now();

  if session.expires_at <= now()
    or exists (
      select 1
      from public.service_request_dispatches dispatch
      where dispatch.service_request_id = request.id
        and dispatch.status in ('OFFERED', 'VIEWED', 'ACCEPTED', 'SELECTED')
    )
  then
    return;
  end if;

  select least(3, count(*) + 1)::smallint
  into next_wave
  from public.service_request_dispatches dispatch
  where dispatch.service_request_id = request.id;

  insert into public.service_request_dispatches(
    service_request_id,
    worker_id,
    wave,
    distance_meters,
    approximate_latitude,
    approximate_longitude,
    expires_at
  )
  select
    request.id,
    worker.account_id,
    next_wave,
    round(extensions.st_distance(presence.location, request.service_location)::numeric, 2),
    round((
      extensions.st_y(presence.location::extensions.geometry)
      + (mod(abs(hashtext(request.id::text || worker.account_id::text)), 17) - 8) * 0.00008
    )::numeric, 6),
    round((
      extensions.st_x(presence.location::extensions.geometry)
      + (mod(abs(hashtext(worker.account_id::text || request.id::text)), 17) - 8) * 0.00008
    )::numeric, 6),
    least(session.expires_at, now() + interval '30 seconds')
  from public.worker_profiles worker
  join public.accounts account on account.id = worker.account_id
  join public.worker_presence presence on presence.worker_id = worker.account_id
  join public.worker_skills skill
    on skill.worker_id = worker.account_id
    and skill.category_id = request.category_id
  where account.role = 'WORKER'
    and account.status = 'ACTIVE'
    and account.deleted_at is null
    and worker.approval_status = 'APPROVED'
    and worker.is_available
    and presence.online
    and presence.last_seen_at > now() - interval '75 seconds'
    and exists (
      select 1
      from public.worker_availability availability
      where availability.worker_id = worker.account_id
        and availability.day_of_week = extract(
          dow from request.scheduled_at at time zone 'Asia/Manila'
        )::integer
        and (request.scheduled_at at time zone 'Asia/Manila')::time
          between availability.start_time and availability.end_time
    )
    and (request.subdivision_id is null or worker.subdivision_id = request.subdivision_id)
    and extensions.st_dwithin(
      presence.location,
      request.service_location,
      least(
        session.search_radius_meters,
        coalesce(worker.service_radius_meters, session.search_radius_meters)
      )
    )
    and not private.accounts_block_each_other(
      request.user_account_id,
      worker.account_id
    )
    and not exists (
      select 1
      from public.service_request_dispatches prior
      where prior.service_request_id = request.id
        and prior.worker_id = worker.account_id
    )
  order by
    extensions.st_distance(presence.location, request.service_location),
    worker.account_id
  limit 1;
end
$$;

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
          'rating', coalesce(review_stats.rating, 0),
          'reviewCount', coalesce(review_stats.review_count, 0),
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
  left join lateral (
    select
      avg(review.stars)::numeric(3, 2) as rating,
      count(*) as review_count
    from public.reviews review
    where review.worker_account_id = dispatch.worker_id
      and review.moderation_status = 'PUBLISHED'
  ) review_stats on true
  where dispatch.service_request_id = request.id
    and dispatch.status <> 'EXPIRED';
  return result;
end
$$;

create or replace function public.respond_to_dispatch(
  p_dispatch_id uuid,
  p_response text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  dispatch public.service_request_dispatches;
begin
  if p_response not in ('ACCEPTED', 'DECLINED') then
    raise exception using errcode = '22023', message = 'INVALID_DISPATCH_RESPONSE';
  end if;
  update public.service_request_dispatches
  set status = p_response,
      responded_at = now(),
      updated_at = now()
  where id = p_dispatch_id
    and worker_id = auth.uid()
    and status in ('OFFERED', 'VIEWED')
    and expires_at > now()
  returning * into dispatch;
  if dispatch.id is null then
    raise exception using errcode = 'P0001', message = 'DISPATCH_OFFER_UNAVAILABLE';
  end if;
  if p_response = 'DECLINED' then
    perform private.refresh_live_dispatch(dispatch.service_request_id);
  end if;
  return jsonb_build_object(
    'dispatchId', dispatch.id,
    'status', dispatch.status
  );
end
$$;

create or replace function public.start_worker_conversation(
  p_service_request_id uuid,
  p_worker_id uuid
) returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.conversations;
begin
  if not exists (
    select 1
    from public.service_requests request
    where request.id = p_service_request_id
      and request.user_account_id = auth.uid()
      and request.status in ('OPEN', 'MATCHED')
  ) or not exists (
    select 1
    from public.service_request_dispatches dispatch
    where dispatch.service_request_id = p_service_request_id
      and dispatch.worker_id = p_worker_id
      and dispatch.status = 'ACCEPTED'
      and dispatch.expires_at > now()
  ) or not exists (
    select 1
    from private.worker_match_eligibility(p_service_request_id) eligibility
    where eligibility.worker_id = p_worker_id
      and eligibility.eligible
  ) then
    raise exception using
      errcode = '42501',
      message = 'CONVERSATION_UNAVAILABLE';
  end if;

  insert into public.conversations(service_request_id, worker_account_id)
  values (p_service_request_id, p_worker_id)
  on conflict (service_request_id, worker_account_id)
    where booking_id is null
  do update set updated_at = now()
  returning * into result;
  insert into public.conversation_participants(conversation_id, account_id)
  values (result.id, auth.uid()), (result.id, p_worker_id)
  on conflict do nothing;
  return result;
end
$$;

create or replace function public.select_worker(
  p_service_request_id uuid,
  p_worker_id uuid
) returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.service_requests;
  worker_rate_minor bigint;
  result public.bookings;
  conversation_id uuid;
begin
  select *
  into request
  from public.service_requests
  where id = p_service_request_id
  for update;
  if request.user_account_id is distinct from auth.uid()
    or request.status not in ('OPEN', 'MATCHED')
  then
    raise exception using errcode = '42501', message = 'SERVICE_REQUEST_UNAVAILABLE';
  end if;
  if private.accounts_block_each_other(request.user_account_id, p_worker_id) then
    raise exception using errcode = '42501', message = 'WORKER_UNAVAILABLE';
  end if;
  if not exists (
    select 1
    from public.service_request_dispatches dispatch
    where dispatch.service_request_id = request.id
      and dispatch.worker_id = p_worker_id
      and dispatch.status = 'ACCEPTED'
      and dispatch.expires_at > now()
  ) or not exists (
    select 1
    from private.worker_match_eligibility(request.id) eligibility
    where eligibility.worker_id = p_worker_id
      and eligibility.eligible
  ) then
    raise exception using errcode = 'P0001', message = 'WORKER_UNAVAILABLE';
  end if;

  select skill.rate_minor
  into worker_rate_minor
  from public.worker_skills skill
  where skill.worker_id = p_worker_id
    and skill.category_id = request.category_id;
  if worker_rate_minor is null then
    raise exception using errcode = 'P0001', message = 'WORKER_RATE_REQUIRED';
  end if;

  insert into public.bookings(
    service_request_id,
    user_account_id,
    worker_account_id,
    agreed_service_amount
  ) values (
    request.id,
    auth.uid(),
    p_worker_id,
    worker_rate_minor::numeric / 100
  )
  returning * into result;

  insert into public.booking_status_events(
    booking_id,
    to_status,
    actor_id
  ) values (
    result.id,
    'PENDING',
    auth.uid()
  );
  insert into public.conversations(booking_id)
  values (result.id)
  returning id into conversation_id;
  insert into public.conversation_participants(conversation_id, account_id)
  values (conversation_id, auth.uid()), (conversation_id, p_worker_id);

  update public.service_requests
  set status = 'BOOKED',
      selected_worker_id = p_worker_id
  where id = request.id;
  update public.service_request_dispatches
  set status = case
        when worker_id = p_worker_id then 'SELECTED'
        else 'EXPIRED'
      end,
      updated_at = now()
  where service_request_id = request.id;
  update public.worker_presence
  set online = false,
      updated_at = now()
  where worker_id = p_worker_id;

  perform pgmq.send(
    'booking_timeouts',
    jsonb_build_object(
      'booking_id', result.id,
      'due_at', result.response_due_at,
      'attempt', 0
    )
  );
  return result;
end
$$;

create or replace function public.decline_assigned_booking(
  p_booking_id uuid,
  p_expected_version integer,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
begin
  select *
  into booking
  from public.bookings
  where id = p_booking_id
  for update;
  if booking.id is null
    or booking.worker_account_id <> auth.uid()
    or booking.status <> 'PENDING'
  then
    raise exception using errcode = '42501', message = 'BOOKING_DECLINE_UNAVAILABLE';
  end if;
  if booking.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'BOOKING_VERSION_CONFLICT';
  end if;
  if length(btrim(coalesce(p_reason, ''))) not between 3 and 1000 then
    raise exception using errcode = '22023', message = 'INVALID_DECLINE_REASON';
  end if;

  update public.bookings
  set status = 'CANCELLED',
      cancelled_at = now(),
      version = version + 1
  where id = booking.id;
  insert into public.booking_status_events(
    booking_id,
    from_status,
    to_status,
    actor_id,
    reason
  ) values (
    booking.id,
    'PENDING',
    'CANCELLED',
    auth.uid(),
    btrim(p_reason)
  );
  update public.service_request_dispatches
  set status = 'DECLINED',
      responded_at = now(),
      updated_at = now()
  where service_request_id = booking.service_request_id
    and worker_id = booking.worker_account_id
    and status = 'SELECTED';
  update public.service_requests
  set status = 'OPEN',
      selected_worker_id = null,
      notify_on_match = true,
      updated_at = now()
  where id = booking.service_request_id;
  insert into public.live_dispatch_sessions(
    service_request_id,
    started_at,
    expires_at,
    search_radius_meters
  )
  values (
    booking.service_request_id,
    now(),
    now() + interval '2 minutes',
    10000
  )
  on conflict (service_request_id) do update
  set started_at = excluded.started_at,
      expires_at = excluded.expires_at;

  perform private.refresh_live_dispatch(booking.service_request_id);
  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    'ASSIGNED_BOOKING_DECLINED',
    'booking',
    booking.id::text,
    jsonb_build_object('service_request_id', booking.service_request_id)
  );
  return jsonb_build_object(
    'bookingId', booking.id,
    'serviceRequestId', booking.service_request_id,
    'reoffered', true
  );
end
$$;

create or replace function public.expire_booking_request(target_booking uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role required';
  end if;
  select *
  into booking
  from public.bookings
  where id = target_booking
  for update;
  if booking.status <> 'PENDING' or booking.response_due_at > now() then
    return false;
  end if;

  update public.bookings
  set status = 'CANCELLED',
      cancelled_at = now(),
      version = version + 1
  where id = booking.id;
  insert into public.booking_status_events(
    booking_id,
    from_status,
    to_status,
    actor_id,
    reason
  ) values (
    booking.id,
    'PENDING',
    'CANCELLED',
    booking.worker_account_id,
    'Booking response timed out'
  );
  update public.service_request_dispatches
  set status = 'EXPIRED',
      updated_at = now()
  where service_request_id = booking.service_request_id
    and worker_id = booking.worker_account_id
    and status = 'SELECTED';
  update public.service_requests
  set status = 'OPEN',
      selected_worker_id = null,
      notify_on_match = true,
      updated_at = now()
  where id = booking.service_request_id;
  insert into public.live_dispatch_sessions(
    service_request_id,
    started_at,
    expires_at,
    search_radius_meters
  )
  values (
    booking.service_request_id,
    now(),
    now() + interval '2 minutes',
    10000
  )
  on conflict (service_request_id) do update
  set started_at = excluded.started_at,
      expires_at = excluded.expires_at;
  perform private.refresh_live_dispatch(booking.service_request_id);
  insert into public.notifications(
    recipient_id,
    title,
    body,
    category,
    status,
    sent_at
  ) values (
    booking.user_account_id,
    'Worker response timed out',
    'The request was automatically offered to the next eligible worker.',
    'BOOKING',
    'SENT',
    now()
  );
  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    booking.worker_account_id,
    'BOOKING_RESPONSE_TIMED_OUT',
    'booking',
    booking.id::text,
    jsonb_build_object('service_request_id', booking.service_request_id)
  );
  return true;
end
$$;

revoke all on function private.worker_match_eligibility(uuid)
from public, anon, authenticated;
revoke all on function private.refresh_live_dispatch(uuid)
from public, anon, authenticated;
revoke all on function public.get_live_dispatch_snapshot(uuid)
from public, anon;
revoke all on function public.respond_to_dispatch(uuid, text)
from public, anon;
revoke all on function public.start_worker_conversation(uuid, uuid)
from public, anon;
revoke all on function public.select_worker(uuid, uuid)
from public, anon;
revoke all on function public.decline_assigned_booking(uuid, integer, text)
from public, anon;
revoke all on function public.expire_booking_request(uuid)
from public, anon, authenticated;
grant execute on function public.get_live_dispatch_snapshot(uuid)
to authenticated;
grant execute on function public.respond_to_dispatch(uuid, text)
to authenticated;
grant execute on function public.start_worker_conversation(uuid, uuid)
to authenticated;
grant execute on function public.select_worker(uuid, uuid)
to authenticated;
grant execute on function public.decline_assigned_booking(uuid, integer, text)
to authenticated;
grant execute on function public.expire_booking_request(uuid)
to service_role;

notify pgrst, 'reload schema';

commit;
