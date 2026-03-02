# Dashboard + TaskList + Confetti Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 4-stat dashboard tiles, deadline carousel, task list view, company name suggestions, 3-tab modal restructure, and confetti on 内定/インターン.

**Architecture:** All data in Zustand + localStorage. No server. New fields added to Company type; existing data is backwards-compatible. Confetti fires at component level in handleSave(). Carousel uses embla-carousel-react. No test framework exists — verification = `npm run build` + visual check.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Zustand, date-fns, canvas-confetti, embla-carousel-react

---

### Task 1: Extend Company type

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Add two optional fields to `Company` interface**

In `src/lib/types.ts`, after `myPagePassword?: string;` add:

```typescript
// 拡張メモ（面接メモ・ES・逆質問など自由記述）
selectionMemo?: string;

// 次の締切日（統計・ソート用）ISO 8601: "2026-03-15"
nextDeadline?: string;
```

**Step 2: Verify build**

```bash
npm run build
```
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add selectionMemo and nextDeadline fields to Company type"
```

---

### Task 2: Create confetti utility

**Files:**
- Create: `src/lib/confetti.ts`

**Step 1: Create the file**

```typescript
import confetti from 'canvas-confetti';

export function fireConfetti() {
  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#007AFF', '#34C759', '#FF9500', '#FF2D55', '#AF52DE'],
  });
}
```

**Step 2: Verify build**

```bash
npm run build
```
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/confetti.ts
git commit -m "feat: add confetti utility"
```

---

### Task 3: Create company suggestions list

**Files:**
- Create: `src/lib/companySuggestions.ts`

**Step 1: Create the file**

```typescript
export const COMPANY_SUGGESTIONS = [
  "トヨタ自動車", "ソニーグループ", "パナソニック", "日立製作所",
  "三菱UFJ銀行", "みずほフィナンシャルグループ", "三井住友銀行",
  "NTTデータ", "富士通", "NEC", "キーエンス", "デンソー",
  "ホンダ", "任天堂", "ソフトバンク", "楽天グループ",
  "リクルートホールディングス", "サイバーエージェント", "メルカリ",
  "DeNA", "GREE", "LINE", "Amazon Japan", "Google Japan",
  "Microsoft Japan", "Apple Japan", "マッキンゼー", "BCG",
  "アクセンチュア", "デロイト トーマツ", "PwC", "EY", "KPMG",
  "Goldman Sachs", "Morgan Stanley", "JP Morgan", "野村証券",
  "大和証券", "電通", "博報堂", "伊藤忠商事", "三菱商事",
  "住友商事", "丸紅", "ANAホールディングス", "JAL",
  "東日本旅客鉄道", "セブン&アイ・ホールディングス",
];
```

**Step 2: Commit**

```bash
git add src/lib/companySuggestions.ts
git commit -m "feat: add company suggestions list"
```

---

### Task 4: Update AddCompanyForm with autocomplete

**Files:**
- Modify: `src/components/board/AddCompanyForm.tsx`

**Context:** Current form has a plain `<input>` for company name. We add state for suggestions, filter on change, and show a dropdown list.

**Step 1: Add imports and suggestion state**

At the top of `AddCompanyForm.tsx`, add import:
```typescript
import { COMPANY_SUGGESTIONS } from '@/lib/companySuggestions';
```

Inside the component, after existing `useState` declarations add:
```typescript
const [suggestions, setSuggestions] = useState<string[]>([]);
const [showSuggestions, setShowSuggestions] = useState(false);
```

**Step 2: Update the name onChange handler**

Replace the current `onChange` for the name input with:
```tsx
onChange={(e) => {
  const val = e.target.value;
  setName(val);
  setNameError('');
  if (val.trim().length > 0) {
    const filtered = COMPANY_SUGGESTIONS.filter((s) =>
      s.startsWith(val)
    ).slice(0, 5);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  } else {
    setSuggestions([]);
    setShowSuggestions(false);
  }
}}
onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
```

**Step 3: Add dropdown after the name input**

After the `<input>` for company name (and after the `{nameError && ...}` line), add:
```tsx
{showSuggestions && (
  <ul className="absolute z-10 w-full mt-1 bg-card rounded-xl shadow-lg ring-1 ring-black/10 dark:ring-white/10 overflow-hidden">
    {suggestions.map((s) => (
      <li
        key={s}
        onMouseDown={() => {
          setName(s);
          setShowSuggestions(false);
        }}
        className="px-4 py-2.5 text-[15px] text-[var(--color-text)] hover:bg-[var(--color-border)] cursor-pointer"
      >
        {s}
      </li>
    ))}
  </ul>
)}
```

Also wrap the name input's parent `<div>` with `className="relative"` to position the dropdown correctly.

**Step 4: Verify build**

```bash
npm run build
```
Expected: 0 errors

**Step 5: Commit**

```bash
git add src/components/board/AddCompanyForm.tsx
git commit -m "feat: add company name autocomplete to AddCompanyForm"
```

---

### Task 5: Create TodayDeadlineCarousel component

**Files:**
- Create: `src/components/board/TodayDeadlineCarousel.tsx`

**Context:** Shows companies where `nextDeadline` is between today and 7 days from now. Uses `embla-carousel-react`. Returns null when no companies match.

**Step 1: Create the component**

```tsx
'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { useAppStore } from '@/store/useAppStore';
import { format, parseISO, isWithinInterval, addDays, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';

export function TodayDeadlineCarousel() {
  const companies = useAppStore((s) => s.companies);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const [emblaRef] = useEmblaCarousel({ dragFree: true, containScroll: 'trimSnaps' });

  const today = startOfDay(new Date());
  const limit = addDays(today, 7);

  const upcoming = companies
    .filter((c) => {
      if (!c.nextDeadline) return false;
      const d = startOfDay(parseISO(c.nextDeadline));
      return isWithinInterval(d, { start: today, end: limit });
    })
    .sort((a, b) => a.nextDeadline!.localeCompare(b.nextDeadline!));

  if (upcoming.length === 0) return null;

  return (
    <section className="px-4 mt-4">
      <h2 className="text-[14px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3 px-1">
        直近の締切
      </h2>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3">
          {upcoming.map((c) => {
            const status = statusColumns.find((s) => s.id === c.statusId);
            const deadlineDate = parseISO(c.nextDeadline!);
            const dateLabel = format(deadlineDate, 'M/d (E)', { locale: ja });
            return (
              <div
                key={c.id}
                className="flex-none w-44 bg-card dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-[var(--color-border)]"
              >
                <p className="text-[15px] font-bold text-[var(--color-text)] truncate mb-2">{c.name}</p>
                <p className="text-[13px] font-semibold text-[var(--color-danger)] mb-2">{dateLabel}</p>
                {status && (
                  <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                    {status.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

```bash
npm run build
```
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/components/board/TodayDeadlineCarousel.tsx
git commit -m "feat: add TodayDeadlineCarousel component"
```

---

### Task 6: Update Home page (src/app/page.tsx)

**Files:**
- Modify: `src/app/page.tsx`

**Context:** Replace current 3-tile stats + クイックアクセス with 4-tile stats (across all companies, both tracks) + TodayDeadlineCarousel.

**Step 1: Rewrite page.tsx**

```tsx
'use client';

import { useAppStore } from '@/store/useAppStore';
import { TrackTabs } from '@/components/layout/TrackTabs';
import { DeadlineReminder } from '@/components/board/DeadlineReminder';
import { TodayDeadlineCarousel } from '@/components/board/TodayDeadlineCarousel';

export default function Home() {
  const companies = useAppStore((s) => s.companies);
  const statusColumns = useAppStore((s) => s.statusColumns);

  const getStatusName = (statusId: string) =>
    statusColumns.find((s) => s.id === statusId)?.name ?? '';

  const totalEntries = companies.length;
  const interviewingCount = companies.filter((c) =>
    getStatusName(c.statusId).includes('面接')
  ).length;
  const internCount = companies.filter((c) =>
    getStatusName(c.statusId) === 'インターン参加'
  ).length;
  const offerCount = companies.filter((c) =>
    getStatusName(c.statusId) === '内定'
  ).length;

  const stats = [
    { label: 'エントリー', value: totalEntries, unit: '社', color: 'text-[var(--color-text)]' },
    { label: '面接中', value: interviewingCount, unit: '社', color: 'text-[var(--color-primary)]' },
    { label: 'インターン参加', value: internCount, unit: '社', color: 'text-[var(--color-success)]' },
    { label: '内定', value: offerCount, unit: '社', color: 'text-[var(--color-warning)]' },
  ];

  return (
    <div className="pb-24">
      <TrackTabs />
      <DeadlineReminder />

      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[14px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
            現在の進捗
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-[var(--color-border)]"
            >
              <p className="text-xs text-[var(--color-text-secondary)] mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-bold ${stat.color}`}>{stat.value}</span>
                <span className="text-xs text-[var(--color-text-secondary)]">{stat.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TodayDeadlineCarousel />
    </div>
  );
}
```

**Step 2: Verify build**

```bash
npm run build
```
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: update home dashboard with 4 stat tiles and deadline carousel"
```

---

### Task 7: Replace tasks page with deadline-sorted list

**Files:**
- Modify: `src/app/tasks/page.tsx`

**Context:** Replace the KanbanBoard with a sorted list of all companies.

**Step 1: Rewrite tasks/page.tsx**

```tsx
'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { AddCompanyForm } from '@/components/board/AddCompanyForm';

export default function TasksPage() {
  const companies = useAppStore((s) => s.companies);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const [showAddForm, setShowAddForm] = useState(false);

  const getStatusName = (statusId: string) =>
    statusColumns.find((s) => s.id === statusId)?.name ?? '';

  const sorted = [...companies].sort((a, b) => {
    if (a.nextDeadline && b.nextDeadline) return a.nextDeadline.localeCompare(b.nextDeadline);
    if (a.nextDeadline) return -1;
    if (b.nextDeadline) return 1;
    return 0;
  });

  return (
    <div className="pb-24 px-4 pt-4">
      <h1 className="text-[22px] font-bold text-[var(--color-text)] mb-4">企業一覧</h1>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[16px] font-semibold text-[var(--color-text)] mb-1">企業が登録されていません</p>
          <p className="text-[13px] text-[var(--color-text-secondary)]">右下の＋ボタンから追加してください</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((c) => {
            const statusName = getStatusName(c.statusId);
            return (
              <div
                key={c.id}
                className="bg-card dark:bg-zinc-900 rounded-2xl px-4 py-3 shadow-sm border border-[var(--color-border)] flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[var(--color-text)] truncate">{c.name}</p>
                  {c.nextDeadline && (
                    <p className="text-[12px] text-[var(--color-danger)] mt-0.5">
                      締切: {c.nextDeadline.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2/$3')}
                    </p>
                  )}
                </div>
                <span className="flex-none rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)] whitespace-nowrap">
                  {statusName}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-20 right-5 z-40 w-14 h-14 bg-[var(--color-primary)] text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center ios-tap"
        aria-label="企業を追加"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showAddForm && (
        <AddCompanyForm onClose={() => setShowAddForm(false)} />
      )}
    </div>
  );
}
```

**Step 2: Verify build**

```bash
npm run build
```
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/app/tasks/page.tsx
git commit -m "feat: replace tasks page with deadline-sorted company list"
```

---

### Task 8: Restructure CompanyDetailModal to 4 tabs + confetti

**Files:**
- Modify: `src/components/board/CompanyDetailModal.tsx`

**Context:** Current has 2 tabs (詳細情報 | ES管理). Restructure to 4 tabs: 基本情報 | マイページ | メモ | ES管理. Add `selectionMemo` state. Fire confetti when status changes to 「内定」or「インターン参加」.

**Step 1: Add imports at the top**

Add to existing imports:
```typescript
import { fireConfetti } from '@/lib/confetti';
```

**Step 2: Update tab type and add selectionMemo state**

Change:
```typescript
const [activeTab, setActiveTab] = useState<'details' | 'es'>('details');
```
To:
```typescript
const [activeTab, setActiveTab] = useState<'basic' | 'mypage' | 'memo' | 'es'>('basic');
```

Add after existing `useState` declarations:
```typescript
const [selectionMemo, setSelectionMemo] = useState(company.selectionMemo ?? '');
```

**Step 3: Update handleSave to include selectionMemo and fire confetti**

Replace the `handleSave` function:
```typescript
const handleSave = () => {
  const trimmed = name.trim();
  if (!trimmed) {
    setNameError('企業名は必須です');
    return;
  }

  // Confetti check before save
  if (statusId !== company.statusId) {
    const newStatus = statusColumns.find((s) => s.id === statusId);
    if (newStatus && (newStatus.name === '内定' || newStatus.name === 'インターン参加')) {
      fireConfetti();
    }
  }

  updateCompany(company.id, {
    name: trimmed,
    industry: industry.trim() || undefined,
    jobType: jobType.trim() || undefined,
    url: url.trim() || undefined,
    memo: memo.trim() || undefined,
    selectionMemo: selectionMemo.trim() || undefined,
    statusId,
    myPageUrl: myPageUrl.trim() || undefined,
    myPageId: myPageId.trim() || undefined,
    myPagePassword: myPagePassword.trim() || undefined,
  });
  onClose();
};
```

**Step 4: Replace the tab header section**

Replace the existing tab buttons (詳細情報 | ES管理) with 4 tabs:
```tsx
<div className="flex gap-1 px-2 overflow-x-auto">
  {([
    { key: 'basic', label: '基本情報' },
    { key: 'mypage', label: 'マイページ' },
    { key: 'memo', label: 'メモ' },
    { key: 'es', label: 'ES管理' },
  ] as const).map((tab) => (
    <button
      key={tab.key}
      onClick={() => setActiveTab(tab.key)}
      className={`pb-3 px-2 text-[14px] font-semibold transition-colors relative whitespace-nowrap ${
        activeTab === tab.key
          ? 'text-[var(--color-primary)]'
          : 'text-[var(--color-text-secondary)]'
      }`}
    >
      {tab.label}
      {activeTab === tab.key && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--color-primary)] rounded-t-full"
        />
      )}
    </button>
  ))}
</div>
```

**Step 5: Replace the tab content area**

Replace the `<AnimatePresence>` content with 4 cases. The existing `motion.div` animation pattern stays the same:

- `activeTab === 'basic'`: Contains the grouped list with 企業名/業界/職種/URL/ステータス, the action buttons (保存/本選考に進む/削除), and the InterviewForm button/list
- `activeTab === 'mypage'`: Contains the マイページ情報 section (URL, ID, password toggle)
- `activeTab === 'memo'`: Contains a textarea bound to `selectionMemo` with `min-h-[192px]` (min-h-48)
- `activeTab === 'es'`: Unchanged ES管理 content

For 基本情報 tab content (key="basic"), extract from current 詳細情報 tab:
- The grouped list card (企業名/業界/職種/URL/ステータス)
- The 面接予定 section
- The 保存 button
- The 本選考に進む button (if intern)
- The 削除 button

For マイページ tab (key="mypage"):
- The マイページ情報 card (URL with link + ID + password toggle)
- Add 保存 button at the bottom too

For メモ tab (key="memo"):
```tsx
<motion.div key="memo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
  <div className="bg-card rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-4">
    <textarea
      placeholder="ES の回答、面接内容、逆質問などを自由にメモ..."
      value={selectionMemo}
      onChange={(e) => setSelectionMemo(e.target.value)}
      className="w-full bg-transparent text-[var(--color-text)] min-h-48 resize-y outline-none"
    />
  </div>
  <button onClick={handleSave} className="ios-button-primary shadow-sm hover:opacity-90 transition-opacity mt-4">
    保存
  </button>
</motion.div>
```

**Step 6: Verify build**

```bash
npm run build
```
Expected: 0 errors

**Step 7: Visual check**
- Open modal → should see 4 tabs
- Switch to メモ tab → textarea visible
- Change status to 内定 → save → confetti fires

**Step 8: Commit**

```bash
git add src/components/board/CompanyDetailModal.tsx
git commit -m "feat: restructure modal to 4 tabs, add selectionMemo, fire confetti on 内定/インターン"
```

---

### Task 9: Final build verification and push

**Step 1: Clean build**

```bash
npm run build
```
Expected: 0 errors, 0 warnings

**Step 2: Push to main**

```bash
git push origin main
```
Expected: Vercel auto-deploy triggered

---

## Completion Checklist

- [ ] `npm run build` エラー0件
- [ ] 統計タイル4つ表示（全企業カウント）
- [ ] 締切カルーセル（nextDeadline設定時のみ表示）
- [ ] タスク画面で締切順リスト
- [ ] 企業名入力サジェスト（最大5件）
- [ ] モーダル4タブ（基本情報|マイページ|メモ|ES管理）
- [ ] 内定/インターン参加でconfetti発火
- [ ] git push origin main
