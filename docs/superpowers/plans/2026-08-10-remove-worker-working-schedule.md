# Remove Worker Working Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the worker weekly working-schedule feature from active mobile code, matching logic, database schema, database functions, tests, generated contracts, requirements, and the manual SQL installer while preserving customer appointment scheduling and worker online/presence matching.

**Architecture:** Keep the existing route -> service -> Supabase/RPC boundaries. The mobile service-area flow will send only location, service-area, radius, and online state. One append-only Supabase migration will replace the three schedule-bearing active functions, remove schedule matching from the weighted core, drop public.worker_availability without CASCADE, and leave the already schedule-free booking-acceptance trigger unchanged.

**Tech Stack:** Expo 54 / React Native / TypeScript, Vitest, Playwright, Supabase PostgreSQL/PostGIS, pgTAP, pnpm workspace, generated Supabase TypeScript contracts.

## Global Constraints

- supabase/migrations/ is append-only; do not edit, reorder, delete, squash, or force applied migrations.
- Do not use DROP ... CASCADE; an unexpected live dependency must abort the migration.
- Preserve service_requests.scheduled_at, customer request creation, booking date/time display, rate estimates, notification scheduling, worker online state, worker presence, service origin/radius, live dispatch, authentication, RLS, grants, AAL2, account separation, and unrelated RPC signatures.
- The sole intentional RPC signature change is removing the schedule-bearing argument from save_my_worker_matching_setup.
- Regenerate packages/supabase/src/database.generated.ts with pnpm db:types; never edit generated output manually.
- Use pnpm from the repository root; do not add dependencies or manually edit lockfiles.
- Do not modify historical migrations, supabase/migrations_archive/, or hosted-backups/.
- Do not apply the migration to a hosted database in this task. A current backup and confirmation that deployed clients no longer call the old six-argument RPC are production prerequisites.
- Keep the migration transactional and preserve security-definer settings, explicit search paths, authorization semantics, revokes/grants, and existing error codes.

## File Map

Create:
- supabase/migrations/20260810010000_remove_worker_working_schedule.sql — forward migration replacing schedule-bearing active functions and dropping the live worker schedule table.

Modify:
- packages/domain/src/matching.ts and packages/domain/src/domain.test.ts — remove scheduleFit from the shared scorer and prove schedule-free eligibility.
- apps/mobile/services/workerMatching.ts — remove schedule fields and the p_schedule RPC argument.
- apps/mobile/app/(worker)/service-setup.tsx — remove hidden schedule state, conversion, validation, and readiness row.
- apps/mobile/app/(worker)/profile.tsx — stop forwarding a persisted schedule when toggling online.
- apps/mobile/services/liveDispatch.ts — remove the obsolete OUTSIDE_WORKING_HOURS diagnostic value.
- tests/mobile-e2e/worker-service-setup.spec.ts and tests/mobile-e2e/worker-industry-rates.spec.ts — align readiness fixtures and assert the deleted payload/UI contract.
- supabase/tests/database/approved_worker_matching_fix.test.sql — test the new RPC signature, missing table, schedule-free readiness, and schedule-free matching.
- supabase/tests/database/booking_address_privacy.test.sql and supabase/tests/database/trust_pricing_and_reoffer.test.sql — remove obsolete schedule fixtures.
- supabase/sql-editor-install.sql — stop recreating or querying weekly worker availability while preserving customer and notification scheduling.
- REQUIREMENTS.md and requirements/catalog.json — update FR-11.
- packages/supabase/src/database.generated.ts — regenerate with pnpm db:types after the local migration is applied.

Do not modify:
- Applied migrations, supabase/migrations_archive/**, hosted-backups/**, service_requests.scheduled_at, or notification scheduling.
- private.require_worker_ready_for_booking_acceptance() or its trigger; the current active definition already delegates to the latest schedule-free eligibility function.

---

### Task 1: Establish a clean baseline and remove shared domain schedule scoring

Files:
- Modify: packages/domain/src/domain.test.ts:43-68
- Modify: packages/domain/src/matching.ts:1-60
- Test: packages/domain/src/domain.test.ts

Interfaces:
- Consumes: rankWorkers(workers, categoryId, maximumDistanceKm).
- Produces: MatchableWorker without scheduleFit; WorkerMatch.factors with skill, distance, reputation, and priority only.

- [ ] Step 1: Record the baseline

Run:

~~~bash
git status --short --branch
pnpm --filter @ayos/domain test
pnpm --filter @ayos/domain typecheck
~~~

Expected: no unrelated worktree changes and a recorded baseline for the domain package.

- [ ] Step 2: Change the matching test first

In packages/domain/src/domain.test.ts, rename the matching test to "does not require a weekly schedule for eligibility", remove scheduleFit from both worker fixtures, and change the assertion to:

~~~ts
expect(matches.map((match) => match.workerId)).toEqual([
  'unsuitable-priority',
  'suitable',
]);
~~~

Keep the current approval, online, category, distance, rating, review-count, and priority values. The first worker must become eligible because weekly schedule was its only failing condition.

- [ ] Step 3: Verify the test is red

Run:

~~~bash
pnpm --filter @ayos/domain test -- --run src/domain.test.ts
~~~

Expected: failure because MatchableWorker still requires scheduleFit and rankWorkers still filters on schedule score.

- [ ] Step 4: Remove schedule scoring and gating

In packages/domain/src/matching.ts:
- Delete scheduleFit from MatchableWorker.
- Delete schedule from WorkerMatch.factors.
- Delete the schedule calculation in rankWorkers.
- Delete schedule > 0 from the eligibility expression.
- Calculate eligible scores as skill + distance + reputation + priority.
- Return factors with skill, distance, reputation, and priority only.
- Preserve maximum-distance handling, reputation calculation, priority ordering, and the five-result limit.

- [ ] Step 5: Verify the domain package

~~~bash
pnpm --filter @ayos/domain test
pnpm --filter @ayos/domain typecheck
pnpm --filter @ayos/domain lint
~~~

Expected: PASS.

- [ ] Step 6: Commit

~~~bash
git add packages/domain/src/matching.ts packages/domain/src/domain.test.ts
git commit -m "refactor(domain): remove worker schedule matching"
~~~

### Task 2: Remove the mobile schedule contract and presentation remnants

Files:
- Modify: apps/mobile/services/workerMatching.ts:1-116
- Modify: apps/mobile/app/(worker)/service-setup.tsx:1-430
- Modify: apps/mobile/app/(worker)/profile.tsx:161-180
- Modify: apps/mobile/services/liveDispatch.ts:30-63
- Modify: tests/mobile-e2e/worker-service-setup.spec.ts:14-35,119-139
- Modify: tests/mobile-e2e/worker-industry-rates.spec.ts:90-108
- Test: tests/mobile-e2e/worker-service-setup.spec.ts

Interfaces:
- Consumes: get_my_worker_matching_readiness and save_my_worker_matching_setup.
- Produces: WorkerMatchingReadiness without schedule fields and saveWorkerMatchingSetup({ latitude, longitude, radiusMeters, serviceArea, online }).

- [ ] Step 1: Add failing E2E contract assertions

In tests/mobile-e2e/worker-service-setup.spec.ts:
1. Remove scheduleReady and schedule from initialReadiness.
2. After page.goto('/service-setup'), add:

~~~ts
await expect(page.getByText('Working schedule', { exact: true })).toHaveCount(0);
~~~

3. After the existing savedPayload assertion, add:

~~~ts
expect(savedPayload).not.toHaveProperty('p_schedule');
~~~

4. Remove scheduleReady from every readiness fixture in tests/mobile-e2e/worker-industry-rates.spec.ts.

Run:

~~~bash
pnpm test:e2e -- tests/mobile-e2e/worker-service-setup.spec.ts
~~~

Expected: the new absence/payload assertion fails against the current implementation. Report any unrelated baseline E2E failure separately.

- [ ] Step 2: Remove schedule types and payload fields

In apps/mobile/services/workerMatching.ts:
- Delete WorkerScheduleDay.
- Delete scheduleReady and schedule from WorkerMatchingReadiness.
- Delete schedule from saveWorkerMatchingSetup input.
- Delete p_schedule from the RPC payload.
- Keep existing non-schedule diagnostic reasons and error messages.

The resulting input must be:

~~~ts
export async function saveWorkerMatchingSetup(input: {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  serviceArea: string;
  online: boolean;
})
~~~

- [ ] Step 3: Remove hidden screen state

In apps/mobile/app/(worker)/service-setup.tsx:
- Remove useMemo if it is unused after the change.
- Remove the WorkerScheduleDay import.
- Delete DAYS, ScheduleState, DEFAULT_SCHEDULE, and scheduleFromRows.
- Delete schedule state and setSchedule.
- Delete selectedSchedule and the working-day validation.
- Remove schedule from the save call.
- Remove the Working schedule readiness item.
- Preserve location, service-area, radius, loading, error, save, and online state behavior.

In apps/mobile/app/(worker)/profile.tsx, remove only schedule: matchingReadiness.schedule ?? [] from the online-toggle save call.

In apps/mobile/services/liveDispatch.ts, delete only OUTSIDE_WORKING_HOURS from DispatchDiagnostics.reasonCode. Preserve online, fresh-presence, service-radius, and search-radius reasons.

- [ ] Step 4: Verify mobile behavior

~~~bash
pnpm --dir apps/mobile typecheck
pnpm --dir apps/mobile lint
pnpm --dir apps/mobile test
pnpm test:e2e -- tests/mobile-e2e/worker-service-setup.spec.ts
~~~

Expected: no removed schedule fields remain in TypeScript or lint output; the E2E test sees no Working schedule row and no p_schedule payload field.

- [ ] Step 5: Commit

~~~bash
git add apps/mobile/services/workerMatching.ts "apps/mobile/app/(worker)/service-setup.tsx" "apps/mobile/app/(worker)/profile.tsx" apps/mobile/services/liveDispatch.ts tests/mobile-e2e/worker-service-setup.spec.ts tests/mobile-e2e/worker-industry-rates.spec.ts
git commit -m "refactor(mobile): remove worker schedule contract"
~~~

### Task 3: Add the forward database migration and update pgTAP coverage

Files:
- Create: supabase/migrations/20260810010000_remove_worker_working_schedule.sql
- Modify: supabase/tests/database/approved_worker_matching_fix.test.sql:1-344
- Modify: supabase/tests/database/booking_address_privacy.test.sql:59-71
- Modify: supabase/tests/database/trust_pricing_and_reoffer.test.sql:122-130
- Test: supabase/tests/database/*.test.sql

Interfaces:
- Consumes: current active definitions from 20260803090000_online_ready_remove_worker_hours.sql, 20260723170000_verified_worker_auto_activation.sql, and public.generate_matches_weighted_core(uuid).
- Produces: save_my_worker_matching_setup(numeric, numeric, integer, text, boolean); existing generate_matches(uuid), readiness, diagnostics, dispatch, booking, and admin-online contracts remain available.

- [ ] Step 1: Update DB tests first

In supabase/tests/database/approved_worker_matching_fix.test.sql:
- Change the first has_function argument list to array['numeric','numeric','integer','text','boolean'].
- Remove the JSON schedule argument from every save_my_worker_matching_setup call. Use:

~~~sql
select public.save_my_worker_matching_setup(
  14.28,
  120.88,
  20000,
  'Trece Martires City',
  true
);
~~~

- Remove the schedule row-count assertion and the update public.worker_availability statement.
- Keep the following diagnostic and generate_matches assertions, changing their messages to say matching does not require weekly schedule.
- Remove the empty-schedule call and row-count assertion.
- Add these assertions after the complete setup call:

~~~sql
select is(
  to_regclass('public.worker_availability'),
  null::regclass,
  'worker weekly schedule table is removed'
);
select is(
  public.get_my_worker_matching_readiness()->>'scheduleReady',
  null,
  'worker readiness has no weekly schedule field'
);
select is(
  public.get_my_worker_matching_readiness()->>'schedule',
  null,
  'worker readiness has no schedule payload'
);
~~~

- Keep select plan(24): three schedule-row assertions are removed and the three table/readiness absence assertions above replace them.
- In booking_address_privacy.test.sql and trust_pricing_and_reoffer.test.sql, remove only their insert into public.worker_availability blocks. Keep all request, booking, worker, presence, privacy, pricing, and reoffer data.

- [ ] Step 2: Run the red DB tests

~~~bash
pnpm db:reset
pnpm test:db
~~~

Expected: the changed tests fail against the old schema/signature. Record the exact failure; do not weaken the new assertions.

- [ ] Step 3: Create the transactional migration

Create supabase/migrations/20260810010000_remove_worker_working_schedule.sql with:

~~~sql
BEGIN;

-- Replace schedule-bearing active functions here.

DROP TABLE public.worker_availability;

SELECT pg_notify('pgrst', 'reload schema');
COMMIT;
~~~

Do not use CASCADE. Replace functions and grants before dropping the table.

- [ ] Step 4: Replace the weighted matching core

Create or replace public.generate_matches_weighted_core(uuid) by copying the current active body from 20260721012000_client_operations.sql after the rename performed in 20260722001100_platform_fees_subscriptions.sql.

Remove exactly:
- The EXISTS predicate that reads public.worker_availability for request day/time.
- The default availability weight from the fallback system_settings JSON.
- The 100 * availability term from the weighted score.

Preserve category skill matching, approval, online state, service-origin/radius checks, ratings, completed jobs, response rate, cancellation rate, recommendation priority, ranking, match-candidate writes, request status updates, and no-match queue behavior. Do not alter the public.generate_matches(uuid) wrapper.

- [ ] Step 5: Replace verified-worker activation

Create or replace public.admin_activate_verified_worker(uuid) from 20260723170000_verified_worker_auto_activation.sql, preserving SECURITY DEFINER, SET search_path = public, extensions, AAL2 authorization, account activation, Plumbing skill provisioning, approval status, online flag, radius, and returned profile.

Delete only this block:

~~~sql
insert into public.worker_availability(worker_id, day_of_week, start_time, end_time, timezone)
select p_worker_id, d, '00:00'::time, '23:59'::time, 'Asia/Manila'
from generate_series(0, 6) d
where not exists (
  select 1
  from public.worker_availability a
  where a.worker_id = p_worker_id
    and a.day_of_week = d
);
~~~

Reapply the existing revoke and authenticated grant. Do not modify the historical migration backfill block.

- [ ] Step 6: Replace the setup RPC and drop the table

First remove the old overload:

~~~sql
DROP FUNCTION IF EXISTS public.save_my_worker_matching_setup(
  numeric,
  numeric,
  integer,
  text,
  jsonb,
  boolean
);
~~~

Then create the new signature:

~~~sql
CREATE FUNCTION public.save_my_worker_matching_setup(
  p_latitude numeric,
  p_longitude numeric,
  p_radius_meters integer,
  p_service_area text,
  p_online boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
~~~

Copy the current body from 20260803090000_online_ready_remove_worker_hours.sql. Remove p_schedule, JSON-array validation, duplicate-day validation, delete from public.worker_availability, and the availability insert. Preserve role/status checks, coordinate/radius/service-area validation, approval/skills/service-rate online guard, row lock, profile update, readiness return, and existing error codes.

Revoke and grant the new signature to authenticated exactly as the old signature was authorized. Do not rewrite get_my_worker_matching_readiness, admin_set_worker_availability, or private.require_worker_ready_for_booking_acceptance; the active definitions already preserve online behavior without weekly schedule data.

Then execute:

~~~sql
DROP TABLE public.worker_availability;
~~~

- [ ] Step 7: Replay and run pgTAP

~~~bash
pnpm db:reset
pnpm db:lint
pnpm test:db
~~~

Expected: PASS. Reset must replay the full append-only history and the new migration without undefined-table/function errors. pgTAP must prove the table is absent, the new setup RPC works without schedule input, an online worker still matches, service-radius/live-presence behavior remains, address privacy remains, and unauthorized diagnostics remain protected.

- [ ] Step 8: Commit

~~~bash
git add supabase/migrations/20260810010000_remove_worker_working_schedule.sql supabase/tests/database/approved_worker_matching_fix.test.sql supabase/tests/database/booking_address_privacy.test.sql supabase/tests/database/trust_pricing_and_reoffer.test.sql
git commit -m "feat(db): remove worker weekly schedule"
~~~

### Task 4: Align the manual installer and traceability requirements

Files:
- Modify: supabase/sql-editor-install.sql:107-112,391-443,620-651,1054-1115,3034
- Modify: REQUIREMENTS.md:26-28
- Modify: requirements/catalog.json:40-47
- Test: pnpm contracts:check, pnpm traceability:check

Interfaces:
- Consumes: the active migration contract and existing customer/notification scheduling contracts.
- Produces: an installer and requirements catalog that do not recreate or promise worker weekly schedules.

- [ ] Step 1: Remove only worker-schedule SQL

In supabase/sql-editor-install.sql:
- Remove the worker_availability table definition.
- Remove worker_availability from the table grant/check array.
- Remove the direct grant on worker_availability.
- Remove availability_read and availability_owner_write policies.
- Remove each EXISTS predicate reading worker_availability from the matching functions around lines 440, 1109-1112, and 3034.
- Leave service_requests.scheduled_at, its indexes/validation, notification scheduled_at, scheduled_notifications, cron scheduling, and all other installer objects unchanged.

Run:

~~~bash
rg -n 'worker_availability|Working schedule|preferred schedule|scheduleFit|p_schedule' supabase/sql-editor-install.sql
~~~

Expected: no matches.

- [ ] Step 2: Update FR-11 only

Replace FR-11 in both requirement sources with:

~~~text
The system shall evaluate workers using service category and skills, online availability, subdivision or service-area location and distance, ratings and reviews, and active recommendation-subscription priority without overriding suitability.
~~~

Leave FR-10 and all other requirement IDs unchanged.

- [ ] Step 3: Verify contracts and traceability

~~~bash
pnpm contracts:check
pnpm traceability:check
~~~

Expected: PASS with no unrelated contract changes.

- [ ] Step 4: Commit

~~~bash
git add supabase/sql-editor-install.sql REQUIREMENTS.md requirements/catalog.json
git commit -m "docs: align worker schedule removal contracts"
~~~

### Task 5: Regenerate types and run the full non-regression audit

Files:
- Modify: packages/supabase/src/database.generated.ts only through pnpm db:types
- Test: pnpm db:types, pnpm typecheck, pnpm lint, pnpm test, pnpm test:e2e, pnpm verify

Interfaces:
- Consumes: the migrated local database schema.
- Produces: generated types with only expected schedule changes and repository-wide verification.

- [ ] Step 1: Regenerate types and inspect the diff

~~~bash
pnpm db:types
git diff -- packages/supabase/src/database.generated.ts
~~~

Expected only:
- Remove worker_availability relation and relationship metadata.
- Change save_my_worker_matching_setup.Args to remove p_schedule while retaining p_latitude, p_longitude, p_radius_meters, p_service_area, and optional p_online.
- Keep admin_set_worker_availability, all p_scheduled_at fields, service-request tables, notification tables, auth-related types, and unrelated RPCs unchanged.

If unrelated generated contracts change, stop and investigate the local schema before continuing.

- [ ] Step 2: Run targeted checks

~~~bash
pnpm --filter @ayos/domain test
pnpm --dir apps/mobile typecheck
pnpm --dir apps/mobile lint
pnpm --dir apps/mobile test
pnpm contracts:check
pnpm traceability:check
~~~

Expected: PASS.

- [ ] Step 3: Run the full repository gate

~~~bash
pnpm db:reset
pnpm db:lint
pnpm test:db
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm verify
~~~

Expected: PASS. If a command fails, report:

~~~text
Command
Exact failure
Changed or pre-existing failure
Affected feature
Recommended next action
~~~

Do not claim completion while a change-caused required validation failure remains.

- [ ] Step 4: Audit active references and preserved scheduling

~~~bash
rg -n -i --hidden \
  -g '!node_modules' -g '!dist' -g '!build' -g '!coverage' -g '!*.lock' \
  -g '!supabase/migrations/**' -g '!supabase/migrations_archive/**' -g '!hosted-backups/**' \
  'worker_availability|WorkerScheduleDay|scheduleReady|p_schedule\b|scheduleFit|INVALID_WORKER_SCHEDULE|DUPLICATE_WORKER_SCHEDULE_DAY|OUTSIDE_WORKING_HOURS' \
  apps packages backend supabase/functions supabase/tests tests scripts REQUIREMENTS.md requirements supabase/sql-editor-install.sql
~~~

Expected: no active runtime/schema/installer matches. The pgTAP file will contain the one intentional to_regclass('public.worker_availability') absence assertion; the forward migration is excluded from this search because it contains the deliberate DROP TABLE. Historical migrations/backups are intentionally excluded.

Confirm preserved scheduling remains:

~~~bash
rg -n 'service_requests.*scheduled_at|p_scheduled_at|scheduled_notifications|scheduled_at' apps packages backend supabase/functions supabase/tests tests scripts REQUIREMENTS.md requirements supabase/sql-editor-install.sql
~~~

- [ ] Step 5: Inspect and commit generated types

~~~bash
git diff --check
git status --short
git diff --stat
~~~

Verify every modified file is listed in this plan, no historical migration or backup changed, and no lockfile changed. Then commit generated output:

~~~bash
git add packages/supabase/src/database.generated.ts
git commit -m "chore(supabase): regenerate types after schedule removal"
~~~

### Task 6: Hosted rollout gate and handoff

Files:
- Modify: None
- Test: backup/client rollout verification outside this repository

Interfaces:
- Consumes: the committed migration and deployed mobile version.
- Produces: a safe go/no-go decision for hosted application.

- [ ] Step 1: Confirm prerequisites without changing hosted state

Before applying the migration remotely, verify:
1. A current database backup exists and is recoverable.
2. All deployed clients that can call the old six-argument save_my_worker_matching_setup RPC have been updated or retired.

The repository cannot verify deployed client versions or backup recoverability. If either condition is unconfirmed, do not apply the migration.

- [ ] Step 2: Record the handoff

Report the migration file, commit IDs, exact validation commands/results, generated-type diff summary, preserved contracts, any pre-existing failures, and hosted go/no-go status. Do not claim a hosted database or deployed client was verified unless it was actually observed.
