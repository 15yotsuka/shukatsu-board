'use client';

import { useState } from 'react';
import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import { UpcomingList } from '@/components/calendar/UpcomingList';
import { InterviewForm } from '@/components/calendar/InterviewForm';
import { useAppStore } from '@/store/useAppStore';
import type { Interview, ScheduledAction } from '@/lib/types';
import { ACTION_TYPE_LABELS, ACTION_TYPE_COLORS, type ActionType } from '@/lib/types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedInterviews, setSelectedInterviews] = useState<Interview[]>([]);
  const [selectedActions, setSelectedActions] = useState<ScheduledAction[]>([]);
  const [showAddInterview, setShowAddInterview] = useState(false);
  const [addInterviewCompanyId, setAddInterviewCompanyId] = useState('');
  const companies = useAppStore((s) => s.companies);
  const deleteInterview = useAppStore((s) => s.deleteInterview);
  const deleteScheduledAction = useAppStore((s) => s.deleteScheduledAction);

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const selectedDeadlineCompanies = selectedDate
    ? companies.filter((c) => c.nextDeadline === selectedDateStr)
    : [];
  const selectedActionCompanies = selectedDate
    ? companies.filter((c) => c.nextActionDate === selectedDateStr && c.nextActionDate !== c.nextDeadline)
    : [];

  const handleDateSelect = (date: Date, interviews: Interview[], actions: ScheduledAction[]) => {
    setSelectedDate(date);
    setSelectedInterviews(interviews);
    setSelectedActions(actions);
  };

  const getCompanyName = (companyId: string): string => {
    return companies.find((c) => c.id === companyId)?.name ?? '不明な企業';
  };

  return (
    <div className="px-4 py-4 pb-28 space-y-4">
      <MonthCalendar onDateSelect={handleDateSelect} selectedDate={selectedDate} />
      <UpcomingList />

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

      {selectedDate && selectedActions.length > 0 && (
        <div className="bg-card rounded-xl overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
              {format(selectedDate, 'M月d日（E）', { locale: ja })}の予定
            </h3>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {selectedActions.map((action) => (
              <div key={action.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-none"
                    style={{ backgroundColor: ACTION_TYPE_COLORS[action.type] }}
                  />
                  <div>
                    <p className="text-[15px] font-medium text-[var(--color-text)]">
                      {ACTION_TYPE_LABELS[action.type]}
                    </p>
                    <p className="text-[13px] text-[var(--color-text-secondary)]">
                      {getCompanyName(action.companyId)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteScheduledAction(action.id)}
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

      {selectedDate && selectedDeadlineCompanies.length > 0 && (
        <div className="bg-card rounded-xl overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
              {format(selectedDate, 'M月d日（E）', { locale: ja })}の締切
            </h3>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {selectedDeadlineCompanies.map((company) => (
              <div key={company.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: '#FF3B30' }} />
                <p className="text-[15px] font-medium text-[var(--color-text)]">{company.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedDate && selectedActionCompanies.length > 0 && (
        <div className="bg-card rounded-xl overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
              {format(selectedDate, 'M月d日（E）', { locale: ja })}のアクション
            </h3>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {selectedActionCompanies.map((company) => (
              <div key={company.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="w-2 h-2 rounded-full flex-none"
                  style={{ backgroundColor: ACTION_TYPE_COLORS[company.nextActionType ?? ('other' as ActionType)] }}
                />
                <div>
                  <p className="text-[15px] font-medium text-[var(--color-text)]">{company.name}</p>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    {ACTION_TYPE_LABELS[company.nextActionType ?? ('other' as ActionType)]}
                    {company.nextActionTime && ` ${company.nextActionTime}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedDate && selectedInterviews.length === 0 && selectedActions.length === 0 && selectedDeadlineCompanies.length === 0 && selectedActionCompanies.length === 0 && (
        <div className="bg-card rounded-xl p-4">
          <p className="text-[14px] text-[var(--color-text-secondary)] text-center">
            {format(selectedDate, 'M月d日', { locale: ja })}の予定はありません
          </p>
        </div>
      )}

      {/* 面接追加フローティングボタン */}
      <button
        onClick={() => setShowAddInterview(true)}
        className="fixed bottom-20 right-5 z-40 w-14 h-14 bg-[var(--color-primary)] text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center ios-tap"
        aria-label="面接を追加"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showAddInterview && !addInterviewCompanyId && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAddInterview(false)} />
          <div className="relative bg-card rounded-t-2xl md:rounded-2xl w-full max-w-lg p-5 space-y-4">
            <div className="flex justify-center pb-1 md:hidden">
              <div className="w-9 h-1 bg-[var(--color-border)] rounded-full" />
            </div>
            <h2 className="text-[17px] font-bold text-center text-[var(--color-text)]">企業を選択</h2>
            {companies.length === 0 ? (
              <p className="text-center text-[var(--color-text-secondary)] text-[14px] py-4">企業が登録されていません</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setAddInterviewCompanyId(c.id)}
                    className="w-full text-left px-4 py-3 bg-[var(--color-bg)] rounded-xl text-[15px] font-medium text-[var(--color-text)] ios-tap"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowAddInterview(false)} className="ios-button-secondary">キャンセル</button>
          </div>
        </div>
      )}

      {showAddInterview && addInterviewCompanyId && (
        <InterviewForm
          companyId={addInterviewCompanyId}
          onClose={() => { setShowAddInterview(false); setAddInterviewCompanyId(''); }}
        />
      )}
    </div>
  );
}
