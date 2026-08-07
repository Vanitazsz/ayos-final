# Remove unintended tab routes

## Goal

Remove the non-functional down-arrow buttons from the customer and worker bottom navigation without changing legitimate routes, navigation behavior, authentication, or role separation.

## Root cause

Expo Router treats every supported module under `apps/mobile/app` as a route. Four route-local stylesheet modules are therefore registered as tab children:

- `apps/mobile/app/(tabs)/_home.styles.ts`
- `apps/mobile/app/(worker)/_bookings.styles.ts`
- `apps/mobile/app/(worker)/_wallet.styles.ts`
- `apps/mobile/app/(worker)/_worker-dashboard.styles.ts`

These routes have no `tabBarIcon`. React Navigation renders its fallback `MissingIcon`, whose content is `⏷`, producing the visible down-arrow buttons. Renaming the files with a leading underscore does not exclude them from Expo Router route discovery.

## Design

Move the four stylesheet modules out of `apps/mobile/app` into the existing feature-oriented mobile source tree, then update only the four importing route files. The resulting files remain ordinary TypeScript style modules, but Expo Router can no longer register them as screens.

No tab configuration, route name, redirect, authentication guard, service, database, migration, or shared package will change.

## Alternatives considered

1. Hide the generated routes in both tab layouts. This hides the symptom but keeps invalid routes discoverable.
2. Filter the tab bar to an allowlist of configured buttons. This masks future route-placement mistakes but preserves the invalid route tree.
3. Move the style modules outside `app`. This removes the invalid routes at their source and is the selected approach.

## Files

### Modified

- `apps/mobile/app/(tabs)/home.tsx`: import the moved customer home styles.
- `apps/mobile/app/(worker)/index.tsx`: import the moved worker dashboard styles.
- `apps/mobile/app/(worker)/bookings.tsx`: import the moved worker bookings styles.
- `apps/mobile/app/(worker)/wallet.tsx`: import the moved worker wallet styles.
- A focused mobile route-structure test: ensure stylesheet modules cannot remain in the customer or worker tab-route directories.

### Moved

- Customer home stylesheet, from the customer tab route directory to the customer feature area.
- Worker dashboard, bookings, and wallet stylesheets, from the worker tab route directory to the worker feature area.

### Created

- No production components, routes, services, or configuration files.
- One focused regression test only.

### Removed

- The four stylesheet modules are removed only from Expo Router's `app` directory as part of the move; their style exports remain unchanged.

## Behavior and risk

The five intended customer tabs and five intended worker tabs remain unchanged. Hidden detail routes stay hidden, and direct navigation to existing screens continues to use the same paths. No loading, error, empty, offline, unauthorized, or session-expired behavior changes because the change is limited to route discovery.

The primary risk is an incorrect import path after moving a stylesheet. The regression test, TypeScript checking, linting, web export, and role-specific browser validation address that risk.

## Validation

1. Run the new focused regression test before and after the move.
2. Confirm Expo Router's route tree has no stylesheet modules under the customer or worker tab layouts.
3. Run mobile typecheck, lint, and web export.
4. Use Playwright to verify both role-specific bottom navigations show only their intended tabs and no `⏷` fallback icons, subject to available authenticated role sessions.
