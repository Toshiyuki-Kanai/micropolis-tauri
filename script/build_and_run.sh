#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
source script/desktop-env.sh
MODE="${1:-run}"
case "$MODE" in run|--verify|--debug|--logs|--telemetry) ;; *) echo "usage: $0 [run|--verify|--debug|--logs|--telemetry]" >&2; exit 2;; esac
BUNDLE="$PWD/apps/desktop/src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Micropolis.app"
APP="$PWD/build/Micropolis.app"
# Stop only this checkout's previous build, never the separate SwiftUI app.
for previous in "$APP" "$BUNDLE"; do
  if [[ -f "$previous/Contents/MacOS/micropolis-desktop" ]]; then
    pkill -f "^$previous/Contents/MacOS/micropolis-desktop" 2>/dev/null || true
  fi
done
pnpm desktop:build
mkdir -p build
# This is a generated staging bundle, never the SwiftUI checkout.
rm -rf "$APP"
/usr/bin/ditto "$BUNDLE" "$APP"
/usr/bin/codesign --verify --deep --strict "$APP"
case "$MODE" in
  --debug) exec lldb -- "$APP/Contents/MacOS/micropolis-desktop" ;;
  *) /usr/bin/open -n "$APP" ;;
esac
case "$MODE" in
  --verify) sleep 3; pgrep -f "^$APP/Contents/MacOS/micropolis-desktop" ;;
  --logs|--telemetry) exec /usr/bin/log stream --info --style compact --predicate 'process == "micropolis-desktop"' ;;
esac
