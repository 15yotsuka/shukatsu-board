'use client';

import { useMemo, useState } from 'react';
import { useDeadlines } from '@/contexts/DeadlineContext';
import { GRAD_YEARS, type GradYear } from '@/lib/gradYears';
import { useAppStore } from '@/store/useAppStore';
import { TutorialModal } from '@/components/onboarding/TutorialModal';
import {
  parseISO,
  isValid,
  isToday,
  isBefore,
  startOfDay,
  endOfWeek,
  endOfMonth,
} from 'date-fns';

type Section = '期限切れ' | '今日' | '今週' | '今月' | 'それ以降';
type SortMode = 'deadline-asc' | 'deadline-desc' | 'industry';

const SECTION_ORDER: Section[] = ['今日', '今週', '今月', 'それ以降', '期限切れ'];

export default function DeadlineTab() {
  const { deadlines, loading, error } = useDeadlines();
  const gradYear = useAppStore((state) => state.gradYear);
  const setGradYear = useAppStore((state) => state.setGradYear);
  const tutorialFlags = useAppStore((state) => state.tutorialFlags);
  const markTutorialSeen = useAppStore((state) => state.markTutorialSeen);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [sortMode, setSortMode] = useState<SortMode>('deadline-asc');
  const [expiredCollapsed, setExpiredCollapsed] = useState(true);

  const industries = useMemo(() => {
    const set = new Set<string>();
    deadlines.forEach((d) => {
      set.add(d.industry || '未分類');
    });
    const sorted = Array.from(set).sort((a, b) => {
      if (a === '未分類') return 1;
      if (b === '未分類') return -1;
      return a.localeCompare(b, 'ja');
    });
    return sorted;
  }, [deadlines]);

  const filtered = useMemo(() => {
    if (selectedIndustry === 'all') return deadlines;
    return deadlines.filter((d) => {
      const industry = d.industry || '未分類';
      return industry === selectedIndustry;
    });
  }, [deadlines, selectedIndustry]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortMode) {
      case 'deadline-asc':
        return arr.sort((a, b) => a.deadline.localeCompare(b.deadline));
      case 'deadline-desc':
        return arr.sort((a, b) => b.deadline.localeCompare(a.deadline));
      case 'industry':
        return arr.sort((a, b) => {
          const ia = a.industry || '未分類';
          const ib = b.industry || '未分類';
          const cmp = ia.localeCompare(ib, 'ja');
          if (cmp !== 0) return cmp;
          return a.deadline.localeCompare(b.deadline);
        });
      default:
        return arr;
    }
  }, [filtered, sortMode]);

  const sections = useMemo(() => {
    if (sortMode === 'industry') {
      const grouped = new Map<string, typeof sorted>();
      sorted.forEach((entry) => {
        const key = entry.industry || '未分類';
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(entry);
      });
      return Array.from(grouped.entries()).map(([title, items]) => ({
        title,
        items,
      }));
    }

    const now = new Date();
    const today = startOfDay(now);
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthEnd = endOfMonth(now);

    const grouped: Record<Section, typeof sorted> = {
      '期限切れ': [],
      '今日': [],
      '今週': [],
      '今月': [],
      'それ以降': [],
    };

    sorted.forEach((entry) => {
      const date = parseISO(entry.deadline);
      if (!isValid(date)) return;

      const d = startOfDay(date);

      if (isBefore(d, today)) {
        grouped['期限切れ'].push(entry);
      } else if (isToday(date)) {
        grouped['今日'].push(entry);
      } else if (isBefore(d, weekEnd) || d.getTime() === weekEnd.getTime()) {
        grouped['今週'].push(entry);
      } else if (isBefore(d, monthEnd) || d.getTime() === monthEnd.getTime()) {
        grouped['今月'].push(entry);
      } else {
        grouped['それ以降'].push(entry);
      }
    });

    const order = sortMode === 'deadline-desc' ? [...SECTION_ORDER].reverse() : SECTION_ORDER;

    return order
      .filter((key) => grouped[key].length > 0)
      .map((key) => ({ title: key, items: grouped[key] }));
  }, [sorted, sortMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-500">
        {error}
      </div>
    );
  }

  if (deadlines.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        締切情報はありません
      </div>
    );
  }

  return (
    <div className="px-4 py-4 pb-28 space-y-4">
      {/* 卒年切り替え */}
      {gradYear !== null && (
        <div className="flex gap-2">
          {GRAD_YEARS.map((year) => (
            <button
              key={year}
              onClick={() => setGradYear(year as GradYear)}
              className={`flex-1 py-2 text-[14px] font-semibold rounded-xl transition-colors ios-tap ${
                gradYear === year
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
              }`}
            >
              {year}卒
            </button>
          ))}
        </div>
      )}

      {/* フィルター・ソートUI */}
      <div className="flex gap-2">
        <select
          value={selectedIndustry}
          onChange={(e) => setSelectedIndustry(e.target.value)}
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-card text-[var(--color-text)]"
        >
          <option value="all">すべての業界</option>
          {industries.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>

        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-card text-[var(--color-text)]"
        >
          <option value="deadline-asc">締切日（近い順）</option>
          <option value="deadline-desc">締切日（遠い順）</option>
          <option value="industry">業界ごと</option>
        </select>
      </div>

      {/* 件数表示 */}
      <div className="text-xs text-gray-400 dark:text-gray-500 px-1">
        {filtered.length}件表示{selectedIndustry !== 'all' ? `（${selectedIndustry}）` : ''}
      </div>

      {/* リスト表示 */}
      {sections.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
          該当する締切情報はありません
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            section.title === '期限切れ' ? (
              <div key={section.title}>
                <button
                  onClick={() => setExpiredCollapsed(!expiredCollapsed)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1 ios-tap"
                >
                  <span>{expiredCollapsed ? '\u25B6' : '\u25BC'}</span>
                  期限切れ（{section.items.length}件）
                </button>
                {!expiredCollapsed && (
                  <div className="space-y-1">
                    {section.items.map((entry, idx) => (
                      <div
                        key={`${entry.company_name}-${entry.deadline}-${idx}`}
                        className="flex items-center justify-between px-3 py-2 bg-card rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-[var(--color-text)] truncate">
                            {entry.company_name}
                          </div>
                          <div className="text-xs text-[var(--color-text-secondary)] truncate">
                            {entry.label}
                            {entry.job_type ? ` / ${entry.job_type}` : ''}
                            {entry.industry ? ` • ${entry.industry}` : ''}
                          </div>
                        </div>
                        <div className="text-sm font-mono whitespace-nowrap ml-3 text-[var(--color-text-secondary)]">
                          {entry.deadline}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div key={section.title}>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((entry, idx) => (
                    <div
                      key={`${entry.company_name}-${entry.deadline}-${idx}`}
                      className="flex items-center justify-between px-3 py-2 bg-card rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[var(--color-text)] truncate">
                          {entry.company_name}
                        </div>
                        <div className="text-xs text-[var(--color-text-secondary)] truncate">
                          {entry.label}
                          {entry.job_type ? ` / ${entry.job_type}` : ''}
                          {entry.industry ? ` • ${entry.industry}` : ''}
                        </div>
                      </div>
                      <div className="text-sm font-mono whitespace-nowrap ml-3 text-[var(--color-text-secondary)]">
                        {entry.deadline}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {gradYear !== null && !tutorialFlags.deadline && (
        <TutorialModal
          steps={[
            {
              title: '締切一覧の使い方',
              body: 'CSVから取得した締切情報が表示されます\n卒年タブで対象年度を切り替えられます\n\n業界フィルターやソート順で\n必要な情報をすばやく確認できます',
            },
          ]}
          onComplete={() => markTutorialSeen('deadline')}
        />
      )}
    </div>
  );
}

