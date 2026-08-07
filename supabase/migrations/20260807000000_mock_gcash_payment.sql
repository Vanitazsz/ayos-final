-- Migration: Mock GCash Payment with Worker Earnings and Payout Protection

-- 1. Relax payment table constraints to allow GCASH method and MOCK_GCASH provider
do $$
begin
  alter table public.payments drop constraint if exists payments_method_check;
  alter table public.payments drop constraint if exists payments_new_rows_cash_only;
  alter table public.payments drop constraint if exists payments_provider_check;
exception
  when others then null;
end $$;

alter table public.payments
  add constraint payments_method_check check (method in ('CASH', 'GCASH', 'MAYA', 'CREDIT_DEBIT_CARD', 'WALLET'));

alter table public.payments
  add constraint payments_provider_check check (provider is null or provider in ('PAYMONGO', 'MOCK_GCASH'));

-- 2. Update credit_worker_wallet trigger function to tag simulated GCash transactions in metadata
create or replace function public.credit_worker_wallet() returns trigger language plpgsql security definer set search_path='' as $$
declare
  worker_id uuid;
  amount_minor bigint;
  current_balance bigint;
  meta jsonb := '{}';
  mock_ref text;
begin
  if new.status = 'SUCCESSFUL' and old.status is distinct from 'SUCCESSFUL' then
    select b.worker_account_id into worker_id from public.bookings b where b.id = new.booking_id;
    amount_minor := round(new.worker_net_amount * 100)::bigint;

    if new.method = 'GCASH' or new.provider = 'MOCK_GCASH' then
      mock_ref := 'MOCK-GCASH-' || upper(substr(replace(new.booking_id::text, '-', ''), 1, 12));
      meta := jsonb_build_object(
        'simulated', true,
        'payment_method', 'GCASH',
        'reference_number', mock_ref
      );
    end if;

    insert into public.wallets(account_id) values(worker_id) on conflict do nothing;
    update public.wallets set available_minor = available_minor + amount_minor, updated_at = now()
    where account_id = worker_id returning available_minor into current_balance;

    insert into public.wallet_transactions(
      wallet_account_id, booking_id, transaction_type, amount_minor, balance_after_minor, idempotency_key, metadata
    ) values (
      worker_id, new.booking_id, 'BOOKING_EARNING', amount_minor, current_balance, 'payment:' || new.id::text || ':worker-earning', meta
    ) on conflict(idempotency_key) do nothing;
  end if;
  return new;
end $$;

-- 3. RPC: simulate_gcash_booking_payment
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
  comm_amount := round(booking.agreed_service_amount * rate, 2);
  worker_net := booking.agreed_service_amount - comm_amount;
  idempotency_key := 'mock-gcash-' || booking.id::text;

  -- Create or set payment to PENDING first
  if payment.id is null then
    insert into public.payments(
      booking_id, method, provider, status, service_amount, commission_rate, commission_amount,
      worker_net_amount, homeowner_platform_charge, idempotency_key, provider_payment_id
    ) values (
      booking.id, 'GCASH', 'MOCK_GCASH', 'PENDING', booking.agreed_service_amount, rate, comm_amount,
      worker_net, homeowner_charge, idempotency_key, p_reference_number
    ) returning * into payment;
  else
    update public.payments
    set method = 'GCASH',
        provider = 'MOCK_GCASH',
        status = 'PENDING',
        service_amount = booking.agreed_service_amount,
        commission_rate = rate,
        commission_amount = comm_amount,
        worker_net_amount = worker_net,
        homeowner_platform_charge = homeowner_charge,
        provider_payment_id = p_reference_number,
        failure_reason = null
    where id = payment.id returning * into payment;
  end if;

  -- Transition from PENDING to SUCCESSFUL to trigger worker wallet credit
  update public.payments
  set status = 'SUCCESSFUL',
      successful_at = coalesce(successful_at, now()),
      paid_at = coalesce(paid_at, now())
  where id = payment.id returning * into payment;

  -- Create receipt record
  insert into public.receipts(
    payment_id, receipt_number, service_amount, commission_rate, commission_amount, worker_net_amount, homeowner_platform_charge
  ) values (
    payment.id, 'AYOS-' || upper(substr(replace(payment.id::text, '-', ''), 1, 12)), payment.service_amount, payment.commission_rate, payment.commission_amount, payment.worker_net_amount, payment.homeowner_platform_charge
  ) on conflict(payment_id) do nothing;

  return payment;
end;
$$;

revoke all on function public.simulate_gcash_booking_payment(uuid, text) from public, anon;
grant execute on function public.simulate_gcash_booking_payment(uuid, text) to authenticated;

-- 4. Update request_payout to exclude simulated wallet credits from payoutable balance
create or replace function public.request_payout(p_method_id uuid, p_amount_minor bigint, p_idempotency_key text)
returns public.payout_requests language plpgsql security definer set search_path='' as $$
declare
  wallet public.wallets;
  payoutable_minor bigint;
  result public.payout_requests;
begin
  if length(p_idempotency_key) not between 16 and 160 or p_amount_minor <= 0 then
    raise exception using errcode = '22023', message = 'INVALID_PAYOUT';
  end if;

  if not exists(select 1 from public.payout_methods where id = p_method_id and account_id = auth.uid()) then
    raise exception using errcode = '42501', message = 'PAYOUT_METHOD_UNAVAILABLE';
  end if;

  insert into public.wallets(account_id) values(auth.uid()) on conflict do nothing;
  select * into wallet from public.wallets where account_id = auth.uid() for update;

  -- Calculate genuine payoutable balance excluding simulated wallet credits
  select coalesce(sum(t.amount_minor), 0) into payoutable_minor
  from public.wallet_transactions t
  where t.wallet_account_id = auth.uid()
    and (t.metadata->>'simulated' is null or (t.metadata->>'simulated')::boolean = false);

  if payoutable_minor < p_amount_minor then
    raise exception using errcode = '22023', message = 'INSUFFICIENT_BALANCE';
  end if;

  insert into public.payout_requests(account_id, payout_method_id, amount_minor, idempotency_key)
  values(auth.uid(), p_method_id, p_amount_minor, p_idempotency_key) returning * into result;

  update public.wallets set available_minor = available_minor - p_amount_minor, locked_minor = locked_minor + p_amount_minor, updated_at = now()
  where account_id = auth.uid();

  insert into public.wallet_transactions(wallet_account_id, payout_request_id, transaction_type, amount_minor, balance_after_minor, idempotency_key)
  values(auth.uid(), result.id, 'PAYOUT_HOLD', -p_amount_minor, wallet.available_minor - p_amount_minor, p_idempotency_key || ':hold');

  return result;
end;
$$;

notify pgrst, 'reload schema';
