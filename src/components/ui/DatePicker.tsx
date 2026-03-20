'use client';

import { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths,
  format, isSameDay, isSameMonth, isToday, parseISO, isValid,
} from 'date-fns';
import { ja } from 'date-fns/locale';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const selected = value && isValid(parseISO(value)) ? parseISO(value) : null;
  const [viewMonth, setViewMonth] = useState<Date>(selected ?? new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
    const result: Date[] = [];
    let cur = start;
    while (cur <= end) {
      result.push(cur);
      cur = addDays(cur, 1);
    }
    return result;
  }, [viewMonth]);

  const DOW = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="bg-[var(--color-bg)] rounded-2xl overflow-hidden">
      {/* ヘッダー：前月 / 年月 / 次月 */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <button
          type="button"
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="ios-tap w-9 h-9 flex items-center justify-center rounded-full text-[var(--color-text-secondary)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-[15px] font-semibold text-[var(--color-text)]">
          {format(viewMonth, 'yyyy年 M月', { locale: ja })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="ios-tap w-9 h-9 flex items-center justify-center rounded-full text-[var(--color-text-secondary)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 px-2 pb-1">
        {DOW.map((d, i) => (
          <div
            key={d}
            className={`text-center text-[11px] font-semibold py-1
              ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-[var(--color-text-secondary)]'}`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 px-2 pb-3 gap-y-1">
        {days.map((day) => {
          const isSelected = selected ? isSameDay(day, selected) : false;
          const isCurrentMonth = isSameMonth(day, viewMonth);
          const isTodayDate = isToday(day);
          const dow = day.getDay();

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onChange(format(day, 'yyyy-MM-dd'))}
              className={`
                relative flex items-center justify-center mx-auto
                w-9 h-9 rounded-full text-[14px] font-medium ios-tap transition-colors
                ${isSelected
                  ? 'bg-[var(--color-primary)] text-white'
                  : isTodayDate
                  ? 'text-[var(--color-primary)] font-bold'
                  : isCurrentMonth
                  ? dow === 0
                    ? 'text-red-400'
                    : dow === 6
                    ? 'text-blue-400'
                    : 'text-[var(--color-text)]'
                  : 'text-[var(--color-border)]'
                }
              `}
            >
              {format(day, 'd')}
              {isTodayDate && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--color-primary)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
