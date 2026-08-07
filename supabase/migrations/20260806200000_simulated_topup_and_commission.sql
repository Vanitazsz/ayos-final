-- MVP Simulated Wallet Top-Up and Commission Deduction RPCs

do $$
begin
  alter table public.wallet_transactions drop constraint if exists wallet_transactions_kind_check;
  alter table public.wallet_transactions add constraint wallet_transactions_kind_check
    check (kind in ('EARNING','TOP_UP','PAYOUT','REFUND','FEE','ADJUSTMENT','COMMISSION','COMMISSION_DEDUCTION'));
exception
  when others then null;
end $$;

-- 1. Simulate Wallet Top-Up RPC
create or replace function public.simulate_wallet_topup(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  w_id uuid;
  prev_balance numeric(12,2);
  new_balance numeric(12,2);
  tx_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_amount <= 0 then
    raise exception using errcode = '22023', message = 'Top-up amount must be positive';
  end if;

  -- Ensure wallet account exists
  insert into public.wallet_accounts(account_id)
  values (auth.uid())
  on conflict(account_id) do update set updated_at = now()
  returning id into w_id;

  if w_id is null then
    select id into w_id from public.wallet_accounts where account_id = auth.uid();
  end if;

  -- Calculate previous balance
  select coalesce(sum(t.amount) filter (where t.status in ('AVAILABLE','COMPLETED')), 0)
  into prev_balance
  from public.wallet_transactions t
  where t.wallet_account_id = w_id;

  -- Insert top_up transaction record
  insert into public.wallet_transactions(
    wallet_account_id, kind, status, amount, source_type, source_id, description, available_at
  ) values (
    w_id, 'TOP_UP', 'AVAILABLE', p_amount, 'SIMULATED_TOP_UP', gen_random_uuid(),
    'Simulated wallet top-up', now()
  ) returning id into tx_id;

  new_balance := prev_balance + p_amount;

  return jsonb_build_object(
    'previousBalance', prev_balance,
    'newBalance', new_balance,
    'amount', p_amount,
    'status', 'Successful',
    'transactionId', tx_id
  );
end;
$$;

revoke all on function public.simulate_wallet_topup(numeric) from public, anon;
grant execute on function public.simulate_wallet_topup(numeric) to authenticated;

-- 2. Deduct Booking Commission RPC
create or replace function public.deduct_booking_commission(p_booking_id uuid, p_payment_method text default 'CASH')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings;
  payment public.payments;
  w_id uuid;
  comm_amount numeric(12,2);
  existing_tx uuid;
  prev_balance numeric(12,2);
  new_balance numeric(12,2);
begin
  select * into booking from public.bookings where id = p_booking_id for update;
  if booking.id is null or auth.uid() not in (booking.user_account_id, booking.worker_account_id) then
    raise exception using errcode = '42501', message = 'Booking unavailable';
  end if;

  comm_amount := round(booking.agreed_service_amount * 0.10, 2);

  -- Get or create worker wallet account
  insert into public.wallet_accounts(account_id)
  values (booking.worker_account_id)
  on conflict(account_id) do update set updated_at = now()
  returning id into w_id;

  if w_id is null then
    select id into w_id from public.wallet_accounts where account_id = booking.worker_account_id;
  end if;

  -- Idempotency check: see if commission transaction already exists for this booking
  select id into existing_tx
  from public.wallet_transactions
  where wallet_account_id = w_id
    and source_type = 'BOOKING_COMMISSION'
    and source_id = booking.id
    and kind in ('COMMISSION', 'COMMISSION_DEDUCTION');

  -- Update payment record status to SUCCESSFUL
  select * into payment from public.payments where booking_id = booking.id for update;
  if payment.id is null then
    insert into public.payments(
      booking_id, method, status, service_amount, commission_rate, commission_amount,
      worker_net_amount, homeowner_platform_charge, idempotency_key
    ) values (
      booking.id, coalesce(p_payment_method, 'CASH'), 'SUCCESSFUL', booking.agreed_service_amount,
      0.10, comm_amount, booking.agreed_service_amount - comm_amount, 0,
      'comm-' || booking.id::text
    ) returning * into payment;
  else
    update public.payments
    set status = 'SUCCESSFUL',
        method = coalesce(p_payment_method, method),
        commission_rate = 0.10,
        commission_amount = comm_amount,
        worker_net_amount = booking.agreed_service_amount - comm_amount,
        successful_at = coalesce(successful_at, now()),
        paid_at = coalesce(paid_at, now())
    where id = payment.id returning * into payment;
  end if;

  if existing_tx is null then
    -- Get previous balance
    select coalesce(sum(t.amount) filter (where t.status in ('AVAILABLE','COMPLETED')), 0)
    into prev_balance
    from public.wallet_transactions t
    where t.wallet_account_id = w_id;

    -- Create commission deduction transaction
    insert into public.wallet_transactions(
      wallet_account_id, kind, status, amount, source_type, source_id, description, available_at
    ) values (
      w_id, 'COMMISSION', 'AVAILABLE', -comm_amount, 'BOOKING_COMMISSION', booking.id,
      'Platform commission deduction (10%)', now()
    );

    new_balance := prev_balance - comm_amount;
  else
    select coalesce(sum(t.amount) filter (where t.status in ('AVAILABLE','COMPLETED')), 0)
    into new_balance
    from public.wallet_transactions t
    where t.wallet_account_id = w_id;
    prev_balance := new_balance;
  end if;

  return jsonb_build_object(
    'bookingId', booking.id,
    'commissionAmount', comm_amount,
    'paymentMethod', payment.method,
    'previousBalance', prev_balance,
    'newBalance', new_balance,
    'status', 'COMPLETED'
  );
end;
$$;

revoke all on function public.deduct_booking_commission(uuid, text) from public, anon;
grant execute on function public.deduct_booking_commission(uuid, text) to authenticated;

notify pgrst, 'reload schema';
