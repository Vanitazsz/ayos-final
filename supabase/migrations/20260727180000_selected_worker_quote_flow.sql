begin;

-- Some hosted environments recorded the original offers migration as applied
-- without retaining this table. Reconcile the durable quote schema before the
-- RPC return types below are parsed.
create table if not exists public.service_request_offers (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(account_id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  message text not null check (length(trim(message)) between 3 and 2000),
  estimated_minutes integer check (
    estimated_minutes is null or estimated_minutes between 15 and 10080
  ),
  status text not null default 'SUBMITTED' check (
    status in (
      'SUBMITTED',
      'UPDATED',
      'ACCEPTED',
      'REJECTED',
      'WITHDRAWN',
      'EXPIRED'
    )
  ),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz
);

create unique index if not exists one_active_offer_per_worker_request
on public.service_request_offers(service_request_id, worker_id)
where status in ('SUBMITTED', 'UPDATED');

create index if not exists service_request_offers_request_status_idx
on public.service_request_offers(service_request_id, status, created_at desc);

alter table public.bookings
  add column if not exists accepted_offer_id uuid
    references public.service_request_offers(id) on delete restrict;

alter table public.service_request_offers enable row level security;
revoke all on public.service_request_offers from anon, authenticated;
grant select on public.service_request_offers to authenticated;

drop policy if exists offers_participant_or_admin_read
on public.service_request_offers;
create policy offers_participant_or_admin_read
on public.service_request_offers
for select
to authenticated
using (
  worker_id = auth.uid()
  or exists (
    select 1
    from public.service_requests request
    where request.id = service_request_id
      and request.user_account_id = auth.uid()
  )
  or public.is_admin(false)
);

drop trigger if exists set_service_request_offers_updated_at
on public.service_request_offers;
create trigger set_service_request_offers_updated_at
before update on public.service_request_offers
for each row execute function public.set_updated_at();

create or replace function public.select_worker_for_quote(
  p_service_request_id uuid,
  p_worker_id uuid
) returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.service_requests;
  worker_rate_minor bigint;
  result public.conversations;
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
  if worker_rate_minor is not null then
    raise exception using errcode = 'P0001', message = 'WORKER_RATE_AVAILABLE';
  end if;

  update public.service_requests
  set status = 'MATCHED',
      selected_worker_id = p_worker_id
  where id = request.id;
  update public.service_request_dispatches
  set status = case
        when worker_id = p_worker_id then 'SELECTED'
        else 'EXPIRED'
      end,
      updated_at = now()
  where service_request_id = request.id;

  insert into public.conversations(service_request_id, worker_account_id)
  values (request.id, p_worker_id)
  on conflict (service_request_id, worker_account_id)
    where booking_id is null
  do update set updated_at = now()
  returning * into result;
  insert into public.conversation_participants(conversation_id, account_id)
  values (result.id, auth.uid()), (result.id, p_worker_id)
  on conflict do nothing;

  insert into public.notifications(
    recipient_id,
    title,
    body,
    category,
    status,
    sent_at,
    source_key
  ) values (
    p_worker_id,
    'Customer accepted you',
    'The customer selected you for this request. Submit your quote to create the booking.',
    'MATCHING',
    'SENT',
    now(),
    'quote-selection:' || request.id::text || ':' || p_worker_id::text
  )
  on conflict (source_key) do nothing;

  return result;
end
$$;

create or replace function public.submit_selected_worker_quote(
  p_service_request_id uuid,
  p_amount_minor bigint,
  p_message text,
  p_duration_minutes integer
) returns public.service_request_offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.service_requests;
  result public.service_request_offers;
  quote_amount numeric(12,2);
begin
  if public.current_role() <> 'WORKER' then
    raise exception using errcode = '42501', message = 'WORKER_REQUIRED';
  end if;
  select *
  into request
  from public.service_requests
  where id = p_service_request_id
  for update;
  if request.status <> 'MATCHED'
    or request.selected_worker_id is distinct from auth.uid()
    or not exists (
      select 1
      from public.worker_profiles worker
      where worker.account_id = auth.uid()
        and worker.approval_status = 'APPROVED'
        and worker.is_available
    )
  then
    raise exception using errcode = '42501', message = 'QUOTE_NOT_ALLOWED';
  end if;
  if p_amount_minor is null
    or p_amount_minor < 100
    or length(trim(p_message)) not between 3 and 2000
    or p_duration_minutes is null
    or p_duration_minutes not between 15 and 10080
  then
    raise exception using errcode = '22023', message = 'INVALID_QUOTE';
  end if;

  quote_amount := round(p_amount_minor::numeric / 100, 2);
  update public.service_request_offers
  set status = 'UPDATED',
      amount = quote_amount,
      message = trim(p_message),
      estimated_minutes = p_duration_minutes,
      expires_at = request.scheduled_at
  where service_request_id = request.id
    and worker_id = auth.uid()
    and status in ('SUBMITTED', 'UPDATED')
  returning * into result;
  if result.id is null then
    insert into public.service_request_offers(
      service_request_id,
      worker_id,
      amount,
      message,
      estimated_minutes,
      expires_at
    ) values (
      request.id,
      auth.uid(),
      quote_amount,
      trim(p_message),
      p_duration_minutes,
      request.scheduled_at
    )
    returning * into result;
  end if;

  update public.service_requests
  set updated_at = now()
  where id = request.id;
  insert into public.notifications(
    recipient_id,
    title,
    body,
    category,
    status,
    sent_at,
    source_key
  ) values (
    request.user_account_id,
    'Quote received',
    'Your selected worker submitted a quote. Review it in your request.',
    'MATCHING',
    'SENT',
    now(),
    'selected-quote:' || result.id::text || ':' || result.status
  )
  on conflict (source_key) do nothing;
  return result;
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
      and (
        request.selected_worker_id = p_worker_id
        or exists (
          select 1
          from public.service_request_dispatches dispatch
          where dispatch.service_request_id = request.id
            and dispatch.worker_id = p_worker_id
            and dispatch.status = 'ACCEPTED'
            and dispatch.expires_at > now()
        )
      )
  ) or not exists (
    select 1
    from private.worker_match_eligibility(p_service_request_id) eligibility
    where eligibility.worker_id = p_worker_id
      and eligibility.eligible
  ) then
    raise exception using errcode = '42501', message = 'CONVERSATION_UNAVAILABLE';
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

create or replace function public.accept_service_offer(p_offer_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  offer public.service_request_offers;
  request public.service_requests;
  result public.bookings;
  conversation_id uuid;
begin
  select *
  into offer
  from public.service_request_offers
  where id = p_offer_id
  for update;
  if offer.id is null then
    raise exception using errcode = '42501', message = 'OFFER_CANNOT_BE_ACCEPTED';
  end if;
  select *
  into request
  from public.service_requests
  where id = offer.service_request_id
  for update;
  if request.user_account_id is distinct from auth.uid()
    or request.status not in ('OPEN', 'MATCHED')
    or offer.status not in ('SUBMITTED', 'UPDATED')
    or (
      request.selected_worker_id is not null
      and request.selected_worker_id <> offer.worker_id
    )
  then
    raise exception using errcode = '42501', message = 'OFFER_CANNOT_BE_ACCEPTED';
  end if;
  if not exists (
    select 1
    from public.worker_profiles worker
    where worker.account_id = offer.worker_id
      and worker.approval_status = 'APPROVED'
      and worker.is_available
  ) then
    raise exception using errcode = 'P0001', message = 'WORKER_UNAVAILABLE';
  end if;

  update public.service_request_offers
  set status = case when id = offer.id then 'ACCEPTED' else 'REJECTED' end,
      responded_at = now()
  where service_request_id = request.id
    and status in ('SUBMITTED', 'UPDATED');
  insert into public.bookings(
    service_request_id,
    user_account_id,
    worker_account_id,
    agreed_service_amount,
    accepted_offer_id
  ) values (
    request.id,
    auth.uid(),
    offer.worker_id,
    offer.amount,
    offer.id
  )
  returning * into result;
  insert into public.booking_status_events(booking_id, to_status, actor_id)
  values (result.id, 'PENDING', auth.uid());

  if request.selected_worker_id = offer.worker_id then
    select id
    into conversation_id
    from public.conversations
    where service_request_id = request.id
      and worker_account_id = offer.worker_id
      and booking_id is null
    for update;
    if conversation_id is not null then
      update public.conversations
      set booking_id = result.id
      where id = conversation_id;
    end if;
  end if;
  if conversation_id is null then
    insert into public.conversations(booking_id)
    values (result.id)
    returning id into conversation_id;
    insert into public.conversation_participants(conversation_id, account_id)
    values (conversation_id, auth.uid()), (conversation_id, offer.worker_id);
  end if;

  update public.service_requests
  set status = 'BOOKED',
      selected_worker_id = offer.worker_id,
      budget = offer.amount
  where id = request.id;
  if request.selected_worker_id = offer.worker_id then
    update public.service_request_dispatches
    set status = case
          when worker_id = offer.worker_id then 'SELECTED'
          else 'EXPIRED'
        end,
        updated_at = now()
    where service_request_id = request.id;
    update public.worker_presence
    set online = false,
        updated_at = now()
    where worker_id = offer.worker_id;
  end if;
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

revoke all on function public.select_worker_for_quote(uuid, uuid) from public, anon;
revoke all on function public.submit_selected_worker_quote(uuid, bigint, text, integer) from public, anon;
revoke all on function public.start_worker_conversation(uuid, uuid) from public, anon;
revoke all on function public.accept_service_offer(uuid) from public, anon;
grant execute on function public.select_worker_for_quote(uuid, uuid) to authenticated;
grant execute on function public.submit_selected_worker_quote(uuid, bigint, text, integer) to authenticated;
grant execute on function public.start_worker_conversation(uuid, uuid) to authenticated;
grant execute on function public.accept_service_offer(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.service_requests;
exception when duplicate_object then null;
end
$$;
do $$
begin
  alter publication supabase_realtime add table public.service_request_offers;
exception when duplicate_object then null;
end
$$;

commit;
