-- Repair the hosted schema dependencies used by the worker profile and wallet.

create table if not exists public.service_templates (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 160),
  description text check (description is null or length(description) <= 2000),
  base_price numeric(12,2) not null check (base_price >= 0),
  estimated_duration_minutes integer not null check (estimated_duration_minutes between 15 and 10080),
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(category_id, name)
);
create index if not exists service_templates_catalog_idx
  on public.service_templates(category_id, is_active, name)
  where archived_at is null;
alter table public.service_templates enable row level security;
grant select on public.service_templates to anon, authenticated;
drop policy if exists service_templates_public_read on public.service_templates;
create policy service_templates_public_read on public.service_templates
for select to anon, authenticated
using (
  archived_at is null
  and (is_active or (select auth.uid()) is not null and public.is_admin(false))
);
create table if not exists public.worker_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(account_id) on delete cascade,
  category_id uuid references public.service_categories(id) on delete set null,
  title text not null check (length(title) between 2 and 120),
  description text not null check (length(description) between 3 and 2000),
  completed_on date,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists worker_portfolio_items_worker_order_idx
  on public.worker_portfolio_items(worker_id, is_published, sort_order);
create table if not exists public.worker_portfolio_media (
  id uuid primary key default gen_random_uuid(),
  portfolio_item_id uuid not null references public.worker_portfolio_items(id) on delete cascade,
  storage_path text not null unique,
  content_type text not null,
  byte_size integer not null check (byte_size between 1 and 15728640),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.worker_portfolio_items enable row level security;
alter table public.worker_portfolio_media enable row level security;
revoke all on public.worker_portfolio_items, public.worker_portfolio_media from anon, authenticated;
grant select on public.worker_portfolio_items, public.worker_portfolio_media to authenticated;
drop policy if exists portfolio_items_visible_read on public.worker_portfolio_items;
create policy portfolio_items_visible_read on public.worker_portfolio_items
for select to authenticated
using (
  worker_id = auth.uid()
  or public.is_admin(false)
  or (is_published and exists (
    select 1 from public.worker_profiles w
    where w.account_id = worker_id and w.approval_status = 'APPROVED'
  ))
);
drop policy if exists portfolio_media_visible_read on public.worker_portfolio_media;
create policy portfolio_media_visible_read on public.worker_portfolio_media
for select to authenticated
using (exists (
  select 1 from public.worker_portfolio_items i
  where i.id = portfolio_item_id
    and (
      i.worker_id = auth.uid()
      or public.is_admin(false)
      or (i.is_published and exists (
        select 1 from public.worker_profiles w
        where w.account_id = i.worker_id and w.approval_status = 'APPROVED'
      ))
    )
));
create table if not exists public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references public.worker_profiles(account_id) on delete restrict,
  currency text not null default 'PHP' check (currency = 'PHP'),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','FROZEN','CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.wallet_accounts enable row level security;
revoke all on public.wallet_accounts from anon, authenticated;
grant select on public.wallet_accounts to authenticated;
drop policy if exists wallet_accounts_owner_or_admin_read on public.wallet_accounts;
create policy wallet_accounts_owner_or_admin_read on public.wallet_accounts
for select to authenticated using (account_id = auth.uid() or public.is_admin(false));
create table if not exists public.payout_destinations (
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
create unique index if not exists one_default_payout_destination
  on public.payout_destinations(worker_id)
  where is_default and status = 'ACTIVE';
alter table public.payout_destinations enable row level security;
revoke all on public.payout_destinations from anon, authenticated;
grant select on public.payout_destinations to authenticated;
drop policy if exists payout_destinations_owner_read on public.payout_destinations;
create policy payout_destinations_owner_read on public.payout_destinations
for select to authenticated using (worker_id = auth.uid() or public.is_admin(false));
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_service_templates_updated_at' and tgrelid = 'public.service_templates'::regclass) then
    create trigger set_service_templates_updated_at before update on public.service_templates
    for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_worker_portfolio_items_updated_at' and tgrelid = 'public.worker_portfolio_items'::regclass) then
    create trigger set_worker_portfolio_items_updated_at before update on public.worker_portfolio_items
    for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_wallet_accounts_updated_at' and tgrelid = 'public.wallet_accounts'::regclass) then
    create trigger set_wallet_accounts_updated_at before update on public.wallet_accounts
    for each row execute function public.set_updated_at();
  end if;
end $$;
