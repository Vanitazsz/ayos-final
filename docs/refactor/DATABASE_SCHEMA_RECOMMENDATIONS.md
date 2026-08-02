# Database Schema Recommendations

No database schema change is authorized by this refactor.

## Recorded recommendations

- Keep applied migrations append-only and preserve hosted/local history differences.
- Continue using transactional security-definer RPCs for sensitive lifecycle mutations.
- Reassess schema changes only when a code migration exposes a verified database limitation with caller, RLS, rollback, generated-type, and pgTAP evidence.

Specific additional schema changes: **Insufficient data to verify.**
