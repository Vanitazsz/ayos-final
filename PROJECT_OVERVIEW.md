# Project Overview

## Purpose

A-yos connects Philippine customers who need household/property services with verified workers and gives administrators operational control over identity, catalog, bookings, payments, support, safety, AI, reports, and platform settings.

## Business goals

- Convert service intent into a traceable request with a confirmed address and PostGIS point.
- Match only eligible verified workers through deterministic, auditable rules.
- Support direct matching and open bidding without granting AI authorization power.
- Preserve every booking, payment, wallet, notification, support, and moderation transition.
- Give administrators real operational data rather than mock metrics.
- Offer AI assistance with explicit per-request consent and a complete manual path.

## Target users

| User | Capabilities |
| --- | --- |
| Customer | Register/login, manage profile/address, create requests, use optional AI, select workers, chat, track, confirm cash, review, receive notifications |
| Worker | Register secondary role, submit verification, manage skills/availability, discover jobs, bid, execute booking transitions, chat, view wallet/payouts |
| Administrator | Authenticate with administrator validation/AAL2, manage accounts/workers/catalog/bookings/payments/reviews/support/campaigns/settings/reports/audit |
| Background service | Process provider requests, reports, queued work, notifications, analytics, and protected Storage using service-role access |

Google OAuth always provisions the customer role. Email or Google metadata cannot grant worker or administrator access.

## Core modules

1. Identity, sessions, roles, permissions, account status, and recovery.
2. Service categories, industries, skills, services, offerings, price bounds, and availability.
3. Addresses, PostGIS coordinates, OpenRouteService geocoding/routing, and MapLibre rendering.
4. Requests, AI analysis, deterministic matching, applications/bids, and booking selection.
5. Booking lifecycle, tracking, conversations, messages, attachments, notifications, and cancellations.
6. Cash payments, receipts, wallets, append-only ledger, payout methods, and payout decisions.
7. Reviews, votes, reports, replies, AI insights, and administrator moderation.
8. Support, campaigns, report exports, system settings, audit, trash/recovery, and dashboards.

## System behavior

Clients keep UI state in Zustand and remote state in React Query/Supabase subscriptions. Supabase Auth issues sessions. RLS and RPCs enforce data ownership and state transitions. Edge Functions hold provider secrets and normalize AI, geocoding, route, and report responses. Realtime refreshes jobs, bookings, chat, notifications, AI job state, and administrator operational screens.

## Functional scope

The production schema and Edge Functions are deployed to project `qsurouiyvisykjkgjqmz`. Both clients are wired to the hosted project. Google code paths are present but cannot complete until OAuth credentials are configured. AI code paths are deployed but disabled by feature flag until the missing OpenAI key and evaluation gates are satisfied.

GCash/card, SMS, Apple/X login, and push delivery are explicitly out of active scope until credentials/providers are supplied. Cash and in-app notifications are active application paths.

## Non-functional requirements

- Preserve hosted records, Auth users, Storage objects, IDs, and protected administrator accounts.
- Additive, reproducible migrations with zero linked-schema drift.
- RLS on application tables and UUID-owned private Storage paths.
- Fixed-search-path security-definer functions with explicit grants and bounded inputs.
- Idempotent transactional operations for requests, AI jobs, payments, wallet entries, payouts, and reports.
- PostGIS indexes and bounded pagination/search for predictable performance.
- No secrets in clients; provider access occurs only in authenticated Edge Functions.
- Loading, success, empty, error, permission-denied, and retry behavior for data-bearing screens.
- Human control over safety, authorization, moderation, and final service decisions.
## Real-profile invariant

Every displayed customer, worker, administrator, review author, booking participant, support participant, and report requester is resolved from a hosted database profile. Missing required relationships are integrity errors. Optional values use empty/unavailable states, never sample identities or fabricated metrics. Profile media is private and owner-scoped in Supabase Storage.
