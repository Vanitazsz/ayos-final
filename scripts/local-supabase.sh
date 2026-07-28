#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_dir"

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Docker is required for the local Supabase stack." >&2
  exit 1
fi

pnpm exec supabase start
pnpm exec supabase db reset
pnpm exec supabase gen types typescript --local > packages/supabase/src/database.generated.ts
echo "Local Supabase is running and database types were regenerated."
