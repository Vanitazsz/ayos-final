#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_dir"

required_patterns=(
  '"expo-router"'
  '"react": "19'
  '"@maplibre/maplibre-react-native"'
  '"maplibre-gl"'
  '"@supabase/supabase-js"'
  '"@supabase/ssr"'
  'create extension if not exists postgis'
)
for pattern in "${required_patterns[@]}"; do
  if ! rg -q "$pattern" package.json apps supabase; then
    echo "Required stack marker missing: $pattern" >&2
    exit 1
  fi
done

if rg -n --hidden --glob '!node_modules/**' --glob '!.git/**' --glob '!.env*' \
  '(sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|sb_secret_[A-Za-z0-9_-]{20,})' .; then
  echo "A potential provider or Supabase secret is present in tracked source." >&2
  exit 1
fi

echo "Requested stack markers and source secret checks passed."
