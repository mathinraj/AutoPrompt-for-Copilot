#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
VERSION=$(grep '"version"' "$ROOT/manifest.json" | sed 's/.*: *"\(.*\)".*/\1/')

CHROME_ZIP="autoprompt-for-chrome-${VERSION}.zip"
FIREFOX_ZIP="autoprompt-for-firefox-${VERSION}.zip"

EXCLUDES=(-x "*.DS_Store" -x "*.map" -x "icons/logo.svg")
FOLDERS=(manifest.json background/ content/ popup/ data/ icons/ landing/)

echo "📦 Packaging AutoPrompt for Copilot v${VERSION}"
echo ""

# --- Chrome ---
rm -f "$ROOT/$CHROME_ZIP"
(cd "$ROOT" && zip -r "$CHROME_ZIP" "${FOLDERS[@]}" "${EXCLUDES[@]}")

echo ""
echo "✅ Chrome:  $CHROME_ZIP ($(du -h "$ROOT/$CHROME_ZIP" | cut -f1))"

# --- Firefox ---
rm -f "$ROOT/$FIREFOX_ZIP"
(cd "$ROOT/firefox" && zip -r "$ROOT/$FIREFOX_ZIP" "${FOLDERS[@]}" "${EXCLUDES[@]}")

echo "✅ Firefox: $FIREFOX_ZIP ($(du -h "$ROOT/$FIREFOX_ZIP" | cut -f1))"

echo ""
echo "Ready for upload:"
echo "  Chrome Web Store  → $CHROME_ZIP"
echo "  Firefox Add-ons   → $FIREFOX_ZIP"
