# ShukatsuBoard 大型リニューアル Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 選考管理アプリの全面刷新 — 選考段階の名称変更、結果待ち機能、色システム統一、カード操作体系、チュートリアル、セキュリティ修正を8フェーズで実施。

**Architecture:** Zustand store (schemaVersion 9→10) に `awaitingResult`, `tutorialFlags` を追加し、マイグレーションで旧ステータス名→新ステータス名のリマッピングを行う。新ファイル `stageColors.ts` と `TutorialModal.tsx` を追加。既存コンポーネント（CompanyCard, CompanyDetailModal, KanbanBoard, settings, calendar, deadline）を大幅修正。

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Zustand v5 (persist), Tailwind CSS v4, framer-motion, date-fns v4

---

## Phase 1: 選考段階の刷新

### Task 1: デフォルト選考段階の変更 + マイグレーション

**Files:**
- Modify: `src/lib/defaults.ts`
- Modify: `src/store/useAppStore.ts`
- Modify: `src/lib/types.ts` (Company型に `awaitingResult` 追加 — Phase 2分も一括)

**Step 1: defaults.ts を更新**

`DEFAULT_STATUS_NAMES` を以下に変更:
```typescript
export const DEFAULT_STATUS_NAMES = [
  'エントリー前',
  'ES',
  'Webテスト',
  '1次面接',
  '2次面接',
  '3次面接',
  '最終面接',
  '内定',
  '見送り',
];
```

**Step 2: types.ts に `awaitingResult` フィールド追加**

Company interface に追加:
```typescript
awaitingResult?: boolean;
```

**Step 3: useAppStore.ts のスキーマバージョンを10に上げてマイグレーション追加**

`CURRENT_SCHEMA_VERSION = 10` に変更。

migrate関数内で、既存のマイグレーション処理の**後**に以下を追加:

```typescript
// v9→v10: status column name remapping + awaitingResult
const STATUS_REMAP: Record<string, string> = {
  '未エントリー': 'エントリー前',
  'ES作成中': 'ES',
  'ES提出済': 'ES',
  'Webテスト受検済': 'Webテスト',
  'インターン選考中': 'エントリー前',
  'お見送り': '見送り',
};

// Remap status column names
const remappedColumns = (state.statusColumns ?? []).map((s: StatusColumn) => ({
  ...s,
  name: STATUS_REMAP[s.name] ?? s.name,
}));

// Deduplicate columns with same name (keep first, merge companies)
const seenNames = new Map<string, string>(); // name → id to keep
const columnsToRemove = new Set<string>();
remappedColumns.forEach((col: StatusColumn) => {
  if (seenNames.has(col.name)) {
    columnsToRemove.add(col.id);
  } else {
    seenNames.set(col.name, col.id);
  }
});

// Move companies from removed columns to the kept column
const finalCompanies = (state.companies ?? []).map((c: Company) => {
  if (columnsToRemove.has(c.statusId)) {
    const col = remappedColumns.find((rc: StatusColumn) => rc.id === c.statusId);
    const targetId = col ? seenNames.get(col.name) : c.statusId;
    return { ...c, statusId: targetId ?? c.statusId, awaitingResult: false };
  }
  return { ...c, awaitingResult: false };
});

const finalColumns = remappedColumns.filter((s: StatusColumn) => !columnsToRemove.has(s.id));
// Re-number order
finalColumns.sort((a: StatusColumn, b: StatusColumn) => a.order - b.order);
finalColumns.forEach((s: StatusColumn, i: number) => { s.order = i; });
```

Return文の `companies` と `statusColumns` をこれらの変数に差し替え。

**Step 4: progressMilestones.ts を更新**

```typescript
export const DEFAULT_MILESTONES: Record<SelectionType, string[]> = {
  intern: ['ES', 'Webテスト', '1次面接', '2次面接'],
  main: ['ES', 'Webテスト', '1次面接', '2次面接', '3次面接', '最終面接', '内定'],
};
```

**Step 5: page.tsx の stat counts を更新**

```typescript
const activeCount = getCount(['エントリー前', 'ES', 'Webテスト', '1次面接', '2次面接', '3次面接', '最終面接']);
const offerCount = getCount(['内定']);
const sayonaraCount = getCount(['見送り']);
```

**Step 6: ビルド確認**

Run: `npm run build`
Expected: 0 errors

**Step 7: コミット**

```bash
git add .
git commit -m "refactor: 選考段階の刷新（9段階、ステータスリマッピング、schemaVersion 10）"
```

---

### Task 2: UI文言「ステータス」→「選考段階」

**Files:**
- Modify: `src/components/settings/SettingsModal.tsx`
- Modify: `src/components/board/AddCompanyForm.tsx`
- Modify: `src/components/board/BulkImportModal.tsx`
- Modify: 他にUI文言「ステータス」が残る全ファイル

**Step 1: 全該当箇所を検索**

```bash
grep -rn "ステータス" src/ --include="*.tsx" --include="*.ts"
```

変数名・型名（statusId, statusColumns等）は変更しない。UI表示テキストのみ変更。

**Step 2: SettingsModal.tsx**

- Line 33: `{ id: 'status', label: 'ステータス' }` → `{ id: 'status', label: '選考段階' }`
- Line 170: placeholder `新しいステータス名` → `新しい選考段階名`
- StatusTab内の表示テキストも適宜変更

**Step 3: AddCompanyForm.tsx**

- Line 209: `初期ステータス` → `初期選考段階`

**Step 4: BulkImportModal.tsx**

- Line 79: `初期ステータス` → `初期選考段階`

**Step 5: CSV export header (SettingsModal.tsx DataTab)**

- Line 399: `企業名,業界,ステータス,メモ,作成日` → `企業名,業界,選考段階,メモ,作成日`

**Step 6: その他残存箇所を修正**

grep結果から残りを全て修正（変数名は除く）。

**Step 7: ビルド確認 + コミット**

```bash
npm run build
git add .
git commit -m "refactor: UI文言「ステータス」→「選考段階」に統一"
```

---

### Task 3: プログレスバーの廃止

**Files:**
- Modify: `src/components/board/CompanyDetailModal.tsx` (lines 274-295 の進捗バー削除)
- Modify: `src/components/board/CompanyDetailModal.tsx` (selectionType選択、milestones編集UI削除)
- Modify: `src/components/board/AddCompanyForm.tsx` (selectionType選択、milestones編集UI削除)
- Potentially delete: `src/lib/progressMilestones.ts` (使われなくなれば)

**Step 1: CompanyDetailModal.tsx からプログレスバー削除**

Lines 274-295 の `{/* 進捗バー */}` セクション全体を削除。
Lines 256-271 の `{/* 選考タイプ */}` セクション全体を削除。
Lines 297-311 の `{/* インターン参加 → 本選考 昇格バナー */}` セクションを削除。
Lines 406-449 の `{/* 選考ステップ */}` セクションを削除。

関連するstate変数も削除:
- `selectionType`, `setSelectionType`
- `customMilestones`, `setCustomMilestones`
- `editingMilestones`, `setEditingMilestones`
- `newStepText`, `setNewStepText`
- `showPromoteBanner` 関連ロジック
- `effectiveMilestones` 関連
- `headerMilestoneIdx` 関連
- `handlePromoteToMain` 関連
- `showPromoteDialog` と昇格ダイアログ

handleSave内の `selectionType`, `customMilestones` の保存も削除。

**Step 2: AddCompanyForm.tsx から選考タイプ・ステップ編集を削除**

Lines 224-343 の `{/* 選考タイプ */}` と `{/* 選考ステップ */}` セクション削除。
関連 state 変数削除:
- `selectionType`, `setSelectionType`
- `customMilestones`, `setCustomMilestones`
- `editingMilestones`, `setEditingMilestones`
- `newStepText`, `setNewStepText`
- `effectiveMilestones`

handleSubmit内の `selectionType`, `customMilestones` の送信も削除。

**Step 3: progressMilestones.ts の削除確認**

```bash
grep -rn "progressMilestones\|DEFAULT_MILESTONES\|getMilestoneIndex\|getMilestones" src/ --include="*.tsx" --include="*.ts"
```

もし他で使われていなければ `src/lib/progressMilestones.ts` を削除。

**Step 4: BulkImportModal.tsx から selectionType 関連を削除**

- `selectionType` フィールドを BulkRow から削除
- selectionType セレクトUI削除
- `SELECTION_TYPE_LABELS` のインポート削除
- addCompany呼び出しから `selectionType` 削除

**Step 5: 不要インポートの削除**

全ファイルから未使用の `SELECTION_TYPE_LABELS`, `SelectionType`, `DEFAULT_MILESTONES`, `getMilestoneIndex` インポートを削除。

**Step 6: ビルド確認 + コミット**

```bash
npm run build
git add .
git commit -m "refactor: プログレスバー・選考タイプ・選考ステップ機能を廃止"
```

---

## Phase 2: 結果待ち機能 + カード操作体系

### Task 4: stageColors.ts 作成 + toggleAwaitingResult アクション追加

**Files:**
- Create: `src/lib/stageColors.ts`
- Modify: `src/store/useAppStore.ts`

**Step 1: stageColors.ts を新規作成**

```typescript
export const STAGE_COLORS: Record<string, string> = {
  'エントリー前': '#9CA3AF',
  'ES': '#8B5CF6',
  'Webテスト': '#3B82F6',
  '1次面接': '#F97316',
  '2次面接': '#F97316',
  '3次面接': '#F97316',
  '最終面接': '#F97316',
  '内定': '#22C55E',
  '見送り': '#6B7280',
};

export function getStageColor(stage: string): string {
  return STAGE_COLORS[stage] || '#9CA3AF';
}
```

**Step 2: useAppStore.ts に toggleAwaitingResult アクション追加**

AppActions interface に追加:
```typescript
toggleAwaitingResult: (companyId: string) => void;
```

実装:
```typescript
toggleAwaitingResult: (companyId) => {
  set((state) => ({
    companies: state.companies.map((c) =>
      c.id === companyId
        ? { ...c, awaitingResult: !c.awaitingResult, updatedAt: new Date().toISOString() }
        : c
    ),
  }));
},
```

**Step 3: ビルド確認**

```bash
npm run build
```

---

### Task 5: CompanyCard に色帯 + 結果待ち + 締切表示 + 「次の段階へ→」ボタン

**Files:**
- Modify: `src/components/board/CompanyCard.tsx` (大幅改修)

**Step 1: CompanyCard.tsx を改修**

以下を追加:
1. **左端の色帯**（`getStageColor` で色決定、タップで結果待ち切り替え）
2. **結果待ちラベル**（`awaitingResult === true` 時に表示）
3. **締切日表示**（Company.nextDeadline または DeadlineContext から。未設定時は「+ 締切日を追加」リンク）
4. **「次の段階へ→」ボタン**（タップで日時入力ポップアップ表示、スキップ可能）

レイアウト変更:
```tsx
<div className="relative bg-card rounded-xl shadow-sm overflow-hidden ios-card-hover">
  {/* 色帯（タップで結果待ち切り替え） */}
  <button
    onClick={(e) => { e.stopPropagation(); toggleAwaitingResult(company.id); }}
    className="absolute left-0 top-0 bottom-0 w-2.5 rounded-l-xl cursor-pointer transition-opacity"
    style={{
      backgroundColor: stageColor,
      opacity: company.awaitingResult ? 0.4 : 1,
    }}
    aria-label="結果待ち切り替え"
  />
  {/* カード本体 */}
  <div className="pl-5 pr-3.5 py-3">
    {/* 既存コンテンツ + 結果待ちラベル + 締切 + 次の段階→ */}
  </div>
</div>
```

**注意:**
- `e.stopPropagation()` で色帯タップとカードタップを分離
- dnd-kitの `useSortable` との共存を維持（ref, style, attributes, listeners はカード全体に適用）
- カードの `className` から `cursor-grab` を維持し、色帯部分だけ `cursor-pointer`

**Step 2: 「次の段階へ→」ボタンと日時入力ポップアップ**

```tsx
{/* 次の段階へボタン */}
<button
  onClick={(e) => { e.stopPropagation(); setShowAdvancePopup(true); }}
  className="text-[12px] font-semibold text-[var(--color-primary)] ios-tap"
>
  次の段階へ →
</button>
```

ポップアップ:
```tsx
{showAdvancePopup && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
       onClick={(e) => { e.stopPropagation(); setShowAdvancePopup(false); }}>
    <div className="bg-card rounded-xl p-4 mx-4 max-w-sm w-full shadow-xl"
         onClick={(e) => e.stopPropagation()}>
      <h3 className="font-bold text-[var(--color-text)] mb-2">
        {nextStageName}の日時を設定
      </h3>
      <input type="datetime-local" ... />
      <div className="flex gap-2">
        <button onClick={advanceWithoutDate}>スキップ</button>
        <button onClick={advanceWithDate}>設定</button>
      </div>
    </div>
  </div>
)}
```

「次の段階へ→」は:
1. `awaitingResult` を false にリセット
2. 次のステータスカラムに移動（`moveCompany` 使用）
3. 日時が入力されたら `addScheduledAction` でカレンダーにも追加

**Step 3: ビルド確認**

---

### Task 6: カード左スワイプで見送り

**Files:**
- Modify: `src/components/board/CompanyCard.tsx`

**Step 1: touch event ハンドラ追加**

```typescript
const touchStartRef = useRef<{ x: number; y: number } | null>(null);
const [swipeOffset, setSwipeOffset] = useState(0);
const [showSwipeConfirm, setShowSwipeConfirm] = useState(false);

const handleTouchStart = (e: React.TouchEvent) => {
  touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
};

const handleTouchMove = (e: React.TouchEvent) => {
  if (!touchStartRef.current) return;
  const dx = touchStartRef.current.x - e.touches[0].clientX;
  const dy = Math.abs(touchStartRef.current.y - e.touches[0].clientY);
  // 縦スクロールとの干渉防止: 横移動 > 縦移動の場合のみ処理
  if (dx > 0 && dx > dy) {
    setSwipeOffset(Math.min(dx, 150));
  }
};

const handleTouchEnd = () => {
  if (swipeOffset > 100) {
    setShowSwipeConfirm(true);
  }
  setSwipeOffset(0);
  touchStartRef.current = null;
};
```

**Step 2: スワイプ確認ダイアログ**

```tsx
{showSwipeConfirm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
    <div className="bg-card rounded-xl p-4 mx-4 max-w-sm w-full shadow-xl">
      <h3 className="font-bold text-[var(--color-text)] mb-2">見送りにしますか？</h3>
      <p className="text-[13px] text-[var(--color-text-secondary)] mb-3">
        「{company.name}」を見送りに移動します。
      </p>
      <div className="flex gap-2">
        <button onClick={() => setShowSwipeConfirm(false)} className="flex-1 ...">キャンセル</button>
        <button onClick={handleDismiss} className="flex-1 ...">見送りにする</button>
      </div>
    </div>
  </div>
)}
```

`handleDismiss`: 見送りステータスを検索して `moveCompany` で移動。

---

### Task 7: カード長押しでクイック編集

**Files:**
- Modify: `src/components/board/CompanyCard.tsx`

**Step 1: 長押し検出ロジック**

```typescript
const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const [showQuickEdit, setShowQuickEdit] = useState(false);

// pointerDown で500msタイマー開始
// pointerMove で6px以上動いたらキャンセル
// pointerUp で500ms未満ならタップ（onTap）、500ms以上なら長押し完了
```

**重要:** 既存のタップ判定 (`didMoveRef`) と統合が必要。
- 500ms未満 + 移動6px未満 → `onTap(company)` (詳細モーダル)
- 500ms以上 + 移動6px未満 → `setShowQuickEdit(true)`
- 色帯タップ → `toggleAwaitingResult` (別途 stopPropagation で分離済み)

**Step 2: クイック編集モーダル**

```tsx
{showQuickEdit && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
       onClick={() => setShowQuickEdit(false)}>
    <div className="bg-card rounded-xl p-4 mx-4 max-w-sm w-full shadow-xl"
         onClick={(e) => e.stopPropagation()}>
      <h3 className="font-bold text-[var(--color-text)] mb-3">クイック編集</h3>
      {/* 企業名 */}
      <label className="text-xs text-[var(--color-text-secondary)]">企業名</label>
      <input type="text" value={editName} onChange={...} />
      {/* 選考段階 */}
      <label className="text-xs text-[var(--color-text-secondary)]">選考段階</label>
      <select value={editStatusId} onChange={...} />
      {/* 締切日 */}
      <label className="text-xs text-[var(--color-text-secondary)]">締切日</label>
      <input type="date" value={editDeadline} onChange={...} />
      {/* 業界 */}
      <label className="text-xs text-[var(--color-text-secondary)]">業界</label>
      <select value={editIndustry} onChange={...} />
      <button onClick={handleQuickSave}>保存</button>
    </div>
  </div>
)}
```

**Step 3: ビルド確認 + コミット**

```bash
npm run build
git add .
git commit -m "feat: 結果待ち機能・色帯・左スワイプ見送り・長押しクイック編集・次の段階日時設定"
```

---

## Phase 3: 色システムの統一

### Task 8: 全画面の色を選考段階色に統一

**Files:**
- Modify: `src/components/board/CompanyCard.tsx` (deadline badge の色分け廃止)
- Modify: `src/components/deadline/DeadlineTab.tsx` (getDeadlineColor 廃止)
- Modify: `src/components/calendar/MonthCalendar.tsx` (ドット色を選考段階色に)
- Modify: `src/components/board/CompanyDetailModal.tsx` (色帯の色をステージ色に)
- Modify: `src/app/page.tsx` (todo item に色インジケーター追加)

**Step 1: DeadlineTab.tsx の getDeadlineColor を廃止**

`getDeadlineColor` 関数を削除。日付テキストは全て `text-[var(--color-text-secondary)]` に統一。

**Step 2: CompanyCard.tsx の deadline badge 色分けを廃止**

```tsx
// 変更前: daysUntil <= 3 ? orange : gray
// 変更後: 統一的なグレーバッジ
const badgeClass = 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400';
```

**Step 3: カレンダーのドット色を選考段階色に合わせる**

MonthCalendar.tsx で、ドット表示時に企業の選考段階から `getStageColor` で色を取得。

**Step 4: ビルド確認 + コミット**

```bash
npm run build
git add .
git commit -m "feat: 色システム統一（選考段階カラー全画面適用）"
```

---

## Phase 4: フィードバック対応

### Task 9: 企業詳細モーダルに締切日表示 + 色凡例

**Files:**
- Modify: `src/components/board/CompanyDetailModal.tsx`
- Modify: `src/app/page.tsx` (色凡例追加)
- Modify: `src/components/board/KanbanBoard.tsx` (色凡例追加)

**Step 1: CompanyDetailModal の企業名下に締切情報を表示**

```tsx
{/* 締切情報 */}
{company.nextDeadline && (
  <p className="text-[13px] text-[var(--color-text-secondary)]">
    締切: {company.nextDeadline}
  </p>
)}
```

DeadlineContext からの締切情報も **useMemo** で取得して表示（Zustandセレクタ内filter/map禁止）。

**Step 2: 色凡例コンポーネント追加**

```tsx
function StageLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 px-1 text-xs text-gray-400 dark:text-gray-500">
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:'#8B5CF6'}} />ES</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:'#3B82F6'}} />Webテスト</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:'#F97316'}} />面接</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:'#22C55E'}} />内定</span>
    </div>
  );
}
```

page.tsx と KanbanBoard.tsx の上部に配置。

---

### Task 10: カレンダー種別拡張

**Files:**
- Modify: `src/lib/types.ts` (ScheduledAction.type → CalendarEventType 拡張)
- Modify: `src/components/calendar/InterviewForm.tsx` → `EventForm.tsx` に改名/拡張
- Modify: `src/components/calendar/MonthCalendar.tsx`
- Modify: `src/components/calendar/FilterChips.tsx`

**Step 1: ActionType の値を確認**

現行 ActionType: `'es' | 'webtest' | 'interview' | 'final' | 'other'` — これは既にES提出、Webテスト等をカバーしている。

InterviewFormを拡張して「種別」を選べるようにする（面接、ES提出、Webテスト、締切、その他）。

**Step 2: InterviewForm に種別セレクト追加**

既存の InterviewForm は面接専用。これを汎用的な「予定追加フォーム」に拡張:
- 種別ドロップダウン追加（面接/ES提出/Webテスト/締切/その他）
- 種別によってフォームの内容を調整（面接タイプは面接時のみ表示等）

**Step 3: カレンダーのドット色を種別に合わせる**

- 面接 → オレンジ (#F97316)
- ES提出 → 紫 (#8B5CF6)
- Webテスト → 青 (#3B82F6)
- 締切 → グレー (#9CA3AF)
- その他 → グレー (#8E8E93)

**Step 4: ビルド確認**

---

### Task 11: 期限切れセクションの改善

**Files:**
- Modify: `src/components/deadline/DeadlineTab.tsx`

**Step 1: 期限切れセクションを最後に移動 + デフォルト折りたたみ**

```typescript
// SECTION_ORDER を変更: 期限切れを最後に
const SECTION_ORDER: Section[] = ['今日', '今週', '今月', 'それ以降', '期限切れ'];
```

折りたたみstate追加:
```typescript
const [expiredCollapsed, setExpiredCollapsed] = useState(true);
```

期限切れセクションのレンダリング:
```tsx
{section.title === '期限切れ' ? (
  <div>
    <button onClick={() => setExpiredCollapsed(!expiredCollapsed)}
            className="flex items-center gap-1 ...">
      期限切れ（{section.items.length}件）{expiredCollapsed ? '▶' : '▼'}
    </button>
    {!expiredCollapsed && (
      <div className="space-y-1">{section.items.map(...)}</div>
    )}
  </div>
) : (
  // 通常セクション
)}
```

---

### Task 12: 企業インポートCSV対応改善

**Files:**
- Modify: `src/components/board/BulkImportModal.tsx`

**Step 1: テキストエリアベースの一括追加モードを追加**

既存のフォーム行方式に加え、テキストエリアに貼り付けでCSV形式対応:

```
ソニーグループ,メーカー
三菱商事,商社
```

- カンマが含まれる行はCSV形式として処理
- 業界未指定なら `deriveIndustry` (companySuggestions) で自動判定
- 10カテゴリ外の業界名は再判定
- 結果表示: 「○社追加（うち○社は業界を自動判定）」

**Step 2: ビルド確認 + コミット**

```bash
npm run build
git add .
git commit -m "feat: フィードバック対応（締切表示・カレンダー種別・期限切れ折りたたみ・インポート改善・色凡例）"
```

---

## Phase 5: データ一貫性の確保

### Task 13: 全画面でデータ参照の一貫性を検証

**Files:**
- 全コンポーネントを検査

**Step 1: 以下を検証**

1. 企業追加時の締切日 → カード・詳細・カレンダー全てに反映されるか
   - AddCompanyForm で `nextDeadline` として保存される → CompanyCard で参照 → OK
2. 選考段階の変更 → ホーム・企業一覧・カレンダー全てに反映されるか
   - Zustand store 経由 → 全画面で `useAppStore` から取得 → OK
3. 結果待ちフラグ → 全画面で反映されるか
   - `awaitingResult` は CompanyCard の色帯に反映 → ホーム/企業一覧両方で OK
4. カレンダーで追加した予定 → ホーム画面にも反映されるか
   - scheduledActions は store 共有 → ホームの todoItems で参照 → OK
5. 「次の段階へ→」で設定した日時 → カレンダーに反映されるか
   - `addScheduledAction` 使用 → MonthCalendar で参照 → OK

**Step 2: 問題があれば修正、なければ報告**

**Step 3: ビルド確認 + コミット（修正あれば）**

```bash
npm run build
git add .
git commit -m "fix: データ一貫性の確保（全画面でのデータ参照を検証・修正）"
```

---

## Phase 6: オンボーディングチュートリアル

### Task 14: TutorialFlags + TutorialModal

**Files:**
- Modify: `src/store/useAppStore.ts` (tutorialFlags, markTutorialSeen, resetTutorials)
- Create: `src/components/onboarding/TutorialModal.tsx`

**Step 1: useAppStore.ts に tutorialFlags 追加**

```typescript
interface TutorialFlags {
  home: boolean;
  companies: boolean;
  detail: boolean;
  calendar: boolean;
  settings: boolean;
}

// State に追加:
tutorialFlags: TutorialFlags;

// デフォルト:
tutorialFlags: { home: false, companies: false, detail: false, calendar: false, settings: false },

// Actions に追加:
markTutorialSeen: (key: keyof TutorialFlags) => void;
resetTutorials: () => void;
```

マイグレーション (v10のmigrate内): 既存データに `tutorialFlags` がなければデフォルト値を注入。

**注意:** schemaVersionはTask 1で既に10に上げているので、ここでは上げない。migrate関数内で `tutorialFlags` がundefinedの場合にデフォルト注入するだけ。

**Step 2: TutorialModal.tsx 新規作成**

```tsx
interface TutorialModalProps {
  steps: { title: string; body: string }[];
  onComplete: () => void;
}

export function TutorialModal({ steps, onComplete }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  // z-index: 90
  // gradYear === null のときは表示しない（親で制御）
  // ダークモード完全対応
  // 「スキップ」テキストリンクで即閉じ
  // 最後のステップで「はじめる」ボタン
}
```

**Step 3: ビルド確認**

---

### Task 15: 5画面にチュートリアル組み込み

**Files:**
- Modify: `src/app/page.tsx` (ホーム)
- Modify: `src/components/board/KanbanBoard.tsx` (企業一覧)
- Modify: `src/components/board/CompanyDetailModal.tsx` (企業詳細)
- Modify: `src/app/calendar/page.tsx` (カレンダー)
- Modify: `src/components/settings/SettingsModal.tsx` (設定)

各画面で:
```tsx
const tutorialFlags = useAppStore((s) => s.tutorialFlags);
const markTutorialSeen = useAppStore((s) => s.markTutorialSeen);
const gradYear = useAppStore((s) => s.gradYear);

{gradYear !== null && !tutorialFlags.home && (
  <TutorialModal
    steps={[{ title: '🎨 色は選考段階を表します', body: '🟣ES  🔵Webテスト  🟠面接  🟢内定\nタグをタップすると予定を絞り込めます' }]}
    onComplete={() => markTutorialSeen('home')}
  />
)}
```

**チュートリアル内容（被りゼロ）:**

| 画面 | 内容 |
|------|------|
| ホーム | 色の意味だけ（🟣ES 🔵Webテスト 🟠面接 🟢内定）|
| 企業一覧 | ソート・フィルター・結果待ち・スワイプ・長押し |
| 企業詳細 | 締切編集・面接追加・タグ |
| カレンダー | 種別ごとの予定追加 |
| 設定 | バックアップ・復元・引き継ぎ |

---

### Task 16: 設定画面に「チュートリアル再表示」ボタン

**Files:**
- Modify: `src/components/settings/SettingsModal.tsx`

**Step 1: DataTab に追加**

```tsx
<button
  onClick={resetTutorials}
  className="w-full py-3 text-sm text-blue-500 dark:text-blue-400 font-medium"
>
  チュートリアルを再表示する
</button>
```

**Step 2: ビルド確認 + コミット**

```bash
npm run build
git add .
git commit -m "feat: オンボーディングチュートリアル（5画面、被りゼロ）"
```

---

## Phase 7: バグ修正

### Task 17: 企業追加時の締切日がカードに反映されない

**Files:**
- Investigate: `src/components/board/AddCompanyForm.tsx`
- Investigate: `src/components/board/CompanyCard.tsx`

**Step 1: 調査**

AddCompanyForm の handleSubmit で `nextDeadline: deadline.trim() || undefined` を送信。
CompanyCard では `companyDeadline` を DeadlineContext (CSV) から取得しているが、Company.nextDeadline は参照していない。

**Step 2: 修正**

CompanyCard で `company.nextDeadline` も表示するように修正。DeadlineContext の締切と Company.nextDeadline の両方を表示するか、近い方を優先する。

**Step 3: ビルド確認 + コミット**

```bash
npm run build
git add .
git commit -m "fix: 企業追加時の締切日がカードに反映されない問題を修正"
```

---

## Phase 8: セキュリティスキャン

### Task 18: セキュリティスキャン + 修正

**Step 1: npm audit**

```bash
npm audit
```

critical/high があれば `npm audit fix` → 手動対応。

**Step 2: ソースコードスキャン**

```bash
grep -rn "dangerouslySetInnerHTML\|innerHTML\|outerHTML" src/
grep -rn "eval(\|new Function(" src/
grep -rn "window\.open\|location\.href\|location\.assign" src/
```

**Step 3: CSVパースの不正入力チェック**

DeadlineContext.tsx のCSVパースでカンマ・ダブルクォート含む不正データでクラッシュしないか確認。

**Step 4: localStorage デシリアライズのバリデーション**

Zustand persist のデシリアライズ時に不正JSONでクラッシュしないか確認。

**Step 5: 全修正後にビルド確認 + コミット**

```bash
npm run build
git add .
git commit -m "security: セキュリティスキャン＆脆弱性修正"
```

---

## 最終チェック

### Task 19: UIセルフチェック + 最終ビルド

**Step 1: 禁止事項チェック**

```bash
# UI上に「ステータス」が残っていないか
grep -rn "ステータス" src/ --include="*.tsx" --include="*.ts" | grep -v "statusId\|statusColumns\|StatusColumn\|status\."

# 優先度への参照が残っていないか
grep -rn "priority\|CompanyPriority\|PRIORITY_CONFIG" src/ --include="*.tsx" --include="*.ts"

# プログレスバーへの参照が残っていないか
grep -rn "progressMilestones\|DEFAULT_MILESTONES\|getMilestoneIndex" src/ --include="*.tsx" --include="*.ts"

# getDeadlineColor が残っていないか
grep -rn "getDeadlineColor" src/ --include="*.tsx" --include="*.ts"
```

**Step 2: UIセルフチェック**

```bash
# トグルスイッチの translate-x 確認
grep -rn "translate-x" src/components/ --include="*.tsx"

# ダークモード漏れ確認
grep -rn "bg-white\b" src/components/ --include="*.tsx" | grep -v "dark:"
```

**Step 3: 最終ビルド**

```bash
npm run build
```

エラー0件であること。

**Step 4: git push**

```bash
git push origin main
```

---

## 完了条件チェックリスト

- [ ] `npm run build` エラー0件
- [ ] UI上に「ステータス」の表示が0件
- [ ] 選考段階が9段階（エントリー前〜見送り）
- [ ] カード左端に色帯（8〜12px幅）が表示される
- [ ] 色帯タップで結果待ちON/OFF
- [ ] 全画面で選考段階の色が統一
- [ ] 締切残り日数による色分けが廃止
- [ ] プログレスバーが廃止
- [ ] 「次の段階へ→」で日時入力ポップアップ表示（スキップ可能）
- [ ] カード左スワイプで見送り
- [ ] カード長押しでクイック編集
- [ ] 企業詳細に締切日が表示
- [ ] カレンダーから種別選択で予定追加
- [ ] 締切日がカードに表示
- [ ] 期限切れが最後+折りたたみ
- [ ] 色の凡例がホーム・企業一覧に表示
- [ ] 企業インポートがCSV形式対応
- [ ] 5画面のチュートリアルが被りゼロで動作
- [ ] 設定画面から「チュートリアル再表示」可能
- [ ] 各Phaseでコミット済み
- [ ] セキュリティスキャン実施済み
- [ ] npm audit で critical/high が0件
- [ ] git push完了
