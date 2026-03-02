'use client';

import { useState } from 'react';
import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import { UpcomingList } from '@/components/calendar/UpcomingList';
import { useAppStore } from '@/store/useAppStore';
import type { Interview } from '@/lib/types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedInterviews, setSelectedInterviews] = useState<Interview[]>([]);
  const companies = useAppStore((s) => s.companies);
  const deleteInterview = useAppStore((s) => s.deleteInterview);

  const handleDateSelect = (date: Date, interviews: Interview[]) => {
    setSelectedDate(date);
    setSelectedInterviews(interviews);
  };

  const getCompanyName = (companyId: string): string => {
    return companies.find((c) => c.id === companyId)?.name ?? '不明な企業';
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <UpcomingList />
      <MonthCalendar onDateSelect={handleDateSelect} selectedDate={selectedDate} />

      {selectedDate && selectedInterviews.length > 0 && (
        <div className="bg-card rounded-xl overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
              {format(selectedDate, 'M月d日（E）', { locale: ja })}の面接
            </h3>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {selectedInterviews.map((interview) => (
              <div
                key={interview.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-[var(--color-text)]">
                    {getCompanyName(interview.companyId)}
                  </p>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    {format(new Date(interview.datetime), 'HH:mm')} / {interview.type}
                    {interview.location && ` / ${interview.location}`}
                  </p>
                  {interview.memo && (
                    <p className="text-[12px] text-[var(--color-border)] mt-1">{interview.memo}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteInterview(interview.id)}
                  className="w-11 h-11 flex items-center justify-center text-[var(--color-danger)] ios-tap"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedDate && selectedInterviews.length === 0 && (
        <div className="bg-card rounded-xl p-4">
          <p className="text-[14px] text-[var(--color-text-secondary)] text-center">
            {format(selectedDate, 'M月d日', { locale: ja })}の面接予定はありません
          </p>
        </div>
      )}
    </div>
  );
}
