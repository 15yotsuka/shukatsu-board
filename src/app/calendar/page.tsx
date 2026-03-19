'use client';

import { useState, useMemo } from 'react';
import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import { UpcomingList } from '@/components/calendar/UpcomingList';
import { ALL_FILTERS, type FilterKind } from '@/components/calendar/FilterChips';
import { TutorialModal } from '@/components/onboarding/TutorialModal';
import { useAppStore } from '@/store/useAppStore';
import type { Interview, ScheduledAction } from '@/lib/types';
import { ACTION_TYPE_LABELS, ACTION_TYPE_COLORS, SCHEDULE_STAGE_OPTIONS, scheduleStageToAction, getDateLabel, needsTimeInput, type ActionType } from '@/lib/types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useDeadlines } from '@/contexts/DeadlineContext';

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedInterviews, setSelectedInterviews] = useState<Interview[]>([]);
  const [selectedActions, setSelectedActions] = useState<ScheduledAction[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [addEventCompanyId, setAddEventCompanyId] = useState('');
  const [addEventStage, setAddEventStage] = useState<string | null>(null);
  const [actionDate, setActionDate] = useState('');
  const [actionTime, setActionTime] = useState('');
  const [filterValue, setFilterValue] = useState<string>('all');
  const companies = useAppStore((s) => s.companies);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const addScheduledAction = useAppStore((s) => s.addScheduledAction);
  const deleteInterview = useAppStore((s) => s.deleteInterview);
  const deleteScheduledAction = useAppStore((s) => s.deleteScheduledAction);
  const tutorialFlags = useAppStore((s) => s.tutorialFlags);
  const markTutorialSeen = useAppStore((s) => s.markTutorialSeen);
  const gradYear = useAppStore((s) => s.gradYear);
  const { deadlines } = useDeadlines();

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

  const INACTIVE_STAGES = ['エントリー前', '内定', '見送り'];

  // 選考中企業のIDセット（選考中フィルター用）— 詳細リストにも使うためここで計算
  const activeCompanyIds = useMemo(() => {
    if (filterValue !== '選考中') return undefined;
    return new Set(
      companies
        .filter((c) => {
          const col = statusColumns.find((s) => s.id === c.statusId);
          return col && !INACTIVE_STAGES.includes(col.name);
        })
        .map((c) => c.id)
    );
  }, [companies, statusColumns, filterValue]);

  const selectedDeadlineCompanies = selectedDate
    ? companies.filter((c) =>
        c.nextDeadline === selectedDateStr &&
        (!activeCompanyIds || activeCompanyIds.has(c.id)) &&
        !selectedActions.some((a) => a.companyId === c.id)
      )
    : [];
  const selectedActionCompanies = selectedDate
    ? companies.filter((c) =>
        c.nextActionDate === selectedDateStr &&
        c.nextActionDate !== c.nextDeadline &&
        (!activeCompanyIds || activeCompanyIds.has(c.id))
      )
    : [];
  const selectedCsvDeadlines = selectedDate && filterValue !== '選考中'
    ? deadlines.filter((d) => d.deadline === selectedDateStr)
    : [];

  const handleDateSelect = (date: Date, interviews: Interview[], actions: ScheduledAction[]) => {
    setSelectedDate(date);
    setSelectedInterviews(interviews);
    setSelectedActions(actions);
  };

  // Convert dropdown filter to Set<FilterKind> for sub-components
  const activeFilters = (() => {
    if (filterValue === 'all' || filterValue === '選考中') return new Set(ALL_FILTERS);
    const map: Record<string, FilterKind> = {
      'ES': 'es', 'Webテスト': 'webtest', '面接': 'interview', '締切': 'deadline', 'その他': 'other',
    };
    const kind = map[filterValue];
    return kind ? new Set([kind]) : new Set(ALL_FILTERS);
  })();

  const resetAddFlow = () => {
    setShowAddEvent(false);
    setAddEventCompanyId('');
    setAddEventStage(null);
    setActionDate('');
    setActionTime('');
  };

  const handleAddAction = () => {
    if (!addEventCompanyId || !addEventStage || !actionDate) return;
    if (needsTimeInput(addEventStage) && !actionTime) return;
    const { type, subType } = scheduleStageToAction(addEventStage);
    let endTime: string | undefined;
    if (actionTime) {
      const [h, m] = actionTime.split(':').map(Number);
      endTime = `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    addScheduledAction({
      companyId: addEventCompanyId,
      type,
      subType,
      date: actionDate,
      startTime: actionTime || undefined,
      endTime,
    });
    resetAddFlow();
  };

  const getCompanyName = (companyId: string): string => {
    return companies.find((c) => c.id === companyId)?.name ?? '不明な企業';
  };

  const toFilterKind = (type: string | undefined): FilterKind => {
    if (type === 'es') return 'es';
    if (type === 'webtest') return 'webtest';
    if (type === 'interview') return 'interview';
    return 'other';
  };

  const hasAnyVisible =
    (activeFilters.has('interview') && selectedInterviews.length > 0) ||
    (selectedActions.some(a => activeFilters.has(toFilterKind(a.type)))) ||
    (activeFilters.has('deadline') && selectedDeadlineCompanies.length > 0) ||
    (selectedActionCompanies.some(c => activeFilters.has(toFilterKind(c.nextActionType)))) ||
    (activeFilters.has('deadline') && selectedCsvDeadlines.length > 0);

  return (
    <div className="px-4 py-4 pb-28 space-y-4">
      {/* 色凡例 */}
      <div className="flex flex-wrap items-center gap-3 px-1 text-xs text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:'#8B5CF6'}} />ES</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:'#3B82F6'}} />Webテスト</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:'#F97316'}} />面接</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:'#22C55E'}} />内定</span>
      </div>

      {/* プルダウン絞り込み */}
      <select
        value={filterValue}
        onChange={(e) => setFilterValue(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-card text-[var(--color-text)] text-[14px] font-medium"
      >
        <option value="all">すべて</option>
        <option value="選考中">選考中企業のみ</option>
        <option value="ES">ES</option>
        <option value="Webテスト">Webテスト</option>
        <option value="面接">面接</option>
        <option value="締切">締切</option>
        <option value="その他">その他</option>
      </select>
      <MonthCalendar onDateSelect={handleDateSelect} selectedDate={selectedDate} activeFilters={activeFilters} activeCompanyIds={activeCompanyIds} />

      {selectedDate && activeFilters.has('interview') && selectedInterviews.length > 0 && (
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

      {selectedDate && selectedActions.filter(a => activeFilters.has(toFilterKind(a.type))).length > 0 && (
        <div className="bg-card rounded-xl overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
              {format(selectedDate, 'M月d日（E）', { locale: ja })}の予定
            </h3>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {selectedActions.filter(a => activeFilters.has(toFilterKind(a.type))).map((action) => (
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

      {selectedDate && activeFilters.has('deadline') && selectedDeadlineCompanies.length > 0 && (
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

      {selectedDate && selectedActionCompanies.filter(c => activeFilters.has(toFilterKind(c.nextActionType))).length > 0 && (
        <div className="bg-card rounded-xl overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
              {format(selectedDate, 'M月d日（E）', { locale: ja })}のアクション
            </h3>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {selectedActionCompanies.filter(c => activeFilters.has(toFilterKind(c.nextActionType))).map((company) => (
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

      {selectedDate && activeFilters.has('deadline') && selectedCsvDeadlines.length > 0 && (
        <div className="bg-card rounded-xl overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
              {format(selectedDate, 'M月d日（E）', { locale: ja })}の締切（一覧）
            </h3>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {selectedCsvDeadlines.map((d, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: '#FF3B30' }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-[var(--color-text)] truncate">{d.company_name}</p>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">{d.type}{d.label ? ` · ${d.label}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedDate && !hasAnyVisible && (
        <div className="bg-card rounded-xl p-4">
          <p className="text-[14px] text-[var(--color-text-secondary)] text-center">
            {format(selectedDate, 'M月d日', { locale: ja })}の予定はありません
          </p>
        </div>
      )}

      <UpcomingList activeFilters={activeFilters} activeCompanyIds={activeCompanyIds} />

      {/* 予定追加フローティングボタン */}
      <button
        onClick={() => setShowAddEvent(true)}
        className="fixed right-5 z-40 w-14 h-14 bg-[var(--color-primary)] text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center ios-tap"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
        aria-label="予定を追加"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Step 1: 種別選択（フラット） */}
      {showAddEvent && !addEventStage && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={resetAddFlow} />
          <div className="relative bg-card rounded-t-2xl md:rounded-2xl w-full max-w-lg p-5 space-y-4">
            <div className="flex justify-center pb-1 md:hidden">
              <div className="w-9 h-1 bg-[var(--color-border)] rounded-full" />
            </div>
            <h2 className="text-[17px] font-bold text-center text-[var(--color-text)]">種別を選択</h2>
            <div className="space-y-2">
              {SCHEDULE_STAGE_OPTIONS.map((stage) => {
                const { type } = scheduleStageToAction(stage);
                return (
                  <button
                    key={stage}
                    onClick={() => setAddEventStage(stage)}
                    className="w-full flex items-center gap-3 text-left px-4 py-3 bg-[var(--color-bg)] rounded-xl text-[15px] font-medium text-[var(--color-text)] ios-tap"
                  >
                    <span className="w-3 h-3 rounded-full flex-none" style={{ backgroundColor: ACTION_TYPE_COLORS[type] }} />
                    {stage}
                  </button>
                );
              })}
            </div>
            <button onClick={resetAddFlow} className="ios-button-secondary">キャンセル</button>
          </div>
        </div>
      )}

      {/* Step 2: 企業選択 */}
      {showAddEvent && addEventStage && !addEventCompanyId && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={resetAddFlow} />
          <div className="relative bg-card rounded-t-2xl md:rounded-2xl w-full max-w-lg p-5 space-y-4">
            <div className="flex justify-center pb-1 md:hidden">
              <div className="w-9 h-1 bg-[var(--color-border)] rounded-full" />
            </div>
            <h2 className="text-[17px] font-bold text-center text-[var(--color-text)]">
              {addEventStage} — 企業を選択
            </h2>
            {companies.length === 0 ? (
              <p className="text-center text-[var(--color-text-secondary)] text-[14px] py-4">企業が登録されていません</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setAddEventCompanyId(c.id)}
                    className="w-full text-left px-4 py-3 bg-[var(--color-bg)] rounded-xl text-[15px] font-medium text-[var(--color-text)] ios-tap"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setAddEventStage(null)} className="ios-button-secondary">戻る</button>
          </div>
        </div>
      )}

      {/* Step 3: 日時入力フォーム */}
      {showAddEvent && addEventCompanyId && addEventStage && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={resetAddFlow} />
          <div className="relative bg-card rounded-t-2xl md:rounded-2xl w-full max-w-lg animate-slide-up">
            <div className="flex justify-center pt-2 pb-0 md:hidden">
              <div className="w-9 h-1 bg-[var(--color-border)] rounded-full" />
            </div>
            <div className="px-4 pt-4 pb-2">
              <h2 className="text-[17px] font-bold text-center text-[var(--color-text)]">
                {addEventStage}を追加
              </h2>
              <p className="text-[13px] text-center text-[var(--color-text-secondary)] mt-1">
                {getCompanyName(addEventCompanyId)}
              </p>
            </div>
            <div className="p-4 space-y-4">
              <label className="block text-[13px] text-[var(--color-text-secondary)]">
                {getDateLabel(addEventStage)}はありますか？（任意）
              </label>
              <div className="flex gap-2">
                <div className="flex-[2]">
                  <input type="date" value={actionDate} onChange={(e) => setActionDate(e.target.value)} className="ios-input" />
                </div>
                {needsTimeInput(addEventStage) && (
                  <div className="flex-1">
                    <input type="time" value={actionTime} onChange={(e) => setActionTime(e.target.value)} className="ios-input" />
                  </div>
                )}
                {!needsTimeInput(addEventStage) && (
                  <div className="flex-1">
                    <input type="time" value={actionTime} onChange={(e) => setActionTime(e.target.value)} className="ios-input" placeholder="時間" />
                  </div>
                )}
              </div>
              <button onClick={handleAddAction} disabled={!actionDate || (needsTimeInput(addEventStage!) && !actionTime)} className="ios-button-primary disabled:opacity-40">
                追加する
              </button>
              <button onClick={resetAddFlow} className="ios-button-secondary">キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {gradYear !== null && !tutorialFlags.calendar && (
        <TutorialModal
          steps={[{ title: 'カレンダーの使い方', body: '日付をタップすると\nその日の面接・アクションが表示されます\nフィルターで種別ごとに絞り込めます' }]}
          onComplete={() => markTutorialSeen('calendar')}
        />
      )}
    </div>
  );
}
