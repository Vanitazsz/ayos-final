begin;

do $body$
declare
  fk record;
  definition text;
begin
  for fk in
    select
      con.conname,
      child_namespace.nspname as child_schema,
      child.relname as child_table,
      pg_get_constraintdef(con.oid) as constraint_definition
    from pg_constraint con
    join pg_class child on child.oid = con.conrelid
    join pg_namespace child_namespace on child_namespace.oid = child.relnamespace
    where con.contype = 'f'
      and con.confdeltype = 'c'
      and child_namespace.nspname = 'public'
  loop
    definition := replace(
      fk.constraint_definition,
      'ON DELETE CASCADE',
      'ON DELETE RESTRICT'
    );
    execute format(
      'alter table %I.%I drop constraint %I',
      fk.child_schema,
      fk.child_table,
      fk.conname
    );
    execute format(
      'alter table %I.%I add constraint %I %s',
      fk.child_schema,
      fk.child_table,
      fk.conname,
      definition
    );
  end loop;
end
$body$;

notify pgrst, 'reload schema';
notify pgrst, 'reload config';

commit;
