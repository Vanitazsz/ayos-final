#!/usr/bin/env bash
set -euo pipefail

frontend_paths=(
  apps/admin/src
  apps/mobile/app
  apps/mobile/components
  apps/mobile/context
  apps/mobile/hooks
  apps/mobile/lib
  apps/mobile/services
  apps/mobile/store
)
backend_paths=(supabase/migrations supabase/functions)
failed=0

extract_calls() {
  local pattern=$1
  rg -o --no-filename --pcre2 "$pattern" "${frontend_paths[@]}" 2>/dev/null | sort -u || true
}

while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  if ! rg -qi "function[[:space:]]+(public\\.)?${name}[[:space:]]*\\(" "${backend_paths[@]}"; then
    printf 'Missing RPC: %s\n' "$name" >&2
    failed=1
  fi
done < <(extract_calls "(?<=\\.rpc\\(['\"])[A-Za-z0-9_]+")

while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  if [[ ! -f "supabase/functions/${name}/index.ts" ]]; then
    printf 'Missing Edge Function: %s\n' "$name" >&2
    failed=1
  fi
done < <(extract_calls "(?<=functions\\.invoke\\(['\"])[A-Za-z0-9_-]+")

while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  if [[ ! -f "supabase/functions/${name}/index.ts" ]]; then
    printf 'Missing Edge Function: %s\n' "$name" >&2
    failed=1
  fi
done < <(extract_calls '(?<=functions\.invoke\(`)[A-Za-z0-9_-]+')

while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  if ! rg -qi "(table[[:space:]]+(if[[:space:]]+not[[:space:]]+exists[[:space:]]+)?public\\.${name}|view[[:space:]]+public\\.${name}|values[[:space:]]*\\([[:space:]]*'${name}'|bucket_id[[:space:]]*=[[:space:]]*'${name}')" "${backend_paths[@]}"; then
    printf 'Missing table, view, or bucket: %s\n' "$name" >&2
    failed=1
  fi
done < <(extract_calls "(?<=\\.from\\(['\"])[A-Za-z0-9_-]+")

if (( failed != 0 )); then
  exit 1
fi

printf 'All literal frontend Supabase contracts resolve in the backend source.\n'
