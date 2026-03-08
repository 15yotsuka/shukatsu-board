'use client';

import { useMemo } from 'react';
import { useDeadlines } from '@/contexts/DeadlineContext';
import { parseISO, isValid, isToday, isBefore, differenceInCalendarDays, startOfDay, endOfWeek, endOfMonth } from 'date-fns';

type Section = '今日' | '今週' | '今月' | 'それ以降' | '期限切れ';

export default function DeadlineTab() {
  const { deadlines, loading, error } = useDeadlines();

  const sections = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // 月曜始まり
    const monthEnd = endOfMonth(now);

    const grouped: Record<Section, typeof deadlines> = {
      '期限切れ': [],
      '今日': [],
      '今週': [],
      '今月': [],
      'それ以降': [],
    };

    deadlines.forEach((entry) => {
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

    const sectionOrder: Section[] = ['期限切れ', '今日', '今週', '今月', 'それ以降'];
    sectionOrder.forEach((key) => {
      grouped[key].sort((a, b) => a.deadline.localeCompare(b.deadline));
    });

    return sectionOrder
      .filter((key) => grouped[key].length > 0)
      .map((key) => ({ title: key, items: grouped[key] }));
  }, [deadlines]);

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
    <div className="px-4 py-4 pb-28 space-y-6">
      <h2 className="text-[17px] font-bold text-[var(--color-text)]">締切</h2>
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
            {section.title}
          </h3>
          <div className="space-y-1">
            {section.items.map((entry, idx) => {
              const colorClass = getDeadlineColor(entry.deadline);
              return (
                <div
                  key={`${entry.company_name}-${entry.deadline}-${idx}`}
                  className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {entry.company_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {entry.label}{entry.job_type ? ` / ${entry.job_type}` : ''}
                    </div>
                  </div>
                  <div className={`text-sm font-mono whitespace-nowrap ml-3 ${colorClass}`}>
                    {entry.deadline}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function getDeadlineColor(deadline: string): string {
  const date = parseISO(deadline);
  if (!isValid(date)) return 'text-gray-500';

  const today = startOfDay(new Date());
  const d = startOfDay(date);

  if (isBefore(d, today)) {
    return 'text-red-500';
  }

  const daysLeft = differenceInCalendarDays(d, today);
  if (daysLeft <= 3) {
    return 'text-orange-500';
  }

  return 'text-gray-700 dark:text-gray-300';
}
