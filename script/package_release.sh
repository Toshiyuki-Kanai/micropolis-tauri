#!/usr/bin/env bash
# Local packaging only. Never commits, pushes, tags or publishes a GitHub release.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
source script/desktop-env.sh
MODE="${1:-verify}"
IDENTITY="${MICROPOLIS_SIGNING_IDENTITY:-Developer ID Application: Toshiyuki Kanai (WBADLDV5D2)}"
PROFILE="${MICROPOLIS_NOTARY_PROFILE:-MacNotarization}"
OUT="$PWD/build/release/0.1.0"
APP="$OUT/stage/Micropolis.app"
DMG="$OUT/Micropolis-0.1.0-arm64.dmg"
mkdir -p "$OUT"
case "$MODE" in
  sign)
    [[ ! -e "$APP" ]] || { echo 'Use a fresh staging directory; existing staged app was not overwritten.' >&2; exit 1; }
    [[ -s distribution/licenses/index.html && -s distribution/0.1.0/asset-provenance.json ]]
    security find-identity -v -p codesigning | rg -F "$IDENTITY" >/dev/null
    mkdir -p "$OUT/stage"
    ditto apps/desktop/src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Micropolis.app "$APP"
    ditto distribution/licenses "$APP/Contents/Resources/licenses"
    codesign --force --options runtime --timestamp --sign "$IDENTITY" "$APP"
    codesign --verify --deep --strict --verbose=2 "$APP"
    codesign -dvvv "$APP" 2> "$OUT/app-signature.txt"
    rg -F 'Authority=Developer ID Application: Toshiyuki Kanai (WBADLDV5D2)' "$OUT/app-signature.txt"
    rg 'flags=.*runtime' "$OUT/app-signature.txt"
    ;;
  submit-app)
    [[ ! -e "$OUT/app-submission.json" ]] || { echo 'Submission already recorded. Use notarytool info/wait for that ID.' >&2; exit 1; }
    codesign --verify --deep --strict "$APP"
    ditto -c -k --keepParent "$APP" "$OUT/Micropolis-notary.zip"
    xcrun notarytool submit "$OUT/Micropolis-notary.zip" --keychain-profile "$PROFILE" \
      --output-format json > "$OUT/app-submission.json"
    cat "$OUT/app-submission.json"
    ;;
  dmg)
    xcrun stapler validate "$APP"
    spctl --assess --type execute --verbose=2 "$APP"
    [[ -s "$OUT/Micropolis-0.1.0-source.tar.gz" && ! -e "$DMG" ]]
    ln -s /Applications "$OUT/stage/Applications"
    mkdir -p "$OUT/stage/Source"
    cp "$OUT/Micropolis-0.1.0-source.tar.gz" "$OUT/source-file-sha256.json" "$OUT/stage/Source/"
    ditto distribution/licenses "$OUT/stage/Licenses"
    cat > "$OUT/stage/Install.txt" <<'INSTALL'
Micropolis 0.1.0 — Apple Silicon / macOS 13 or later

Drag Micropolis.app onto Applications to install, then open it from Applications.
No Node.js, server or internet connection is required for gameplay.
The complete corresponding source snapshot is in Source; license texts are in Licenses.
Micropolis is a registered trademark of Micropolis GmbH, used under the Micropolis Public Name License.
Modified Tauri distribution. Copyright © 1989–2007 Electronic Arts Inc. and Micropolis contributors.
INSTALL
    hdiutil create -volname 'Micropolis 0.1.0' -srcfolder "$OUT/stage" -format UDZO "$DMG"
    codesign --timestamp --sign "$IDENTITY" "$DMG"
    codesign --verify --verbose=2 "$DMG"
    ;;
  submit-dmg)
    [[ ! -e "$OUT/dmg-submission.json" ]] || { echo 'Submission already recorded. Use notarytool info/wait for that ID.' >&2; exit 1; }
    xcrun notarytool submit "$DMG" --keychain-profile "$PROFILE" \
      --output-format json > "$OUT/dmg-submission.json"
    cat "$OUT/dmg-submission.json"
    ;;
  verify)
    codesign --verify --deep --strict --verbose=2 "$APP"
    xcrun stapler validate "$APP"
    spctl --assess --type execute --verbose=2 "$APP"
    codesign --verify --verbose=2 "$DMG"
    xcrun stapler validate "$DMG"
    spctl --assess --type open --context context:primary-signature --verbose=2 "$DMG"
    hdiutil verify "$DMG"
    shasum -a 256 "$DMG" "$OUT/Micropolis-0.1.0-source.tar.gz" > "$OUT/SHA256SUMS.txt"
    ;;
  *) echo 'usage: package_release.sh {sign|submit-app|dmg|submit-dmg|verify}' >&2; exit 2 ;;
esac
