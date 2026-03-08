#!/bin/bash

echo "========================================="
echo "=== App Store 審査シミュレーター 起動 ==="
echo "========================================="
echo ""

echo "=== 1. SAFETY ==="

# 1.1 プライバシーポリシーの存在確認
echo "[1.1] プライバシーポリシー"
if [ -f "public/privacy-policy.html" ] || [ -f "src/app/privacy/page.tsx" ]; then
  echo "  ✅ プライバシーポリシーページが存在"
else
  echo "  ❌ FAIL: プライバシーポリシーページがない"
  echo "     → Appleは全アプリにプライバシーポリシーURLを要求する"
  echo "     → public/privacy-policy.html を作成せよ"
fi

# 1.2 アプリ内からプライバシーポリシーへのリンク
echo "[1.2] アプリ内プライバシーポリシーリンク"
PRIVACY_LINK=$(grep -r "privacy" src/ --include="*.tsx" --include="*.ts" -l | head -5)
if [ -n "$PRIVACY_LINK" ]; then
  echo "  ✅ プライバシー関連の参照あり: $PRIVACY_LINK"
else
  echo "  ❌ FAIL: アプリ内にプライバシーポリシーへのリンクがない"
  echo "     → 設定画面またはアプリ内にリンクを追加せよ"
fi

# 1.3 ユーザーデータの外部送信チェック
echo "[1.3] 外部データ送信"
EXTERNAL_FETCH=$(grep -rn "fetch(" src/ --include="*.tsx" --include="*.ts" | grep -v "deadlines-" | grep -v "node_modules" | grep -v "//" | head -10)
if [ -n "$EXTERNAL_FETCH" ]; then
  echo "  ⚠️ WARNING: 外部fetchが検出された（要確認）:"
  echo "$EXTERNAL_FETCH"
  echo "     → 外部APIへのデータ送信がある場合、プライバシーポリシーに明記が必要"
else
  echo "  ✅ 外部へのデータ送信なし（ローカルのみ）"
fi

# 1.4 不適切なコンテンツの有無
echo "[1.4] 不適切コンテンツ"
INAPPROPRIATE=$(grep -rni "nsfw\|porn\|gambling\|drug\|weapon\|violence" src/ --include="*.tsx" --include="*.ts" | head -5)
if [ -n "$INAPPROPRIATE" ]; then
  echo "  ❌ FAIL: 不適切なコンテンツの可能性:"
  echo "$INAPPROPRIATE"
else
  echo "  ✅ 不適切なコンテンツなし"
fi

echo ""
echo "=== 2. PERFORMANCE ==="

# 2.1 ビルドが通るか
echo "[2.1] ビルド確認"
npm run build > /tmp/build-output.txt 2>&1
if [ $? -eq 0 ]; then
  echo "  ✅ npm run build 成功"
else
  echo "  ❌ FAIL: ビルドエラーあり"
  tail -20 /tmp/build-output.txt
fi

# 2.2 プレースホルダーコンテンツの検出
echo "[2.2] プレースホルダー検出"
PLACEHOLDER=$(grep -rni "lorem ipsum\|TODO:\|FIXME:\|placeholder\|coming soon\|dummy\|test data" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" | head -10)
if [ -n "$PLACEHOLDER" ]; then
  echo "  ⚠️ WARNING: プレースホルダーの可能性:"
  echo "$PLACEHOLDER"
  echo "     → Appleはプレースホルダーコンテンツがあるアプリをリジェクトする"
else
  echo "  ✅ プレースホルダーなし"
fi

# 2.3 console.log の残留
echo "[2.3] デバッグログ残留"
CONSOLE_LOG=$(grep -rn "console\.log\|console\.warn\|console\.error" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep -v "notifications.ts" | wc -l)
echo "  ℹ️ console.log/warn/error: ${CONSOLE_LOG}件"
if [ "$CONSOLE_LOG" -gt 10 ]; then
  echo "  ⚠️ WARNING: デバッグログが多い（本番では削除推奨）"
else
  echo "  ✅ 許容範囲"
fi

# 2.4 クラッシュの可能性（未処理の例外）
echo "[2.4] エラーハンドリング"
UNHANDLED=$(grep -rn "\.catch\|try.*{" src/ --include="*.tsx" --include="*.ts" | wc -l)
FETCH_COUNT=$(grep -rn "fetch(" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" | wc -l)
echo "  ℹ️ fetch呼び出し: ${FETCH_COUNT}件 / try-catch/catch: ${UNHANDLED}件"
if [ "$FETCH_COUNT" -gt 0 ] && [ "$UNHANDLED" -eq 0 ]; then
  echo "  ❌ FAIL: fetchにエラーハンドリングがない"
else
  echo "  ✅ エラーハンドリングあり"
fi

echo ""
echo "=== 3. BUSINESS ==="

# 3.1 課金・IAP の有無
echo "[3.1] アプリ内課金"
IAP=$(grep -rni "purchase\|subscribe\|payment\|price\|billing\|StoreKit" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" | head -5)
if [ -n "$IAP" ]; then
  echo "  ⚠️ WARNING: 課金関連コードの可能性:"
  echo "$IAP"
  echo "     → Apple IAP以外の決済は禁止"
else
  echo "  ✅ アプリ内課金なし（無料アプリ）"
fi

# 3.2 外部リンクでの購入誘導
echo "[3.2] 外部購入誘導"
EXTERNAL_BUY=$(grep -rni "buy\|購入\|shop\|store\.apple\|play\.google" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" | head -5)
if [ -n "$EXTERNAL_BUY" ]; then
  echo "  ⚠️ WARNING: 外部購入誘導の可能性（要確認）"
else
  echo "  ✅ 外部購入誘導なし"
fi

echo ""
echo "=== 4. DESIGN ==="

# 4.1 Minimum Functionality チェック
echo "[4.1] 最低限の機能"
PAGE_COUNT=$(find src/app -name "page.tsx" | wc -l)
COMPONENT_COUNT=$(find src/components -name "*.tsx" | wc -l)
echo "  ℹ️ ページ数: ${PAGE_COUNT} / コンポーネント数: ${COMPONENT_COUNT}"
if [ "$PAGE_COUNT" -lt 2 ] || [ "$COMPONENT_COUNT" -lt 5 ]; then
  echo "  ❌ FAIL: 機能が少なすぎる（Minimum Functionality違反の可能性）"
else
  echo "  ✅ 十分な機能量"
fi

# 4.2 Webラッパー判定（ネイティブ機能の有無）
echo "[4.2] ネイティブ機能"
NATIVE=$(grep -rni "capacitor\|@capacitor\|PushNotification\|LocalNotification\|Haptics\|StatusBar" src/ package.json --include="*.tsx" --include="*.ts" --include="*.json" | grep -v "node_modules" | head -5)
if [ -n "$NATIVE" ]; then
  echo "  ✅ ネイティブ機能の参照あり"
else
  echo "  ⚠️ WARNING: ネイティブ機能が検出されない"
  echo "     → Webラッパーとみなされリジェクトされるリスクあり"
  echo "     → Capacitorプラグイン（通知等）を実装すること"
fi

# 4.3 レスポンシブ対応
echo "[4.3] レスポンシブ対応"
RESPONSIVE=$(grep -rn "sm:\|md:\|lg:\|max-w-\|min-w-\|flex-col\|flex-wrap" src/components --include="*.tsx" | wc -l)
echo "  ℹ️ レスポンシブ関連クラス: ${RESPONSIVE}件"
if [ "$RESPONSIVE" -lt 10 ]; then
  echo "  ⚠️ WARNING: レスポンシブ対応が少ない"
else
  echo "  ✅ レスポンシブ対応あり"
fi

# 4.4 アクセシビリティ
echo "[4.4] アクセシビリティ"
ARIA=$(grep -rn "aria-\|role=" src/components --include="*.tsx" | wc -l)
ALT=$(grep -rn "alt=" src/components --include="*.tsx" | wc -l)
echo "  ℹ️ aria属性: ${ARIA}件 / alt属性: ${ALT}件"
if [ "$ARIA" -eq 0 ] && [ "$ALT" -eq 0 ]; then
  echo "  ⚠️ WARNING: アクセシビリティ属性がゼロ"
else
  echo "  ✅ アクセシビリティ属性あり"
fi

echo ""
echo "=== 5. LEGAL ==="

# 5.1 ライセンス・著作権
echo "[5.1] ライセンス"
if [ -f "LICENSE" ] || [ -f "LICENSE.md" ]; then
  echo "  ✅ LICENSEファイルあり"
else
  echo "  ⚠️ WARNING: LICENSEファイルがない（必須ではないが推奨）"
fi

# 5.2 サードパーティライセンス確認
echo "[5.2] サードパーティ依存関係"
DEP_COUNT=$(cat package.json | grep -c '"[^"]*":' | head -1)
echo "  ℹ️ 依存パッケージ数: 確認はpackage.jsonを参照"

# 5.3 年齢レーティング判定
echo "[5.3] 年齢レーティング"
UGC=$(grep -rni "user.*content\|comment\|review\|post\|upload.*image" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" | head -5)
if [ -n "$UGC" ]; then
  echo "  ⚠️ WARNING: UGC（ユーザー生成コンテンツ）の可能性"
  echo "     → モデレーション機能が必要"
else
  echo "  ✅ UGCなし → 年齢レーティング 4+ で申請可能"
fi

# 5.4 アカウント削除機能（ログインがある場合）
echo "[5.4] アカウント削除"
LOGIN=$(grep -rni "login\|signin\|sign.in\|auth\|register\|signup" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" | head -5)
if [ -n "$LOGIN" ]; then
  echo "  ⚠️ WARNING: ログイン機能がある場合、アカウント削除機能が必須"
else
  echo "  ✅ ログイン機能なし（アカウント削除不要）"
fi

echo ""
echo "========================================="
echo "=== App Store 審査シミュレーション結果 ==="
echo "========================================="
echo ""
echo "上記の ❌ FAIL を全て解消してから提出してください。"
echo "⚠️ WARNING は必須ではないが、対応するとリジェクト率が下がります。"
echo ""
echo "=== ShukatsuBoard固有の推奨事項 ==="
echo "1. プライバシーポリシーページを作成し、設定画面からリンク"
echo "2. Capacitor導入後にネイティブ通知を実装（Webラッパー判定回避）"
echo "3. スクリーンショットはネイティブアプリ風に（ステータスバー付き）"
echo "4. App Store Connectの説明文に機能一覧を明記"
echo "5. 審査ノートに「ログイン不要、全データはデバイス内に保存」と記載"
