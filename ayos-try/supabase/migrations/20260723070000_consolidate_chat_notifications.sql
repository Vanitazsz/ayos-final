begin;

create or replace function public.send_chat_message(p_conversation_id uuid, p_body text, p_original_locale text default 'en')
returns public.messages language plpgsql security definer set search_path = '' as $$
declare
  msg public.messages;
  recipient uuid;
  sender_name text;
  existing_notif_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode='42501', message='Authentication required';
  end if;

  if not exists(select 1 from public.conversation_participants where conversation_id = p_conversation_id and account_id = auth.uid()) then
    raise exception using errcode='42501', message='Conversation participant required';
  end if;

  -- Insert message into messages table for the real live chat
  insert into public.messages(conversation_id, sender_id, body, original_locale, created_at)
  values(p_conversation_id, auth.uid(), trim(p_body), coalesce(p_original_locale, 'en'), now())
  returning * into msg;

  -- Touch conversation timestamp
  update public.conversations set updated_at = now() where id = p_conversation_id;

  -- Find recipient ID
  select account_id into recipient
  from public.conversation_participants
  where conversation_id = p_conversation_id and account_id <> auth.uid()
  limit 1;

  -- Get sender display name
  select coalesce(
    (select display_name from public.user_profiles where account_id = auth.uid()),
    (select display_name from public.worker_profiles where account_id = auth.uid()),
    'Participant'
  ) into sender_name;

  -- Notify recipient ONCE (consolidated per recipient) instead of creating a notification for every chat message line
  if recipient is not null then
    begin
      select id into existing_notif_id
      from public.notifications
      where recipient_id = recipient
        and category = 'CHAT'
        and read_at is null
      order by created_at desc
      limit 1;

      if existing_notif_id is not null then
        update public.notifications
        set title = 'New Chat Message 💬',
            body = sender_name || ' sent you a message',
            updated_at = now(),
            created_at = now()
        where id = existing_notif_id;
      else
        insert into public.notifications(recipient_id, title, body, category, status, sent_at, created_at)
        values(
          recipient,
          'New Chat Message 💬',
          sender_name || ' sent you a message',
          'CHAT',
          'SENT'::public.notification_status,
          now(),
          now()
        );
      end if;
    exception when others then
      null;
    end;
  end if;

  return msg;
end $$;

commit;
