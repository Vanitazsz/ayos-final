-- Manual worker wallet top-ups. Provider integrations are retired.

create table public.wallet_topups (
  id uuid primary key default gen_random_uuid(),
  wallet_account_id uuid not null,
  status text not null default 'PENDING',
  amount_centavos bigint not null check (amount_centavos > 0),
  currency text not null default 'PHP' check (currency = 'PHP'),
  provider text not null default 'MANUAL' check (provider = 'MANUAL'),
  idempotency_key text not null unique,
  provider_intent_id text,
  provider_payment_method_id text,
  provider_payment_id text,
  redirect_url text,
  return_url text,
  failure_reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
