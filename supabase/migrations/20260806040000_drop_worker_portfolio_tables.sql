-- The worker portfolio feature was removed; drop the dead tables and RPCs.
-- Drop in dependency order: policies -> functions -> tables.

-- 1. Policies referencing the portfolio tables.
drop policy if exists portfolio_storage_visible_read on storage.objects;
drop policy if exists portfolio_storage_owner_upload on storage.objects;
drop policy if exists portfolio_storage_owner_update on storage.objects;
drop policy if exists portfolio_storage_owner_delete on storage.objects;

-- 2. Functions depending on the worker_portfolio_media table row type.
drop function if exists public.attach_portfolio_media(uuid, text, text, integer);
drop function if exists public.upsert_portfolio_item(uuid, uuid, text, text, date, boolean);
drop function if exists public.save_worker_portfolio_item;
drop function if exists public.save_worker_portfolio_media;

-- 3. Tables.
drop table if exists public.worker_portfolio_media;
drop table if exists public.worker_portfolio_items;