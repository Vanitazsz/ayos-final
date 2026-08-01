# React Native Architecture Audit and Controlled Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce an evidence-backed architecture audit, updated AI guardrails, an incremental refactor roadmap, and a behavior-preserving published-content pilot refactor.

**Architecture:** Preserve the tracked Expo/Vite/Supabase architecture and treat untracked alternative backend/client code as non-authoritative drift. The pilot moves Help Center and Privacy Policy to `route -> feature screen -> feature hook -> focused service -> canonical mobile Supabase client` while retaining current navigation, role guards, query behavior, presentation, and responsive states.

**Tech Stack:** pnpm 11.9, Expo 54, Expo Router 6, React 19.1, React Native 0.81.5, TypeScript 5.9, Zustand 5, Supabase JS, Vitest 4, Playwright 1.61.

## Global Constraints

- Preserve all pre-existing working-tree changes; stage and commit only files named in the active task.
- Do not modify `backend/`, `packages/client/`, `ayos-try/`, migrations, generated database types, environment files, lockfiles, authentication sources, or current tracking/live-dispatch work.
- Do not change route paths, route parameters, redirects, database queries, table/RPC contracts, RLS, Storage, Realtime authorization, or external-provider behavior.
- Reuse `apps/mobile/lib/supabase.ts`, `apps/mobile/services/contentPages.ts`, the existing auth store, mobile theme tokens, and established UI components.
- Add no dependencies and create no competing client, theme, router, state store, cache, form library, or shared UI system.
- Use exact project scripts and report unexecuted or failed checks without claiming success.
- Use TDD for new pilot logic: run the focused test red before adding production files, then green after the minimal implementation.

---

### Task 1: Architecture Audit, Guardrail Update, and Long-Term Refactor Plan

**Files:**
- Create: `docs/architecture/PROJECT_AUDIT.md`
- Create: `docs/architecture/REFACTOR_PLAN.md`
- Modify: `AI_GUARDRAILS.md`
- Reference: `docs/superpowers/specs/2026-08-02-react-native-architecture-audit-controlled-refactor-design.md`

**Interfaces:**
- Consumes: repository evidence from routes, screens, services, clients, state, tests, configuration, migrations, and current Git status.
- Produces: the required audit, enforceable guardrails, and staged repository roadmap used to constrain Tasks 2–4.

- [ ] **Step 1: Regenerate the audit evidence snapshot without writing application files**

Run:

```bash
git status --short
rg --files apps/mobile/app apps/mobile/components apps/mobile/hooks apps/mobile/services apps/mobile/store apps/mobile/context apps/admin/src packages/contracts/src packages/domain/src packages/supabase/src supabase/functions supabase/tests tests
find apps/mobile/app apps/mobile/components apps/mobile/hooks apps/mobile/services apps/admin/src packages supabase/functions tests -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.css' \) -print0 | xargs -0 wc -l | sort -nr
rg -n "createClient|createBrowserClient|createServerClient|from '@/lib/supabase'|supabase\.(from|rpc|auth|storage|functions|channel)" apps packages supabase/functions
rg -n "useRequest\(|useRequestStore|RequestProvider|statusConfig|#[0-9A-Fa-f]{3,8}|https?://" apps/mobile apps/admin/src packages
```

Expected: evidence confirms the tracked mobile/admin clients, oversized route/service/page files, duplicate request state, duplicate UI primitives/status maps, route-level backend access, hardcoded design values, and untracked alternative backend/client artifacts.

- [ ] **Step 2: Create the project audit with all required inventories**

Write `docs/architecture/PROJECT_AUDIT.md` with these exact top-level sections:

```markdown
# A-YOS Project Architecture Audit

## Audit Scope and Method
## Executive Summary
## Current Architecture
## Route and Screen Inventory
## Feature Inventory
## Shared Component Inventory
## Data Access and Supabase Inventory
## External API Inventory
## Authentication and Authorization Inventory
## State Management and Hook Inventory
## Duplication Inventory
## File Size Inventory
## Import Cycle Analysis
## Candidate Unused Files and Exports
## Hardcoded Values and Configuration Drift
## Major Findings
## Proposed Target Architecture
## Selected Pilot Feature
## Audit Limitations
```

For every major finding, use a table with these columns:

```markdown
| File or area | Current responsibility | Problem | Related implementation | Recommendation | Risk |
| --- | --- | --- | --- | --- | --- |
```

Record heuristic unused-code results as candidates and state that no deletion is authorized by the audit. Record the platform-specific `RadiusSlider` type import as a static-scanner false positive rather than a confirmed circular dependency.

- [ ] **Step 3: Update guardrails only with newly verified repository evidence**

Append or amend `AI_GUARDRAILS.md` so it explicitly states:

```markdown
- The active root workspace is defined by `pnpm-workspace.yaml` and root `package.json` globs.
- Untracked or nested alternative stacks do not become architecture automatically.
- `backend/` conflicts with the approved Supabase-only backend and must not be integrated without an explicit replacement design.
- `packages/client/` currently has no active app caller and duplicates established client/auth/storage/realtime boundaries; it is not an approved client source of truth.
- Root `tsconfig.json` and `eslint.config.js` are untracked competing configuration candidates and must not replace tracked configuration implicitly.
- Static import and unused-export scans are heuristic; deletion requires caller, runtime, route, test, and package-entry proof.
```

Refresh line-count evidence without turning warning thresholds into automatic split rules.

- [ ] **Step 4: Create the staged refactor roadmap**

Write `docs/architecture/REFACTOR_PLAN.md` with the fourteen approved stages. For every stage include:

```markdown
### Stage N: Name

**Goal:** One measurable outcome.

**Files affected:** Exact existing areas or files; creation paths only when justified.

**Behavior preserved:** Navigation, role, database, UI, or provider invariants.

**Dependencies:** Earlier stages and source-of-truth modules.

**Risks:** Concrete failure modes.

**Validation:** Exact project commands and behavioral checks.

**Rollback:** Exact files or commit group that can be reverted without data loss.
```

The published-content pilot must be Stage 9. Database and dead-code stages must explicitly require separate approval before destructive work.

- [ ] **Step 5: Validate documentation structure and whitespace**

Run:

```bash
rg -n '^## (Audit Scope and Method|Executive Summary|Current Architecture|Route and Screen Inventory|Feature Inventory|Shared Component Inventory|Data Access and Supabase Inventory|External API Inventory|Authentication and Authorization Inventory|State Management and Hook Inventory|Duplication Inventory|File Size Inventory|Import Cycle Analysis|Candidate Unused Files and Exports|Hardcoded Values and Configuration Drift|Major Findings|Proposed Target Architecture|Selected Pilot Feature|Audit Limitations)$' docs/architecture/PROJECT_AUDIT.md
rg -n '^### Stage (1|2|3|4|5|6|7|8|9|10|11|12|13|14):' docs/architecture/REFACTOR_PLAN.md
git diff --check -- AI_GUARDRAILS.md docs/architecture/PROJECT_AUDIT.md docs/architecture/REFACTOR_PLAN.md
```

Expected: all required audit sections and all fourteen stages are present; `git diff --check` exits 0.

- [ ] **Step 6: Commit the documentation baseline**

```bash
git add AI_GUARDRAILS.md docs/architecture/PROJECT_AUDIT.md docs/architecture/REFACTOR_PLAN.md
git diff --cached --check
git commit -m "docs: audit architecture and stage refactor"
```

Expected: the commit contains only the three required deliverables.

---

### Task 2: Test-Drive the Published Content Model and Loading Coordinator

**Files:**
- Create: `apps/mobile/services/contentPages.test.ts`
- Create: `apps/mobile/features/content/contentPageModel.ts`
- Create: `apps/mobile/features/content/usePublishedContentPage.ts`
- Modify: `apps/mobile/services/contentPages.ts`

**Interfaces:**
- Consumes: `ContentPageKey`, `ContentPageViewModel`, and `fetchPublishedContentPage` from `apps/mobile/services/contentPages.ts`.
- Produces: `ContentPageKey`, `ContentPageRecord`, `ContentPageState`, `normalizePublishedContentPage(record)`, `formatContentUpdatedAt(value)`, `loadPublishedContentPage(key, fetchPage)`, and `usePublishedContentPage(contentKey)`.

- [ ] **Step 1: Write the failing model and coordinator tests**

Create `apps/mobile/services/contentPages.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';
import {
  formatContentUpdatedAt,
  loadPublishedContentPage,
  normalizePublishedContentPage,
} from '@/features/content/contentPageModel';

const validRecord = {
  title: ' Help Center ',
  body: ' Guidance for customers. ',
  version: ' 2026-07-23 ',
  updated_at: '2026-07-23T09:00:00.000Z',
};

describe('normalizePublishedContentPage', () => {
  it('returns a trimmed published page view model', () => {
    expect(normalizePublishedContentPage(validRecord)).toEqual({
      title: 'Help Center',
      body: 'Guidance for customers.',
      version: '2026-07-23',
      updatedAt: '2026-07-23T09:00:00.000Z',
    });
  });

  it.each([
    null,
    { ...validRecord, title: ' ' },
    { ...validRecord, body: ' ' },
    { ...validRecord, version: 'local-1' },
    { ...validRecord, body: 'Replace before production.' },
  ])('maps missing or placeholder content to unavailable', (record) => {
    expect(normalizePublishedContentPage(record)).toBeNull();
  });
});

describe('formatContentUpdatedAt', () => {
  it('formats a valid update date for the Philippine locale', () => {
    expect(formatContentUpdatedAt(validRecord.updated_at)).toBe('July 23, 2026');
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatContentUpdatedAt('not-a-date')).toBe('');
  });
});

describe('loadPublishedContentPage', () => {
  it('returns ready when the service returns a page', async () => {
    const page = normalizePublishedContentPage(validRecord);
    const fetchPage = vi.fn().mockResolvedValue(page);
    await expect(loadPublishedContentPage('HELP_CENTER', fetchPage)).resolves.toEqual({
      status: 'ready',
      page,
    });
  });

  it('returns unavailable when the service returns null', async () => {
    const fetchPage = vi.fn().mockResolvedValue(null);
    await expect(loadPublishedContentPage('PRIVACY', fetchPage)).resolves.toEqual({
      status: 'unavailable',
      page: null,
    });
  });

  it('returns error when the service rejects', async () => {
    const fetchPage = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(loadPublishedContentPage('HELP_CENTER', fetchPage)).resolves.toEqual({
      status: 'error',
      page: null,
    });
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm --dir apps/mobile exec vitest run --config vitest.config.ts services/contentPages.test.ts
```

Expected: FAIL because `@/features/content/contentPageModel` does not exist.

- [ ] **Step 3: Implement the typed content-page model**

Create `apps/mobile/features/content/contentPageModel.ts`:

```typescript
export interface ContentPageRecord {
  title: string;
  body: string;
  version: string;
  updated_at: string;
}

export type ContentPageKey = 'HELP_CENTER' | 'PRIVACY';

export interface ContentPageViewModel {
  title: string;
  body: string;
  version: string;
  updatedAt: string;
}

export type ContentPageState =
  | { status: 'loading'; page: null }
  | { status: 'ready'; page: ContentPageViewModel }
  | { status: 'unavailable'; page: null }
  | { status: 'error'; page: null };

export const initialContentPageState: ContentPageState = {
  status: 'loading',
  page: null,
};

export function normalizePublishedContentPage(
  record: ContentPageRecord | null,
): ContentPageViewModel | null {
  if (!record) return null;
  const title = record.title.trim();
  const body = record.body.trim();
  const version = record.version.trim();
  if (
    !title ||
    !body ||
    !version ||
    version === 'local-1' ||
    body.toLowerCase().includes('replace before production')
  ) {
    return null;
  }
  return { title, body, version, updatedAt: record.updated_at };
}

export function formatContentUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

type FetchContentPage = (
  key: ContentPageKey,
) => Promise<ContentPageViewModel | null>;

export async function loadPublishedContentPage(
  contentKey: ContentPageKey,
  fetchPage: FetchContentPage,
): Promise<Exclude<ContentPageState, { status: 'loading' }>> {
  try {
    const page = await fetchPage(contentKey);
    return page
      ? { status: 'ready', page }
      : { status: 'unavailable', page: null };
  } catch {
    return { status: 'error', page: null };
  }
}
```

- [ ] **Step 4: Implement the load coordinator and hook**

Create `apps/mobile/features/content/usePublishedContentPage.ts`:

```typescript
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  fetchPublishedContentPage,
} from '@/services/contentPages';
import {
  initialContentPageState,
  loadPublishedContentPage,
  type ContentPageKey,
  type ContentPageState,
} from '@/features/content/contentPageModel';

export function usePublishedContentPage(contentKey: ContentPageKey) {
  const [state, setState] = useState<ContentPageState>(initialContentPageState);

  const load = useCallback(async () => {
    setState(initialContentPageState);
    setState(
      await loadPublishedContentPage(contentKey, fetchPublishedContentPage),
    );
  }, [contentKey]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { state, reload: load };
}
```

- [ ] **Step 5: Make the existing service reuse the model**

Update `apps/mobile/services/contentPages.ts` to import and re-export the model type and replace inline trimming/placeholder validation with:

```typescript
import {
  normalizePublishedContentPage,
  type ContentPageKey,
  type ContentPageViewModel,
} from '@/features/content/contentPageModel';

export type {
  ContentPageKey,
  ContentPageViewModel,
} from '@/features/content/contentPageModel';

// After the existing error checks:
return normalizePublishedContentPage(data);
```

Keep the existing `content_pages` query and `PGRST116` handling unchanged. Move the exact `ContentPageKey` union to the model and re-export it from the service so caller imports remain stable.

- [ ] **Step 6: Run the focused test and verify GREEN**

Run:

```bash
pnpm --dir apps/mobile exec vitest run --config vitest.config.ts services/contentPages.test.ts
```

Expected: all content-page model and load-coordinator tests pass.

- [ ] **Step 7: Commit the tested model boundary**

```bash
git add apps/mobile/services/contentPages.test.ts apps/mobile/services/contentPages.ts apps/mobile/features/content/contentPageModel.ts apps/mobile/features/content/usePublishedContentPage.ts
git diff --cached --check
git commit -m "refactor(mobile): model published content state"
```

Expected: the commit contains only the focused test, model, hook, and service adaptation.

---

### Task 3: Extract the Published Content Feature Screen and Migrate Routes

**Files:**
- Create: `apps/mobile/features/content/PublishedContentScreen.tsx`
- Modify: `apps/mobile/app/(tabs)/help-center.tsx`
- Modify: `apps/mobile/app/(tabs)/privacy-policy.tsx`
- Remove: `apps/mobile/components/content/PublishedContentPage.tsx`
- Test: `apps/mobile/services/contentPages.test.ts`
- Test: `tests/mobile-e2e/customer-support-legal.spec.ts`

**Interfaces:**
- Consumes: `usePublishedContentPage(contentKey)`, `formatContentUpdatedAt(value)`, existing UI primitives, theme tokens, and route-provided `ContentPageKey`/fallback title.
- Produces: `PublishedContentScreen({ contentKey, fallbackTitle })` as the sole presentation entry for both protected routes.

- [ ] **Step 1: Capture the existing browser behavior before moving presentation code**

Run:

```bash
pnpm exec playwright test tests/mobile-e2e/customer-support-legal.spec.ts --project=mobile-web-chromium
```

Expected: the current Help Center/Privacy navigation, ready, error, retry, unavailable, authorization, and responsive cases pass. If the environment prevents startup, record the exact failure before continuing and rely on the same command after the refactor.

- [ ] **Step 2: Create the focused feature screen**

Create `apps/mobile/features/content/PublishedContentScreen.tsx` with the complete presentation:

```typescript
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, FileQuestion } from 'lucide-react-native';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/layout/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatContentUpdatedAt } from '@/features/content/contentPageModel';
import { usePublishedContentPage } from '@/features/content/usePublishedContentPage';
import type { ContentPageKey } from '@/services/contentPages';

interface PublishedContentScreenProps {
  contentKey: ContentPageKey;
  fallbackTitle: string;
}

function ContentBody({ body }: { body: string }) {
  return (
    <View style={styles.body}>
      {body
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block, index) =>
          block.startsWith('## ') ? (
            <AppText
              key={`${index}-${block}`}
              variant="h4"
              weight="bold"
              style={styles.sectionHeading}
            >
              {block.slice(3).trim()}
            </AppText>
          ) : (
            <AppText
              key={`${index}-${block}`}
              variant="body"
              color={Colors.textSecondary}
              style={styles.paragraph}
            >
              {block}
            </AppText>
          ),
        )}
    </View>
  );
}

export function PublishedContentScreen({
  contentKey,
  fallbackTitle,
}: PublishedContentScreenProps) {
  const router = useRouter();
  const { state, reload } = usePublishedContentPage(contentKey);
  const title = state.page?.title ?? fallbackTitle;
  const updatedAt = state.page
    ? formatContentUpdatedAt(state.page.updatedAt)
    : '';

  return (
    <Screen safeArea scrollable contentContainerStyle={styles.screenContent}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.replace('/(tabs)/profile')}
            accessibilityRole="button"
            accessibilityLabel="Back to profile"
            hitSlop={12}
            style={styles.backButton}
          >
            <ChevronLeft size={26} color={Colors.textPrimary} />
          </Pressable>
          <AppText variant="h3" weight="bold" style={styles.headerTitle}>
            {title}
          </AppText>
          <View style={styles.headerSpacer} />
        </View>

        {state.status === 'loading' && (
          <View
            style={styles.stateCard}
            accessibilityRole="progressbar"
            accessibilityLabel={`Loading ${fallbackTitle}`}
          >
            <ActivityIndicator size="large" color={Colors.primary} />
            <AppText variant="body" color={Colors.textSecondary}>
              Loading {fallbackTitle.toLowerCase()}…
            </AppText>
          </View>
        )}

        {state.status === 'unavailable' && (
          <View style={styles.stateCard}>
            <FileQuestion size={40} color={Colors.primary} />
            <AppText variant="h4" weight="bold" align="center">
              Page unavailable
            </AppText>
            <AppText variant="body" color={Colors.textSecondary} align="center">
              This page is not currently published.
            </AppText>
          </View>
        )}

        {state.status === 'error' && (
          <View style={styles.stateCard}>
            <FileQuestion size={40} color={Colors.error} />
            <AppText variant="h4" weight="bold" align="center">
              Unable to load this page
            </AppText>
            <AppText variant="body" color={Colors.textSecondary} align="center">
              Check your connection and try again.
            </AppText>
            <AppButton
              label="Retry"
              variant="outline"
              onPress={() => void reload()}
              style={styles.retryButton}
            />
          </View>
        )}

        {state.status === 'ready' && (
          <View style={styles.contentCard}>
            <ContentBody body={state.page.body} />
            <View style={styles.metadata}>
              <AppText variant="caption" color={Colors.textTertiary}>
                Version {state.page.version}
              </AppText>
              {updatedAt ? (
                <AppText variant="caption" color={Colors.textTertiary}>
                  Updated {updatedAt}
                </AppText>
              ) : null}
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: Spacing['8'],
  },
  container: {
    width: '100%',
    maxWidth: 840,
    alignSelf: 'center',
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing['4'],
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  stateCard: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['4'],
    padding: Spacing['6'],
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
  },
  retryButton: {
    minWidth: 160,
  },
  contentCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    padding: Spacing['5'],
  },
  body: {
    gap: Spacing['3'],
  },
  sectionHeading: {
    marginTop: Spacing['3'],
  },
  paragraph: {
    lineHeight: 26,
  },
  metadata: {
    marginTop: Spacing['6'],
    paddingTop: Spacing['4'],
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing['1'],
  },
});
```

- [ ] **Step 3: Migrate both routes without changing their guards**

In both route files, replace only the component import and rendered component name:

```typescript
import { PublishedContentScreen } from '@/features/content/PublishedContentScreen';
```

Keep `useAuthStore`, `Redirect`, loading behavior, unauthenticated redirect, worker redirect, content keys, fallback titles, and route filenames unchanged.

- [ ] **Step 4: Prove the old component has no callers and remove it**

Run:

```bash
rg -n "components/content/PublishedContentPage|PublishedContentPage" apps/mobile tests
```

Expected before removal: no imports or JSX callers remain outside the old component file. Remove `apps/mobile/components/content/PublishedContentPage.tsx` using `apply_patch`.

- [ ] **Step 5: Run focused static and unit validation**

Run:

```bash
pnpm --dir apps/mobile exec vitest run --config vitest.config.ts services/contentPages.test.ts
pnpm --dir apps/mobile typecheck
pnpm --dir apps/mobile lint
```

Expected: focused tests, strict mobile typecheck, and Expo lint pass without suppressions.

- [ ] **Step 6: Run the existing published-content E2E suite after the migration**

Run:

```bash
pnpm exec playwright test tests/mobile-e2e/customer-support-legal.spec.ts --project=mobile-web-chromium
```

Expected: all customer support/legal tests pass with the same paths, redirects, visible content, states, and responsive behavior as the baseline.

- [ ] **Step 7: Commit the route-to-feature migration**

```bash
git add apps/mobile/features/content/PublishedContentScreen.tsx 'apps/mobile/app/(tabs)/help-center.tsx' 'apps/mobile/app/(tabs)/privacy-policy.tsx' apps/mobile/components/content/PublishedContentPage.tsx
git diff --cached --check
git commit -m "refactor(mobile): extract published content screen"
```

Expected: the commit contains only the feature screen, two route migrations, and removal of the old component.

---

### Task 4: Full Proportional Validation and Audit Completion Record

**Files:**
- Modify: `docs/architecture/PROJECT_AUDIT.md`
- Modify: `docs/architecture/REFACTOR_PLAN.md`
- Verify: all files created or modified in Tasks 1–3

**Interfaces:**
- Consumes: completed documentation, pilot commits, Git diff, unit/static/E2E/build output.
- Produces: final evidence in the required deliverables and a precise post-change report.

- [ ] **Step 1: Run the complete mobile unit suite**

```bash
pnpm --dir apps/mobile test
```

Expected: all configured mobile Vitest tests pass.

- [ ] **Step 2: Run mobile static checks and production export**

```bash
pnpm --dir apps/mobile typecheck
pnpm --dir apps/mobile lint
pnpm --dir apps/mobile build:web
```

Expected: strict typecheck, Expo lint, and web export exit 0.

- [ ] **Step 3: Run repository-level documentation and contract checks**

```bash
pnpm format:check
pnpm traceability:check
pnpm contracts:check
```

Expected: each command exits 0, or any unrelated failure is recorded with its exact output and affected scope.

- [ ] **Step 4: Verify scope, caller cleanup, and secret safety**

```bash
rg -n "PublishedContentPage" apps/mobile tests
rg -n "SUPABASE_SECRET_KEY|service[_-]?role|EDGE_FUNCTION_SHARED_SECRET" apps/mobile/features apps/mobile/services/contentPages.ts docs/architecture
git diff --check HEAD~2..HEAD
git status --short
```

Expected: no old component references, no introduced client secrets, clean committed diff whitespace, and all unrelated working-tree changes remain present and unstaged.

- [ ] **Step 5: Record the pilot outcome in the required architecture documents**

Add a `## Pilot Refactor Result` section to `docs/architecture/PROJECT_AUDIT.md` containing:

```markdown
## Pilot Refactor Result

- Selected feature: Published Help Center and Privacy Policy.
- Preserved paths: `/(tabs)/help-center` and `/(tabs)/privacy-policy`.
- Final flow: route -> `PublishedContentScreen` -> `usePublishedContentPage` -> `fetchPublishedContentPage` -> canonical mobile Supabase client.
- Removed duplicate/oversized implementation: `apps/mobile/components/content/PublishedContentPage.tsx` after caller migration proof.
- Database, migration, authentication, authorization, environment, dependency, and external API changes: None.
- Validation: list exact commands and results from Steps 1–4.
```

Mark Stage 9 in `docs/architecture/REFACTOR_PLAN.md` as completed with the final validation evidence. Do not mark any other implementation stage complete.

- [ ] **Step 6: Validate and commit the completion record**

```bash
git diff --check -- docs/architecture/PROJECT_AUDIT.md docs/architecture/REFACTOR_PLAN.md
git add docs/architecture/PROJECT_AUDIT.md docs/architecture/REFACTOR_PLAN.md
git diff --cached --check
git commit -m "docs: record published content pilot"
```

Expected: the commit contains only the final audit and roadmap result updates.

- [ ] **Step 7: Produce the mandatory post-change report**

Report these exact sections with evidence from the commands above:

```markdown
## Change Summary

### Goal
### Existing Code Reused
### Files Modified
### Files Created
### Files Removed
### Duplication Removed
### Behavior Preserved
### Validation Performed
### Validation Results
### Remaining Risks
### Recommended Next Step
```

The recommended next feature is the smallest safe follow-up supported by the audit; do not begin it in this task.
