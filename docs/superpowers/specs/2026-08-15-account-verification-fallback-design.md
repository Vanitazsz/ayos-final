# Account Creation and Verification Feedback Design

**Date:** 2026-08-15

## Goal

Make customer and worker account creation fail clearly when the submitted email or mobile number is already registered, and make verification status and the 2–3-day review window explicit after verification submission.

## Existing implementation

- Customer registration calls `signUpCustomer` from `apps/mobile/services/auth.ts` and routes successful email signup to the shared OTP screen.
- Worker registration calls `submitWorkerApplication` from `apps/mobile/services/workerApplication.ts`; the service creates the Auth user when no session exists and buffers the application until OTP verification.
- `apps/mobile/lib/workerRegistration.ts` already maps named duplicate-mobile and duplicate-email errors for the two registration services.
- Customer identity verification uses `submitCustomerVerification` and the existing `verify-identity` screen.
- Worker verification status is read and presented by `app/(worker)/verification.tsx`; the registration route has an existing submission-success modal.
- The database trigger already returns `MOBILE_ALREADY_REGISTERED`; no schema change is required.

## Design

### Duplicate account handling

1. Keep email normalization and Philippine mobile normalization at the existing service boundary.
2. Treat Supabase signup responses with an empty `identities` array as an existing-email result and stop before OTP.
3. Map duplicate email and duplicate mobile errors through the existing registration error helper so both customer and worker services produce actionable messages.
4. Preserve the Auth/database result as the final authority; client-side preflight lookup is not used as the only protection against concurrent registrations.

### Verification feedback

- Customer identity submission shows an alert stating `Pending review` and that verification may take `2–3 days`; the user continues to Home from the alert action.
- Worker registration success shows the pending status, the same review window, and the existing verification-status route as the place to monitor progress.
- The worker verification screen’s pending copy is updated to the same timeframe. Existing status values and administrator review behavior remain unchanged.

## Files in scope

- Modify the existing registration error helper, customer auth service, worker application service, customer registration screen, customer identity-verification screen, worker registration screen, and worker verification screen.
- Extend the nearest existing unit tests for registration errors and customer auth; extend the existing worker mobile E2E coverage only where its current fixtures can observe the behavior.
- No new route, shared state store, database migration, dependency, or Supabase client.

## Error and state behavior

- Duplicate email: `An account with this email already exists. Please sign in instead.`
- Duplicate mobile: `This mobile number is already registered. Sign in or use a different number.`
- Existing email returned without an Auth error: same duplicate-email message; no OTP navigation.
- Customer verification submission: `PENDING`/`pending` is shown as pending review; errors remain inline and in the existing alert path.
- Worker verification submission: `PENDING` is shown in the existing success modal and the existing verification screen remains the source of truth for later transitions.

## Testing strategy

- Unit tests first for duplicate error classification and empty-identity signup handling.
- Run each focused test red before implementing its production behavior, then green.
- Run the full mobile unit suite, mobile typecheck, lint, no-production-mocks check, and the relevant Playwright worker registration suite.
