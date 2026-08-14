# Homeowner Booking Cancellation Design

**Status:** Design approved for implementation

## Goal

Implement UAT#13 for the customer/homeowner account without changing working worker cancellation behavior:

1. Open an active booking and select **Cancel Booking**.
2. Select a homeowner cancellation reason.
3. Read the refund-policy information shown before confirmation.
4. Confirm the cancellation.
5. See the booking in the customer **Cancelled** tab with its cancellation reason.

## Existing implementation and constraints

- Customer active bookings currently open in `apps/mobile/app/tracking/[id].tsx`.
- The tracking screen already reads booking status, cancellation records, payment/refund data, and realtime status updates.
- Customer booking tabs already include `Cancelled` and group `CANCELLED` bookings correctly in `apps/mobile/services/bookingTabs.ts`.
- `apps/mobile/services/apiCore.ts` already calls the audited `public.cancel_booking` RPC, but the current `cancelBooking` wrapper supplies the worker-specific `DECLINED` reason and fallback text.
- `apps/mobile/app/(worker)/cancel-service/[id].tsx` already contains worker cancellation UI and must remain behaviorally unchanged.
- `public.cancel_booking` already validates booking-party authorization, lifecycle status, structured reason data, policy version, and writes the cancellation/status/audit records. No schema, migration, RLS, or RPC change is required.
- The database already defines the `REFUND_POLICY` content-page key. The mobile content-page type currently omits that key and will be extended locally.
- The repository confirms only generic refund-policy language; no exact fee or refund percentages are verified. The UI will not invent monetary terms.

## Design decision

Use a dedicated homeowner cancellation route linked from the existing tracking screen.

This keeps role-specific state and copy out of the worker cancellation route, keeps `tracking/[id].tsx` focused on booking status and actions, supports direct/deep-link entry, and gives the cancellation flow an isolated test boundary. The existing RPC, cancellation-reason query, theme, button primitive, confirmation component, and customer booking-tab logic will be reused.

## User flow

### Entry and authorization

- Show **Cancel Booking** on the customer tracking screen only while the booking status is not `COMPLETED` or `CANCELLED`.
- Navigate to `/cancel-booking/[id]`.
- The route checks the authenticated role using the existing auth store. Non-homeowner accounts are redirected to the existing worker surface; unauthenticated access remains governed by the existing session boundary.
- If the booking is already terminal or unavailable, do not attempt a mutation; show a safe message and return to bookings.

### Reason selection

- Load active rows from the existing `cancellation_reasons` query.
- Render only reasons whose `applies_to` value is `USER` or `BOTH`.
- Selecting a reason stores both its stable reason code and display label. A homeowner may use the existing `OTHER` reason when available; the submitted details remain at least three characters as required by the RPC.
- The confirm action remains disabled until a valid reason is selected.

### Refund-policy review

- Load the published `REFUND_POLICY` content through `fetchPublishedContentPage`.
- Show the policy title, body, and version above the destructive confirmation action.
- If the published policy is unavailable, show the verified generic policy copy already present in the repository's terms seed: cancellation eligibility depends on booking stage and cancellation reason, and disputes go through A-YOS support. Do not show invented amounts or promise a refund.
- Policy content is informational; the backend remains authoritative for the cancellation record and any resulting refund.

### Confirmation and success

- Submit through a new homeowner-specific client wrapper that reuses the existing `cancel_booking` RPC call path with the selected reason code, reason details, current booking stage, and displayed policy version.
- Do not optimistically change the booking status. Disable the action while the RPC is pending.
- On success, show the existing `CancellationConfirmation` component and navigate to the customer `Cancelled` tab through its existing callback.
- The existing booking feed/realtime refresh will load the persisted cancellation row and reason; the cancelled booking card remains the source of truth for the tab listing.

## Data and service boundaries

The flow remains:

```text
customer tracking route
  -> dedicated homeowner cancellation route
  -> existing Supabase client service wrapper
  -> public.cancel_booking RPC
  -> bookings, cancellations, booking_status_events, service_requests, audit_logs
```

The service change will factor the shared status-to-stage/RPC preparation only as needed. The public `cancelBooking(bookingId, reason)` worker-facing signature and its current worker defaults remain unchanged. No second Supabase client, direct booking update, or client-side authorization shortcut will be added.

## State and error handling

- Loading reasons/policy: show a visible loading state and keep confirmation unavailable.
- Empty or failed reasons: show an actionable error state and keep confirmation unavailable; never submit a fabricated reason.
- Failed policy fetch: use the verified generic fallback copy, without suppressing the failure silently.
- RPC pending: show a loading label, prevent duplicate submissions, and keep the route mounted.
- RPC authorization/lifecycle/network failure: keep the booking unchanged, show the returned error through the existing alert/action-error pattern, and allow retry when the booking remains cancellable.
- Slow/offline behavior: no optimistic cancellation and no navigation to the Cancelled tab until the RPC succeeds.
- Session expiry: preserve the existing authenticated Supabase error/session handling.
- Worker/administrator access: do not expose or reuse the homeowner flow as an authorization mechanism; route role separation and the RPC's booking-party checks remain authoritative.

## Accessibility and layout

- Use existing theme tokens and `Button`/`AppText` primitives.
- Give the destructive action a clear label and touch target, expose selected reason state, and keep policy content scrollable on phone-sized screens.
- Preserve safe-area handling, web responsiveness, back behavior, and existing customer navigation.

## Testing strategy

- Unit-test the customer cancellation service preparation/mapping without weakening the existing worker tests.
- Add route/component coverage for homeowner-only reasons, required reason selection, policy display, loading/error states, and successful confirmation behavior.
- Extend the customer Playwright flow with a mocked authenticated homeowner booking, cancellation-reason/policy reads, RPC success, and verification that the Cancelled tab contains the reason.
- Run the repository's mobile typecheck, lint, relevant Vitest tests, mobile-web export/build, and Playwright suite appropriate to the changed surface.

## Scope and rollback

This is a mobile-client-only change plus tests and design/plan documentation. It does not modify shared package contracts, Supabase migrations, Edge Functions, auth/session code, RLS policies, generated database types, or worker cancellation behavior. Rollback is limited to removing the new customer route/action/service wrapper and their tests; the existing RPC and worker flow remain intact.

