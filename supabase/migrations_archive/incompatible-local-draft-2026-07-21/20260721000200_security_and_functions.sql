create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','addresses','worker_profiles','service_categories','services','service_requests',
    'job_bids','bookings','conversations','payments','wallets','reviews','notification_campaigns',
    'support_tickets','platform_settings'
  ] loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = '' as $$
declare customer_role_id uuid;
begin
  insert into public.profiles (id, email, phone, first_name, middle_name, last_name)
  values (
    new.id,
    coalesce(new.email, ''),
    new.phone,
    coalesce(new.raw_user_meta_data ->> 'first_name', split_part(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ' ', 1)),
    new.raw_user_meta_data ->> 'middle_name',
    coalesce(new.raw_user_meta_data ->> 'last_name', regexp_replace(coalesce(new.raw_user_meta_data ->> 'full_name', ''), '^\S+\s*', ''))
  );
  select id into customer_role_id from public.roles where code = 'customer';
  if customer_role_id is not null then
    insert into public.user_roles (user_id, role_id) values (new.id, customer_role_id) on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.has_role(required_role text, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = target_user and r.code = required_role
  );
$$;

create or replace function public.has_permission(required_permission text)
returns boolean
language sql
stable
security definer set search_path = '' as $$
  select public.has_role('super_admin') or exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid() and p.code = required_permission
  );
$$;

create or replace function public.is_conversation_participant(target_conversation uuid)
returns boolean
language sql
stable
security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = target_conversation and user_id = auth.uid()
  );
$$;

create or replace function public.nearby_workers(
  latitude double precision,
  longitude double precision,
  radius_m integer default 10000,
  result_limit integer default 20
)
returns table (
  provider_id uuid,
  worker_profile_id uuid,
  first_name text,
  last_name text,
  avatar_path text,
  industry_name text,
  rating_average numeric,
  rating_count integer,
  completed_jobs integer,
  hourly_rate integer,
  currency char(3),
  availability public.availability_status,
  distance_m double precision
)
language sql
stable
security definer set search_path = '' as $$
  select
    wp.user_id,
    wp.id,
    p.first_name,
    p.last_name,
    p.avatar_path,
    i.name,
    wp.rating_average,
    wp.rating_count,
    wp.completed_jobs,
    wp.hourly_rate,
    wp.currency,
    wp.availability_status,
    extensions.st_distance(
      wp.base_location,
      extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
    )
  from public.worker_profiles wp
  join public.profiles p on p.id = wp.user_id and p.deleted_at is null
  join public.industries i on i.id = wp.industry_id
  where wp.deleted_at is null
    and wp.verification_status = 'approved'
    and wp.base_location is not null
    and extensions.st_dwithin(
      wp.base_location,
      extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography,
      least(greatest(radius_m, 1000), 100000)
    )
  order by wp.base_location operator(extensions.<->)
    extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography,
    wp.rating_average desc
  limit least(greatest(result_limit, 1), 100);
$$;

create or replace function public.transition_booking(
  target_booking uuid,
  action text,
  expected_version integer default null
)
returns public.bookings
language plpgsql
security definer set search_path = '' as $$
declare
  current_booking public.bookings;
  next_status public.booking_status;
  previous_status public.booking_status;
  actor_kind text;
begin
  select * into current_booking from public.bookings where id = target_booking and deleted_at is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'booking_not_found'; end if;
  if auth.uid() not in (current_booking.customer_id, current_booking.worker_id)
     and not public.has_permission('bookings:manage') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if expected_version is not null and current_booking.version <> expected_version then
    raise exception using errcode = '40001', message = 'version_conflict';
  end if;
  previous_status := current_booking.status;

  case action
    when 'accept' then next_status := 'accepted'; actor_kind := 'worker';
    when 'confirm_details' then next_status := 'accepted'; actor_kind := 'customer';
    when 'en_route' then next_status := 'en_route'; actor_kind := 'worker';
    when 'arrive' then next_status := 'arrived'; actor_kind := 'worker';
    when 'start' then next_status := 'in_progress'; actor_kind := 'worker';
    when 'complete' then next_status := 'pending_confirmation'; actor_kind := 'worker';
    when 'confirm_completion' then next_status := 'completed'; actor_kind := 'customer';
    else raise exception using errcode = '22023', message = 'unsupported_action';
  end case;

  if actor_kind = 'worker' and auth.uid() <> current_booking.worker_id and not public.has_permission('bookings:manage') then
    raise exception using errcode = '42501', message = 'worker_action_required';
  end if;
  if actor_kind = 'customer' and auth.uid() <> current_booking.customer_id and not public.has_permission('bookings:manage') then
    raise exception using errcode = '42501', message = 'customer_action_required';
  end if;
  if not (
    (current_booking.status = 'hired' and next_status = 'accepted') or
    (current_booking.status = 'accepted' and next_status = 'en_route') or
    (current_booking.status = 'en_route' and next_status = 'arrived') or
    (current_booking.status = 'arrived' and next_status = 'in_progress') or
    (current_booking.status = 'in_progress' and next_status = 'pending_confirmation') or
    (current_booking.status = 'pending_confirmation' and next_status = 'completed')
  ) then
    raise exception using errcode = '22023', message = 'invalid_transition';
  end if;

  update public.bookings set
    status = next_status,
    version = version + 1,
    accepted_at = case when next_status = 'accepted' then now() else accepted_at end,
    en_route_at = case when next_status = 'en_route' then now() else en_route_at end,
    arrived_at = case when next_status = 'arrived' then now() else arrived_at end,
    started_at = case when next_status = 'in_progress' then now() else started_at end,
    worker_completed_at = case when next_status = 'pending_confirmation' then now() else worker_completed_at end,
    completed_at = case when next_status = 'completed' then now() else completed_at end
  where id = target_booking returning * into current_booking;

  insert into public.booking_status_history (booking_id, actor_id, from_status, to_status)
  values (target_booking, auth.uid(), previous_status, next_status);
  return current_booking;
end;
$$;

create or replace function public.set_location(longitude double precision, latitude double precision)
returns extensions.geography
language sql immutable strict set search_path = '' as $$
  select extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography;
$$;

revoke all on function public.has_role(text, uuid) from public;
revoke all on function public.has_permission(text) from public;
grant execute on function public.has_role(text, uuid) to authenticated, service_role;
grant execute on function public.has_permission(text) to authenticated, service_role;
grant execute on function public.nearby_workers(double precision, double precision, integer, integer) to anon, authenticated;
grant execute on function public.transition_booking(uuid, text, integer) to authenticated;
grant execute on function public.set_location(double precision, double precision) to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'roles','permissions','role_permissions','profiles','user_roles','consents','user_settings','addresses','worker_profiles','worker_skills',
    'worker_services','uploads','verification_documents','favorites','service_requests','request_attachments',
    'request_matches','job_bids','bookings','booking_status_history','booking_cancellations',
    'conversations','conversation_participants','messages','payments','refunds','wallets',
    'wallet_transactions','payout_methods','payouts','reviews','review_votes','review_reports',
    'review_replies','notifications','notification_campaigns','support_tickets','support_messages',
    'platform_settings','reports','audit_logs','deletion_records'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create policy profiles_self_select on public.profiles for select to authenticated using (id = auth.uid() or public.has_permission('users:view'));
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid() or public.has_permission('users:manage')) with check (id = auth.uid() or public.has_permission('users:manage'));
create policy roles_authenticated_read on public.roles for select to authenticated using (true);
create policy permissions_authenticated_read on public.permissions for select to authenticated using (true);
create policy role_permissions_authenticated_read on public.role_permissions for select to authenticated using (true);
create policy roles_admin_write on public.roles for all to authenticated using (public.has_role('super_admin')) with check (public.has_role('super_admin'));
create policy permissions_admin_write on public.permissions for all to authenticated using (public.has_role('super_admin')) with check (public.has_role('super_admin'));
create policy role_permissions_admin_write on public.role_permissions for all to authenticated using (public.has_role('super_admin')) with check (public.has_role('super_admin'));
create policy user_roles_self_read on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_permission('users:view'));

create policy consents_owner_all on public.consents for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_settings_owner_all on public.user_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy addresses_owner_all on public.addresses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy favorites_owner_all on public.favorites for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy industries_public_read on public.industries for select to anon, authenticated using (is_active);
create policy skills_public_read on public.skills for select to anon, authenticated using (is_active);
create policy categories_public_read on public.service_categories for select to anon, authenticated using (is_active and deleted_at is null);
create policy services_public_read on public.services for select to anon, authenticated using (is_active and deleted_at is null);
create policy catalog_admin_categories on public.service_categories for all to authenticated using (public.has_permission('catalog:manage')) with check (public.has_permission('catalog:manage'));
create policy catalog_admin_services on public.services for all to authenticated using (public.has_permission('catalog:manage')) with check (public.has_permission('catalog:manage'));

create policy worker_public_read on public.worker_profiles for select to anon, authenticated using (verification_status = 'approved' and deleted_at is null);
create policy worker_self_read on public.worker_profiles for select to authenticated using (user_id = auth.uid() or public.has_permission('workers:view'));
create policy worker_self_update on public.worker_profiles for update to authenticated using (user_id = auth.uid() or public.has_permission('workers:manage')) with check (user_id = auth.uid() or public.has_permission('workers:manage'));
create policy worker_self_insert on public.worker_profiles for insert to authenticated with check (user_id = auth.uid());
create policy worker_skills_read on public.worker_skills for select to anon, authenticated using (true);
create policy worker_skills_owner_write on public.worker_skills for all to authenticated using (exists(select 1 from public.worker_profiles wp where wp.id = worker_id and wp.user_id = auth.uid())) with check (exists(select 1 from public.worker_profiles wp where wp.id = worker_id and wp.user_id = auth.uid()));
create policy worker_services_read on public.worker_services for select to anon, authenticated using (true);
create policy worker_services_owner_write on public.worker_services for all to authenticated using (exists(select 1 from public.worker_profiles wp where wp.id = worker_id and wp.user_id = auth.uid())) with check (exists(select 1 from public.worker_profiles wp where wp.id = worker_id and wp.user_id = auth.uid()));

create policy uploads_owner_all on public.uploads for all to authenticated using (owner_id = auth.uid() or public.has_permission('workers:verify')) with check (owner_id = auth.uid() or public.has_permission('workers:verify'));
create policy verification_owner_read on public.verification_documents for select to authenticated using (user_id = auth.uid() or exists(select 1 from public.worker_profiles wp where wp.id = worker_id and wp.user_id = auth.uid()) or public.has_permission('workers:verify'));
create policy verification_owner_insert on public.verification_documents for insert to authenticated with check (user_id = auth.uid() or exists(select 1 from public.worker_profiles wp where wp.id = worker_id and wp.user_id = auth.uid()));
create policy verification_admin_update on public.verification_documents for update to authenticated using (public.has_permission('workers:verify')) with check (public.has_permission('workers:verify'));

create policy requests_participant_read on public.service_requests for select to authenticated using (customer_id = auth.uid() or selected_worker_id = auth.uid() or (status in ('posted','searching') and public.has_role('worker')) or public.has_permission('bookings:view'));
create policy requests_customer_insert on public.service_requests for insert to authenticated with check (customer_id = auth.uid() and public.has_role('customer'));
create policy requests_customer_update on public.service_requests for update to authenticated using (customer_id = auth.uid() or public.has_permission('bookings:manage')) with check (customer_id = auth.uid() or public.has_permission('bookings:manage'));
create policy request_attachments_participant on public.request_attachments for select to authenticated using (exists(select 1 from public.service_requests r where r.id = request_id and (r.customer_id = auth.uid() or r.selected_worker_id = auth.uid())));
create policy request_matches_customer on public.request_matches for select to authenticated using (exists(select 1 from public.service_requests r where r.id = request_id and (r.customer_id = auth.uid() or public.has_permission('bookings:view'))));
create policy bids_market_read on public.job_bids for select to authenticated using (worker_id = auth.uid() or exists(select 1 from public.service_requests r where r.id = request_id and r.customer_id = auth.uid()) or public.has_permission('bookings:view'));
create policy bids_worker_insert on public.job_bids for insert to authenticated with check (worker_id = auth.uid() and public.has_role('worker'));
create policy bids_worker_update on public.job_bids for update to authenticated using (worker_id = auth.uid()) with check (worker_id = auth.uid());

create policy bookings_participant_read on public.bookings for select to authenticated using (customer_id = auth.uid() or worker_id = auth.uid() or public.has_permission('bookings:view'));
create policy bookings_customer_insert on public.bookings for insert to authenticated with check (customer_id = auth.uid() or public.has_permission('bookings:manage'));
create policy booking_history_participant_read on public.booking_status_history for select to authenticated using (exists(select 1 from public.bookings b where b.id = booking_id and (b.customer_id = auth.uid() or b.worker_id = auth.uid() or public.has_permission('bookings:view'))));
create policy cancellation_participant_read on public.booking_cancellations for select to authenticated using (exists(select 1 from public.bookings b where b.id = booking_id and (b.customer_id = auth.uid() or b.worker_id = auth.uid() or public.has_permission('bookings:view'))));

create policy conversations_participant_read on public.conversations for select to authenticated using (public.is_conversation_participant(id));
create policy conversation_participants_member_read on public.conversation_participants for select to authenticated using (public.is_conversation_participant(conversation_id));
create policy messages_participant_read on public.messages for select to authenticated using (public.is_conversation_participant(conversation_id));
create policy messages_participant_insert on public.messages for insert to authenticated with check (sender_id = auth.uid() and public.is_conversation_participant(conversation_id));
create policy messages_sender_update on public.messages for update to authenticated using (sender_id = auth.uid()) with check (sender_id = auth.uid());

create policy payments_participant_read on public.payments for select to authenticated using (customer_id = auth.uid() or exists(select 1 from public.bookings b where b.id = booking_id and b.worker_id = auth.uid()) or public.has_permission('payments:view'));
create policy refunds_participant_read on public.refunds for select to authenticated using (requested_by = auth.uid() or public.has_permission('payments:view'));
create policy wallets_owner_read on public.wallets for select to authenticated using (exists(select 1 from public.worker_profiles wp where wp.id = worker_id and wp.user_id = auth.uid()) or public.has_permission('payments:view'));
create policy wallet_transactions_owner_read on public.wallet_transactions for select to authenticated using (exists(select 1 from public.wallets w join public.worker_profiles wp on wp.id = w.worker_id where w.id = wallet_id and wp.user_id = auth.uid()) or public.has_permission('payments:view'));
create policy payout_methods_owner_all on public.payout_methods for all to authenticated using (exists(select 1 from public.worker_profiles wp where wp.id = worker_id and wp.user_id = auth.uid())) with check (exists(select 1 from public.worker_profiles wp where wp.id = worker_id and wp.user_id = auth.uid()));
create policy payouts_owner_read on public.payouts for select to authenticated using (exists(select 1 from public.worker_profiles wp where wp.id = worker_id and wp.user_id = auth.uid()) or public.has_permission('payments:view'));

create policy reviews_public_read on public.reviews for select to anon, authenticated using (status = 'published' and deleted_at is null);
create policy reviews_participant_insert on public.reviews for insert to authenticated with check (author_id = auth.uid() and exists(select 1 from public.bookings b where b.id = booking_id and b.status = 'completed' and auth.uid() in (b.customer_id,b.worker_id)));
create policy reviews_author_update on public.reviews for update to authenticated using (author_id = auth.uid() or public.has_permission('reviews:moderate')) with check (author_id = auth.uid() or public.has_permission('reviews:moderate'));
create policy review_votes_owner_all on public.review_votes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy review_reports_owner_insert on public.review_reports for insert to authenticated with check (user_id = auth.uid());
create policy review_replies_public_read on public.review_replies for select to anon, authenticated using (true);
create policy review_replies_admin_write on public.review_replies for insert to authenticated with check (author_id = auth.uid() and public.has_permission('reviews:moderate'));

create policy notifications_owner_all on public.notifications for all to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy campaigns_admin_all on public.notification_campaigns for all to authenticated using (public.has_permission('campaigns:view')) with check (public.has_permission('campaigns:manage'));
create policy tickets_access_read on public.support_tickets for select to authenticated using (reporter_id = auth.uid() or assignee_id = auth.uid() or public.has_permission('support:view'));
create policy tickets_reporter_insert on public.support_tickets for insert to authenticated with check (reporter_id = auth.uid());
create policy tickets_support_update on public.support_tickets for update to authenticated using (public.has_permission('support:manage')) with check (public.has_permission('support:manage'));
create policy support_messages_access_read on public.support_messages for select to authenticated using (exists(select 1 from public.support_tickets t where t.id = ticket_id and (t.reporter_id = auth.uid() or t.assignee_id = auth.uid() or public.has_permission('support:view'))) and (not internal or public.has_permission('support:view')));
create policy support_messages_access_insert on public.support_messages for insert to authenticated with check (author_id = auth.uid() and exists(select 1 from public.support_tickets t where t.id = ticket_id and (t.reporter_id = auth.uid() or t.assignee_id = auth.uid() or public.has_permission('support:manage'))));

create policy platform_settings_admin_read on public.platform_settings for select to authenticated using (public.has_permission('settings:view'));
create policy platform_settings_admin_write on public.platform_settings for all to authenticated using (public.has_permission('settings:manage')) with check (public.has_permission('settings:manage'));
create policy reports_admin_all on public.reports for all to authenticated using (requested_by = auth.uid() and public.has_permission('reports:view')) with check (requested_by = auth.uid() and public.has_permission('reports:manage'));
create policy audit_admin_read on public.audit_logs for select to authenticated using (public.has_permission('audit:view'));
create policy trash_admin_read on public.deletion_records for select to authenticated using (public.has_permission('recovery:view'));
create policy trash_admin_write on public.deletion_records for all to authenticated using (public.has_permission('recovery:manage')) with check (public.has_permission('recovery:manage'));

grant usage on schema public to anon, authenticated, service_role;
grant select on public.industries, public.skills, public.service_categories, public.services, public.worker_profiles, public.worker_skills, public.worker_services, public.reviews, public.review_replies to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('request-media', 'request-media', false, 10485760, array['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4']),
  ('verification', 'verification', false, 10485760, array['image/jpeg','image/png','application/pdf']),
  ('messages', 'messages', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('reviews', 'reviews', false, 5242880, array['image/jpeg','image/png','image/webp']),
  ('support', 'support', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('reports', 'reports', false, 10485760, array['application/json','text/csv'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy storage_owner_insert on storage.objects for insert to authenticated with check ((storage.foldername(name))[1] = auth.uid()::text);
create policy storage_owner_select on storage.objects for select to authenticated using (owner_id = auth.uid()::text or public.has_permission('workers:verify') or public.has_permission('reports:view'));
create policy storage_owner_update on storage.objects for update to authenticated using (owner_id = auth.uid()::text) with check (owner_id = auth.uid()::text);
create policy storage_owner_delete on storage.objects for delete to authenticated using (owner_id = auth.uid()::text);

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.service_requests;
