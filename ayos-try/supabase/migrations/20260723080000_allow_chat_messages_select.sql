begin;

-- Ensure messages table select policy is open for all authenticated chat participants
drop policy if exists messages_member_read on public.messages;
create policy messages_member_read on public.messages for select to authenticated using(true);

commit;
