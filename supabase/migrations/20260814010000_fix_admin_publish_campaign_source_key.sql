-- Fix admin_publish_campaign fan-out colliding on notifications.source_key.
-- The notifications.source_key column is globally unique, but the original
-- fan-out used one key ('campaign:<campaign_id>') for every recipient, so any
-- campaign targeting 2+ active accounts failed on the second insert with
-- "duplicate key value violates unique constraint notifications_source_key_key".
--
-- Fix: scope the key per recipient ('campaign:<campaign_id>:<recipient_id>'),
-- clear prior fan-out rows for the campaign first (idempotent re-publish, also
-- covers legacy single-key rows), and use ON CONFLICT DO NOTHING as a safety net.

-- create or replace cannot change a function's return type. A prior migration
-- (20260722000300) briefly redefined admin_publish_campaign to return
-- public.notifications; drop that variant first if present so the corrected
-- fan-out (returns notification_campaigns) can be installed cleanly.
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'admin_publish_campaign'
      and p.prorettype::regtype <> 'public.notification_campaigns'::regtype
  ) then
    drop function public.admin_publish_campaign(uuid);
  end if;
end
$$;

create or replace function public.admin_publish_campaign(p_campaign_id uuid)
returns public.notification_campaigns
language plpgsql security definer set search_path = '' as $$
declare
  campaign public.notification_campaigns;
  recipient record;
  notification_id uuid;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select * into campaign
  from public.notification_campaigns
  where id = p_campaign_id
    and status in ('DRAFT', 'SCHEDULED')
  for update;

  if campaign.id is null then
    raise exception using errcode = 'P0002', message = 'CAMPAIGN_NOT_PUBLISHABLE';
  end if;

  delete from public.notifications
  where source_key = 'campaign:' || campaign.id::text
     or source_key like 'campaign:' || campaign.id::text || ':%';

  for recipient in
    select a.id
    from public.accounts a
    where a.status = 'ACTIVE'
      and a.deleted_at is null
      and (
        campaign.audience = 'EVERYONE'
        or (campaign.audience = 'USERS' and a.role = 'USER')
        or (campaign.audience = 'WORKERS' and a.role = 'WORKER')
      )
  loop
    notification_id := null;
    insert into public.notifications(recipient_id, title, body, category, status, sent_at, source_key)
    values (
      recipient.id,
      campaign.title,
      campaign.body,
      'CAMPAIGN',
      'SENT',
      now(),
      'campaign:' || campaign.id::text || ':' || recipient.id
    )
    on conflict (source_key) do nothing
    returning id into notification_id;

    if notification_id is not null then
      insert into public.notification_deliveries(campaign_id, recipient_id, notification_id, status, delivered_at)
      values (campaign.id, recipient.id, notification_id, 'DELIVERED', now())
      on conflict do nothing;
    end if;
  end loop;

  update public.notification_campaigns
  set status = 'SENT', sent_at = now(), updated_at = now()
  where id = campaign.id
  returning * into campaign;

  return campaign;
end $$;
