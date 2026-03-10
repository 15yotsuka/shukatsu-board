'use client';

import { useRef, useMemo, useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useShallow } from 'zustand/shallow';
import { useAppStore } from '@/store/useAppStore';
import { isAfter, isBefore, startOfDay, format, parseISO, isValid } from 'date-fns';
import type { Company, StatusColumn as StatusColumnType } from '@/lib/types';
import { TAG_CONFIG, ACTION_TYPE_LABELS, scheduleStageToAction } from '@/lib/types';
import { useDeadlines } from '@/contexts/DeadlineContext';
import { getStageColor, STAGE_COLORS } from '@/lib/stageColors';
import { formatDateUnified, formatTimeRange } from '@/lib/dateUtils';
import { DEFAULT_STATUS_NAMES } from '@/lib/defaults';
import { INDUSTRIES } from '@/lib/industries';
import { useToast } from '@/lib/useToast';

interface CompanyCardProps {
  company: Company;
  onTap: (company: Company) => void;
}

export function CompanyCard({ company, onTap }: CompanyCardProps) {
  const interviews = useAppStore((s) => s.interviews);
  const displaySettings = useAppStore(useShallow((s) => s.displaySettings));
  const statusColumns = useAppStore((s) => s.statusColumns);
  const moveCompany = useAppStore((s) => s.moveCompany);
  const toggleAwaitingResult = useAppStore((s) => s.toggleAwaitingResult);
  const allScheduledActions = useAppStore((s) => s.scheduledActions);
  const updateCompany = useAppStore((s) => s.updateCompany);
  const addScheduledAction = useAppStore((s) => s.addScheduledAction);
  const { deadlines } = useDeadlines();
  const showToast = useToast((s) => s.show);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: company.id, data: { type: 'company', company } });

  // ---- State ----
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);
  const [showNextStagePopup, setShowNextStagePopup] = useState(false);
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [showInlineDateInput, setShowInlineDateInput] = useState(false);
  const [inlineDeadlineValue, setInlineDeadlineValue] = useState('');
  const [nextStageDate, setNextStageDate] = useState('');
  const [nextStageStartTime, setNextStageStartTime] = useState('');
  const [nextStageEndTime, setNextStageEndTime] = useState('');

  // Quick edit state
  const [editName, setEditName] = useState(company.name);
  const [editStatusId, setEditStatusId] = useState(company.statusId);
  const [editDeadline, setEditDeadline] = useState(company.nextDeadline || '');
  const [editIndustry, setEditIndustry] = useState(company.industry || '');

  // ---- Refs for gesture detection ----
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const didMoveRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  // Touch swipe refs
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDirectionRef = useRef<'none' | 'horizontal' | 'vertical'>('none');
  const swipeOffsetRef = useRef(0); // ref to avoid stale closure in touchEnd

  // ---- Derived data ----
  const sortedStatuses = useMemo(() => {
    return [...statusColumns].sort((a, b) => a.order - b.order);
  }, [statusColumns]);

  const currentStatus = useMemo(() => {
    return statusColumns.find((s) => s.id === company.statusId);
  }, [statusColumns, company.statusId]);

  const statusName = currentStatus?.name || '';
  const stageColor = getStageColor(statusName);

  const nextStatus = useMemo((): StatusColumnType | null => {
    if (!currentStatus) return null;
    const next = sortedStatuses.find((s) => s.order === currentStatus.order + 1);
    return next || null;
  }, [currentStatus, sortedStatuses]);

  const isLastStage = !nextStatus || statusName === '見送り' || statusName === '内定';

  // Progress bar: 7 stages (エントリー前 through 最終面接)
  const PROGRESS_STAGES = DEFAULT_STATUS_NAMES.slice(0, 7); // excludes 内定, 見送り
  const currentStageIndex = PROGRESS_STAGES.indexOf(statusName);

  const miokuri = useMemo(() => {
    return sortedStatuses.find((s) => s.name === '見送り');
  }, [sortedStatuses]);

  const companyDeadline = useMemo(() => {
    const _today = startOfDay(new Date());
    return deadlines
      .filter((d) => {
        const date = parseISO(d.deadline);
        return isValid(date) && d.company_name === company.name && !isBefore(startOfDay(date), _today);
      })
      .sort((a, b) => a.deadline.localeCompare(b.deadline))[0] || null;
  }, [deadlines, company.name]);

  // Merged next event from ScheduledActions + Interviews (deduped)
  const nextEvent = useMemo(() => {
    const _today = startOfDay(new Date());
    const _todayStr = format(_today, 'yyyy-MM-dd');

    const fromActions = allScheduledActions
      .filter((a) => a.companyId === company.id && a.date >= _todayStr)
      .map((a) => ({
        date: a.date,
        startTime: a.startTime,
        endTime: a.endTime,
        label: a.subType ?? ACTION_TYPE_LABELS[a.type],
      }));

    const fromInterviews = interviews
      .filter((i) =>
        i.companyId === company.id &&
        (isAfter(new Date(i.datetime), _today) ||
          format(new Date(i.datetime), 'yyyy-MM-dd') === _todayStr)
      )
      .map((i) => {
        const dt = new Date(i.datetime);
        const t = format(dt, 'HH:mm');
        return {
          date: format(dt, 'yyyy-MM-dd'),
          startTime: t !== '00:00' ? t : undefined,
          endTime: undefined as string | undefined,
          label: i.type,
        };
      })
      .filter((iv) => !fromActions.some((a) => a.date === iv.date && a.label === iv.label));

    return [...fromActions, ...fromInterviews]
      .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
  }, [allScheduledActions, interviews, company.id]);

  const updatedDate = new Date(company.updatedAt).toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });

  // Format nextDeadline as M/D
  const deadlineDisplay = useMemo(() => {
    if (company.nextDeadline) {
      const parts = company.nextDeadline.split('-');
      if (parts[1] && parts[2]) return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
      return company.nextDeadline;
    }
    return null;
  }, [company.nextDeadline]);

  // CSV deadline display
  const csvDeadlineDisplay = useMemo(() => {
    if (!companyDeadline) return null;
    const p = companyDeadline.deadline.split('-');
    const mmdd = p[1] && p[2] ? `${parseInt(p[1])}/${parseInt(p[2])}` : companyDeadline.deadline;
    return { mmdd, type: companyDeadline.type };
  }, [companyDeadline]);

  // ---- Gesture handlers: Pointer (tap / long press) ----
  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Forward to dnd-kit so drag still works
    listeners?.onPointerDown?.(e);

    pointerStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    didMoveRef.current = false;
    longPressFiredRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      if (!didMoveRef.current) {
        longPressFiredRef.current = true;
        setEditName(company.name);
        setEditStatusId(company.statusId);
        setEditDeadline(company.nextDeadline || '');
        setEditIndustry(company.industry || '');
        setShowQuickEdit(true);
      }
    }, 500);
  }, [listeners, company.name, company.statusId, company.nextDeadline, company.industry]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerStartRef.current) {
      const dx = Math.abs(e.clientX - pointerStartRef.current.x);
      const dy = Math.abs(e.clientY - pointerStartRef.current.y);
      if (dx > 12 || dy > 12) { // increased from 6 to 12 (mobile finger wobble)
        didMoveRef.current = true;
        clearLongPress();
      }
    }
  }, [clearLongPress]);

  const handleClick = useCallback(() => {
    clearLongPress();
    if (!didMoveRef.current && !longPressFiredRef.current && swipeOffset === 0) {
      onTap(company);
    }
  }, [clearLongPress, onTap, company, swipeOffset]);

  // ---- Gesture handlers: Touch (swipe) ----
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchDirectionRef.current = 'none';
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    const absDx = Math.abs(dx);

    // Determine direction lock
    if (touchDirectionRef.current === 'none' && (absDx > 10 || dy > 10)) {
      touchDirectionRef.current = absDx > dy ? 'horizontal' : 'vertical';
    }

    if (touchDirectionRef.current === 'horizontal' && dx < 0) {
      // Left swipe only
      const newOffset = Math.min(Math.abs(dx), 200);
      swipeOffsetRef.current = newOffset;
      setSwipeOffset(newOffset);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Use ref (not state) to avoid stale closure - state update may not have flushed yet
    if (swipeOffsetRef.current > 100 && miokuri) {
      setShowDismissConfirm(true);
    }
    swipeOffsetRef.current = 0;
    setSwipeOffset(0);
    touchStartRef.current = null;
    touchDirectionRef.current = 'none';
  }, [miokuri]);

  // ---- Color strip tap ----
  const handleColorStripClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleAwaitingResult(company.id);
  }, [toggleAwaitingResult, company.id]);

  // ---- Next stage button ----
  const handleNextStageClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLastStage || !nextStatus) return;
    setNextStageDate('');
    setNextStageStartTime('');
    setNextStageEndTime('');
    setShowNextStagePopup(true);
  }, [isLastStage, nextStatus]);

  const advanceToNextStage = useCallback((withDate: boolean) => {
    if (!nextStatus) return;
    if (company.awaitingResult) {
      toggleAwaitingResult(company.id);
    }
    moveCompany(company.id, nextStatus.id, 0);
    if (withDate && nextStageDate) {
      const { type, subType } = scheduleStageToAction(nextStatus.name);
      addScheduledAction({
        companyId: company.id,
        type,
        subType,
        date: nextStageDate,
        startTime: nextStageStartTime || undefined,
        endTime: nextStageEndTime || undefined,
      });
    }
    showToast(`『${company.name}』を【${nextStatus.name}】に更新しました。`);
    setShowNextStagePopup(false);
  }, [nextStatus, company, nextStageDate, nextStageStartTime, nextStageEndTime, moveCompany, toggleAwaitingResult, addScheduledAction, showToast]);

  // ---- Dismiss to 見送り ----
  const handleDismissConfirm = useCallback(() => {
    if (!miokuri) return;
    moveCompany(company.id, miokuri.id, 0);
    showToast(`『${company.name}』を【見送り】に更新しました。`);
    setShowDismissConfirm(false);
  }, [miokuri, moveCompany, company, showToast]);

  // ---- Quick edit save ----
  const handleQuickEditSave = useCallback(() => {
    const updates: Partial<Omit<Company, 'id'>> = {};
    if (editName !== company.name) updates.name = editName;
    if (editDeadline !== (company.nextDeadline || '')) updates.nextDeadline = editDeadline || undefined;
    if (editIndustry !== (company.industry || '')) updates.industry = editIndustry || undefined;

    if (Object.keys(updates).length > 0) {
      updateCompany(company.id, updates);
    }

    if (editStatusId !== company.statusId) {
      moveCompany(company.id, editStatusId, 0);
    }

    showToast(`『${editName}』を更新しました。`);
    setShowQuickEdit(false);
  }, [editName, editStatusId, editDeadline, editIndustry, company, updateCompany, moveCompany, showToast]);

  // ---- Inline deadline save ----
  const handleInlineDeadlineSave = useCallback(() => {
    if (inlineDeadlineValue) {
      updateCompany(company.id, { nextDeadline: inlineDeadlineValue });
    }
    setShowInlineDateInput(false);
    setInlineDeadlineValue('');
  }, [inlineDeadlineValue, updateCompany, company.id]);

  // ---- Compute transform with swipe ----
  const baseTransform = CSS.Transform.toString(transform);
  const combinedStyle = {
    transform: swipeOffset > 0
      ? `${baseTransform || ''} translateX(-${swipeOffset}px)`
      : baseTransform || undefined,
    transition: swipeOffset > 0 ? 'none' : transition,
    touchAction: 'pan-y' as const, // allow vertical scroll, let JS handle horizontal swipe
    WebkitTouchCallout: 'none' as const,
  };

  return (
    <>
      {/* Main card */}
      <div
        ref={setNodeRef}
        style={combinedStyle}
        {...attributes}
        {...listeners}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        className={`relative bg-card rounded-xl shadow-sm overflow-hidden cursor-grab active:cursor-grabbing touch-manipulation select-none ${
          isDragging ? 'opacity-50 shadow-lg' : ''
        }`}
      >
        {/* Swipe background (visible when swiping left) */}
        {swipeOffset > 0 && (
          <div className="absolute inset-0 flex items-center justify-end pr-4 bg-red-500 text-white font-semibold rounded-xl z-0">
            見送り
          </div>
        )}

        {/* Color strip */}
        <button
          onClick={handleColorStripClick}
          className="absolute left-0 top-0 bottom-0 z-10 rounded-l-xl transition-opacity flex items-center justify-start"
          style={{
            backgroundColor: stageColor,
            opacity: company.awaitingResult ? 0.4 : 1,
            width: '44px',
            WebkitTapHighlightColor: 'transparent',
          }}
          aria-label="結果待ち切り替え"
        />

        {/* Card content */}
        <div className="pl-14 pr-3.5 py-3">
          {/* Row 1: Name + tag */}
          <div className="flex items-start justify-between gap-1.5 mb-0.5">
            <p className="text-[15px] font-semibold text-[var(--color-text)] truncate flex-1">
              {company.name}
            </p>
            {displaySettings.showTag && company.tags && company.tags.length > 0 && TAG_CONFIG[company.tags[0]] && (
              <span className={`flex-none text-[11px] font-bold px-2 py-0.5 rounded-full ${TAG_CONFIG[company.tags[0]].className}`}>
                {TAG_CONFIG[company.tags[0]].label}
              </span>
            )}
          </div>

          {/* Status label: 選考中 or 結果待ち */}
          {company.awaitingResult ? (
            <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded">
              結果待ち
            </span>
          ) : !['エントリー前', '内定', '見送り'].includes(statusName) && (
            <span className="text-xs text-blue-500 dark:text-blue-400 font-medium">
              選考中
            </span>
          )}

          {/* Progress bar */}
          {displaySettings.showProgressBar && statusName !== '見送り' && (
            <div className="flex items-center gap-1 mt-1">
              {PROGRESS_STAGES.map((stage, i) => {
                const isNaitei = statusName === '内定';
                const isFilled = isNaitei || (currentStageIndex >= 0 && i <= currentStageIndex);
                const dotColor = isNaitei ? '#22C55E' : STAGE_COLORS[stage] || '#9CA3AF';
                return (
                  <span
                    key={stage}
                    className={`w-2 h-2 rounded-full ${!isFilled ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
                    style={isFilled ? { backgroundColor: dotColor } : undefined}
                  />
                );
              })}
            </div>
          )}

          {/* Industry */}
          {displaySettings.showIndustry && company.industry && (
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-1 truncate">
              {company.industry}
            </p>
          )}

          {/* Next event (merged: ScheduledAction + Interview) */}
          {displaySettings.showNextInterview && nextEvent && (
            <div className="flex items-center gap-1 mt-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[12px] text-gray-500 dark:text-gray-400">
                {[
                  formatDateUnified(nextEvent.date),
                  formatTimeRange(nextEvent.startTime, nextEvent.endTime),
                  nextEvent.label,
                ].filter(Boolean).join(' ')}
              </span>
            </div>
          )}

          {/* Updated date */}
          {displaySettings.showUpdatedDate && (
            <p className="text-[12px] text-[var(--color-text-secondary)] mt-1">{updatedDate}</p>
          )}

          {/* Deadline display */}
          {displaySettings.showDeadlineBadge && (
            <div className="mt-1.5">
              {/* Company's own nextDeadline */}
              {deadlineDisplay && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {deadlineDisplay} 締切
                </div>
              )}
              {/* CSV deadline (only show if different from nextDeadline) */}
              {csvDeadlineDisplay && !deadlineDisplay && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {csvDeadlineDisplay.mmdd} {csvDeadlineDisplay.type}
                </div>
              )}
              {/* No deadline at all: show add link */}
              {!deadlineDisplay && !csvDeadlineDisplay && !showInlineDateInput && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInlineDateInput(true);
                    setInlineDeadlineValue('');
                  }}
                  className="text-xs text-blue-500 dark:text-blue-400 hover:underline"
                >
                  ＋ 締切日を追加
                </button>
              )}
              {/* Inline date input */}
              {showInlineDateInput && (
                <div
                  className="flex items-center gap-1.5 mt-1"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <input
                    type="date"
                    value={inlineDeadlineValue}
                    onChange={(e) => setInlineDeadlineValue(e.target.value)}
                    className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 text-[var(--color-text)]"
                  />
                  <button
                    onClick={handleInlineDeadlineSave}
                    className="text-xs px-2 py-1 rounded-lg bg-[var(--color-primary)] text-white font-semibold min-h-[28px]"
                  >
                    保存
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInlineDateInput(false);
                    }}
                    className="text-xs text-[var(--color-text-secondary)] min-h-[28px]"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Next stage button */}
          {!isLastStage && nextStatus && (
            <div className="flex justify-end mt-2">
              <button
                onClick={handleNextStageClick}
                className="text-[12px] font-semibold text-[var(--color-primary)] min-h-[44px] px-2 flex items-center"
              >
                次の段階へ →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---- Dismiss confirmation overlay ---- */}
      {showDismissConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowDismissConfirm(false)}
        >
          <div
            className="bg-card rounded-2xl p-6 mx-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[16px] font-semibold text-[var(--color-text)] text-center mb-4">
              見送りにしますか？
            </p>
            <p className="text-[14px] text-[var(--color-text-secondary)] text-center mb-6">
              「{company.name}」を見送りに移動します。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDismissConfirm(false)}
                className="flex-1 py-3 rounded-xl text-[15px] font-semibold bg-[var(--color-border)] text-[var(--color-text)] min-h-[44px]"
              >
                キャンセル
              </button>
              <button
                onClick={handleDismissConfirm}
                className="flex-1 py-3 rounded-xl text-[15px] font-semibold bg-red-500 text-white min-h-[44px]"
              >
                見送り
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Next stage date-time popup ---- */}
      {showNextStagePopup && nextStatus && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onPointerDown={() => setShowNextStagePopup(false)}
        >
          <div
            className="bg-card rounded-2xl p-6 mx-6 max-w-sm w-full shadow-xl"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[16px] font-semibold text-[var(--color-text)] text-center mb-2">
              {nextStatus.name}
            </p>
            <p className="text-[13px] text-[var(--color-text-secondary)] text-center mb-4">
              次の選考の日程を設定してください
            </p>
            <div className="space-y-2 mb-4">
              <input
                type="date"
                value={nextStageDate}
                onChange={(e) => setNextStageDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 text-[var(--color-text)] text-[15px]"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[12px] text-[var(--color-text-secondary)] mb-1">開始</label>
                  <input
                    type="time"
                    step={300}
                    value={nextStageStartTime}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNextStageStartTime(v);
                      if (v && !nextStageEndTime) {
                        const [h, m] = v.split(':').map(Number);
                        setNextStageEndTime(`${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 text-[var(--color-text)] text-[14px]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[12px] text-[var(--color-text-secondary)] mb-1">終了</label>
                  <input
                    type="time"
                    step={300}
                    value={nextStageEndTime}
                    onChange={(e) => setNextStageEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 text-[var(--color-text)] text-[14px]"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => advanceToNextStage(false)}
                className="flex-1 py-3 rounded-xl text-[15px] font-semibold bg-[var(--color-border)] text-[var(--color-text)] min-h-[44px]"
              >
                スキップ
              </button>
              <button
                onClick={() => advanceToNextStage(true)}
                disabled={!nextStageDate}
                className="flex-1 py-3 rounded-xl text-[15px] font-semibold bg-[var(--color-primary)] text-white min-h-[44px] disabled:opacity-40"
              >
                設定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Quick edit modal ---- */}
      {showQuickEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onPointerDown={() => setShowQuickEdit(false)}
        >
          <div
            className="bg-card rounded-2xl p-6 mx-6 max-w-sm w-full shadow-xl space-y-4"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[16px] font-semibold text-[var(--color-text)] text-center">
              クイック編集
            </p>

            {/* 企業名 */}
            <div>
              <label className="text-[13px] text-[var(--color-text-secondary)] mb-1 block">企業名</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 text-[var(--color-text)] text-[15px]"
              />
            </div>

            {/* 選考段階 */}
            <div>
              <label className="text-[13px] text-[var(--color-text-secondary)] mb-1 block">選考段階</label>
              <select
                value={editStatusId}
                onChange={(e) => setEditStatusId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 text-[var(--color-text)] text-[15px]"
              >
                {sortedStatuses.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* 締切日 */}
            <div>
              <label className="text-[13px] text-[var(--color-text-secondary)] mb-1 block">締切日</label>
              <input
                type="date"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 text-[var(--color-text)] text-[15px]"
              />
            </div>

            {/* 業界 */}
            <div>
              <label className="text-[13px] text-[var(--color-text-secondary)] mb-1 block">業界</label>
              <select
                value={editIndustry}
                onChange={(e) => setEditIndustry(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 text-[var(--color-text)] text-[15px]"
              >
                <option value="">未設定</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            {/* 保存 */}
            <button
              onClick={handleQuickEditSave}
              className="w-full py-3 rounded-xl text-[15px] font-semibold bg-[var(--color-primary)] text-white min-h-[44px]"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </>
  );
}
