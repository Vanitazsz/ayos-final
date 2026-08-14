# Chat Translation Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Filipino-English message-language setting and automatic chat translation while preserving ordinary messaging and all unrelated modules.

**Architecture:** Keep `send_chat_message` as the authenticated message and notification boundary. Simplify the mobile message contract to carry only the original body, remove translation-specific settings/rendering/invocation code, and leave applied database history/schema dormant for safety.

**Tech Stack:** Expo 54, React Native/Web, TypeScript, Supabase RPC/Edge Functions, Vitest, Playwright, pnpm workspace.

## Global Constraints

- Preserve ordinary messaging, notifications, profile management, authentication, authorization, and unrelated AI features.
- Do not edit applied migrations or generated database output.
- Do not delete historical translation data.
- Remove all in-repository callers and local source for automatic chat translation.
- Keep `send_chat_message` as the message-delivery boundary.
- Preserve the user’s existing changes to `apps/mobile/app/(tabs)/home.tsx` and `supabase/migrations/20260807010000_delete_booking_proof.sql`.

---

### Task 1: Add failing regression coverage for original-only chat messages

**Files:**
- Modify: `tests/mobile-e2e/matched-messaging.spec.ts`
- Create: `apps/mobile/services/chatRealtime.test.ts`

**Interfaces:**
- Consumes: the current `createOptimisticMessage(text, now?)` helper and matched-messaging Playwright fixtures.
- Produces: regression coverage proving translation-shaped data is ignored by the client and optimistic messages contain only original text.

- [ ] **Step 1: Write the failing unit test**

Create `apps/mobile/services/chatRealtime.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createOptimisticMessage } from './chatRealtime';

describe('chat message contract', () => {
  it('creates an original-text-only optimistic message', () => {
    const message = createOptimisticMessage(
      'Hello worker',
      new Date('2026-08-14T12:00:00.000Z'),
    );

    expect(message.text).toBe('Hello worker');
    expect(message).not.toHaveProperty('originalText');
    expect(message).not.toHaveProperty('translatedText');
    expect(message).not.toHaveProperty('isTranslated');
  });
});
```

- [ ] **Step 2: Run the unit test and verify the expected failure**

Run: `pnpm --dir apps/mobile test -- services/chatRealtime.test.ts`

Expected: FAIL because the current optimistic message still contains `originalText`, `translatedText`, and `isTranslated`.

- [ ] **Step 3: Make the Playwright fixture contain a translation-shaped response**

In `tests/mobile-e2e/matched-messaging.spec.ts`, set the mocked profile locale to `fil` and add one translation row to the initial and sent message fixtures:

```ts
preferred_locale: 'fil',
```

```ts
message_translations: [
  { target_locale: 'fil', translated: 'Isinaling mensahe' },
],
```

In the closed-chat test, after navigating to the conversation, assert the original body remains visible and translation UI is absent:

```ts
await expect(
  page.getByText('The completed job message is retained.', { exact: true }),
).toBeVisible();
await expect(page.getByText('Isinaling mensahe', { exact: true })).toHaveCount(0);
await expect(page.getByText('Show original', { exact: true })).toHaveCount(0);
```

- [ ] **Step 4: Run the focused Playwright test and verify the expected failure**

Run: `pnpm exec playwright test tests/mobile-e2e/matched-messaging.spec.ts`

Expected: FAIL in the new original-only assertions because the current client renders the translated text and `Show original` control when `preferred_locale` is `fil`.

### Task 2: Remove translation behavior from the mobile chat contract and service

**Files:**
- Modify: `apps/mobile/services/chatRealtime.ts`
- Modify: `apps/mobile/services/apiCore.ts:1484-1626,1878-1907`
- Modify: `apps/mobile/services/profile.ts:12-39,150-190`

**Interfaces:**
- Consumes: `send_chat_message` RPC and existing conversation/profile services.
- Produces: `ConversationMessage` with `id`, `text`, `sender`, `createdAt`, `timestamp`, and optional `optimistic`; `fetchConversation` messages built from `messages.body`; `sendMessage(conversationId, body)` with no locale argument.

- [ ] **Step 1: Simplify the message type and optimistic factory**

Change `ConversationMessage` to:

```ts
export interface ConversationMessage {
  id: string;
  text: string;
  sender: 'self' | 'other';
  createdAt: string;
  timestamp: string;
  optimistic?: boolean;
}
```

Make `createOptimisticMessage` return only those fields, retaining the current timestamp and optimistic behavior.

- [ ] **Step 2: Remove translation reads and locale-dependent response fields**

In `fetchConversation`:

- Keep `getMyProfile()` because it is still needed for role-specific participant resolution and `canHireAgain`.
- Remove `preferredLocale` calculation and the `preferredLocale` property from the returned conversation object.
- Change the messages query from the translation relation to `select('id,body,sender_id,created_at')`.
- Map each row to `id`, `text: row.body`, sender, `createdAt`, and timestamp only.

- [ ] **Step 3: Remove locale RPC and Edge Function invocation from sending**

Replace `sendMessage` with:

```ts
export async function sendMessage(conversationId: string, body: string) {
  const { data, error } = await supabase.rpc('send_chat_message', {
    p_conversation_id: conversationId,
    p_body: body.trim(),
  });
  if (error) throw error;
  if (!data) throw new Error('Message could not be sent');
  return data;
}
```

Delete `setPreferredLocale` from `apiCore.ts`. Keep the shared `invokeAuthenticatedFunction` import because the same file still uses it for `ai-analyze-request`, `ai-process-job`, and `ai-assist-media`.

- [ ] **Step 4: Remove preferred-locale fields from mobile profile contracts**

Remove `preferredLocale` from `CustomerProfile` and `WorkerProfileView`, and remove the two `preferred_locale` mapping properties from `getMyProfile`. Remove `preferredLocale` from the object returned by `fetchCustomerProfile`.

- [ ] **Step 5: Run the focused unit test and mobile typecheck**

Run: `pnpm --dir apps/mobile test -- services/chatRealtime.test.ts`

Expected: PASS.

Run: `pnpm --dir apps/mobile typecheck`

Expected: PASS with no new TypeScript errors.

### Task 3: Remove translation rendering and settings entry points

**Files:**
- Modify: `apps/mobile/app/messages/chat.tsx`
- Modify: `apps/mobile/styles/messages/_chat.styles.ts`
- Modify: `apps/mobile/app/(tabs)/profile.tsx`
- Modify: `apps/mobile/app/(worker)/settings.tsx`
- Modify: `apps/mobile/services/api.ts`
- Modify: `scripts/refactor/migrate-mobile-api-imports.ts`
- Delete: `apps/mobile/app/settings/language.tsx`
- Delete: `apps/mobile/services/localization.ts`

**Interfaces:**
- Consumes: the simplified `ConversationMessage` contract and existing settings routes.
- Produces: chat bubbles that render `row.text` directly and profile/settings screens with no Message Language navigation.

- [ ] **Step 1: Remove translation UI state and controls from chat**

In `apps/mobile/app/messages/chat.tsx`:

- Remove the `Languages` import.
- Remove `showOriginal` state.
- Render `{row.text}` directly.
- Remove the `row.isTranslated` toggle, its accessibility labels, the translation icon/labels, and the `🌐` timestamp prefix.
- Preserve message bubbles, timestamps, send/retry behavior, attachments, read-only behavior, and navigation.

- [ ] **Step 2: Remove translation-only styles**

Delete `translationToggle` and `translationLabel` from `apps/mobile/styles/messages/_chat.styles.ts`. Keep all bubble, timestamp, error, input, attachment, and action styles.

- [ ] **Step 3: Remove customer and worker settings entries**

In the customer profile screen, remove the `Message Language` item and `Languages` import while retaining `ChevronRight` for all other settings rows.

In the worker settings screen, remove the language row, `router` navigation, `ChevronRight`, `Languages`, search state, SearchBar, and styles that only served the removed row. Retain the Settings header and existing informational card.

- [ ] **Step 4: Remove the unused localization facade and migration mapping**

Remove `export * from './localization';` from `apps/mobile/services/api.ts`, delete `apps/mobile/services/localization.ts`, and remove the `setPreferredLocale: 'localization'` entry from `scripts/refactor/migrate-mobile-api-imports.ts`.

- [ ] **Step 5: Remove the language route and verify no route callers remain**

Delete `apps/mobile/app/settings/language.tsx` and run:

```bash
rg -n "settings/language|Message Language|setPreferredLocale|preferredLocale" apps packages tests scripts -g '!database.generated.ts'
```

Expected: no output from application, test, or refactor source.

- [ ] **Step 6: Run mobile lint**

Run: `pnpm --dir apps/mobile lint`

Expected: PASS with no unused-import or unused-style errors.

### Task 4: Remove the local backend translation implementation

**Files:**
- Modify: `package.json:29`
- Delete: `supabase/functions/ai-translate-message/index.ts`

**Interfaces:**
- Consumes: the repository function-check script.
- Produces: no local automatic translation Edge Function or application invocation.

- [ ] **Step 1: Remove the translation Edge Function from `functions:check`**

Delete only `supabase/functions/ai-translate-message/index.ts` from the command list in `package.json`; retain every other checked function.

- [ ] **Step 2: Delete the unreferenced local translation function**

Delete `supabase/functions/ai-translate-message/index.ts`. Do not edit `supabase/migrations/`, `packages/supabase/src/database.generated.ts`, or hosted-backup artifacts.

- [ ] **Step 3: Run the Edge Function check**

Run: `pnpm functions:check`

Expected: PASS and no missing-file error for the removed function.

### Task 5: Update UAT and requirement traceability

**Files:**
- Modify: `checkuat.md:177-190,248-250`
- Modify: `REQUIREMENTS.md:8-16,61-64,134`

**Interfaces:**
- Consumes: the approved product scope and fixed FR/NFR identifiers.
- Produces: documentation that no longer asks testers to verify removed translation behavior while retaining all requirement IDs for traceability.

- [ ] **Step 1: Update Messaging UAT scope**

Change the UAT#16 objective to state that homeowners can exchange messages and share images and location in chat. Remove the translation rows and renumber the attachment and location scenarios from 8/9 to 6/7.

- [ ] **Step 2: Remove Profile & Settings language rows**

Delete UAT#21 rows 12, 13, and 14, leaving rows 1–11 unchanged.

- [ ] **Step 3: Mark translation requirements removed from current scope**

Add this status definition after `Blocked`:

```md
- **Removed from current scope:** deliberately retired from the current product scope; retained as a traceability record.
```

Change the status for FR-45, FR-46, FR-47, FR-48, and NFR-14 to `Removed from current scope`. Keep their identifiers and canonical statements so `traceability:check` and the catalog identifier test continue to pass.

- [ ] **Step 4: Run documentation checks**

Run: `pnpm traceability:check`

Expected: PASS and all FR-01–FR-104/NFR-01–NFR-18 identifiers remain present.

### Task 6: Full affected-surface verification

**Files:**
- Verify: all modified and deleted files from Tasks 1–5.

- [ ] **Step 1: Run focused messaging E2E after implementation**

Run: `pnpm exec playwright test tests/mobile-e2e/matched-messaging.spec.ts`

Expected: all matched-messaging tests pass, including the original-only/no-translation assertions.

- [ ] **Step 2: Run mobile tests and typecheck**

Run: `pnpm --dir apps/mobile test`

Expected: PASS with zero failures.

Run: `pnpm --dir apps/mobile typecheck`

Expected: PASS with zero TypeScript errors.

- [ ] **Step 3: Run formatting, lint, and web export**

Run: `pnpm format:check`

Expected: PASS.

Run: `pnpm lint`

Expected: PASS, or report an exact pre-existing failure unrelated to this change.

Run: `pnpm --dir apps/mobile build:web`

Expected: PASS with a successful Expo web export.

- [ ] **Step 4: Verify the removal boundary**

Run:

```bash
rg -n "ai-translate-message|setPreferredLocale|preferredLocale|message_translations|translatedText|originalText|isTranslated|Show translation|Show original|Message Language|settings/language" apps packages tests scripts supabase/functions package.json checkuat.md REQUIREMENTS.md
```

Expected: no active application/UI/test/script/Edge Function references. Any remaining matches must be limited to preserved database migrations, generated types, hosted backups, or the deliberate requirement statements/status records.

- [ ] **Step 5: Inspect the final diff and preserve unrelated changes**

Run: `git status --short` and `git diff --stat`

Expected: only the planned translation-removal files plus the existing user changes to `apps/mobile/app/(tabs)/home.tsx` and `supabase/migrations/20260807010000_delete_booking_proof.sql` are present.
