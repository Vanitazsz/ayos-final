-- PayMongo GCash payments and worker financial ledger.

alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments
  add column currency text not null default 'PHP' check (currency = 'PHP'),
  add column provider text check (provider is null or provider in ('PAYMONGO')),
  add column provider_payment_id text,
  add column paid_at timestamptz;
create unique index payments_provider_payment_idx on public.payments(provider, provider_payment_id)
  where provider_payment_id is not null;

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  provider text not null check (provider = 'PAYMONGO'),
  method public.payment_method not null check (method = 'GCASH'),
  status text not null default 'PENDING' check (status in ('PENDING','REQUIRES_ACTION','PROCESSING','SUCCESSFUL','FAILED','EXPIRED','CANCELLED')),
  amount_centavos bigint not null check (amount_centavos between 100 and 10000000),
  currency text not null default 'PHP' check (currency = 'PHP'),
  idempotency_key text not null unique check (length(idempotency_key) between 16 and 128),
  provider_intent_id text unique,
  provider_payment_method_id text,
  provider_payment_id text unique,
  redirect_url text,
  return_url text,
  failure_code text,
  failure_reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index payment_attempts_payment_time_idx on public.payment_attempts(payment_id, created_at desc);

create table public.payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'PAYMONGO'),
  provider_event_id text not null,
  event_type text not null,
  livemode boolean not null,
  payload_hash text not null,
  status text not null default 'RECEIVED' check (status in ('RECEIVED','PROCESSED','IGNORED','FAILED')),
  failure_reason text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(provider, provider_event_id)
);

create table public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references public.worker_profiles(account_id) on delete restrict,
  currency text not null default 'PHP' check (currency = 'PHP'),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','FROZEN','CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete restrict,
  kind text not null check (kind in ('EARNING','TOP_UP','PAYOUT','REFUND','FEE','ADJUSTMENT')),
  status text not null check (status in ('PENDING','AVAILABLE','HELD','COMPLETED','FAILED','REVERSED')),
  amount numeric(12,2) not null check (amount <> 0),
  source_type text not null,
  source_id uuid not null,
  description text not null check (length(description) between 1 and 240),
  available_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(wallet_account_id, source_type, source_id, kind)
);
create index wallet_transactions_wallet_time_idx on public.wallet_transactions(wallet_account_id, created_at desc);

create table public.payout_destinations (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(account_id) on delete restrict,
  kind text not null check (kind in ('GCASH','BANK')),
  label text not null check (length(label) between 1 and 80),
  account_name text not null check (length(account_name) between 2 and 120),
  account_reference text not null check (length(account_reference) between 4 and 120),
  is_default boolean not null default false,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','DISABLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index one_default_payout_destination on public.payout_destinations(worker_id) where is_default and status = 'ACTIVE';

create table public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete restrict,
  destination_id uuid not null references public.payout_destinations(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  fee_amount numeric(12,2) not null default 0 check (fee_amount >= 0),
  status text not null default 'PENDING' check (status in ('PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED')),
  idempotency_key text not null unique check (length(idempotency_key) between 16 and 128),
  provider text,
  provider_reference text,
  failure_reason text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index payout_requests_wallet_time_idx on public.payout_requests(wallet_account_id, created_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array['payment_attempts','payment_provider_events','wallet_accounts','wallet_transactions','payout_destinations','payout_requests']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
  end loop;
end $$;

grant select on public.payment_attempts, public.wallet_accounts, public.wallet_transactions,
  public.payout_destinations, public.payout_requests to authenticated;

create policy payment_attempts_party_or_admin_read on public.payment_attempts for select to authenticated
using (exists (
  select 1 from public.payments p
  where p.id = payment_id and exists (
    select 1 from public.bookings b where b.id = p.booking_id and public.is_booking_party(b.id)
  )
));
create policy wallet_accounts_owner_or_admin_read on public.wallet_accounts for select to authenticated
using (account_id = auth.uid() or public.is_admin(true));
create policy wallet_transactions_owner_or_admin_read on public.wallet_transactions for select to authenticated
using (exists (
  select 1 from public.wallet_accounts w
  where w.id = wallet_account_id and (w.account_id = auth.uid() or public.is_admin(true))
));
create policy payout_destinations_owner_or_admin_read on public.payout_destinations for select to authenticated
using (worker_id = auth.uid() or public.is_admin(true));
create policy payout_requests_owner_or_admin_read on public.payout_requests for select to authenticated
using (exists (
  select 1 from public.wallet_accounts w
  where w.id = wallet_account_id and (w.account_id = auth.uid() or public.is_admin(true))
));

create trigger set_payment_attempts_updated_at before update on public.payment_attempts
for each row execute function public.set_updated_at();
create trigger set_wallet_accounts_updated_at before update on public.wallet_accounts
for each row execute function public.set_updated_at();
create trigger set_wallet_transactions_updated_at before update on public.wallet_transactions
for each row execute function public.set_updated_at();
create trigger set_payout_destinations_updated_at before update on public.payout_destinations
for each row execute function public.set_updated_at();
create trigger set_payout_requests_updated_at before update on public.payout_requests
for each row execute function public.set_updated_at();

create or replace function public.begin_gcash_payment(p_booking_id uuid, p_idempotency_key text)
returns public.payment_attempts
language plpgsql security definer set search_path = '' as $$
declare
  booking public.bookings;
  payment public.payments;
  attempt public.payment_attempts;
  service_amount numeric(12,2);
  commission_rate numeric(5,4) := 0.1000;
  commission_amount numeric(12,2);
begin
  if length(p_idempotency_key) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'Invalid idempotency key';
  end if;
  select * into booking from public.bookings where id = p_booking_id for update;
  if booking.id is null or booking.user_account_id is distinct from auth.uid() or booking.status <> 'COMPLETED' then
    raise exception using errcode = '42501', message = 'GCash payment is not allowed';
  end if;
  if not exists (select 1 from public.accounts a where a.id = auth.uid() and a.status = 'ACTIVE' and a.role = 'USER') then
    raise exception using errcode = '42501', message = 'Active user account required';
  end if;
  select * into payment from public.payments where booking_id = booking.id for update;
  if payment.status = 'SUCCESSFUL' then
    raise exception using errcode = '23505', message = 'Booking is already paid';
  end if;
  if payment.id is not null and payment.method = 'CASH' and exists (
    select 1 from public.cash_confirmations c where c.payment_id = payment.id
  ) then
    raise exception using errcode = '55000', message = 'Cash confirmation is already in progress';
  end if;
  service_amount := (select r.budget from public.service_requests r where r.id = booking.service_request_id);
  commission_amount := round(service_amount * commission_rate, 2);
  if payment.id is null then
    insert into public.payments(
      booking_id, method, status, service_amount, commission_rate, commission_amount,
      worker_net_amount, homeowner_platform_charge, idempotency_key, currency, provider
    ) values (
      booking.id, 'GCASH', 'PENDING', service_amount, commission_rate, commission_amount,
      service_amount - commission_amount, 0, p_idempotency_key, 'PHP', 'PAYMONGO'
    ) returning * into payment;
  else
    update public.payments set method = 'GCASH', status = 'PENDING', provider = 'PAYMONGO',
      failure_reason = null, updated_at = now()
    where id = payment.id returning * into payment;
  end if;
  select * into attempt from public.payment_attempts where idempotency_key = p_idempotency_key;
  if attempt.id is not null then
    if attempt.payment_id <> payment.id then
      raise exception using errcode = '23505', message = 'Idempotency key is already used';
    end if;
    return attempt;
  end if;
  insert into public.payment_attempts(
    payment_id, provider, method, status, amount_centavos, idempotency_key
  ) values (
    payment.id, 'PAYMONGO', 'GCASH', 'PENDING', round((service_amount + payment.homeowner_platform_charge) * 100), p_idempotency_key
  ) returning * into attempt;
  return attempt;
end $$;

create or replace function public.get_booking_payment(p_booking_id uuid)
returns table (
  payment_id uuid,
  method public.payment_method,
  status public.payment_status,
  service_amount numeric,
  commission_amount numeric,
  worker_net_amount numeric,
  homeowner_platform_charge numeric,
  provider text,
  provider_payment_id text,
  latest_attempt_status text,
  receipt_number text,
  paid_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.method, p.status, p.service_amount, p.commission_amount,
    p.worker_net_amount, p.homeowner_platform_charge, p.provider, p.provider_payment_id,
    a.status, r.receipt_number, coalesce(p.paid_at, p.successful_at)
  from public.payments p
  join public.bookings b on b.id = p.booking_id
  left join lateral (
    select pa.status from public.payment_attempts pa where pa.payment_id = p.id order by pa.created_at desc limit 1
  ) a on true
  left join public.receipts r on r.payment_id = p.id
  where p.booking_id = p_booking_id and public.is_booking_party(b.id)
$$;

create or replace function public.apply_paymongo_payment_event(
  p_provider_event_id text,
  p_event_type text,
  p_livemode boolean,
  p_payload_hash text,
  p_provider_intent_id text,
  p_provider_payment_id text,
  p_amount_centavos bigint,
  p_failure_reason text default null
)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  attempt public.payment_attempts;
  payment public.payments;
  booking public.bookings;
  event_id uuid;
begin
  insert into public.payment_provider_events(provider, provider_event_id, event_type, livemode, payload_hash)
  values ('PAYMONGO', p_provider_event_id, p_event_type, p_livemode, p_payload_hash)
  on conflict(provider, provider_event_id) do nothing
  returning id into event_id;
  if event_id is null then return 'DUPLICATE'; end if;
  select * into attempt from public.payment_attempts
  where provider_intent_id = p_provider_intent_id for update;
  if attempt.id is null then
    update public.payment_provider_events set status = 'IGNORED', processed_at = now(), failure_reason = 'Unknown payment intent'
    where id = event_id;
    return 'IGNORED';
  end if;
  select * into payment from public.payments where id = attempt.payment_id for update;
  if p_amount_centavos <> attempt.amount_centavos then
    update public.payment_provider_events set status = 'FAILED', processed_at = now(), failure_reason = 'Amount mismatch'
    where id = event_id;
    return 'AMOUNT_MISMATCH';
  end if;
  if p_event_type in ('payment.paid','payment_intent.succeeded') then
    update public.payment_attempts set status = 'SUCCESSFUL', provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      completed_at = coalesce(completed_at, now()), failure_code = null, failure_reason = null
    where id = attempt.id;
    update public.payments set status = 'SUCCESSFUL', provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      successful_at = coalesce(successful_at, now()), paid_at = coalesce(paid_at, now()), failure_reason = null
    where id = payment.id returning * into payment;
    insert into public.receipts(
      payment_id, receipt_number, service_amount, commission_rate, commission_amount, worker_net_amount, homeowner_platform_charge
    ) values (
      payment.id, 'AYOS-' || upper(substr(replace(payment.id::text, '-', ''), 1, 12)), payment.service_amount,
      payment.commission_rate, payment.commission_amount, payment.worker_net_amount, payment.homeowner_platform_charge
    ) on conflict(payment_id) do nothing;
    select * into booking from public.bookings where id = payment.booking_id;
    insert into public.notifications(recipient_id, title, body, category, status, sent_at, source_key)
    values (
      booking.user_account_id, 'GCash payment successful', 'Your GCash payment was verified and your receipt is ready.',
      'PAYMENT', 'SENT', now(), 'payment:' || payment.id::text || ':paid'
    ) on conflict(source_key) do nothing;
  elsif p_event_type in ('payment.failed','payment_intent.awaiting_payment_method') then
    update public.payment_attempts set status = 'FAILED', provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      failure_reason = coalesce(nullif(p_failure_reason, ''), 'GCash payment failed'), completed_at = now()
    where id = attempt.id;
    update public.payments set status = 'FAILED', failure_reason = coalesce(nullif(p_failure_reason, ''), 'GCash payment failed')
    where id = payment.id;
  else
    update public.payment_provider_events set status = 'IGNORED', processed_at = now() where id = event_id;
    return 'IGNORED';
  end if;
  update public.payment_provider_events set status = 'PROCESSED', processed_at = now() where id = event_id;
  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values ('PAYMONGO_EVENT_PROCESSED', 'payment', payment.id::text,
    jsonb_build_object('event_type', p_event_type, 'provider_event_id', p_provider_event_id));
  return 'PROCESSED';
end $$;

create or replace function public.credit_worker_wallet_after_payment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  worker_id uuid;
  wallet_id uuid;
begin
  if new.status <> 'SUCCESSFUL' or (old.status = 'SUCCESSFUL') then return new; end if;
  select b.worker_account_id into worker_id from public.bookings b where b.id = new.booking_id;
  insert into public.wallet_accounts(account_id) values (worker_id)
  on conflict(account_id) do update set updated_at = now()
  returning id into wallet_id;
  insert into public.wallet_transactions(
    wallet_account_id, kind, status, amount, source_type, source_id, description, available_at
  ) values (
    wallet_id, 'EARNING', 'AVAILABLE', new.worker_net_amount, 'PAYMENT', new.id,
    'Net earnings from completed service', now()
  ) on conflict(wallet_account_id, source_type, source_id, kind) do nothing;
  return new;
end $$;
create trigger credit_worker_wallet_after_payment
after update of status on public.payments for each row execute function public.credit_worker_wallet_after_payment();

create or replace function public.get_my_wallet_summary()
returns table (wallet_account_id uuid, available_balance numeric, pending_payout numeric, lifetime_earnings numeric)
language sql stable security definer set search_path = '' as $$
  select w.id,
    coalesce(sum(t.amount) filter (where t.status in ('AVAILABLE','HELD','COMPLETED')), 0),
    abs(coalesce(sum(t.amount) filter (where t.kind = 'PAYOUT' and t.status in ('HELD','PENDING')), 0)),
    coalesce(sum(t.amount) filter (where t.kind = 'EARNING' and t.status in ('AVAILABLE','COMPLETED')), 0)
  from public.wallet_accounts w
  left join public.wallet_transactions t on t.wallet_account_id = w.id
  where w.account_id = auth.uid()
  group by w.id
$$;

create or replace function public.upsert_payout_destination(
  p_id uuid,
  p_kind text,
  p_label text,
  p_account_name text,
  p_account_reference text,
  p_is_default boolean default false
)
returns public.payout_destinations
language plpgsql security definer set search_path = '' as $$
declare result public.payout_destinations;
begin
  if public.current_role() <> 'WORKER' or p_kind not in ('GCASH','BANK') then
    raise exception using errcode = '42501', message = 'Worker payout destination required';
  end if;
  if p_is_default then update public.payout_destinations set is_default = false where worker_id = auth.uid(); end if;
  insert into public.payout_destinations(id, worker_id, kind, label, account_name, account_reference, is_default)
  values (coalesce(p_id, gen_random_uuid()), auth.uid(), p_kind, trim(p_label), trim(p_account_name), trim(p_account_reference), p_is_default)
  on conflict(id) do update set kind = excluded.kind, label = excluded.label, account_name = excluded.account_name,
    account_reference = excluded.account_reference, is_default = excluded.is_default, status = 'ACTIVE'
  where public.payout_destinations.worker_id = auth.uid()
  returning * into result;
  return result;
end $$;

create or replace function public.request_payout(p_destination_id uuid, p_amount numeric, p_idempotency_key text)
returns public.payout_requests
language plpgsql security definer set search_path = '' as $$
declare
  wallet public.wallet_accounts;
  available numeric(12,2);
  payout public.payout_requests;
begin
  if public.current_role() <> 'WORKER' or p_amount < 100 or length(p_idempotency_key) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'Invalid payout request';
  end if;
  select * into wallet from public.wallet_accounts where account_id = auth.uid() and status = 'ACTIVE' for update;
  if wallet.id is null then raise exception using errcode = '22023', message = 'Wallet is unavailable'; end if;
  if not exists (select 1 from public.payout_destinations d where d.id = p_destination_id and d.worker_id = auth.uid() and d.status = 'ACTIVE') then
    raise exception using errcode = '42501', message = 'Payout destination is unavailable';
  end if;
  select coalesce(sum(t.amount), 0) into available from public.wallet_transactions t
  where t.wallet_account_id = wallet.id and t.status in ('AVAILABLE','HELD','COMPLETED');
  if available < p_amount then raise exception using errcode = '22023', message = 'Insufficient available balance'; end if;
  insert into public.payout_requests(wallet_account_id, destination_id, amount, idempotency_key)
  values (wallet.id, p_destination_id, p_amount, p_idempotency_key)
  on conflict(idempotency_key) do update set updated_at = now()
  returning * into payout;
  insert into public.wallet_transactions(wallet_account_id, kind, status, amount, source_type, source_id, description)
  values (wallet.id, 'PAYOUT', 'HELD', -p_amount, 'PAYOUT_REQUEST', payout.id, 'Worker payout request')
  on conflict(wallet_account_id, source_type, source_id, kind) do nothing;
  return payout;
end $$;

revoke all on function public.begin_gcash_payment(uuid,text) from public, anon;
revoke all on function public.get_booking_payment(uuid) from public, anon;
revoke all on function public.apply_paymongo_payment_event(text,text,boolean,text,text,text,bigint,text) from public, anon, authenticated;
revoke all on function public.get_my_wallet_summary() from public, anon;
revoke all on function public.upsert_payout_destination(uuid,text,text,text,text,boolean) from public, anon;
revoke all on function public.request_payout(uuid,numeric,text) from public, anon;
grant execute on function public.begin_gcash_payment(uuid,text) to authenticated;
grant execute on function public.get_booking_payment(uuid) to authenticated;
grant execute on function public.apply_paymongo_payment_event(text,text,boolean,text,text,text,bigint,text) to service_role;
grant execute on function public.get_my_wallet_summary() to authenticated;
grant execute on function public.upsert_payout_destination(uuid,text,text,text,text,boolean) to authenticated;
grant execute on function public.request_payout(uuid,numeric,text) to authenticated;
