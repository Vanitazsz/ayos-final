# React Native Architecture Audit and Controlled Refactor Design

## Objective

Audit the current A-YOS repository, update its enforceable AI guardrails, define an incremental target architecture, and complete one low-risk mobile pilot refactor without changing user-visible behavior, database contracts, authentication, authorization, navigation paths, or external-provider behavior.

## Scope

The audit covers the active root pnpm workspace and its supporting Supabase implementation:

- `apps/mobile`
- `apps/admin`
- `packages/*`
- `tests/*`
- `supabase/functions`
- `supabase/migrations`
- `supabase/tests`
- root configuration, scripts, and architecture documentation

The untracked `backend/` directory, untracked `packages/client/` package, and nested `ayos-try/` repository will be inventoried as architectural-drift evidence. They will not be integrated, modified, deleted, or treated as approved sources of truth. The tracked architecture remains Expo/Vite clients backed directly by Supabase, with transactional RPCs and authenticated Edge Functions for protected workflows.

## Repository Safety

All pre-existing working-tree changes are user-owned. The work will avoid the currently modified tracking/live-dispatch files, Edge Function changes, migrations, generated files, lockfiles, and experimental directories.

No database schema, table, column, RPC signature, migration, environment variable, authentication behavior, role rule, RLS policy, Storage policy, Realtime authorization, route path, deep link, or external API behavior will change.

## Audit Deliverable

`docs/architecture/PROJECT_AUDIT.md` will contain evidence-based inventories of:

1. Mobile and administrator routes and screens.
2. Feature domains and their current entry points.
3. Shared mobile and administrator components.
4. Supabase clients, database calls, RPCs, Storage access, Realtime subscriptions, and Edge Function calls.
5. External integrations and environment bindings.
6. Authentication, authorization, role, and session boundaries.
7. Zustand stores, React contexts, provider state, screen-local state, and custom hooks.
8. Repeated UI components, state views, styles, status mappings, database functions, business logic, and data types.
9. Files above 150 and 300 lines, while distinguishing generated files and migrations from hand-maintained application code.
10. Static import-cycle findings and candidate unused files or exports, explicitly distinguishing confirmed findings from heuristic candidates.
11. Hardcoded colors, spacing, URLs, keys, table names, and configuration values.
12. Major architectural issues with file path, current responsibility, related implementation, recommendation, and risk level.

The audit will distinguish verified source evidence from uncertainty. Heuristic unused-code and import-graph results will not justify deletion.

## Target Architecture

The target architecture is incremental and feature-oriented. It preserves Expo Router and the existing mobile directories while introducing feature boundaries only for migrated slices.

```text
Expo Router route
  -> feature screen
  -> focused feature hook or coordinator
  -> focused service
  -> canonical mobile Supabase client
  -> RLS read/update, transactional RPC, Storage, Realtime, or Edge Function
```

Administrator features retain this flow:

```text
React Router route
  -> ProtectedRoute and AdminLayout
  -> administrator page
  -> focused administrator service
  -> canonical administrator Supabase client
```

Shared contracts remain in `packages/contracts`, domain rules remain in `packages/domain`, generated database types remain generated under `packages/supabase`, and existing theme tokens remain in `apps/mobile/constants/theme.ts`.

The architecture will not force a new root `src/` tree, create a second router, introduce a new state manager or cache, split the current theme into a competing token system, or centralize every style globally.

## Guardrails Deliverable

The existing `AI_GUARDRAILS.md` will be preserved and updated only where current repository evidence requires it. Updates will cover:

- the untracked alternative backend/client implementation as high-risk drift;
- the active root workspace boundary;
- the duplicate root TypeScript/ESLint configuration candidates;
- current line-count evidence;
- the rule that experimental directories cannot become architecture implicitly;
- current import-cycle and unused-code evidence limitations.

Existing database, authentication, navigation, styling, validation, and post-change reporting requirements remain authoritative.

## Refactor Plan Deliverable

`docs/architecture/REFACTOR_PLAN.md` will divide the broader refactor into independently testable stages. Every stage will document its goal, affected files, preserved behavior, dependencies, risks, validation, and rollback strategy.

The ordered stages are:

1. Audit and guardrail baseline.
2. Configuration and environment-documentation reconciliation.
3. Mobile theme-token convergence.
4. Shared loading, error, and empty-state convergence.
5. Mobile button, input, card, container, and header convergence.
6. Supabase client and data-access boundary enforcement.
7. Shared error-handling conventions.
8. Data-fetching and subscription conventions.
9. Published-content pilot.
10. Request-state consolidation.
11. Focused extraction from the mobile API service and oversized routes.
12. Remaining feature migrations.
13. Proven dead-code cleanup and import-boundary enforcement.
14. Cross-surface validation.

## Pilot Feature

The pilot is the customer-only published Help Center and Privacy Policy feature.

It is selected because:

- both route paths are already stable and thin;
- the feature is isolated from booking, payment, dispatch, and provider workflows;
- raw Supabase access already resides in `apps/mobile/services/contentPages.ts`;
- loading, error, unavailable, ready, retry, responsive, and role-protection behavior already has Playwright coverage;
- the current `PublishedContentPage` component exceeds the screen warning threshold and combines state coordination, navigation, formatting, presentation, and styles.

Customer and worker Profile are not selected because they touch profile completeness, Storage, password/session behavior, and duplicated customer/worker profile representations. Worker Bookings are not selected because they intersect current user changes and booking/Realtime lifecycle risk.

## Pilot File Design

### Files to reuse

- `apps/mobile/services/contentPages.ts`
- `apps/mobile/lib/supabase.ts`
- `apps/mobile/components/AppButton.tsx`
- `apps/mobile/components/AppText.tsx`
- `apps/mobile/components/layout/Screen.tsx`
- `apps/mobile/constants/theme.ts`
- `apps/mobile/store/useAuthStore.ts`
- `tests/mobile-e2e/customer-support-legal.spec.ts`

### Files to create

- `apps/mobile/features/content/contentPageModel.ts`: typed content-page normalization, formatting, and state-transition logic that is independent of React and Supabase.
- `apps/mobile/features/content/usePublishedContentPage.ts`: focus-aware loading and retry coordinator that calls the existing service.
- `apps/mobile/features/content/PublishedContentScreen.tsx`: presentation and navigation composition for published content.
- `apps/mobile/services/contentPages.test.ts`: test-first coverage for content normalization and state transitions using the mobile Vitest suite already configured for `services/**/*.test.ts`.

### Files to modify

- `apps/mobile/services/contentPages.ts`: delegate response normalization to the feature model while preserving the exact query and return contract.
- `apps/mobile/app/(tabs)/help-center.tsx`: retain customer-only route guards and render the feature screen.
- `apps/mobile/app/(tabs)/privacy-policy.tsx`: retain customer-only route guards and render the feature screen.

### File to remove after caller proof

- `apps/mobile/components/content/PublishedContentPage.tsx`: remove only after repository search confirms both route callers have migrated and no imports remain. Its responsibilities move to the feature model, hook, and screen; no compatibility duplicate will be retained.

## Pilot Data Flow

1. Expo Router resolves the existing `/help-center` or `/privacy-policy` route.
2. The route reads the canonical auth store and preserves unauthenticated and role-mismatch redirects.
3. The route passes a fixed `ContentPageKey` and fallback title to `PublishedContentScreen`.
4. `PublishedContentScreen` calls `usePublishedContentPage` and renders loading, unavailable, error, retry, or ready presentation.
5. The hook loads on focus and delegates data access to `fetchPublishedContentPage`.
6. The service executes the existing published-row query through `apps/mobile/lib/supabase.ts`.
7. The model trims and validates the selected response, rejects development placeholders, formats the update date, and exposes explicit state transitions.

## Preserved Behavior

- Existing route paths and hidden-tab configuration.
- Customer-only access, unauthenticated redirect, and worker redirect.
- Back navigation to customer Profile.
- The existing `content_pages` select, key filter, published filter, and `maybeSingle` semantics.
- `PGRST116`, missing rows, empty fields, `local-1`, and replacement-placeholder content mapping to unavailable.
- Database errors mapping to the retryable error state.
- Focus-triggered reload and explicit Retry behavior.
- Existing titles, copy, section parsing, metadata, accessibility labels, theme tokens, maximum width, scrolling, and responsive behavior.

## Error and State Handling

The model uses a discriminated union for `loading`, `ready`, `unavailable`, and `error`. Each loading request begins in `loading`. A valid page produces `ready`; a missing or rejected placeholder produces `unavailable`; a thrown service error produces `error`. Retry invokes the same load path. No errors are silently converted into valid content.

The route guards prevent unauthorized callers from starting a content request. The database remains protected by its existing RLS policy; UI guards do not replace authorization.

## Testing Strategy

The pilot uses test-driven development:

1. Add failing unit tests for the desired model API and state transitions.
2. Run the focused mobile test and verify it fails because the model is absent.
3. Implement the minimal model and rerun until green.
4. Add the hook and screen integration without changing the service contract.
5. Run the focused test, complete mobile test suite, mobile typecheck, and mobile lint.
6. Run the existing customer-support legal Playwright suite to verify navigation, role guards, loading/error/unavailable/retry behavior, and responsive layouts.
7. Run the mobile web export.
8. Run root checks proportional to documentation and mobile changes, reporting any pre-existing or environmental failures exactly.

Database reset, migration generation, database type generation, and Edge Function validation are not required by the pilot because no database, migration, generated type, or Edge Function changes are permitted.

## Rollback

The documentation changes can be reverted independently. The pilot can be rolled back by restoring the two route imports, the original `PublishedContentPage` file, and the original service normalization while removing the new feature files and focused test. No data migration, compatibility adapter, environment rollback, or backend rollback is required.

## Completion Criteria

- All requested architecture deliverables exist and are internally consistent.
- Audit claims are supported by repository evidence or marked unverified.
- The pilot follows the approved route-to-service boundary.
- No existing behavior, path, authorization rule, query, or backend contract changes.
- No duplicate implementation remains after the pilot migration.
- Focused tests demonstrate the red-green cycle.
- Required validation passes, or exact unrelated/environmental failures are documented.
- Existing user changes remain untouched.
