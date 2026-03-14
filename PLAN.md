# ShukatsuBoard — PLAN.md

## ゴール
就活生向けカンバン型選考管理アプリ。「これさえ開けば就活で次何すればいいかわかる」。
ログイン不要、localStorage保存。App Store公開を最終目標とする。

## 技術スタック
- Next.js 16.1.6 (App Router), TypeScript, Tailwind CSS v4
- Zustand v5+persist, @dnd-kit, date-fns v4, framer-motion v12, nanoid
- @capacitor/core v8.2 + @capacitor/local-notifications v8.0.2
- Vercel（Web自動デプロイ）, Capacitor（appId: com.yuotsuka.shukatsuboard, webDir: 'out'）
- schemaVersion: **14**（変更時は必ずマイグレーション）

## 現在の状態（2026-03-14）

### ✅ 完了・動作確認済み（Web版）
- ホーム画面（今日/今週/それ以降のToDoリスト、統計チップ）
- 企業一覧（TaskCard、ソート/フィルター/絞り込み、ドラッグ並び替え）
- 企業詳細モーダル（選考予定・タグ・メモ・マイページ 4タブ）
- 選考予定↔プルダウン連動（双方向自動更新、旧アクション自動削除）
- カレンダー（月表示・5種別・色凡例・予定追加3ステップフロー）
- 締切タブ（CSV fetch方式・業界フィルター・27卒28卒・期限切れ折りたたみ）
- 設定画面・チュートリアル（7フラグ: home/companies/detail/calendar/settings/addCompany/deadline）
- 企業追加・一括追加（フォーム/CSVテキストモード）
- 選考中/結果待ちラベル（色帯タップでON/OFF）
- プログレスバー（DisplaySettings.showProgressBar、設定でON/OFF）
- ローカル通知スケジューリング（Capacitor、設定タブに通知設定UI）
- `output: 'export'` 設定済み（next.config.ts）→ Capacitor webDir='out' と対応済み

### ⚠️ iOS実機テスト未完了
- 長押しクイック編集（WebkitTouchCallout実装済み）
- 左スワイプで見送り
- 色帯タップで結果待ちON/OFF
- ローカル通知（実機での動作未確認）

### ❌ 未実装・残課題
- タグ欄「結果待ち」タグ削除（awaitingResultフラグと二重管理になっている）
- 未使用コンポーネント削除（KanbanBoard.tsx / CompanyCard.tsx / StatusColumn.tsx / MiniWeekCalendar.tsx / HeroCardCarousel.tsx / DeadlineReminder.tsx / StatusEditor.tsx）

## 次にやること

### Phase 1: iOS実機テスト（今ここ）
1. Xcodeで実機ビルド → 上記4点を実機確認
2. 不具合があれば修正

### Phase 2: App Store公開
1. Xcode → App Store Connect 提出（`output: 'export'` 設定済み・Capacitor設定済み）
2. （任意）ネイティブプッシュ通知への移行

### Phase 3: コードクリーンアップ
- 未使用コンポーネント7個削除
- タグ欄「結果待ち」タグ削除

### Phase 4: 将来機能
- グループ機能（DB・認証の大規模設計変更が必要）

## 重要な技術制約（必ず守る）
1. Zustandセレクタ内でfilter/map禁止 → useMemoをコンポーネント内で使う
2. date-fns v4はparseISO後にisValid()チェック必須
3. schemaVersion上げずに型変更禁止 → マイグレーション必須
4. `TaskCard`（/tasks用）と`CompanyCard`（未使用）を混同しない
5. `Interview.datetime` はISO文字列（≠ ScheduledAction.startTime "HH:mm"）
6. `npm run build` エラー0件確認後にpush
7. 全新規要素に `dark:` クラス必須
8. Tailwind CSS v4: `dark:` は `@custom-variant dark (&:where(.dark, .dark *))` で動作
9. gradYear===nullのときDeadlineContextはfetchしない

## Claude Code運用ルール
- **Sonnet:** UI変更・単一ファイル修正・grep系
- **Opus:** 型変更+マイグレーション・複数画面波及・データ設計判断
- プロンプト冒頭: 「この手順を1文字も飛ばさず実行せよ」
- 末尾必須: UIセルフチェックリスト5項目 + `npm run build` + `git push origin main`

## 意思決定ログ
| 日付 | 決定内容 | 理由 |
|------|---------|------|
| 2026-03 | 「ステータス」→「選考段階」にリネーム | 就活生に直感的でなかった |
| 2026-03 | 優先度タグ廃止 | 「どこに反映されてるかわからない」ユーザー声 |
| 2026-03 | 色は選考段階で統一（締切残日数の色廃止） | 色の意味が混在して混乱 |
| 2026-03 | カード左端に色帯 | カード全体着色より視認性高 |
| 2026-03 | 結果待ちは色帯タップでON/OFF | モーダル不要・カード上で完結 |
| 2026-03 | プログレスバーON/OFF（設定で切替） | 情報量の好みが分かれるため |
| 2026-03 | 選考予定↔プルダウン双方向連動 | 手動2度更新が非直感的だった |
| 2026-03 | 締切タブはCSV fetch方式 | 全ユーザーが同じデータを見る設計に |
| 2026-03 | KanbanBoard廃止・TaskCardで統一 | 実装途中でリスト形式の方がUX良いと判断 |
| 2026-03 | output:'export' + Capacitor導入 | App Store公開のため |
