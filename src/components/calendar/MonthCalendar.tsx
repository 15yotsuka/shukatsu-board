'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import type { Interview, ScheduledAction } from '@/lib/types';
import { useDeadlines } from '@/contexts/DeadlineContext';
import { type FilterKind, ALL_FILTERS } from '@/components/calendar/FilterChips';

const DEADLINE_DOT_COLOR = '#FF3B30';

interface MonthCalendarProps {
  onDateSelect: (date: Date, interviews: Interview[], actions: ScheduledAction[]) => void;
  selectedDate?: Date | null;
  activeFilters?: Set<FilterKind>;
  activeCompanyIds?: Set<string>;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function MonthCalendar({ onDateSelect, selectedDate, activeFilters, activeCompanyIds }: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const interviews = useAppStore((s) => s.interviews);
  const scheduledActions = useAppStore((s) => s.scheduledActions);
  const companies = useAppStore((s) => s.companies);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const { deadlines } = useDeadlines();

  // action type → 段階色のマッピング（statusColumnsから動的に取得）
  const actionTypeColor = useMemo(() => {
    const esCol = statusColumns.find((c) => c.name === 'ES');
    const webCol = statusColumns.find((c) => c.name === 'Webテスト');
    const interviewCol = statusColumns.find((c) => c.name.includes('面接'));
    return {
      es: esCol?.color ?? '#8B5CF6',
      webtest: webCol?.color ?? '#3B82F6',
      interview: interviewCol?.color ?? '#F97316',
      gd: interviewCol?.color ?? '#F97316',
      other: '#8E8E93',
    } as Record<string, string>;
  }, [statusColumns]);

  const filters = activeFilters ?? new Set(ALL_FILTERS);
  const inCompanyFilter = (companyId: string) => !activeCompanyIds || activeCompanyIds.has(companyId);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getInterviewsForDate = (date: Date): Interview[] => {
    return interviews.filter((interview) =>
      isSameDay(new Date(interview.datetime), date) && inCompanyFilter(interview.companyId)
    );
  };

  const getActionsForDate = (date: Date): ScheduledAction[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return scheduledActions.filter((a) => a.date === dateStr && inCompanyFilter(a.companyId));
  };

  const toFilterKind = (type: string | undefined): FilterKind => {
    if (type === 'es') return 'es';
    if (type === 'webtest') return 'webtest';
    if (type === 'interview') return 'interview';
    return 'other';
  };

  return (
    <div className="bg-card dark:bg-zinc-900 rounded-xl p-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="w-11 h-11 flex items-center justify-center rounded-full text-[var(--color-primary)] ios-tap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-[17px] font-bold text-[var(--color-text)]">
          {format(currentMonth, 'yyyy年M月', { locale: ja })}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="w-11 h-11 flex items-center justify-center rounded-full text-[var(--color-primary)] ios-tap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((wd, i) => (
          <div
            key={wd}
            className={`text-center text-[11px] font-semibold uppercase py-1 ${i === 0 ? 'text-[var(--color-danger)]' : i === 6 ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
              }`}
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const dateStr = format(d, 'yyyy-MM-dd');
          const dateInterviews = getInterviewsForDate(d);
          const dateActions = getActionsForDate(d);
          const isCurrentMonth = isSameMonth(d, currentMonth);
          const todayCell = isToday(d);
          const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;

          const dots: string[] = [];

          const hasDeadline =
            filters.has('deadline') &&
            (companies.some((c) =>
              (c.nextDeadline === dateStr || c.nextActionDate === dateStr) &&
              inCompanyFilter(c.id) &&
              !scheduledActions.some((a) => a.companyId === c.id && a.date === dateStr)
            ) ||
              (!activeCompanyIds && deadlines.some((dd) => dd.deadline === dateStr)));
          if (hasDeadline) dots.push(DEADLINE_DOT_COLOR);

          if (filters.has('interview') && dateInterviews.length > 0) dots.push(actionTypeColor.interview);

          const filteredActions = dateActions.filter((a) => filters.has(toFilterKind(a.type)));
          if (filteredActions.length > 0) dots.push(actionTypeColor[filteredActions[0].type] ?? '#8E8E93');

          const finalDots = dots.slice(0, 3);

          return (
            <button
              key={d.toISOString()}
              onClick={() => onDateSelect(d, dateInterviews, dateActions)}
              className={`relative w-10 h-10 mx-auto flex flex-col items-center justify-center text-[15px] rounded-full ios-tap ${!isCurrentMonth
                ? 'text-[var(--color-border)]'
                : todayCell
                  ? 'bg-[var(--color-primary)] text-white font-bold'
                  : isSelected
                    ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold'
                    : 'text-[var(--color-text)]'
                }`}
            >
              <span>{format(d, 'd')}</span>
              {finalDots.length > 0 && (
                <div className="absolute bottom-0.5 flex gap-0.5">
                  {finalDots.map((color, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: todayCell ? 'rgba(255,255,255,0.8)' : color }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
