# Calendar & Home Filter/Sort Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add filter chips (by action type) to the calendar page, and filter chips + sort selector to the home page; also fix 最終面接 color to match 面接 (orange).

**Architecture:** All filter/sort state is local React state (not persisted). Filter chips horizontally scrollable, all ON by default. Calendar filter affects calendar dot rendering + date-detail sections + UpcomingList. Home filter affects todoItems; sort changes order and toggles section grouping (today/this week/later) off when not default.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Zustand v5, date-fns v4

---

### Task 1: Fix 最終面接 color in types.ts

**Files:**
- Modify: `src/lib/types.ts:131-137`

**Step 1: Open the file and find ACTION_TYPE_COLORS**

```typescript
// src/lib/types.ts — current
export const ACTION_TYPE_COLORS: Record<ActionType, string> = {
  es: '#007AFF',
  webtest: '#9B59B6',
  interview: '#FF9500',
  final: '#FF3B30',   // ← change this
  other: '#8E8E93',
};
```

**Step 2: Change `final` from red to orange**

```typescript
export const ACTION_TYPE_COLORS: Record<ActionType, string> = {
  es: '#007AFF',
  webtest: '#9B59B6',
  interview: '#FF9500',
  final: '#FF9500',   // same as interview
  other: '#8E8E93',
};
```

**Step 3: Build to verify no type errors**

Run: `npm run build`
Expected: `✓ Compiled successfully`

**Step 4: Commit**

```bash
git add src/lib/types.ts
git commit -m "fix: 最終面接 color matches 面接 (orange)"
```

---

### Task 2: Define shared FilterKind type + FilterChips component

**Files:**
- Create: `src/components/calendar/FilterChips.tsx`

This component is reused on both calendar page and home page.

**Step 1: Create the component**

```tsx
// src/components/calendar/FilterChips.tsx
'use client';

import { ACTION_TYPE_COLORS } from '@/lib/types';

export type FilterKind = 'interview' | 'es' | 'webtest' | 'final' | 'deadline' | 'other';

export const FILTER_LABELS: Record<FilterKind, string> = {
  interview: '面接',
  es: 'ES提出',
  webtest: 'Webテスト',
  final: '最終面接',
  deadline: '締切',
  other: 'その他',
};

export const FILTER_COLORS: Record<FilterKind, string> = {
  interview: ACTION_TYPE_COLORS.interview,
  es: ACTION_TYPE_COLORS.es,
  webtest: ACTION_TYPE_COLORS.webtest,
  final: ACTION_TYPE_COLORS.final,
  deadline: '#FF3B30',
  other: ACTION_TYPE_COLORS.other,
};

export const ALL_FILTERS: FilterKind[] = ['interview', 'es', 'webtest', 'final', 'deadline', 'other'];

interface FilterChipsProps {
  active: Set<FilterKind>;
  onChange: (next: Set<FilterKind>) => void;
}

export function FilterChips({ active, onChange }: FilterChipsProps) {
  const toggle = (kind: FilterKind) => {
    const next = new Set(active);
    if (next.has(kind)) {
      if (next.size === 1) return; // keep at least one active
      next.delete(kind);
    } else {
      next.add(kind);
    }
    onChange(next);
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {ALL_FILTERS.map((kind) => {
        const isOn = active.has(kind);
        const color = FILTER_COLORS[kind];
        return (
          <button
            key={kind}
            type="button"
            onClick={() => toggle(kind)}
            className={`flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold ios-tap transition-all ${
              isOn
                ? 'text-white'
                : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
            }`}
            style={isOn ? { backgroundColor: color } : undefined}
          >
            <span
              className="w-2 h-2 rounded-full flex-none"
              style={{ backgroundColor: isOn ? 'rgba(255,255,255,0.7)' : color }}
            />
            {FILTER_LABELS[kind]}
          </button>
        );
      })}
    </div>
  );
}
```

**Step 2: Build to verify no type errors**

Run: `npm run build`
Expected: `✓ Compiled successfully`

**Step 3: Commit**

```bash
git add src/components/calendar/FilterChips.tsx
git commit -m "feat: shared FilterChips component for calendar and home"
```

---

### Task 3: Add filter to Calendar page

**Files:**
- Modify: `src/app/calendar/page.tsx`
- Modify: `src/components/calendar/MonthCalendar.tsx`
- Modify: `src/components/calendar/UpcomingList.tsx`

#### 3a — CalendarPage: add filter state and wire chips

**Step 1: Add imports and state to CalendarPage**

In `src/app/calendar/page.tsx`, add at the top:

```tsx
import { FilterChips, ALL_FILTERS, type FilterKind } from '@/components/calendar/FilterChips';
```

Inside the component, add state:

```tsx
const [activeFilters, setActiveFilters] = useState<Set<FilterKind>>(new Set(ALL_FILTERS));
```

**Step 2: Helper — map an item to its FilterKind**

Add this helper inside CalendarPage (above the return):

```tsx
// Map company.nextActionType / scheduledAction.type / etc. → FilterKind
const toFilterKind = (type: string | undefined): FilterKind => {
  if (type === 'es') return 'es';
  if (type === 'webtest') return 'webtest';
  if (type === 'final') return 'final';
  if (type === 'interview') return 'interview';
  return 'other';
};
```

**Step 3: Filter the date-detail lists**

Replace the existing `selectedInterviews`, `selectedActions`, `selectedDeadlineCompanies`, `selectedActionCompanies`, `selectedCsvDeadlines` derivations:

```tsx
const selectedInterviews = selectedDate && activeFilters.has('interview')
  ? companies.filter... // same filter, just gated
  : [];
```

More precisely, change each const to gate on `activeFilters`:

```tsx
const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

const selectedInterviews = selectedDate && activeFilters.has('interview')
  ? selectedInterviews_raw   // keep existing logic
  : [];
```

Actually, the cleanest approach is to keep the raw derivations unchanged and filter at render:

```tsx
// Keep existing derivations as _raw:
const selectedInterviewsRaw = selectedDate
  ? companies.filter((c) => c.nextDeadline === selectedDateStr)
  : [];
// ... etc

// Then gate with activeFilters:
const showInterviews = activeFilters.has('interview') && selectedInterviews.length > 0;
const showActions   = ... activeFilters.has for the action type
```

Actually the simplest approach: keep ALL existing const derivations unchanged. Gate them at the JSX render level using `activeFilters.has(...)`.

In the JSX:
- `{selectedDate && selectedInterviews.length > 0 && (` → `{selectedDate && activeFilters.has('interview') && selectedInterviews.length > 0 && (`
- For `selectedActions`: filter by type per item before rendering, or gate the whole section by `activeFilters.has` for any matching type
- For `selectedDeadlineCompanies`: gate with `activeFilters.has('deadline')`
- For `selectedCsvDeadlines`: gate with `activeFilters.has('deadline')`
- For `selectedActionCompanies`: gate by mapping `c.nextActionType` → FilterKind, keep item if `activeFilters.has(kind)`

Complete JSX changes (find each condition and add the filter gate):

```tsx
{/* 面接 */}
{selectedDate && activeFilters.has('interview') && selectedInterviews.length > 0 && (
  ...existing block...
)}

{/* 予定アクション — filter each item */}
{selectedDate && selectedActions.filter(a => activeFilters.has(toFilterKind(a.type))).length > 0 && (
  <div ...>
    ...
    {selectedActions
      .filter(a => activeFilters.has(toFilterKind(a.type)))
      .map(action => ...existing item JSX...)}
  </div>
)}

{/* 締切（自分） */}
{selectedDate && activeFilters.has('deadline') && selectedDeadlineCompanies.length > 0 && (
  ...existing block...
)}

{/* アクション（nextActionDate） */}
{selectedDate && selectedActionCompanies.filter(c => activeFilters.has(toFilterKind(c.nextActionType))).length > 0 && (
  ...
)}

{/* CSV締切 */}
{selectedDate && activeFilters.has('deadline') && selectedCsvDeadlines.length > 0 && (
  ...existing block...
)}
```

Also update the empty-state condition at line 193:

```tsx
{selectedDate &&
  !activeFilters.has('interview') || selectedInterviews.length === 0) &&
  // ... all other conditions also empty
  (
    <div>予定はありません</div>
  )
}
```

Simplest: compute a `hasAnyVisible` boolean and use it.

**Step 4: Add FilterChips to JSX, above MonthCalendar**

```tsx
return (
  <div className="px-4 py-4 pb-28 space-y-4">
    <FilterChips active={activeFilters} onChange={setActiveFilters} />
    <MonthCalendar
      onDateSelect={handleDateSelect}
      selectedDate={selectedDate}
      activeFilters={activeFilters}
    />
    ...rest of JSX
  </div>
);
```

#### 3b — MonthCalendar: filter dots

**Step 1: Update MonthCalendarProps to accept activeFilters**

```tsx
interface MonthCalendarProps {
  onDateSelect: (date: Date, interviews: Interview[], actions: ScheduledAction[]) => void;
  selectedDate?: Date | null;
  activeFilters?: Set<FilterKind>;
}
```

Import `FilterKind` from FilterChips.

**Step 2: Update hasDeadlineOnDate and dot logic**

```tsx
// In MonthCalendar, add helper
const toFilterKind = (type: string | undefined): FilterKind => {
  if (type === 'es') return 'es';
  if (type === 'webtest') return 'webtest';
  if (type === 'final') return 'final';
  if (type === 'interview') return 'interview';
  return 'other';
};

const filters = activeFilters ?? new Set(ALL_FILTERS);

// In the days.map():
const dots: string[] = [];

const hasDeadline = (
  filters.has('deadline') && (
    companies.some((c) => c.nextDeadline === dateStr || c.nextActionDate === dateStr) ||
    deadlines.some((d) => d.deadline === dateStr)
  )
);
if (hasDeadline) dots.push(DEADLINE_DOT_COLOR);

if (filters.has('interview') && dateInterviews.length > 0) dots.push('#FF9500');

const filteredActions = dateActions.filter(a => filters.has(toFilterKind(a.type)));
if (filteredActions.length > 0) dots.push(...filteredActions.slice(0, 1).map(a => ACTION_TYPE_COLORS[a.type]));

// slice to max 3
const finalDots = dots.slice(0, 3);
```

Replace the existing `const dots: string[]` block with the above.

#### 3c — UpcomingList: accept + apply activeFilters

**Step 1: Update UpcomingList to accept activeFilters prop**

```tsx
interface UpcomingListProps {
  activeFilters?: Set<FilterKind>;
}

export function UpcomingList({ activeFilters }: UpcomingListProps) {
  const filters = activeFilters ?? new Set(ALL_FILTERS);
  ...
```

**Step 2: Filter items based on activeFilters**

```tsx
// interviewItems: gate on filters.has('interview')
const interviewItems: UnifiedItem[] = filters.has('interview')
  ? interviews.filter(...).map(...)   // same as existing
  : [];

// actionItems: filter each by type
const actionItems: UnifiedItem[] = scheduledActions
  .filter((a) => a.date >= todayStr && filters.has(toFilterKind(a.type)))
  .map(...);   // same mapping

// deadlineItems: gate on filters.has('deadline')
const deadlineItems: UnifiedItem[] = filters.has('deadline')
  ? companies.filter((c) => c.nextDeadline && c.nextDeadline >= todayStr).map(...)
  : [];
```

Add `toFilterKind` helper (same as above) inside UpcomingList.

Import `FilterKind, ALL_FILTERS` from FilterChips.

**Step 3: Pass activeFilters from CalendarPage to UpcomingList**

In CalendarPage JSX:
```tsx
<UpcomingList activeFilters={activeFilters} />
```

**Step 4: Build to verify no type errors**

Run: `npm run build`
Expected: `✓ Compiled successfully`

**Step 5: Commit**

```bash
git add src/app/calendar/page.tsx src/components/calendar/MonthCalendar.tsx src/components/calendar/UpcomingList.tsx
git commit -m "feat: filter chips on calendar page"
```

---

### Task 4: Add filter + sort to Home page

**Files:**
- Modify: `src/app/page.tsx`

#### 4a — Filter

**Step 1: Add imports**

```tsx
import { FilterChips, ALL_FILTERS, type FilterKind } from '@/components/calendar/FilterChips';
```

**Step 2: Add state**

```tsx
const [activeFilters, setActiveFilters] = useState<Set<FilterKind>>(new Set(ALL_FILTERS));
```

**Step 3: Add toFilterKind helper**

Add inside Home component (can be same as calendar):

```tsx
const toFilterKind = (type: string | undefined): FilterKind => {
  if (type === 'es') return 'es';
  if (type === 'webtest') return 'webtest';
  if (type === 'final') return 'final';
  if (type === 'interview') return 'interview';
  return 'other';
};
```

**Step 4: Map each TodoItem to a FilterKind, then filter todoItems**

TodoItem needs a `filterKind` field. Add it to the interface:

```tsx
interface TodoItem {
  id: string;
  companyId: string;
  companyName: string;
  label: string;
  date: string;
  time?: string;
  tags?: Tag[];
  filterKind: FilterKind;  // ← add this
}
```

Update the 3 item-building blocks in `todoItems` useMemo:

```tsx
// scheduledActions block:
items.push({
  ...existing fields,
  filterKind: toFilterKind(a.type),
});

// interviews block:
items.push({
  ...existing fields,
  filterKind: 'interview',
});

// companies.nextActionDate block:
items.push({
  ...existing fields,
  filterKind: toFilterKind(c.nextActionType),
});
```

**Step 5: Apply filter to filteredItems**

After `todoItems` useMemo, add:

```tsx
const filteredItems = useMemo(
  () => todoItems.filter((item) => activeFilters.has(item.filterKind)),
  [todoItems, activeFilters]
);
```

Replace all uses of `todoItems` in date sections with `filteredItems`:

```tsx
const todayItems  = filteredItems.filter((i) => i.date === today);
const thisWeekItems = filteredItems.filter((i) => i.date > today && i.date <= weekEnd);
const laterItems  = filteredItems.filter((i) => i.date > weekEnd);
```

Also update the empty state check:
```tsx
{filteredItems.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <p className="text-[16px] font-semibold text-[var(--color-text)] mb-1">
      {todoItems.length === 0 ? '予定はありません' : '該当する予定がありません'}
    </p>
    ...
  </div>
) : (
```

#### 4b — Sort

**Step 2: Add sort state**

```tsx
type SortKind = 'asc' | 'desc' | 'name';
const [sortKind, setSortKind] = useState<SortKind>('asc');
const [showSortSheet, setShowSortSheet] = useState(false);
```

**Step 3: Apply sort to filteredItems**

Replace `filteredItems` useMemo:

```tsx
const filteredSortedItems = useMemo(() => {
  const filtered = todoItems.filter((item) => activeFilters.has(item.filterKind));
  if (sortKind === 'desc') {
    return [...filtered].sort((a, b) => {
      const dc = b.date.localeCompare(a.date);
      if (dc !== 0) return dc;
      if (a.time && b.time) return b.time.localeCompare(a.time);
      return a.time ? 1 : b.time ? -1 : 0;
    });
  }
  if (sortKind === 'name') {
    return [...filtered].sort((a, b) => a.companyName.localeCompare(b.companyName, 'ja'));
  }
  // asc (default) — already sorted in todoItems useMemo
  return filtered;
}, [todoItems, activeFilters, sortKind]);
```

Replace all `filteredItems` references with `filteredSortedItems`.

**Step 4: Conditional rendering — sections vs flat**

```tsx
const isDefaultSort = sortKind === 'asc';

// Section split only when default sort
const todayItems    = isDefaultSort ? filteredSortedItems.filter((i) => i.date === today) : [];
const thisWeekItems = isDefaultSort ? filteredSortedItems.filter((i) => i.date > today && i.date <= weekEnd) : [];
const laterItems    = isDefaultSort ? filteredSortedItems.filter((i) => i.date > weekEnd) : [];

// Flat list for non-default sorts
```

In JSX:

```tsx
{filteredSortedItems.length === 0 ? (
  <EmptyState />
) : isDefaultSort ? (
  <>
    {renderSection('今日', todayItems, 'なし')}
    {renderSection('今週', thisWeekItems, 'なし')}
    {laterItems.length > 0 && renderSection('それ以降', laterItems)}
  </>
) : (
  <div className="space-y-2">
    {filteredSortedItems.map(renderTodoItem)}
  </div>
)}
```

**Step 5: Sort button + bottom sheet UI**

Sort button sits in a controls row above the content:

```tsx
{/* Controls row */}
<div className="flex items-center gap-2 mb-4">
  <div className="flex-1 min-w-0">
    <FilterChips active={activeFilters} onChange={setActiveFilters} />
  </div>
  <button
    onClick={() => setShowSortSheet(true)}
    className="flex-none flex items-center gap-1 px-3 py-1.5 bg-[var(--color-border)] rounded-full text-[12px] font-semibold text-[var(--color-text-secondary)] ios-tap"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M6 12h12M9 17h6" />
    </svg>
    {sortKind === 'asc' ? '近い順' : sortKind === 'desc' ? '遠い順' : '企業名順'}
  </button>
</div>
```

Sort bottom sheet (append to JSX before closing `</div>`):

```tsx
{showSortSheet && (
  <div className="fixed inset-0 z-[70] flex items-end justify-center">
    <div className="absolute inset-0 bg-black/30" onClick={() => setShowSortSheet(false)} />
    <div className="relative bg-card rounded-t-2xl w-full max-w-lg p-5 space-y-2">
      <div className="flex justify-center pb-1">
        <div className="w-9 h-1 bg-[var(--color-border)] rounded-full" />
      </div>
      <h3 className="text-[15px] font-bold text-center text-[var(--color-text)] pb-1">並べ替え</h3>
      {([
        ['asc',  '近い順（デフォルト）'],
        ['desc', '遠い順'],
        ['name', '企業名順'],
      ] as [SortKind, string][]).map(([kind, label]) => (
        <button
          key={kind}
          onClick={() => { setSortKind(kind); setShowSortSheet(false); }}
          className={`w-full py-3 rounded-xl text-[15px] font-medium ios-tap ${
            sortKind === kind
              ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
              : 'bg-[var(--color-bg)] text-[var(--color-text)]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
)}
```

**Step 6: Build to verify no type errors**

Run: `npm run build`
Expected: `✓ Compiled successfully`

**Step 7: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: filter chips + sort on home page"
```

---

### Task 5: Final verification + push

**Step 1: Full build**

Run: `npm run build`
Expected: `✓ Compiled successfully` with 0 errors

**Step 2: Manual smoke test (in browser)**

- Calendar: chips all ON → tap one OFF → dots disappear for that type → tap a date → that section hidden
- UpcomingList scrolls past only visible types
- Home: chips filter the list → sort button opens sheet → 遠い順 removes sections → 企業名順 sorts alphabetically → 近い順 restores sections

**Step 3: Push**

```bash
git push origin main
```
