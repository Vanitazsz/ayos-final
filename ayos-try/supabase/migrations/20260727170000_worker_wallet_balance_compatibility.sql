-- Normalize worker wallet reads across the hosted legacy ledger and the
-- current wallet-account transaction ledger without rewriting financial data.

do $block$
begin
  if to_regclass('public.wallets') is null then
    execute $view$
      create view public.wallets
      with (security_invoker = true)
      as
      select
        wallet.account_id,
        coalesce(
          round(
            sum(transaction.amount) filter (
              where transaction.status in ('AVAILABLE', 'COMPLETED')
            ) * 100
          ),
          0
        )::bigint as available_minor
      from public.wallet_accounts wallet
      left join public.wallet_transactions transaction
        on transaction.wallet_account_id = wallet.id
      group by wallet.account_id
    $view$;
    execute 'revoke all on public.wallets from public, anon, authenticated';
  end if;
end
$block$;

create or replace function public.get_worker_wallet_balances(p_worker_ids uuid[])
returns table (
  worker_id uuid,
  available_amount numeric
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not public.is_admin(false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  return query
  select wallet.account_id, wallet.available_minor::numeric / 100
  from public.wallets wallet
  where wallet.account_id = any (p_worker_ids);
end
$function$;

revoke all on function public.get_worker_wallet_balances(uuid[]) from public, anon;
grant execute on function public.get_worker_wallet_balances(uuid[]) to authenticated;

notify pgrst, 'reload schema';
