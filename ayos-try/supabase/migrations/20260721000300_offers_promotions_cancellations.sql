-- Worker offers, promotion redemption, authoritative booking price, and richer cancellation records.

create table public.service_request_offers (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(account_id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  message text not null check (length(trim(message)) between 3 and 2000),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 15 and 10080),
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED','UPDATED','ACCEPTED','REJECTED','WITHDRAWN','EXPIRED')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz
);
create unique index one_active_offer_per_worker_request on public.service_request_offers(service_request_id, worker_id)
where status in ('SUBMITTED','UPDATED');
create index service_request_offers_request_status_idx on public.service_request_offers(service_request_id, status, created_at desc);

alter table public.bookings
  add column agreed_service_amount numeric(12,2),
  add column currency text not null default 'PHP' check (currency = 'PHP'),
  add column accepted_offer_id uuid references public.service_request_offers(id) on delete restrict;
update public.bookings b set agreed_service_amount = r.budget
from public.service_requests r where r.id = b.service_request_id and b.agreed_service_amount is null;
alter table public.bookings alter column agreed_service_amount set not null;

create or replace function public.select_worker(p_service_request_id uuid, p_worker_id uuid)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare request public.service_requests; result public.bookings; conversation_id uuid;
begin
  select * into request from public.service_requests where id = p_service_request_id for update;
  if request.user_account_id is distinct from auth.uid() or request.status not in ('OPEN','MATCHED') then raise exception using errcode='42501', message='Service request cannot be selected'; end if;
  if not exists(select 1 from public.worker_profiles wp join public.worker_skills ws on ws.worker_id=wp.account_id where wp.account_id=p_worker_id and wp.approval_status='APPROVED' and wp.is_available and ws.category_id=request.category_id) then raise exception using errcode='P0001', message='WORKER_UNAVAILABLE'; end if;
  insert into public.bookings(service_request_id,user_account_id,worker_account_id,agreed_service_amount)
  values(request.id,auth.uid(),p_worker_id,request.budget) returning * into result;
  insert into public.booking_status_events(booking_id,to_status,actor_id) values(result.id,'PENDING',auth.uid());
  insert into public.conversations(booking_id) values(result.id) returning id into conversation_id;
  insert into public.conversation_participants(conversation_id,account_id) values(conversation_id,auth.uid()),(conversation_id,p_worker_id);
  update public.service_requests set status='BOOKED',selected_worker_id=p_worker_id where id=request.id;
  perform pgmq.send('booking_timeouts',jsonb_build_object('booking_id',result.id,'due_at',result.response_due_at,'attempt',0));
  return result;
end $$;

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and length(code) between 3 and 32),
  name text not null check (length(name) between 2 and 120),
  description text not null check (length(description) between 3 and 1000),
  discount_type text not null check (discount_type in ('FIXED','PERCENTAGE')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  maximum_discount numeric(12,2) check (maximum_discount is null or maximum_discount > 0),
  minimum_spend numeric(12,2) not null default 0 check (minimum_spend >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','PAUSED','EXPIRED')),
  total_limit integer check (total_limit is null or total_limit > 0),
  per_user_limit integer not null default 1 check (per_user_limit > 0),
  created_by uuid not null references public.admin_profiles(account_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at),
  check (discount_type <> 'PERCENTAGE' or discount_value <= 100)
);

create table public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete restrict,
  user_account_id uuid not null references public.user_profiles(account_id) on delete restrict,
  service_request_id uuid references public.service_requests(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete restrict,
  discount_amount numeric(12,2) not null check (discount_amount >= 0),
  status text not null default 'RESERVED' check (status in ('RESERVED','REDEEMED','RELEASED')),
  reserved_at timestamptz not null default now(),
  redeemed_at timestamptz,
  released_at timestamptz
);
create index promotion_redemptions_user_idx on public.promotion_redemptions(user_account_id, promotion_id, status);

alter table public.cancellations
  add column reason_code text,
  add column initiator_role public.account_role,
  add column job_stage text check (job_stage is null or job_stage in ('BEFORE_TRAVEL','TRAVELLING','ARRIVED','SERVICE_STARTED')),
  add column fee_amount numeric(12,2) not null default 0 check (fee_amount >= 0),
  add column refund_amount numeric(12,2) not null default 0 check (refund_amount >= 0),
  add column resolution_status text not null default 'CONFIRMED' check (resolution_status in ('PENDING','CONFIRMED','DISPUTED','RESOLVED'));

do $$
declare table_name text;
begin
  foreach table_name in array array['service_request_offers','promotions','promotion_redemptions'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
  end loop;
end $$;
grant select on public.service_request_offers, public.promotions, public.promotion_redemptions to authenticated;

create policy offers_participant_or_admin_read on public.service_request_offers for select to authenticated
using (worker_id = auth.uid() or exists (
  select 1 from public.service_requests r where r.id = service_request_id and r.user_account_id = auth.uid()
) or public.is_admin(false));
create policy active_promotions_read on public.promotions for select to authenticated
using ((status = 'ACTIVE' and now() between starts_at and ends_at) or public.is_admin(false));
create policy promotion_redemptions_owner_or_admin_read on public.promotion_redemptions for select to authenticated
using (user_account_id = auth.uid() or public.is_admin(false));

create trigger set_service_request_offers_updated_at before update on public.service_request_offers
for each row execute function public.set_updated_at();
create trigger set_promotions_updated_at before update on public.promotions
for each row execute function public.set_updated_at();

create or replace function public.submit_service_offer(
  p_service_request_id uuid,
  p_amount numeric,
  p_message text,
  p_estimated_minutes integer default null
)
returns public.service_request_offers language plpgsql security definer set search_path = '' as $$
declare request public.service_requests; result public.service_request_offers;
begin
  if public.current_role() <> 'WORKER' then raise exception using errcode = '42501', message = 'Worker required'; end if;
  select * into request from public.service_requests where id = p_service_request_id for update;
  if request.status not in ('OPEN','MATCHED') or not exists (
    select 1 from public.match_candidates m where m.service_request_id = request.id and m.worker_id = auth.uid() and m.eligible
  ) or not exists (
    select 1 from public.worker_profiles w where w.account_id = auth.uid() and w.approval_status = 'APPROVED' and w.is_available
  ) then raise exception using errcode = '42501', message = 'Offer is not allowed'; end if;
  if p_amount <= 0 or length(trim(p_message)) not between 3 and 2000 then
    raise exception using errcode = '22023', message = 'Invalid offer';
  end if;
  update public.service_request_offers set status = 'UPDATED', amount = round(p_amount, 2), message = trim(p_message),
    estimated_minutes = p_estimated_minutes, expires_at = request.scheduled_at
  where service_request_id = request.id and worker_id = auth.uid() and status in ('SUBMITTED','UPDATED')
  returning * into result;
  if result.id is null then
    insert into public.service_request_offers(service_request_id, worker_id, amount, message, estimated_minutes, expires_at)
    values(request.id, auth.uid(), round(p_amount, 2), trim(p_message), p_estimated_minutes, request.scheduled_at)
    returning * into result;
  end if;
  insert into public.notifications(recipient_id, title, body, category, status, sent_at, source_key)
  values(request.user_account_id, 'New worker offer', 'An approved worker submitted an offer for your service request.',
    'MATCHING', 'SENT', now(), 'offer:' || result.id::text || ':' || result.status)
  on conflict(source_key) do nothing;
  return result;
end $$;

create or replace function public.withdraw_service_offer(p_offer_id uuid)
returns public.service_request_offers language plpgsql security definer set search_path = '' as $$
declare result public.service_request_offers;
begin
  update public.service_request_offers set status = 'WITHDRAWN', responded_at = now()
  where id = p_offer_id and worker_id = auth.uid() and status in ('SUBMITTED','UPDATED')
  returning * into result;
  if result.id is null then raise exception using errcode = '42501', message = 'Offer cannot be withdrawn'; end if;
  return result;
end $$;

create or replace function public.accept_service_offer(p_offer_id uuid)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare offer public.service_request_offers; request public.service_requests; result public.bookings; conversation_id uuid;
begin
  select * into offer from public.service_request_offers where id = p_offer_id for update;
  select * into request from public.service_requests where id = offer.service_request_id for update;
  if request.user_account_id is distinct from auth.uid() or request.status not in ('OPEN','MATCHED') or offer.status not in ('SUBMITTED','UPDATED') then
    raise exception using errcode = '42501', message = 'Offer cannot be accepted';
  end if;
  if not exists (select 1 from public.worker_profiles w where w.account_id = offer.worker_id and w.approval_status = 'APPROVED' and w.is_available) then
    raise exception using errcode = 'P0001', message = 'WORKER_UNAVAILABLE';
  end if;
  update public.service_request_offers set status = case when id = offer.id then 'ACCEPTED' else 'REJECTED' end,
    responded_at = now() where service_request_id = request.id and status in ('SUBMITTED','UPDATED');
  insert into public.bookings(service_request_id, user_account_id, worker_account_id, agreed_service_amount, accepted_offer_id)
  values(request.id, auth.uid(), offer.worker_id, offer.amount, offer.id) returning * into result;
  insert into public.booking_status_events(booking_id, to_status, actor_id) values(result.id, 'PENDING', auth.uid());
  insert into public.conversations(booking_id) values(result.id) returning id into conversation_id;
  insert into public.conversation_participants(conversation_id, account_id) values(conversation_id, auth.uid()), (conversation_id, offer.worker_id);
  update public.service_requests set status = 'BOOKED', selected_worker_id = offer.worker_id, budget = offer.amount where id = request.id;
  perform pgmq.send('booking_timeouts', jsonb_build_object('booking_id', result.id, 'due_at', result.response_due_at, 'attempt', 0));
  return result;
end $$;

create or replace function public.validate_promotion(p_code text, p_amount numeric)
returns table(promotion_id uuid, discount_amount numeric, final_amount numeric)
language plpgsql stable security definer set search_path = '' as $$
declare promotion public.promotions; prior_count integer; total_count integer; discount numeric(12,2);
begin
  select * into promotion from public.promotions where code = upper(trim(p_code)) and status = 'ACTIVE' and now() between starts_at and ends_at;
  if promotion.id is null or p_amount < promotion.minimum_spend then
    raise exception using errcode = '22023', message = 'Promotion is unavailable';
  end if;
  select count(*) into prior_count from public.promotion_redemptions r where r.promotion_id = promotion.id and r.user_account_id = auth.uid() and r.status in ('RESERVED','REDEEMED');
  select count(*) into total_count from public.promotion_redemptions r where r.promotion_id = promotion.id and r.status in ('RESERVED','REDEEMED');
  if prior_count >= promotion.per_user_limit or (promotion.total_limit is not null and total_count >= promotion.total_limit) then
    raise exception using errcode = '22023', message = 'Promotion limit reached';
  end if;
  discount := case when promotion.discount_type = 'FIXED' then promotion.discount_value else round(p_amount * promotion.discount_value / 100, 2) end;
  discount := least(discount, coalesce(promotion.maximum_discount, discount), p_amount);
  return query select promotion.id, discount, p_amount - discount;
end $$;

create or replace function public.reserve_promotion(p_code text, p_service_request_id uuid)
returns public.promotion_redemptions language plpgsql security definer set search_path = '' as $$
declare request public.service_requests; promotion public.promotions; prior_count integer; total_count integer; discount numeric(12,2); result public.promotion_redemptions;
begin
  select * into request from public.service_requests where id = p_service_request_id for update;
  if request.user_account_id is distinct from auth.uid() or request.status not in ('OPEN','MATCHED') then
    raise exception using errcode = '42501', message = 'Service request is unavailable';
  end if;
  select * into promotion from public.promotions where code = upper(trim(p_code)) and status = 'ACTIVE' and now() between starts_at and ends_at for update;
  if promotion.id is null or request.budget < promotion.minimum_spend then raise exception using errcode = '22023', message = 'Promotion is unavailable'; end if;
  select count(*) into prior_count from public.promotion_redemptions r where r.promotion_id = promotion.id and r.user_account_id = auth.uid() and r.status in ('RESERVED','REDEEMED');
  select count(*) into total_count from public.promotion_redemptions r where r.promotion_id = promotion.id and r.status in ('RESERVED','REDEEMED');
  if prior_count >= promotion.per_user_limit or (promotion.total_limit is not null and total_count >= promotion.total_limit) then raise exception using errcode = '22023', message = 'Promotion limit reached'; end if;
  discount := case when promotion.discount_type = 'FIXED' then promotion.discount_value else round(request.budget * promotion.discount_value / 100, 2) end;
  discount := least(discount, coalesce(promotion.maximum_discount, discount), request.budget);
  insert into public.promotion_redemptions(promotion_id, user_account_id, service_request_id, discount_amount)
  values(promotion.id, auth.uid(), request.id, discount) returning * into result;
  update public.service_requests set budget = budget - discount where id = request.id;
  return result;
end $$;

create or replace function public.admin_upsert_promotion(
  p_id uuid,
  p_code text,
  p_name text,
  p_description text,
  p_discount_type text,
  p_discount_value numeric,
  p_maximum_discount numeric,
  p_minimum_spend numeric,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_status text,
  p_total_limit integer,
  p_per_user_limit integer
)
returns public.promotions language plpgsql security definer set search_path = '' as $$
declare result public.promotions;
begin
  if not public.is_admin(true) then raise exception using errcode = '42501', message = 'AAL2 administrator required'; end if;
  insert into public.promotions(
    id, code, name, description, discount_type, discount_value, maximum_discount, minimum_spend,
    starts_at, ends_at, status, total_limit, per_user_limit, created_by
  ) values (
    coalesce(p_id, gen_random_uuid()), upper(trim(p_code)), trim(p_name), trim(p_description), p_discount_type,
    p_discount_value, p_maximum_discount, p_minimum_spend, p_starts_at, p_ends_at, p_status,
    p_total_limit, p_per_user_limit, auth.uid()
  ) on conflict(id) do update set code = excluded.code, name = excluded.name, description = excluded.description,
    discount_type = excluded.discount_type, discount_value = excluded.discount_value,
    maximum_discount = excluded.maximum_discount, minimum_spend = excluded.minimum_spend,
    starts_at = excluded.starts_at, ends_at = excluded.ends_at, status = excluded.status,
    total_limit = excluded.total_limit, per_user_limit = excluded.per_user_limit
  returning * into result;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), 'PROMOTION_UPSERTED', 'promotion', result.id::text, jsonb_build_object('status', result.status, 'code', result.code));
  return result;
end $$;

revoke all on function public.submit_service_offer(uuid,numeric,text,integer) from public, anon;
revoke all on function public.withdraw_service_offer(uuid) from public, anon;
revoke all on function public.accept_service_offer(uuid) from public, anon;
revoke all on function public.validate_promotion(text,numeric) from public, anon;
revoke all on function public.reserve_promotion(text,uuid) from public, anon;
revoke all on function public.admin_upsert_promotion(uuid,text,text,text,text,numeric,numeric,numeric,timestamptz,timestamptz,text,integer,integer) from public, anon;
grant execute on function public.submit_service_offer(uuid,numeric,text,integer) to authenticated;
grant execute on function public.withdraw_service_offer(uuid) to authenticated;
grant execute on function public.accept_service_offer(uuid) to authenticated;
grant execute on function public.validate_promotion(text,numeric) to authenticated;
grant execute on function public.reserve_promotion(text,uuid) to authenticated;
grant execute on function public.admin_upsert_promotion(uuid,text,text,text,text,numeric,numeric,numeric,timestamptz,timestamptz,text,integer,integer) to authenticated;
