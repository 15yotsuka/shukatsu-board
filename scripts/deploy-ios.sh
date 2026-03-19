#!/bin/bash
# deploy-ios.sh — ビルド → iOS転送 → git push を一発で実行
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

DEVICE_ID="00008120-00127CE93639A01E"  # うのiPhone 15
BUILD_DIR="/tmp/shukatsu-build"

echo "=== [1/5] Next.js ビルド ==="
npm run build

echo "=== [2/5] Capacitor sync ==="
npx cap sync ios

echo "=== [3/5] Xcode ビルド ==="
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -destination "id=$DEVICE_ID" \
  -configuration Debug \
  build \
  CONFIGURATION_BUILD_DIR="$BUILD_DIR" \
  2>&1 | grep -E "(error:|warning:|BUILD (SUCCEEDED|FAILED))" | tail -20

echo "=== [4/5] iPhone にインストール ==="
xcrun devicectl device install app \
  --device "$DEVICE_ID" \
  "$BUILD_DIR/App.app"

echo "=== [5/5] GitHub に push ==="
git add .
git status --short
git diff --staged --quiet || git commit -m "deploy: $(date '+%Y-%m-%d %H:%M')"
git push

echo ""
echo "✅ デプロイ完了！アプリを再起動してください。"
