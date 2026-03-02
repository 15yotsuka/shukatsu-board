'use client';

import { useAppStore } from '@/store/useAppStore';
import { format, isAfter, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';

export function UpcomingList() {
  const interviews = useAppStore((s) => s.interviews);
  const companies = useAppStore((s) => s.companies);

  const today = startOfDay(new Date());
  const upcomingInterviews = interviews
    .filter((i) => isAfter(new Date(i.datetime), today) || format(new Date(i.datetime), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'))
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
    .slice(0, 10);

  const getCompanyName = (companyId: string): string => {
    return companies.find((c) => c.id === companyId)?.name ?? '不明な企業';
  };

  if (upcomingInterviews.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 mb-4">
        <h3 className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">直近の面接予定</h3>
        <p className="text-[14px] text-[#8E8E93] text-center py-4">面接予定はまだありません</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl mb-4 overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide">直近の面接予定</h3>
      </div>
      <div className="divide-y divide-[#E5E5EA]">
        {upcomingInterviews.map((interview) => (
          <div
            key={interview.id}
            className="flex items-center gap-3 px-4 py-3 ios-tap"
          >
            <div className="flex-shrink-0 w-12 text-center">
              <p className="text-[12px] text-[#8E8E93]">
                {format(new Date(interview.datetime), 'M/d', { locale: ja })}
              </p>
              <p className="text-[15px] font-bold text-[#1C1C1E]">
                {format(new Date(interview.datetime), 'HH:mm')}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-medium text-[#1C1C1E] truncate">
                {getCompanyName(interview.companyId)}
              </p>
              <p className="text-[13px] text-[#8E8E93] truncate">
                {interview.type}
                {interview.location && ` / ${interview.location}`}
              </p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#C7C7CC] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
