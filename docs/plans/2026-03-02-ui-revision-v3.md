# UI Revision v3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** ホーム画面を「戦える司令塔」にするための5つの改修（カルーセル強化・タイルボタン化・メモタブ多機能化・高級感UI・不要ファイル削除）

**Architecture:** 既存のコンポーネント構成を維持しながら、各ファイルを個別に修正する。データは `selectionMemo` フィールドにJSON文字列として保存し、後方互換性を確保する。

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Zustand, Embla Carousel, Framer Motion

---

## 前提知識

- `src/app/page.tsx` … ホーム画面（TrackTabs → DeadlineReminder → HeroCardCarousel → 統計タイル）
- `src/components/board/HeroCardCarousel.tsx` … カルーセル本体（3モード：締切/面接/カスタム）
- `src/components/board/CompanyDetailModal.tsx` … 企業詳細モーダル（3タブ横スワイプ：基本情報/マイページ/メモ）
- `src/components/board/TodayDeadlineCarousel.tsx` … 未使用のデッドコード → 削除対象
- `src/lib/types.ts` … Company 型に `selectionMemo?: string` あり
- CSS変数は `globals.css` 定義。`--color-primary: #007AFF` など
- ビルドコマンド: `npm run build`

---

## Task 1: TodayDeadlineCarousel.tsx を削除

**Files:**
- Delete: `src/components/board/TodayDeadlineCarousel.tsx`

**Step 1: ファイルが他でimportされていないことを確認**

```bash
grep -r "TodayDeadlineCarousel" src/
```

Expected: `src/components/board/TodayDeadlineCarousel.tsx` のみ（import元なし）

**Step 2: ファイルを削除**

```bash
rm src/components/board/TodayDeadlineCarousel.tsx
```

**Step 3: ビルド確認**

```bash
npm run build
```

Expected: エラーなし

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove unused TodayDeadlineCarousel"
```

---

## Task 2: HeroCardCarousel のビジュアル強化

**Files:**
- Modify: `src/components/board/HeroCardCarousel.tsx`

**変更内容:**

カルーセル内の各カード（締切モード・面接モード）の className を以下に変更する。

**Before（各カードのdiv）:**
```tsx
className="flex-none w-[85vw] max-w-sm bg-card dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-[var(--color-border)]"
```

**After（締切カード・面接カード共通）:**
```tsx
className="flex-none w-[88vw] max-w-sm bg-gradient-to-br from-[#007AFF] to-[#0055D4] rounded-3xl p-6 shadow-2xl"
```

**テキスト色の変更（カード内の全テキスト要素）:**
- 企業名: `text-[var(--color-text)]` → `text-white`
- ステータスバッジ: `bg-[var(--color-primary)]/10 text-[var(--color-primary)]` → `bg-white/20 text-white`
- 締切日テキスト: `text-[var(--color-danger)]` → `text-white/90 font-semibold`
- 面接タイプ: `text-[var(--color-text-secondary)]` → `text-white/80`
- 面接日時: `text-[var(--color-primary)]` → `text-white`
- 時計アイコン（面接モードに追加）: 面接カードの先頭に `<Clock className="w-5 h-5 text-white/70 mb-2" />` を追加（lucide-reactのClockを使う）

**カスタムモードのカード（custom）:**
```tsx
// Before
className="w-full bg-card dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-[var(--color-border)]"

// After
className="w-full bg-gradient-to-br from-[#007AFF] to-[#0055D4] rounded-3xl p-6 shadow-2xl"
// テキストも text-white に変更
```

**セクションタイトル（h2）の変更:**
```tsx
// Before
<h2 className="text-[14px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">

// After
<h2 className="text-[13px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
```

**Step 1: 実装**

上記の変更を `src/components/board/HeroCardCarousel.tsx` に適用する。

**Step 2: ビルド確認**

```bash
npm run build
```

Expected: エラーなし

**Step 3: Commit**

```bash
git add src/components/board/HeroCardCarousel.tsx
git commit -m "feat: hero card blue gradient design"
```

---

## Task 3: 統計タイルのボタン化

**Files:**
- Modify: `src/app/page.tsx`

**変更内容:**

既存の `<Link>` の className を以下に更新する。

**Before:**
```tsx
className="bg-card dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-[var(--color-border)] ios-tap block"
```

**After:**
```tsx
className="bg-card dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-[var(--color-border)] block cursor-pointer active:scale-95 transition-transform duration-100 hover:brightness-95 select-none"
```

また、`px-4` → `px-5` にページ全体のパディングを変更する（次のTask 4との整合のため）。

**Step 1: 実装**

`src/app/page.tsx` の Link className を更新する。

**Step 2: ビルド確認**

```bash
npm run build
```

Expected: エラーなし

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: stat tiles button interaction"
```

---

## Task 4: メモタブを4セクション構成に強化

**Files:**
- Modify: `src/components/board/CompanyDetailModal.tsx`

### 4-1. MemoData 型の定義とパース関数

ファイルの先頭（import直後）に追加：

```tsx
interface MemoData {
  es: string;
  interview: string;
  reverseQuestion: string;
  other: string;
}

function parseMemo(raw: string | undefined): MemoData {
  if (!raw) return { es: '', interview: '', reverseQuestion: '', other: '' };
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'es' in parsed) {
      return parsed as MemoData;
    }
    // 旧データ（プレーンテキスト）はotherに入れる
    return { es: '', interview: '', reverseQuestion: '', other: raw };
  } catch {
    return { es: '', interview: '', reverseQuestion: '', other: raw };
  }
}
```

### 4-2. State の変更

**Before:**
```tsx
const [selectionMemo, setSelectionMemo] = useState(company.selectionMemo ?? '');
```

**After:**
```tsx
const [memo, setMemo] = useState<MemoData>(() => parseMemo(company.selectionMemo));
```

### 4-3. handleSave の変更

**Before:**
```tsx
selectionMemo: selectionMemo.trim() || undefined,
```

**After:**
```tsx
selectionMemo: (memo.es || memo.interview || memo.reverseQuestion || memo.other)
  ? JSON.stringify(memo)
  : undefined,
```

### 4-4. メモタブの JSX を置き換え

**Before (Page 2: メモ の div 全体):**
```tsx
{/* Page 2: メモ */}
<div className="w-full flex-none overflow-y-auto p-4">
  <div className="bg-card rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-4">
    <textarea
      placeholder="ESの回答、面接内容、逆質問などを自由にメモ..."
      value={selectionMemo}
      onChange={(e) => setSelectionMemo(e.target.value)}
      className="w-full bg-transparent text-[var(--color-text)] text-[15px] leading-relaxed min-h-48 resize-y outline-none"
    />
  </div>
</div>
```

**After:**
```tsx
{/* Page 2: メモ（選考ログ） */}
<div className="w-full flex-none overflow-y-auto p-4 space-y-4">
  {/* ES・志望動機 */}
  <div className="bg-card rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
    <div className="px-4 pt-3 pb-1 border-b border-[var(--color-border)]">
      <h4 className="text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
        ES・志望動機
      </h4>
    </div>
    <div className="p-4">
      <textarea
        placeholder="ES回答・志望動機を記録..."
        value={memo.es}
        onChange={(e) => setMemo((prev) => ({ ...prev, es: e.target.value }))}
        className="w-full bg-transparent text-[var(--color-text)] text-[15px] leading-relaxed min-h-32 resize-y outline-none"
      />
    </div>
  </div>

  {/* 面接ログ */}
  <div className="bg-card rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
    <div className="px-4 pt-3 pb-1 border-b border-[var(--color-border)]">
      <h4 className="text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
        面接ログ
      </h4>
    </div>
    <div className="p-4">
      <textarea
        placeholder="面接日時、質問内容、自分の回答を記録..."
        value={memo.interview}
        onChange={(e) => setMemo((prev) => ({ ...prev, interview: e.target.value }))}
        className="w-full bg-transparent text-[var(--color-text)] text-[15px] leading-relaxed min-h-32 resize-y outline-none"
      />
    </div>
  </div>

  {/* 逆質問 */}
  <div className="bg-card rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
    <div className="px-4 pt-3 pb-1 border-b border-[var(--color-border)]">
      <h4 className="text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
        逆質問
      </h4>
    </div>
    <div className="p-4">
      <textarea
        placeholder="準備した逆質問、実際に聞いた内容..."
        value={memo.reverseQuestion}
        onChange={(e) => setMemo((prev) => ({ ...prev, reverseQuestion: e.target.value }))}
        className="w-full bg-transparent text-[var(--color-text)] text-[15px] leading-relaxed min-h-24 resize-y outline-none"
      />
    </div>
  </div>

  {/* その他メモ */}
  <div className="bg-card rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
    <div className="px-4 pt-3 pb-1 border-b border-[var(--color-border)]">
      <h4 className="text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
        その他メモ
      </h4>
    </div>
    <div className="p-4">
      <textarea
        placeholder="感想、次回への改善点、企業の雰囲気など..."
        value={memo.other}
        onChange={(e) => setMemo((prev) => ({ ...prev, other: e.target.value }))}
        className="w-full bg-transparent text-[var(--color-text)] text-[15px] leading-relaxed min-h-24 resize-y outline-none"
      />
    </div>
  </div>
</div>
```

**Step 1: 実装**

上記を `src/components/board/CompanyDetailModal.tsx` に適用する。

**Step 2: ビルド確認**

```bash
npm run build
```

Expected: エラーなし（TypeScriptエラー0件）

**Step 3: Commit**

```bash
git add src/components/board/CompanyDetailModal.tsx
git commit -m "feat: memo tab 4-section structured log"
```

---

## Task 5: 全体UI高級感向上

**Files:**
- Modify: `src/app/page.tsx`（パディング px-4→px-5、gap 拡大）
- Modify: `src/app/tasks/page.tsx`（カード角丸・パディング）
- Modify: `src/app/globals.css`（ ios-input の角丸強化）

### page.tsx の変更点

```tsx
// セクションタイトル下のグリッド
// Before: gap-3 → After: gap-4
// Before: px-4 mt-6 → After: px-5 mt-6
// Before: mb-3 px-1 → After: mb-4 px-1
```

### tasks/page.tsx の変更点

企業カードの className:
```tsx
// Before
className="bg-card dark:bg-zinc-900 rounded-2xl px-4 py-3 shadow-sm border border-[var(--color-border)] flex items-center gap-3"

// After
className="bg-card dark:bg-zinc-900 rounded-2xl px-5 py-4 shadow-sm border border-[var(--color-border)] flex items-center gap-3"
```

### globals.css の変更点

```css
/* ios-input の角丸 12px → 14px */
.ios-input {
  border-radius: 14px;
  padding: 14px 16px;
  /* 他はそのまま */
}

/* ios-button-primary の角丸 12px → 14px */
.ios-button-primary {
  border-radius: 14px;
}
```

**Step 1: 実装**

上記3ファイルを変更する。

**Step 2: ビルド確認**

```bash
npm run build
```

Expected: エラーなし

**Step 3: Commit**

```bash
git add src/app/page.tsx src/app/tasks/page.tsx src/app/globals.css
git commit -m "feat: ui polish - spacing, rounded corners, luxury feel"
```

---

## 最終確認

```bash
npm run build
# → エラー0件

git log --oneline -5
# 直近5コミットを確認
```

変更ファイル一覧を報告する。

---

## 注意事項

- `git push` は別途確認が必要（ユーザーに確認してから実施）
- `selectionMemo` は既存データとの後方互換性あり（parseMemo関数でフォールバック）
- Tailwind v4 を使用しているため、任意値クラス（`from-[#007AFF]`等）はそのまま動作する
