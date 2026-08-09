# Phase 3 Tracking Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete customer tracking actions, persist en-route locations, and surface worker arrival/permission denial.

**Architecture:** Add narrow customer-owned RPCs for arrival and completion instead of reusing worker proximity validation. Extend the existing en-route publisher with persistence and explicit error state while retaining realtime broadcasts. Keep UI action visibility derived from canonical booking status.

**Tech Stack:** Supabase Postgres/pgTAP, Expo Location, Expo Router, React Native Linking, TypeScript, Vitest, Playwright.

## Global Constraints

- Preserve assigned-worker and proximity validation.
- Customer actions must be ownership-checked and idempotent.
- Location persistence must use `record_worker_location` and existing RLS/status rules.
- Do not infer persistence from a realtime broadcast.
- Use a confirmation gate before Emergency dialing.

---

## File Map

- Create an append-only tracking migration under `supabase/migrations/`.
- Add pgTAP coverage under `supabase/tests/database/`.
- Modify `apps/mobile/services/apiCore.ts`, `apps/mobile/services/liveEnRouteLocation.ts`, and `apps/mobile/hooks/useBookingTracking.ts`.
- Modify `apps/mobile/app/tracking/[id].tsx` and worker booking-request UI for denial/permission feedback.
- Regenerate `packages/supabase/src/database.generated.ts`.

### Task 1: Add failing database tests for customer lifecycle actions

**Files:**
- Create: `supabase/tests/database/customer_tracking_confirmations.test.sql`

- [ ] **Step 1: Add ownership and status tests**

Assert customer ownership is required, worker calls are rejected, arrival is accepted only from `WORKER_EN_ROUTE`, completion only from `PENDING_CONFIRMATION`, and repeated calls return success without duplicate state events.

- [ ] **Step 2: Add race/invariant assertions**

Use two transaction attempts or the repository’s existing advisory/row-lock fixture pattern to assert status cannot move backward or skip payment-required states.

- [ ] **Step 3: Run the focused test and verify failure**

Run: `pnpm test:db`

Expected: FAIL because the customer RPCs do not exist.

### Task 2: Implement customer arrival/completion RPCs

**Files:**
- Create: `supabase/migrations/20260809010000_customer_tracking_confirmations.sql`

- [ ] **Step 1: Add the customer arrival RPC**

Define `confirm_customer_arrival(p_booking_id uuid)` with authenticated customer ownership checks, a row lock, allowed-status check, idempotent already-arrived result, and the existing status-event/audit conventions.

- [ ] **Step 2: Add the customer completion RPC**

Define `confirm_customer_completion(p_booking_id uuid)` with the same ownership/lock/idempotency pattern and only the approved pending-confirmation transition. Do not mark payment successful in this function.

- [ ] **Step 3: Run database tests**

Run: `pnpm test:db`

Expected: focused tracking tests pass.

- [ ] **Step 4: Commit the tracking RPCs**

```bash
git add supabase/migrations/20260809010000_customer_tracking_confirmations.sql supabase/tests/database/customer_tracking_confirmations.test.sql
git commit -m "feat(db): add customer tracking confirmations"
```

### Task 3: Persist en-route locations and report denial

**Files:**
- Modify: `apps/mobile/services/apiCore.ts`
- Modify: `apps/mobile/services/liveEnRouteLocation.ts`
- Modify: worker booking-request screen/component using `startEnRouteLocationPublisher`
- Test: relevant live-dispatch/arrival tests

- [ ] **Step 1: Add failing publisher tests**

Assert every accepted location invokes `record_worker_location`, broadcast still occurs, permission denial invokes the failure callback, and persistence rejection is exposed to the worker state.

- [ ] **Step 2: Add a typed service wrapper**

Implement `recordWorkerLocation({ bookingId, latitude, longitude })` calling the generated RPC and throwing its error.

- [ ] **Step 3: Extend publisher callbacks**

After validating a location, call persistence and broadcast. Add `onError`/state callbacks with stable messages. When foreground permission is denied, call the callback before stopping and never report an active publisher.

- [ ] **Step 4: Render worker-visible denial**

Show a retryable permission/persistence message in the worker booking-request flow. Preserve existing proximity denial handling from `confirmWorkerArrival`, including the server-provided reason.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `pnpm --dir apps/mobile exec vitest run services/liveDispatch.test.ts services/arrivalTransition.test.ts`

Run: `pnpm --dir apps/mobile exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit location persistence**

```bash
git add apps/mobile/services/apiCore.ts apps/mobile/services/liveEnRouteLocation.ts apps/mobile/services/liveDispatch.test.ts apps/mobile/services/arrivalTransition.test.ts apps/mobile/app/'(worker)'/booking-request
git commit -m "feat(mobile): persist en-route worker locations"
```

### Task 4: Wire customer controls and contact actions

**Files:**
- Modify: `apps/mobile/services/apiCore.ts`
- Modify: `apps/mobile/hooks/useBookingTracking.ts`
- Modify: `apps/mobile/app/tracking/[id].tsx`
- Test: tracking hook/screen tests

- [ ] **Step 1: Add failing service tests**

Mock both customer RPCs and assert the booking ID is passed. Assert invalid/denied responses become UI error state and do not optimistically change status.

- [ ] **Step 2: Add service wrappers and hook actions**

Implement `confirmCustomerArrival` and `confirmCustomerCompletion`. Expose `confirmArrival`, `confirmCompletion`, and individual loading/error state from `useBookingTracking`, refreshing canonical tracking data after success.

- [ ] **Step 3: Add status-derived controls**

Render Confirm Arrival only at `WORKER_EN_ROUTE`; render Confirm Completion only at `PENDING_CONFIRMATION`. Keep completed/payment behavior unchanged. Add `Linking.openURL('tel:<worker mobile>')` for Call and confirmation-gated `tel:911` Emergency behavior.

- [ ] **Step 4: Surface denial and contact failures**

Render server messages for rejected actions, a fallback when the worker number is unavailable, and a safe error when the device cannot open a `tel:` URL.

- [ ] **Step 5: Run focused tests and mobile checks**

Run: `pnpm --dir apps/mobile exec vitest run services/arrivalTransition.test.ts services/bookingStatus.test.ts`

Run: `pnpm --dir apps/mobile lint`

Run: `pnpm --dir apps/mobile exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit customer tracking controls**

```bash
git add apps/mobile/services/apiCore.ts apps/mobile/hooks/useBookingTracking.ts 'apps/mobile/app/tracking/[id].tsx' apps/mobile/services/arrivalTransition.test.ts apps/mobile/services/bookingStatus.test.ts
git commit -m "feat(mobile): add tracking arrival and safety actions"
```

### Task 5: Regenerate types and run Phase 3 verification

- [ ] **Step 1: Generate database types**

Run: `pnpm db:types`

- [ ] **Step 2: Verify customer RPCs and location RPC remain typed**

Run: `rg -n "confirm_customer_arrival|confirm_customer_completion|record_worker_location" packages/supabase/src/database.generated.ts`

- [ ] **Step 3: Run database/mobile verification**

Run: `pnpm db:lint`

Run: `pnpm test:db`

Run: `pnpm --dir apps/mobile exec vitest run`

Run: `pnpm --dir apps/mobile lint`

Run: `pnpm --dir apps/mobile exec tsc --noEmit`

Expected: PASS, with any pre-existing baseline failures recorded exactly.
