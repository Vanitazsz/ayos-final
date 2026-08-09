# Phase 3 Tracking Completion Design

## Status

Approved design. This document defines the tracking lifecycle, location persistence, and worker-denial behavior.

## Objective

Give customers explicit arrival and completion controls, retain en-route location history, and make worker permission/proximity denials understandable without weakening worker-only validation.

## Verified existing contracts

- `useBookingTracking` owns customer tracking state, realtime subscriptions, and completion actions.
- Worker arrival is validated by `validate_and_confirm_worker_arrival`, including assigned-worker and proximity checks.
- `record_worker_location` already persists location updates while the booking is in an en-route/service state.
- `startEnRouteLocationPublisher` currently broadcasts location but does not call the persistence RPC and silently stops when permission is denied.
- Customer tracking currently offers a completion button but no explicit arrival action, Call action, or Emergency action.
- Current status transitions are role-sensitive; customer actions must not reuse the worker-only arrival RPC.

## Design

### Customer arrival and completion

Add customer-scoped, idempotent RPC actions:

- `confirm_customer_arrival`: current customer only; accepts `WORKER_EN_ROUTE` and treats an already-arrived state as success. It records the customer confirmation and advances the canonical booking status only according to the approved lifecycle transition.
- `confirm_customer_completion`: current customer only; accepts `PENDING_CONFIRMATION` and treats an already-completed state as success. It records the confirmation and advances the canonical status without bypassing payment requirements.

The UI will show the arrival action while the worker is en route and the completion action at pending confirmation. Database row locking and status checks will make races with worker arrival/completion safe. The existing worker proximity check remains required for the worker’s arrival action.

If the current status model cannot represent customer acknowledgement without advancing the status, the migration will add the smallest auditable confirmation record needed rather than overloading a status event.

### Location persistence

On each accepted en-route location update, the publisher will retain the existing realtime broadcast and call `record_worker_location`. Persistence failures will be surfaced to the worker through the publisher callback/state, while a transient database failure will not falsely report that a location was persisted. Updates will remain subject to the existing status, assignment, and RLS checks.

Foreground location permission denial will produce a visible worker message with a retry path. The publisher will not claim active tracking after permission is denied.

### Customer actions

Tracking will add:

- Call via a sanitized `tel:` URL using the worker contact already present in tracking data;
- Emergency via a confirmation-gated local emergency call action; and
- clear error states for rejected arrival/completion actions.

The UI will not expose private location data or worker contact details before the existing booking authorization allows them.

### Worker denial

The worker arrival response will preserve structured denial information such as proximity/permission failure. The worker screen will display the server message rather than a generic failure. The customer screen will reflect the canonical booking state and any persisted denial/availability state exposed by the tracking contract; it will not infer arrival from a broadcast alone.

## Non-goals

- No bypass of proximity validation.
- No automatic customer completion.
- No background location permission expansion beyond the existing publisher contract.
- No redesign of the realtime channel protocol.

## Tests and validation

- Database tests for customer ownership, allowed statuses, idempotency, race-safe transitions, and worker-role rejection.
- Mobile hook/component tests for action visibility and rejected-action messages.
- Publisher tests for persistence calls, permission denial, and persistence failure state.
- Playwright/UAT coverage for arrival, completion, Call, Emergency, denial, and location history.
- Generated database types and Supabase function checks.
