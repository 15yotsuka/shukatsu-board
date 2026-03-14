# ShukatsuBoard STATUS

## 概要
就活生向けカンバン型選考管理Webアプリ。ログイン不要、localStorage保存。「これさえ開けば次何すればいいかわかる」がコンセプト。

## 現在の状態
- 開発フェーズ: iOS実機テスト中（App Store公開準備ほぼ完了）
- 最終更新: 2026-03-14
- 動作ステータス: ✅ ビルドエラー0件・静的エクスポート済み
- schemaVersion: **14**

## 最後にやったこと
- CompanyDetailModal.tsx: 選考段階を進めたとき旧ScheduledActionを削除するよう修正
- 3バグ修正（ホーム消えない / カレンダー絞り込み / 締切HP遷移）
- Capacitor + ローカル通知スケジューリング実装（@capacitor/local-notifications）
- 企業タブにエントリー前絞り込み・業界絞り込み追加・チュートリアル順序変更

## 未解決・次やること
- iOS実機テスト（長押しクイック編集・左スワイプで見送り・色帯タップ結果待ち・ローカル通知）
- タグ欄「結果待ち」タグ削除（awaitingResultフラグと二重管理になっている）
- App Store Connect提出（Xcodeビルド → 提出）

## 技術スタック
- Next.js 16.1.6 (App Router, output:'export'), TypeScript, Tailwind CSS v4
- Zustand v5+persist (schemaVersion=14), @dnd-kit/core v6, date-fns v4, framer-motion v12
- @capacitor/core v8.2, @capacitor/local-notifications v8.0.2
- Vercel（Web自動デプロイ済み）, Capacitor（iOS向け・appId: com.yuotsuka.shukatsuboard）

## ファイル構成（主要ファイル）
- `src/app/page.tsx` — ホーム（今日/今週/それ以降のToDoリスト、統計チップ）
- `src/app/tasks/page.tsx` — 企業一覧（TaskCard、ソート/フィルター、ドラッグ並び替え）
- `src/app/calendar/page.tsx` — カレンダー（月表示、予定追加3ステップ）
- `src/app/deadline/page.tsx` — 締切タブ（CSVフェッチ方式）
- `src/components/board/TaskCard.tsx` — 企業一覧で使用中のカード（色帯・進度ドット・タグ）
- `src/components/board/CompanyDetailModal.tsx` — 4タブ詳細（選考詳細/基本情報/マイページ/メモ）
- `src/components/board/AddCompanyForm.tsx` — 企業追加フォーム
- `src/components/board/BulkImportModal.tsx` — CSV/テキスト一括インポート
- `src/components/layout/NotificationScheduler.tsx` — Capacitorローカル通知スケジュール
- `src/store/useAppStore.ts` — Zustand全状態管理（schemaVersion: 14）
- `src/lib/types.ts` — Company, StatusColumn, Interview, ESEntry, ScheduledAction, Tag, ActionType
- `src/lib/notifications.ts` — scheduleLocalNotifications() / requestNotificationPermission()
- `public/deadlines-27.csv`, `public/deadlines-28.csv` — 締切情報CSVデータ

## 未使用コンポーネント（削除候補）
- `src/components/board/KanbanBoard.tsx` — TaskCardで置き換わり・未使用
- `src/components/board/CompanyCard.tsx` — KanbanBoard用・未使用
- `src/components/board/StatusColumn.tsx` — KanbanBoard関連・未使用
- `src/components/board/MiniWeekCalendar.tsx` — 参照なし
- `src/components/board/HeroCardCarousel.tsx` — 参照なし
- `src/components/board/DeadlineReminder.tsx` — 参照なし
- `src/components/status/StatusEditor.tsx` — SelectionFlowEditorで統合済み・未使用
