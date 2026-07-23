-- Restore the public dispatch entry point and its PostgREST visibility.

create or replace function public.start_live_dispatch(
  p_service_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  if not exists(
    select 1
    from public.service_requests request
    where request.id=p_service_request_id
      and request.user_account_id=auth.uid()
      and request.status in ('OPEN','MATCHED')
  ) then
    raise exception using
      errcode='42501',
      message='SERVICE_REQUEST_UNAVAILABLE';
  end if;

  insert into public.live_dispatch_sessions(
    service_request_id,
    started_at,
    expires_at
  )
  values(
    p_service_request_id,
    now(),
    now()+interval '2 minutes'
  )
  on conflict(service_request_id) do update
  set started_at=case
        when public.live_dispatch_sessions.expires_at<=now()
        then excluded.started_at
        else public.live_dispatch_sessions.started_at
      end,
      expires_at=case
        when public.live_dispatch_sessions.expires_at<=now()
        then excluded.expires_at
        else public.live_dispatch_sessions.expires_at
      end;

  perform private.refresh_live_dispatch(p_service_request_id);
  return public.get_live_dispatch_snapshot(p_service_request_id);
end
$$;

revoke all on function public.start_live_dispatch(uuid) from public,anon;
grant execute on function public.start_live_dispatch(uuid) to authenticated;

select pg_notify('pgrst','reload schema');
