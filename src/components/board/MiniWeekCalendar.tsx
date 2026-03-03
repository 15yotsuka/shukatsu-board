'use client';

import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { addDays, format, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ACTION_TYPE_COLORS, type ActionType } from '@/lib/types';

export function MiniWeekCalendar() {
  const scheduledActions = useAppStore((s) => s.scheduledActions);

  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const getActionsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return scheduledActions.filter((a) => a.date === dateStr);
  };

  return (
    <Link href="/calendar" className="block px-5 mt-5 transition-opacity hover:opacity-90 active:opacity-75">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
          今週の予定
        </h2>
        <span className="text-[12px] text-[var(--color-primary)]">カレンダーを開く →</span>
      </div>
      <div className="bg-card dark:bg-zinc-900 rounded-2xl shadow-sm border border-[var(--color-border)] p-4">
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const actions = getActionsForDay(day);
            const isToday = i === 0;
            const dayLabel = format(day, 'E', { locale: ja });
            const dateLabel = format(day, 'd');

            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className={`text-[10px] font-medium ${
                  isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
                }`}>
                  {dayLabel}
                </span>
                <span className={`text-[14px] font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                  isToday
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text)]'
                }`}>
                  {dateLabel}
                </span>
                <div className="flex flex-wrap justify-center gap-0.5 min-h-[8px]">
                  {actions.slice(0, 3).map((action, j) => (
                    <div
                      key={j}
                      className="w-1.5 h-1.5 rounded-full flex-none"
                      style={{ backgroundColor: ACTION_TYPE_COLORS[action.type as ActionType] }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Link>
  );
}
