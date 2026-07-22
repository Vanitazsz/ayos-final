#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
project_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
output="$project_root/supabase/sql-editor-install.sql"
temporary=$(mktemp "${TMPDIR:-/tmp}/ayos-sql-editor-install.XXXXXX")
patch_output="$project_root/supabase/sql-editor-admin-bootstrap-fix.sql"
patch_temporary=$(mktemp "${TMPDIR:-/tmp}/ayos-admin-bootstrap-patch.XXXXXX")
deletion_patch_output="$project_root/supabase/sql-editor-account-deletion.sql"
deletion_patch_temporary=$(mktemp "${TMPDIR:-/tmp}/ayos-account-deletion-patch.XXXXXX")
parity_patch_output="$project_root/supabase/sql-editor-complete-ui-parity.sql"
parity_patch_temporary=$(mktemp "${TMPDIR:-/tmp}/ayos-complete-ui-parity-patch.XXXXXX")
trap 'rm -f "$temporary" "$patch_temporary" "$deletion_patch_temporary" "$parity_patch_temporary"' EXIT HUP INT TERM

append_section() {
  title=$1
  source=$2
  {
    printf '\n-- ============================================================================\n'
    printf -- '-- %s\n' "$title"
    printf -- '-- Source: %s\n' "$source"
    printf -- '-- ============================================================================\n\n'
    sed -e '$a\' "$project_root/$source"
  } >> "$temporary"
}

cat > "$temporary" <<'SQL'
-- A-YOS complete Supabase SQL Editor installer
-- Target: a NEW, EMPTY Supabase project only.
-- Generated from the authoritative migrations by scripts/build-sql-editor-installer.sh.
--
-- Run this file once from the Supabase Dashboard SQL Editor as the project owner.
-- The installer intentionally aborts if core A-YOS objects already exist.
-- It contains development placeholder legal/help content that must be replaced
-- before any production deployment.

begin;

do $preflight$
begin
  if to_regclass('public.accounts') is not null
     or exists (
       select 1
       from pg_type type_record
       join pg_namespace namespace_record
         on namespace_record.oid = type_record.typnamespace
       where namespace_record.nspname = 'public'
         and type_record.typname = 'account_role'
     )
     or to_regprocedure('public.current_role()') is not null then
    raise exception using
      errcode = 'P0001',
      message = 'A_YOS_INSTALL_TARGET_NOT_EMPTY',
      detail = 'Core A-YOS objects already exist in the public schema.',
      hint = 'Run this installer only on a new empty Supabase project. Use migrations for upgrades.';
  end if;
end
$preflight$;
SQL

append_section "1. Platform schema" "supabase/migrations/20260720000100_platform.sql"
append_section "2. Domain RPCs" "supabase/migrations/20260720000200_domain_rpcs.sql"
append_section "3. Security, Realtime, Storage, and background jobs" "supabase/migrations/20260720000300_security_realtime_jobs.sql"
append_section "4. Administrator and queue RPCs" "supabase/migrations/20260720000400_admin_and_queue_rpcs.sql"
append_section "5. PostGIS geospatial and AI support" "supabase/migrations/20260720000500_geospatial_ai.sql"
append_section "6. Secure administrator bootstrap" "supabase/migrations/20260720000600_secure_admin_bootstrap.sql"
append_section "7. UI integration commands" "supabase/migrations/20260720000700_ui_integration_commands.sql"
append_section "8. Historical payment records and worker wallet" "supabase/migrations/20260721000100_paymongo_wallet.sql"
append_section "9. Profile and communication parity" "supabase/migrations/20260721000200_profile_communication_parity.sql"
append_section "10. Offers, promotions, and cancellations" "supabase/migrations/20260721000300_offers_promotions_cancellations.sql"
append_section "11. Administrator operations parity" "supabase/migrations/20260721000400_admin_operations_parity.sql"
append_section "12. Historical role compatibility foundation" "supabase/migrations/20260721000500_session_role_switching.sql"
append_section "13. Payment invariants" "supabase/migrations/20260721000600_payment_invariants.sql"
append_section "14. Wallet top-ups" "supabase/migrations/20260721000700_wallet_topups.sql"
append_section "15. Confirmed User and Worker account deletion" "supabase/migrations/20260721000800_admin_account_deletion.sql"
append_section "16. Complete UI parity contracts" "supabase/migrations/20260721000900_complete_ui_parity.sql"
append_section "17. Complete backend integration" "supabase/migrations/20260721001000_complete_backend_integration.sql"
append_section "18. Approved frontend compatibility" "supabase/migrations/20260722000100_approved_frontend_compatibility.sql"
append_section "19. AI and geocoding frontend contracts" "supabase/migrations/20260722000200_ai_geocoding_frontend_contract.sql"
append_section "20. Administrator frontend commands" "supabase/migrations/20260722000300_admin_frontend_commands.sql"
append_section "21. Permanent single-role account enforcement" "supabase/migrations/20260722000400_single_role_accounts.sql"
append_section "22. Industry and skill taxonomy" "supabase/migrations/20260722000500_industry_skill_taxonomy.sql"
append_section "23. Hosted industry taxonomy reconciliation" "supabase/migrations/20260722000600_reconcile_hosted_industry_taxonomy.sql"
append_section "24. Development seed data" "supabase/seed.sql"

cat >> "$temporary" <<'SQL'

commit;

-- ============================================================================
-- Installation verification (read-only)
-- ============================================================================

-- Required extensions and their schemas.
select extension_record.extname as extension_name,
       namespace_record.nspname as installed_schema,
       extension_record.extversion as version
from pg_extension extension_record
join pg_namespace namespace_record
  on namespace_record.oid = extension_record.extnamespace
where extension_record.extname in (
  'pgcrypto', 'pgmq', 'pg_cron', 'pg_net', 'supabase_vault', 'postgis'
)
order by extension_record.extname;

-- Every exposed A-YOS table and its RLS/forced-RLS state.
select table_record.relname as table_name,
       table_record.relrowsecurity as rls_enabled,
       table_record.relforcerowsecurity as rls_forced
from pg_class table_record
join pg_namespace namespace_record
  on namespace_record.oid = table_record.relnamespace
where namespace_record.nspname = 'public'
  and table_record.relkind = 'r'
order by table_record.relname;

-- Private application buckets.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in (
  'request-media', 'verification-documents', 'message-attachments',
  'review-media', 'profile-images', 'report-exports'
)
order by id;

-- Durable application queues.
select queue_name, is_partitioned, is_unlogged
from pgmq.meta
where queue_name in (
  'booking_timeouts', 'no_match_notifications',
  'scheduled_notifications', 'provider_work'
)
order by queue_name;

-- Scheduled queue consumer. It safely does nothing until the required Vault
-- values are configured.
select jobid, jobname, schedule, command, active
from cron.job
where jobname = 'ayos-queue-consumer';

-- Authoritative geography columns and GiST indexes.
select table_name, column_name, udt_name
from information_schema.columns
where table_schema = 'public'
  and udt_name = 'geography'
order by table_name, column_name;

select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexdef ilike '%using gist%'
order by tablename, indexname;

-- Development seed confirmation. Replace the placeholder content before
-- production use.
select key, title, published_at
from public.content_pages
order by key;

select name, is_active
from public.service_categories
order by name;

select industry.name, industry.sort_order, count(category.id) as active_skill_count
from public.industries industry
left join public.service_categories category
  on category.industry_id = industry.id and category.is_active
where industry.is_active
group by industry.id, industry.name, industry.sort_order
order by industry.sort_order, industry.name;
SQL

mv "$temporary" "$output"

{
  printf '%s\n' '-- A-YOS hosted-project patch: secure administrator bootstrap.'
  printf '%s\n' '-- Apply once in the Supabase SQL Editor, then run `pnpm admin:bootstrap`.'
  printf '\nbegin;\n\n'
  sed -e '$a\' "$project_root/supabase/migrations/20260720000600_secure_admin_bootstrap.sql"
  printf '\ncommit;\n'
} > "$patch_temporary"
mv "$patch_temporary" "$patch_output"

{
  printf '%s\n' '-- A-YOS hosted-project patch: confirmed User and Worker account deletion.'
  printf '%s\n' '-- Apply once in the Supabase SQL Editor.'
  printf '\nbegin;\n\n'
  sed -e '$a\' "$project_root/supabase/migrations/20260721000800_admin_account_deletion.sql"
  printf '\ncommit;\n'
} > "$deletion_patch_temporary"
mv "$deletion_patch_temporary" "$deletion_patch_output"

{
  printf '%s\n' '-- A-YOS hosted-project patch: complete UI parity contracts.'
  printf '%s\n' '-- Apply once in the Supabase SQL Editor after earlier numbered migrations.'
  printf '\nbegin;\n\n'
  sed -e '$a\' "$project_root/supabase/migrations/20260721000900_complete_ui_parity.sql"
  printf '\ncommit;\n'
} > "$parity_patch_temporary"
mv "$parity_patch_temporary" "$parity_patch_output"

trap - EXIT HUP INT TERM
printf 'Generated %s\n' "$output"
printf 'Generated %s\n' "$patch_output"
printf 'Generated %s\n' "$deletion_patch_output"
printf 'Generated %s\n' "$parity_patch_output"
