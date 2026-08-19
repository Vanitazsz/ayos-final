#!/bin/bash
set -euo pipefail

# Build script for native platforms
# Usage:
#   pnpm native:prebuild        - Generate native projects in build/
#   pnpm native:prebuild:clean  - Clean and regenerate
#   pnpm ios                    - Build and run on iOS device
#   pnpm ios:simulator          - Build and run on iOS simulator
#   pnpm android                - Build and run on Android

BUILD_DIR="build"
IOS_DIR="$BUILD_DIR/ios"
ANDROID_DIR="$BUILD_DIR/android"

ensure_prebuild() {
  if [ ! -d "$IOS_DIR" ] && [ ! -d "$ANDROID_DIR" ]; then
    echo "▸ Native projects not found in $BUILD_DIR/. Running prebuild..."
    run_prebuild
  fi
}

run_prebuild() {
  echo "▸ Running expo prebuild..."
  mkdir -p "$BUILD_DIR"
  npx expo prebuild --clean
  # Move generated ios/ and android/ into build/
  if [ -d "ios" ]; then
    rm -rf "$IOS_DIR"
    mv ios "$IOS_DIR"
    echo "  ✓ iOS project → $IOS_DIR"
  fi
  if [ -d "android" ]; then
    rm -rf "$ANDROID_DIR"
    mv android "$ANDROID_DIR"
    echo "  ✓ Android project → $ANDROID_DIR"
  fi
  echo "▸ Prebuild complete."
}

clean_prebuild() {
  echo "▸ Cleaning native projects..."
  rm -rf "$BUILD_DIR/ios" "$BUILD_DIR/android"
  run_prebuild
}

case "${1:-prebuild}" in
  prebuild)
    run_prebuild
    ;;
  clean)
    clean_prebuild
    ;;
  ensure)
    ensure_prebuild
    ;;
  *)
    echo "Usage: $0 {prebuild|clean|ensure}"
    exit 1
    ;;
esac
