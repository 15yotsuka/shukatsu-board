# ShukatsuBoard STATUS

## 概要
就活生向けカンバン型選考管理Webアプリ。ログイン不要、localStorage保存。「これさえ開けば次何すればいいかわかる」がコンセプト。

## 現在の状態
- 開発フェーズ: iOS実機テスト・バグ修正中（App Store公開前の最終調整）
- 最終更新: 2026-03-10
- 動作ステータス: ⚠️ 動作するがiOS実機テスト未完了の機能あり
- schemaVersion: 12

## 最後にやったこと
- CompanyCard.tsx: 選考中/結果待ちラベル表示、色帯タップで結果待ちON/OFF
- 選考予定↔プルダウン双方向連動
- 締切タブをfetch-based（JSON取得、localStorage廃止）に刷新

## 未解決・次やること
- iOS実機テスト（長押しクイック編集・左スワイプで見送り・色帯タップ結果待ち）
- プログレスバー復活（設定ON/OFF）— 未着手
- タグ欄「結果待ち」タグ削除（awaitingResultフラグとの混同回避）
- App Store公開フロー（Static Export → Capacitor → Xcode → 提出）

## 技術スタック
- Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- Zustand+persist, @dnd-kit, date-fns v4, framer-motion, nanoid
- Vercel（デプロイ）, Capacitor（iOS予定）

## ファイル構成（主要ファイル）
- `src/app/page.tsx` — ホーム画面（カンバンボード）
- `src/app/companies/page.tsx` — 企業一覧
- `src/app/calendar/page.tsx` — カレンダー
- `src/app/tasks/page.tsx` — タスク
- `src/components/board/CompanyCard.tsx` — カード（色帯・長押し・スワイプ・結果待ち）
- `src/components/board/CompanyDetailModal.tsx` — 企業詳細モーダル
- `src/components/deadline/DeadlineTab.tsx` — 締切タブ（fetch-based）
- `src/store/useAppStore.ts` — Zustand全状態管理（schemaVersion: 12）
- `src/lib/types.ts` — 型定義
- `src/lib/stageColors.ts` — 選考段階カラーマップ
