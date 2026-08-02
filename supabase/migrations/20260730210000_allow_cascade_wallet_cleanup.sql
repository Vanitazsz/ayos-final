begin;

-- Wallet rows are owned by the account/booking lifecycle. The append-only
-- trigger otherwise blocks a confirmed account purge at the FK cascade stage.
drop trigger if exists wallet_transactions_append_only on public.wallet_transactions;

commit;
