# Account Creation and Verification Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give customer and worker registration clear duplicate-email/mobile fallbacks and show pending verification status with a 2–3-day processing notice.

**Architecture:** Reuse the existing `workerRegistration.ts` error-normalization helper as the shared boundary for both registration services. Preserve Supabase Auth and existing RPCs as the final authorities, handle the empty-identity duplicate-email response before OTP, and update the existing registration/status screens without adding routes, state stores, migrations, or dependencies.

**Tech Stack:** Expo 54, React Native, TypeScript, Supabase Auth/RPC, Vitest, Playwright.

## Global Constraints

- Preserve existing user behavior, database integrity, authorization, and migration history.
- Do not add a Supabase client, database migration, dependency, route, or parallel state store.
- Use existing `AppAlert`, `AppButton`, `AppText`, and theme tokens.
- Keep Auth/database duplicate checks authoritative; client behavior must not bypass RLS or Auth.
- Run focused tests red before production edits and green after each implementation slice.

---

### Task 1: Registration error classification and duplicate-email Auth handling

**Files:**
- Modify: `apps/mobile/lib/workerRegistration.ts`
- Test: `apps/mobile/lib/workerRegistration.test.ts`
- Modify: `apps/mobile/services/auth.ts`
- Test: `apps/mobile/services/auth.test.ts`

**Interfaces:**
- Consumes: Supabase Auth signup errors/responses and existing `normalizePhilippinePhone` behavior.
- Produces: Stable duplicate-email and duplicate-mobile messages for both registration services; `signUpCustomer` rejects empty-identity duplicate-email responses before OTP.

- [ ] **Step 1: Add failing classifier tests.**

  Add tests to `workerRegistration.test.ts` asserting that `signupErrorMessage` returns the existing-email message for an Auth error containing `user_already_exists`, and the mobile message for `MOBILE_ALREADY_REGISTERED`, `accounts_mobile_key`, and duplicate-mobile diagnostics. Add a test for the worker error mapper if its current generic fallback would mask a duplicate-mobile response.

- [ ] **Step 2: Run the focused classifier tests and verify the expected failure.**

  Run:

  ```bash
  pnpm --dir apps/mobile test -- workerRegistration.test.ts
  ```

  Expected: the new duplicate-email/mobile assertions fail only if the current classifier does not produce the requested message.

- [ ] **Step 3: Add a failing customer Auth test for an empty-identity signup response.**

  Extend `auth.test.ts` with a `signUpCustomer` case where `signUp` resolves with `error: null`, a user, and `identities: []`; assert that the service rejects with `An account with this email already exists. Sign in to continue.` and does not return signup data.

- [ ] **Step 4: Run the focused Auth test and verify it fails for the missing guard.**

  Run:

  ```bash
  pnpm --dir apps/mobile test -- auth.test.ts
  ```

  Expected: the empty-identity test fails because the service currently proceeds after the signup response.

- [ ] **Step 5: Implement the minimal shared mapping and Auth guard.**

  Keep the existing public helper names and messages. Add only the diagnostic pattern needed for duplicate email/mobile cases. In `signUpCustomer`, after the existing Auth error check and before returning data, reject when `authResult.data.user?.identities?.length === 0` with the duplicate-email message already used by the current service.

- [ ] **Step 6: Run the focused tests and the existing mobile suite.**

  Run:

  ```bash
  pnpm --dir apps/mobile test -- workerRegistration.test.ts auth.test.ts
  pnpm --dir apps/mobile test
  ```

  Expected: both focused suites and the full mobile unit suite pass.

### Task 2: Worker service duplicate-email guard and status feedback

**Files:**
- Modify: `apps/mobile/services/workerApplication.ts`
- Test: `apps/mobile/services/workerApplication.test.ts` (create only if the existing package has no worker application unit test)
- Modify: `apps/mobile/app/register-worker.tsx`
- Modify: `apps/mobile/app/(worker)/verification.tsx`
- Test: `tests/mobile-e2e/worker-industry-taxonomy.spec.ts` only if a stable existing fixture can assert the changed success modal.

**Interfaces:**
- Consumes: `workerRegistrationErrorMessage`, existing worker application buffer, existing `showSuccess` modal, and worker verification status values.
- Produces: Duplicate email signup stops before buffering/OTP; worker success feedback displays pending status and the 2–3-day review notice.

- [ ] **Step 1: Add a failing worker service test for empty-identity signup.**

  Add a focused test around `submitWorkerApplication` with an Auth signup response containing `identities: []` and no session. Assert that the promise rejects with the duplicate-email message and does not report `requiresEmailVerification: true`.

- [ ] **Step 2: Run the worker service test and verify the expected failure.**

  Run:

  ```bash
  pnpm --dir apps/mobile test -- workerApplication.test.ts
  ```

  Expected: the new test fails because the current service buffers the application and returns the email-verification result for an empty-identity response.

- [ ] **Step 3: Implement the worker empty-identity guard.**

  Immediately after `supabase.auth.signUp` returns and before storing the pending application, reject through `workerRegistrationErrorMessage`’s existing duplicate-email wording when the returned user has an empty identities array.

- [ ] **Step 4: Update the existing worker success modal.**

  Keep the current modal and navigation. Change its body to explicitly show `Verification status: Pending`, state that review may take `2–3 days`, and identify `Verification` as the status location. Use existing `AppText`, `AppButton`, icon, spacing, and color tokens.

- [ ] **Step 5: Align the worker verification pending copy.**

  Update the existing FAQ/pending status copy from the old timeframe to `2–3 days` without changing status values, document actions, or administrator decisions.

- [ ] **Step 6: Run focused tests and inspect the worker route typecheck.**

  Run:

  ```bash
  pnpm --dir apps/mobile test -- workerApplication.test.ts
  pnpm --dir apps/mobile typecheck
  ```

  Expected: the focused test passes and TypeScript reports no new errors.

### Task 3: Customer verification pending popup

**Files:**
- Modify: `apps/mobile/app/(auth)/verify-identity.tsx`
- Test: Existing mobile tests for the screen if present; otherwise verify through the relevant Playwright/public flow and keep service tests as the boundary coverage.

**Interfaces:**
- Consumes: `submitCustomerVerification` success result, existing `showAlert`, and existing Home route.
- Produces: A user-dismissed success popup showing pending status and the 2–3-day review notice before navigating Home.

- [ ] **Step 1: Add the smallest available failing UI assertion.**

  If a screen test harness already exists for `verify-identity`, assert that a successful submit calls the existing alert flow with pending status and `2–3 days`; otherwise add no new test harness and use the existing customer-verification service contract plus Playwright/manual route verification.

- [ ] **Step 2: Run the focused assertion or existing relevant test and verify the missing behavior.**

  Run the applicable focused command from the repository’s existing test scripts and confirm the new assertion fails because success currently redirects immediately without the requested popup.

- [ ] **Step 3: Implement the existing-alert success flow.**

  On successful customer verification, call `showAlert` with pending status, the 2–3-day notice, and an OK button whose callback routes to `/(tabs)/home`. Preserve existing progress/error states and prevent duplicate submission while the request is active.

- [ ] **Step 4: Run mobile tests and verify the customer route typecheck.**

  Run:

  ```bash
  pnpm --dir apps/mobile test
  pnpm --dir apps/mobile typecheck
  ```

  Expected: the relevant tests pass and TypeScript reports no new errors.

### Task 4: Cross-surface validation

**Files:**
- No new files.

- [ ] **Step 1: Run formatting/lint and production-mock checks.**

  ```bash
  pnpm --dir apps/mobile lint
  pnpm --dir apps/mobile check:no-mocks
  ```

- [ ] **Step 2: Run the relevant Playwright worker registration suite.**

  ```bash
  pnpm exec playwright test tests/mobile-e2e/worker-industry-taxonomy.spec.ts
  ```

  Expected: the existing registration flows pass; if the environment cannot launch the configured web app or browser, report the exact environmental failure.

- [ ] **Step 3: Review the diff and verify scope.**

  Confirm only the approved mobile source/tests and the two Superpowers documentation files changed; confirm no migration, generated type, lockfile, secret, or unrelated file changed.

- [ ] **Step 4: Run the final mobile validation set.**

  ```bash
  pnpm --dir apps/mobile test
  pnpm --dir apps/mobile typecheck
  pnpm --dir apps/mobile lint
  pnpm --dir apps/mobile build:web
  ```

  Record exact pass/failure output before claiming completion.
