#!/bin/bash
set -euo pipefail

# Native build helpers for Expo managed workflow.
#
# expo prebuild always generates ios/ and android/ at the project root.
# expo run:ios and expo run:android also expect them there — there is no
# --project-directory flag.  This script wraps prebuild and optionally
# archives the generated projects into build/ for CI or cleanup.
#
# Usage:
#   pnpm native:prebuild        - Generate ios/ and android/ at root
#   pnpm native:prebuild:clean  - Clean and regenerate
#   pnpm native:archive         - Copy ios/ + android/ into build/
#   pnpm ios                    - Prebuild (if needed) then run on device
#   pnpm ios:simulator          - Prebuild (if needed) then run on simulator
#   pnpm android                - Prebuild (if needed) then run on Android

BUILD_DIR="build"

ensure_prebuild() {
  if [ ! -d "ios" ] && [ ! -d "android" ]; then
    echo "▸ Native projects not found. Running prebuild..."
    npx expo prebuild --clean
  fi
}

run_prebuild() {
  echo "▸ Running expo prebuild..."
  npx expo prebuild --clean
  echo "▸ Prebuild complete — ios/ and android/ are at project root."
}

archive_native() {
  if [ ! -d "ios" ] && [ ! -d "android" ]; then
    echo "▸ Nothing to archive — run 'pnpm native:prebuild' first."
    exit 1
  fi
  mkdir -p "$BUILD_DIR"
  [ -d "ios" ] && rm -rf "$BUILD_DIR/ios" && cp -R ios "$BUILD_DIR/ios" && echo "  ✓ ios/ → $BUILD_DIR/ios"
  [ -d "android" ] && rm -rf "$BUILD_DIR/android" && cp -R android "$BUILD_DIR/android" && echo "  ✓ android/ → $BUILD_DIR/android"
  echo "▸ Archive complete."
}

case "${1:-prebuild}" in
  prebuild)
    run_prebuild
    ;;
  clean)
    rm -rf ios android
    run_prebuild
    ;;
  ensure)
    ensure_prebuild
    ;;
  archive)
    archive_native
    ;;
  *)
    echo "Usage: $0 {prebuild|clean|ensure|archive}"
    exit 1
    ;;
esac
