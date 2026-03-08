# ShukatsuBoard 引き継ぎ資料

> **宛先：** Sonnetチャット
> **作成日：** 2026-03-02
> **作成者：** Opusチャット

---

## プロジェクト概要

**ShukatsuBoard** = 日本の就活生向け選考管理Webアプリ（カンバンボード型）

- **公開URL：** https://shukatsu-board-hpf3ndz8u-15yotsukas-projects.vercel.app
- **GitHub：** https://github.com/15yotsuka/shukatsu-board
- **ステータス：** MVP公開済み、UI改善＋機能追加フェーズ

---

## ユーザーについて

- ソフトウェア開発者・コンテンツクリエイター
- Digital Communication Design Co., Ltd. のインターン
- Windows 11環境、Python/JavaScript中心
- プログラミング実務経験あり、ただしフロントエンド（React/Next.js）は学習中
- Claude Codeを使って開発（コード自体はClaude Codeが書く）
- 直接的・結果重視のコミュニケーションスタイル
- 「コピペできるプロンプト」形式を好む（MDファイルよりもテキスト直貼り）

---

## 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript |
| スタイル | Tailwind CSS |
| 状態管理 | Zustand + persist (localStorage) |
| D&D | @dnd-kit/core + @dnd-kit/sortable |
| 日付 | date-fns |
| ID生成 | nanoid |
| デプロイ | Vercel（無料プラン） |
| 認証 | なし（ログイン不要がコア設計思想） |
| DB | なし（localStorage保存） |

---

## 完了済みの作業

### Phase 1：ボード機能 ✅
- カンバンボード（インターン/本選考の2トラック）
- 企業カード追加・編集・削除
- ドラッグ&ドロップでステータス変更
- ステータスの追加・編集・並替・削除
- インターン→本選考の昇格機能

### Phase 2：カレンダー機能 ✅
- 月カレンダー表示（前後移動）
- 企業詳細から面接追加
- カレンダーに面接日ドット表示
- 直近面接一覧表示

### Phase 3：ES管理機能 ✅
- 企業選択してES設問・回答管理
- 文字数カウント（超過時赤文字）
- テンプレートから設問一括追加
- 他企業からESコピー

### iOS風UIリニューアル ✅
- 全21ファイルをiOS風デザインに改修済み
- テーマ：白ベース + #007AFF（iOS System Blue）
- 半透明すりガラスヘッダー・タブバー
- セグメンテッドコントロール
- モーダルシート（下からスライドアップ、グラブバー付き）
- `npm run build` エラー0件

### デプロイ ✅
- GitHubにpush済み（main ブランチ）
- Vercelで本番デプロイ済み
- Deployment Protectionを解除済み（誰でもアクセス可能）

### 調査レポート ✅（docsフォルダに保存済み）
- `docs/competitive-and-user-analysis.md` — 競合分析＋ユーザーレビュー調査（日本10ツール+海外8ツール）
- `docs/03-z-gen-ui-trends.md` — Z世代UIデザイントレンド調査（952行、20アプリ分析）

---

## 調査で判明した最重要ファクト

### ShukatsuBoardの強み（絶対に崩すな）
1. **カンバン型就活専用アプリは市場に競合ゼロ**（唯一のポジション）
2. ログイン不要・完全無料
3. 営業メール・通知なし（既存就活アプリ最大の不満を回避）
4. インターン/本選考2トラック（日本市場特化）
5. ES管理一体型（海外ツールにもない）

### 現在の弱点
1. **ダークモード未対応**（Z世代が最も嫌うポイント）
2. iOSデフォルト感で**個性がない**
3. マイクロインタラクション不足
4. 締切リマインダーがない
5. データバックアップ手段がない（localStorage消失の不安）

### Z世代が「ダサい」と感じるUI要素
- ダークモード非対応
- 情報過多・コーポレート感
- マイクロインタラクション不足
- 「おじさんアプリ」感（詳細は docs/03-z-gen-ui-trends.md 参照）
- 現在のShukatsuBoardは「致命的にダサくはない」が「個性なし」

---

## 次にやるべきこと（優先度順・未着手）

ユーザーはまだ優先順位を最終決定していない。以下3方向の選択を提示して決めてもらうこと：

### 方向A：見た目の改善
- ダークモード対応（CSS変数 + Tailwind dark:）
- ステータスカラーシステム刷新（カード左ボーダー色分け）
- マイクロインタラクション強化（framer-motion導入）
- Variable Font（Inter Variable）導入
- Emotional Design（内定confetti、励ましEmpty State）

### 方向B：実用機能の追加
- 締切リマインダー（4割が時間把握ミス経験 → 最大ペイン）
- マイページID/PW管理（30-50社分を覚えきれない → 実装難易度：低）
- JSONエクスポート/バックアップ（localStorage消失不安 → 実装難易度：低）

### 方向C：感情デザイン
- 内定時confettiアニメーション
- 励ましメッセージ（Empty State）
- 進捗の見える化（統計ダッシュボード）
- Duolingo的なゲーミフィケーション

---

## プロジェクト内の重要ファイル

```
shukatsu-board/
├── src/
│   ├── app/
│   │   ├── page.tsx          # メイン（カンバンボード）
│   │   ├── calendar/page.tsx # カレンダーページ
│   │   ├── es/page.tsx       # ES管理ページ
│   │   └── layout.tsx        # レイアウト（フォント設定等）
│   ├── components/
│   │   ├── layout/           # Header, BottomNav, TrackTabs
│   │   ├── board/            # KanbanBoard, StatusColumn, CompanyCard, AddCompanyForm, CompanyDetailModal
│   │   ├── status/           # StatusEditor, PromoteDialog
│   │   ├── calendar/         # MonthCalendar, UpcomingList, InterviewForm
│   │   └── es/               # ESForm, ESTemplates, ESCopyDialog
│   ├── store/
│   │   └── useAppStore.ts    # Zustand store（全状態管理）
│   └── lib/
│       ├── types.ts          # TypeScript型定義
│       ├── storage.ts        # localStorage操作
│       └── defaults.ts       # デフォルトステータス、ESテンプレート等
├── docs/
│   ├── competitive-and-user-analysis.md  # 競合＋ユーザー調査
│   └── 03-z-gen-ui-trends.md            # Z世代トレンド調査
└── public/
    └── manifest.json         # PWA設定
```

---

## Claude Codeへの指示の出し方

ユーザーは**コピペでClaude Codeに貼り付けられるプロンプト形式**を好む。

### 形式ルール
- MDファイルではなく**コードブロック内のテキスト**で渡す
- ファイル添付より**直接貼り付け**
- 「〇〇.mdを読んで」ではなく、必要な情報を全部プロンプト内に書く
- 各ステップの完了条件を明記（特に `npm run build` エラー0件）
- Windows環境での文字化け防止（UTF-8）に注意

### 過去に使った指示書パターン（参考）
- 機能修正：診断コマンド → チェックポイント列挙 → ビルド確認
- UI改善：globals.css置き換え → コンポーネント順に改修 → ビルド確認
- 調査：調査対象列挙 → 抽出項目指定 → 出力形式指定（docs/に保存）

---

## 開発の鉄則（常に適用）

1. **Windows環境対策：** ファイル読み書き時のUTF-8エンコーディング
2. **ログイン不要を維持：** 認証・登録は絶対に追加しない（コアの差別化）
3. **MVPと手動確認：** 全自動化せず、ユーザーが確認できる余地を残す
4. **変更後は必ず `npm run build` でエラー0件を確認**
5. **GitHubにpush → Vercelが自動デプロイ**（手動デプロイ不要）

---

## Vercel関連情報

- Vercel無料プラン（Hobby）使用中
- GitHubのmainブランチにpushすると自動デプロイ
- Deployment ProtectionはOFF（公開済み）
- 環境変数：なし（localStorageのみなのでサーバーサイドの設定不要）

---

## この引き継ぎで渡していないもの

以下はOpusチャットのコンテキストにのみ存在し、docsフォルダには保存されていない：

- `SPEC.md` — 初期の技術仕様書（Phase 1-3の設計詳細）
- `PROMPT_TEMPLATES.md` — Phase 1-3の実装プロンプト集
- `UI_IMPROVEMENT.md` — iOS風UIリニューアルの詳細仕様
- `FIX_AND_UI.md` — Phase 2・3の修正＋UI改善の統合指示書
- `SETUP_GUIDE.md` — Windows環境セットアップガイド

これらは全て実装済みなので、Sonnetチャットでは参照不要。必要になったらユーザーがOpusに聞けばよい。
