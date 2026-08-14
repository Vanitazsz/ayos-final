# Homeowner Booking Cancellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the customer/homeowner cancellation flow from booking details through reason selection, refund-policy review, confirmed cancellation, and the Cancelled bookings tab without changing worker cancellation behavior.

**Architecture:** Keep the existing customer tracking route as the entry point and add a dedicated `/cancel-booking/[id]` route with its own homeowner role guard and local form state. Factor the existing worker/customer cancellation RPC preparation into a focused service while preserving the worker-facing `cancelBooking(bookingId, reason)` signature and defaults. Reuse existing content-page reads, theme primitives, booking-tab grouping, realtime refresh, and confirmation UI.

**Tech Stack:** Expo Router 6, React Native, TypeScript, Zustand auth store, Supabase JS RPC/Data API, Vitest, Playwright mobile-web tests, pnpm workspace.

## Global Constraints

- Preserve the existing worker cancellation flow and `cancelBooking(bookingId, reason)` behavior exactly.
- Use the canonical mobile Supabase client from `apps/mobile/lib/supabase.ts`; do not add a client or direct booking-table mutation.
- Reuse the existing `public.cancel_booking` RPC, `cancellation_reasons` table, `REFUND_POLICY` content key, theme tokens, `Button`, `AppText`, `Screen`, `useGoBack`, auth store, and customer booking tabs.
- Do not modify migrations, RLS policies, auth/session code, Edge Functions, generated database types, or package dependencies.
- Do not invent refund amounts or percentages. Use published `REFUND_POLICY` content or the verified generic repository fallback copy.
- Use failing tests before each new production behavior and run the exact command listed for each red/green cycle.
- Keep all implementation work in `/Users/jhonfiel/Documents/A-YOS/.worktrees/homeowner-booking-cancellation` on branch `codex/homeowner-booking-cancellation`.

---

### Task 1: Factor and test structured homeowner cancellation RPC calls

**Files:**
- Create: `apps/mobile/services/bookingCancellation.test.ts`
- Create: `apps/mobile/services/bookingCancellation.ts`
- Modify: `apps/mobile/services/apiCore.ts:683-710`
- Modify: `apps/mobile/services/bookings.ts:1-30`

**Interfaces:**
- Consumes: the existing `supabase` client, the existing `public.cancel_booking` RPC signature, and the current worker cancellation defaults.
- Produces:
  - `cancellationStageForStatus(status: string): CancellationStage`
  - `cancelCustomerBooking(bookingId: string, reasonCode: string, details: string, policyVersion: string)`
  - the unchanged worker-facing `cancelBooking(bookingId: string, reason: string)` export.

- [ ] **Step 1: Write the failing service tests**

Create `apps/mobile/services/bookingCancellation.test.ts` with a hoisted Supabase mock and tests for status mapping plus both caller contracts:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

function mockBookingStatus(status: string) {
  const single = vi.fn().mockResolvedValue({ data: { status }, error: null });
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  mocks.from.mockReturnValue({ select });
}

describe('booking cancellation service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps every cancellable booking status to the RPC stage', async () => {
    const { cancellationStageForStatus } = await import('./bookingCancellation');

    expect(cancellationStageForStatus('PENDING')).toBe('BEFORE_ACCEPTANCE');
    expect(cancellationStageForStatus('ACCEPTED')).toBe('BEFORE_TRAVEL');
    expect(cancellationStageForStatus('WORKER_PREPARING')).toBe('BEFORE_TRAVEL');
    expect(cancellationStageForStatus('WORKER_EN_ROUTE')).toBe('EN_ROUTE');
    expect(cancellationStageForStatus('WORKER_ARRIVED')).toBe('ARRIVED');
    expect(cancellationStageForStatus('SERVICE_STARTED')).toBe('SERVICE_STARTED');
    expect(cancellationStageForStatus('IN_PROGRESS')).toBe('IN_PROGRESS');
    expect(cancellationStageForStatus('UNKNOWN')).toBe('BEFORE_ACCEPTANCE');
  });

  it('submits a homeowner reason code, details, stage, and policy version', async () => {
    mockBookingStatus('ACCEPTED');
    mocks.rpc.mockResolvedValueOnce({ data: { id: 'booking-1' }, error: null });

    const { cancelCustomerBooking } = await import('./bookingCancellation');
    await cancelCustomerBooking(
      'booking-1',
      'SCHEDULE_CHANGED',
      'Schedule changed',
      '2026-07-23',
    );

    expect(mocks.rpc).toHaveBeenCalledWith('cancel_booking', {
      p_booking_id: 'booking-1',
      p_expected_version: null,
      p_stage: 'BEFORE_TRAVEL',
      p_reason_code: 'SCHEDULE_CHANGED',
      p_details: 'Schedule changed',
      p_policy_version: '2026-07-23',
    });
  });

  it('keeps the existing worker cancellation defaults unchanged', async () => {
    mockBookingStatus('PENDING');
    mocks.rpc.mockResolvedValueOnce({ data: { id: 'booking-1' }, error: null });

    const { cancelWorkerBooking } = await import('./bookingCancellation');
    await cancelWorkerBooking('booking-1', 'Worker declined the assigned booking');

    expect(mocks.rpc).toHaveBeenCalledWith('cancel_booking', {
      p_booking_id: 'booking-1',
      p_expected_version: null,
      p_stage: 'BEFORE_ACCEPTANCE',
      p_reason_code: 'DECLINED',
      p_details: 'Worker declined the assigned booking',
      p_policy_version: '2026-07-21',
    });
  });
});
```

- [ ] **Step 2: Run the focused test and verify the expected red failure**

Run:

```bash
pnpm --dir apps/mobile test --run services/bookingCancellation.test.ts
```

Expected: FAIL because `apps/mobile/services/bookingCancellation.ts` does not exist yet. If the test errors for a mock or import typo instead of the missing feature, correct the test and rerun until the failure is feature-related.

- [ ] **Step 3: Implement the focused service and preserve the compatibility export**

Create the stage mapping and one shared RPC submission path in `bookingCancellation.ts`:

```ts
import { supabase } from '@/lib/supabase';

export type CancellationStage =
  | 'BEFORE_ACCEPTANCE'
  | 'BEFORE_TRAVEL'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'SERVICE_STARTED'
  | 'IN_PROGRESS';

const STAGE_BY_STATUS: Record<string, CancellationStage> = {
  PENDING: 'BEFORE_ACCEPTANCE',
  ACCEPTED: 'BEFORE_TRAVEL',
  WORKER_PREPARING: 'BEFORE_TRAVEL',
  WORKER_EN_ROUTE: 'EN_ROUTE',
  WORKER_ARRIVED: 'ARRIVED',
  SERVICE_STARTED: 'SERVICE_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
};

export function cancellationStageForStatus(status: string): CancellationStage {
  return STAGE_BY_STATUS[status.toUpperCase()] ?? 'BEFORE_ACCEPTANCE';
}

async function submitCancellation(
  bookingId: string,
  reasonCode: string,
  details: string,
  policyVersion: string,
) {
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('status')
    .eq('id', bookingId)
    .single();
  if (bookingError) throw bookingError;

  const { data, error } = await supabase.rpc('cancel_booking', {
    p_booking_id: bookingId,
    p_expected_version: null,
    p_stage: cancellationStageForStatus(booking.status),
    p_reason_code: reasonCode,
    p_details: details,
    p_policy_version: policyVersion,
  });
  if (error) throw error;
  return { data };
}

export function cancelCustomerBooking(
  bookingId: string,
  reasonCode: string,
  details: string,
  policyVersion: string,
) {
  return submitCancellation(bookingId, reasonCode, details, policyVersion);
}

export function cancelWorkerBooking(bookingId: string, reason: string) {
  return submitCancellation(
    bookingId,
    'DECLINED',
    reason || 'Worker declined assigned booking',
    '2026-07-21',
  );
}
```

Replace the existing worker `cancelBooking` body in `apiCore.ts` with `return cancelWorkerBooking(bookingId, reason);`, import `cancelWorkerBooking`, and re-export `cancelCustomerBooking`. Add `cancelCustomerBooking` to the focused `services/bookings.ts` export list so the new route can import the focused surface.

- [ ] **Step 4: Run the focused test and verify green**

Run:

```bash
pnpm --dir apps/mobile test --run services/bookingCancellation.test.ts
```

Expected: 3 tests pass with the RPC parameter assertions intact.

- [ ] **Step 5: Run existing worker booking tests to verify compatibility**

Run:

```bash
pnpm --dir apps/mobile test --run services/api.workerBookings.test.ts services/bookingStatus.test.ts
```

Expected: all existing worker booking/status tests pass.

- [ ] **Step 6: Commit the isolated service change**

Run:

```bash
git add apps/mobile/services/bookingCancellation.ts apps/mobile/services/bookingCancellation.test.ts apps/mobile/services/apiCore.ts apps/mobile/services/bookings.ts
git commit -m "feat: add structured homeowner cancellation service"
```

---

### Task 2: Add the failing homeowner cancellation journey test

**Files:**
- Create: `tests/mobile-e2e/customer-booking-cancellation.spec.ts`

**Interfaces:**
- Consumes: the existing Playwright mobile-web project, customer auth fixture pattern from `tests/mobile-e2e/customer-bookings-recent.spec.ts`, and the route/RPC contracts described in Task 1.
- Produces: an executable UAT regression for the homeowner flow.

- [ ] **Step 1: Write the failing Playwright test before adding the customer route**

Create a fixture that:

1. Seeds a valid homeowner session and `get_my_profile` response.
2. Returns one `PENDING` booking from the customer bookings query and tracking query.
3. Returns an empty tracking RPC update list.
4. Returns `SCHEDULE_CHANGED` (`USER`) and `OTHER` (`BOTH`) reasons.
5. Returns a published `REFUND_POLICY` page with version `2026-07-23`.
6. Records the `cancel_booking` request and returns the cancelled booking.
7. Returns the same booking as `CANCELLED` on the subsequent bookings-tab load.

The test must assert the complete behavior:

The fixture helper is defined in this same file before the test. Its `cancel_booking` route handler parses `route.request().postDataJSON()`, resolves a `Promise<Record<string, unknown>>` named `rpcRequest`, and returns the cancelled booking row. The helper returns `{ rpcRequest }` so the test can assert the exact RPC payload.

```ts
test('homeowner can cancel a booking after reviewing the refund policy', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const cancellation = await useHomeownerCancellationFixture(page);

  await page.goto('/tracking/booking-1');
  await expect(page.getByRole('button', { name: 'Cancel Booking' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel Booking' }).click();

  await expect(page).toHaveURL(/\/cancel-booking\/booking-1$/);
  await expect(page.getByText('Why are you cancelling this booking?')).toBeVisible();
  await page.getByRole('button', { name: 'Schedule changed' }).click();
  await expect(page.getByText('Selected')).toBeVisible();
  await expect(page.getByText('Refund Policy')).toBeVisible();
  await expect(page.getByText('Refund eligibility depends on the booking stage and the reason for cancellation.')).toBeVisible();

  await page.getByRole('button', { name: 'Confirm Cancellation' }).click();
  await expect(cancellation.rpcRequest).resolves.toMatchObject({
    p_booking_id: 'booking-1',
    p_reason_code: 'SCHEDULE_CHANGED',
    p_details: 'Schedule changed',
    p_policy_version: '2026-07-23',
  });
  await expect(page.getByText('Cancellation Confirmed')).toBeVisible();
  await page.getByRole('button', { name: 'View Cancelled Bookings' }).click();

  await expect(page).toHaveURL(/\/bookings\?filter=Cancelled$/);
  await expect(page.getByText('Cancelled')).toHaveCount(1);
  await expect(page.getByText('Schedule changed')).toBeVisible();
});
```

Use the existing fixture's JWT/session setup and route fulfillment patterns; do not add production mocks or hardcode a production account.

- [ ] **Step 2: Run the focused Playwright test and verify the expected red failure**

Run:

```bash
pnpm exec playwright test tests/mobile-e2e/customer-booking-cancellation.spec.ts --project=mobile-web-chromium --reporter=line
```

Expected: FAIL because the tracking screen does not yet expose `Cancel Booking` and `/cancel-booking/[id]` does not exist. Do not implement production code before recording this feature-related failure.

- [ ] **Step 3: Commit the failing regression test**

Run:

```bash
git add tests/mobile-e2e/customer-booking-cancellation.spec.ts
git commit -m "test: cover homeowner booking cancellation flow"
```

---

### Task 3: Implement the homeowner policy and confirmation presentation

**Files:**
- Modify: `apps/mobile/services/contentPages.ts:3`
- Modify: `apps/mobile/components/CancellationConfirmation.tsx:6-37`

**Interfaces:**
- Consumes: the generated database `content_key` enum, which already includes `REFUND_POLICY`, and the existing worker confirmation component contract.
- Produces: published refund-policy reads and a backwards-compatible customer confirmation variant.

- [ ] **Step 1: Extend the content-page key without adding a new database contract**

Change only the mobile union to:

```ts
export type ContentPageKey =
  | 'HELP_CENTER'
  | 'PRIVACY'
  | 'TERMS'
  | 'REFUND_POLICY';
```

The existing `fetchPublishedContentPage` query and validation remain unchanged.

- [ ] **Step 2: Add an optional audience prop while preserving worker copy**

Extend `CancellationConfirmationProps` with `audience?: 'worker' | 'customer'`, default it to `'worker'`, and render:

```ts
const isCustomer = audience === 'customer';
const title = isCustomer ? 'Cancellation Confirmed' : 'Reason Sent to Customer';
const description = isCustomer
  ? 'Your booking has been cancelled.'
  : `Your cancellation reason has been shared with ${customerName}. The booking has been cancelled.`;
```

Keep `customerName`, the existing worker default, and the existing `View Cancelled Bookings` callback intact. This keeps existing worker behavior unchanged while making the reused component accurate for homeowners.

- [ ] **Step 3: Run the focused mobile tests and typecheck**

Run:

```bash
pnpm --dir apps/mobile typecheck
```

Expected: exit code 0. The component edit must not introduce TypeScript errors.

- [ ] **Step 4: Commit the policy-key and confirmation presentation change**

Run:

```bash
git add apps/mobile/services/contentPages.ts apps/mobile/components/CancellationConfirmation.tsx
git commit -m "feat: support homeowner cancellation confirmation copy"
```

---

### Task 4: Implement the dedicated homeowner route and tracking entry point

**Files:**
- Create: `apps/mobile/app/cancel-booking/[id].tsx`
- Modify: `apps/mobile/app/tracking/[id].tsx:1-30,405-455`
- Modify: `apps/mobile/app/(tabs)/bookings.tsx:120-155`
- Modify: `apps/mobile/services/apiCore.ts:354-405`

**Interfaces:**
- Consumes: `useAuthStore`, `useGoBack`, `fetchCancellationReasons`, `fetchPublishedContentPage`, `cancelCustomerBooking`, `CancellationConfirmation`, existing theme primitives, and `CUSTOMER_BOOKING_TABS`.
- Produces: the full homeowner cancellation UI and navigation behavior used by the failing Playwright test.

- [ ] **Step 1: Add the homeowner route role guard and state model**

The route must normalize the dynamic `id`, redirect unauthenticated/non-`USER` roles safely, and keep these local states:

```ts
type Reason = Awaited<ReturnType<typeof fetchCancellationReasons>>['data'][number];

const FALLBACK_REFUND_POLICY = {
  title: 'Refund Policy',
  version: '2026-07-23',
  body: 'Refund eligibility depends on the booking stage and the reason for cancellation. The cancellation policy displayed at the time of the request applies. Disputes are handled through A-YOS support.',
};
```

Load reasons and policy in one effect. Filter reason rows to `USER`/`BOTH`; when no published policy is returned, use only the verified generic fallback above. Keep loading, error, empty, selected-reason, submitting, confirmation, and retry state explicit.

- [ ] **Step 2: Render the reason list, policy card, and destructive action**

Use `Screen safeArea`, `useGoBack('/(tabs)/bookings')`, `Button`, `AppText`, `Pressable`, and existing theme tokens. Each reason button must expose its label and selected state. The policy body must be scrollable and appear before the confirm button. The confirm button must be disabled until a reason exists and while data is loading or a mutation is pending.

The submit handler must call:

```ts
await cancelCustomerBooking(
  bookingId,
  selectedReason.code,
  selectedReason.label,
  refundPolicy.version,
);
setShowConfirmation(true);
```

Catch errors, preserve the current booking state, show the existing alert pattern, and leave the user on the route for retry. Navigate to `/(tabs)/bookings?filter=Cancelled` only from the confirmation callback. Render `CancellationConfirmation` with `audience="customer"` and an empty customer name because the homeowner is the actor.

- [ ] **Step 3: Add the customer tracking action without changing other actions**

Import `XCircle` only if the existing icon package usage requires it. In `tracking/[id].tsx`, render a clearly labeled outlined/danger `Button` in the existing safety-action area when `isActive` is true:

```tsx
{isActive && bookingId ? (
  <Button
    title="Cancel Booking"
    variant="outlined"
    onPress={() => router.push(`/cancel-booking/${bookingId}`)}
    fullWidth
  />
) : null}
```

Leave report, call, emergency, completion, payment, realtime subscriptions, and cancelled-state footer behavior unchanged.

In the existing customer booking fetch/card path, select the related cancellation reason, map it to `cancellationReason`, and render that reason only for `CANCELLED` cards. This completes the UAT requirement that the Cancelled tab shows the persisted reason without changing other tab cards.

```ts
const cancellation = Array.isArray(row.cancellations)
  ? row.cancellations[0]
  : row.cancellations;

return {
  // existing mapped booking fields
  cancellationReason: cancellation?.reason ?? null,
};
```

```tsx
{booking.rawStatus === 'CANCELLED' && booking.cancellationReason ? (
  <Text style={[theme.typography.caption, styles.cancelledReason]}>
    Reason: {booking.cancellationReason}
  </Text>
) : null}
```

- [ ] **Step 4: Run the focused Playwright test and verify green**

Run:

```bash
pnpm exec playwright test tests/mobile-e2e/customer-booking-cancellation.spec.ts --project=mobile-web-chromium --reporter=line
```

Expected: the homeowner can open the flow, select a reason, see the policy, confirm, see the customer confirmation copy, and reach the Cancelled tab with the reason. Fix production code—not the assertions—if the test fails.

- [ ] **Step 5: Run the mobile lint and typecheck for the changed UI**

Run:

```bash
pnpm --dir apps/mobile lint
pnpm --dir apps/mobile typecheck
```

Expected: exit code 0 with no new lint or type errors.

- [ ] **Step 6: Commit the homeowner route and tracking entry point**

Run:

```bash
git add 'apps/mobile/app/cancel-booking/[id].tsx' 'apps/mobile/app/tracking/[id].tsx' 'apps/mobile/app/(tabs)/bookings.tsx' apps/mobile/services/apiCore.ts
git commit -m "feat: add homeowner booking cancellation flow"
```

---

### Task 5: Update traceability and complete verification

**Files:**
- Modify: `REQUIREMENTS.md:145-165`

**Interfaces:**
- Consumes: the implemented route/service/test evidence from Tasks 1–4.
- Produces: traceable repository documentation for the cancellation requirement without marking hosted/device UAT as complete.

- [ ] **Step 1: Add an FR-18 implementation-wave evidence row**

Add a row to the existing implementation-wave traceability table that names:

- `apps/mobile/app/tracking/[id].tsx`
- `apps/mobile/app/cancel-booking/[id].tsx`
- `apps/mobile/services/bookingCancellation.ts`
- `tests/mobile-e2e/customer-booking-cancellation.spec.ts`
- the existing `supabase` cancellation RPC/migration evidence

Set the status to `Repository verified; hosted/device UAT pending` only after the relevant commands pass. Do not change the broader FR-18 status line unless the full authorized-participant requirement is verified.

- [ ] **Step 2: Run the complete changed-surface verification**

Run:

```bash
pnpm --dir apps/mobile test
pnpm --dir apps/mobile lint
pnpm --dir apps/mobile typecheck
pnpm --dir apps/mobile build:web
pnpm exec playwright test tests/mobile-e2e/customer-booking-cancellation.spec.ts --project=mobile-web-chromium --reporter=line
pnpm traceability:check
pnpm contracts:check
git diff --check
```

Expected: all commands exit 0. If a command fails, record the exact command, failure, whether it is pre-existing or caused by this change, and the affected feature before making any completion claim.

- [ ] **Step 3: Review the final diff and verify unchanged worker behavior**

Run:

```bash
git status --short
git diff --stat
git diff -- apps/mobile/services/apiCore.ts apps/mobile/services/bookingCancellation.ts 'apps/mobile/app/(worker)/cancel-service/[id].tsx'
```

Expected: only the planned files are changed; the worker route has no diff; the worker wrapper still submits `DECLINED` with policy version `2026-07-21`; no migrations, generated types, secrets, or lockfiles are changed.
