'use client';

import { useState } from 'react';
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
import { ACTION_TYPE_COLORS } from '@/lib/types';

const DEADLINE_DOT_COLOR = '#FF3B30';

interface MonthCalendarProps {
  onDateSelect: (date: Date, interviews: Interview[], actions: ScheduledAction[]) => void;
  selectedDate?: Date | null;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function MonthCalendar({ onDateSelect, selectedDate }: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const interviews = useAppStore((s) => s.interviews);
  const scheduledActions = useAppStore((s) => s.scheduledActions);
  const companies = useAppStore((s) => s.companies);

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
      isSameDay(new Date(interview.datetime), date)
    );
  };

  const getActionsForDate = (date: Date): ScheduledAction[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return scheduledActions.filter((a) => a.date === dateStr);
  };

  const hasDeadlineOnDate = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return companies.some((c) => c.nextDeadline === dateStr || c.nextActionDate === dateStr);
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
          const dateInterviews = getInterviewsForDate(d);
          const dateActions = getActionsForDate(d);
          const isCurrentMonth = isSameMonth(d, currentMonth);
          const todayCell = isToday(d);
          const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;

          const hasDeadline = hasDeadlineOnDate(d);
          const dots: string[] = [
            ...(hasDeadline ? [DEADLINE_DOT_COLOR] : []),
            ...(dateInterviews.length > 0 ? ['#FF9500'] : []),
            ...dateActions.slice(0, 1).map((a) => ACTION_TYPE_COLORS[a.type]),
          ].slice(0, 3);

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
              {dots.length > 0 && (
                <div className="absolute bottom-0.5 flex gap-0.5">
                  {dots.map((color, i) => (
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
