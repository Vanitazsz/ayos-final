begin;
-- Hard deletion is reserved for accounts with no retained marketplace history.
-- Accounts that participated in requests, bookings, payments, conversations,
-- reviews, support, or AI processing must be suspended/soft-deleted instead.
do $$
declare
  function_definition text;
  guard_sql text := $guard$
  if exists (
      select 1 from public.ai_analyses where account_id = target.id
    ) or exists (
      select 1 from public.service_requests where user_account_id = target.id
    ) or exists (
      select 1
      from public.bookings
      where user_account_id = target.id or worker_account_id = target.id
    ) or exists (
      select 1 from public.messages where sender_id = target.id
    ) or exists (
      select 1 from public.support_tickets where owner_id = target.id
    ) or exists (
      select 1
      from public.reviews
      where user_account_id = target.id or worker_account_id = target.id
    )
  then
    raise exception using
      errcode = '23503',
      message = 'ACCOUNT_DELETE_BLOCKED_BY_RELATED_RECORDS',
      detail = 'Suspend the account when requests, bookings, payments, messages, support, AI, or other retained records exist.';
  end if;

$guard$;
begin
  select pg_get_functiondef(
    'public.admin_delete_account(uuid,text)'::regprocedure
  )
  into function_definition;

  if function_definition not like '%from public.ai_analyses where account_id = target.id%'
  then
    function_definition := replace(
      function_definition,
      '  drop table if exists pg_temp.hard_delete_rows;',
      guard_sql || '  drop table if exists pg_temp.hard_delete_rows;'
    );
    execute function_definition;
  end if;
end
$$;
commit;
