# AI, Route Integrity, and Traceability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make voice transcription failures visible, document hosted AI/Auth prerequisites, add complete voice/AI UAT coverage, and finish route/requirements traceability updates.

**Architecture:** The Edge AI shared helper will fail explicitly for audio when transcription cannot be produced, while image-only flows remain valid. Mobile will map the stable failure to retry/manual-text UI. Documentation will distinguish repository verification from hosted Supabase settings that require user confirmation.

**Tech Stack:** Supabase Edge Functions/Deno, TypeScript, Expo React Native, Vitest, Playwright/UAT markdown, JSON requirements catalog.

## Global Constraints

- Do not expose provider keys or raw provider errors to mobile users.
- Do not claim current hosted settings without verification.
- Do not recreate the inactive legacy API.
- Do not delete orphan routes without verified caller/ownership evidence.
- Update requirements and traceability only after tests demonstrate the changed behavior.

---

## File Map

- Modify `supabase/functions/_frontend_shared/ai.ts`, `supabase/functions/ai-assist-media/index.ts`, `supabase/functions/ai-analyze-request/index.ts`, and their tests.
- Modify `apps/mobile/services/apiCore.ts`, `apps/mobile/app/new-request/create.tsx`, and the corresponding mobile service tests where the stable error is consumed.
- Modify `.env.example`, `checkuat.md`, `REQUIREMENTS.md`, `requirements/catalog.json`, and `checkuat-verification.md`.
- Modify `apps/mobile/app/new-request/success.tsx` in Phase 1; separately audit `payment-received.tsx` and `(worker)/leave-feedback/[id].tsx`.

### Task 1: Add failing Edge tests for transcription failure visibility

**Files:**

- Create/modify: `supabase/functions/_frontend_shared/ai.test.ts`
- Modify: `supabase/functions/ai-assist-media/index.ts` response tests in `supabase/functions/_frontend_shared/ai.test.ts`

- [ ] **Step 1: Add a failing test for audio transcription failure**

Mock Gemini and OpenAI/OpenRouter transcription calls to reject and assert the caller receives a stable `TRANSCRIPTION_FAILED` error rather than an empty transcript.

- [ ] **Step 2: Add an image-only regression test**

Assert image-only AI analysis still calls the model without requiring audio transcription.

- [ ] **Step 3: Run the focused Edge tests and verify failure**

Run: `pnpm functions:test`

Expected: FAIL because the current AI helper logs and continues with an empty transcript.

### Task 2: Implement explicit voice failure handling

**Files:**

- Modify: `supabase/functions/_frontend_shared/ai.ts`
- Modify: `supabase/functions/ai-assist-media/index.ts`
- Modify: `supabase/functions/ai-analyze-request/index.ts` if it consumes the same helper

- [ ] **Step 1: Define the stable internal error**

Create an error with code `TRANSCRIPTION_FAILED`, a safe user-facing message, and provider-attempt metadata only for logs. Do not include API keys, full provider payloads, or raw audio data.

- [ ] **Step 2: Stop silent continuation when audio exists**

If audio is present and transcription fails, throw the stable error. Keep the no-audio/image-only path unchanged.

- [ ] **Step 3: Map the error to an explicit HTTP response**

Return a non-success response with a stable JSON code/message and a retry/manual-text hint. Preserve existing auth, AI-enabled, consent, and rate-limit checks.

- [ ] **Step 4: Run Edge tests and checks**

Run: `pnpm functions:test`

Run: `pnpm functions:check`

Expected: PASS.

- [ ] **Step 5: Commit AI failure handling**

```bash
git add supabase/functions/_frontend_shared/ai.ts supabase/functions/ai-assist-media/index.ts supabase/functions/ai-analyze-request/index.ts supabase/functions/_frontend_shared/ai.test.ts
git commit -m "fix(ai): surface transcription failures"
```

### Task 3: Surface the stable failure in mobile voice UI

**Files:**

- Modify: `apps/mobile/services/apiCore.ts`, `apps/mobile/app/new-request/create.tsx`
- Test: `apps/mobile/services/aiAssist.test.ts`

- [ ] **Step 1: Locate the current AI-assist response consumer**

Run: `rg -n "ai-assist-media|transcript|OpenRouter|transcrib" apps/mobile supabase/functions`

Record the exact consumer before editing it.

- [ ] **Step 2: Add a failing mapping test**

Assert the stable server code renders a retry/manual-text action and does not show an empty successful transcript.

- [ ] **Step 3: Implement the mapping**

Preserve existing offline/network error behavior and add only the transcription-specific copy/action.

- [ ] **Step 4: Run focused mobile tests and typecheck**

Run: `pnpm --dir apps/mobile exec vitest run`

Run: `pnpm --dir apps/mobile exec tsc --noEmit`

Expected: PASS.

### Task 4: Document environment and hosted prerequisites

**Files:**

- Modify: `.env.example`
- Modify: `checkuat.md`
- Modify: `REQUIREMENTS.md`
- Modify: `requirements/catalog.json`
- Modify: `checkuat-verification.md`

- [ ] **Step 1: Add exact AI environment names**

Document the existing `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TRANSCRIPTION_MODEL`, `GEMINI_API_KEY`, and `GEMINI_MODEL`, plus the exact OpenRouter key/model names used by the Edge code. State that these are server-only. Document `ai.enabled` as a database setting whose hosted value is not verified here.

- [ ] **Step 2: Add voice/AI UAT scenarios**

Add preconditions and expected results for provider-enabled voice, transcription failure, image-only analysis, disabled AI, missing keys, consent, and retry/manual text. Include the hosted Auth Confirm email and OTP template checks as explicit external prerequisites.

- [ ] **Step 3: Update requirements traceability**

Update FR-61, FR-73, FR-88, FR-92–FR-96, and the related NFR/traceability rows, linking each to exact test/UAT identifiers. Mark hosted-dependent items as requiring hosted verification rather than implemented-and-verified.

- [ ] **Step 4: Run documentation validation**

Run: `pnpm traceability:check`

Run: `pnpm contracts:check`

Run: `git diff --check`

Expected: PASS.

- [ ] **Step 5: Commit documentation**

```bash
git add .env.example checkuat.md REQUIREMENTS.md requirements/catalog.json docs
git commit -m "docs: add voice AI UAT and hosted prerequisites"
```

### Task 5: Audit orphan routes and run cross-cutting verification

**Files:**

- Inspect: `apps/mobile/app/payment-received.tsx`
- Inspect: `apps/mobile/app/(worker)/leave-feedback/[id].tsx`
- Modify only after caller evidence: corresponding route/consumer files and route tests

- [ ] **Step 1: Inventory callers and route literals**

Run: `rg -n "payment-received|leave-feedback|/request/|new-request/matching|booking-summary" apps/mobile checkuat.md REQUIREMENTS.md`

- [ ] **Step 2: Add failing route-integrity tests for any verified broken target**

Test the exact intended route based on the caller evidence; do not invent a caller for an orphan screen.

- [ ] **Step 3: Implement only the focused route repair**

Reconnect a screen to an existing flow when the caller and parameters are proven; otherwise preserve it and document it as a separate follow-up. Never delete a route solely because `rg` finds no caller.

- [ ] **Step 4: Run repository verification**

Run: `pnpm --dir apps/mobile exec vitest run`

Run: `pnpm --dir apps/mobile lint`

Run: `pnpm --dir apps/mobile exec tsc --noEmit`

Run: `pnpm traceability:check`

Expected: PASS or exact pre-existing failures recorded for final report.
