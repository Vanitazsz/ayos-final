# Repository Refactor Migration Queue

Every in-scope tracked file is assigned exactly once. Sub-batches contain no more than 15 files; smaller final groups are retained when dependency cohesion is more important than padding.

## Batch 1: Inventory tooling and documentation

**Risk:** MEDIUM

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 1.1 (9 files)

- `docs/refactor/DATABASE_SCHEMA_RECOMMENDATIONS.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `docs/refactor/DEPENDENCY_MAP.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `docs/refactor/FILE_INVENTORY.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `docs/refactor/FINAL_REFACTOR_REPORT.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `docs/refactor/MIGRATION_QUEUE.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `docs/refactor/REFACTOR_METRICS.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `docs/refactor/TARGET_ARCHITECTURE.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `scripts/refactor/analyze-repository.test.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `scripts/refactor/analyze-repository.ts` — Oversized (>300 lines); 2 unsafe any occurrence(s); 2 TypeScript suppression(s); Refactor in assigned batch while preserving behavior

## Batch 2: Configuration and environment

**Risk:** MEDIUM

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 2.1 (15 files)

- `.env.example` — None identified by static analysis; Review callers and retain if responsibility is focused
- `.gitignore` — None identified by static analysis; Review callers and retain if responsibility is focused
- `.prettierrc.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/.env.example` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/.gitignore` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/.oxlintrc.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/package.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/vite.config.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/.env.example` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/.gitignore` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/.prettierrc` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/eslint.config.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/package.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/tsconfig.json` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 2.2 (15 files)

- `apps/mobile/vercel.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/vitest.config.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `backend/.env.example` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/.gitignore` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/Dockerfile` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/docker-compose.yml` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/eslint.config.js` — 1 unsafe any occurrence(s); Trace callers and leave unchanged pending removal approval
- `backend/package.json` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/pnpm-workspace.yaml` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/prisma.config.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/tsconfig.build.json` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/tsconfig.json` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/vitest.config.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `eslint.config.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `eslint.config.mjs` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 2.3 (15 files)

- `package.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/client/package.json` — Known duplicate relationship; Trace callers and leave unchanged pending removal approval
- `packages/config/package.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/config/tsconfig.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/contracts/package.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/contracts/tsconfig.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/domain/package.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/domain/tsconfig.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/observability/package.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/observability/tsconfig.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/supabase/package.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/supabase/tsconfig.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/test-utils/package.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/test-utils/tsconfig.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `playwright.config.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 2.4 (7 files)

- `pnpm-workspace.yaml` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/config.toml` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tsconfig.base.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tsconfig.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `turbo.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `vercel.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `vitest.config.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 3: Theme and style boundaries

**Risk:** LOW

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 3.1 (1 files)

- `apps/mobile/constants/theme.ts` — Known duplicate relationship; Refactor in assigned batch while preserving behavior

## Batch 4: Shared UI primitives and UI states

**Risk:** LOW

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 4.1 (13 files)

- `apps/mobile/components/AppAutocomplete.tsx` — 1 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/components/AppButton.tsx` — 1 hardcoded color value(s); 1 unsafe any occurrence(s); Known duplicate relationship; Refactor in assigned batch while preserving behavior
- `apps/mobile/components/AppCard.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/AppInput.tsx` — Known duplicate relationship; Refactor in assigned batch while preserving behavior
- `apps/mobile/components/AppSelect.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/AppText.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/buttons/Button.tsx` — 2 unsafe any occurrence(s); Known duplicate relationship; Refactor in assigned batch while preserving behavior
- `apps/mobile/components/inputs/RadiusSlider.d.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/inputs/RadiusSlider.native.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/inputs/RadiusSlider.web.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/inputs/TextInput.tsx` — Known duplicate relationship; Refactor in assigned batch while preserving behavior
- `apps/mobile/components/layout/EmptyState.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/layout/Screen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 5: Shared types, validation, and errors

**Risk:** LOW

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 5.1 (15 files)

- `apps/mobile/types/ai.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `backend/src/types/express.d.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/types/security.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `packages/contracts/src/ai.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/contracts/src/enums.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/contracts/src/errors.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/contracts/src/events.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/contracts/src/geo.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/contracts/src/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/contracts/src/schemas.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/contracts/src/schemas.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/domain/src/booking.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/domain/src/domain.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/domain/src/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/domain/src/matching.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 5.2 (2 files)

- `packages/domain/src/payment.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/domain/src/reviews.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 6: Authentication and sessions

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 6.1 (15 files)

- `apps/admin/src/context/AuthContext.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(auth)/_layout.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(auth)/landing.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(auth)/login.tsx` — Oversized (>300 lines); Route owns presentation styles; 21 hardcoded color value(s); 4 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/(auth)/otp.tsx` — Route owns presentation styles; 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/(auth)/register.tsx` — Oversized (>300 lines); Route owns presentation styles; 4 hardcoded color value(s); 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/(auth)/sign-in.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(auth)/verify-identity.tsx` — Route owns presentation styles; Refactor in assigned batch while preserving behavior
- `apps/mobile/app/auth/callback.tsx` — Raw database access in route; Route owns presentation styles; Refactor in assigned batch while preserving behavior
- `apps/mobile/docs/auth-flow.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/auth.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/authenticatedFunctions.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/authenticatedFunctions.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/store/useAuthStore.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `backend/src/controllers/auth.controller.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval

### Batch 6.2 (15 files)

- `backend/src/middleware/auth.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/repositories/auth.repository.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/routes/auth.routes.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/services/auth.service.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/validators/auth.schemas.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `hosted-backups/qsurouiyvisykjkgjqmz/2026-07-22-auth-cutover/data.sql` — None identified by static analysis; Inspect generator/source; do not edit manually
- `hosted-backups/qsurouiyvisykjkgjqmz/2026-07-22-auth-cutover/functions.json` — None identified by static analysis; Inspect generator/source; do not edit manually
- `hosted-backups/qsurouiyvisykjkgjqmz/2026-07-22-auth-cutover/migrations.json` — None identified by static analysis; Inspect generator/source; do not edit manually
- `hosted-backups/qsurouiyvisykjkgjqmz/2026-07-22-auth-cutover/roles.sql` — None identified by static analysis; Inspect generator/source; do not edit manually
- `hosted-backups/qsurouiyvisykjkgjqmz/2026-07-22-auth-cutover/schema.sql` — None identified by static analysis; Inspect generator/source; do not edit manually
- `hosted-backups/qsurouiyvisykjkgjqmz/2026-07-22-auth-cutover/secret-names-and-digests.json` — None identified by static analysis; Inspect generator/source; do not edit manually
- `packages/client/src/auth.ts` — Known duplicate relationship; Trace callers and leave unchanged pending removal approval
- `supabase/functions/_shared/auth.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/record-auth-session/index.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/record-auth-session/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 6.3 (10 files)

- `supabase/migrations/20260721235500_auth_profile_consistency.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260727140000_google_oauth_provisioning.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730160000_auth_user_delete_cascade.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730230000_harden_auth_account_provisioning.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/tests/database/auth_account_provisioning.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/google_oauth_provisioning.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/admin-e2e/authenticated-admin.spec.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/admin-e2e/authenticated-admin.spec.ts-snapshots/admin-dashboard-desktop-admin-chromium-darwin.png` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/admin-e2e/authenticated-admin.spec.ts-snapshots/admin-dashboard-mobile-drawer-admin-chromium-darwin.png` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/admin-e2e/public-auth.spec.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 7: Navigation contracts and route infrastructure

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 7.1 (7 files)

- `apps/mobile/app/(tabs)/_layout.tsx` — Route owns presentation styles; 3 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/(worker)/_layout.tsx` — 1 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/(worker)/index.tsx` — Oversized (>300 lines); Route owns presentation styles; 3 hardcoded color value(s); 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/+not-found.tsx` — Route owns presentation styles; Refactor in assigned batch while preserving behavior
- `apps/mobile/app/_layout.tsx` — Raw database access in route; 4 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/index.tsx` — Route owns presentation styles; Refactor in assigned batch while preserving behavior
- `apps/mobile/app/new-request/_layout.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 8: Request-state consolidation

**Risk:** MEDIUM

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 8.1 (2 files)

- `apps/mobile/context/RequestContext.tsx` — Known duplicate relationship; Refactor in assigned batch while preserving behavior
- `apps/mobile/store/useRequestStore.ts` — 2 unsafe any occurrence(s); Known duplicate relationship; Refactor in assigned batch while preserving behavior

## Batch 9: Customer account and settings

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 9.1 (4 files)

- `apps/mobile/app/(tabs)/help-center.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(tabs)/privacy-policy.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(tabs)/profile.tsx` — Oversized (>300 lines); Raw database access in route; Route owns presentation styles; 4 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/settings/language.tsx` — Route owns presentation styles; Refactor in assigned batch while preserving behavior

## Batch 10: Discovery and provider profiles

**Risk:** MEDIUM

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 10.1 (3 files)

- `apps/mobile/app/(tabs)/home.tsx` — Oversized (>300 lines); Route owns presentation styles; 5 hardcoded color value(s); 5 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/category/[id].tsx` — Route owns presentation styles; Refactor in assigned batch while preserving behavior
- `apps/mobile/app/provider/[id].tsx` — Oversized (>300 lines); Route owns presentation styles; 3 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior

## Batch 11: Request creation

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 11.1 (10 files)

- `apps/mobile/app/accept-worker/[id].tsx` — Route owns presentation styles; 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/match/[id].tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/new-request/asap.tsx` — Route owns presentation styles; 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/new-request/create.tsx` — Oversized (>300 lines); Raw database access in route; Route owns presentation styles; 1 hardcoded color value(s); 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/new-request/issue-summary.tsx` — Oversized (>300 lines); Raw database access in route; Route owns presentation styles; 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/new-request/matching.tsx` — Oversized (>300 lines); Route owns presentation styles; 1 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/new-request/radius-config.tsx` — Route owns presentation styles; 2 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/new-request/success.tsx` — Route owns presentation styles; 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/new-request/this-week.tsx` — Route owns presentation styles; 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/new-request/urgency.tsx` — Route owns presentation styles; 1 hardcoded color value(s); 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior

## Batch 12: Matching and dispatch

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 12.1 (15 files)

- `apps/mobile/services/liveDispatch.test.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/services/liveDispatch.ts` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/mobile/services/requestControl.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/requestControl.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/workerMatching.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `backend/src/middleware/request-context.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/validators/request.schemas.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `supabase/functions/ai-analyze-request/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/migrations/20260722001200_request_media_ai_location_fixes.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722180000_approved_worker_matching_fix.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723020000_live_worker_dispatch.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723020200_live_dispatch_radius_fallback.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723020400_live_dispatch_service_location_fix.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723020500_dispatch_unique_contract_fix.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723030000_configurable_live_dispatch_radius.sql` — None identified by static analysis; Review only; preserve append-only history

### Batch 12.2 (15 files)

- `supabase/migrations/20260723030001_hosted_dispatch_history_reconciliation.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723030100_restore_start_live_dispatch_rpc.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723030200_hosted_dispatch_history_reconciliation.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723100000_live_dispatch_presence_reconciliation.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260729110000_matched_only_realtime_messaging.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260729120000_single_match_conversations.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730110000_worker_dispatch_service_rates.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730120000_worker_rate_matching_readiness.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260731030000_resilient_matching_configuration.sql` — 1 unsafe any occurrence(s); Review only; preserve append-only history
- `supabase/migrations_archive/manual-rollbacks/20260731030000_resilient_matching_configuration_REVERT.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/tests/database/approved_worker_matching_fix.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/live_dispatch_radius.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/live_dispatch_schema_contract.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/matched_only_messaging.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/request_media_ai_location_fixes.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 12.3 (1 files)

- `tests/mobile-e2e/matched-messaging.spec.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 13: Bookings, payments, and reviews

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 13.1 (9 files)

- `apps/mobile/app/(tabs)/bookings.tsx` — Route owns presentation styles; 21 hardcoded color value(s); 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/(worker)/bookings.tsx` — Oversized (>300 lines); Route owns presentation styles; 1 hardcoded color value(s); 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/booking/[id].tsx` — Oversized (>300 lines); Raw database access in route; Route owns presentation styles; 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/order.tsx` — Route owns presentation styles; 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/payment-received.tsx` — Route owns presentation styles; Refactor in assigned batch while preserving behavior
- `apps/mobile/app/payment.tsx` — Oversized (>300 lines); Route owns presentation styles; 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/payment/[id].tsx` — Oversized (>300 lines); Route owns presentation styles; 2 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/payment/success.tsx` — Route owns presentation styles; 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/review/[id].tsx` — Oversized (>300 lines); Raw database access in route; Direct external/API invocation in presentation; Route owns presentation styles; 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior

## Batch 14: Messaging and notifications

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 14.1 (15 files)

- `apps/mobile/app/(tabs)/messages.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(worker)/messages.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/chat/[id].tsx` — Route owns presentation styles; 3 unsafe any occurrence(s); Known duplicate relationship; Refactor in assigned batch while preserving behavior
- `apps/mobile/app/messages/chat.tsx` — Oversized (>300 lines); Route owns presentation styles; Known duplicate relationship; Refactor in assigned batch while preserving behavior
- `apps/mobile/app/notifications.tsx` — Route owns presentation styles; 3 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/components/ConversationListScreen.tsx` — Oversized (>300 lines); 4 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/hooks/useConversationChat.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/chatRealtime.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/chatRealtime.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/ai-translate-message/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/migrations/20260722001000_message_translation_ui.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723050000_chat_rpc_and_grants.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723060000_fix_send_chat_message_rpc.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723070000_consolidate_chat_notifications.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723080000_allow_chat_messages_select.sql` — None identified by static analysis; Review only; preserve append-only history

## Batch 15: Maps, geocoding, and tracking

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 15.1 (15 files)

- `UI_COMPONENT_MAPPING.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/components/ProtectedRoute.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/components/SubdivisionMapPicker.jsx` — 1 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/settings/addresses.tsx` — Oversized (>300 lines); Route owns presentation styles; Refactor in assigned batch while preserving behavior
- `apps/mobile/app/tracking/[id].tsx` — Oversized (>300 lines); Raw database access in route; Route owns presentation styles; 4 hardcoded color value(s); 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/components/LocationPicker.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/maps/MapSurface.d.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/maps/MapSurface.native.tsx` — 5 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/components/maps/MapSurface.web.tsx` — 4 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/components/maps/radiusGeometry.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/addresses.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `backend/src/routes/admin.routes.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/routes/catalog.routes.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/routes/domain.routes.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/routes/health.routes.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval

### Batch 15.2 (14 files)

- `backend/src/routes/index.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/routes/upload.routes.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/routes/user.routes.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/routes/worker.routes.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `packages/client/src/maps.ts` — Known duplicate relationship; Trace callers and leave unchanged pending removal approval
- `supabase/functions/_frontend_shared/geocoding.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/_frontend_shared/geocoding.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/_shared/geocoding.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/geocode-reverse/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/geocode-search/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/route/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/migrations/20260722000200_ai_geocoding_frontend_contract.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722001300_saved_address_management.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722140100_add_openrouter_provider.sql` — None identified by static analysis; Review only; preserve append-only history

## Batch 16: Worker onboarding and setup

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 16.1 (11 files)

- `apps/mobile/app/(worker)/booking-request/[id].tsx` — Oversized (>300 lines); Route owns presentation styles; 11 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/(worker)/cancel-service/[id].tsx` — Oversized (>300 lines); Route owns presentation styles; 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/(worker)/industry-skills.tsx` — Oversized (>300 lines); Route owns presentation styles; 2 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/(worker)/profile.tsx` — Oversized (>300 lines); Raw database access in route; Route owns presentation styles; 2 hardcoded color value(s); 3 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/(worker)/reviews.tsx` — Route owns presentation styles; Refactor in assigned batch while preserving behavior
- `apps/mobile/app/(worker)/service-setup.tsx` — Oversized (>300 lines); Route owns presentation styles; Refactor in assigned batch while preserving behavior
- `apps/mobile/app/(worker)/settings.tsx` — Route owns presentation styles; Refactor in assigned batch while preserving behavior
- `apps/mobile/app/(worker)/transactions-history.tsx` — Route owns presentation styles; Refactor in assigned batch while preserving behavior
- `apps/mobile/app/(worker)/verification.tsx` — Oversized (>300 lines); Route owns presentation styles; 20 hardcoded color value(s); 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/(worker)/wallet.tsx` — Oversized (>300 lines); Route owns presentation styles; Refactor in assigned batch while preserving behavior
- `apps/mobile/app/register-worker.tsx` — Oversized (>300 lines); Route owns presentation styles; Refactor in assigned batch while preserving behavior

## Batch 17: Worker operations and wallet

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 17.1 (15 files)

- `apps/mobile/components/ProviderCard.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/context/WorkerPresenceContext.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/docs/worker-flow.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/lib/workerRegistration.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/lib/workerRegistration.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/workerApplication.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/workerSelection.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/workerSelection.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/store/useWorkerBookingStore.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `backend/src/controllers/worker.controller.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/services/worker.service.ts` — 6 unsafe any occurrence(s); Trace callers and leave unchanged pending removal approval
- `backend/src/validators/worker.schemas.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `supabase/functions/ai-provider-health/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/migrations/20260722000500_industry_skill_taxonomy.sql` — 1 unsafe any occurrence(s); Review only; preserve append-only history
- `supabase/migrations/20260722000600_reconcile_hosted_industry_taxonomy.sql` — 1 unsafe any occurrence(s); Review only; preserve append-only history

### Batch 17.2 (15 files)

- `supabase/migrations/20260722130000_worker_profile_dependencies.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722160000_admin_worker_soft_delete.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722170000_worker_registration_phone.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723170000_verified_worker_auto_activation.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260727180000_selected_worker_quote_flow.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260728100000_immediate_worker_acceptance.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260729130000_worker_rate_estimates.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730130000_worker_saved_skills_read_model.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730140000_worker_multiple_industries.sql` — 1 unsafe any occurrence(s); Review only; preserve append-only history
- `supabase/migrations/20260731020000_worker_arrival_proximity.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations_archive/manual-rollbacks/20260731020000_worker_arrival_proximity_REVERT.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/tests/database/industry_skill_taxonomy.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/worker_registration_phone.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/admin-e2e/workers-verification.spec.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/mobile-e2e/worker-industry-rates.spec.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 17.3 (2 files)

- `tests/mobile-e2e/worker-industry-taxonomy.spec.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/mobile-e2e/worker-service-setup.spec.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 18: AI, voice, image, and uploads

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 18.1 (10 files)

- `apps/mobile/components/media/PhotoCaptureModal.tsx` — 2 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `backend/src/controllers/upload.controller.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/middleware/upload.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/services/upload.service.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `supabase/functions/_frontend_shared/ai.ts` — Oversized (>300 lines); 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `supabase/functions/_shared/ai.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `supabase/functions/ai-assist-media/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/ai-process-job/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/ai-recommendation/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/ai-review-insights/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 19: Admin infrastructure

**Risk:** MEDIUM

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 19.1 (15 files)

- `apps/admin/src/App.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/components/CommandPalette.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/components/Navbar.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/components/Sidebar.jsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/admin/src/components/admin/AccountDeleteModal.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/components/ui/Badge.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/components/ui/Button.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/components/ui/Card.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/components/ui/ConfirmModal.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/components/ui/Drawer.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/components/ui/Input.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/components/ui/Modal.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/components/ui/Pagination.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/components/ui/Skeleton.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/components/ui/Table.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 19.2 (7 files)

- `apps/admin/src/context/ToastContext.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/hooks/useDataFetch.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/hooks/usePagination.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/hooks/useRealtime.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/layouts/AdminLayout.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/lib/supabase.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/main.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 20: Admin features and data

**Risk:** MEDIUM

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 20.1 (15 files)

- `apps/admin/src/pages/admin/Analytics.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/AuditLogs.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Bookings.jsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/admin/src/pages/admin/Dashboard.jsx` — Oversized (>300 lines); 13 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `apps/admin/src/pages/admin/Notifications.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Payments.jsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/admin/src/pages/admin/Profile.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Reports.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Reviews.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Services.jsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/admin/src/pages/admin/Settings.jsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/admin/src/pages/admin/Subdivisions.jsx` — 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/admin/src/pages/admin/Subscriptions.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Support.jsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/admin/src/pages/admin/Trash.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 20.2 (5 files)

- `apps/admin/src/pages/admin/Users.jsx` — Oversized (>300 lines); 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/admin/src/pages/admin/Workers.jsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/admin/src/pages/auth/Login.jsx` — Direct external/API invocation in presentation; Refactor in assigned batch while preserving behavior
- `apps/admin/src/services/adminData.js` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/admin/src/services/profileData.js` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 21: Edge Functions and queues

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 21.1 (14 files)

- `supabase/functions/_frontend_shared/generative-json.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/_frontend_shared/http.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/_frontend_shared/supabase.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/_shared/expo-push.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/_shared/generative-json.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/_shared/http.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/_shared/supabase.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/admin-invite-account/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/api/deno.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/api/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/deno.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/queue-consumer/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/report-export/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/report-generate/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 22: Shared packages, scripts, and tests

**Risk:** MEDIUM

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 22.1 (15 files)

- `apps/mobile/services/api.workerBookings.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/arrivalTransition.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/bookingTabs.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/radiusGeometry.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/reviewRatings.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/utils/bookingPayment.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `backend/tests/api.integration.test.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `packages/client/src/api.ts` — Known duplicate relationship; Trace callers and leave unchanged pending removal approval
- `packages/client/src/database.types.ts` — Known duplicate relationship; Inspect generator/source; do not edit manually
- `packages/client/src/env.ts` — Known duplicate relationship; Trace callers and leave unchanged pending removal approval
- `packages/client/src/index.ts` — Known duplicate relationship; Trace callers and leave unchanged pending removal approval
- `packages/client/src/mobile.ts` — Known duplicate relationship; Trace callers and leave unchanged pending removal approval
- `packages/client/src/realtime.ts` — Known duplicate relationship; Trace callers and leave unchanged pending removal approval
- `packages/client/src/storage.ts` — Known duplicate relationship; Trace callers and leave unchanged pending removal approval
- `packages/client/src/web.ts` — Known duplicate relationship; Trace callers and leave unchanged pending removal approval

### Batch 22.2 (15 files)

- `packages/config/src/index.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/config/src/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/observability/src/index.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/observability/src/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/supabase/src/database.generated.ts` — None identified by static analysis; Inspect generator/source; do not edit manually
- `packages/supabase/src/index.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/supabase/src/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/test-utils/src/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `scripts/bootstrap-admin.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `scripts/build-sql-editor-installer.sh` — None identified by static analysis; Review callers and retain if responsibility is focused
- `scripts/check-frontend-backend-contracts.sh` — None identified by static analysis; Review callers and retain if responsibility is focused
- `scripts/check-traceability.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `scripts/ci.sh` — None identified by static analysis; Review callers and retain if responsibility is focused
- `scripts/local-supabase.sh` — None identified by static analysis; Review callers and retain if responsibility is focused
- `scripts/search.mjs` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 22.3 (15 files)

- `scripts/smoke-supabase.mjs` — None identified by static analysis; Review callers and retain if responsibility is focused
- `scripts/verify-stack.sh` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/_shared/expo-push.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/admin_account_deletion.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/admin_bootstrap.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/approved_frontend_compatibility.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/booking_address_privacy.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/complete_backend_integration.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/complete_backend_workflows.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/complete_ui_parity.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/customer_support_legal_content.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/customer_verification_reconciliation.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/pending_completion_confirmation.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/rls_and_invariants.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/single_role_accounts.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 22.4 (15 files)

- `supabase/tests/database/trust_pricing_and_reoffer.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/usage_optimization.test.sql` — 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `tests/admin-e2e/README.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/admin-e2e/users-registration.spec.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/api/contracts.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/api/package.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/api/tsconfig.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/mobile-e2e/README.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/mobile-e2e/customer-bookings-recent.spec.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/mobile-e2e/customer-support-legal.spec.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/mobile-e2e/public-entry.spec.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/mobile-e2e/service-catalog-expansion.spec.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `tests/mobile-e2e/session-expiry.spec.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/mobile-e2e/visual-layout.spec.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/mobile-e2e/visual-layout.spec.ts-snapshots/mobile-login-desktop-mobile-web-chromium-darwin.png` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 22.5 (9 files)

- `tests/mobile-e2e/visual-layout.spec.ts-snapshots/mobile-login-phone-mobile-web-chromium-darwin.png` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/mobile-e2e/visual-layout.spec.ts-snapshots/mobile-login-tablet-mobile-web-chromium-darwin.png` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/mobile-e2e/worker-payment-amount.spec.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/security/package.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/security/security.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/security/tsconfig.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/traceability/catalog.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/traceability/package.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/traceability/tsconfig.json` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 23: Legacy and duplicate review

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 23.1 (15 files)

- `backend/.dockerignore` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/LEGACY.md` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/prisma/migrations/20260721070213_initial/migration.sql` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/prisma/migrations/20260721071602_add_user_settings/migration.sql` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/prisma/migrations/20260722020000_subdivision_matching_booking_origin/migration.sql` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/prisma/migrations/migration_lock.toml` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/prisma/schema.prisma` — Oversized (>300 lines); Trace callers and leave unchanged pending removal approval
- `backend/prisma/seed.ts` — 2 unsafe any occurrence(s); Trace callers and leave unchanged pending removal approval
- `backend/src/app.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/config/database.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/config/env.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/config/logger.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/controllers/admin.controller.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/controllers/catalog.controller.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/controllers/domain.controller.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval

### Batch 23.2 (15 files)

- `backend/src/controllers/request-booking.controller.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/controllers/user.controller.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/middleware/error-handler.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/middleware/origin-guard.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/middleware/validate.ts` — 1 unsafe any occurrence(s); Trace callers and leave unchanged pending removal approval
- `backend/src/routes/request-booking.routes.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/server.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/services/admin.service.ts` — 22 unsafe any occurrence(s); Trace callers and leave unchanged pending removal approval
- `backend/src/services/audit.service.ts` — 1 unsafe any occurrence(s); Trace callers and leave unchanged pending removal approval
- `backend/src/services/catalog.service.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/services/domain.service.ts` — 17 unsafe any occurrence(s); Trace callers and leave unchanged pending removal approval
- `backend/src/services/mail.service.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/services/request-booking.service.ts` — 12 unsafe any occurrence(s); Trace callers and leave unchanged pending removal approval
- `backend/src/services/user.service.ts` — 2 unsafe any occurrence(s); Trace callers and leave unchanged pending removal approval
- `backend/src/utils/errors.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval

### Batch 23.3 (10 files)

- `backend/src/utils/identifiers.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/utils/pagination.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/utils/response.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/utils/security.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/utils/tokens.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/validators/admin.schemas.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/validators/catalog.schemas.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/validators/domain.schemas.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/validators/user.schemas.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/uploads/.gitkeep` — None identified by static analysis; Trace callers and leave unchanged pending removal approval

## Batch 24: Final cleanup and validation

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** PENDING

### Batch 24.1 (15 files)

- `.github/workflows/ci.yml` — None identified by static analysis; Review callers and retain if responsibility is focused
- `.prettierignore` — None identified by static analysis; Review callers and retain if responsibility is focused
- `AI_GUARDRAILS.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `API_INTEGRATION_MATRIX.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `API_SPECIFICATION.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `CHANGE_LOG.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `DATABASE_DESIGN.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `PROJECT_INSPECTION.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `PROJECT_OVERVIEW.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `PROJECT_PHASES.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `PROJECT_STRUCTURE.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `README.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `REQUIREMENTS.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `SYSTEM_ARCHITECTURE.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `TESTING_REPORT.md` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 24.2 (15 files)

- `WORKFLOWS.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `agents.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/README.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/index.html` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/public/favicon.svg` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/scripts/check-no-production-mocks.mjs` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/index.css` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/README.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(tabs)/create.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/onboarding.tsx` — Route owns presentation styles; Refactor in assigned batch while preserving behavior
- `apps/mobile/app/screens/Onboarding/A-yos.png` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/assets/images/favicon.png` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/assets/images/icon.png` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/AccordionSection.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/Avatar.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 24.3 (15 files)

- `apps/mobile/components/Badge.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/CancellationConfirmation.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/Chip.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/ImageUploadCard.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/IncomingJobAlert.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/JobSummary.tsx` — Oversized (>300 lines); 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/components/MenuItemRow.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/Pill.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/PulsingDot.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/QuickActionsGrid.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/RatingStars.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/ReviewsTab.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/ScreenHeader.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/SearchBar.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/SectionHeader.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 24.4 (15 files)

- `apps/mobile/components/ServiceCategoryCard.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/Skeleton.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/StatCard.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/StatusTimeline.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/ThreeDotMenu.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/booking/BookingMap.tsx` — 2 hardcoded color value(s); 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/components/booking/BookingStepIndicator.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/booking/CompletedSummary.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/booking/JobTimer.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/booking/RouteSummaryCard.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/content/PublishedContentPage.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/docs/google-sign-in-setup.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/docs/user-flow.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/hooks/useFrameworkReady.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/lib/crypto.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 24.5 (15 files)

- `apps/mobile/lib/supabase.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/scripts/check-no-production-mocks.mjs` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/api.ts` — Oversized (>300 lines); 72 unsafe any occurrence(s); Known duplicate relationship; Refactor in assigned batch while preserving behavior
- `apps/mobile/services/bookingTabs.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/catalogSearch.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/contentPages.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/customerVerification.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/profile.ts` — Known duplicate relationship; Refactor in assigned batch while preserving behavior
- `apps/mobile/services/reviewRatings.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/subdivisions.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/uploads.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/utils/arrivalTransition.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/utils/bookingPayment.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `dbsql.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `dbtables.md` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 24.6 (15 files)

- `docs/superpowers/plans/2026-08-02-react-native-architecture-audit-controlled-refactor.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `docs/superpowers/specs/2026-08-02-react-native-architecture-audit-controlled-refactor-design.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `infra/admin-nginx.conf` — None identified by static analysis; Review callers and retain if responsibility is focused
- `infra/admin.Dockerfile` — None identified by static analysis; Review callers and retain if responsibility is focused
- `mvp.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `requirements/catalog.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/migrations/20260714041334_remote_history_placeholder.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260714041402_remote_history_placeholder.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260714041514_remote_history_placeholder.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260714041603_remote_history_placeholder.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260714055716_remote_history_placeholder.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260714071602_remote_history_placeholder.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260715021238_remote_history_placeholder.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260720000100_platform.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260720000200_domain_rpcs.sql` — None identified by static analysis; Review only; preserve append-only history

### Batch 24.7 (15 files)

- `supabase/migrations/20260720000300_security_realtime_jobs.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260720000400_admin_and_queue_rpcs.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260720000500_geospatial_ai.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260720000600_secure_admin_bootstrap.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260720000700_ui_integration_commands.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721000100_paymongo_wallet.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721000200_profile_communication_parity.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721000300_offers_promotions_cancellations.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721000400_admin_operations_parity.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721000500_session_role_switching.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721000600_payment_invariants.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721000700_wallet_topups.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721000800_admin_account_deletion.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721000900_complete_ui_parity.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721001000_complete_backend_integration.sql` — None identified by static analysis; Review only; preserve append-only history

### Batch 24.8 (15 files)

- `supabase/migrations/20260721010000_production_domains.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721011000_admin_operations.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721012000_client_operations.sql` — 2 unsafe any occurrence(s); Review only; preserve append-only history
- `supabase/migrations/20260721233000_real_profiles_zero_mock_records.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722000100_approved_frontend_compatibility.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722000300_admin_frontend_commands.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722000400_single_role_accounts.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722000700_subdivisions.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722000800_customer_verification.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722000900_booking_location_admin.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722001100_platform_fees_subscriptions.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722001400_admin_customer_realtime.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722140000_customer_verification_reconciliation.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722150000_admin_user_actions.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722171000_admin_hard_delete.sql` — None identified by static analysis; Review only; preserve append-only history

### Batch 24.9 (15 files)

- `supabase/migrations/20260723010000_allow_media_only_ai_jobs.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723020100_live_dispatch_booking_compatibility.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723020300_presence_accuracy_and_skill_bypass.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723020600_browser_presence_grace.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723040000_profile_read_rls_fix.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723040001_provision_account_reconciliation.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723040100_reentrant_admin_account_delete.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723040200_preserve_account_business_records.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723040300_safe_admin_account_delete.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723040400_profile_read_rls_fix.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723090000_ensure_booking_party_rls.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723110000_conversation_booking_rls_reconciliation.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723120000_customer_support_legal_content.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723120001_live_dispatch_booking_reconciliation.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723120002_remote_placeholder.sql` — None identified by static analysis; Review only; preserve append-only history

### Batch 24.10 (15 files)

- `supabase/migrations/20260723130000_flexible_booking_transitions.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723140000_grant_bookings_update.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723150000_realtime_bookings_and_terms_seed.sql` — 1 unsafe any occurrence(s); Review only; preserve append-only history
- `supabase/migrations/20260723180000_booking_progress_realtime.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260724000000_auto_publish_reviews.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260727120000_booking_lifecycle_hardening.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260727130000_trust_pricing_and_reoffer.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260727150000_booking_address_privacy.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260727160000_hosted_core_schema_reconciliation.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260727170000_worker_wallet_balance_compatibility.sql` — 1 unsafe any occurrence(s); Review only; preserve append-only history
- `supabase/migrations/20260729100000_remove_job_posting.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730170000_cascade_account_dependents.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730180000_cascade_account_nested_dependents.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730190000_cascade_profile_dependents.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730200000_cascade_all_public_dependents.sql` — None identified by static analysis; Review only; preserve append-only history

### Batch 24.11 (15 files)

- `supabase/migrations/20260730210000_allow_cascade_wallet_cleanup.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730220000_fix_admin_account_delete_rpc.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730230100_restore_wallet_append_only_trigger.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730240000_emergency_restore_restrictive_foreign_keys.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730250000_safe_hard_account_purge.sql` — 1 unsafe any occurrence(s); Review only; preserve append-only history
- `supabase/migrations/20260731010000_add_pending_booking_confirmation.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260731010100_require_customer_completion_confirmation.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260731170000_supabase_usage_optimization.sql` — 2 unsafe any occurrence(s); Review only; preserve append-only history
- `supabase/migrations_archive/incompatible-local-draft-2026-07-21/20260721000100_core_schema.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations_archive/incompatible-local-draft-2026-07-21/20260721000200_security_and_functions.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations_archive/incompatible-local-draft-2026-07-21/seed.sql` — 3 unsafe any occurrence(s); Review only; preserve append-only history
- `supabase/seed.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/sql-editor-account-deletion.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/sql-editor-admin-bootstrap-fix.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/sql-editor-complete-ui-parity.sql` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior

### Batch 24.12 (1 files)

- `supabase/sql-editor-install.sql` — Oversized (>300 lines); 3 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
