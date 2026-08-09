# Phase 2 Monetization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add service-category commission overrides and a worker-facing manual GCash top-up flow backed by private proof storage and approval status.

**Architecture:** The database owns effective commission resolution and all payment mutations. A minimal active Supabase Edge API exposes the approved admin settings read contract. Mobile uses the existing RPCs and private bucket, with a new owner-scoped status read only where the existing mutation contract does not provide one.

**Tech Stack:** Supabase Postgres migrations, pgTAP, Supabase Edge Functions/Deno, generated TypeScript database types, Expo React Native, Vitest, Expo ImagePicker/ImageManipulator.

## Global Constraints

- Applied migrations are append-only; never edit an existing migration.
- Generated database types are produced by `pnpm db:types` and are never hand-edited.
- Sensitive mutations remain RPC-backed and authenticated.
- `topup-proofs` remains private and worker-owned.
- The separate admin client is out of scope.
- The inactive legacy Express backend is out of scope.

---

## File Map

- Create the append-only migration `supabase/migrations/20260809000000_service_category_commission_overrides.sql` for the category column, effective-rate contract, payment updates, and top-up read contract.
- Modify/add pgTAP tests under `supabase/tests/database/`.
- Create `supabase/functions/api/index.ts` and update `supabase/config.toml` only for the approved `/admin/settings` contract.
- Modify `apps/mobile/services/apiCore.ts`, `apps/mobile/services/uploads.ts`, `apps/mobile/app/(worker)/wallet.tsx`, and `apps/mobile/hooks/useWalletData.ts`.
- Regenerate `packages/supabase/src/database.generated.ts` with `pnpm db:types`.

### Task 1: Discover Supabase CLI and current database contracts

- [ ] **Step 1: Read CLI help before migration work**

Run: `supabase --help`

Run: `supabase migration --help`

Run: `supabase functions --help`

Record the supported migration-generation and function-check commands in the implementation notes.

- [ ] **Step 2: Inspect the current schema and generated types**

Run: `rg -n "service_categories|deduct_booking_commission|confirm_cash_payment|submit_manual_wallet_topup|wallet_topups|get_platform_fee_settings" supabase/migrations supabase/tests packages/supabase/src/database.generated.ts`

Confirm the new migration can append definitions without replacing applied files.

- [ ] **Step 3: Run the existing database baseline**

Run: `pnpm db:lint`

Run: `pnpm test:db`

Expected: capture baseline results before changing the schema; do not proceed by masking pre-existing failures.

### Task 2: Add failing pgTAP tests for commission overrides

**Files:**
- Create: `supabase/tests/database/service_category_commission.test.sql`

- [ ] **Step 1: Add tests for null inheritance and override selection**

The test fixture must create an isolated category and booking using existing factory patterns. Assert:

```sql
SELECT is(
  public.get_effective_commission_rate(category_id),
  10.00::numeric,
  'null category override inherits the configured global percentage'
);
UPDATE public.service_categories SET commission_rate_percent = 7.50 WHERE id = category_id;
SELECT is(
  public.get_effective_commission_rate(category_id),
  7.50::numeric,
  'category override wins over the global percentage'
);
```

Add bounds tests for `0`, `50`, and a rejected value above `50`. Add payment assertions that recorded `commission_rate` and amount reflect the effective value, not a hardcoded 10%.

- [ ] **Step 2: Add tests for missing/invalid rate behavior**

Assert a missing category raises a controlled error and an invalid global setting is rejected by the effective-rate contract.

- [ ] **Step 3: Run the new test and verify it fails**

Run: `pnpm test:db`

Expected: FAIL because the column and RPC do not exist.

### Task 3: Implement the commission schema and effective-rate RPC

**Files:**
- Create: `supabase/migrations/20260809000000_service_category_commission_overrides.sql`

- [ ] **Step 1: Generate the migration using the supported CLI command**

Run the command discovered in Task 1, then keep the generated timestamp/name and append only the required SQL.

- [ ] **Step 2: Add the nullable override and constraints**

```sql
ALTER TABLE public.service_categories
  ADD COLUMN commission_rate_percent numeric(5,2);

ALTER TABLE public.service_categories
  ADD CONSTRAINT service_categories_commission_rate_percent_check
  CHECK (commission_rate_percent IS NULL OR commission_rate_percent BETWEEN 0 AND 50);
```

Use an existence guard only if the migration-generation workflow proves the target column is already present in the local schema.

- [ ] **Step 3: Add the effective-rate RPC with explicit percent units**

The function signature is:

```sql
public.get_effective_commission_rate(p_category_id uuid)
RETURNS numeric
```

It must read the category override or global setting, reject missing/invalid data, use `SECURITY DEFINER` only with a locked `search_path`, and grant execute only to the roles required by mobile/backend callers.

- [ ] **Step 4: Run the migration and the new tests**

Run: `pnpm db:reset`

Run: `pnpm test:db`

Expected: new commission tests pass or expose a fixture-specific failure to fix before payment changes.

### Task 4: Update all commission payment paths

**Files:**
- Modify: `supabase/migrations/20260809000000_service_category_commission_overrides.sql`
- Modify: `supabase/tests/database/service_category_commission.test.sql`

- [ ] **Step 1: Add a failing assertion for booking category resolution**

Set a booking’s category override to `7.50` and assert `deduct_booking_commission` and `confirm_cash_payment` both record `0.075` as the stored rate and calculate the same commission amount.

- [ ] **Step 2: Update `deduct_booking_commission`**

Resolve the booking’s service category, call the effective-rate RPC, convert percent to ratio exactly once, and use that ratio for amount/payment description. Remove every literal `0.10` commission assumption from the new definition.

- [ ] **Step 3: Update `confirm_cash_payment` and simulated GCash**

Use the same effective-rate calculation and preserve existing wallet/payment/RLS/AAL2 constraints. Keep idempotency behavior unchanged.

- [ ] **Step 4: Run database tests and scan for stale hardcodes**

Run: `pnpm test:db`

Run: `rg -n "commission.*0\.10|0\.10.*commission|10%" supabase/migrations`

Expected: no active commission mutation path retains the hardcoded 10% assumption.

- [ ] **Step 5: Commit database commission behavior**

```bash
git add supabase/migrations/20260809000000_service_category_commission_overrides.sql supabase/tests/database/service_category_commission.test.sql
git commit -m "feat(db): support service category commission overrides"
```

### Task 5: Add the approved `/admin/settings` Edge contract

**Files:**
- Create: `supabase/functions/api/index.ts`
- Modify: `supabase/config.toml`
- Create: `supabase/functions/api/index.test.ts`

- [ ] **Step 1: Write failing request-contract tests**

Assert:

```ts
expect(await request('/admin/settings', unauthenticated)).toHaveStatus(401);
expect(await request('/admin/settings', nonAdmin)).toHaveStatus(403);
expect(await request('/admin/settings', adminAal2)).toMatchObject({
  platform: { commissionRate: 10 },
  serviceCategoryOverrides: expect.any(Array),
});
```

- [ ] **Step 2: Configure the function route with JWT verification**

Add the smallest config entry supported by the current Supabase CLI. Reuse existing request-context/auth/admin helpers rather than copying token parsing.

- [ ] **Step 3: Implement only `GET /admin/settings`**

Require the existing admin/AAL2 contract, read global settings and category overrides through a tested database boundary, return a stable JSON object, and return `404` for unsupported paths/methods. Do not add write endpoints.

- [ ] **Step 4: Run function tests and checks**

Run: `pnpm functions:check`

Run: `pnpm functions:test`

Expected: PASS, with no legacy Express files changed.

- [ ] **Step 5: Commit the Edge contract**

```bash
git add supabase/functions/api/index.ts supabase/functions/api/index.test.ts supabase/config.toml
git commit -m "feat(api): expose admin commission settings contract"
```

### Task 6: Make mobile job acceptance commission-aware

**Files:**
- Modify: `apps/mobile/services/apiCore.ts`
- Test: `apps/mobile/services/payments.test.ts`

- [ ] **Step 1: Add failing tests for override and fail-closed behavior**

Mock the effective-rate RPC to return `7.5` and assert the required wallet amount uses `0.075`. Mock an RPC error and assert `acceptJob` rejects before the booking transition.

- [ ] **Step 2: Implement effective-rate retrieval in `acceptJob`**

Use the booking/category contract, convert percent to ratio once, and remove the constant from required-commission arithmetic. Do not proceed when the rate is unavailable or invalid.

- [ ] **Step 3: Remove the direct-write commission fallback**

Make `confirmPaymentWithCommission` return the RPC error after `deduct_booking_commission` fails; do not write wallet balances, accounts, or payments from the client.

- [ ] **Step 4: Run mobile payment tests and typecheck**

Run: `pnpm --dir apps/mobile exec vitest run services/payments.test.ts`

Run: `pnpm --dir apps/mobile exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit mobile commission behavior**

```bash
git add apps/mobile/services/apiCore.ts apps/mobile/services/payments.test.ts
git commit -m "fix(mobile): resolve commission rate before job acceptance"
```

### Task 7: Add private manual top-up upload and status read

**Files:**
- Modify: `apps/mobile/services/uploads.ts`
- Modify: `apps/mobile/services/apiCore.ts`
- Modify: `apps/mobile/hooks/useWalletData.ts`
- Modify: `apps/mobile/app/(worker)/wallet.tsx`
- Test: `apps/mobile/services/wallet.test.ts`

- [ ] **Step 1: Add failing service tests**

Cover proof upload path ownership, RPC parameters including idempotency key, invalid amount/reference rejection, and pending-status mapping.

- [ ] **Step 2: Implement screenshot upload**

Reuse the existing image-picker/compression/upload pattern and write only to `topup-proofs/${user.id}/${uuid}.jpg`. Reject non-image selections and files over the existing upload limit.

- [ ] **Step 3: Add the mobile RPC wrappers**

Implement `submitManualWalletTopup` and `fetchMyWalletTopups` using the generated RPC names. Map database snake_case to a small mobile type. Never return or render another worker’s proof path.

- [ ] **Step 4: Add failing wallet UI assertions**

Assert the visible action says `Manual GCash Top-Up`, the modal requires amount/reference/screenshot, submission renders `PENDING`, and a refreshed `SUCCESSFUL` record replaces the pending state.

- [ ] **Step 5: Implement the wallet UI and refresh loop**

Replace the visible simulate modal with manual submission, keep existing balance/transaction rendering, refresh top-up status on focus, and poll only while pending. Preserve loading, cancellation, and error states.

- [ ] **Step 6: Run wallet tests and typecheck**

Run: `pnpm --dir apps/mobile exec vitest run services/wallet.test.ts`

Run: `pnpm --dir apps/mobile exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 7: Commit the manual top-up flow**

```bash
git add apps/mobile/services/uploads.ts apps/mobile/services/apiCore.ts apps/mobile/hooks/useWalletData.ts 'apps/mobile/app/(worker)/wallet.tsx' apps/mobile/services/wallet.test.ts
git commit -m "feat(mobile): add manual GCash top-up submissions"
```

### Task 8: Regenerate types and run Phase 2 verification

- [ ] **Step 1: Generate database types**

Run: `pnpm db:types`

- [ ] **Step 2: Verify generated RPC/column contracts**

Run: `rg -n "commission_rate_percent|get_effective_commission_rate|submit_manual_wallet_topup|get_my_wallet_topups" packages/supabase/src/database.generated.ts`

- [ ] **Step 3: Run validation**

Run: `pnpm db:lint`

Run: `pnpm test:db`

Run: `pnpm functions:check`

Run: `pnpm --dir apps/mobile lint`

Run: `pnpm --dir apps/mobile exec tsc --noEmit`

Expected: PASS, or record any pre-existing baseline failure with its exact command/output.
