# Revision v2 Design
Date: 2026-03-02

## Scope
REVISION_PROMPT 1-4 + sample data. /es page redesign deferred.

## Change 1: Home page hero card + tile navigation

### Hero card carousel
- Position: above the 4 stat tiles
- Card width: ~85% of screen (w-[85vw] max-w-sm), horizontal scroll with embla-carousel
- Content per card depends on `heroCardMode`:
  - `'deadline'`: companies with `nextDeadline` within 7 days (same as TodayDeadlineCarousel - reuse that)
  - `'interview'`: upcoming interviews from `interviews` array sorted by datetime
  - `'custom'`: static text from `heroCardCustomText` in localStorage
- Hidden when mode is `'deadline'` or `'interview'` and no data exists

### Settings
- Small ⚙ button to the right of hero section heading
- Opens a bottom sheet overlay with 3 radio options
- For `'custom'` mode: textarea input for the custom text
- Saves to localStorage: keys `heroCardMode` and `heroCardCustomText`
- No Zustand store change needed (UI-only settings)

### Tile click navigation
- Each of the 4 tiles links to `/tasks?filter=<label>`
- Labels: `面接中`, `インターン参加`, `内定` (エントリーtile goes to /tasks with no filter)
- Use Next.js `<Link href="/tasks?filter=...">` wrapper around each tile div

## Change 2: Tasks page filter

### Query param support
- Read `searchParams.filter` from URL (`useSearchParams()`)
- If filter present, only show companies whose status name matches the filter string
- Filter check: `getStatusName(c.statusId) === filter` for exact match OR `.includes(filter)` for 面接中

### Filter indicator
- When active: banner at top of list: `"フィルタ: {filter}" [× 解除]`
- `× 解除` button: `router.push('/tasks')` to remove query param

## Change 3: CompanyDetailModal → fixed header + horizontal swipe pages

### Layout structure
```
┌─────────────────────┐
│ 企業名 (large)        │ ← fixed header (flex-shrink-0)
│ ステータス badge  締切日 │
├─────────────────────┤
│ [基本情報][マイペ][メモ] │ ← segmented control (3 tabs)
├─────────────────────┤
│ ← horizontal swipe  │ ← overflow-hidden container
│   Page 1: 基本情報   │
│   Page 2: マイページ  │
│   Page 3: メモ       │
├─────────────────────┤
│ [保存]  削除  本選考↑  │ ← fixed footer
└─────────────────────┘
```

### Header (always visible)
- 企業名: text-xl font-bold
- ステータス selector (select dropdown, same as before)
- 次の締切日 shown as a badge if set (e.g. "3/10")

### Swipe area
- CSS transform: `translateX(-${index * 100}%)` with `transition-transform duration-300`
- 3 flex children, each `w-full flex-none`
- **Page 0 (基本情報)**: 職種, 業界, URL, 次の締切 date input, 面接予定 section
- **Page 1 (マイページ)**: URL with open link, ログインID, パスワード (👁 toggle)
- **Page 2 (メモ)**: selectionMemo textarea (min-h-48)

### Footer (always visible)
- 保存 button (primary, full width)
- 削除 button (text-danger, small)
- 本選考に進む (if intern track, text-primary)

### ES management
- Removed from modal
- Accessible via /es page (deferred redesign)

## Change 4: BottomNav label

- Change `label: 'ES'` → `label: 'メモ'` in navItems array
- href stays `/es`, icon unchanged

## Sample data

- Add 10 diverse sample companies to Zustand store
- Trigger: "サンプルを追加" button in the empty state of Tasks page
- Or: always show in /tasks empty state
- Companies span different industries and statuses
- Some have `nextDeadline` set within 14 days

## Confetti

- Already implemented in `handleSave()` of CompanyDetailModal
- No changes needed — confirm it works
