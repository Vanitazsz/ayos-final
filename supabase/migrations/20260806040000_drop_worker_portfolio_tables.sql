-- The worker portfolio feature was removed; drop the dead tables and RPCs.
-- Drop functions first: they depend on the table row types.

drop function if exists public.save_worker_portfolio_item;
drop function if exists public.save_worker_portfolio_media;

drop table if exists public.worker_portfolio_media;
drop table if exists public.worker_portfolio_items;
