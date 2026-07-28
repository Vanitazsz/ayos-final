begin;

-- Matching-only product: remove the obsolete bid/quote contract while keeping
-- service requests, dispatches, and direct bookings intact.
drop function if exists public.submit_request_bid(uuid, bigint, text, integer);
drop function if exists public.submit_service_offer(uuid, numeric, text, integer);
drop function if exists public.withdraw_service_offer(uuid);
drop function if exists public.select_worker_for_quote(uuid, uuid);
drop function if exists public.submit_selected_worker_quote(uuid, bigint, text, integer);
drop function if exists public.accept_service_offer(uuid);

alter table public.bookings drop column if exists accepted_offer_id;
drop table if exists public.service_request_offers cascade;

notify pgrst, 'reload schema';
commit;
