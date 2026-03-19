# ShukatsuBoard — STATUS.md
最終更新: 2026-03-20

## 現在地
**Phase 1: iOS実機テスト待ち — Round 2 safe-area全修正・UX改善済み**
Web版は全機能完成。Vercel自動デプロイ運用中（schemaVersion: 14）。

## 直近の変更（最新5件）
- 2026-03-20: CompanyDetailModal.tsx → グラブバーdrag-to-dismiss・fullheight・safe-area・Webテスト折り返し修正
- 2026-03-20: SettingsModal/BulkImportModal → 全ボトムシートsafe-area修正・JSON削除・CSV→バックアップ
- 2026-03-20: AddCompanyForm.tsx → autoFocus削除（iOSキーボード自動表示防止）
- 2026-03-20: calendar/page.tsx → 時間入力5分刻み（step=300）
- 2026-03-20: tasks/page.tsx → 左スワイプ強化（赤背景＋ゴミ箱アイコン常時表示・飛ばしアニメ・haptic）
- 2026-03-20: tasks/page.tsx → 長押し時テキスト選択防止（no-selectクラス）・閉じるボタン44px
- 2026-03-19: calendar/page.tsx → ScheduledActionと締切の重複表示を解消
- 2026-03-19: deadline/page.tsx → エントリタップで企業追加/詳細表示

## 動作状況
- ✅ ホーム画面（今日/今週/それ以降のToDo・統計チップ）
- ✅ 企業一覧（TaskCard・ソート/フィルター・ドラッグ並び替え）
- ✅ 企業詳細モーダル（4タブ・選考予定・タグ・メモ）
- ✅ カレンダー（月表示・予定追加3ステップ）
- ✅ 締切タブ（CSV fetch・業界フィルター・27/28卒）
- ✅ 設定・チュートリアル（7フラグ）
- ✅ ローカル通知（Capacitor実装済み、実機未確認）
- ⚠️ 長押しクイック編集（改善済み・実機確認待ち）
- ⚠️ 左スワイプ見送り（改善済み・実機確認待ち）
- ⚠️ 色帯タップ結果待ちON/OFF（実機未確認）

## バグ・注意事項
### 発見済み問題（未修正）
- **同日複数面接の重複排除**: page.tsx の重複排除が時刻を無視するため、同日2本目の面接が隠れる可能性
- **23:00→00:00自動計算**: CompanyDetailModal で終了時刻 `(h+1)%24` により23:00→00:00になる（翌日扱いなし）
- **結果待ちの二重管理**: `awaitingResult` フラグと `'結果待ち'` タグが共存
- **nextDeadline の複数アクション非対応**: addScheduledAction() が nextActionDate を上書きするため複数アクション時は最初の期日のみ反映

### 技術的制約（必ず守る）
- Zustandセレクタ内でfilter/map禁止（React 19無限ループ）→ useMemo or useShallow
- date-fns v4はparseISO後にisValid()チェック必須
- schemaVersion上げずに型変更禁止 → マイグレーション必須
- `npm run build` エラー0件確認後にpush
- Tailwind CSS v4: `dark:` は `@custom-variant dark (&:where(.dark, .dark *))` で動作
- gradYear===nullのときDeadlineContextはfetchしない

### コードベース統計（2026-03-19時点）
- 総ファイル数: 38 (.ts/.tsx) / 総行数: 約11,960行
- 未使用コンポーネント: なし（確認済み）
- ビルドエラー: 0件

## 次やること
### Phase 1（今ここ）
1. Xcodeで実機ビルド → 長押し・左スワイプ・色帯タップ・ローカル通知を実機確認
2. 不具合があれば修正

### Phase 2（App Store公開）
1. App Store Connect 提出

### Phase 3（クリーンアップ・後回しOK）
1. 「結果待ち」タグの二重管理を解消（awaitingResultフラグに統一）
2. 同日複数面接の重複排除バグ修正
3. 23:00→00:00 自動計算バグ修正
