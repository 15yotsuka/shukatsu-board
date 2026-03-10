# Feature B: 機能・データ系 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 予定アクション種別拡張（GD追加・面接サブ種別）、選考フローカスタマイズ、業界分類修正、チュートリアル更新を実装する。

**Architecture:** types.ts の ActionType に GD 追加・final 削除、ScheduledAction に subType フィールド追加。Company に selectionFlow フィールド追加。schemaVersion を 11→12 へ上げて既存データをマイグレーション。UI は CompanyDetailModal と AddCompanyForm を更新。

**Tech Stack:** Next.js App Router, React 19, TypeScript, Zustand v5 (persist), Tailwind CSS v4

---

## 重要制約

- ❌ `src/components/board/CompanyCard.tsx` は変更禁止
- ❌ `src/app/page.tsx` は変更禁止
- ❌ CompanyDetailModal のタブアニメーション部分は変更禁止
- ❌ Zustandセレクタ内でfilter/map使用禁止（React 19無限ループ）
- ✅ ダークモード対応必須（すべての新規UI要素に `dark:` クラスを追加）

---

## Task 1: 型システム変更 + スキーマv12マイグレーション

**Files:**
- Modify: `src/lib/types.ts:122-147`
- Modify: `src/store/useAppStore.ts:135` (CURRENT_SCHEMA_VERSION)
- Modify: `src/store/useAppStore.ts:494-620` (migrate function)

### Step 1: `src/lib/types.ts` を更新

`src/lib/types.ts` の lines 122-147 を以下に置き換える：

```typescript
// ============================
// 予定アクション（締切・面接など）
// ============================
export type ActionType = 'es' | 'webtest' | 'gd' | 'interview' | 'other';

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  es: 'ES提出',
  webtest: 'Webテスト',
  gd: 'GD',
  interview: '面接',
  other: 'その他',
};

export const ACTION_TYPE_COLORS: Record<ActionType, string> = {
  es: '#8B5CF6',
  webtest: '#3B82F6',
  gd: '#EC4899',
  interview: '#F97316',
  other: '#8E8E93',
};

export interface ScheduledAction {
  id: string;
  companyId: string;
  type: ActionType;
  subType?: string; // 面接時: '1次面接'|'2次面接'|'3次面接'|'最終面接'
  date: string; // "2026-03-15"
  time?: string; // "HH:mm"
  note?: string;
}
```

Company型 (lines 13-45) に `selectionFlow` フィールドを追加。`awaitingResult?: boolean;` の後に：

```typescript
  // 企業ごとカスタム選考フロー（undefinedならデフォルト9段階を使用）
  selectionFlow?: string[];
```

### Step 2: `src/store/useAppStore.ts` のschemaVersionを12に更新

```
CURRENT_SCHEMA_VERSION = 11  →  CURRENT_SCHEMA_VERSION = 12
```

### Step 3: migrate関数に v11→v12 処理を追加

migrate関数内の `// v10→v11: add showProgressBar...` ブロックの後、`return {` の前に以下を追加：

```typescript
        // v11→v12: migrate 'final' ActionType → 'interview' with subType='最終面接'
        const migratedScheduledActions = (state.scheduledActions ?? []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any) => {
            if (a.type === 'final') {
              return { ...a, type: 'interview', subType: '最終面接' };
            }
            return a;
          }
        );
```

そして return 文内の `scheduledActions: state.scheduledActions ?? [],` を：

```typescript
          scheduledActions: migratedScheduledActions,
```

に変更する。

### Step 4: ビルド確認

```bash
cd /c/Users/15yot/shukatsu-board && npm run build
```

Expected: 0 errors

### Step 5: コミット

```bash
cd /c/Users/15yot/shukatsu-board && git add src/lib/types.ts src/store/useAppStore.ts && git commit -m "feat: ActionType拡張(GD追加・final削除)・ScheduledAction.subType・Company.selectionFlow・schemaV12"
```

---

## Task 2: CompanyDetailModal — 予定アクション追加フォームの更新

**Files:**
- Modify: `src/components/board/CompanyDetailModal.tsx`

予定アクション追加フォーム（lines 95-97 と 331-378）を更新する。

### Step 1: state変数に `newActionSubType` を追加

line 97 の `const [newActionTime, setNewActionTime] = useState('');` の後に追加：

```typescript
  const [newActionSubType, setNewActionSubType] = useState<string>('1次面接');
```

### Step 2: 予定アクション追加フォームのセレクト部分を更新

lines 337-344 の `<div className="flex gap-2">` ブロックを以下に置き換える：

```tsx
                  <div className="flex gap-2 flex-wrap">
                    <select value={newActionType} onChange={(e) => { setNewActionType(e.target.value as ActionType); }} className="ios-input flex-none w-auto text-[13px] py-2">
                      <option value="es">ES提出</option>
                      <option value="webtest">Webテスト</option>
                      <option value="gd">GD</option>
                      <option value="interview">面接</option>
                      <option value="other">その他</option>
                    </select>
                    {newActionType === 'interview' && (
                      <select value={newActionSubType} onChange={(e) => setNewActionSubType(e.target.value)} className="ios-input flex-none w-auto text-[13px] py-2">
                        <option value="1次面接">1次面接</option>
                        <option value="2次面接">2次面接</option>
                        <option value="3次面接">3次面接</option>
                        <option value="最終面接">最終面接</option>
                      </select>
                    )}
                    <input type="date" value={newActionDate} onChange={(e) => setNewActionDate(e.target.value)} className="ios-input flex-1 text-[13px] py-2 min-w-[130px]" />
                    <input type="time" value={newActionTime} onChange={(e) => setNewActionTime(e.target.value)} className="ios-input w-[7rem] flex-none text-[13px] py-2" />
                  </div>
```

### Step 3: 追加ボタンのonClickを更新

lines 346-357 の onClick 部分を更新（`addScheduledAction` に subType を追加）：

```tsx
                    onClick={() => {
                      if (!newActionDate) return;
                      addScheduledAction({
                        companyId: company.id,
                        type: newActionType,
                        subType: newActionType === 'interview' ? newActionSubType : undefined,
                        date: newActionDate,
                        time: newActionTime || undefined,
                      });
                      setNewActionDate('');
                      setNewActionTime('');
                    }}
```

### Step 4: 予定アクション一覧のラベル表示を更新

line 365 の `{ACTION_TYPE_LABELS[action.type]}` を以下に変更（subTypeがあればそちらを表示）：

```tsx
                          <span className="text-[14px] font-medium text-[var(--color-text)]">{action.subType ?? ACTION_TYPE_LABELS[action.type]}</span>
```

### Step 5: ビルド確認

```bash
cd /c/Users/15yot/shukatsu-board && npm run build
```

Expected: 0 errors

### Step 6: コミット

```bash
cd /c/Users/15yot/shukatsu-board && git add src/components/board/CompanyDetailModal.tsx && git commit -m "feat: 予定アクションにGD追加・面接サブ種別セレクト・subType表示"
```

---

## Task 3: CompanyDetailModal — 「次の段階へ」ポップアップ追加

**Files:**
- Modify: `src/components/board/CompanyDetailModal.tsx`

### Step 1: state変数を追加

`const [newActionSubType, setNewActionSubType] = useState<string>('1次面接');` の後に：

```typescript
  const [showNextStagePopup, setShowNextStagePopup] = useState(false);
  const [nextStageDateTime, setNextStageDateTime] = useState('');
  const [nextStageSubType, setNextStageSubType] = useState<string>('1次面接');
```

### Step 2: 次のステージ計算ロジックを追加

`const trackStatuses = [...statusColumns].sort((a, b) => a.order - b.order);` の後に：

```typescript
  const currentStatusIndex = trackStatuses.findIndex((s) => s.id === statusId);
  const nextStatus = currentStatusIndex >= 0 && currentStatusIndex < trackStatuses.length - 1
    ? trackStatuses[currentStatusIndex + 1]
    : null;

  // 次の選考段階からActionTypeを自動判定
  const STAGE_TO_ACTION_TYPE: Record<string, ActionType> = {
    'ES': 'es',
    'Webテスト': 'webtest',
    '1次面接': 'interview',
    '2次面接': 'interview',
    '3次面接': 'interview',
    '最終面接': 'interview',
  };
  const STAGE_TO_SUBTYPE: Record<string, string> = {
    '1次面接': '1次面接',
    '2次面接': '2次面接',
    '3次面接': '3次面接',
    '最終面接': '最終面接',
  };
  const nextStageActionType = nextStatus ? (STAGE_TO_ACTION_TYPE[nextStatus.name] ?? 'other') : 'other';
  const nextStageIsInterview = nextStageActionType === 'interview';
```

### Step 3: 「次の段階へ→」ボタンをヘッダーに追加

lines 206-209（statusセレクト `</select>` の後、nextのバッジの前）に追加：

```tsx
            {nextStatus && nextStatus.name !== '見送り' && (
              <button
                onClick={() => {
                  const defaultSub = nextStatus ? (STAGE_TO_SUBTYPE[nextStatus.name] ?? '1次面接') : '1次面接';
                  setNextStageSubType(defaultSub);
                  setNextStageDateTime('');
                  setShowNextStagePopup(true);
                }}
                className="flex-none text-[12px] font-semibold rounded-full px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] ios-tap"
              >
                次へ →
              </button>
            )}
```

### Step 4: 「次の段階へ」ポップアップを追加

`{showDeleteConfirm && ...}` ブロック（line 493）の前に以下を追加：

```tsx
      {/* 次の段階へポップアップ */}
      {showNextStagePopup && nextStatus && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowNextStagePopup(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl p-4 mx-4 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-[16px]">
              {nextStatus.name}の日程を設定
            </h3>
            {nextStageIsInterview && (
              <select
                value={nextStageSubType}
                onChange={(e) => setNextStageSubType(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 mb-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[14px]"
              >
                <option value="1次面接">1次面接</option>
                <option value="2次面接">2次面接</option>
                <option value="3次面接">3次面接</option>
                <option value="最終面接">最終面接</option>
              </select>
            )}
            <input
              type="datetime-local"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[14px]"
              value={nextStageDateTime}
              onChange={(e) => setNextStageDateTime(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // スキップ: 日時なしでステージだけ進める
                  setStatusId(nextStatus.id);
                  if (company.awaitingResult) {
                    updateCompany(company.id, { awaitingResult: false });
                  }
                  setShowNextStagePopup(false);
                }}
                className="flex-1 py-2.5 text-[14px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-xl ios-tap"
              >
                スキップ
              </button>
              <button
                onClick={() => {
                  if (!nextStageDateTime) return;
                  // ステージ変更
                  setStatusId(nextStatus.id);
                  if (company.awaitingResult) {
                    updateCompany(company.id, { awaitingResult: false });
                  }
                  // datetime-local → date + time
                  const [datePart, timePart] = nextStageDateTime.split('T');
                  addScheduledAction({
                    companyId: company.id,
                    type: nextStageActionType,
                    subType: nextStageIsInterview ? nextStageSubType : undefined,
                    date: datePart,
                    time: timePart || undefined,
                  });
                  setShowNextStagePopup(false);
                }}
                disabled={!nextStageDateTime}
                className="flex-1 py-2.5 text-[14px] text-white bg-[var(--color-primary)] rounded-xl ios-tap disabled:opacity-40"
              >
                設定
              </button>
            </div>
          </div>
        </div>
      )}
```

### Step 5: ビルド確認

```bash
cd /c/Users/15yot/shukatsu-board && npm run build
```

Expected: 0 errors

### Step 6: コミット

```bash
cd /c/Users/15yot/shukatsu-board && git add src/components/board/CompanyDetailModal.tsx && git commit -m "feat: CompanyDetailModal「次の段階へ」ポップアップ追加（日時設定・カレンダー連携）"
```

---

## Task 4: CompanyDetailModal — 選考フロー案内テキスト追加

**Files:**
- Modify: `src/components/board/CompanyDetailModal.tsx`

### Step 1: Tab 1（基本情報）の末尾に案内テキストを追加

Tab 1 の `</div>` 閉じタグ（line ~408）の直前、`</div>` の前に：

```tsx
              {/* 選考フローカスタマイズ案内 */}
              <p className="text-[12px] text-[var(--color-text-secondary)] text-center px-2 pb-1">
                💡 選考フローは企業追加時にカスタマイズできます
              </p>
```

### Step 2: ビルド確認

```bash
cd /c/Users/15yot/shukatsu-board && npm run build
```

### Step 3: コミット

```bash
cd /c/Users/15yot/shukatsu-board && git add src/components/board/CompanyDetailModal.tsx && git commit -m "feat: CompanyDetailModal 選考フローカスタマイズ案内テキスト追加"
```

---

## Task 5: AddCompanyForm — 選考フローカスタマイズ機能追加

**Files:**
- Modify: `src/components/board/AddCompanyForm.tsx`

### Step 1: imports に DEFAULT_STATUS_NAMES を追加

```typescript
import { DEFAULT_STATUS_NAMES } from '@/lib/defaults';
```

### Step 2: state変数を追加

`const [memo, setMemo] = useState('');` の後に：

```typescript
  const [showFlowEditor, setShowFlowEditor] = useState(false);
  const FLOW_STAGES = DEFAULT_STATUS_NAMES.filter(s => s !== '内定' && s !== '見送り');
  const [enabledStages, setEnabledStages] = useState<Set<string>>(new Set(FLOW_STAGES));
```

### Step 3: handleSubmitを更新

`addCompany({...})` 呼び出しに `selectionFlow` を追加：

```typescript
    const customFlow = FLOW_STAGES.filter(s => enabledStages.has(s));
    const isDefault = customFlow.length === FLOW_STAGES.length;

    addCompany({
      name: trimmed,
      industry: industry.trim() || undefined,
      url: url.trim() || undefined,
      nextDeadline: deadline.trim() || undefined,
      statusId,
      tags: tags.length > 0 ? tags : undefined,
      selectionMemo: memo.trim() || undefined,
      selectionFlow: isDefault ? undefined : customFlow,
    });
```

### Step 4: フォーム内に選考フロー表示と変更ボタンを追加

「タグ」セクションの後（URLセクションの前）に追加：

```tsx
          {/* 選考フロー */}
          <div>
            <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">選考フロー</label>
            <div className="text-[12px] text-[var(--color-text-secondary)] mb-1">
              {FLOW_STAGES.filter(s => enabledStages.has(s)).join(' → ')}
            </div>
            <button
              type="button"
              onClick={() => setShowFlowEditor(!showFlowEditor)}
              className="text-[13px] text-[var(--color-primary)] ios-tap"
            >
              ✏️ {showFlowEditor ? 'フロー編集を閉じる' : '選考フローを変更'}
            </button>
            {showFlowEditor && (
              <div className="mt-2 bg-[var(--color-border)]/30 rounded-xl p-3 space-y-2">
                <p className="text-[12px] text-[var(--color-text-secondary)] mb-2">
                  不要な段階をOFFにしてください
                </p>
                {FLOW_STAGES.map((stage) => (
                  <label key={stage} className="flex items-center gap-2 ios-tap cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabledStages.has(stage)}
                      onChange={(e) => {
                        setEnabledStages(prev => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(stage);
                          else next.delete(stage);
                          return next;
                        });
                      }}
                      className="w-4 h-4 accent-[var(--color-primary)]"
                    />
                    <span className="text-[14px] text-[var(--color-text)]">{stage}</span>
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => setEnabledStages(new Set(FLOW_STAGES))}
                  className="text-[12px] text-[var(--color-text-secondary)] mt-1 ios-tap"
                >
                  リセット（デフォルトに戻す）
                </button>
              </div>
            )}
          </div>
```

### Step 5: ビルド確認

```bash
cd /c/Users/15yot/shukatsu-board && npm run build
```

Expected: 0 errors

### Step 6: コミット

```bash
cd /c/Users/15yot/shukatsu-board && git add src/components/board/AddCompanyForm.tsx && git commit -m "feat: AddCompanyForm 選考フローカスタマイズ機能追加"
```

---

## Task 6: companySuggestions.ts — 業界分類の修正

**Files:**
- Modify: `src/lib/companySuggestions.ts`

### Step 1: 空の industry を修正

以下のエントリの `industry: ""` を `industry: "コンサル"` に修正：

1. `"ベイカレント"` (line ~1652): `industry: ""` → `industry: "コンサル"`
2. `"野村総研"` (line ~1443): `industry: ""` → `industry: "コンサル"`
3. `"野村総合研究所"` (line ~1482): `industry: ""` → `industry: "コンサル"`
4. `"PwCストラテジー"` (line ~1411): `industry: ""` → `industry: "コンサル"`

各行を Edit ツールで個別に修正する。例：
```
"ベイカレント": { industry: "", color: "#6B7280" }
→
"ベイカレント": { industry: "コンサル", color: "#6B7280" }
```

### Step 2: ビルド確認

```bash
cd /c/Users/15yot/shukatsu-board && npm run build
```

### Step 3: コミット

```bash
cd /c/Users/15yot/shukatsu-board && git add src/lib/companySuggestions.ts && git commit -m "fix: companySuggestions ベイカレント・野村総研等のコンサル業界分類修正"
```

---

## Task 7: SettingsModal — チュートリアルテキスト更新

**Files:**
- Modify: `src/components/settings/SettingsModal.tsx:96-97`

### Step 1: 設定チュートリアルのbody文字列を更新

`src/components/settings/SettingsModal.tsx` line 96 の body を変更：

```
変更前:
body: 'データタブからバックアップ（JSON）を\nエクスポートしておくと安心です\n機種変更やブラウザ変更時に復元できます'

変更後:
body: '・選考段階の管理：選考ステップの追加・削除・並び替え\n・表示設定：カードに表示する情報のON/OFF\n・データ管理：バックアップ・復元・企業の一括追加\n・機種変更時はJSONエクスポート→新端末でインポート'
```

あわせて title も変更：

```
変更前: title: 'データを守りましょう'
変更後: title: '⚙️ 設定でできること'
```

### Step 2: ビルド確認

```bash
cd /c/Users/15yot/shukatsu-board && npm run build
```

### Step 3: コミット

```bash
cd /c/Users/15yot/shukatsu-board && git add src/components/settings/SettingsModal.tsx && git commit -m "fix: 設定チュートリアルを全体像を説明する内容に更新"
```

---

## Task 8: 最終ビルド確認 + まとめコミット + Push

### Step 1: 最終ビルド確認

```bash
cd /c/Users/15yot/shukatsu-board && npm run build
```

Expected: 0 errors, 0 TypeScript errors

### Step 2: git push

```bash
cd /c/Users/15yot/shukatsu-board && git push origin main
```

---

## 注意: 企業一覧チュートリアルについて

企業一覧（`tutorialFlags.companies`）のチュートリアル内容は `src/app/page.tsx` 内に定義されています。
`page.tsx` は今セッションのスコープ外（別セッションがフィルタープルダウン対応中）のため、
「長押し編集の追記」はその別セッションのタスクとして残します。

---

## 完了条件チェックリスト

- [ ] ActionType: es | webtest | gd | interview | other の5種
- [ ] 面接選択時にサブ種別（1次〜最終）が表示される
- [ ] 「次の段階へ」ボタンでポップアップ表示（スキップ可能）
- [ ] ポップアップでの日時設定がカレンダーに反映される
- [ ] 企業追加時に選考フローをカスタマイズ可能
- [ ] 企業詳細に「選考フローはカスタマイズできます」案内表示
- [ ] ベイカレント・野村総研等がコンサル分類
- [ ] 設定チュートリアルが全体像説明に更新
- [ ] npm run build エラー0件
- [ ] git push 完了
