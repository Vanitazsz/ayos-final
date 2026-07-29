begin;

alter table public.conversations
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.accounts(id) on delete restrict;

create index if not exists conversations_participant_visible_idx
  on public.conversations(updated_at desc)
  where archived_at is null;

create or replace function public.chat_is_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.conversation_participants participant
    where participant.conversation_id = p_conversation_id
      and participant.account_id = auth.uid()
  )
$$;

create or replace function public.chat_is_matched(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.conversations conversation
    where conversation.id = p_conversation_id
      and (
        (
          conversation.booking_id is not null
          and exists(
            select 1
            from public.bookings booking
            where booking.id = conversation.booking_id
              and (
                conversation.service_request_id is null
                or conversation.service_request_id = booking.service_request_id
              )
              and exists(
                select 1
                from public.conversation_participants customer
                where customer.conversation_id = conversation.id
                  and customer.account_id = booking.user_account_id
              )
              and exists(
                select 1
                from public.conversation_participants worker
                where worker.conversation_id = conversation.id
                  and worker.account_id = booking.worker_account_id
              )
          )
        )
        or (
          conversation.booking_id is null
          and conversation.service_request_id is not null
          and conversation.worker_account_id is not null
          and exists(
            select 1
            from public.service_requests request
            where request.id = conversation.service_request_id
              and exists(
                select 1
                from public.conversation_participants customer
                where customer.conversation_id = conversation.id
                  and customer.account_id = request.user_account_id
              )
              and exists(
                select 1
                from public.conversation_participants worker
                where worker.conversation_id = conversation.id
                  and worker.account_id = conversation.worker_account_id
              )
              and (
                request.selected_worker_id = conversation.worker_account_id
                or exists(
                  select 1
                  from public.service_request_dispatches dispatch
                  where dispatch.service_request_id = request.id
                    and dispatch.worker_id = conversation.worker_account_id
                    and dispatch.status::text in ('ACCEPTED', 'SELECTED')
                )
              )
          )
        )
      )
  )
$$;

create or replace function public.chat_can_read(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin(false)
    or (
      public.chat_is_member(p_conversation_id)
      and public.chat_is_matched(p_conversation_id)
      and exists(
        select 1
        from public.conversations conversation
        where conversation.id = p_conversation_id
          and conversation.archived_at is null
      )
    )
$$;

create or replace function public.chat_can_send(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.chat_is_member(p_conversation_id)
    and public.chat_is_matched(p_conversation_id)
    and exists(
      select 1
      from public.conversations conversation
      left join public.bookings booking
        on booking.id = conversation.booking_id
      left join public.service_requests request
        on request.id = conversation.service_request_id
      where conversation.id = p_conversation_id
        and conversation.archived_at is null
        and (
          (
            conversation.booking_id is not null
            and booking.status not in ('COMPLETED', 'CANCELLED')
          )
          or (
            conversation.booking_id is null
            and request.status in ('OPEN', 'MATCHED')
          )
        )
    )
$$;

create or replace function public.chat_can_archive(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.chat_is_member(p_conversation_id)
    and public.chat_is_matched(p_conversation_id)
    and exists(
      select 1
      from public.conversations conversation
      left join public.bookings booking
        on booking.id = conversation.booking_id
      left join public.service_requests request
        on request.id = conversation.service_request_id
      where conversation.id = p_conversation_id
        and conversation.archived_at is null
        and (
          booking.status in ('COMPLETED', 'CANCELLED')
          or (
            conversation.booking_id is null
            and request.status in ('CLOSED', 'CANCELLED')
          )
        )
    )
$$;

drop policy if exists conversations_member_read on public.conversations;
create policy conversations_matched_read
on public.conversations
for select
to authenticated
using(public.chat_can_read(id));

drop policy if exists participants_member_read on public.conversation_participants;
create policy participants_matched_read
on public.conversation_participants
for select
to authenticated
using(public.chat_can_read(conversation_id));

drop policy if exists messages_member_read on public.messages;
create policy messages_matched_read
on public.messages
for select
to authenticated
using(public.chat_can_read(conversation_id));

drop policy if exists messages_member_insert on public.messages;
create policy messages_matched_insert
on public.messages
for insert
to authenticated
with check(
  sender_id = auth.uid()
  and public.chat_can_send(conversation_id)
);

drop policy if exists attachments_member_read on public.message_attachments;
create policy attachments_matched_read
on public.message_attachments
for select
to authenticated
using(
  exists(
    select 1
    from public.messages message
    where message.id = message_id
      and public.chat_can_read(message.conversation_id)
  )
);

drop policy if exists attachments_sender_insert on public.message_attachments;
create policy attachments_matched_insert
on public.message_attachments
for insert
to authenticated
with check(
  exists(
    select 1
    from public.messages message
    where message.id = message_id
      and message.sender_id = auth.uid()
      and public.chat_can_send(message.conversation_id)
  )
);

drop policy if exists translations_member_read on public.message_translations;
create policy translations_matched_read
on public.message_translations
for select
to authenticated
using(
  exists(
    select 1
    from public.messages message
    where message.id = message_id
      and public.chat_can_read(message.conversation_id)
  )
);

drop policy if exists storage_authorized_read on storage.objects;
create policy storage_authorized_read
on storage.objects
for select
to authenticated
using(
  owner_id = auth.uid()::text
  or public.is_admin(false)
  or (
    bucket_id = 'message-attachments'
    and exists(
      select 1
      from public.message_attachments attachment
      join public.messages message on message.id = attachment.message_id
      where attachment.storage_path = name
        and public.chat_can_read(message.conversation_id)
    )
  )
  or (
    bucket_id = 'request-media'
    and exists(
      select 1
      from public.request_media media
      join public.service_requests request
        on request.id = media.service_request_id
      where media.storage_path = name
        and (
          request.user_account_id = auth.uid()
          or request.selected_worker_id = auth.uid()
        )
    )
  )
  or (
    bucket_id = 'review-media'
    and exists(
      select 1
      from public.review_media media
      join public.reviews review on review.id = media.review_id
      where media.storage_path = name
        and (
          review.user_account_id = auth.uid()
          or (
            review.worker_account_id = auth.uid()
            and review.moderation_status = 'PUBLISHED'
          )
        )
    )
  )
);

drop policy if exists realtime_conversation_read on realtime.messages;
create policy realtime_conversation_read
on realtime.messages
for select
to authenticated
using(
  extension = 'broadcast'
  and split_part(realtime.topic(), ':', 1) = 'conversation'
  and public.chat_can_read(split_part(realtime.topic(), ':', 2)::uuid)
);

create or replace function public.broadcast_conversation_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.broadcast_changes(
    'conversation:' || new.id::text || ':messages',
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return new;
end
$$;

drop trigger if exists broadcast_conversation_change on public.conversations;
create trigger broadcast_conversation_change
after update on public.conversations
for each row
execute function public.broadcast_conversation_change();

drop policy if exists conversations_auth_insert on public.conversations;
drop policy if exists participants_auth_insert on public.conversation_participants;
revoke insert on public.conversations from authenticated;
revoke insert on public.conversation_participants from authenticated;

drop function if exists public.start_direct_chat(uuid);

create or replace function public.send_chat_message(
  p_conversation_id uuid,
  p_body text,
  p_original_locale text default 'en'
) returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.messages;
  recipient uuid;
  sender_name text;
  existing_notification_id uuid;
  normalized_body text := btrim(coalesce(p_body, ''));
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if length(normalized_body) < 1 or length(normalized_body) > 4000 then
    raise exception using errcode = '22023', message = 'Message must contain between 1 and 4000 characters';
  end if;
  if not public.chat_can_send(p_conversation_id) then
    raise exception using errcode = '42501', message = 'CHAT_UNAVAILABLE';
  end if;

  insert into public.messages(
    conversation_id,
    sender_id,
    body,
    original_locale,
    created_at
  ) values (
    p_conversation_id,
    auth.uid(),
    normalized_body,
    coalesce(nullif(btrim(p_original_locale), ''), 'en'),
    now()
  )
  returning * into result;

  update public.conversations
  set updated_at = now()
  where id = p_conversation_id;

  select participant.account_id
  into recipient
  from public.conversation_participants participant
  where participant.conversation_id = p_conversation_id
    and participant.account_id <> auth.uid()
  limit 1;

  select coalesce(
    (
      select profile.display_name
      from public.user_profiles profile
      where profile.account_id = auth.uid()
    ),
    (
      select profile.display_name
      from public.worker_profiles profile
      where profile.account_id = auth.uid()
    ),
    'Participant'
  )
  into sender_name;

  if recipient is not null then
    begin
      select notification.id
      into existing_notification_id
      from public.notifications notification
      where notification.recipient_id = recipient
        and notification.category = 'CHAT'
        and notification.read_at is null
      order by notification.created_at desc
      limit 1;

      if existing_notification_id is not null then
        update public.notifications
        set title = 'New Chat Message 💬',
            body = sender_name || ' sent you a message',
            updated_at = now(),
            created_at = now()
        where id = existing_notification_id;
      else
        insert into public.notifications(
          recipient_id,
          title,
          body,
          category,
          status,
          sent_at,
          created_at
        ) values (
          recipient,
          'New Chat Message 💬',
          sender_name || ' sent you a message',
          'CHAT',
          'SENT'::public.notification_status,
          now(),
          now()
        );
      end if;
    exception
      when others then
        null;
    end;
  end if;

  return result;
end
$$;

create or replace function public.archive_closed_conversation(
  p_conversation_id uuid
) returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.conversations;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if not public.chat_can_archive(p_conversation_id) then
    raise exception using errcode = '42501', message = 'CONVERSATION_NOT_ARCHIVABLE';
  end if;

  update public.conversations
  set archived_at = now(),
      archived_by = auth.uid(),
      updated_at = now()
  where id = p_conversation_id
  returning * into result;

  return result;
end
$$;

revoke execute on function public.chat_is_member(uuid) from public, anon;
revoke execute on function public.chat_is_matched(uuid) from public, anon;
revoke execute on function public.chat_can_read(uuid) from public, anon;
revoke execute on function public.chat_can_send(uuid) from public, anon;
revoke execute on function public.chat_can_archive(uuid) from public, anon;
revoke execute on function public.send_chat_message(uuid, text, text) from public, anon;
revoke execute on function public.archive_closed_conversation(uuid) from public, anon;

grant execute on function public.chat_is_member(uuid) to authenticated;
grant execute on function public.chat_is_matched(uuid) to authenticated;
grant execute on function public.chat_can_read(uuid) to authenticated;
grant execute on function public.chat_can_send(uuid) to authenticated;
grant execute on function public.chat_can_archive(uuid) to authenticated;
grant execute on function public.send_chat_message(uuid, text, text) to authenticated;
grant execute on function public.archive_closed_conversation(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
