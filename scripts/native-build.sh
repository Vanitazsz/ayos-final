#!/bin/bash
set -euo pipefail

# Expo prebuild wrapper.
#
# Usage:
#   pnpm prebuild        - Generate ios/ and android/ at project root
#   pnpm prebuild:clean  - Remove ios/ + android/ and regenerate

case "${1:-prebuild}" in
  prebuild)
    npx expo prebuild --clean
    ;;
  clean)
    rm -rf ios android
    npx expo prebuild --clean
    ;;
  *)
    echo "Usage: $0 {prebuild|clean}"
    exit 1
    ;;
esac
