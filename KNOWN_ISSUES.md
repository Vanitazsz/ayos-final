# Known Issues

## Blocking external information

- The approved frontend sources were merged into the canonical repository; both obsolete Downloads repositories were permanently deleted after cutover verification.
- Original SRS/workflow source files cited by older documents are absent; `requirements/catalog.json` is the available requirements authority.
- Hosted Gemini and OpenRouteService secret bindings exist, but `OPENAI_API_KEY` and Google OAuth acceptance credentials are missing. Live provider behavior is **Insufficient data to verify** until configured and tested.
- Final legal content, browser/device acceptance matrix, RPO and RTO are **Insufficient data to verify**.

## Explicit product decisions

- X and Apple authentication are removed from UI, configuration, callbacks and tests.
- Google is the sole social sign-in control and remains credential-gated.
- The current Worker UI is preserved; shared visual primitives may be aligned without changing Worker workflows.
- General Trash deletion is implemented with AAL2, allowlisted entity types, exact typed confirmation and audit logging. Records protected by referential or statutory retention constraints fail closed.

## Acceptance limitations to close

- Legacy fake authentication, fixed OTP, simulated success, and synthetic profile records were removed. Repository checks reject their return to production paths.
- Authenticated Admin/User/Worker browser fixtures and native-device acceptance evidence are not available.
- The integrated interfaces have build, database and public-browser evidence; authenticated provider-backed workflow acceptance is **Insufficient data to verify** without those fixtures and credentials.
- Provider-gated buttons cannot be marked live without credentials; they must remain visibly unavailable with an accessible reason.

## Repository state

The merged working tree retains the `Vanitazsz/ayos-try` Git history and remote. The canonical repository is linked to the hosted project and a restricted pre-change snapshot exists outside the repository. No commit, push, hosted migration, or Edge Function deployment was performed by this merge.
