-- PayMongo GCash top-ups for Worker wallets.

create table public.wallet_topups (
  id uuid primary key default gen_random_uuid(),
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete restrict,
  status text not null default 'PENDING' check (status in ('PENDING','REQUIRES_ACTION','PROCESSING','SUCCESSFUL','FAILED','EXPIRED','CANCELLED')),
  amount_centavos bigint not null check (amount_centavos between 10000 and 10000000),
  currency text not null default 'PHP' check (currency = 'PHP'),
  provider text not null default 'PAYMONGO' check (provider = 'PAYMONGO'),
  idempotency_key text not null unique check (length(idempotency_key) between 16 and 128),
  provider_intent_id text unique,
  provider_payment_method_id text,
  provider_payment_id text unique,
  redirect_url text,
  return_url text,
  failure_reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index wallet_topups_wallet_time_idx
  on public.wallet_topups(wallet_account_id, created_at desc);

alter table public.wallet_topups enable row level security;
revoke all on public.wallet_topups from anon, authenticated;
grant select on public.wallet_topups to authenticated;

create policy wallet_topups_owner_or_admin_read on public.wallet_topups
for select to authenticated
using (exists (
  select 1 from public.wallet_accounts w
  where w.id = wallet_account_id
    and (w.account_id = auth.uid() or public.is_admin(true))
));

create trigger set_wallet_topups_updated_at before update on public.wallet_topups
for each row execute function public.set_updated_at();

create or replace function public.protect_successful_wallet_topup()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'SUCCESSFUL' and new is distinct from old then
    raise exception using errcode = '55000', message = 'Successful wallet top-up is immutable';
  end if;
  return new;
end $$;

create trigger protect_successful_wallet_topup before update or delete on public.wallet_topups
for each row execute function public.protect_successful_wallet_topup();

create or replace function public.begin_wallet_topup(
  p_amount_centavos bigint,
  p_idempotency_key text
)
returns public.wallet_topups
language plpgsql security definer set search_path = '' as $$
declare
  wallet public.wallet_accounts;
  topup public.wallet_topups;
begin
  if public.current_role() <> 'WORKER'
    or p_amount_centavos not between 10000 and 10000000
    or length(p_idempotency_key) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'Invalid wallet top-up request';
  end if;

  select * into topup from public.wallet_topups
  where idempotency_key = p_idempotency_key;
  if topup.id is not null then
    if topup.amount_centavos <> p_amount_centavos then
      raise exception using errcode = '23505', message = 'Idempotency key is already used';
    end if;
    return topup;
  end if;

  insert into public.wallet_accounts(account_id) values (auth.uid())
  on conflict(account_id) do update set updated_at = now()
  returning * into wallet;

  if wallet.status <> 'ACTIVE' then
    raise exception using errcode = '42501', message = 'Active wallet required';
  end if;

  insert into public.wallet_topups(wallet_account_id, amount_centavos, idempotency_key)
  values (wallet.id, p_amount_centavos, p_idempotency_key)
  returning * into topup;
  return topup;
end $$;

create or replace function public.apply_paymongo_wallet_topup_event(
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
  topup public.wallet_topups;
  event_id uuid;
begin
  insert into public.payment_provider_events(provider, provider_event_id, event_type, livemode, payload_hash)
  values ('PAYMONGO', p_provider_event_id, p_event_type, p_livemode, p_payload_hash)
  on conflict(provider, provider_event_id) do nothing
  returning id into event_id;
  if event_id is null then return 'DUPLICATE'; end if;

  select * into topup from public.wallet_topups
  where provider_intent_id = p_provider_intent_id for update;
  if topup.id is null then
    update public.payment_provider_events
    set status = 'IGNORED', processed_at = now(), failure_reason = 'Unknown wallet top-up intent'
    where id = event_id;
    return 'IGNORED';
  end if;
  if p_amount_centavos <> topup.amount_centavos then
    update public.payment_provider_events
    set status = 'FAILED', processed_at = now(), failure_reason = 'Amount mismatch'
    where id = event_id;
    return 'AMOUNT_MISMATCH';
  end if;
  if topup.status = 'SUCCESSFUL' then
    update public.payment_provider_events set status = 'PROCESSED', processed_at = now()
    where id = event_id;
    return 'ALREADY_SUCCESSFUL';
  end if;

  if p_event_type in ('payment.paid','payment_intent.succeeded') then
    update public.wallet_topups
    set status = 'SUCCESSFUL',
      provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      completed_at = coalesce(completed_at, now()), failure_reason = null
    where id = topup.id
    returning * into topup;

    insert into public.wallet_transactions(
      wallet_account_id, kind, status, amount, source_type, source_id, description, available_at
    ) values (
      topup.wallet_account_id, 'TOP_UP', 'AVAILABLE', topup.amount_centavos::numeric / 100,
      'WALLET_TOPUP', topup.id, 'GCash wallet top-up', now()
    ) on conflict(wallet_account_id, source_type, source_id, kind) do nothing;
  elsif p_event_type in ('payment.failed','payment_intent.awaiting_payment_method') then
    update public.wallet_topups
    set status = 'FAILED',
      provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      failure_reason = coalesce(nullif(p_failure_reason, ''), 'GCash wallet top-up failed'),
      completed_at = now()
    where id = topup.id;
  else
    update public.payment_provider_events set status = 'IGNORED', processed_at = now()
    where id = event_id;
    return 'IGNORED';
  end if;

  update public.payment_provider_events set status = 'PROCESSED', processed_at = now()
  where id = event_id;
  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values ('PAYMONGO_WALLET_TOPUP_EVENT_PROCESSED', 'wallet_topup', topup.id::text,
    jsonb_build_object('event_type', p_event_type, 'provider_event_id', p_provider_event_id));
  return 'PROCESSED';
end $$;

revoke all on function public.begin_wallet_topup(bigint, text) from public;
grant execute on function public.begin_wallet_topup(bigint, text) to authenticated;
revoke all on function public.apply_paymongo_wallet_topup_event(text, text, boolean, text, text, text, bigint, text) from public;
grant execute on function public.apply_paymongo_wallet_topup_event(text, text, boolean, text, text, text, bigint, text) to service_role;
