begin;
-- Grant INSERT on conversations, conversation_participants, and notifications to authenticated users
grant insert on public.conversations to authenticated;
grant insert on public.conversation_participants to authenticated;
grant insert on public.notifications to authenticated;
-- RLS policies
drop policy if exists conversations_auth_insert on public.conversations;
create policy conversations_auth_insert on public.conversations for insert to authenticated with check(true);
drop policy if exists participants_auth_insert on public.conversation_participants;
create policy participants_auth_insert on public.conversation_participants for insert to authenticated with check(true);
drop policy if exists notifications_auth_insert on public.notifications;
create policy notifications_auth_insert on public.notifications for insert to authenticated with check(true);
drop policy if exists user_profile_authenticated_read on public.user_profiles;
create policy user_profile_authenticated_read on public.user_profiles for select to authenticated using(true);
-- Atomic RPC to start or get a direct conversation between two users
create or replace function public.start_direct_chat(p_target_account_id uuid)
returns public.conversations language plpgsql security definer set search_path = '' as $$
declare
  conv_id uuid;
  result public.conversations;
begin
  if auth.uid() is null then
    raise exception using errcode='42501', message='Authentication required';
  end if;

  -- Search for an existing shared conversation
  select cp1.conversation_id into conv_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2 on cp1.conversation_id = cp2.conversation_id
  join public.conversations c on c.id = cp1.conversation_id
  where cp1.account_id = auth.uid()
    and cp2.account_id = p_target_account_id
    and c.booking_id is null
  limit 1;

  if conv_id is not null then
    select * into result from public.conversations where id = conv_id;
    return result;
  end if;

  -- Create new direct conversation
  insert into public.conversations(created_at, updated_at)
  values(now(), now())
  returning * into result;

  insert into public.conversation_participants(conversation_id, account_id)
  values (result.id, auth.uid()), (result.id, p_target_account_id)
  on conflict do nothing;

  return result;
end $$;
-- Atomic RPC to send a chat message and deliver notification to recipient
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

  -- Insert real-time notification for recipient
  if recipient is not null then
    insert into public.notifications(recipient_id, title, body, type, payload, created_at)
    values(
      recipient,
      'New Chat Message 💬',
      sender_name || ': ' || substring(trim(p_body) from 1 for 80),
      'CHAT',
      jsonb_build_object('conversation_id', p_conversation_id),
      now()
    );
  end if;

  return msg;
end $$;
commit;
