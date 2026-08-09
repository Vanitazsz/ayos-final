# A-YOS AI Coding Guardrails

## 1. Purpose

This file prevents AI-generated duplication, uncontrolled refactoring, architectural drift, broken features, oversized files, and inconsistent design patterns in A-YOS.

> Every AI agent must read this file before analyzing, planning, or modifying the project.

These rules apply to the entire pnpm workspace: the Expo mobile/web client, shared packages, Supabase migrations and Edge Functions, tests, scripts, and documentation. The administrator client was moved to a separate repository. Preserve existing user behavior, database integrity, authorization, and migration history. A task request is not permission to clean up unrelated code.

## 2. Project Context

| Area                      | Confirmed implementation                                                                                                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product                   | A local service-matching and booking platform for permanently separated customer (`USER`), worker (`WORKER`), and administrator (`ADMIN`) accounts                                                                                  |
| Repository                | pnpm 11.9 workspace and Turborepo 2.5 monorepo (`apps/*`, `packages/*`, `tests/*`)                                                                                                                                                  |
| Mobile/user-worker client | Expo 54, React 19.1, React Native 0.81.5, React Native Web 0.21, TypeScript 5.9, Expo Router 6 file-based routes                                                                                                                    |
| Administrator client      | **Moved to a separate repository (deleted from this tree).** Backend provisioning (`pnpm admin:bootstrap`, `admin-invite-account`) remains in this repo                                                                             |
| Backend                   | Supabase PostgreSQL 17/PostGIS, Auth, Data API, Storage, Realtime, Edge Functions, queues, cron, and Vault                                                                                                                          |
| Authentication            | Supabase email/password, email OTP, password recovery, Google OAuth support, persisted sessions, database-backed role/profile checks; Admin additionally requires the protected bootstrap flow and AAL2/TOTP for sensitive commands |
| Mobile state              | Zustand for auth, request drafts, and worker booking UI state; React Context for worker presence; TanStack Query is provided at the root but no `useQuery`/`useMutation` usage was found                                            |
| External services         | Gemini, OpenAI, and OpenRouter AI providers; OpenRouteService; MapLibre; Expo Push; Supabase Storage and Realtime                                                                                                                   |
| Styling                   | React Native `StyleSheet` plus `apps/mobile/constants/theme.ts`                                                                                                                                                                     |
| Important features        | Authentication, customer requests, live worker dispatch/matching, bookings, chat, tracking, worker registration/verification/profile, wallet/top-ups, reviews, content pages, and administrator operations (via the separate repo)  |
| Tests                     | Vitest package/mobile tests, pgTAP database tests, Deno Edge Function test/checks, and Playwright mobile-web suites                                                                                                                 |

Native release signing, final production legal content, production OAuth callback domains, retention policy, performance targets, RPO, and RTO are **Not confirmed from the current repository**.

Common commands from the root are `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm verify`. Local database work uses `pnpm supabase:start`, `pnpm db:reset`, `pnpm db:lint`, `pnpm test:db`, and `pnpm db:types`.

## 3. Source-of-Truth Files

| Responsibility                 | Source of truth                                                                                               | Rule                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace scripts/dependencies | `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`                                         | Run root scripts where possible; never hand-edit the lockfile                                                                            |
| Mobile dependencies/scripts    | `apps/mobile/package.json`                                                                                    | Check Expo/RN compatibility before adding anything                                                                                       |
| Mobile routes                  | `apps/mobile/app/` and layouts in `apps/mobile/app/_layout.tsx`, `(tabs)/_layout.tsx`, `(worker)/_layout.tsx` | Expo Router file paths are route names; search every navigation literal before changing one                                              |
| Admin routes                   | Separate repository (deleted from this tree)                                                                  | Do not recreate an admin client stack in this repository                                                                                 |
| Mobile auth/session            | `apps/mobile/services/auth.ts`, `apps/mobile/store/useAuthStore.ts`, `apps/mobile/app/_layout.tsx`            | Do not create another session store or bypass `loadCurrentUser`                                                                          |
| Admin auth/session             | Separate repository (deleted from this tree)                                                                  | Backend bootstrap (`scripts/bootstrap-admin.ts`, `admin-invite-account`) remains here and must stay RLS/AAL2-safe                        |
| Mobile Supabase client         | `apps/mobile/lib/supabase.ts`                                                                                 | This is the only mobile client instance                                                                                                  |
| Admin Supabase client          | Separate repository (deleted from this tree)                                                                  | No admin browser client exists in this repository                                                                                        |
| Edge Function clients/auth     | `supabase/functions/_shared/auth.ts` and `supabase/functions/_frontend_shared/supabase.ts`                    | Two established helper families exist; reuse the family already used by the target function and do not initialize clients in an endpoint |
| Database schema/history        | `supabase/migrations/`                                                                                        | Migrations are canonical and append-only; do not treat `dbsql.md` or `dbtables.md` as executable authority                               |
| Generated DB types             | `packages/supabase/src/database.generated.ts`                                                                 | Regenerate with `pnpm db:types`; never edit manually                                                                                     |
| Shared DB/storage contracts    | `packages/supabase/src/index.ts`                                                                              | Reuse bucket and realtime-topic helpers                                                                                                  |
| Mobile service/data access     | `apps/mobile/services/`                                                                                       | Prefer focused services; `services/api.ts` is legacy-central and must not grow casually                                                  |
| External-function invocation   | `apps/mobile/services/authenticatedFunctions.ts`                                                              | Use its authenticated invocation and session-expiry behavior                                                                             |
| Mobile theme                   | `apps/mobile/constants/theme.ts`                                                                              | Use existing tokens; note that lowercase and PascalCase token families currently compete in this one file                                |
| Mobile shared UI               | `apps/mobile/components/`                                                                                     | Search both `App*` components and nested component families before adding UI                                                             |
| Mobile global/flow state       | `apps/mobile/store/`                                                                                          | Zustand is canonical for auth and the current request draft                                                                              |
| Worker presence                | `apps/mobile/context/WorkerPresenceContext.tsx`                                                               | Keep subscription lifecycle in this provider                                                                                             |
| Shared domain/contracts        | `packages/domain/src/`, `packages/contracts/src/`                                                             | Prefer these types, schemas, enums, errors, events, and domain functions over client-local duplicates                                    |
| Environment examples           | `.env.example`, `apps/mobile/.env.example`                                                                    | Never invent names or expose server secrets through `EXPO_PUBLIC_*`/`VITE_*`                                                             |
| TypeScript                     | `tsconfig.base.json`, package `tsconfig.json` files, `apps/mobile/tsconfig.json`                              | Preserve strictness; the mobile app extends Expo's config rather than the root base                                                      |
| Lint/format                    | `eslint.config.mjs`, `apps/mobile/eslint.config.js`, `.prettierrc.json`                                       | Do not disable rules to hide failures                                                                                                    |
| Test runners                   | `vitest.config.ts`, `apps/mobile/vitest.config.ts`, `playwright.config.ts`, `supabase/tests/database/`        | Put tests in the existing suite nearest the behavior                                                                                     |
| Supabase local/build config    | `supabase/config.toml`, root `package.json`, `apps/mobile/app.json`, `vercel.json`                            | Do not create parallel configuration without approval                                                                                    |
| Requirements/traceability      | `REQUIREMENTS.md`, `requirements/catalog.json`, `scripts/check-traceability.ts`                               | Update traceability when requirements or contracted behavior changes                                                                     |

Conflicts to manage deliberately:

- `apps/mobile/constants/theme.ts` contains both lowercase (`colors`, `spacing`, `radius`) and PascalCase (`Colors`, `Spacing`, `Radius`) token APIs. Treat the file as canonical; use the token family already used by the component being changed and do not add a third palette.
- `apps/mobile/components/AppButton.tsx` and `AppInput.tsx` are the canonical primitives. Compatibility props preserve migrated legacy callers; do not create another primitive family.
- `apps/mobile/store/useRequestStore.ts` is the canonical request-flow state. Do not introduce a parallel request context or store.
- Edge Functions use two client-helper families. This is an established boundary conflict, not permission to create a third helper.

## 4. Mandatory Pre-Change Procedure

Before editing code, every AI agent must:

1. Read this file.
2. Read the relevant route, screen, component, hook, service/repository, type, migration, and test files.
3. Search the whole repository for an existing implementation and all callers.
4. Identify affected modules, reusable code, and likely duplicates.
5. Check navigation paths/parameters and direct/deep-link callers.
6. Check database tables/RPCs, migrations, API/Edge Functions, Realtime, and Storage dependencies.
7. Check authentication, role, RLS, AAL2, and authorization implications.
8. Check existing unit, database, contract, security, and E2E tests.
9. List files to modify, create, and possibly remove. Explain every new file and removal.
10. Describe expected behavior and relevant loading, error, empty, success, slow/offline, and unauthorized states.

Provide a short plan before editing:

```text
Goal
Existing implementation found
Files to reuse
Files to modify
Files to create
Risks
Validation steps
```

For this repository, also state whether the task touches mobile, shared packages, Edge Functions, migrations, or more than one of these. Do not start a multi-surface change without tracing the shared contract.

## 5. Mandatory Repository Search

Before creating a component, screen, route, hook, service, repository function, API client, query, utility, type, interface, enum, schema, theme token, style helper, context, provider, store, modal, button, input, card, header, loading/empty/error state, permission check, auth helper, or navigation helper, search for an existing equivalent with `rg`.

At minimum, search:

- `apps/mobile/components/`, `hooks/`, `services/`, `store/`, `context/`, and `app/`;
- `packages/contracts/src/`, `packages/domain/src/`, and `packages/supabase/src/`;
- `supabase/migrations/` and `supabase/functions/` for table, RPC, policy, event, and endpoint names.

Reuse, extend, compose, or incrementally refactor existing code. A new implementation must include:

```text
Existing implementations checked
Reason they cannot be reused
Reason the new implementation is required
```

Never use convenience as the sole reason to add a parallel implementation.

## 6. Architectural Boundaries

The intended client flow is route/screen -> hook or screen coordinator -> service -> Supabase/Edge Function. Existing violations are technical debt, not patterns to copy.

### Routes

Expo route files may read parameters, configure navigation, redirect, and render/compose a screen. Route files must not initialize clients, issue raw queries, hold large forms, reproduce service logic, or accumulate hundreds of style lines. **50 lines is a warning threshold**, especially for compatibility/redirect routes. Existing route files are frequently full screens; improve them only within task scope.

### Screens/pages

Screens/pages may compose components, call feature hooks/services, coordinate screen interactions, and render loading/error/empty/success states. They must not initialize Supabase, duplicate shared UI, contain unrelated workflows, or add raw database/Storage/RPC calls. **150 lines is a warning threshold.** Existing oversized screens require incremental extraction by responsibility, not blind splitting.

### Components

Components focus on presentation and interaction. Shared mobile components live in `apps/mobile/components/`; feature-specific components should live near their feature when introduced through a reviewed plan. Components do not access Supabase. **120 lines is a warning threshold.**

### Hooks

Hooks coordinate reusable React behavior, mutations, subscriptions, loading, and errors, and call services. Keep each hook focused and clean up every subscription/listener/timer. `apps/mobile/hooks/useConversationChat.ts` is the established chat coordinator. **120 lines is a warning threshold.**

### Services and repositories

Services own database operations, RPCs, Edge Function calls, Storage, external APIs, boundary transformation, and Realtime setup. Use typed parameters/returns, consistent errors, no JSX, and no navigation/UI behavior. Prefer focused files such as `addresses.ts`, `profile.ts`, or `liveDispatch.ts`; do not keep enlarging `apps/mobile/services/api.ts`. **200 lines is a warning threshold.**

Line limits are warnings, not automatic reasons to split. Separate by responsibility and migration safety, never by line count alone.

## 7. Database and Supabase Constraints

- Mobile uses only `apps/mobile/lib/supabase.ts`. Their separation is platform-specific and intentional.
- Edge Functions must reuse `supabase/functions/_shared/auth.ts` or `_frontend_shared/supabase.ts` according to the target function's existing family. Never initialize a client in a screen, component, hook, page, or endpoint.
- Move existing route-level raw queries toward `apps/mobile/services/` incrementally. Do not add new raw queries to `app/`.
- Search `apps/mobile/services/api.ts`, focused services, migrations, and generated types before creating or renaming a query/RPC.
- `supabase/migrations/` is append-only schema history. Do not edit an applied migration unless explicitly directed for an unshipped local-only migration. Never reorder, duplicate, squash, or force hosted migration history.
- Do not change schemas, table/column names, RLS policies, grants, triggers, buckets, or RPC signatures without explicit approval and impact analysis.
- Never delete fields or database objects because code search shows no caller; SQL, RLS, hosted clients, queues, reports, and external consumers may use them.
- Sensitive lifecycle mutations use transactional security-definer RPCs. Preserve that boundary; UI visibility is not authorization.
- Every mutation must inspect and handle the Supabase error result. Define response types and use `packages/supabase/src/database.generated.ts` instead of broad `any` where possible.
- Preserve RLS, private buckets, signed URL behavior, private Realtime topics, account separation, audit logging, and AAL2 assumptions.
- Never expose `SUPABASE_SECRET_KEY`, service-role aliases, AI/provider keys, or `EDGE_FUNCTION_SHARED_SECRET` in client code.
- Database changes require a forward migration, rollback considerations (manual rollback only when appropriate), regenerated types, pgTAP coverage, and hosted/local history awareness.
- Treat `supabase/sql-editor-*.sql`, `dbsql.md`, `dbtables.md`, and `migrations_archive/` as dangerous operational/reference artifacts. Do not run or edit them casually.

Actual database locations: `supabase/config.toml`, `supabase/migrations/`, `supabase/functions/`, `supabase/tests/database/`, `supabase/seed.sql`, and `packages/supabase/src/database.generated.ts`.

## 8. Navigation Constraints

Mobile uses Expo Router file routes under `apps/mobile/app/`; customer and worker protected tabs are configured in their `_layout.tsx` files, with global guards in `app/_layout.tsx`. The administrator client moved to a separate repository.

- Do not rename/move a route until every `router.push`, `router.replace`, `Redirect`, `Link`, notification payload, OAuth callback, test, and deep-link reference is found.
- Do not duplicate route names or create another navigation stack when an existing group can be extended.
- Preserve parameter meaning. The current messaging route accepts either `conversationId` or booking `id`; do not silently conflate them.
- Keep navigation parameter types centralized when adding typed contracts; do not use `as any` to evade Expo typed routes.
- Check the `ayos` scheme, Supabase redirect URLs, OAuth callback at `app/auth/callback.tsx`, and Vercel/web paths before path changes.
- Never bypass root/customer/worker guards, create circular redirects, or put a full feature in a compatibility route.
- Verify direct protected-route entry, role mismatch, incomplete profiles, browser/native back behavior, notification navigation, and logout/session expiration.
- Known hazard: `apps/mobile/app/new-request/success.tsx` navigates to `/request/${requestId}`, but no `app/request/[id].tsx` exists. Do not copy or expand this target; resolve it in a focused navigation fix.
- `app/chat/[id].tsx` and `app/messages/chat.tsx` overlap but have different entry contracts. Do not add a third chat route; document and migrate callers before consolidation.

## 9. Authentication and Authorization Constraints

The mobile login flow is implemented by `apps/mobile/services/auth.ts`, synchronized in `app/_layout.tsx`, and stored in `useAuthStore.ts`. It accepts only active `USER` and `WORKER` accounts whose database profile and active role match the Auth user. Customer signup uses role metadata `USER`; worker registration has a separate flow. Google OAuth returns through `app/auth/callback.tsx`.

Admin authentication and authorization are enforced in the database and consumed by the separate administrator repository: `is_admin`, `get_my_profile`, active `ADMIN` role, active-role equality, a complete profile, and AAL2/TOTP for sensitive commands. This repository keeps the secure bootstrap migration, `scripts/bootstrap-admin.ts`, and the `admin-invite-account` Edge Function intact.

- Do not add public signup unless explicitly requested; never add Admin self-registration.
- Do not add a second auth provider, session context/store, or auth listener.
- Never hardcode a user/session or bypass protected routes for testing.
- Do not rename `USER`, `WORKER`, or `ADMIN` without tracing generated enums, migrations, RLS, functions, clients, tests, and hosted data.
- Hidden buttons are not permission checks. Preserve RLS/RPC authorization and Admin AAL2 requirements.
- Do not persist sensitive tokens outside Supabase's established session storage. Mobile native persistence uses AsyncStorage through the configured client; web uses Supabase browser handling.
- Preserve sign-out, local sign-out on invalid mobile roles, refresh-token rotation, 15-minute JWT expiry, session-expiration messaging, incomplete-profile redirects, and account-status checks.
- Do not weaken `SessionBoundary`, `loadCurrentUser`, bootstrap protections, or database role checks for convenience.

## 10. Styling and Design-System Constraints

- Mobile theme authority is `apps/mobile/constants/theme.ts`. Reuse existing color, typography, spacing, radius, shadow, layout, touch-target, button, avatar, and icon tokens.
- Do not create another palette or token file. The two naming families already in `theme.ts` are sufficient pending consolidation.
- Extend `AppButton` and `AppInput` when a shared variant is required. Do not introduce `NewButton`, feature-local generic buttons, or another shared system.
- Keep feature layout styles near the feature; do not move all styles into one global sheet.
- Avoid magic colors/spacing. Hardcoded colors are already concentrated in `app/(worker)/verification.tsx`, `(auth)/login.tsx`, and `(tabs)/bookings.tsx`; do not copy them.
- Preserve safe-area handling (`SafeAreaProvider`, `react-native-safe-area-context`), responsive web behavior, portrait/native assumptions, tablet support, and `Platform`/`.native`/`.web` implementations.
- Preserve accessible contrast, labels, focus/keyboard behavior, touch targets, loading affordances, and reduced ambiguity in destructive actions.
- For visual UI changes, use the repository-required Playwright workflow and the existing mobile-web project; native visual verification remains a separate manual/simulator concern.

## 11. State-Management Constraints

Use the smallest appropriate state scope:

| State kind         | Current mechanism                                                                             | Rule                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Server state       | Service calls plus screen/hook local state; TanStack Query provider exists but is not adopted | Do not introduce a parallel cache strategy during a feature fix; adoption requires an explicit plan |
| Authentication     | Mobile `useAuthStore`                                                                         | Never duplicate                                                                                     |
| Global/flow state  | Mobile Zustand stores in `apps/mobile/store/`                                                 | Reuse only for cross-route state                                                                    |
| Worker presence    | `WorkerPresenceContext`                                                                       | Keep subscription lifecycle here                                                                    |
| Feature state      | Feature hooks or screen-local state                                                           | Keep scoped to the feature                                                                          |
| Temporary UI state | Component/screen `useState`                                                                   | Do not globalize modal, selection, or animation state without a reason                              |
| Form state         | Existing local state and `react-hook-form` where already used                                 | Do not add a competing form library                                                                 |

`useRequestStore.ts` is the single request-draft source. Keep cross-route request state there and feature-local UI state in controllers.

Clean up subscriptions, AppState listeners, channels, timers, location publishers, and auth listeners. Avoid unstable effect dependencies and repeated fetching. Do not duplicate server data across Zustand, Context, TanStack Query, and component state.

## 12. API and External-Service Constraints

Confirmed integrations are Supabase Edge Functions/Storage/Realtime, Gemini, OpenAI, OpenRouter, OpenRouteService, MapLibre, Expo Location/Camera/Image Picker/Audio, and Expo Push. AI/geocoding/route provider calls are server-side under `supabase/functions/_frontend_shared/`; mobile calls authenticated Edge Functions through `apps/mobile/services/authenticatedFunctions.ts`.

- Use existing clients and service wrappers. Do not call provider endpoints from presentation code.
- Never hardcode or commit provider keys. Public map style and client Supabase publishable settings are the only relevant client-public configuration.
- Centralize request configuration, validate external responses, handle timeouts/failures/rate limits, and retain fail-closed behavior when bindings are missing.
- Preserve AI consent (`EXPO_PUBLIC_AI_CONSENT_VERSION`), structured validation, retry/provider-attempt audit behavior, and restrictions on sensitive media/data.
- Preserve OpenRouteService behind Edge Functions and MapLibre's platform-specific surfaces. Do not replace a provider without explicit approval.
- Preserve Expo push authentication and queue idempotency; do not archive queue work after a failed mutation.
- Do not implement the same endpoint in `api.ts`, another service, and a route. Consolidate callers incrementally.
- The repository references `OPENROUTER_API_KEY`/`OPENROUTER_MODEL` in Edge code but root `.env.example` does not list them. Treat these names as an existing documentation/config mismatch; do not invent substitutes.

## 13. TypeScript Constraints

Root shared packages use strict TypeScript with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, and typed linting. Mobile has `strict: true` but extends Expo's base separately.

- Do not weaken either TypeScript configuration or add suppressions to make a change compile.
- Avoid `any`; use `unknown` for untrusted values and narrow it. Document the rare unavoidable `any` at the boundary.
- Reuse database types from `packages/supabase/src/database.generated.ts`, contracts/schemas from `packages/contracts/src/`, domain types from `packages/domain/src/`, and existing mobile service types.
- Keep database/API responses, route parameters, component props, hooks, and mutations explicit. Runtime-validate external/JSON values.
- Do not create duplicate entity interfaces. In particular, `WorkerProfile`/profile view shapes already compete across `services/api.ts` and `services/profile.ts`; do not add another.
- Do not use route assertions (`as any`/`as never`) as a substitute for a real route/parameter contract.
- Important weak typing is concentrated in `apps/mobile/services/api.ts`, `useRequestStore.ts`, many large mobile routes, and shared UI style props. Improve touched boundaries incrementally; do not attempt a repository-wide typing rewrite in a feature task.
- Never manually edit the generated database types.

## 14. Dependency Constraints

- Inspect root and target-workspace `package.json` plus current imports before adding anything.
- Prefer installed libraries. Do not add a competing router, state manager, query/cache, form library, UI kit, map library, HTTP client, test runner, or Supabase wrapper.
- Do not upgrade unrelated dependencies or remove a dependency without repository-wide import and runtime checks.
- Verify Expo SDK 54, RN 0.81, React versions, web compatibility, and native-build/config-plugin requirements.
- Use pnpm from the repository root and update `pnpm-lock.yaml` through pnpm only. Never manually edit lockfiles.
- A dependency proposal must state:

```text
Package
Purpose
Existing alternatives checked
Compatibility
Bundle-size or native impact
Reason it is required
```

Explicit approval is required before introducing a new global state library, database client, external provider, native module, or competing framework.

## 15. Feature-Change Constraints

For every feature change:

1. Locate the current routes, UI, hooks, services, RPCs/tables, contracts, and tests.
2. Identify the feature source of truth and all client surfaces.
3. Reuse existing routes/screens, hooks, services, UI states, and contracts.
4. Preserve behavior unless the request explicitly changes it.
5. Keep unrelated modules and formatting untouched.
6. Do not rewrite a whole feature for a small request or change a public signature before checking callers.
7. Do not create a parallel `V2`, `New`, `Fixed`, or duplicate route.
8. Update the nearest unit/contract/database/E2E tests and relevant documentation/traceability.
9. Validate loading, error, empty, success, slow/offline, unauthorized, and session-expired behavior where applicable.
10. Validate navigation, role separation, Realtime cleanup, Storage privacy, and back behavior.

Cross-surface changes must preserve database contracts. A client-only workaround must not replace an authorization invariant.

## 16. Refactoring Constraints

Refactor incrementally, one feature or responsibility at a time. Record current behavior and tests first. Do not combine a major architecture migration with new functionality, mass rename/move files, or delete duplicates before all callers migrate. Use adapters during transitions, keep change groups small, provide rollback steps, and validate after each migration. Stop and document unrelated failures.

Recommended order for this repository:

```text
1. Documentation and guardrails
2. Shared configuration and environment documentation reconciliation
3. Mobile theme-token convergence
4. Shared mobile UI-state/component convergence
5. Mobile request-state consolidation
6. Extract one low-risk slice from services/api.ts and one oversized route
7. Remaining features one at a time
8. Dead-code removal only with caller/runtime proof
9. Boundary enforcement (lint/tests)
10. Final cross-surface validation
```

Do not treat “rewrite the application” as permission for destructive work without an approved, staged design, migration plan, backups/rollback, and behavior characterization.

## 17. PROHIBITED AI BEHAVIORS

- Do not rewrite the entire system without a reviewed plan.
- Do not delete modules, migrations, SQL artifacts, fields, routes, or features because they appear unused.
- Do not remove features outside the request.
- Do not invent tables, columns, RPCs, roles, route names, environment names, or provider behavior.
- Do not present mocks, placeholders, or unavailable providers as functional production behavior.
- Do not add duplicate pages or names such as `NewProfile`, `ProfileV2`, or `FixedProfile`.
- Do not create another Supabase client, auth state, request store, theme, button/input system, chat route, or API wrapper.
- Do not hardcode sample users, sessions, role bypasses, table names in UI, API keys, secrets, or service-role credentials.
- Do not replace working components/providers without caller evidence and justification.
- Do not silently change navigation paths, parameters, deep links, role redirects, or back behavior.
- Do not suppress failures with broad/empty catches. The existing empty catch in `services/liveDispatch.ts` is debt, not precedent.
- Do not use `@ts-ignore`, unsafe assertions, or disabled lint/strictness rules to hide root causes.
- Do not install packages without checking alternatives and compatibility.
- Do not claim a command, test, build, device, role, or external integration was verified unless it was actually run/observed.
- Do not modify unrelated files for formatting, combine broad cleanup with a small task, expose/overwrite environment files, or manually edit generated/lock files.
- Do not edit applied migrations or force the clean migration history onto the linked hosted project.
- Do not weaken RLS, AAL2, account separation, private Storage, authenticated Realtime, queue idempotency, or AI consent.
- Do not copy legacy violations from oversized routes or `services/api.ts` into new code.
- Do not rely on outdated README claims when package/config/code evidence disagrees.

## 18. Required Validation

Use only real scripts:

| Purpose                     | Command                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| Development, all workspaces | `pnpm dev`                                                         |
| Mobile Expo start           | `pnpm --dir apps/mobile dev`                                       |
| Type checking               | `pnpm typecheck` (mobile-only: `pnpm --dir apps/mobile typecheck`) |
| Linting                     | `pnpm lint` (mobile-only: `pnpm --dir apps/mobile lint`)           |
| Unit/package tests          | `pnpm test` (mobile-only: `pnpm --dir apps/mobile test`)           |
| Integration/E2E             | `pnpm test:e2e`                                                    |
| Database reset/lint/tests   | `pnpm db:reset`, `pnpm db:lint`, `pnpm test:db`                    |
| Edge checks/tests           | `pnpm functions:check`, `pnpm functions:test`                      |
| Contracts/traceability      | `pnpm contracts:check`, `pnpm traceability:check`                  |
| Stack/security checks       | `pnpm verify:stack`                                                |
| Production build/export     | `pnpm build`                                                       |
| Mobile web export           | `pnpm --dir apps/mobile build:web`                                 |
| Android native run/build    | `pnpm --dir apps/mobile android`                                   |
| iOS native run/build        | `pnpm --dir apps/mobile ios` (requires macOS/Xcode)                |
| Full available gate         | `pnpm verify`                                                      |

There is no separate root script named `integration`, no EAS production-build script, and no native release/archive script: **Not confirmed from the current repository**. `expo export --platform web` is the configured Expo production export.

Run checks proportional to the changed surfaces, at minimum typecheck, lint, relevant tests, and build/export when application code changes. Database work additionally requires reset/lint/pgTAP/types; Edge work requires Deno checks/tests; contract changes require contract and traceability checks. Docker is required for local Supabase database checks.

For UI changes verify loading, error, empty, success, phone/small screen, tablet/large screen, Android/web behavior, iOS when available, back navigation, and protected-route behavior. Use Playwright for requested visual-layout verification. Do not substitute existing Darwin snapshots for current Windows/native execution evidence.

Report failures as:

```text
Command
Exact failure
Changed or pre-existing failure
Affected feature
Recommended next action
```

Do not claim completion while a required validation failure caused by the change remains. Clearly distinguish environmental/unavailable and pre-existing failures.

## 19. Mandatory Post-Change Report

After every task provide:

```markdown
## Change Summary

### Goal

What was requested.

### Existing Code Reused

Files, components, hooks, functions, and services reused.

### Files Modified

Every modified file and why.

### Files Created

Every new file and why it was necessary.

### Files Removed

Every removed file and proof that it had no remaining callers.

### Duplication Removed

Duplicate implementations consolidated.

### Behavior Preserved

Existing behaviors confirmed unchanged.

### Validation Performed

Exact commands executed.

### Validation Results

Passes, failures, warnings, and limitations.

### Remaining Risks

Known unresolved issues.

### Recommended Next Step

The smallest safe follow-up action.
```

If a section has no entries, write `None`; never omit it or imply unperformed validation.

## 20. Definition of Done

A task is complete only when the requested behavior is implemented; equivalent code was reused where practical; no unnecessary parallel implementation was added; navigation, auth/roles, RLS/database behavior, private data, and loading/error/empty/success states remain correct; relevant typecheck, lint, tests, and build/export pass or non-change failures are precisely documented; no secrets were added; required docs/traceability were updated; and remaining risks are reported.

For database or security changes, Definition of Done also requires migration safety, generated-type handling, pgTAP/security coverage, and rollback consideration. For Realtime/location work it includes cleanup and lifecycle validation. For UI work it includes responsive, safe-area, accessibility, and protected-route checks.

## PROJECT-SPECIFIC FINDINGS

| Finding                                         | Location/evidence                                                                                                                                                                                     | Risk                                  | Required rule                                                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Large feature presentation/controller files     | Registration and request creation remain large after route separation                                                                                                                                 | Medium                                | Keep routes/adapters thin; extract cohesive view sections or controller responsibilities when those features change |
| Mobile compatibility service core               | `apps/mobile/services/api.ts` is a small compatibility facade; legacy implementations remain in `apiCore.ts` behind focused domain exports                                                            | Medium                                | Add callers and new operations to focused services; shrink the compatibility core through characterized migrations  |
| Canonical request state                         | `apps/mobile/store/useRequestStore.ts` is the mounted request-flow source after context-consumer migration                                                                                            | Low                                   | Keep request workflow state in the typed Zustand store                                                              |
| Canonical mobile UI primitives                  | `components/AppButton.tsx` and `AppInput.tsx` retain compatibility props for migrated callers                                                                                                         | Low                                   | Extend these primitives; add no parallel primitive family                                                           |
| Competing token APIs and hardcoded styling      | Lowercase and PascalCase exports in `constants/theme.ts`; dozens of hardcoded colors in `(worker)/verification.tsx`, `(auth)/login.tsx`, `(tabs)/bookings.tsx`                                        | Medium                                | Keep `theme.ts` canonical, add no new palette, migrate touched magic values to existing tokens                      |
| Route and page data boundaries                  | Expo routes are thin adapters; repositories/services own Supabase and provider calls                                                                                                                  | Low                                   | Enforce the architecture-boundary tests and keep new data access out of presentation files                          |
| Overlapping chat routes                         | `app/chat/[id].tsx` starts a conversation from provider/request state; `app/messages/chat.tsx` opens by conversation or booking; both use `useConversationChat`                                       | Medium                                | Add no third route; preserve parameter contracts and migrate callers before consolidation                           |
| Invalid or unconfirmed route target             | `app/new-request/success.tsx` targets `/request/${requestId}`; no matching route file exists                                                                                                          | High                                  | Fix in a focused navigation task and add direct-navigation coverage; do not cast around typed-route errors          |
| Repeated booking status presentation            | Separate `statusConfig` objects in `(worker)/index.tsx`, `(worker)/bookings.tsx`, and `(worker)/booking-request/[id].tsx`                                                                             | Medium                                | Centralize only after comparing semantics/variants and migrate all callers together                                 |
| Repeated profile/provider representations       | `services/api.ts` exposes `fetchProviderById`, `fetchProviderProfile`, `fetchWorkerProfile`, and `fetchCustomerProfile`; `services/profile.ts` separately owns typed profile views and `getMyProfile` | Medium                                | Treat `profile.ts` as identity/profile authority; use adapters and remove duplicates only after caller migration    |
| Multiple Supabase clients with mixed legitimacy | Canonical per-surface mobile client; two Edge helper families use different package versions                                                                                                          | Medium                                | Reuse the existing Edge family and add no further client/helper                                                     |
| Weak route and response typing                  | Many `as any`/`as never` navigation calls and `any` response state across mobile screens; `useRequestStore` uses `Record<string, any>`                                                                | High                                  | Narrow external data, reuse generated/contracts types, and correct route contracts incrementally                    |
| Empty error suppression                         | `apps/mobile/services/liveDispatch.ts` contains `catch {}`                                                                                                                                            | Medium                                | Do not copy it; preserve cleanup while logging/classifying actionable failures when touched                         |
| Root global error suppression                   | `apps/mobile/app/_layout.tsx` globally suppresses network-error messages                                                                                                                              | High                                  | Treat as dangerous behavior; do not broaden it or use it instead of local error states                              |
| Documentation/config drift                      | Mobile README and `.env.example` drift; `.env.example` omits OpenRouter names used by Edge code and AI consent defaults differ between examples/code                                                  | Medium                                | Prefer package/config/code evidence and reconcile one documented mismatch per focused task                          |
| Migration/hosted history sensitivity            | Large append-only `supabase/migrations/`, archived manual rollbacks, SQL-editor installers, and documented hosted/local history divergence                                                            | High                                  | Never replay/force/squash casually; require explicit database plan, backup awareness, tests, and rollback           |
| Generated database file is large by design      | `packages/supabase/src/database.generated.ts` (~7,201 lines)                                                                                                                                          | Low if generated; High if hand-edited | Regenerate with `pnpm db:types`; line threshold does not apply to generated output                                  |
| Existing direct client-side RLS access          | Mobile services use direct `.from()` for low-risk reads/updates while sensitive workflows use RPCs                                                                                                    | High if boundary is changed           | Preserve the direct-RLS versus transactional-RPC distinction; do not move sensitive mutations client-side           |
| No confirmed circular-import tooling/result     | No dedicated circular-dependency script was found                                                                                                                                                     | Unknown                               | Do not claim the graph is cycle-free; check imports for touched modules and propose tooling only with approval      |

Dangerous files that must not be changed casually include `.env`, `pnpm-lock.yaml`, `packages/supabase/src/database.generated.ts`, `supabase/config.toml`, all applied migrations, `supabase/seed.sql`, `supabase/sql-editor-*.sql`, auth/session sources, root/mobile route layouts, and deployment/build configuration.

## Architecture Map

Preferred mobile feature flow:

```text
Expo Router route / layout guard
  -> screen or feature component
  -> focused feature hook (when reusable coordination is needed)
  -> focused service / typed domain contract
  -> configured mobile Supabase client
  -> RLS read/update OR transactional RPC OR authenticated Edge Function
  -> PostgreSQL/PostGIS, Storage, Realtime, queue, or external provider
```

Returned data flows back through the service and hook/coordinator to a screen, then into presentation components. Auth flows specifically through `services/auth.ts` -> `useAuthStore.ts` -> `app/_layout.tsx` guards. Worker presence flows through `services/liveDispatch.ts` -> `WorkerPresenceContext.tsx` -> worker routes.

The administrator client flow moved to a separate repository. This repository keeps the Supabase RLS/RPC/Edge Function contracts and the admin bootstrap (`scripts/bootstrap-admin.ts`, `admin-invite-account`) those flows consume.

Backend provider flow:

```text
Authenticated client request
  -> Edge Function request/auth helper
  -> schema validation and provider adapter
  -> Gemini/OpenAI/OpenRouter/OpenRouteService/Expo Push
  -> validated/audited result
  -> Supabase persistence or typed client response
```

Current exceptions—raw route queries, the monolithic mobile API service, and dual request state—must be reduced incrementally. They are not approved examples for new code.
