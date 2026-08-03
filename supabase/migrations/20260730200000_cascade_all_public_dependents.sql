begin;

do $body$
declare fk record; definition text;
begin
  for fk in
    select con.conname, n.nspname child_schema, c.relname child_table,
           pg_get_constraintdef(con.oid) constraint_definition
    from pg_constraint con
    join pg_class c on c.oid=con.conrelid
    join pg_namespace n on n.oid=c.relnamespace
    where con.contype='f' and con.confdeltype='r' and n.nspname='public'
  loop
    definition := replace(fk.constraint_definition, 'ON DELETE RESTRICT', 'ON DELETE CASCADE');
    execute format('alter table %I.%I drop constraint %I', fk.child_schema, fk.child_table, fk.conname);
    execute format('alter table %I.%I add constraint %I %s', fk.child_schema, fk.child_table, fk.conname, definition);
  end loop;
end
$body$;

commit;
