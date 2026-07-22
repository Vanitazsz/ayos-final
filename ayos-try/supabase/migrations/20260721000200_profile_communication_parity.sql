-- Profile, communication, verification, and portfolio capabilities required by the source interfaces.

alter table public.addresses
  add column recipient_name text check (recipient_name is null or length(recipient_name) between 2 and 120),
  add column contact_mobile text check (contact_mobile is null or contact_mobile ~ '^\+[1-9][0-9]{7,14}$'),
  add column instructions text check (instructions is null or length(instructions) <= 1000),
  add column archived_at timestamptz;

alter table public.service_requests add column address_snapshot jsonb;
update public.service_requests r set address_snapshot = jsonb_build_object(
  'label', a.label,
  'line1', a.line1,
  'line2', a.line2,
  'barangay', a.barangay,
  'city', a.city,
  'province', a.province,
  'postal_code', a.postal_code
)
from public.addresses a where a.id = r.address_id and r.address_snapshot is null;

create table public.account_preferences (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  locale text not null default 'en-PH',
  timezone text not null default 'Asia/Manila',
  appearance text not null default 'SYSTEM' check (appearance in ('SYSTEM','LIGHT','DARK')),
  notifications jsonb not null default '{"booking":true,"messages":true,"payments":true,"promotions":true,"system":true}',
  privacy jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.account_preferences(account_id, notifications)
select a.id, coalesce(u.notification_preferences, '{}'::jsonb)
from public.accounts a left join public.user_profiles u on u.account_id = a.id
on conflict(account_id) do nothing;

alter table public.conversation_participants add column last_read_at timestamptz;

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  recipient_id uuid not null references public.accounts(id) on delete cascade,
  status text not null default 'DELIVERED' check (status in ('PENDING','DELIVERED','FAILED')),
  delivered_at timestamptz,
  read_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(notification_id, recipient_id)
);
create index notification_deliveries_recipient_time_idx on public.notification_deliveries(recipient_id, read_at, created_at desc);

alter table public.support_tickets
  add column assigned_admin_id uuid references public.admin_profiles(account_id) on delete set null,
  add column priority text not null default 'NORMAL' check (priority in ('LOW','NORMAL','HIGH','URGENT')),
  add column category text not null default 'GENERAL',
  add column last_message_at timestamptz;

create table public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references public.accounts(id) on delete restrict,
  body text not null check (length(trim(body)) between 1 and 4000),
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index support_ticket_messages_ticket_time_idx on public.support_ticket_messages(ticket_id, created_at);

create table public.worker_verification_documents (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.worker_verifications(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(account_id) on delete cascade,
  document_type text not null check (length(document_type) between 2 and 80),
  storage_path text not null,
  content_type text not null,
  byte_size integer not null check (byte_size between 1 and 15728640),
  revision integer not null default 1 check (revision > 0),
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED','NEEDS_REPLACEMENT','EXPIRED')),
  reviewer_id uuid references public.admin_profiles(account_id) on delete set null,
  review_notes text check (review_notes is null or length(review_notes) <= 2000),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(verification_id, document_type, revision)
);
create index verification_documents_queue_idx on public.worker_verification_documents(status, submitted_at);

create table public.worker_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(account_id) on delete cascade,
  category_id uuid references public.service_categories(id) on delete set null,
  title text not null check (length(title) between 2 and 120),
  description text not null check (length(description) between 3 and 2000),
  completed_on date,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index worker_portfolio_items_worker_order_idx on public.worker_portfolio_items(worker_id, is_published, sort_order);

create table public.worker_portfolio_media (
  id uuid primary key default gen_random_uuid(),
  portfolio_item_id uuid not null references public.worker_portfolio_items(id) on delete cascade,
  storage_path text not null unique,
  content_type text not null,
  byte_size integer not null check (byte_size between 1 and 15728640),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'account_preferences','notification_deliveries','support_ticket_messages',
    'worker_verification_documents','worker_portfolio_items','worker_portfolio_media'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
  end loop;
end $$;

grant select on public.account_preferences, public.notification_deliveries,
  public.support_ticket_messages, public.worker_verification_documents,
  public.worker_portfolio_items, public.worker_portfolio_media to authenticated;

create policy preferences_owner_or_admin_read on public.account_preferences for select to authenticated
using (account_id = auth.uid() or public.is_admin(true));
create policy notification_deliveries_owner_or_admin_read on public.notification_deliveries for select to authenticated
using (recipient_id = auth.uid() or public.is_admin(false));
create policy support_messages_participant_read on public.support_ticket_messages for select to authenticated
using (exists (
  select 1 from public.support_tickets t where t.id = ticket_id and (t.owner_id = auth.uid() or public.is_admin(false))
) and (not is_internal or public.is_admin(false)));
create policy verification_documents_owner_or_admin_read on public.worker_verification_documents for select to authenticated
using (worker_id = auth.uid() or public.is_admin(true));
create policy portfolio_items_visible_read on public.worker_portfolio_items for select to authenticated
using (worker_id = auth.uid() or public.is_admin(false) or (
  is_published and exists (select 1 from public.worker_profiles w where w.account_id = worker_id and w.approval_status = 'APPROVED')
));
create policy portfolio_media_visible_read on public.worker_portfolio_media for select to authenticated
using (exists (
  select 1 from public.worker_portfolio_items i where i.id = portfolio_item_id and (
    i.worker_id = auth.uid() or public.is_admin(false) or (i.is_published and exists (
      select 1 from public.worker_profiles w where w.account_id = i.worker_id and w.approval_status = 'APPROVED'
    ))
  )
));

create trigger set_account_preferences_updated_at before update on public.account_preferences
for each row execute function public.set_updated_at();
create trigger set_notification_deliveries_updated_at before update on public.notification_deliveries
for each row execute function public.set_updated_at();
create trigger set_worker_portfolio_items_updated_at before update on public.worker_portfolio_items
for each row execute function public.set_updated_at();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('portfolio-media','portfolio-media',false,15728640,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy portfolio_storage_owner_upload on storage.objects for insert to authenticated
with check (bucket_id = 'portfolio-media' and (storage.foldername(name))[1] = auth.uid()::text and public.current_role() = 'WORKER');
create policy portfolio_storage_owner_update on storage.objects for update to authenticated
using (bucket_id = 'portfolio-media' and owner_id = auth.uid()::text)
with check (bucket_id = 'portfolio-media' and owner_id = auth.uid()::text);
create policy portfolio_storage_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'portfolio-media' and owner_id = auth.uid()::text);
create policy portfolio_storage_visible_read on storage.objects for select to authenticated
using (bucket_id = 'portfolio-media' and exists (
  select 1 from public.worker_portfolio_media m
  join public.worker_portfolio_items i on i.id = m.portfolio_item_id
  join public.worker_profiles w on w.account_id = i.worker_id
  where m.storage_path = name and (i.worker_id = auth.uid() or public.is_admin(false) or (i.is_published and w.approval_status = 'APPROVED'))
));

create or replace function public.snapshot_request_address()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.address_snapshot is null then
    select jsonb_build_object(
      'label', a.label, 'line1', a.line1, 'line2', a.line2, 'barangay', a.barangay,
      'city', a.city, 'province', a.province, 'postal_code', a.postal_code,
      'recipient_name', a.recipient_name, 'contact_mobile', a.contact_mobile, 'instructions', a.instructions
    ) into new.address_snapshot from public.addresses a where a.id = new.address_id;
  end if;
  return new;
end $$;
create trigger snapshot_request_address before insert on public.service_requests
for each row execute function public.snapshot_request_address();

create or replace function public.update_my_profile(
  p_display_name text,
  p_notifications jsonb default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare role public.account_role; result jsonb;
begin
  role := public.current_role();
  if length(trim(p_display_name)) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'Display name must contain 2 to 120 characters';
  end if;
  if role = 'USER' then
    update public.user_profiles set display_name = trim(p_display_name),
      notification_preferences = coalesce(p_notifications, notification_preferences)
    where account_id = auth.uid() returning to_jsonb(public.user_profiles.*) into result;
  elsif role = 'WORKER' then
    update public.worker_profiles set display_name = trim(p_display_name)
    where account_id = auth.uid() returning to_jsonb(public.worker_profiles.*) into result;
  else
    update public.admin_profiles set display_name = trim(p_display_name)
    where account_id = auth.uid() returning to_jsonb(public.admin_profiles.*) into result;
  end if;
  if p_notifications is not null then
    insert into public.account_preferences(account_id, notifications) values(auth.uid(), p_notifications)
    on conflict(account_id) do update set notifications = excluded.notifications;
  end if;
  return result;
end $$;

create or replace function public.update_my_preferences(
  p_locale text,
  p_timezone text,
  p_appearance text,
  p_notifications jsonb,
  p_privacy jsonb
)
returns public.account_preferences language plpgsql security definer set search_path = '' as $$
declare result public.account_preferences;
begin
  if p_appearance not in ('SYSTEM','LIGHT','DARK') or length(p_locale) not between 2 and 16 or length(p_timezone) not between 3 and 80 then
    raise exception using errcode = '22023', message = 'Invalid preferences';
  end if;
  insert into public.account_preferences(account_id, locale, timezone, appearance, notifications, privacy)
  values(auth.uid(), p_locale, p_timezone, p_appearance, p_notifications, p_privacy)
  on conflict(account_id) do update set locale = excluded.locale, timezone = excluded.timezone,
    appearance = excluded.appearance, notifications = excluded.notifications, privacy = excluded.privacy
  returning * into result;
  return result;
end $$;

create or replace function public.upsert_my_address(
  p_id uuid,
  p_label text,
  p_line1 text,
  p_line2 text,
  p_barangay text,
  p_city text,
  p_province text,
  p_postal_code text,
  p_latitude numeric,
  p_longitude numeric,
  p_is_default boolean,
  p_recipient_name text default null,
  p_contact_mobile text default null,
  p_instructions text default null
)
returns public.addresses language plpgsql security definer set search_path = '' as $$
declare result public.addresses;
begin
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception using errcode = '22023', message = 'Invalid address location';
  end if;
  if p_is_default then update public.addresses set is_default = false where account_id = auth.uid(); end if;
  insert into public.addresses(
    id, account_id, label, line1, line2, barangay, city, province, postal_code,
    location, is_default, recipient_name, contact_mobile, instructions, archived_at
  ) values (
    coalesce(p_id, gen_random_uuid()), auth.uid(), trim(p_label), trim(p_line1), nullif(trim(p_line2), ''),
    trim(p_barangay), trim(p_city), trim(p_province), nullif(trim(p_postal_code), ''),
    extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography,
    p_is_default, nullif(trim(p_recipient_name), ''), nullif(trim(p_contact_mobile), ''), nullif(trim(p_instructions), ''), null
  ) on conflict(id) do update set label = excluded.label, line1 = excluded.line1, line2 = excluded.line2,
    barangay = excluded.barangay, city = excluded.city, province = excluded.province,
    postal_code = excluded.postal_code, location = excluded.location,
    is_default = excluded.is_default, recipient_name = excluded.recipient_name,
    contact_mobile = excluded.contact_mobile, instructions = excluded.instructions, archived_at = null
  where public.addresses.account_id = auth.uid()
  returning * into result;
  return result;
end $$;

create or replace function public.archive_my_address(p_address_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  update public.addresses set archived_at = now(), is_default = false
  where id = p_address_id and account_id = auth.uid() and not exists (
    select 1 from public.service_requests r join public.bookings b on b.service_request_id = r.id
    where r.address_id = p_address_id and b.status not in ('COMPLETED','CANCELLED')
  );
  get diagnostics changed = row_count;
  return changed = 1;
end $$;

create or replace function public.toggle_favorite(p_worker_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if public.current_role() <> 'USER' or not exists (
    select 1 from public.worker_profiles w where w.account_id = p_worker_id and w.approval_status = 'APPROVED'
  ) then raise exception using errcode = '42501', message = 'Worker is unavailable'; end if;
  if exists (select 1 from public.favorites f where f.user_account_id = auth.uid() and f.worker_account_id = p_worker_id) then
    delete from public.favorites where user_account_id = auth.uid() and worker_account_id = p_worker_id;
    return false;
  end if;
  insert into public.favorites(user_account_id, worker_account_id) values(auth.uid(), p_worker_id);
  return true;
end $$;

create or replace function public.fanout_notification_deliveries()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status <> 'SENT' then return new; end if;
  insert into public.notification_deliveries(notification_id, recipient_id, delivered_at)
  select new.id, a.id, now() from public.accounts a
  where a.status = 'ACTIVE' and a.deleted_at is null and (
    a.id = new.recipient_id or
    (new.recipient_id is null and new.audience = 'EVERYONE') or
    (new.recipient_id is null and new.audience = 'USERS' and a.role = 'USER') or
    (new.recipient_id is null and new.audience = 'WORKERS' and a.role = 'WORKER')
  ) on conflict(notification_id, recipient_id) do nothing;
  return new;
end $$;
create trigger fanout_notification_deliveries after insert or update of status on public.notifications
for each row execute function public.fanout_notification_deliveries();

insert into public.notification_deliveries(notification_id, recipient_id, delivered_at, read_at)
select n.id, a.id, coalesce(n.sent_at, n.created_at), case when n.recipient_id = a.id then n.read_at end
from public.notifications n join public.accounts a on a.status = 'ACTIVE' and a.deleted_at is null
where n.status = 'SENT' and (
  a.id = n.recipient_id or
  (n.recipient_id is null and n.audience = 'EVERYONE') or
  (n.recipient_id is null and n.audience = 'USERS' and a.role = 'USER') or
  (n.recipient_id is null and n.audience = 'WORKERS' and a.role = 'WORKER')
) on conflict(notification_id, recipient_id) do nothing;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  update public.notification_deliveries set read_at = coalesce(read_at, now())
  where notification_id = p_notification_id and recipient_id = auth.uid();
  get diagnostics changed = row_count;
  return changed = 1;
end $$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  update public.conversation_participants set last_read_at = now()
  where conversation_id = p_conversation_id and account_id = auth.uid();
  get diagnostics changed = row_count;
  return changed = 1;
end $$;

create or replace function public.create_support_ticket(
  p_booking_id uuid,
  p_subject text,
  p_description text,
  p_category text,
  p_priority text default 'NORMAL'
)
returns public.support_tickets language plpgsql security definer set search_path = '' as $$
declare result public.support_tickets;
begin
  if p_booking_id is not null and not exists (
    select 1 from public.bookings b where b.id = p_booking_id and auth.uid() in (b.user_account_id, b.worker_account_id)
  ) then raise exception using errcode = '42501', message = 'Booking is unavailable'; end if;
  insert into public.support_tickets(owner_id, booking_id, subject, description, category, priority, last_message_at)
  values(auth.uid(), p_booking_id, trim(p_subject), trim(p_description), upper(trim(p_category)), p_priority, now())
  returning * into result;
  insert into public.support_ticket_messages(ticket_id, sender_id, body)
  values(result.id, auth.uid(), trim(p_description));
  return result;
end $$;

create or replace function public.send_support_message(p_ticket_id uuid, p_body text, p_internal boolean default false)
returns public.support_ticket_messages language plpgsql security definer set search_path = '' as $$
declare ticket public.support_tickets; result public.support_ticket_messages;
begin
  select * into ticket from public.support_tickets where id = p_ticket_id for update;
  if ticket.id is null or (ticket.owner_id <> auth.uid() and not public.is_admin(false)) then
    raise exception using errcode = '42501', message = 'Support ticket is unavailable';
  end if;
  if p_internal and not public.is_admin(false) then raise exception using errcode = '42501', message = 'Administrator required'; end if;
  if ticket.status = 'CLOSED' then raise exception using errcode = '55000', message = 'Support ticket is closed'; end if;
  insert into public.support_ticket_messages(ticket_id, sender_id, body, is_internal)
  values(ticket.id, auth.uid(), trim(p_body), p_internal) returning * into result;
  update public.support_tickets set last_message_at = now() where id = ticket.id;
  return result;
end $$;

create or replace function public.submit_verification_document(
  p_document_type text,
  p_storage_path text,
  p_content_type text,
  p_byte_size integer
)
returns public.worker_verification_documents language plpgsql security definer set search_path = '' as $$
declare verification public.worker_verifications; next_revision integer; result public.worker_verification_documents;
begin
  if public.current_role() <> 'WORKER' or split_part(p_storage_path, '/', 1) <> auth.uid()::text then
    raise exception using errcode = '42501', message = 'Worker document is not allowed';
  end if;
  select * into verification from public.worker_verifications where worker_id = auth.uid() for update;
  if verification.id is null then
    insert into public.worker_verifications(worker_id) values(auth.uid()) returning * into verification;
  end if;
  select coalesce(max(revision), 0) + 1 into next_revision from public.worker_verification_documents
  where verification_id = verification.id and document_type = upper(trim(p_document_type));
  insert into public.worker_verification_documents(
    verification_id, worker_id, document_type, storage_path, content_type, byte_size, revision
  ) values (
    verification.id, auth.uid(), upper(trim(p_document_type)), p_storage_path, p_content_type, p_byte_size, next_revision
  ) returning * into result;
  update public.worker_verifications set status = 'PENDING' where id = verification.id;
  update public.worker_profiles set approval_status = 'PENDING', is_available = false where account_id = auth.uid();
  return result;
end $$;

create or replace function public.upsert_portfolio_item(
  p_id uuid,
  p_category_id uuid,
  p_title text,
  p_description text,
  p_completed_on date,
  p_is_published boolean
)
returns public.worker_portfolio_items language plpgsql security definer set search_path = '' as $$
declare result public.worker_portfolio_items;
begin
  if public.current_role() <> 'WORKER' then raise exception using errcode = '42501', message = 'Worker required'; end if;
  insert into public.worker_portfolio_items(id, worker_id, category_id, title, description, completed_on, is_published)
  values(coalesce(p_id, gen_random_uuid()), auth.uid(), p_category_id, trim(p_title), trim(p_description), p_completed_on, p_is_published)
  on conflict(id) do update set category_id = excluded.category_id, title = excluded.title,
    description = excluded.description, completed_on = excluded.completed_on, is_published = excluded.is_published
  where public.worker_portfolio_items.worker_id = auth.uid()
  returning * into result;
  return result;
end $$;

create or replace function public.attach_portfolio_media(
  p_portfolio_item_id uuid,
  p_storage_path text,
  p_content_type text,
  p_byte_size integer
)
returns public.worker_portfolio_media language plpgsql security definer set search_path = '' as $$
declare result public.worker_portfolio_media;
begin
  if split_part(p_storage_path, '/', 1) <> auth.uid()::text or not exists (
    select 1 from public.worker_portfolio_items i where i.id = p_portfolio_item_id and i.worker_id = auth.uid()
  ) then raise exception using errcode = '42501', message = 'Portfolio attachment is not allowed'; end if;
  insert into public.worker_portfolio_media(portfolio_item_id, storage_path, content_type, byte_size)
  values(p_portfolio_item_id, p_storage_path, p_content_type, p_byte_size) returning * into result;
  return result;
end $$;

do $$
declare signature text;
begin
  foreach signature in array array[
    'update_my_profile(text,jsonb)', 'update_my_preferences(text,text,text,jsonb,jsonb)',
    'upsert_my_address(uuid,text,text,text,text,text,text,text,numeric,numeric,boolean,text,text,text)',
    'archive_my_address(uuid)', 'toggle_favorite(uuid)', 'mark_notification_read(uuid)',
    'mark_conversation_read(uuid)', 'create_support_ticket(uuid,text,text,text,text)',
    'send_support_message(uuid,text,boolean)', 'submit_verification_document(text,text,text,integer)',
    'upsert_portfolio_item(uuid,uuid,text,text,date,boolean)', 'attach_portfolio_media(uuid,text,text,integer)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', signature);
    execute format('grant execute on function public.%s to authenticated', signature);
  end loop;
end $$;
