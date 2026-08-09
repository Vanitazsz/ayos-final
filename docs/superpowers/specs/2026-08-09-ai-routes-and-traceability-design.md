# AI, Route Integrity, and Traceability Design

## Status

Approved design. This document defines the voice/AI failure behavior and the focused route/documentation work.

## Objective

Make voice transcription failures visible, document the hosted prerequisites that cannot be verified from this repository, add complete UAT scenarios, and remove broken navigation targets without recreating inactive backend surfaces.

## AI and voice

### Failure behavior

When an audio input is present and all configured transcription providers fail, the Edge AI flow will return a stable user-visible transcription failure instead of continuing with an empty transcript. The response will include a safe retry/manual-text path but will not expose provider secrets or raw credentials. Image-only AI analysis will continue to work without a transcription step.

Mobile callers will distinguish this failure from a generic AI failure and show an actionable retry message. Server logs may retain provider diagnostics under the existing privacy policy.

### Configuration documentation

Update `.env.example` with the provider variables already referenced by the Edge code, including OpenRouter key/model names, and state that keys are server-only. Document `ai.enabled` as the Supabase `system_settings` gate rather than claiming a current hosted value.

The repository cannot verify the current hosted values for:

- `ai.enabled`;
- OpenRouter/Gemini/OpenAI provider keys and model configuration;
- Supabase Auth Confirm email; and
- Supabase Auth OTP template settings.

These remain explicit deployment/UAT prerequisites.

## UAT and requirements

Add voice and AI scenarios to `checkuat.md`, covering:

- enabled-provider voice happy path;
- visible transcription failure and retry/manual-text path;
- image-only analysis;
- disabled AI behavior;
- consent and privacy expectations; and
- missing-provider-key configuration failure.

Update `REQUIREMENTS.md`, the requirements catalog, and traceability references only after behavior and tests are implemented. Status labels will distinguish repository-verified behavior from hosted-environment verification.

## Route integrity

- Fix `new-request/success.tsx` in the Phase 1 workstream to use the existing matching route.
- Audit `payment-received.tsx` and `(worker)/leave-feedback/[id].tsx` as separate focused tasks by verifying callers, navigation parameters, and intended ownership before reconnecting or removing anything.
- Do not recreate the inactive `/functions/v1/api` backend solely because old verification text references it. The only new API surface approved in this design is the Phase 2 `GET /admin/settings` contract.

## Tests and validation

- Edge tests for transcription failure, disabled AI, and image-only behavior.
- Mobile tests for error rendering and retry behavior.
- UAT documentation/traceability validation.
- Route inventory and navigation-literal scans for broken targets and orphaned screens.
