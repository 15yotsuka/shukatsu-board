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
import type { Interview } from '@/lib/types';

interface MonthCalendarProps {
  onDateSelect: (date: Date, interviews: Interview[]) => void;
  selectedDate?: Date | null;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function MonthCalendar({ onDateSelect, selectedDate }: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const interviews = useAppStore((s) => s.interviews);

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

  return (
    <div className="bg-white rounded-xl p-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="w-11 h-11 flex items-center justify-center rounded-full text-[#007AFF] ios-tap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-[17px] font-bold text-[#1C1C1E]">
          {format(currentMonth, 'yyyy年M月', { locale: ja })}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="w-11 h-11 flex items-center justify-center rounded-full text-[#007AFF] ios-tap"
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
            className={`text-center text-[11px] font-semibold uppercase py-1 ${
              i === 0 ? 'text-[#FF3B30]' : i === 6 ? 'text-[#007AFF]' : 'text-[#8E8E93]'
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
          const hasInterviews = dateInterviews.length > 0;
          const isCurrentMonth = isSameMonth(d, currentMonth);
          const today = isToday(d);
          const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;

          return (
            <button
              key={d.toISOString()}
              onClick={() => onDateSelect(d, dateInterviews)}
              className={`relative w-10 h-10 mx-auto flex flex-col items-center justify-center text-[15px] rounded-full ios-tap ${
                !isCurrentMonth
                  ? 'text-[#C7C7CC]'
                  : today
                  ? 'bg-[#007AFF] text-white font-bold'
                  : isSelected
                  ? 'bg-[#E8F0FE] text-[#007AFF] font-semibold'
                  : 'text-[#1C1C1E]'
              }`}
            >
              <span>{format(d, 'd')}</span>
              {hasInterviews && (
                <span
                  className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${
                    today ? 'bg-white' : 'bg-[#007AFF]'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
