# Remove Worker Working Schedule Design

**Date:** 2026-08-10

## Goal

Remove the worker's weekly working-schedule feature completely from the active application and database. This includes the mobile contract and UI, schedule-specific matching and readiness logic, the `public.worker_availability` table and its policies, fixtures and tests, and the operational SQL installer. Customer-request appointment scheduling through `service_requests.scheduled_at`, notification scheduling, and worker online/presence availability remain unchanged.

## Current implementation

The feature is currently split across these surfaces:

- Mobile matching contract: `apps/mobile/services/workerMatching.ts` contains `WorkerScheduleDay`, `scheduleReady`, `schedule`, and the `p_schedule` RPC argument.
- Worker screens: `apps/mobile/app/(worker)/service-setup.tsx` retains hidden schedule state and schedule validation, and renders the “Working schedule” readiness row. `apps/mobile/app/(worker)/profile.tsx` forwards the persisted schedule when toggling online status.
- Shared matching logic: `packages/domain/src/matching.ts` uses `scheduleFit` as a score factor and eligibility gate. `apps/mobile/services/liveDispatch.ts` retains the `OUTSIDE_WORKING_HOURS` diagnostic value.
- Database schema and functions: `public.worker_availability` is created in the platform migration. The active function chain still contains schedule references in `public.generate_matches_weighted_core`, `private.require_worker_ready_for_booking_acceptance`, `public.admin_activate_verified_worker`, and `public.save_my_worker_matching_setup`.
- Tests and contracts: database fixtures insert schedule rows; mobile E2E fixtures return `scheduleReady`; domain tests exercise `scheduleFit`; generated Supabase types expose the table and `p_schedule`.
- Operational installer and requirements: `supabase/sql-editor-install.sql`, `REQUIREMENTS.md`, and `requirements/catalog.json` still describe or create the worker schedule.

Applied migrations, migration archives, and hosted backups are historical records and will not be rewritten.

## Design

### Mobile behavior

The worker service-area screen remains responsible for service origin, service-area label, coverage radius, and online status. Remove all weekly-schedule constants, state, conversion helpers, memoized selected-schedule data, schedule validation, schedule props, and the “Working schedule” readiness row. Keep the existing loading, error, save, location, radius, and online-status behavior.

The `workerMatching` service will expose readiness without schedule fields and will call `save_my_worker_matching_setup` with latitude, longitude, radius, service area, and online status only. Profile online toggling will use the same schedule-free input. The existing error messages will continue to describe verification, skills, rate, and service-area requirements only.

### Matching behavior

Workers will be eligible based on the existing non-schedule rules: account and approval status, active category skills and rates, service-area/radius requirements, online status, fresh presence where applicable, and existing privacy/blocking rules. Remove weekly-hours predicates and schedule-specific diagnostic values. Remove the shared domain `scheduleFit` input, schedule score factor, and schedule eligibility gate while retaining the other score factors and deterministic ordering.

The customer-request appointment time remains available to request creation, booking display, rate-estimate validation, and lifecycle logic. It will no longer be compared with a worker weekly schedule.

### Database migration

Add one new append-only migration after the current migration head. It will run transactionally and, in dependency-safe order:

1. Replace `public.generate_matches_weighted_core(uuid)` with the existing weighted matching behavior minus the worker-availability predicate and schedule/availability score weight. The existing `public.generate_matches(uuid)` wrapper remains available.
2. Replace `private.require_worker_ready_for_booking_acceptance()` without the worker-availability existence check, preserving its remaining account, approval, skills, rate, and authorization checks.
3. Replace `public.admin_activate_verified_worker(uuid)` without inserting seven default weekly rows, preserving its admin authorization, account activation, skill provisioning, and worker-profile updates.
4. Replace `public.save_my_worker_matching_setup` with the five-argument contract `(numeric, numeric, integer, text, boolean)`, removing JSON schedule validation and all availability-row writes while preserving worker-role validation, input validation, readiness checks, profile updates, grants, and the readiness return value.
5. Drop `public.worker_availability` without `CASCADE` so unexpected live dependencies fail the migration rather than being silently removed.
6. Reload the PostgREST schema cache.

The migration will preserve security-definer settings, explicit search paths, authorization semantics, and existing error codes. Revokes and grants will be reapplied to the new `save_my_worker_matching_setup` signature and preserved unchanged for every other function. `admin_set_worker_availability` remains because it changes the worker’s online `is_available` flag, not weekly hours.

Update `supabase/sql-editor-install.sql` to match the active schema: remove the worker-availability table, policies, grants, schedule predicates, and schedule writes while retaining online matching. This keeps the manual installer from recreating the deleted feature.

### Database non-regression contract

The migration may change only the schedule-specific objects and function bodies listed above. It must not alter unrelated tables, columns, indexes, enums, triggers, storage, queues, authentication/session behavior, RLS policies, grants, AAL2 checks, or RPC signatures. The sole intentional signature change is removing the schedule-bearing argument from `save_my_worker_matching_setup`; its authorization contract remains unchanged. The following contracts must remain available and behaviorally unchanged outside the removed schedule condition:

- `service_requests.scheduled_at`, `create_service_request`, booking date/time presentation, rate-estimate input validation, and notification scheduling.
- Worker `is_available`, `worker_presence`, service origin, service radius, live dispatch, radius diagnostics, and online matching.
- Worker approval, skills, rates, account-role separation, booking acceptance authorization, address privacy, payments, reviews, chat, and account deletion.

Each replacement function will be copied from the current active definition and changed only at the schedule-related branches. The migration will use a transaction and `DROP TABLE public.worker_availability` without `CASCADE`; any unexpected dependency must abort the migration. Existing non-schedule database tests will remain in the suite and must pass without weakening their assertions.

### Tests and generated contracts

- Update `supabase/tests/database/approved_worker_matching_fix.test.sql` to use the new RPC signature, remove row persistence/clearing assertions, assert that the table is absent, and verify a worker can save and match without a weekly schedule.
- Remove obsolete schedule-row setup from `supabase/tests/database/booking_address_privacy.test.sql` and `supabase/tests/database/trust_pricing_and_reoffer.test.sql`.
- Update `tests/mobile-e2e/worker-service-setup.spec.ts` and `tests/mobile-e2e/worker-industry-rates.spec.ts` fixtures to omit `scheduleReady`; preserve the existing worker setup and industry/rate assertions, including the absence of the deleted readiness row where the setup screen is covered.
- Update `packages/domain/src/domain.test.ts` to verify matching does not require `scheduleFit`.
- Regenerate `packages/supabase/src/database.generated.ts` with the repository’s `pnpm db:types` command after the migration is applied; do not edit generated output manually.
- Update FR-11 in `REQUIREMENTS.md` and `requirements/catalog.json` to describe online availability and service-area matching without a worker preferred schedule. Customer scheduling requirements remain unchanged.

## Error handling and data safety

The mobile service will continue to surface existing RPC errors and will not introduce a fallback schedule. Removing the table intentionally deletes persisted weekly-schedule rows; production application requires a current database backup and confirmation that the forward migration is being applied to the expected hosted migration history. There is no automatic down migration because restoration would require recreating the table and functions from a backup or a separately reviewed forward migration.

The migration will be validated locally before any hosted application. A failure caused by an untraced dependency must stop the migration rather than use `CASCADE` or weaken authorization.

Before applying the migration to a hosted database, take or verify a current backup and confirm that all deployed clients that can call the old six-argument `save_my_worker_matching_setup` RPC have been updated or retired. The repository cannot verify deployed-client versions. If old clients still need support, the hosted migration must wait for a separately approved compatibility rollout because retaining an old schedule-bearing RPC would conflict with the full-delete requirement.

## Validation

Run the repository scripts proportional to the changed surfaces:

- `pnpm db:reset`
- `pnpm db:lint`
- `pnpm test:db`
- `pnpm db:types`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm verify`

After migration and type generation, inspect the generated-type diff and confirm that only the expected schedule relation and RPC argument disappear; unrelated generated tables, functions, enums, and fields must be unchanged. Search active runtime source, generated contracts, and current non-migration SQL while excluding historical migrations, archives, backups, and unrelated customer/notification scheduling. Active runtime code and schema definitions must contain no `worker_availability` object, `WorkerScheduleDay`, `scheduleReady`, `p_schedule` argument, `scheduleFit`, `INVALID_WORKER_SCHEDULE`, `DUPLICATE_WORKER_SCHEDULE_DAY`, or `OUTSIDE_WORKING_HOURS`. The only expected `worker_availability` text is the forward migration’s deliberate drop/assertion coverage. The preserved `scheduled_at` references must remain.

## Out of scope

- Removing `service_requests.scheduled_at` or changing customer appointment scheduling.
- Removing notification queues or campaign scheduling.
- Removing worker online status, worker presence, service origin, service radius, or live dispatch.
- Rewriting applied migrations, archived rollback files, or hosted backup exports.
- Introducing dependencies or refactoring unrelated service boundaries.
