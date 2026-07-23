begin;
create or replace function public.admin_create_notification_draft(
  p_audience public.notification_audience,
  p_title text,
  p_body text,
  p_category text default 'GENERAL'
) returns public.notifications
language plpgsql security definer set search_path = '' as $$
declare result public.notifications;
begin
  if not public.is_admin(true) then raise exception using errcode='42501', message='AAL2_ADMIN_REQUIRED'; end if;
  if length(trim(p_title)) not between 1 and 160 or length(trim(p_body)) not between 1 and 4000
    or length(trim(p_category)) not between 1 and 80 then
    raise exception using errcode='22023', message='INVALID_NOTIFICATION';
  end if;
  insert into public.notifications(audience, title, body, category, status)
  values(p_audience, trim(p_title), trim(p_body), upper(trim(p_category)), 'DRAFT')
  returning * into result;
  return result;
end $$;
create or replace function public.admin_publish_campaign(p_campaign_id uuid)
returns public.notifications language sql security definer set search_path = '' as $$
  select public.admin_send_notification_now(p_campaign_id)
$$;
revoke all on function public.admin_create_notification_draft(public.notification_audience,text,text,text) from public, anon;
revoke all on function public.admin_publish_campaign(uuid) from public, anon;
grant execute on function public.admin_create_notification_draft(public.notification_audience,text,text,text) to authenticated;
grant execute on function public.admin_publish_campaign(uuid) to authenticated;
commit;
