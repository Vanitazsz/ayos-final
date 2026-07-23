insert into public.system_settings(key, value) values
  ('platform_settings.commission_rate', '10'::jsonb),
  ('platform_settings.homeowner_charge', '0'::jsonb)
on conflict(key) do nothing;
create or replace function public.get_platform_fee_settings()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'commissionRate', coalesce((select (value #>> '{}')::numeric from public.system_settings where key = 'platform_settings.commission_rate'), 10),
    'homeownerCharge', coalesce((select (value #>> '{}')::numeric from public.system_settings where key = 'platform_settings.homeowner_charge'), 0)
  )
$$;
revoke all on function public.get_platform_fee_settings() from public, anon;
grant execute on function public.get_platform_fee_settings() to authenticated;
create or replace function public.confirm_cash_payment(p_booking_id uuid, p_idempotency_key text)
returns public.payments language plpgsql security definer set search_path = '' as $$
declare
  booking public.bookings; payment public.payments;
  confirmation_party public.cash_confirmation_party;
  amount numeric(12,2); rate_percent numeric(5,2); rate numeric(5,4);
  homeowner_charge numeric(12,2); commission numeric(12,2);
begin
  select * into booking from public.bookings where id = p_booking_id for update;
  if booking.status <> 'COMPLETED' or auth.uid() not in (booking.user_account_id, booking.worker_account_id) then
    raise exception using errcode = '42501', message = 'Cash confirmation not allowed';
  end if;
  if length(p_idempotency_key) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'Invalid idempotency key';
  end if;
  select * into payment from public.payments where booking_id = booking.id for update;
  if payment.status = 'SUCCESSFUL' then return payment; end if;
  if payment.id is not null and payment.method = 'GCASH' and payment.status in ('PENDING', 'AWAITING_CONFIRMATIONS') then
    raise exception using errcode = '55000', message = 'GCash payment is already in progress';
  end if;
  amount := booking.agreed_service_amount;
  select coalesce((value #>> '{}')::numeric, 10) into rate_percent
  from public.system_settings where key = 'platform_settings.commission_rate';
  select coalesce((value #>> '{}')::numeric, 0) into homeowner_charge
  from public.system_settings where key = 'platform_settings.homeowner_charge';
  rate_percent := coalesce(rate_percent, 10);
  homeowner_charge := coalesce(homeowner_charge, 0);
  if rate_percent < 0 or rate_percent > 50 or homeowner_charge < 0 then
    raise exception using errcode = '22023', message = 'Invalid platform fee settings';
  end if;
  rate := rate_percent / 100;
  commission := round(amount * rate, 2);
  if payment.id is null then
    insert into public.payments(booking_id, method, status, service_amount, commission_rate, commission_amount, worker_net_amount, homeowner_platform_charge, idempotency_key)
    values(booking.id, 'CASH', 'AWAITING_CONFIRMATIONS', amount, rate, commission, amount - commission, homeowner_charge, p_idempotency_key)
    returning * into payment;
  else
    update public.payments set method = 'CASH', status = 'AWAITING_CONFIRMATIONS', provider = null,
      provider_payment_id = null, failure_reason = null, service_amount = amount,
      commission_rate = rate, commission_amount = commission, worker_net_amount = amount - commission,
      homeowner_platform_charge = homeowner_charge
    where id = payment.id returning * into payment;
  end if;
  confirmation_party := case when auth.uid() = booking.user_account_id then 'USER'::public.cash_confirmation_party else 'WORKER'::public.cash_confirmation_party end;
  insert into public.cash_confirmations(payment_id, account_id, party)
  values(payment.id, auth.uid(), confirmation_party) on conflict(payment_id, party) do nothing;
  if (select count(*) from public.cash_confirmations where payment_id = payment.id) = 2 then
    update public.payments set status = 'SUCCESSFUL', successful_at = coalesce(successful_at, now()), paid_at = coalesce(paid_at, now()) where id = payment.id returning * into payment;
    insert into public.receipts(payment_id, receipt_number, service_amount, commission_rate, commission_amount, worker_net_amount, homeowner_platform_charge)
    values(payment.id, 'AYOS-' || upper(substr(replace(payment.id::text, '-', ''), 1, 12)), payment.service_amount, payment.commission_rate, payment.commission_amount, payment.worker_net_amount, payment.homeowner_platform_charge)
    on conflict(payment_id) do nothing;
  end if;
  return payment;
end $$;
create table public.worker_recommendation_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 2 and 80),
  amount integer not null check (amount >= 0),
  duration_days integer not null check (duration_days between 1 and 3650),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.worker_recommendation_subscriptions (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(account_id) on delete cascade,
  plan_id uuid references public.worker_recommendation_plans(id) on delete set null,
  plan_name text not null,
  amount integer not null check (amount >= 0),
  duration_days integer not null check (duration_days > 0),
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  check (expires_at > starts_at)
);
create index worker_recommendation_subscriptions_worker_status_idx on public.worker_recommendation_subscriptions(worker_id, status, expires_at desc);
alter table public.worker_recommendation_plans enable row level security;
alter table public.worker_recommendation_subscriptions enable row level security;
revoke all on public.worker_recommendation_plans, public.worker_recommendation_subscriptions from anon, authenticated;
grant select on public.worker_recommendation_plans, public.worker_recommendation_subscriptions to authenticated;
create policy recommendation_plans_admin_read on public.worker_recommendation_plans for select to authenticated using (public.is_admin(false));
create policy recommendation_subscriptions_owner_admin_read on public.worker_recommendation_subscriptions for select to authenticated using (worker_id = auth.uid() or public.is_admin(false));
create or replace function public.admin_upsert_subscription_plan(p_id uuid, p_name text, p_amount integer, p_duration_days integer, p_is_active boolean default true)
returns public.worker_recommendation_plans language plpgsql security definer set search_path = '' as $$
declare result public.worker_recommendation_plans;
begin
  if not public.is_admin(true) then raise exception using errcode = '42501', message = 'ADMIN_REQUIRED'; end if;
  if p_amount < 0 or p_duration_days not between 1 and 3650 then raise exception using errcode = '22023', message = 'INVALID_PLAN'; end if;
  insert into public.worker_recommendation_plans(id, name, amount, duration_days, is_active)
  values(coalesce(p_id, gen_random_uuid()), trim(p_name), p_amount, p_duration_days, p_is_active)
  on conflict(id) do update set name = excluded.name, amount = excluded.amount, duration_days = excluded.duration_days, is_active = excluded.is_active, updated_at = now()
  returning * into result;
  return result;
end $$;
create or replace function public.admin_activate_subscription(p_worker_id uuid, p_plan_id uuid, p_starts_at timestamptz default now())
returns public.worker_recommendation_subscriptions language plpgsql security definer set search_path = '' as $$
declare plan public.worker_recommendation_plans; result public.worker_recommendation_subscriptions;
begin
  if not public.is_admin(true) then raise exception using errcode = '42501', message = 'ADMIN_REQUIRED'; end if;
  select * into plan from public.worker_recommendation_plans where id = p_plan_id and is_active;
  if plan.id is null then raise exception using errcode = '22023', message = 'PLAN_UNAVAILABLE'; end if;
  update public.worker_recommendation_subscriptions set status = 'cancelled' where worker_id = p_worker_id and status = 'active';
  insert into public.worker_recommendation_subscriptions(worker_id, plan_id, plan_name, amount, duration_days, starts_at, expires_at)
  values(p_worker_id, plan.id, plan.name, plan.amount, plan.duration_days, p_starts_at, p_starts_at + make_interval(days => plan.duration_days)) returning * into result;
  update public.worker_profiles set recommendation_priority = true where account_id = p_worker_id;
  return result;
end $$;
create or replace function public.admin_extend_subscription(p_subscription_id uuid, p_days integer)
returns public.worker_recommendation_subscriptions language plpgsql security definer set search_path = '' as $$
declare result public.worker_recommendation_subscriptions;
begin
  if not public.is_admin(true) then raise exception using errcode = '42501', message = 'ADMIN_REQUIRED'; end if;
  if p_days not between 1 and 3650 then raise exception using errcode = '22023', message = 'INVALID_EXTENSION'; end if;
  update public.worker_recommendation_subscriptions set expires_at = greatest(expires_at, now()) + make_interval(days => p_days), status = 'active'
  where id = p_subscription_id returning * into result;
  if result.id is null then raise exception using errcode = 'P0002', message = 'SUBSCRIPTION_NOT_FOUND'; end if;
  update public.worker_profiles set recommendation_priority = true where account_id = result.worker_id;
  return result;
end $$;
create or replace function public.admin_cancel_subscription(p_subscription_id uuid)
returns public.worker_recommendation_subscriptions language plpgsql security definer set search_path = '' as $$
declare result public.worker_recommendation_subscriptions;
begin
  if not public.is_admin(true) then raise exception using errcode = '42501', message = 'ADMIN_REQUIRED'; end if;
  update public.worker_recommendation_subscriptions set status = 'cancelled', expires_at = least(expires_at, now()) where id = p_subscription_id returning * into result;
  if result.id is null then raise exception using errcode = 'P0002', message = 'SUBSCRIPTION_NOT_FOUND'; end if;
  update public.worker_profiles set recommendation_priority = exists(select 1 from public.worker_recommendation_subscriptions where worker_id = result.worker_id and status = 'active' and expires_at > now()) where account_id = result.worker_id;
  return result;
end $$;
create or replace function public.check_expired_subscriptions()
returns integer language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  update public.worker_recommendation_subscriptions set status = 'expired' where status = 'active' and expires_at <= now();
  get diagnostics changed = row_count;
  update public.worker_profiles wp set recommendation_priority = exists(select 1 from public.worker_recommendation_subscriptions s where s.worker_id = wp.account_id and s.status = 'active' and s.expires_at > now())
  where wp.recommendation_priority;
  return changed;
end $$;
alter function public.generate_matches(uuid) rename to generate_matches_weighted_core;
create function public.generate_matches(p_service_request_id uuid)
returns setof public.match_candidates language plpgsql security definer set search_path = '' as $$
begin
  perform public.check_expired_subscriptions();
  return query select * from public.generate_matches_weighted_core(p_service_request_id);
end $$;
revoke all on function public.admin_upsert_subscription_plan(uuid, text, integer, integer, boolean), public.admin_activate_subscription(uuid, uuid, timestamptz), public.admin_extend_subscription(uuid, integer), public.admin_cancel_subscription(uuid), public.check_expired_subscriptions() from public, anon;
grant execute on function public.admin_upsert_subscription_plan(uuid, text, integer, integer, boolean), public.admin_activate_subscription(uuid, uuid, timestamptz), public.admin_extend_subscription(uuid, integer), public.admin_cancel_subscription(uuid) to authenticated;
grant execute on function public.check_expired_subscriptions() to service_role;
revoke all on function public.generate_matches(uuid) from public, anon;
grant execute on function public.generate_matches(uuid) to authenticated;
