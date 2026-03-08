# Design: Dashboard Refresh + Task List + Confetti
Date: 2026-03-02

## Scope
Implement 6 features from handoff document.

## Current State (verified by code reading)
- `types.ts`: Missing `selectionMemo`, `nextDeadline`
- `CompanyDetailModal.tsx`: 2 tabs (詳細情報 | ES管理) — needs 4-tab restructure
- `page.tsx`: 3 stats tiles + quick access — needs 4 tiles + deadline carousel
- `tasks/page.tsx`: KanbanBoard — needs list view replacement
- `BottomNav.tsx`: タスクタブ already present
- All packages installed: canvas-confetti, embla-carousel-react

## Changes

### 1. types.ts
Add to `Company` interface:
- `selectionMemo?: string` — free-form memo for interviews/ES/questions
- `nextDeadline?: string` — ISO 8601 date "YYYY-MM-DD" for sorting/carousel

### 2. src/lib/confetti.ts (new)
`fireConfetti()` — canvas-confetti with iOS colors, particle count 150.

### 3. src/lib/companySuggestions.ts (new)
`COMPANY_SUGGESTIONS` array with ~50 major Japanese companies.

### 4. src/components/board/TodayDeadlineCarousel.tsx (new)
- Uses `embla-carousel-react`
- Shows companies with `nextDeadline` within 7 days from today
- Hidden when no matching companies
- Each card: 企業名 + 締切日 (M/D (曜日) format) + status badge

### 5. src/app/page.tsx (update)
- 4 stats tiles in 2×2 grid (all companies across both tracks):
  - エントリー: total company count
  - 面接中: status name contains 「面接」
  - インターン参加: status name === 「インターン参加」
  - 内定: status name === 「内定」
- TodayDeadlineCarousel below stats (hidden if no deadlines)
- Remove クイックアクセス section (redundant with nav)

### 6. src/app/tasks/page.tsx (replace)
- List of all companies sorted by `nextDeadline` ascending (no deadline → end)
- Each row: 企業名 + フェーズバッジ + 締切日
- FAB (+) to add company (opens AddCompanyForm)

### 7. src/components/board/AddCompanyForm.tsx (update)
- Company name input: onChange with prefix match against COMPANY_SUGGESTIONS
- Dropdown of up to 5 suggestions below input
- Free input always allowed

### 8. src/components/board/CompanyDetailModal.tsx (restructure)
- 4 tabs: 基本情報 | マイページ | メモ | ES管理
- 基本情報: 企業名, 業界, 職種, URL, ステータス
- マイページ: URL (with open link), ログインID, パスワード (👁 toggle)
- メモ: `selectionMemo` textarea (min-h-48)
- ES管理: unchanged
- handleSave: fires confetti if statusId changed AND new status name is 「内定」or「インターン参加」

## Design Decisions
- Confetti triggers in `handleSave()` at component level (no store change needed)
- `selectionMemo` is separate from existing `memo` field (backwards compatible)
- Task list shows ALL companies (both tracks), sorted by deadline
- Carousel uses today as baseline (shows 7 days ahead)
