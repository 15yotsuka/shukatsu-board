# Feature B Design: 機能・データ系改善

Date: 2026-03-10

## Overview

予定アクション種別拡張・選考フローカスタマイズ・業界分類修正・チュートリアル改善の実装設計。

## Files Modified

- `src/lib/types.ts` — ActionType, ScheduledAction, Company型変更
- `src/components/board/CompanyDetailModal.tsx` — アクション追加フォーム・次の段階ポップアップ
- `src/components/board/AddCompanyForm.tsx` — 選考フローカスタマイズ
- `src/data/companySuggestions.ts` — 業界分類修正
- `src/components/onboarding/TutorialModal.tsx` — チュートリアル内容修正
- `src/components/settings/SettingsModal.tsx` — チュートリアル内容修正

## Files Off-Limits (other session)

- `src/components/board/CompanyCard.tsx`
- `src/app/page.tsx` (フィルター部分)
- `src/components/board/CompanyDetailModal.tsx` (タブアニメーション部分のみ)

## Type System Changes (schemaVersion 11 → 12)

```typescript
// ActionType: 'final'削除, 'gd'追加
export type ActionType = 'es' | 'webtest' | 'gd' | 'interview' | 'other';

// ScheduledAction: subType追加
export interface ScheduledAction {
  id: string;
  companyId: string;
  type: ActionType;
  subType?: string;  // 面接時: '1次面接'|'2次面接'|'3次面接'|'最終面接'
  date: string;
  time?: string;
  note?: string;
}

// Company: selectionFlow追加
interface Company {
  // ...
  selectionFlow?: string[];  // undefined = デフォルトフロー
}
```

Migration: existing 'final' ActionType → 'interview' with subType='最終面接'

## UI Changes

### 1. 予定アクション追加フォーム (CompanyDetailModal)
- 種別セレクト: ES提出 / Webテスト / GD / 面接 / その他
- 面接選択時: サブ種別セレクト表示 [1次|2次|3次|最終]
- 保存: type='interview', subType='2次面接' のように分離保存

### 2. 「次の段階へ→」ポップアップ (CompanyDetailModal)
- 次の選考段階からActionTypeを自動判定
- ES→'es', Webテスト→'webtest', 面接系→'interview'+サブ選択, それ以外→'other'
- 日時設定後、addScheduledAction経由でカレンダー自動反映
- スキップ可能

### 3. 選考フローカスタマイズ (AddCompanyForm)
- デフォルトフロー表示 + 「✏️ 選考フローを変更」ボタン
- フローエディター: 各段階のON/OFF切り替え
- リセットボタンでデフォルトに戻す
- スマホ幅(375px)対応

### 4. 企業詳細案内 (CompanyDetailModal)
- 「💡 選考フローは企業ごとにカスタマイズできます」テキスト追加

## Data Fixes

### companySuggestions.ts
- アクセンチュア、マッキンゼー、BCG、デロイト、PwC、EY、KPMG、野村総研、アビームコンサルティング、ベイカレントが「コンサル」に分類されているか確認・修正

## Tutorial Updates

### Settings チュートリアル
Before: 「JSONを保存しましょう」
After:
```
⚙️ 設定でできること

・選考段階の管理：選考ステップの追加・削除・並び替え
・表示設定：カードに表示する情報のON/OFF
・データ管理：バックアップ・復元・企業の一括追加
・機種変更時はJSONエクスポート→新端末でインポート
```

### 企業一覧チュートリアル
Add to body:
```
カードを左スワイプで見送りに。長押しでクイック編集。
左の色帯をタップすると「結果待ち」に切り替わります。
```

## Constraints

- Zustandセレクタ内でfilter/map禁止（React 19無限ループ）
- date-fns v4はparseISO後にisValid()チェック必須
- ダークモード対応必須
- schemaVersionを上げずにCompany型を変更しない
- npm run build エラー0件
