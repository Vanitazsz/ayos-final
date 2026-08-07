begin;

-- Permanent deletion of a closed conversation.
-- Archive (_archive_closed_conversation_) only hides the conversation by
-- setting archived_at while retaining the row and its messages for
-- administration. This RPC removes the conversation row entirely so the
-- messages, attachments, translations, and participants cascade away for
-- both participants. It reuses the existing chat_can_archive guard so only
-- participants of a matched, closed, not-yet-archived conversation can
-- permanently delete it.

create or replace function public.delete_closed_conversation(
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

  delete from public.conversations
  where id = p_conversation_id
  returning * into result;

  if result.id is null then
    raise exception using errcode = '42501', message = 'CONVERSATION_NOT_ARCHIVABLE';
  end if;

  return result;
end
$$;

revoke execute on function public.delete_closed_conversation(uuid) from public, anon;
grant execute on function public.delete_closed_conversation(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
