begin;

create or replace function public.send_chat_message(p_conversation_id uuid, p_body text, p_original_locale text default 'en')
returns public.messages language plpgsql security definer set search_path = '' as $$
declare
  msg public.messages;
  recipient uuid;
  sender_name text;
begin
  if auth.uid() is null then
    raise exception using errcode='42501', message='Authentication required';
  end if;

  if not exists(select 1 from public.conversation_participants where conversation_id = p_conversation_id and account_id = auth.uid()) then
    raise exception using errcode='42501', message='Conversation participant required';
  end if;

  -- Insert message
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

  -- Insert real-time notification for recipient with correct schema columns
  if recipient is not null then
    begin
      insert into public.notifications(recipient_id, title, body, category, status, sent_at, created_at)
      values(
        recipient,
        'New Chat Message 💬',
        sender_name || ': ' || substring(trim(p_body) from 1 for 80),
        'CHAT',
        'SENT'::public.notification_status,
        now(),
        now()
      );
    exception when others then
      -- Prevent notification failures from blocking message delivery
      null;
    end;
  end if;

  return msg;
end $$;

commit;
