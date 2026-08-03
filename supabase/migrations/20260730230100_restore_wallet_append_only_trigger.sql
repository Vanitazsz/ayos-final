begin;
drop trigger if exists wallet_transactions_append_only on public.wallet_transactions;
create trigger wallet_transactions_append_only
before delete or update on public.wallet_transactions
for each row execute function prevent_wallet_transaction_mutation();
commit;
