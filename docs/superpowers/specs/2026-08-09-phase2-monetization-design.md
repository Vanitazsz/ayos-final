# Phase 2 Monetization Design

## Status

Approved design. This document defines the database, Edge contract, and mobile-wallet boundaries for Phase 2.

## Objective

Support per-service-category commission overrides and replace the worker-facing simulated GCash top-up experience with a private proof-upload and approval-status flow.

## Verified existing contracts

- `service_categories` is the active service-category table.
- Global commission configuration is stored in `system_settings` as a percentage and is exposed by `get_platform_fee_settings`.
- `deduct_booking_commission` currently hardcodes `0.10`.
- `confirm_cash_payment` and the simulated GCash payment path currently use the global setting or hardcoded assumptions.
- Mobile `acceptJob` uses `PLATFORM_COMMISSION_RATE = 0.10`.
- Mobile `confirmPaymentWithCommission` contains a client-side direct-write fallback that also assumes 10%.
- `submit_manual_wallet_topup` and `admin_review_wallet_topup` already exist and write/read the private `topup-proofs` storage bucket contract.
- The worker wallet screen currently presents `simulateTopUp` as the visible top-up flow.
- The repository has no active `supabase/functions/api/index.ts`, despite older verification material referencing that path. The legacy Express settings route is marked inactive by repository guardrails.

## Commission design

### Schema

Append a nullable `commission_rate_percent numeric(5,2)` column to `service_categories` with a check constraint allowing `NULL` or a value from `0` through `50`. `NULL` means inherit the global platform rate. Existing rows therefore preserve current behavior.

### Effective-rate RPC

Add a security-reviewed RPC that accepts a service category identifier and returns the effective rate as a percentage. It will use the category override when non-null and otherwise read the global setting. Booking commission functions will resolve the category from the booking and perform all arithmetic in decimal ratio units only after converting the percentage once.

The RPC and database functions will reject missing categories or invalid settings rather than silently falling back to 10%. The global setting remains the default configured rate; 10% is not duplicated in application code.

### Payment paths

Update:

- `deduct_booking_commission`;
- `confirm_cash_payment`;
- the simulated GCash payment path, so test/demo payment behavior cannot diverge from production commission calculation; and
- mobile `acceptJob`.

Mobile job acceptance will use the effective-rate contract and fail closed if it cannot obtain a trustworthy rate. The client-side direct-write commission fallback in `confirmPaymentWithCommission` will be removed or converted to an error path; the RPC remains the only mutation path.

The mobile fee-settings parser will preserve the global settings and may expose category overrides for display or diagnostics, but it will not become the source of truth for booking commission arithmetic.

### `/admin/settings` contract

Add a minimal active Supabase Edge contract for `GET /admin/settings`, because no active implementation exists in this repository. It will:

1. require a verified authenticated request;
2. require the existing admin/AAL2 authorization contract;
3. return the global platform fee settings and service-category override records in a stable JSON shape; and
4. expose no write operation and no admin UI.

The contract will call a privileged, tested database read rather than duplicating commission resolution logic in TypeScript. The inactive Express backend will not be modified.

## Manual top-up design

### Submission

Add a mobile wallet flow with amount, GCash reference, and screenshot fields. The screenshot will be uploaded to the private `topup-proofs` bucket under the authenticated worker’s namespace. The UI will then call `submit_manual_wallet_topup` with the amount, channel, reference, proof path, and idempotency key.

The visible action will be labeled as a manual GCash top-up. The existing simulated service can remain for legacy tests but will no longer be the primary worker UI.

### Status

The current schema exposes submission and admin-review mutations but does not provide a clearly scoped worker read contract. Add an owner-scoped read RPC (or an equivalent RLS policy with an explicit owner predicate) returning the worker’s recent top-ups and statuses. The mobile UI will show `PENDING`, `SUCCESSFUL`, or `FAILED`, refresh on screen focus, and poll only while a pending record exists. It will not expose another worker’s reference or proof path.

The admin approval remains in the separate admin repository. Mobile must treat the database status as authoritative and must not simulate approval.

## Non-goals

- No admin application changes.
- No edits to applied migrations.
- No manual edits to generated database types.
- No relaxation of wallet storage privacy or worker ownership checks.
- No reuse of the inactive Express backend.

## Tests and validation

- pgTAP coverage for nullable override inheritance, override application, bounds, effective-rate calculation, cash commission, and simulated-payment commission.
- pgTAP coverage for top-up ownership, idempotency, pending state, and status-read isolation.
- Edge contract tests for authenticated/admin access and response shape.
- Mobile tests for rate retrieval failure, manual proof upload, validation, idempotency key generation, and status refresh.
- `pnpm db:lint`, database tests, `pnpm db:types`, Edge function checks, mobile lint/type checks, and the relevant UAT flows.

## Risks and mitigations

- Percentage-versus-ratio confusion is mitigated by naming the schema/API value `*_percent` and converting once inside database functions.
- A stale generated type could mask a migration mismatch; type generation is a required validation step.
- Top-up status may change outside the mobile session; focus refresh plus bounded polling handles this without inventing client-side approval.
