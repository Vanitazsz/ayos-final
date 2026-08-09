# Phase 1 Mobile UAT Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the five Phase 1 mobile UAT gaps and repair the broken new-request success target without a database migration.

**Architecture:** Keep data access in focused mobile services/hooks, use shared presentational components for password and profile readiness, and preserve Supabase RPCs as mutation boundaries. Review and proof state will fail closed when ownership or duplicate state cannot be verified.

**Tech Stack:** Expo React Native, TypeScript, Expo Router, React Hook Form, Vitest, Supabase JS, existing theme/AppButton/AppInput components.

## Global Constraints

- No database migration or generated-type edits.
- Use `apps/mobile/lib/supabase.ts` and existing focused service patterns.
- Keep private booking-proof media behind signed URLs.
- Preserve the database `save_my_worker_skills` validation as the final authority.
- Do not delete orphan screens in this plan.

---

## File Map

- Create `apps/mobile/components/PasswordRequirements.tsx` and `apps/mobile/components/ProfileReadinessBanner.tsx` for shared UI and pure helpers.
- Create focused Vitest files beside mobile service/component logic.
- Modify `apps/mobile/services/apiCore.ts` for review lookup, skill filtering, and legacy fallback removal.
- Modify `apps/mobile/hooks/useBookingTracking.ts` and `apps/mobile/app/tracking/[id].tsx` for status-gated proof state.
- Modify `apps/mobile/app/payment/success.tsx` and `apps/mobile/app/review/[id].tsx` for review UX.
- Modify `apps/mobile/features/worker/hooks/useWorkerSkills.ts`, `(auth)/register.tsx`, `register-worker.tsx`, and `(worker)/verification.tsx`.
- Modify `apps/mobile/app/new-request/success.tsx` to use the existing matching route.

### Task 1: Add tested shared password and profile-readiness primitives

**Files:**
- Create: `apps/mobile/components/PasswordRequirements.tsx`
- Create: `apps/mobile/components/ProfileReadinessBanner.tsx`
- Create: `apps/mobile/components/PasswordRequirements.test.tsx`
- Create: `apps/mobile/components/ProfileReadinessBanner.test.tsx`

**Interfaces:**
- Produce `getPasswordRequirementState(password: string, confirmation?: string)` returning `{ minLength, uppercase, number, symbol, matches }`.
- Produce `PasswordRequirements({ password, confirmation, showMatch })`.
- Produce `ProfileReadinessBanner({ complete, missing, onCompleteProfile })`.

- [ ] **Step 1: Write the failing password helper tests**

```ts
it('reports each password requirement independently', () => {
  expect(getPasswordRequirementState('abc', 'abc')).toEqual({
    minLength: false,
    uppercase: false,
    number: false,
    symbol: false,
    matches: true,
  });
  expect(getPasswordRequirementState('Secure1!', 'Secure1')).toMatchObject({
    minLength: true,
    uppercase: true,
    number: true,
    symbol: true,
    matches: false,
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm --dir apps/mobile exec vitest run components/PasswordRequirements.test.tsx`

Expected: FAIL because the shared helper does not exist.

- [ ] **Step 3: Write the failing profile-banner test**

```tsx
it('renders missing profile items and invokes the completion action', () => {
  const onCompleteProfile = vi.fn();
  const { getByText } = render(
    <ProfileReadinessBanner
      complete={false}
      missing={['Name', 'Service area']}
      onCompleteProfile={onCompleteProfile}
    />,
  );
  fireEvent.press(getByText('Complete profile'));
  expect(getByText('Name, Service area')).toBeTruthy();
  expect(onCompleteProfile).toHaveBeenCalledOnce();
});
```

- [ ] **Step 4: Implement the minimal shared components**

Use existing `AppText`, `AppButton`, theme colors, and accessibility labels. Render no banner when `complete` is true. Do not add a new state or styling dependency.

- [ ] **Step 5: Run both focused tests and verify they pass**

Run: `pnpm --dir apps/mobile exec vitest run components/PasswordRequirements.test.tsx components/ProfileReadinessBanner.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the shared primitives**

```bash
git add apps/mobile/components/PasswordRequirements.tsx apps/mobile/components/PasswordRequirements.test.tsx apps/mobile/components/ProfileReadinessBanner.tsx apps/mobile/components/ProfileReadinessBanner.test.tsx
git commit -m "feat(mobile): add shared password and profile readiness UI"
```

### Task 2: Add review lookup and safe review submission

**Files:**
- Modify: `apps/mobile/services/apiCore.ts`
- Modify: `apps/mobile/app/payment/success.tsx`
- Modify: `apps/mobile/app/review/[id].tsx`
- Test: `apps/mobile/services/reviewRatings.test.ts`

**Interfaces:**
- Produce `fetchReviewForBooking(bookingId: string): Promise<{ id: string } | null>`.
- Consume the existing `createReview` and `fetchBookingDetail` services.

- [ ] **Step 1: Add a failing service test for the review lookup**

Mock `supabase.from('reviews')` and assert the query includes the booking ID and `maybeSingle()` result is returned. Add a second test asserting a query error rejects rather than returning `null`.

- [ ] **Step 2: Run the focused service test and verify failure**

Run: `pnpm --dir apps/mobile exec vitest run services/reviewRatings.test.ts`

Expected: FAIL because `fetchReviewForBooking` is not exported.

- [ ] **Step 3: Implement the lookup using the existing Supabase client**

Select only the review identifier, filter by `booking_id`, call `maybeSingle()`, and throw on `error`. Keep the return type narrow so no review body or private media is loaded for the pre-check.

- [ ] **Step 4: Add failing screen behavior tests**

Cover these observable outcomes:

```ts
expect(router.replace).toHaveBeenCalledWith('/booking-summary/booking-1');
expect(router.push).toHaveBeenCalledWith('/review/booking-1');
expect(screen.getByText('Review already submitted')).toBeTruthy();
```

Also assert a failed review submission does not call `router.replace('/(tabs)/home')`.

- [ ] **Step 5: Implement payment and review behavior**

On payment success, load the lookup for a valid `bookingId`, show the rating CTA only when no review exists, and route details to `/booking-summary/${bookingId}`. In the review screen, pre-check on load, render a non-submittable submitted state when a review exists, and replace the empty catch with an alert/error state. Navigate home only after `createReview` returns an identifier and uploads have succeeded.

- [ ] **Step 6: Run review tests and typecheck**

Run: `pnpm --dir apps/mobile exec vitest run services/reviewRatings.test.ts`

Run: `pnpm --dir apps/mobile exec tsc --noEmit`

Expected: PASS with no TypeScript errors.

- [ ] **Step 7: Commit the review slice**

```bash
git add apps/mobile/services/apiCore.ts apps/mobile/services/reviewRatings.test.ts apps/mobile/app/payment/success.tsx 'apps/mobile/app/review/[id].tsx'
git commit -m "fix(mobile): make post-payment reviews duplicate-safe"
```

### Task 3: Gate tracking proof photos by booking status

**Files:**
- Modify: `apps/mobile/hooks/useBookingTracking.ts`
- Modify: `apps/mobile/app/tracking/[id].tsx`
- Test: `apps/mobile/services/bookingStatus.test.ts` or a new `apps/mobile/hooks/useBookingTracking.test.ts`

**Interfaces:**
- Consume `fetchBookingProofPhotos(bookingId)`.
- Produce `proofPhotos` and `isLoadingProofPhotos` from `useBookingTracking`.

- [ ] **Step 1: Write failing status-gating tests**

Assert the fetcher is not called for `IN_PROGRESS`, is called for `PENDING_CONFIRMATION`, and is called again when the realtime status becomes `COMPLETED`.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `pnpm --dir apps/mobile exec vitest run hooks/useBookingTracking.test.ts`

Expected: FAIL because the hook does not expose proof state.

- [ ] **Step 3: Implement conditional proof loading**

Keep proof photos in hook state, clear them when status leaves the allowed set, and ignore stale responses after booking ID/status changes. Reuse the existing service and signed URLs.

- [ ] **Step 4: Add the tracking proof card**

Render only for `PENDING_CONFIRMATION` and `COMPLETED`, use accessible image labels, show loading/error states, and preserve existing tracking status controls.

- [ ] **Step 5: Run focused tests and mobile typecheck**

Run: `pnpm --dir apps/mobile exec vitest run hooks/useBookingTracking.test.ts`

Run: `pnpm --dir apps/mobile exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit the proof slice**

```bash
git add apps/mobile/hooks/useBookingTracking.ts 'apps/mobile/app/tracking/[id].tsx' apps/mobile/hooks/useBookingTracking.test.ts
git commit -m "feat(mobile): show proof photos at completion"
```

### Task 4: Remove incompatible worker skills before save

**Files:**
- Modify: `apps/mobile/features/worker/hooks/useWorkerSkills.ts`
- Modify: `apps/mobile/services/apiCore.ts`
- Test: `apps/mobile/features/worker/hooks/useWorkerSkills.test.ts`
- Test: `apps/mobile/services/workerSelection.test.ts`

**Interfaces:**
- Produce a pure `filterSkillsForIndustries(skillIds, rates, catalog, industryIds)` helper.
- Consume `save_my_worker_skills({ p_industry_ids, p_skills })` only.

- [ ] **Step 1: Write failing compatibility tests**

```ts
expect(filterSkillsForIndustries(['skill-a', 'skill-b'], {}, catalog, ['industry-a'])).toEqual({
  skillIds: ['skill-a'],
  rates: {},
});
```

Add a hook test that deselecting an industry removes its skills and rate entries.

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm --dir apps/mobile exec vitest run features/worker/hooks/useWorkerSkills.test.ts services/workerSelection.test.ts`

Expected: FAIL because stale skills remain and the helper does not exist.

- [ ] **Step 3: Implement filtering in the hook and service**

Use category-to-industry relationships from the loaded catalog. Apply the filter in `toggleIndustry` and immediately before constructing the RPC payload. Remove the legacy `p_primary_industry_id` retry from `apiCore.ts`; preserve the original RPC error.

- [ ] **Step 4: Run tests and inspect the generated RPC contract**

Run: `pnpm --dir apps/mobile exec vitest run features/worker/hooks/useWorkerSkills.test.ts services/workerSelection.test.ts`

Run: `rg -n "p_primary_industry_id|save_my_worker_skills" apps/mobile supabase packages/supabase/src/database.generated.ts`

Expected: PASS, with no mobile legacy retry and only the current RPC parameters.

- [ ] **Step 5: Commit the skill slice**

```bash
git add apps/mobile/features/worker/hooks/useWorkerSkills.ts apps/mobile/features/worker/hooks/useWorkerSkills.test.ts apps/mobile/services/apiCore.ts apps/mobile/services/workerSelection.test.ts
git commit -m "fix(mobile): drop skills outside selected industries"
```

### Task 5: Wire live password feedback into both registration flows

**Files:**
- Modify: `apps/mobile/app/(auth)/register.tsx`
- Modify: `apps/mobile/app/register-worker.tsx`
- Test: existing component/registration tests plus `apps/mobile/components/PasswordRequirements.test.tsx`

- [ ] **Step 1: Add failing render assertions**

Assert that entering `Secure1!` marks the four password rules complete and that a mismatched confirmation marks the match rule incomplete in both registration screens.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `pnpm --dir apps/mobile exec vitest run components/PasswordRequirements.test.tsx`

Expected: FAIL because neither screen renders the shared checklist.

- [ ] **Step 3: Render the shared component from React Hook Form and local state**

Pass `watch('password')`/`watch('confirmPassword')` in customer registration and `password`/`confirmPassword` in worker registration. Keep existing regex validation and error messages.

- [ ] **Step 4: Run mobile lint/type checks**

Run: `pnpm --dir apps/mobile lint`

Run: `pnpm --dir apps/mobile exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit the password slice**

```bash
git add 'apps/mobile/app/(auth)/register.tsx' apps/mobile/app/register-worker.tsx apps/mobile/components/PasswordRequirements.tsx
git commit -m "feat(mobile): add live registration password feedback"
```

### Task 6: Add profile-readiness prompts

**Files:**
- Modify: `apps/mobile/app/(worker)/verification.tsx`
- Modify: `apps/mobile/app/register-worker.tsx`
- Test: `apps/mobile/components/ProfileReadinessBanner.test.tsx`

- [ ] **Step 1: Write failing readiness derivation tests**

Cover incomplete authenticated profile state and incomplete worker-registration state, asserting the missing labels and target step are deterministic.

- [ ] **Step 2: Run the test and verify failure**

Run: `pnpm --dir apps/mobile exec vitest run components/ProfileReadinessBanner.test.tsx`

Expected: FAIL because screens do not pass readiness state.

- [ ] **Step 3: Add the verification banner**

Load `getMyProfile` alongside verification data. Before the identity section, render the banner when `profileComplete` is false and route its action to `/(worker)/personal-info`.

- [ ] **Step 4: Add the registration banner**

Derive readiness from existing fields and render immediately before “Identity Verification.” The action advances to the first incomplete registration step without discarding entered values.

- [ ] **Step 5: Run mobile checks**

Run: `pnpm --dir apps/mobile exec vitest run components/ProfileReadinessBanner.test.tsx`

Run: `pnpm --dir apps/mobile exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit the readiness slice**

```bash
git add 'apps/mobile/app/(worker)/verification.tsx' apps/mobile/app/register-worker.tsx apps/mobile/components/ProfileReadinessBanner.tsx apps/mobile/components/ProfileReadinessBanner.test.tsx
git commit -m "feat(mobile): prompt workers to complete profiles"
```

### Task 7: Repair the new-request success route and run Phase 1 verification

**Files:**
- Modify: `apps/mobile/app/new-request/success.tsx`
- Test: `apps/mobile/utils/tabRouteStructure.test.ts` or a focused route test

- [ ] **Step 1: Write a failing route-target assertion**

Assert the success action does not contain `/request/${requestId}` and targets `/new-request/matching`.

- [ ] **Step 2: Implement the route replacement**

Use the existing matching route and preserve the current request-id publication state.

- [ ] **Step 3: Run Phase 1 validation**

Run: `pnpm --dir apps/mobile exec vitest run`

Run: `pnpm --dir apps/mobile lint`

Run: `pnpm --dir apps/mobile exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 4: Commit the route fix**

```bash
git add apps/mobile/app/new-request/success.tsx apps/mobile/utils/tabRouteStructure.test.ts
git commit -m "fix(mobile): route request success into matching"
```
