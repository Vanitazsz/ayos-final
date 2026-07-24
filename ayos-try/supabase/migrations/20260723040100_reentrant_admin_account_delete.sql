begin;
-- pgTAP and administrative batch operations may invoke the deletion RPC more
-- than once in the same transaction. Recreate its session-local work table for
-- every invocation so rows from a previous deletion cannot leak into the next.
do $$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.admin_delete_account(uuid,text)'::regprocedure
  )
  into function_definition;

  if function_definition not like '%drop table if exists pg_temp.hard_delete_rows;%'
  then
    function_definition := replace(
      function_definition,
      '  create temp table hard_delete_rows (',
      E'  drop table if exists pg_temp.hard_delete_rows;\n\n  create temp table hard_delete_rows ('
    );
    execute function_definition;
  end if;
end
$$;
commit;
