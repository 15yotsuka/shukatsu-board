# ShukatsuBoard — PLAN.md

## ゴール
就活生向けカンバン型選考管理アプリ。「これさえ開けば就活で次何すればいいかわかる」。
ログイン不要、localStorage保存。App Store公開を最終目標とする。

## 技術スタック
- Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- Zustand+persist, @dnd-kit, date-fns v4, framer-motion
- Vercel（自動デプロイ）, Capacitor（App Store向け）
- schemaVersion: **12**（変更時は必ずマイグレーション）

## 現在の状態（2026-03-10）

### ✅ 完了・動作確認済み
- ホーム画面（色凡例・プルダウン絞り込み）
- 企業一覧（ソート・フィルター・カード左端色帯）
- 企業詳細モーダル（選考予定・タグ・メモ・マイページ）
- 選考予定↔プルダウン連動（双方向自動更新）
- カレンダー（月表示・5種別・色凡例）
- 締切タブ（JSON fetch・業界フィルター・27卒28卒・期限切れ折りたたみ）
- 設定画面・チュートリアル（5画面）・ダークモード
- 企業追加・一括追加（3モード）
- 選考中/結果待ちラベル（CompanyCard.tsx L387-396）

### ⚠️ iOS実機テスト未完了
- 長押しクイック編集（WebkitTouchCallout実装済み）
- 左スワイプで見送り
- 色帯タップで結果待ちON/OFF

### ❌ 未実装
- プログレスバー復活（設定でON/OFF）— 要望あり・未着手
- タグ欄「結果待ち」タグ削除（awaitingResultとの混同回避）

## 次にやること

### Phase 1: 動作確認（今ここ）
1. iOS実機テスト — 長押し・スワイプ・結果待ち・選考予定連動
2. 不具合があれば修正プロンプト生成→Claude Codeで修正

### Phase 2: App Store公開
1. `next.config.ts` に `output: 'export'` 追加（Static Export）
2. Capacitor導入・設定
3. Xcodeでビルド → App Store Connect提出
4. （任意）ネイティブプッシュ通知実装

### Phase 3: 将来機能
- プログレスバー復活（設定でON/OFF）
- タグ欄「結果待ち」タグ削除
- グループ機能（DB・認証の大規模設計変更が必要）

## 重要な技術制約（必ず守る）
1. Zustandセレクタ内でfilter/map禁止 → useMemoをコンポーネント内で使う
2. date-fns v4はparseISO後にisValid()チェック必須
3. schemaVersion上げずに型変更禁止 → マイグレーション必須
4. CompanyCardのコンテンツdivに `bg-card` `rounded-xl` 追加禁止 → 色帯が隠れる
5. `npm run build` エラー0件確認後にpush
6. 全新規要素に `dark:` クラス必須
7. Tailwind CSS v4: `dark:` は `@custom-variant dark (&:where(.dark, .dark *))` で動作
8. gradYear===nullのときDeadlineContextはfetchしない

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
| 2026-03 | カード左端に色帯（幅8〜12px） | カード全体着色より視認性高 |
| 2026-03 | 結果待ちは色帯タップでON/OFF | モーダル不要・カード上で完結 |
| 2026-03 | プログレスバー廃止（設定復活は未実装） | 色帯で代替可能 |
| 2026-03 | 選考予定↔プルダウン双方向連動 | 手動2度更新が非直感的だった |
| 2026-03 | 締切タブはfetch-based（localStorage廃止） | 全ユーザーが同じデータを見る設計に |
