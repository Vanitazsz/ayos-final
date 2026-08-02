begin;

create index if not exists worker_presence_live_idx
  on public.worker_presence(online, last_seen_at desc);
create index if not exists worker_presence_location_gix
  on public.worker_presence using gist(location);
create index if not exists location_updates_booking_time_idx
  on public.location_updates(booking_id, recorded_at desc);
create index if not exists authentication_events_session_lookup_idx
  on public.authentication_events(account_id, event_type, session_id_hash)
  where session_id_hash is not null;
create index if not exists booking_status_events_booking_id_fkey_idx
  on public.booking_status_events(booking_id);
create index if not exists location_updates_account_id_fkey_idx
  on public.location_updates(account_id);
create index if not exists messages_sender_id_fkey_idx
  on public.messages(sender_id);
create index if not exists service_requests_address_id_fkey_idx
  on public.service_requests(address_id);
create index if not exists service_requests_selected_worker_id_fkey_idx
  on public.service_requests(selected_worker_id);

create or replace function public.record_auth_session_event(
  p_account_id uuid,
  p_session_id_hash text,
  p_ip_address inet,
  p_user_agent text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_event public.authentication_events;
  result public.authentication_events;
  normalized_hash text := nullif(btrim(p_session_id_hash), '');
begin
  if p_account_id is null
    or normalized_hash is null
    or normalized_hash !~ '^[0-9a-f]{64}$'
    or not exists (
      select 1 from public.accounts where id = p_account_id
    )
  then
    raise exception using
      errcode = '22023',
      message = 'INVALID_AUTH_SESSION_EVENT';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_account_id::text || ':' || normalized_hash,
      0
    )
  );

  select event.*
  into existing_event
  from public.authentication_events event
  where event.account_id = p_account_id
    and event.event_type = 'SIGNED_IN'
    and event.session_id_hash = normalized_hash
  order by event.created_at desc
  limit 1;

  if existing_event.id is not null then
    return jsonb_build_object(
      'created', false,
      'duplicate', true,
      'event', to_jsonb(existing_event)
    );
  end if;

  insert into public.authentication_events(
    account_id,
    event_type,
    session_id_hash,
    ip_address,
    user_agent
  ) values (
    p_account_id,
    'SIGNED_IN',
    normalized_hash,
    p_ip_address,
    left(nullif(p_user_agent, ''), 1000)
  )
  returning * into result;

  return jsonb_build_object(
    'created', true,
    'duplicate', false,
    'event', to_jsonb(result)
  );
end
$$;

revoke all on function public.record_auth_session_event(
  uuid,
  text,
  inet,
  text
) from public, anon, authenticated;
grant execute on function public.record_auth_session_event(
  uuid,
  text,
  inet,
  text
) to service_role;

create or replace function public.transition_booking(
  p_booking_id uuid,
  p_target_status public.booking_status,
  p_expected_version integer,
  p_reason text default null
) returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_booking public.bookings;
  result public.bookings;
  allowed boolean;
begin
  select *
  into current_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if current_booking.id is null
    or not public.is_booking_party(p_booking_id)
  then
    raise exception using
      errcode = '42501',
      message = 'BOOKING_UNAVAILABLE';
  end if;
  if p_target_status = 'CANCELLED' then
    raise exception using
      errcode = '22023',
      message = 'USE_CANCEL_BOOKING';
  end if;

  if current_booking.status = p_target_status then
    if p_target_status = 'COMPLETED' then
      if auth.uid() <> current_booking.user_account_id
        and not public.is_admin(true)
      then
        raise exception using
          errcode = '42501',
          message = 'CUSTOMER_OR_ADMIN_REQUIRED';
      end if;
    elsif auth.uid() <> current_booking.worker_account_id
      and not public.is_admin(true)
    then
      raise exception using
        errcode = '42501',
        message = 'WORKER_OR_ADMIN_REQUIRED';
    end if;
    return current_booking;
  end if;
  if current_booking.version <> p_expected_version then
    raise exception using
      errcode = '40001',
      message = 'BOOKING_VERSION_CONFLICT';
  end if;

  allowed := case current_booking.status
    when 'PENDING' then p_target_status = 'ACCEPTED'
    when 'ACCEPTED' then p_target_status = 'WORKER_PREPARING'
    when 'WORKER_PREPARING' then p_target_status = 'WORKER_EN_ROUTE'
    when 'WORKER_EN_ROUTE' then p_target_status = 'WORKER_ARRIVED'
    when 'WORKER_ARRIVED' then p_target_status = 'SERVICE_STARTED'
    when 'SERVICE_STARTED' then p_target_status = 'IN_PROGRESS'
    when 'IN_PROGRESS' then p_target_status = 'PENDING_CONFIRMATION'
    when 'PENDING_CONFIRMATION' then p_target_status = 'COMPLETED'
    else false
  end;
  if not allowed then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_BOOKING_TRANSITION';
  end if;

  if current_booking.status = 'PENDING_CONFIRMATION' then
    if auth.uid() <> current_booking.user_account_id
      and not public.is_admin(true)
    then
      raise exception using
        errcode = '42501',
        message = 'CUSTOMER_OR_ADMIN_REQUIRED';
    end if;
  elsif auth.uid() <> current_booking.worker_account_id
    and not public.is_admin(true)
  then
    raise exception using
      errcode = '42501',
      message = 'WORKER_OR_ADMIN_REQUIRED';
  end if;

  update public.bookings
  set status = p_target_status,
      version = version + 1,
      accepted_at = case
        when p_target_status = 'ACCEPTED'
          then coalesce(accepted_at, now())
        else accepted_at
      end,
      completed_at = case
        when p_target_status = 'COMPLETED'
          then coalesce(completed_at, now())
        else completed_at
      end
  where id = current_booking.id
  returning * into result;

  insert into public.booking_status_events(
    booking_id,
    from_status,
    to_status,
    actor_id,
    reason
  ) values (
    result.id,
    current_booking.status,
    result.status,
    auth.uid(),
    nullif(btrim(p_reason), '')
  );

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    'BOOKING_STATUS_CHANGED',
    'booking',
    result.id::text,
    jsonb_build_object(
      'from_status', current_booking.status,
      'to_status', result.status,
      'from_version', current_booking.version,
      'to_version', result.version
    )
  );

  if p_target_status = 'COMPLETED' then
    update public.service_requests
    set status = 'CLOSED',
        updated_at = now()
    where id = result.service_request_id;
  end if;

  return result;
end
$$;

revoke all on function public.transition_booking(
  uuid,
  public.booking_status,
  integer,
  text
) from public, anon;
grant execute on function public.transition_booking(
  uuid,
  public.booking_status,
  integer,
  text
) to authenticated;

do $$
declare
  policy_record record;
  next_qual text;
  next_check text;
  statement text;
begin
  for policy_record in
    select
      namespace.nspname as schema_name,
      relation.relname as table_name,
      policy.polname as policy_name,
      pg_catalog.pg_get_expr(
        policy.polqual,
        policy.polrelid
      ) as using_expression,
      pg_catalog.pg_get_expr(
        policy.polwithcheck,
        policy.polrelid
      ) as check_expression
    from pg_catalog.pg_policy policy
    join pg_catalog.pg_class relation
      on relation.oid = policy.polrelid
    join pg_catalog.pg_namespace namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname in ('public', 'storage', 'realtime')
      and (
        coalesce(
          pg_catalog.pg_get_expr(policy.polqual, policy.polrelid),
          ''
        ) like any (array[
          '%auth.uid()%',
          '%auth.jwt()%',
          '%auth.role()%',
          '%current_setting(%'
        ])
        or coalesce(
          pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid),
          ''
        ) like any (array[
          '%auth.uid()%',
          '%auth.jwt()%',
          '%auth.role()%',
          '%current_setting(%'
        ])
      )
  loop
    next_qual := case
      when policy_record.using_expression is null then null
      else pg_catalog.regexp_replace(
        pg_catalog.regexp_replace(
          policy_record.using_expression,
          'auth\.(uid|jwt|role)\(\)',
          '(select auth.\1())',
          'g'
        ),
        'current_setting\(([^()]*)\)',
        '(select current_setting(\1))',
        'g'
      )
    end;
    next_check := case
      when policy_record.check_expression is null then null
      else pg_catalog.regexp_replace(
        pg_catalog.regexp_replace(
          policy_record.check_expression,
          'auth\.(uid|jwt|role)\(\)',
          '(select auth.\1())',
          'g'
        ),
        'current_setting\(([^()]*)\)',
        '(select current_setting(\1))',
        'g'
      )
    end;

    statement := format(
      'alter policy %I on %I.%I',
      policy_record.policy_name,
      policy_record.schema_name,
      policy_record.table_name
    );
    if next_qual is not null then
      statement := statement || format(' using (%s)', next_qual);
    end if;
    if next_check is not null then
      statement := statement || format(' with check (%s)', next_check);
    end if;
    execute statement;
  end loop;
end
$$;

do $$
declare
  public_read pg_catalog.pg_policies;
  taxonomy_read pg_catalog.pg_policies;
begin
  select * into public_read
  from pg_catalog.pg_policies
  where schemaname = 'public'
    and tablename = 'industries'
    and policyname = 'industries_public_read';

  select * into taxonomy_read
  from pg_catalog.pg_policies
  where schemaname = 'public'
    and tablename = 'industries'
    and policyname = 'taxonomy_read';

  if public_read.policyname is not null
    and taxonomy_read.policyname is not null
    and public_read.cmd = taxonomy_read.cmd
    and public_read.roles = taxonomy_read.roles
    and public_read.qual is not distinct from taxonomy_read.qual
    and public_read.with_check is not distinct from taxonomy_read.with_check
  then
    drop policy taxonomy_read on public.industries;
  end if;
end
$$;

create or replace function public.admin_database_health_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  select jsonb_build_object(
    'capturedAt', now(),
    'activeConnections', (
      select count(*)
      from pg_catalog.pg_stat_activity
      where state = 'active'
    ),
    'idleInTransactionConnections', (
      select count(*)
      from pg_catalog.pg_stat_activity
      where state like 'idle in transaction%'
    ),
    'stalePresenceRows', (
      select count(*)
      from public.worker_presence
      where online
        and last_seen_at < now() - interval '2 minutes'
    ),
    'locationHistoryRows', (
      select count(*) from public.location_updates
    ),
    'locationHistoryBytes', (
      select pg_catalog.pg_total_relation_size(
        'public.location_updates'::regclass
      )
    ),
    'activeRealtimeConnections', (
      select count(*)
      from pg_catalog.pg_stat_activity
      where application_name ilike '%realtime%'
    ),
    'expiredDispatchRows', (
      select count(*)
      from public.service_request_dispatches
      where expires_at < now()
        and status in ('OFFERED', 'VIEWED')
    ),
    'expiredGeocodingCacheRows', (
      select count(*)
      from public.geocoding_cache
      where expires_at < now()
    ),
    'topQueries', coalesce((
      select jsonb_agg(query_row)
      from (
        select
          calls,
          round(total_exec_time::numeric, 2) as total_time_ms,
          round(mean_exec_time::numeric, 2) as mean_time_ms,
          rows,
          left(query, 500) as query
        from extensions.pg_stat_statements
        order by total_exec_time desc
        limit 20
      ) query_row
    ), '[]'::jsonb)
  ) into result;

  return result;
end
$$;

create or replace function public.admin_preview_temporary_cleanup(
  p_now timestamptz default now()
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  return jsonb_build_object(
    'previewedAt', p_now,
    'wouldMarkPresenceOffline', (
      select count(*)
      from public.worker_presence
      where online
        and last_seen_at < p_now - interval '2 minutes'
    ),
    'wouldExpireDispatches', (
      select count(*)
      from public.service_request_dispatches
      where expires_at < p_now
        and status in ('OFFERED', 'VIEWED')
    ),
    'wouldDeleteExpiredGeocodingCache', (
      select count(*)
      from public.geocoding_cache
      where expires_at < p_now
    ),
    'wouldDeleteLocationSnapshotsOlderThan24Hours', (
      select count(*)
      from public.location_updates
      where recorded_at < p_now - interval '24 hours'
    ),
    'destructiveActionsPerformed', false
  );
end
$$;

revoke all on function public.admin_database_health_snapshot()
from public, anon;
revoke all on function public.admin_preview_temporary_cleanup(timestamptz)
from public, anon;
grant execute on function public.admin_database_health_snapshot()
to authenticated;
grant execute on function public.admin_preview_temporary_cleanup(timestamptz)
to authenticated;

notify pgrst, 'reload schema';

commit;
