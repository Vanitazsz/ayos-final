-- Service-category commission overrides and worker-owned manual top-up reads.
-- NULL commission_rate_percent inherits the global platform setting.

alter table public.service_categories
  add column commission_rate_percent numeric(5,2);

alter table public.service_categories
  add constraint service_categories_commission_rate_percent_check
  check (
    commission_rate_percent is null
    or commission_rate_percent between 0 and 50
  );

create or replace function public.get_effective_commission_rate(p_category_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  category_override numeric(5,2);
  global_rate numeric(5,2);
begin
  select commission_rate_percent
  into category_override
  from public.service_categories
  where id = p_category_id;

  if not found then
    raise exception using errcode = '22023', message = 'SERVICE_CATEGORY_NOT_FOUND';
  end if;

  select (value #>> '{}')::numeric
  into global_rate
  from public.system_settings
  where key = 'platform_settings.commission_rate';

  global_rate := coalesce(global_rate, 10);
  if global_rate < 0 or global_rate > 50 then
    raise exception using errcode = '22023', message = 'INVALID_PLATFORM_COMMISSION_RATE';
  end if;

  return coalesce(category_override, global_rate);
end;
$$;

revoke all on function public.get_effective_commission_rate(uuid) from public, anon;
grant execute on function public.get_effective_commission_rate(uuid) to authenticated;

create or replace function public.get_platform_fee_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'commissionRate', coalesce((
      select (value #>> '{}')::numeric
      from public.system_settings
      where key = 'platform_settings.commission_rate'
    ), 10),
    'homeownerCharge', coalesce((
      select (value #>> '{}')::numeric
      from public.system_settings
      where key = 'platform_settings.homeowner_charge'
    ), 0),
    'serviceCategoryOverrides', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', category.id,
          'name', category.name,
          'commissionRatePercent', category.commission_rate_percent
        )
        order by category.name
      )
      from public.service_categories category
      where category.commission_rate_percent is not null
    ), '[]'::jsonb)
  )
$$;

revoke all on function public.get_platform_fee_settings() from public, anon;
grant execute on function public.get_platform_fee_settings() to authenticated;

create or replace function public.admin_set_service_category_commission_rate(
  p_category_id uuid,
  p_rate_percent numeric
)
returns public.service_categories
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.service_categories;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  if p_rate_percent is not null and (p_rate_percent < 0 or p_rate_percent > 50) then
    raise exception using errcode = '22023', message = 'INVALID_PLATFORM_COMMISSION_RATE';
  end if;

  update public.service_categories
  set commission_rate_percent = p_rate_percent,
      updated_at = now()
  where id = p_category_id
  returning * into result;

  if result.id is null then
    raise exception using errcode = '22023', message = 'SERVICE_CATEGORY_NOT_FOUND';
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'SERVICE_CATEGORY_COMMISSION_UPDATED',
    'service_category',
    result.id::text,
    jsonb_build_object('commission_rate_percent', p_rate_percent)
  );
  return result;
end;
$$;

revoke all on function public.admin_set_service_category_commission_rate(uuid, numeric) from public, anon;
grant execute on function public.admin_set_service_category_commission_rate(uuid, numeric) to authenticated;

create or replace function public.deduct_booking_commission(
  p_booking_id uuid,
  p_payment_method text default 'CASH'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  payment public.payments;
  category_id uuid;
  rate_percent numeric(5,2);
  rate numeric(5,4);
  comm_amount numeric(12,2);
  settlement_method public.payment_method;
  worker_wallet public.wallets;
  previous_balance numeric(12,2);
  new_balance numeric(12,2);
begin
  select * into booking
  from public.bookings
  where id = p_booking_id
  for update;

  if booking.id is null or auth.uid() not in (booking.user_account_id, booking.worker_account_id) then
    raise exception using errcode = '42501', message = 'Booking unavailable';
  end if;

  select request.category_id
  into category_id
  from public.service_requests request
  where request.id = booking.service_request_id;
  rate_percent := public.get_effective_commission_rate(category_id);
  rate := rate_percent / 100;
  comm_amount := round(booking.agreed_service_amount * rate, 2);

  settlement_method := case upper(coalesce(p_payment_method, 'CASH'))
    when 'ONLINE_SIMULATED' then 'GCASH'::public.payment_method
    when 'CASH' then 'CASH'::public.payment_method
    when 'GCASH' then 'GCASH'::public.payment_method
    when 'MAYA' then 'MAYA'::public.payment_method
    when 'CREDIT_DEBIT_CARD' then 'CREDIT_DEBIT_CARD'::public.payment_method
    when 'WALLET' then 'WALLET'::public.payment_method
    else null
  end;
  if settlement_method is null then
    raise exception using errcode = '22023', message = 'Invalid payment method';
  end if;

  -- The active ledger stores worker earnings net of commission. The payment
  -- status transition below invokes credit_worker_wallet, so this RPC must not
  -- append a second commission debit to the modern ledger.
  insert into public.wallets(account_id)
  values (booking.worker_account_id)
  on conflict(account_id) do nothing;

  select * into worker_wallet
  from public.wallets
  where account_id = booking.worker_account_id
  for update;
  previous_balance := coalesce(worker_wallet.available_minor, 0)::numeric / 100;

  select * into payment
  from public.payments
  where booking_id = booking.id
  for update;

  if payment.id is null then
    insert into public.payments(
      booking_id, method, status, service_amount, commission_rate, commission_amount,
      worker_net_amount, homeowner_platform_charge, idempotency_key
    ) values (
      booking.id, settlement_method, 'PENDING',
      booking.agreed_service_amount,
      rate,
      comm_amount,
      booking.agreed_service_amount - comm_amount,
      0,
      'comm-' || booking.id::text
    ) returning * into payment;
  end if;

  if payment.status <> 'SUCCESSFUL' then
    update public.payments
    set status = 'SUCCESSFUL',
        method = settlement_method,
        commission_rate = rate,
        commission_amount = comm_amount,
        worker_net_amount = booking.agreed_service_amount - comm_amount,
        successful_at = coalesce(successful_at, now()),
        paid_at = coalesce(paid_at, now())
    where id = payment.id
    returning * into payment;
  end if;

  select coalesce(available_minor, 0)::numeric / 100
  into new_balance
  from public.wallets
  where account_id = booking.worker_account_id;

  return jsonb_build_object(
    'bookingId', booking.id,
    'commissionAmount', comm_amount,
    'commissionRatePercent', rate_percent,
    'paymentMethod', payment.method,
    'previousBalance', previous_balance,
    'newBalance', new_balance,
    'status', 'COMPLETED'
  );
end;
$$;

revoke all on function public.deduct_booking_commission(uuid, text) from public, anon;
grant execute on function public.deduct_booking_commission(uuid, text) to authenticated;

create or replace function public.confirm_cash_payment(p_booking_id uuid, p_idempotency_key text)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  payment public.payments;
  confirmation_party public.cash_confirmation_party;
  category_id uuid;
  amount numeric(12,2);
  rate_percent numeric(5,2);
  rate numeric(5,4);
  homeowner_charge numeric(12,2);
  commission numeric(12,2);
begin
  select * into booking from public.bookings where id = p_booking_id for update;
  if booking.status <> 'COMPLETED' or auth.uid() not in (booking.user_account_id, booking.worker_account_id) then
    raise exception using errcode = '42501', message = 'Cash confirmation not allowed';
  end if;
  if length(p_idempotency_key) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'Invalid idempotency key';
  end if;
  select * into payment from public.payments where booking_id = booking.id for update;
  confirmation_party := case
    when auth.uid() = booking.user_account_id then 'USER'::public.cash_confirmation_party
    else 'WORKER'::public.cash_confirmation_party
  end;
  if payment.status = 'SUCCESSFUL' then
    if payment.method = 'CASH' then
      insert into public.cash_confirmations(payment_id, account_id, party)
      values(payment.id, auth.uid(), confirmation_party)
      on conflict(payment_id, party) do nothing;
      insert into public.receipts(
        payment_id, receipt_number, service_amount, commission_rate,
        commission_amount, worker_net_amount, homeowner_platform_charge
      ) values(
        payment.id,
        'AYOS-' || upper(substr(replace(payment.id::text, '-', ''), 1, 12)),
        payment.service_amount,
        payment.commission_rate,
        payment.commission_amount,
        payment.worker_net_amount,
        payment.homeowner_platform_charge
      ) on conflict(payment_id) do nothing;
    end if;
    return payment;
  end if;
  if payment.id is not null and payment.method = 'GCASH' and payment.status in ('PENDING', 'AWAITING_CONFIRMATIONS') then
    raise exception using errcode = '55000', message = 'GCash payment is already in progress';
  end if;

  select request.category_id
  into category_id
  from public.service_requests request
  where request.id = booking.service_request_id;
  amount := booking.agreed_service_amount;
  rate_percent := public.get_effective_commission_rate(category_id);
  select coalesce((value #>> '{}')::numeric, 0)
  into homeowner_charge
  from public.system_settings
  where key = 'platform_settings.homeowner_charge';
  homeowner_charge := coalesce(homeowner_charge, 0);
  if homeowner_charge < 0 then
    raise exception using errcode = '22023', message = 'Invalid platform fee settings';
  end if;
  rate := rate_percent / 100;
  commission := round(amount * rate, 2);

  if payment.id is null then
    insert into public.payments(
      booking_id, method, status, service_amount, commission_rate,
      commission_amount, worker_net_amount, homeowner_platform_charge, idempotency_key
    ) values(
      booking.id, 'CASH', 'AWAITING_CONFIRMATIONS', amount, rate,
      commission, amount - commission, homeowner_charge, p_idempotency_key
    ) returning * into payment;
  else
    update public.payments
    set method = 'CASH',
        status = 'AWAITING_CONFIRMATIONS',
        provider = null,
        provider_payment_id = null,
        failure_reason = null,
        service_amount = amount,
        commission_rate = rate,
        commission_amount = commission,
        worker_net_amount = amount - commission,
        homeowner_platform_charge = homeowner_charge
    where id = payment.id
    returning * into payment;
  end if;

  insert into public.cash_confirmations(payment_id, account_id, party)
  values(payment.id, auth.uid(), confirmation_party)
  on conflict(payment_id, party) do nothing;
  if (select count(*) from public.cash_confirmations where payment_id = payment.id) = 2 then
    update public.payments
    set status = 'SUCCESSFUL', successful_at = coalesce(successful_at, now()), paid_at = coalesce(paid_at, now())
    where id = payment.id
    returning * into payment;
    insert into public.receipts(
      payment_id, receipt_number, service_amount, commission_rate,
      commission_amount, worker_net_amount, homeowner_platform_charge
    ) values(
      payment.id,
      'AYOS-' || upper(substr(replace(payment.id::text, '-', ''), 1, 12)),
      payment.service_amount,
      payment.commission_rate,
      payment.commission_amount,
      payment.worker_net_amount,
      payment.homeowner_platform_charge
    ) on conflict(payment_id) do nothing;
  end if;
  return payment;
end;
$$;

revoke all on function public.confirm_cash_payment(uuid, text) from public, anon;
grant execute on function public.confirm_cash_payment(uuid, text) to authenticated;

create or replace function public.simulate_gcash_booking_payment(
  p_booking_id uuid,
  p_reference_number text
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  payment public.payments;
  category_id uuid;
  expected_ref text;
  rate_percent numeric(5,2);
  homeowner_charge numeric(12,2);
  rate numeric(5,4);
  comm_amount numeric(12,2);
  worker_net numeric(12,2);
  idempotency_key text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  select * into booking from public.bookings where id = p_booking_id for update;
  if booking.id is null or auth.uid() <> booking.user_account_id then
    raise exception using errcode = '42501', message = 'Only the booking customer can simulate GCash payment';
  end if;
  if booking.status <> 'COMPLETED' then
    raise exception using errcode = '22023', message = 'Booking is not completed';
  end if;

  expected_ref := 'MOCK-GCASH-' || upper(substr(replace(p_booking_id::text, '-', ''), 1, 12));
  if p_reference_number is null or p_reference_number <> expected_ref then
    raise exception using errcode = '22023', message = 'Invalid GCash mock reference number';
  end if;
  select * into payment from public.payments where booking_id = booking.id for update;
  if payment.id is not null then
    if payment.method = 'CASH' and payment.status in ('AWAITING_CONFIRMATIONS', 'SUCCESSFUL') then
      raise exception using errcode = '55000', message = 'Cash settlement is already in progress or completed';
    end if;
    if payment.method = 'GCASH' and payment.status = 'SUCCESSFUL' then
      return payment;
    end if;
  end if;

  select request.category_id
  into category_id
  from public.service_requests request
  where request.id = booking.service_request_id;
  rate_percent := public.get_effective_commission_rate(category_id);
  rate := rate_percent / 100;
  select coalesce((value #>> '{}')::numeric, 0)
  into homeowner_charge
  from public.system_settings
  where key = 'platform_settings.homeowner_charge';
  homeowner_charge := coalesce(homeowner_charge, 0);
  if homeowner_charge < 0 then
    raise exception using errcode = '22023', message = 'Invalid platform fee settings';
  end if;
  comm_amount := round(booking.agreed_service_amount * rate, 2);
  worker_net := booking.agreed_service_amount - comm_amount;
  idempotency_key := 'mock-gcash-' || booking.id::text;

  if payment.id is null then
    insert into public.payments(
      booking_id, method, provider, status, service_amount, commission_rate,
      commission_amount, worker_net_amount, homeowner_platform_charge,
      idempotency_key, provider_payment_id
    ) values(
      booking.id, 'GCASH', 'MOCK_GCASH', 'PENDING', booking.agreed_service_amount,
      rate, comm_amount, worker_net, homeowner_charge, idempotency_key, p_reference_number
    ) returning * into payment;
  else
    update public.payments
    set method = 'GCASH', provider = 'MOCK_GCASH', status = 'PENDING',
        service_amount = booking.agreed_service_amount, commission_rate = rate,
        commission_amount = comm_amount, worker_net_amount = worker_net,
        homeowner_platform_charge = homeowner_charge, provider_payment_id = p_reference_number,
        failure_reason = null
    where id = payment.id
    returning * into payment;
  end if;

  update public.payments
  set status = 'SUCCESSFUL', successful_at = coalesce(successful_at, now()), paid_at = coalesce(paid_at, now())
  where id = payment.id
  returning * into payment;
  insert into public.receipts(
    payment_id, receipt_number, service_amount, commission_rate,
    commission_amount, worker_net_amount, homeowner_platform_charge
  ) values(
    payment.id,
    'AYOS-' || upper(substr(replace(payment.id::text, '-', ''), 1, 12)),
    payment.service_amount,
    payment.commission_rate,
    payment.commission_amount,
    payment.worker_net_amount,
    payment.homeowner_platform_charge
  ) on conflict(payment_id) do nothing;
  return payment;
end;
$$;

revoke all on function public.simulate_gcash_booking_payment(uuid, text) from public, anon;
grant execute on function public.simulate_gcash_booking_payment(uuid, text) to authenticated;

create or replace function public.get_my_wallet_topups()
returns setof public.wallet_topups
language sql
stable
security definer
set search_path = ''
as $$
  select topup.*
  from public.wallet_topups topup
  join public.wallet_accounts wallet
    on wallet.id = topup.wallet_account_id
  where wallet.account_id = auth.uid()
  order by topup.created_at desc
  limit 20
$$;

revoke all on function public.get_my_wallet_topups() from public, anon;
grant execute on function public.get_my_wallet_topups() to authenticated;

notify pgrst, 'reload schema';
