# Project Overview

## Background and problem

A-YOS addresses the difficulty of finding suitable local service workers, coordinating a booking, following service progress, settling payment, and preserving trustworthy feedback. It provides role-specific workflows for users, workers, and administrators and an optional AI-assisted request-preparation path.

## Goals and expected outcomes

- Help users describe a need, discover suitable approved workers, make a private booking, monitor service, pay, and review.
- Help workers maintain professional information, receive appropriate requests, progress accepted work, communicate, and confirm payment receipt.
- Help administrators control worker approval, accounts, operations, finance, support, communications, reports, settings, and audit evidence.
- Keep every implemented behavior traceable to FR-01–FR-104 or NFR-01–NFR-18.

## Target users and roles

- **User/Homeowner:** creates and manages service requests and bookings.
- **Worker:** offers services after administrator approval.
- **Administrator:** operates the protected web dashboard.

Each Supabase Auth identity has one immutable User, Worker, or Administrator role. User and Worker workspaces are permanently separated and direct cross-role navigation is rejected.

## Scope and boundaries

The application includes the mobile User/Worker experiences, administrator web dashboard, account security, a normalized 10-industry/50-skill worker catalog, structured worker approval, discovery/matching, booking lifecycle, dual-party Cash confirmation, manual verified Worker top-ups and payouts, reviews, messages, Expo Push notifications, private support attachments, CSV/XLSX/PDF reporting, and provider-backed AI/location/translation capabilities.

The complete UI port uses the supplied customer source and worker-refactor routes as its visual authorities while preserving the current backend capabilities. X and Apple authentication are intentionally excluded; Google is the sole credential-gated social provider. Direct pixel parity against independently running source applications is **Insufficient data to verify**; integrated phone, tablet, desktop, and Administrator drawer baselines pass.

Supabase Storage is the private media boundary. External email, Gemini/OpenAI AI and speech, OpenRouteService geocoding/routes, Expo Push, and Google Cloud Translation providers remain system boundaries; local contract tests are not substitutes for sandbox acceptance.

## Success criteria

Success requires every confirmed requirement to have implementation evidence, executed validation, synchronized documentation, and an honest final classification. Production readiness also requires real providers, credentials, legal content, production infrastructure, measurable performance targets, and recovery objectives.
