-- refresh_live_dispatch relies on one offer per request/worker pair.
-- Reconcile hosted schemas where the original table exists without that key.

with ranked_dispatches as (
  select
    id,
    row_number() over (
      partition by service_request_id, worker_id
      order by
        case status
          when 'SELECTED' then 1
          when 'ACCEPTED' then 2
          when 'VIEWED' then 3
          when 'OFFERED' then 4
          when 'DECLINED' then 5
          else 6
        end,
        updated_at desc,
        offered_at desc,
        id
    ) as duplicate_rank
  from public.service_request_dispatches
)
delete from public.service_request_dispatches dispatch
using ranked_dispatches ranked
where dispatch.id = ranked.id
  and ranked.duplicate_rank > 1;

create unique index if not exists
  service_request_dispatches_request_worker_uidx
on public.service_request_dispatches(service_request_id, worker_id);

select pg_notify('pgrst','reload schema');
