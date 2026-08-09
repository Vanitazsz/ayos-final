# Phase 1 Mobile UAT-Critical Fixes Design

## Status

Approved design. This document defines the implementation boundary for the Phase 1 mobile-only fixes.

## Objective

Close the mobile UAT gaps around post-payment review navigation, proof-of-work visibility, worker skill selection, password feedback, and profile readiness without changing the database schema or introducing a migration.

## Verified existing contracts

- `apps/mobile/app/payment/success.tsx` currently navigates to `/booking/${bookingId}` for booking details.
- `apps/mobile/app/review/[id].tsx` has an unconditional home navigation in its submit `catch`/`finally` path, so a failed review can appear successful.
- `create_review` is protected by the database uniqueness rule for one review per booking, but the mobile client has no pre-check service.
- `fetchBookingProofPhotos` already reads private booking-proof media and creates signed URLs.
- `useBookingTracking` is the existing owner of tracking data and subscriptions.
- `save_my_worker_skills(p_industry_ids, p_skills)` already rejects skills outside the selected industries.
- `apiCore.ts` still contains a legacy single-industry RPC retry that is not present in the generated Supabase contract.
- Customer registration uses React Hook Form and already watches the password field; worker registration keeps password state locally.
- Worker verification can obtain the backend `profile_complete` value through `getMyProfile`.

## Design

### Review flow

Add a focused `fetchReviewForBooking` service query returning the existing review identifier when present. The payment success screen will:

1. Load the review state for the booking.
2. Render `Rate your experience` only when the booking identifier is present and no review exists.
3. Route the CTA to `/review/${bookingId}`.
4. Route `View Booking Details` to `/booking-summary/${bookingId}`.

The review screen will perform its own pre-check because it can be entered from other routes. An existing review will render a submitted state and will not submit a duplicate. Review submission will navigate only after a successful `create_review` result; upload or RPC errors will remain visible to the user.

The query will be scoped by the authenticated user and will fail closed for duplicate prevention. A failed pre-check will not be treated as proof that no review exists.

### Proof photos

Extend `useBookingTracking` with proof-photo state and load `fetchBookingProofPhotos(bookingId)` only when the status is `PENDING_CONFIRMATION` or `COMPLETED`. Render the signed images in `tracking/[id].tsx` using the existing booking-summary visual conventions. No proof URL will be requested or displayed for earlier statuses.

### Worker skills

Introduce one shared compatibility helper based on the loaded industry/category catalog. `toggleIndustry` will remove selected skills and rate entries whose categories belong only to a deselected industry. Before `save_my_worker_skills`, the service will filter the selected skill payload against the selected industry IDs as a second client-side guard. The database validation remains authoritative.

Remove the obsolete single-industry retry in `updateMyWorkerSkillsAndIndustry`; an RPC error will be returned to the caller instead of being hidden by a legacy signature.

### Password feedback

Create a shared `PasswordRequirements` component and pure requirement evaluator. It will expose live states for:

- minimum length;
- uppercase character;
- number;
- symbol; and
- confirmation matching, when a confirmation value is provided.

Customer registration will pass `watch('password')` and `watch('confirmPassword')`. Worker registration will pass its existing local state. The checklist is informational and accessible; existing form validation remains authoritative.

### Profile readiness

Create a shared `ProfileReadinessBanner` that accepts completion state, missing labels, and an action. On worker verification it will use the authenticated `profile_complete` result and route to personal information. On worker registration it will derive missing account, contact, industry/skills, and address values from the current form state, show the banner immediately before identity verification, and send the user to the first incomplete registration step. The banner will not block identity uploads.

### Broken target

Change `new-request/success.tsx` from the missing `/request/${requestId}` route to the existing `/new-request/matching` route. The request identifier remains in the existing matching state/publisher flow; no new `/request/[id]` route will be created.

## Non-goals

- No database migration.
- No changes to the inactive legacy Express backend.
- No changes to admin UI code in another repository.
- No deletion of orphan routes in this workstream.

## Tests and validation

- Unit tests for review-state handling, skill compatibility filtering, password requirements, and profile-readiness derivation.
- Mobile component/service tests for success/error navigation and duplicate-review prevention.
- Existing mobile lint and TypeScript checks.
- Targeted mobile Playwright/UAT checks for the payment, review, tracking, registration, and worker registration paths.
- Repository traceability checks after requirements updates in the documentation workstream.

## Risks and mitigations

- A review pre-check may fail because of a transient read error; the UI will not expose a duplicate-submit path when the state is unknown.
- Private proof URLs may expire; the existing signed-URL behavior and loading/error state will be reused.
- A stale skill can still be submitted by a non-mobile client; the database RPC remains the final enforcement point.
