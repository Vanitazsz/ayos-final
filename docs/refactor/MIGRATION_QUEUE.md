# Repository Refactor Migration Queue

Every in-scope tracked file is assigned exactly once. Sub-batches contain no more than 15 files; smaller final groups are retained when dependency cohesion is more important than padding.

## Batch 1: Inventory tooling and documentation

**Risk:** MEDIUM

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** COMPLETE

### Batch 1.1 (15 files)

- `docs/refactor/DATABASE_SCHEMA_RECOMMENDATIONS.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `docs/refactor/DEPENDENCY_MAP.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `docs/refactor/FILE_INVENTORY.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `docs/refactor/FINAL_REFACTOR_REPORT.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `docs/refactor/MIGRATION_QUEUE.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `docs/refactor/REFACTOR_METRICS.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `docs/refactor/TARGET_ARCHITECTURE.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `scripts/refactor/analyze-repository.test.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `scripts/refactor/analyze-repository.ts` — Oversized (>300 lines); 2 unsafe any occurrence(s); 2 TypeScript suppression(s); Refactor in assigned batch while preserving behavior
- `scripts/refactor/architecture-boundaries.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `scripts/refactor/extract-admin-page-controllers.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `scripts/refactor/extract-admin-pages.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `scripts/refactor/extract-mobile-screen-controllers.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `scripts/refactor/extract-route-screens.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `scripts/refactor/extract-screen-logic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 1.2 (3 files)

- `scripts/refactor/extract-screen-styles.ts` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `scripts/refactor/migrate-mobile-api-imports.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `scripts/refactor/split-admin-data.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 2: Configuration and environment

**Risk:** MEDIUM

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** COMPLETE

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

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** COMPLETE

### Batch 3.1 (15 files)

- `apps/mobile/constants/theme.ts` — Known duplicate relationship; Refactor in assigned batch while preserving behavior
- `apps/mobile/features/+not-found/screens/NotFoundScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/account/screens/SettingsLanguageScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/account/screens/TabsProfileScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/auth/screens/AuthCallbackScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/auth/screens/AuthLoginScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/auth/screens/AuthOtpScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/auth/screens/AuthRegisterScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/auth/screens/AuthVerifyIdentityScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/BookingIdScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/OrderScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/PaymentIdScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/PaymentReceivedScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/PaymentScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/PaymentSuccessScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 3.2 (15 files)

- `apps/mobile/features/bookings/screens/ReviewIdScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/TabsBookingsScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/WorkerBookingsScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/discovery/screens/CategoryIdScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/discovery/screens/ProviderIdScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/discovery/screens/TabsHomeScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/index/screens/IndexScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/location/screens/SettingsAddressesScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/location/screens/TrackingIdScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/messaging/screens/ChatIdScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/messaging/screens/MessagesChatScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/messaging/screens/NotificationsScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/navigation/screens/TabsLayoutScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/onboarding/screens/OnboardingScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/AcceptWorkerIdScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 3.3 (15 files)

- `apps/mobile/features/requests/screens/NewRequestAsapScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/NewRequestCreateScreen.styles.ts` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/requests/screens/NewRequestIssueSummaryScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/NewRequestMatchingScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/NewRequestRadiusConfigScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/NewRequestSuccessScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/NewRequestThisWeekScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/NewRequestUrgencyScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/RegisterWorkerScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerBookingRequestIdScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerCancelServiceIdScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerIndexScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerIndustrySkillsScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerProfileScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerReviewsScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 3.4 (5 files)

- `apps/mobile/features/worker/screens/WorkerServiceSetupScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerSettingsScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerTransactionsHistoryScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerVerificationScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerWalletScreen.styles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 4: Shared UI primitives and UI states

**Risk:** LOW

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** COMPLETE

### Batch 4.1 (11 files)

- `apps/mobile/components/AppAutocomplete.tsx` — 1 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/components/AppButton.tsx` — 1 hardcoded color value(s); Known duplicate relationship; Refactor in assigned batch while preserving behavior
- `apps/mobile/components/AppCard.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/AppInput.tsx` — Known duplicate relationship; Refactor in assigned batch while preserving behavior
- `apps/mobile/components/AppSelect.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/AppText.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/inputs/RadiusSlider.d.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/inputs/RadiusSlider.native.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/inputs/RadiusSlider.web.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/layout/EmptyState.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/layout/Screen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 5: Shared types, validation, and errors

**Risk:** LOW

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** COMPLETE

### Batch 5.1 (15 files)

- `apps/mobile/types/ai.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/types/location.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
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

### Batch 5.2 (3 files)

- `packages/domain/src/matching.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/domain/src/payment.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `packages/domain/src/reviews.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 6: Authentication and sessions

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** COMPLETE

### Batch 6.1 (15 files)

- `apps/admin/src/context/AuthContext.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/auth/hooks/useLoginController.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/auth/hooks/useLoginPageController.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/auth/pages/LoginPage.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/auth/pages/LoginPage.view.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/auth.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(auth)/_layout.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(auth)/landing.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(auth)/login.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(auth)/otp.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(auth)/register.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(auth)/sign-in.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(auth)/verify-identity.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/auth/callback.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/docs/auth-flow.md` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 6.2 (15 files)

- `apps/mobile/features/auth/hooks/useAuthCallbackScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/auth/hooks/useAuthLoginScreenController.ts` — 4 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/auth/hooks/useAuthOtpScreenController.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/auth/hooks/useAuthRegisterScreenController.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/auth/hooks/useAuthVerifyIdentityScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/auth/logic/AuthCallbackScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/auth/logic/AuthLoginScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/auth/logic/AuthOtpScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/auth/logic/AuthRegisterScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/auth/logic/AuthVerifyIdentityScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/auth/screens/AuthCallbackScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/auth/screens/AuthCallbackScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/auth/screens/AuthLoginScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/auth/screens/AuthLoginScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/auth/screens/AuthOtpScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 6.3 (15 files)

- `apps/mobile/features/auth/screens/AuthOtpScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/auth/screens/AuthRegisterScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/auth/screens/AuthRegisterScreen.view.tsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/auth/screens/AuthVerifyIdentityScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/auth/screens/AuthVerifyIdentityScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/auth.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/authenticatedFunctions.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/authenticatedFunctions.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/store/useAuthStore.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `backend/src/controllers/auth.controller.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/middleware/auth.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/repositories/auth.repository.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/routes/auth.routes.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/services/auth.service.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/validators/auth.schemas.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval

### Batch 6.4 (15 files)

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
- `supabase/migrations/20260721235500_auth_profile_consistency.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260727140000_google_oauth_provisioning.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730160000_auth_user_delete_cascade.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730230000_harden_auth_account_provisioning.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/tests/database/auth_account_provisioning.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 6.5 (5 files)

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

**Completion status:** COMPLETE

### Batch 7.1 (7 files)

- `apps/mobile/app/(tabs)/_layout.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(worker)/_layout.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(worker)/index.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/+not-found.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/_layout.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/index.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/new-request/_layout.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 8: Request-state consolidation

**Risk:** MEDIUM

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** COMPLETE

### Batch 8.1 (1 files)

- `apps/mobile/store/useRequestStore.ts` — Known duplicate relationship; Refactor in assigned batch while preserving behavior

## Batch 9: Customer account and settings

**Risk:** MEDIUM

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** COMPLETE

### Batch 9.1 (4 files)

- `apps/mobile/app/(tabs)/help-center.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(tabs)/privacy-policy.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(tabs)/profile.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/settings/language.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 10: Discovery and provider profiles

**Risk:** MEDIUM

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** COMPLETE

### Batch 10.1 (3 files)

- `apps/mobile/app/(tabs)/home.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/category/[id].tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/provider/[id].tsx` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 11: Request creation

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** COMPLETE

### Batch 11.1 (10 files)

- `apps/mobile/app/accept-worker/[id].tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/match/[id].tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/new-request/asap.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/new-request/create.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/new-request/issue-summary.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/new-request/matching.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/new-request/radius-config.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/new-request/success.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/new-request/this-week.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/new-request/urgency.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 12: Matching and dispatch

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** COMPLETE

### Batch 12.1 (15 files)

- `apps/mobile/features/requests/hooks/useAcceptWorkerIdScreenController.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/requests/hooks/useNewRequestAsapScreenController.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/requests/hooks/useNewRequestCreateScreenController.ts` — Oversized (>300 lines); 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/requests/hooks/useNewRequestIssueSummaryScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/hooks/useNewRequestMatchingScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/hooks/useNewRequestRadiusConfigScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/hooks/useNewRequestSuccessScreenController.ts` — 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/requests/hooks/useNewRequestThisWeekScreenController.ts` — 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/requests/hooks/useNewRequestUrgencyScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/hooks/useRequestAudioRecorder.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/logic/AcceptWorkerIdScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/logic/NewRequestAsapScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/logic/NewRequestCreateScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/logic/NewRequestIssueSummaryScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/logic/NewRequestMatchingScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 12.2 (15 files)

- `apps/mobile/features/requests/screens/AcceptWorkerIdScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/AcceptWorkerIdScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/NewRequestAsapScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/NewRequestAsapScreen.view.tsx` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/requests/screens/NewRequestCreateScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/NewRequestCreateScreen.view.tsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/requests/screens/NewRequestIssueSummaryScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/NewRequestIssueSummaryScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/NewRequestMatchingScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/NewRequestMatchingScreen.view.tsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/requests/screens/NewRequestRadiusConfigScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/NewRequestRadiusConfigScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/NewRequestSuccessScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/NewRequestSuccessScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/NewRequestThisWeekScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 12.3 (15 files)

- `apps/mobile/features/requests/screens/NewRequestThisWeekScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/NewRequestUrgencyScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/requests/screens/NewRequestUrgencyScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/liveDispatch.test.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/services/liveDispatch.ts` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/mobile/services/requestControl.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/requestControl.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/requestDraft.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/requests.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/workerMatching.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `backend/src/middleware/request-context.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/validators/request.schemas.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `supabase/functions/ai-analyze-request/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/migrations/20260722001200_request_media_ai_location_fixes.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722180000_approved_worker_matching_fix.sql` — None identified by static analysis; Review only; preserve append-only history

### Batch 12.4 (15 files)

- `supabase/migrations/20260723020000_live_worker_dispatch.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723020200_live_dispatch_radius_fallback.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723020400_live_dispatch_service_location_fix.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723020500_dispatch_unique_contract_fix.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723030000_configurable_live_dispatch_radius.sql` — None identified by static analysis; Review only; preserve append-only history
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

### Batch 12.5 (6 files)

- `supabase/tests/database/approved_worker_matching_fix.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/live_dispatch_radius.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/live_dispatch_schema_contract.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/matched_only_messaging.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/tests/database/request_media_ai_location_fixes.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/mobile-e2e/matched-messaging.spec.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 13: Bookings, payments, and reviews

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** COMPLETE

### Batch 13.1 (9 files)

- `apps/mobile/app/(tabs)/bookings.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(worker)/bookings.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/booking/[id].tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/order.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/payment-received.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/payment.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/payment/[id].tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/payment/success.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/review/[id].tsx` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 14: Messaging and notifications

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** COMPLETE

### Batch 14.1 (15 files)

- `apps/admin/src/features/notifications/hooks/useNotificationsPageController.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/notifications/logic/NotificationsPageLogic.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/notifications/pages/NotificationsPage.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/notifications/pages/NotificationsPage.view.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/notifications.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(tabs)/messages.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(worker)/messages.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/chat/[id].tsx` — Known duplicate relationship; Refactor in assigned batch while preserving behavior
- `apps/mobile/app/messages/chat.tsx` — Known duplicate relationship; Refactor in assigned batch while preserving behavior
- `apps/mobile/app/notifications.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/ConversationListScreen.tsx` — Oversized (>300 lines); 4 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/messaging/hooks/useChatIdScreenController.ts` — 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/messaging/hooks/useMessagesChatScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/messaging/hooks/useNotificationsScreenController.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/messaging/logic/ChatIdScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 14.2 (15 files)

- `apps/mobile/features/messaging/logic/MessagesChatScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/messaging/logic/NotificationsScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/messaging/screens/ChatIdScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/messaging/screens/ChatIdScreen.view.tsx` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/messaging/screens/MessagesChatScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/messaging/screens/MessagesChatScreen.view.tsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/messaging/screens/NotificationsScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/messaging/screens/NotificationsScreen.view.tsx` — 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/hooks/useConversationChat.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/chatRealtime.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/chatRealtime.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/notifications.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/functions/ai-translate-message/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/migrations/20260722001000_message_translation_ui.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723050000_chat_rpc_and_grants.sql` — None identified by static analysis; Review only; preserve append-only history

### Batch 14.3 (3 files)

- `supabase/migrations/20260723060000_fix_send_chat_message_rpc.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723070000_consolidate_chat_notifications.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723080000_allow_chat_messages_select.sql` — None identified by static analysis; Review only; preserve append-only history

## Batch 15: Maps, geocoding, and tracking

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** COMPLETE

### Batch 15.1 (15 files)

- `UI_COMPONENT_MAPPING.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/components/ProtectedRoute.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/components/SubdivisionMapPicker.jsx` — 1 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/app/settings/addresses.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/tracking/[id].tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/LocationPicker.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/maps/MapSurface.d.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/maps/MapSurface.native.tsx` — 5 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/components/maps/MapSurface.web.tsx` — 4 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/components/maps/radiusGeometry.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/config/maps.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/location/hooks/useSettingsAddressesScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/location/hooks/useTrackingIdScreenController.ts` — 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/location/logic/SettingsAddressesScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/location/logic/TrackingIdScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 15.2 (15 files)

- `apps/mobile/features/location/screens/SettingsAddressesScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/location/screens/SettingsAddressesScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/location/screens/TrackingIdScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/location/screens/TrackingIdScreen.view.tsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/mobile/services/addresses.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/services/deviceLocation.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/geocoding.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `backend/src/routes/admin.routes.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/routes/catalog.routes.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/routes/domain.routes.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/routes/health.routes.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/routes/index.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/routes/upload.routes.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/routes/user.routes.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/routes/worker.routes.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval

### Batch 15.3 (10 files)

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

**Risk:** MEDIUM

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** COMPLETE

### Batch 16.1 (11 files)

- `apps/mobile/app/(worker)/booking-request/[id].tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(worker)/cancel-service/[id].tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(worker)/industry-skills.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(worker)/profile.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(worker)/reviews.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(worker)/service-setup.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(worker)/settings.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(worker)/transactions-history.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(worker)/verification.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(worker)/wallet.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/register-worker.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 17: Worker operations and wallet

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** COMPLETE

### Batch 17.1 (15 files)

- `apps/admin/src/features/workers/hooks/useWorkersPageController.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/workers/logic/WorkersPageLogic.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/workers/pages/WorkersPage.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/workers/pages/WorkersPage.view.jsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/admin/src/services/workers.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/ProviderCard.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/context/WorkerPresenceContext.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/docs/worker-flow.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/discovery/hooks/useProviderIdScreenController.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/discovery/logic/ProviderIdScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/discovery/screens/ProviderIdScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/discovery/screens/ProviderIdScreen.view.tsx` — 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/navigation/components/WorkerTabsNavigator.tsx` — 1 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/navigation/screens/WorkerLayoutScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/hooks/useRegisterWorkerScreenController.ts` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior

### Batch 17.2 (15 files)

- `apps/mobile/features/worker/hooks/useWorkerCancelServiceIdScreenController.ts` — 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/worker/hooks/useWorkerIndexScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/hooks/useWorkerIndustrySkillsScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/hooks/useWorkerProfileScreenController.ts` — 3 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/worker/hooks/useWorkerServiceSetupScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/hooks/useWorkerSettingsScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/hooks/useWorkerTransactionsHistoryScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/hooks/useWorkerVerificationScreenController.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/worker/logic/RegisterWorkerScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/logic/WorkerCancelServiceIdScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/logic/WorkerIndexScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/logic/WorkerIndustrySkillsScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/logic/WorkerProfileScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/logic/WorkerServiceSetupScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/logic/WorkerTransactionsHistoryScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 17.3 (15 files)

- `apps/mobile/features/worker/logic/WorkerVerificationScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/RegisterWorkerScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/RegisterWorkerScreen.view.tsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/worker/screens/WorkerCancelServiceIdScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerCancelServiceIdScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerIndexScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerIndexScreen.view.tsx` — Oversized (>300 lines); 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/worker/screens/WorkerIndustrySkillsScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerIndustrySkillsScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerProfileScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerProfileScreen.view.tsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/worker/screens/WorkerServiceSetupScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerServiceSetupScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerSettingsScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerSettingsScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 17.4 (15 files)

- `apps/mobile/features/worker/screens/WorkerTransactionsHistoryScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerTransactionsHistoryScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerVerificationScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerVerificationScreen.view.tsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/mobile/lib/workerRegistration.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/lib/workerRegistration.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/workerApplication.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/workerOperations.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/workerSelection.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/workerSelection.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/store/useWorkerBookingStore.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `backend/src/controllers/worker.controller.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `backend/src/services/worker.service.ts` — 6 unsafe any occurrence(s); Trace callers and leave unchanged pending removal approval
- `backend/src/validators/worker.schemas.ts` — None identified by static analysis; Trace callers and leave unchanged pending removal approval
- `supabase/functions/ai-provider-health/index.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 17.5 (15 files)

- `supabase/migrations/20260722000500_industry_skill_taxonomy.sql` — 1 unsafe any occurrence(s); Review only; preserve append-only history
- `supabase/migrations/20260722000600_reconcile_hosted_industry_taxonomy.sql` — 1 unsafe any occurrence(s); Review only; preserve append-only history
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

### Batch 17.6 (4 files)

- `tests/admin-e2e/workers-verification.spec.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/mobile-e2e/worker-industry-rates.spec.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/mobile-e2e/worker-industry-taxonomy.spec.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `tests/mobile-e2e/worker-service-setup.spec.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 18: AI, voice, image, and uploads

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** COMPLETE

### Batch 18.1 (11 files)

- `apps/mobile/components/media/PhotoCaptureModal.tsx` — 2 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/services/ai.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
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

**Completion status:** COMPLETE

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

### Batch 19.2 (9 files)

- `apps/admin/src/context/ToastContext.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/hooks/useAccountDeletion.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/hooks/useActiveSessionCount.js` — None identified by static analysis; Review callers and retain if responsibility is focused
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

**Completion status:** COMPLETE

### Batch 20.1 (15 files)

- `apps/admin/src/pages/admin/Analytics.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/AuditLogs.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Bookings.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Dashboard.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Notifications.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Payments.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Profile.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Reports.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Reviews.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Services.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Settings.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Subdivisions.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Subscriptions.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Support.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Trash.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 20.2 (15 files)

- `apps/admin/src/pages/admin/Users.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/admin/Workers.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/pages/auth/Login.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/accounts.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/adminData.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/adminShared.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/analytics.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/auditLogs.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/bookings.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/catalog.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/dashboard.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/payments.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/profileData.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/realtime.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/reports.js` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 20.3 (7 files)

- `apps/admin/src/services/reviews.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/settings.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/subdivisions.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/subscriptions.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/support.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/trash.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/services/users.js` — None identified by static analysis; Review callers and retain if responsibility is focused

## Batch 21: Edge Functions and queues

**Risk:** HIGH

**Preserved behavior:** Routes, parameters, UI, authentication, authorization, database/API contracts, and storage/realtime semantics.

**Validation:** Focused tests plus the surface-specific typecheck, lint, and build/export commands.

**Rollback:** Revert this batch commit; no destructive database operation is permitted.

**Completion status:** COMPLETE

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

**Completion status:** COMPLETE

### Batch 22.1 (15 files)

- `apps/mobile/features/bookings/logic/routeSummary.test.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
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

### Batch 22.2 (15 files)

- `packages/client/src/web.ts` — Known duplicate relationship; Trace callers and leave unchanged pending removal approval
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

### Batch 22.3 (15 files)

- `scripts/search.mjs` — None identified by static analysis; Review callers and retain if responsibility is focused
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

### Batch 22.4 (15 files)

- `supabase/tests/database/single_role_accounts.test.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
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

### Batch 22.5 (10 files)

- `tests/mobile-e2e/visual-layout.spec.ts-snapshots/mobile-login-desktop-mobile-web-chromium-darwin.png` — None identified by static analysis; Review callers and retain if responsibility is focused
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

**Completion status:** COMPLETE

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

**Completion status:** COMPLETE

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
- `apps/admin/src/features/analytics/hooks/useAnalyticsPageController.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/analytics/logic/AnalyticsPageLogic.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/analytics/pages/AnalyticsPage.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/analytics/pages/AnalyticsPage.view.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/audit-logs/hooks/useAuditLogsPageController.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/audit-logs/logic/AuditLogsPageLogic.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/audit-logs/pages/AuditLogsPage.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/audit-logs/pages/AuditLogsPage.view.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/bookings/hooks/useBookingsPageController.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 24.3 (15 files)

- `apps/admin/src/features/bookings/logic/BookingsPageLogic.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/bookings/pages/BookingsPage.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/bookings/pages/BookingsPage.view.jsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/admin/src/features/dashboard/hooks/useDashboardPageController.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/dashboard/logic/DashboardPageLogic.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/dashboard/pages/DashboardPage.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/dashboard/pages/DashboardPage.view.jsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/admin/src/features/payments/hooks/usePaymentsPageController.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/payments/logic/PaymentsPageLogic.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/payments/pages/PaymentsPage.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/payments/pages/PaymentsPage.view.jsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/admin/src/features/profile/hooks/useProfilePageController.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/profile/logic/ProfilePageLogic.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/profile/pages/ProfilePage.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/profile/pages/ProfilePage.view.jsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior

### Batch 24.4 (15 files)

- `apps/admin/src/features/reports/hooks/useReportsPageController.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/reports/logic/ReportsPageLogic.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/reports/pages/ReportsPage.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/reports/pages/ReportsPage.view.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/reviews/hooks/useReviewsPageController.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/reviews/logic/ReviewsPageLogic.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/reviews/pages/ReviewsPage.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/reviews/pages/ReviewsPage.view.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/services/hooks/useServicesPageController.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/services/logic/ServicesPageLogic.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/services/pages/ServicesPage.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/services/pages/ServicesPage.view.jsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/admin/src/features/settings/hooks/useSettingsPageController.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/settings/logic/SettingsPageLogic.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/settings/pages/SettingsPage.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 24.5 (15 files)

- `apps/admin/src/features/settings/pages/SettingsPage.view.jsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/admin/src/features/subdivisions/hooks/useSubdivisionsPageController.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/subdivisions/logic/SubdivisionsPageLogic.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/subdivisions/pages/SubdivisionsPage.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/subdivisions/pages/SubdivisionsPage.view.jsx` — 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/admin/src/features/subscriptions/hooks/useSubscriptionsPageController.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/subscriptions/logic/SubscriptionsPageLogic.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/subscriptions/pages/SubscriptionsPage.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/subscriptions/pages/SubscriptionsPage.view.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/support/hooks/useSupportPageController.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/support/logic/SupportPageLogic.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/support/pages/SupportPage.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/support/pages/SupportPage.view.jsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/admin/src/features/trash/hooks/useTrashPageController.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/trash/logic/TrashPageLogic.js` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 24.6 (15 files)

- `apps/admin/src/features/trash/pages/TrashPage.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/trash/pages/TrashPage.view.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/users/hooks/useUsersPageController.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/users/logic/UsersPageLogic.js` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/users/pages/UsersPage.jsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/admin/src/features/users/pages/UsersPage.view.jsx` — Oversized (>300 lines); 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/admin/src/index.css` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/README.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/(tabs)/create.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/onboarding.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/app/screens/Onboarding/A-yos.png` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/assets/images/favicon.png` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/assets/images/icon.png` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/AccordionSection.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/Avatar.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 24.7 (15 files)

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

### Batch 24.8 (15 files)

- `apps/mobile/components/ServiceCategoryCard.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/Skeleton.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/StatCard.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/StatusTimeline.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/ThreeDotMenu.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/booking/BookingMap.tsx` — 2 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/components/booking/BookingStepIndicator.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/booking/CompletedSummary.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/booking/JobTimer.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/booking/RouteSummaryCard.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/components/content/PublishedContentPage.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/docs/google-sign-in-setup.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/docs/user-flow.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/+not-found/hooks/useNotFoundScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/+not-found/screens/NotFoundScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 24.9 (15 files)

- `apps/mobile/features/+not-found/screens/NotFoundScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/account/hooks/useSettingsLanguageScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/account/hooks/useTabsProfileScreenController.ts` — 3 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/account/logic/SettingsLanguageScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/account/logic/TabsProfileScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/account/screens/SettingsLanguageScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/account/screens/SettingsLanguageScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/account/screens/TabsProfileScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/account/screens/TabsProfileScreen.view.tsx` — Oversized (>300 lines); 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/bookings/hooks/useBookingIdScreenController.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/bookings/hooks/useBookingRoute.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/hooks/useOrderScreenController.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/bookings/hooks/usePaymentIdScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/hooks/usePaymentReceivedScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/hooks/usePaymentScreenController.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior

### Batch 24.10 (15 files)

- `apps/mobile/features/bookings/hooks/usePaymentSuccessScreenController.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/bookings/hooks/useReviewIdScreenController.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/bookings/hooks/useRouteSummary.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/hooks/useTabsBookingsScreenController.ts` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/bookings/hooks/useWorkerBookingsScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/logic/BookingIdScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/logic/OrderScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/logic/PaymentIdScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/logic/PaymentScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/logic/PaymentSuccessScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/logic/ReviewIdScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/logic/TabsBookingsScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/logic/WorkerBookingsScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/logic/routeSummary.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/BookingIdScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 24.11 (15 files)

- `apps/mobile/features/bookings/screens/BookingIdScreen.view.tsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/bookings/screens/OrderScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/OrderScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/PaymentIdScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/PaymentIdScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/PaymentReceivedScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/PaymentReceivedScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/PaymentScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/PaymentScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/PaymentSuccessScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/PaymentSuccessScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/ReviewIdScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/ReviewIdScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/TabsBookingsScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/TabsBookingsScreen.view.tsx` — 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior

### Batch 24.12 (15 files)

- `apps/mobile/features/bookings/screens/WorkerBookingsScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/bookings/screens/WorkerBookingsScreen.view.tsx` — Oversized (>300 lines); 2 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/discovery/hooks/useCategoryIdScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/discovery/hooks/useTabsHomeScreenController.ts` — 4 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/discovery/logic/CategoryIdScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/discovery/logic/TabsHomeScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/discovery/screens/CategoryIdScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/discovery/screens/CategoryIdScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/discovery/screens/TabsHomeScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/discovery/screens/TabsHomeScreen.view.tsx` — Oversized (>300 lines); 1 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/index/hooks/useIndexController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/index/screens/IndexScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/navigation/components/CustomerTabsNavigator.tsx` — 1 hardcoded color value(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/navigation/hooks/useCreateTabAnimation.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/navigation/hooks/useLayoutScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 24.13 (15 files)

- `apps/mobile/features/navigation/hooks/useTabAccess.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/navigation/logic/LayoutScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/navigation/screens/LayoutScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/navigation/screens/LayoutScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/navigation/screens/TabsLayoutScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/onboarding/hooks/useOnboardingScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/onboarding/screens/OnboardingScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/onboarding/screens/OnboardingScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/hooks/useWorkerBookingRequestIdScreenController.ts` — Oversized (>300 lines); 8 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/worker/hooks/useWorkerReviewsScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/hooks/useWorkerWalletScreenController.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/logic/WorkerBookingRequestIdScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/logic/WorkerReviewsScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/logic/WorkerWalletScreenLogic.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerBookingRequestIdScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 24.14 (15 files)

- `apps/mobile/features/worker/screens/WorkerBookingRequestIdScreen.view.tsx` — Oversized (>300 lines); 3 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/features/worker/screens/WorkerReviewsScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerReviewsScreen.view.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerWalletScreen.tsx` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/features/worker/screens/WorkerWalletScreen.view.tsx` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `apps/mobile/hooks/useFrameworkReady.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/lib/crypto.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/lib/supabase.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/repositories/accounts.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/scripts/check-no-production-mocks.mjs` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/aiAnalysisSubscription.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/api.ts` — Known duplicate relationship; Refactor in assigned batch while preserving behavior
- `apps/mobile/services/apiCore.ts` — Oversized (>300 lines); 67 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
- `apps/mobile/services/bookingTabs.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/bookings.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 24.15 (15 files)

- `apps/mobile/services/catalog.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/catalogSearch.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/contentPages.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/customerProfiles.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/customerVerification.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/deviceImages.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/functionErrors.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/localization.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/messaging.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/payments.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/profile.ts` — Known duplicate relationship; Refactor in assigned batch while preserving behavior
- `apps/mobile/services/realtime.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/reviewRatings.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/reviews.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/routing.ts` — None identified by static analysis; Review callers and retain if responsibility is focused

### Batch 24.16 (15 files)

- `apps/mobile/services/subdivisions.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/support.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/uploads.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/services/wallet.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/utils/arrivalTransition.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `apps/mobile/utils/bookingPayment.ts` — None identified by static analysis; Review callers and retain if responsibility is focused
- `dbsql.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `dbtables.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `docs/superpowers/plans/2026-08-02-react-native-architecture-audit-controlled-refactor.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `docs/superpowers/specs/2026-08-02-react-native-architecture-audit-controlled-refactor-design.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `infra/admin-nginx.conf` — None identified by static analysis; Review callers and retain if responsibility is focused
- `infra/admin.Dockerfile` — None identified by static analysis; Review callers and retain if responsibility is focused
- `mvp.md` — None identified by static analysis; Review callers and retain if responsibility is focused
- `requirements/catalog.json` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/migrations/20260714041334_remote_history_placeholder.sql` — None identified by static analysis; Review only; preserve append-only history

### Batch 24.17 (15 files)

- `supabase/migrations/20260714041402_remote_history_placeholder.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260714041514_remote_history_placeholder.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260714041603_remote_history_placeholder.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260714055716_remote_history_placeholder.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260714071602_remote_history_placeholder.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260715021238_remote_history_placeholder.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260720000100_platform.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260720000200_domain_rpcs.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260720000300_security_realtime_jobs.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260720000400_admin_and_queue_rpcs.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260720000500_geospatial_ai.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260720000600_secure_admin_bootstrap.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260720000700_ui_integration_commands.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721000100_paymongo_wallet.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721000200_profile_communication_parity.sql` — None identified by static analysis; Review only; preserve append-only history

### Batch 24.18 (15 files)

- `supabase/migrations/20260721000300_offers_promotions_cancellations.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721000400_admin_operations_parity.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721000500_session_role_switching.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721000600_payment_invariants.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721000700_wallet_topups.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721000800_admin_account_deletion.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721000900_complete_ui_parity.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721001000_complete_backend_integration.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721010000_production_domains.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721011000_admin_operations.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260721012000_client_operations.sql` — 2 unsafe any occurrence(s); Review only; preserve append-only history
- `supabase/migrations/20260721233000_real_profiles_zero_mock_records.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722000100_approved_frontend_compatibility.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722000300_admin_frontend_commands.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722000400_single_role_accounts.sql` — None identified by static analysis; Review only; preserve append-only history

### Batch 24.19 (15 files)

- `supabase/migrations/20260722000700_subdivisions.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722000800_customer_verification.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722000900_booking_location_admin.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722001100_platform_fees_subscriptions.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722001400_admin_customer_realtime.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722140000_customer_verification_reconciliation.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722150000_admin_user_actions.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260722171000_admin_hard_delete.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723010000_allow_media_only_ai_jobs.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723020100_live_dispatch_booking_compatibility.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723020300_presence_accuracy_and_skill_bypass.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723020600_browser_presence_grace.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723040000_profile_read_rls_fix.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723040001_provision_account_reconciliation.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723040100_reentrant_admin_account_delete.sql` — None identified by static analysis; Review only; preserve append-only history

### Batch 24.20 (15 files)

- `supabase/migrations/20260723040200_preserve_account_business_records.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723040300_safe_admin_account_delete.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723040400_profile_read_rls_fix.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723090000_ensure_booking_party_rls.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723110000_conversation_booking_rls_reconciliation.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723120000_customer_support_legal_content.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723120001_live_dispatch_booking_reconciliation.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723120002_remote_placeholder.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723130000_flexible_booking_transitions.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723140000_grant_bookings_update.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260723150000_realtime_bookings_and_terms_seed.sql` — 1 unsafe any occurrence(s); Review only; preserve append-only history
- `supabase/migrations/20260723180000_booking_progress_realtime.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260724000000_auto_publish_reviews.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260727120000_booking_lifecycle_hardening.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260727130000_trust_pricing_and_reoffer.sql` — None identified by static analysis; Review only; preserve append-only history

### Batch 24.21 (15 files)

- `supabase/migrations/20260727150000_booking_address_privacy.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260727160000_hosted_core_schema_reconciliation.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260727170000_worker_wallet_balance_compatibility.sql` — 1 unsafe any occurrence(s); Review only; preserve append-only history
- `supabase/migrations/20260729100000_remove_job_posting.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730170000_cascade_account_dependents.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730180000_cascade_account_nested_dependents.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730190000_cascade_profile_dependents.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730200000_cascade_all_public_dependents.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730210000_allow_cascade_wallet_cleanup.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730220000_fix_admin_account_delete_rpc.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730230100_restore_wallet_append_only_trigger.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730240000_emergency_restore_restrictive_foreign_keys.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260730250000_safe_hard_account_purge.sql` — 1 unsafe any occurrence(s); Review only; preserve append-only history
- `supabase/migrations/20260731010000_add_pending_booking_confirmation.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations/20260731010100_require_customer_completion_confirmation.sql` — None identified by static analysis; Review only; preserve append-only history

### Batch 24.22 (9 files)

- `supabase/migrations/20260731170000_supabase_usage_optimization.sql` — 2 unsafe any occurrence(s); Review only; preserve append-only history
- `supabase/migrations_archive/incompatible-local-draft-2026-07-21/20260721000100_core_schema.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations_archive/incompatible-local-draft-2026-07-21/20260721000200_security_and_functions.sql` — None identified by static analysis; Review only; preserve append-only history
- `supabase/migrations_archive/incompatible-local-draft-2026-07-21/seed.sql` — 3 unsafe any occurrence(s); Review only; preserve append-only history
- `supabase/seed.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/sql-editor-account-deletion.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/sql-editor-admin-bootstrap-fix.sql` — None identified by static analysis; Review callers and retain if responsibility is focused
- `supabase/sql-editor-complete-ui-parity.sql` — Oversized (>300 lines); Refactor in assigned batch while preserving behavior
- `supabase/sql-editor-install.sql` — Oversized (>300 lines); 3 unsafe any occurrence(s); Refactor in assigned batch while preserving behavior
