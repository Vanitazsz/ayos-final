-- This version was applied directly to the hosted project during dispatch
-- recovery. Keep the version in source control so local and hosted migration
-- histories remain aligned. The durable schema changes are represented by the
-- preceding reconciliation migrations.

select pg_notify('pgrst','reload schema');
