# Chat Translation Removal Design

**Date:** 2026-08-14  
**Status:** Approved by the user

## Goal

Remove the Filipino-English message-language setting and automatic chat-translation behavior from the customer and worker experiences without changing ordinary messaging, notifications, profile management, authentication, authorization, or unrelated AI features.

## Approved behavior

- Customer Profile no longer shows `Message Language`.
- Worker Settings no longer shows `Message Language`.
- The language-settings route and mobile localization export are removed because they have no remaining callers.
- Chat displays and sends the original message text only.
- Chat no longer reads `message_translations`, stores a sender locale for translation, resolves a recipient locale, or invokes the `ai-translate-message` Edge Function.
- Chat no longer exposes translation toggles, translation indicators, or translation-specific styles.
- The three Profile & Settings UAT scenarios for message language are removed.
- Messaging UAT scenarios that verify translation are removed and the objective is updated to describe ordinary messaging and attachment/location sharing only.
- Translation requirements remain traceable by ID but are marked as removed from the current product scope in `REQUIREMENTS.md`.

## Approach

Remove the feature at every application code boundary:

1. Remove settings entry points, the route, and the unused localization facade.
2. Simplify the mobile chat data model, service queries, send path, and renderer to use message body text only.
3. Remove the local translation Edge Function source from the checked function list.
4. Update the nearest messaging E2E fixture/assertions and requirement/UAT documentation.

The existing `send_chat_message` RPC remains the message-delivery boundary so conversation authorization, message validation, conversation timestamps, notifications, and Realtime behavior are preserved.

## Database and deployment safety

Applied migrations, generated database types, database columns, translation tables, translation rows, and locale RPC definitions are not deleted or rewritten. They become dormant from this application version. This avoids destructive schema changes and preserves historical data and hosted migration history.

The local `ai-translate-message` implementation and all in-repository callers are removed. This repository change does not delete or redeploy an already-hosted Supabase Edge Function; hosted deployment state must be handled separately if the deployed endpoint also needs to be removed.

## Error and state behavior

- Message loading, sending, read-only conversation behavior, retry behavior, optimistic messages, and failed-send rollback remain unchanged.
- Translation-specific loading, success, failure, and toggle states no longer exist.
- Existing authenticated Supabase access and RLS/RPC authorization remain in use.
- No new database, authentication, state-management, dependency, or provider surface is introduced.

## Validation

- Add or update a regression test that proves a message with translation-shaped backend data is rendered only as its original body and exposes no translation controls.
- Run the focused mobile test suite and the affected Playwright messaging test.
- Run mobile typecheck, lint, build/export, and the repository function check.
- Run traceability and relevant repository tests after documentation changes.
- Confirm a repository-wide search has no remaining application caller, route entry, or source reference for the removed translation feature, excluding preserved database history/generated artifacts and explicit historical documentation where applicable.

## Scope exclusions

- No changes to unrelated profile, settings, booking, notification, authentication, database, or AI modules.
- No edits to applied migrations or generated database output.
- No deletion of historical translation data.
