#!/usr/bin/env bash
# Creates "Pi Academy.app" on the user's Desktop — opens the live CPA practice
# program (the Academy) directly. Sibling of the BOG launcher: the two programs
# launch separately but are integral parts of one another.
set -euo pipefail

APP_NAME="${ACADEMY_APP_NAME:-Pi Academy · CPA Practice}"
APP_URL="${ACADEMY_APP_URL:-https://bog-accounting-v5.vercel.app/academy}"
DESKTOP="${HOME}/Desktop"
APP_PATH="${DESKTOP}/${APP_NAME}.app"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SVG="${ROOT}/public/academy-icon.svg"
BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "${BUILD_DIR}"' EXIT

echo "→ Building ${APP_NAME}.app on Desktop"
echo "  URL: ${APP_URL}"

# Remove legacy Academy launcher names so one canonical program icon remains.
rm -rf "${DESKTOP}/Pi Academy.app" 2>/dev/null || true
rm -rf "${DESKTOP}/CPA Academy.app" 2>/dev/null || true

# PNG from SVG (Quick Look on macOS)
qlmanage -t -s 1024 -o "${BUILD_DIR}" "${SVG}" >/dev/null 2>&1
PNG="${BUILD_DIR}/$(basename "${SVG}").png"
if [[ ! -f "${PNG}" ]]; then
  echo "Could not render icon from ${SVG}" >&2
  exit 1
fi

ICONSET="${BUILD_DIR}/AppIcon.iconset"
mkdir -p "${ICONSET}"
sips -z 16 16     "${PNG}" --out "${ICONSET}/icon_16x16.png"      >/dev/null
sips -z 32 32     "${PNG}" --out "${ICONSET}/icon_16x16@2x.png"   >/dev/null
sips -z 32 32     "${PNG}" --out "${ICONSET}/icon_32x32.png"      >/dev/null
sips -z 64 64     "${PNG}" --out "${ICONSET}/icon_32x32@2x.png"   >/dev/null
sips -z 128 128   "${PNG}" --out "${ICONSET}/icon_128x128.png"    >/dev/null
sips -z 256 256   "${PNG}" --out "${ICONSET}/icon_128x128@2x.png" >/dev/null
sips -z 256 256   "${PNG}" --out "${ICONSET}/icon_256x256.png"    >/dev/null
sips -z 512 512   "${PNG}" --out "${ICONSET}/icon_256x256@2x.png" >/dev/null
sips -z 512 512   "${PNG}" --out "${ICONSET}/icon_512x512.png"    >/dev/null
sips -z 1024 1024 "${PNG}" --out "${ICONSET}/icon_512x512@2x.png" >/dev/null
iconutil -c icns "${ICONSET}" -o "${BUILD_DIR}/AppIcon.icns"

rm -rf "${APP_PATH}"
mkdir -p "${APP_PATH}/Contents/MacOS" "${APP_PATH}/Contents/Resources"

cat > "${APP_PATH}/Contents/MacOS/launcher" <<EOF
#!/bin/bash
open "${APP_URL}"
EOF
chmod +x "${APP_PATH}/Contents/MacOS/launcher"

cp "${BUILD_DIR}/AppIcon.icns" "${APP_PATH}/Contents/Resources/AppIcon.icns"

cat > "${APP_PATH}/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>launcher</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundleIdentifier</key>
  <string>com.bog.academy.launcher</string>
  <key>CFBundleName</key>
  <string>${APP_NAME}</string>
  <key>CFBundleDisplayName</key>
  <string>${APP_NAME}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
PLIST

touch "${APP_PATH}"

echo "✓ Created: ${APP_PATH}"
echo "  Double-click it on your Desktop to open Pi Academy."
echo "  Optional: drag it to the Dock for one-click access."
