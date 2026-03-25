# ShukatsuBoard — STATUS.md
最終更新: 2026-03-24（セッション2）

## 現在地
**Phase 3: App Store 再申請準備中**
Guideline 2.1（Information Needed）でリジェクト。Info.plist修正・Review Notes更新済み。
Xcodeアーカイブ → TestFlight再アップロード → App Store Connect再提出がYu手動で残っている。

## 直近の変更（最新5件）
- 2026-03-24: src/app/privacy/page.tsx + public/privacy-policy.html — Guideline 5.1.1対応: 削除方法・ポリシー変更・連絡先を両ファイルで統一、「全企業を削除」UIと一致
- 2026-03-24: src/components/settings/SettingsModal.tsx:587 — プライバシーリンクを /privacy-policy.html → /privacy に修正
- 2026-03-24: asc-preflight-agent.md — Apple公式ガイドライン+ShukatsuBoard固有チェックリストを追加
- 2026-03-24: ios/App/App/Info.plist — CFBundleDisplayName を `ShukatsuBoard` → `就活ボード` に変更
- 2026-03-24: ios/App/App/Info.plist — UIRequiredDeviceCapabilities を空配列 → `arm64` のみに修正
- 2026-03-24: ios/App/App/Info.plist — CFBundleDevelopmentRegion `ja` → `en`（Base.lproj整合）
- 2026-03-24: ASC API — App Review Notes を7セクション（目的・操作手順・通知フロー・外部サービス・プライバシー・地域差・規制業種）で更新済み
- 2026-03-20: App Store Connect → バージョン1.0「審査に提出」完了（その後2.1でリジェクト）
- 2026-03-20: useAppStore.ts → DEFAULT_DISPLAY_SETTINGS を最小表示に変更
- 2026-03-20: 実機インストール完了（iPhone / com.yuotsuka.shukatsuboard）

## 動作状況
- ✅ ホーム画面（今日/今週/それ以降のToDo・統計チップ）
- ✅ 企業一覧（TaskCard・ソート/フィルター・スワイプ削除）
- ✅ 企業詳細モーダル（4タブ・選考予定・タグ・メモ）
- ✅ カレンダー（月表示・予定追加3ステップ）
- ✅ 締切タブ（CSV fetch・業界フィルター・27/28卒）
- ✅ TestFlight ビルドアップロード済み（外部審査待ち）
- ✅ Vercel デプロイ済み（https://shukatsu-board.vercel.app）
- ⚠️ ローカル通知（実機未確認）

## App Store 提出状況
### 自動設定済み（API）
- ✅ アプリ説明文（日本語）
- ✅ キーワード（10語）
- ✅ サポートURL: https://shukatsu-board.vercel.app
- ✅ プライバシーポリシーURL: https://shukatsu-board.vercel.app/privacy
- ✅ カテゴリ: 教育（プライマリ）/ 仕事効率化（セカンダリ）
- ✅ 著作権: 2026 Yu Otsuka
- ✅ サブタイトル: 就職活動の選考を一元管理
- ✅ スクリーンショット: iPhone 4枚(1290x2796) + iPad 4枚(2048x2732)
  - グラデーション背景 + キャッチコピー + 最新デモデータ画面

### ユーザー操作が必要（手動）
1. ~~**年齢制限設定**: App Store Connect → アプリ → 年齢制限 → 「4+」を選択~~ ✅ 完了
2. ~~**審査提出**: App Store Connect → バージョン1.0 → 「審査に提出」ボタン~~ ✅ 完了（審査待ち）

## バグ・注意事項
### 発見済み問題（未修正）
- **同日複数面接の重複排除**: page.tsx の重複排除が時刻を無視するため、同日2本目の面接が隠れる可能性
- **23:00→00:00自動計算**: CompanyDetailModal で終了時刻 `(h+1)%24` により23:00→00:00になる（翌日扱いなし）
- **結果待ちの二重管理**: `awaitingResult` フラグと `'結果待ち'` タグが共存

### 技術的制約（必ず守る）
- Zustandセレクタ内でfilter/map禁止（React 19無限ループ）→ useMemo or useShallow
- date-fns v4はparseISO後にisValid()チェック必須
- schemaVersion上げずに型変更禁止 → マイグレーション必須
- `npm run build` エラー0件確認後にpush
- Tailwind CSS v4: `dark:` は `@custom-variant dark (&:where(.dark, .dark *))` で動作
- gradYear===nullのときDeadlineContextはfetchしない

## App Store 設定値メモ
- App ID: 6760877374 / Bundle: com.yuotsuka.shukatsuboard
- Version ID: 9d6821e0-58ea-43c6-9acf-adec9aa52e1a
- iPhone Set ID: 8fb5d59a-4f59-4da3-93df-b41a1210c422 (APP_IPHONE_67)
- iPad Set ID: 36eda342-9338-415c-9bff-2a8e7e6a427a (APP_IPAD_PRO_3GEN_129)
- ASC API Key: C9WM6RT2H7 / Issuer: 91a75030-20b6-40af-a732-405c5c4b04ac
- スクショ生成スクリプト: /tmp/gen_promo.py（再生成用）

## 次やること
### Phase 3（再申請必須・最優先）
1. ~~[Yu手動] iPhoneで画面収録~~ ✅ 完了（2026-03-24）
2. [Yu手動] Xcode で `Product > Archive` → TestFlight に再アップロード — 再開条件: Xcodeを開いて実施
3. [Yu手動+AI] Resolution Center 返信 — 再開条件: 動画をMacにAirDrop → AIがAPIでアップロード → Yuが Resolution Center web UI で「Reply」送信
4. [AI] ビルド差し替え + 再提出 — 再開条件: ステップ2完了後「TestFlightに新ビルド来た」と伝える → AIがAPI実行

### Phase 3（後回しOK）
5. 「結果待ち」タグの二重管理を解消（awaitingResultフラグに統一）
6. 同日複数面接の重複排除バグ修正
7. 23:00→00:00 自動計算バグ修正
