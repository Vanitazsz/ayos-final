#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_dir"

if [[ -e ayos-try ]]; then
  echo "Nested ayos-try workspace detected. Run the project from the repository root only." >&2
  exit 1
fi

required_patterns=(
  '"expo-router"'
  '"react": "19'
  '"@maplibre/maplibre-react-native"'
  '"maplibre-gl"'
  '"@supabase/supabase-js"'
  'create extension if not exists postgis'
)
for pattern in "${required_patterns[@]}"; do
  if ! node scripts/search.mjs --pattern "$pattern" --quiet --paths package.json apps supabase; then
    echo "Required stack marker missing: $pattern" >&2
    exit 1
  fi
done

source_paths=()
while IFS= read -r -d '' source_path; do
  source_paths+=("$source_path")
done < <(git ls-files --cached --others --exclude-standard -z)

if node scripts/search.mjs --pattern \
  '(sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|sb_secret_[A-Za-z0-9_-]{20,})' \
  --quiet --paths "${source_paths[@]}"; then
  echo "A potential provider or Supabase secret is present in tracked source." >&2
  exit 1
fi

echo "Requested stack markers and source secret checks passed."
