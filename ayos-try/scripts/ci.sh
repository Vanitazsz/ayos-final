#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_dir"

./scripts/verify-stack.sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm functions:check
pnpm functions:test
pnpm test
pnpm traceability:check
pnpm build
