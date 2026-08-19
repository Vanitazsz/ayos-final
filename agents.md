# Agent Instructions

## Development

- Keep modules **small** and **single-purpose**.
- **Fix root causes**. Do not layer workarounds.
- **Comment sparingly**. The code should be able to describe what it's doing and the comment should say why. If the code is not clear and reasoning is non-obvious, then add a comment.
- Create a new branch when tasked to write changes. Keep branch names short and concise.
- **Never edit an existing migration script.** Always create a new numbered migration for schema changes.

## Commits and PRs

- Use the **imperative mood**. Use conventional commit prefixes (`fix:`, `feat:`, `chore:`, `docs:`, `refactor:`, etc.).
- The commit body should explain why the change was made, never what it is.
- Always run `pnpm format`, `pnpm lint`, `pnpm typecheck` and `pnpm test` before committing. These are the same gates CI enforces.

## Boundaries

- **Ask first**
  - Large refactors.
  - New dependencies with broad impact.
  - Destructive data or migration changes.

- **Never**
  - Commit secrets, credentials, or tokens.
  - Use destructive git operations unless explicitly requested.