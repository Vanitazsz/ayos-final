begin;

create or replace function public.get_my_dispatch_offers()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'dispatchId', dispatch.id,
        'serviceRequestId', dispatch.service_request_id,
        'status', dispatch.status,
        'distanceMeters', dispatch.distance_meters,
        'expiresAt', dispatch.expires_at,
        'category', category.name,
        'description', request.description,
        'rateMinor', skill.rate_minor,
        'area', coalesce(address.city, address.barangay, 'Nearby customer')
      )
      order by dispatch.offered_at desc
    ),
    '[]'::jsonb
  )
  from public.service_request_dispatches dispatch
  join public.service_requests request
    on request.id = dispatch.service_request_id
  join public.addresses address
    on address.id = request.address_id
  join public.service_categories category
    on category.id = request.category_id
  join public.worker_skills skill
    on skill.worker_id = dispatch.worker_id
   and skill.category_id = request.category_id
  where dispatch.worker_id = auth.uid()
    and dispatch.expires_at > now()
    and dispatch.status in ('OFFERED', 'VIEWED', 'ACCEPTED')
$$;

revoke all on function public.get_my_dispatch_offers() from public, anon;
grant execute on function public.get_my_dispatch_offers() to authenticated;

notify pgrst, 'reload schema';

commit;
