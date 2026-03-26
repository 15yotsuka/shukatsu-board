'use client';

import React, { useState, useMemo, useRef, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import type { DisplaySettings } from '@/store/useAppStore';
import { useShallow } from 'zustand/shallow';
import { AddCompanyForm } from '@/components/board/AddCompanyForm';
import { BulkImportModal } from '@/components/board/BulkImportModal';
import { CompanyDetailModal } from '@/components/board/CompanyDetailModal';
import { ErrorBoundary } from '@/components/board/ErrorBoundary';
import { TutorialModal } from '@/components/onboarding/TutorialModal';
import { createSampleCompanies, SAMPLE_SCHEDULED_ACTIONS } from '@/lib/sampleData';
import type { Company, Interview } from '@/lib/types';
import { ACTION_TYPE_LABELS, scheduleStageToAction, TAG_CONFIG, type Tag } from '@/lib/types';
import { getMilestones, getMilestoneIndex } from '@/lib/progressMilestones';
import { useTasksUI } from '@/store/useTasksUI';
import { useToast } from '@/lib/useToast';
import { format, parseISO, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TimeSelect } from '@/components/ui/TimeSelect';
import { DatePicker } from '@/components/ui/DatePicker';

type SortField = 'deadline' | 'status' | 'industry' | 'manual';
type SortOrder = 'asc' | 'desc';

const FILTER_GROUPS: Record<string, string[]> = {
  'active': ['ES', 'Webテスト', '1次面接', '2次面接', '3次面接', '最終面接'],
  'entry_before': ['エントリー前'],
  'es': ['ES'],
  'webtest': ['Webテスト'],
  'interview': ['1次面接', '2次面接', '3次面接', '最終面接'],
  'offer': ['内定'],
  'rejected': ['見送り'],
};

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'active', label: '進行中' },
  { value: 'awaiting', label: '結果待ち' },
  { value: 'entry_before', label: 'エントリー前' },
  { value: 'es', label: 'ES' },
  { value: 'webtest', label: 'Webテスト' },
  { value: 'interview', label: '面接中' },
  { value: 'offer', label: '内定' },
  { value: 'rejected', label: '見送り' },
];

const getBadgeStyle = (statusName: string): string => {
  if (statusName.includes('面接')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
  if (statusName.includes('内定')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (statusName.includes('インターン')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  if (statusName.includes('ES') || statusName.includes('書類')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  if (statusName.includes('通過')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
  return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';
};

const getNextStepLabel = (company: Company): string | null => {
  if (!company.nextActionDate) return null;
  const date = parseISO(company.nextActionDate);
  if (!isValid(date)) return null;
  const dateStr = format(date, 'M/d(E)', { locale: ja });
  const timeStr = company.nextActionTime ? ` ${company.nextActionTime}` : '';
  const actionLabel = company.nextActionType ? ACTION_TYPE_LABELS[company.nextActionType] : null;
  return actionLabel ? `${dateStr}${timeStr} ${actionLabel}` : `${dateStr}${timeStr}`;
};

interface TaskCardProps {
  company: Company;
  statusName: string;
  stageColor: string;
  isDraggable: boolean;
  hasDeadlineNow: boolean;
  milestones: string[];
  milestoneIdx: number;
  interviews: Interview[];
  displaySettings: DisplaySettings;
  onOpenDetail: () => void;
  onAdvance: (e: React.MouseEvent) => void;
  onToggleAwaitingResult: () => void;
  onLongPress: () => void;
  onSwipeLeft: () => void;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}

function TaskCard({
  company,
  statusName,
  stageColor,
  isDraggable,
  hasDeadlineNow,
  milestones,
  milestoneIdx,
  interviews,
  displaySettings,
  onOpenDetail,
  onAdvance,
  onToggleAwaitingResult,
  onLongPress,
  onSwipeLeft,
  isSelectMode,
  isSelected,
  onToggleSelect,
}: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: company.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const nextStepLabel = getNextStepLabel(company);

  // Long press
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const hapticFired = useRef(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isFlyingOut, setIsFlyingOut] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    swipeStartX.current = touch.clientX;
    touchStartTime.current = Date.now();
    hapticFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(30);
      }
      onLongPress();
    }, 500);
  }, [onLongPress]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touchStartPos.current) {
      const dx = touch.clientX - touchStartPos.current.x;
      const dy = touch.clientY - touchStartPos.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
      if (dx < -20 && Math.abs(dy) < 30) {
        const offset = Math.max(dx, -100);
        setSwipeOffset(offset);
        // 閾値越えハプティクス
        if (offset < -70 && !hapticFired.current) {
          hapticFired.current = true;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
          }
        }
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    const elapsed = Date.now() - touchStartTime.current;
    const velocityX = elapsed > 0 ? Math.abs(swipeOffset) / elapsed * 1000 : 0;
    const shouldTrigger = swipeOffset < -70 || (swipeOffset < -30 && velocityX > 500);
    if (shouldTrigger) {
      // カードを画面外へ飛ばしてから状態更新
      setIsFlyingOut(true);
      setSwipeOffset(-window.innerWidth);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
      setTimeout(() => {
        onSwipeLeft();
        setSwipeOffset(0);
        setIsFlyingOut(false);
      }, 320);
    } else {
      setSwipeOffset(0);
    }
    touchStartPos.current = null;
    swipeStartX.current = null;
    hapticFired.current = false;
  }, [swipeOffset, onSwipeLeft]);

  const upcomingInterview = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return (
      interviews
        .filter((i) => i.companyId === company.id && i.datetime.substring(0, 10) >= today)
        .sort((a, b) => a.datetime.localeCompare(b.datetime))[0] ?? null
    );
  }, [interviews, company.id]);

  return (
    <div className="relative overflow-hidden rounded-2xl no-select">
      {/* Swipe left background — always rendered, opacity tied to swipe distance */}
      <div
        className="absolute inset-0 flex items-center justify-end pr-6 bg-red-500 rounded-2xl"
        style={{ opacity: Math.min(1, Math.max(0, (Math.abs(swipeOffset) - 20) / 60)) }}
      >
        <div className="flex flex-col items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-white text-[11px] font-bold">見送り</span>
        </div>
      </div>
    <div
      ref={setNodeRef}
      style={{
        ...style,
        transform: `${CSS.Transform.toString(transform) ?? ''} translateX(${isSelectMode ? 0 : swipeOffset}px)`,
        transition: isFlyingOut
          ? 'transform 0.3s ease-out'
          : swipeOffset === 0
          ? 'transform 0.35s cubic-bezier(0.34, 1.3, 0.64, 1)'
          : 'none',
        touchAction: 'pan-y',
        willChange: 'transform',
      }}
      onClick={isSelectMode ? onToggleSelect : onOpenDetail}
      onTouchStart={isSelectMode ? undefined : handleTouchStart}
      onTouchMove={isSelectMode ? undefined : handleTouchMove}
      onTouchEnd={isSelectMode ? undefined : handleTouchEnd}
      className="relative bg-card dark:bg-zinc-900 rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden cursor-pointer active:scale-[0.98]"
    >
      {/* 選択モード: チェックボックスオーバーレイ */}
      {isSelectMode && (
        <div className="absolute left-0 top-0 bottom-0 w-6 z-10 flex items-center justify-center rounded-l-2xl bg-black/10 dark:bg-black/20">
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
              : 'border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-zinc-800/80'
          }`}>
            {isSelected && (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}
      {/* Left color strip (stage color) - tappable to toggle awaitingResult */}
      <button
        onClick={(e) => { e.stopPropagation(); if (!isSelectMode) onToggleAwaitingResult(); }}
        onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); if (!isSelectMode) onToggleAwaitingResult(); }}
        className="absolute left-0 top-0 bottom-0 w-6 rounded-l-2xl transition-opacity"
        style={{
          backgroundColor: stageColor,
          opacity: company.awaitingResult ? 0.4 : 1,
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
        aria-label="結果待ち切り替え"
      />
      <div className="pl-8 pr-4 py-3 flex flex-col gap-1.5">
        {/* Row 1: drag handle + name + status badge + advance button */}
        <div className="flex items-center gap-2">
          {isDraggable && (
            <button
              className="w-5 flex-none flex items-center justify-center text-zinc-400 cursor-grab active:cursor-grabbing touch-none select-none"
              onClick={(e) => e.stopPropagation()}
              {...(listeners ?? {})}
              {...attributes}
              aria-label="ドラッグして並び替え"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
              </svg>
            </button>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-[var(--color-text)] truncate">{company.name}</p>
            {displaySettings.showIndustry && company.industry && (
              <p className="text-[11px] text-zinc-400 truncate">{company.industry}</p>
            )}
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap flex-none ${getBadgeStyle(statusName)}`}>
            {statusName}
          </span>
          {company.awaitingResult && (
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 whitespace-nowrap flex-none">
              結果待ち
            </span>
          )}
          <button
            onClick={onAdvance}
            className="flex-none text-[12px] px-2 py-1 rounded-lg bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-medium whitespace-nowrap ios-tap"
          >
            次の段階へ →
          </button>
        </div>

        {/* Row 2: dot progress bar (blue=本選考, green=インターン) */}
        {displaySettings.showProgressBar && <div className="flex items-center gap-1">
          {milestones.map((_, i) => {
            const isIntern = company.selectionType === 'intern';
            const filled = isIntern ? 'bg-emerald-500' : 'bg-blue-500';
            const ping = isIntern ? 'bg-emerald-400' : 'bg-blue-400';
            return i === milestoneIdx ? (
              <span key={i} className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${ping} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${filled}`} />
              </span>
            ) : (
              <span
                key={i}
                className={`rounded-full h-2 w-2 ${
                  i < milestoneIdx ? filled : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
              />
            );
          })}
        </div>}

        {/* Tags (excluding 結果待ち which is shown in Row 1) */}
        {displaySettings.showTag && company.tags && company.tags.filter((t) => t !== '結果待ち').length > 0 && (
          <div className="flex flex-wrap gap-1">
            {company.tags.filter((t) => t !== '結果待ち').map((tag) => TAG_CONFIG[tag] && (
              <span key={tag} className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${TAG_CONFIG[tag].className}`}>
                {TAG_CONFIG[tag].label}
              </span>
            ))}
          </div>
        )}

        {/* Row 3: next action — upcomingInterview優先、なければnextStepLabel */}
        {(nextStepLabel || upcomingInterview) && (
          <div className="flex items-center gap-3 flex-wrap text-[12px]">
            {displaySettings.showNextInterview && upcomingInterview ? (() => {
              const dt = new Date(upcomingInterview.datetime);
              const dateStr = format(dt, 'M/d(E)', { locale: ja });
              const startTime = format(dt, 'HH:mm');
              const endStr = upcomingInterview.endTime ? `~${upcomingInterview.endTime}` : '';
              return (
                <span className="flex items-center gap-1 text-blue-500">
                  {dateStr} {startTime}{endStr} {upcomingInterview.type}
                </span>
              );
            })() : nextStepLabel ? (
              <span className={`flex items-center gap-1 ${hasDeadlineNow ? 'text-[var(--color-danger)]' : 'text-zinc-400'}`}>
                {nextStepLabel}
              </span>
            ) : null}
          </div>
        )}

      </div>
    </div>
    </div>
  );
}

const SORT_BUTTONS: { field: SortField; label: string }[] = [
  { field: 'deadline', label: '締切日' },
  { field: 'status', label: '選考段階' },
  { field: 'manual', label: '手動' },
];

function TasksContent() {
  const companies = useAppStore((s) => s.companies);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const interviews = useAppStore((s) => s.interviews);
  const addCompany = useAppStore((s) => s.addCompany);
  const updateCompany = useAppStore((s) => s.updateCompany);
  const addScheduledAction = useAppStore((s) => s.addScheduledAction);
  const deleteScheduledAction = useAppStore((s) => s.deleteScheduledAction);
  const scheduledActions = useAppStore((s) => s.scheduledActions);
  const reorderCompanies = useAppStore((s) => s.reorderCompanies);
  const deleteAllCompanies = useAppStore((s) => s.deleteAllCompanies);
  const displaySettings = useAppStore(useShallow((s) => s.displaySettings));
  const tutorialFlags = useAppStore((s) => s.tutorialFlags);
  const markTutorialSeen = useAppStore((s) => s.markTutorialSeen);
  const gradYear = useAppStore((s) => s.gradYear);
  const [showAddForm, setShowAddForm] = useState(false);
  const { isSelectMode, selectedIds, toggleSelect, exitSelectMode, showBulkAdd, closeBulkAdd } = useTasksUI();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) ?? null;
  const [promoteToMainTarget, setPromoteToMainTarget] = useState<Company | null>(null);
  const [nextStageTarget, setNextStageTarget] = useState<{ company: Company; nextName: string; nextColumnId: string } | null>(null);
  const [nextStageDate, setNextStageDate] = useState('');
  const [nextStageStartTime, setNextStageStartTime] = useState('');
  const [nextStageEndTime, setNextStageEndTime] = useState('');
  const [sortField, setSortField] = useState<SortField>('deadline');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [quickEditCompany, setQuickEditCompany] = useState<Company | null>(null);
  const [quickEditStep, setQuickEditStep] = useState<'status' | 'datetime'>('status');
  const [quickEditColId, setQuickEditColId] = useState<string>('');
  const [quickEditDate, setQuickEditDate] = useState('');
  const [quickEditStartTime, setQuickEditStartTime] = useState('');
  const [quickEditEndTime, setQuickEditEndTime] = useState('');
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const showToast = useToast((s) => s.show);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const today = format(new Date(), 'yyyy-MM-dd');

  const getStatusName = (statusId: string) =>
    statusColumns.find((s) => s.id === statusId)?.name ?? '';

  const getStatusColor = (statusId: string) =>
    statusColumns.find((s) => s.id === statusId)?.color ?? '#9CA3AF';

  const trackStatuses = useMemo(() => [...statusColumns].sort((a, b) => a.order - b.order), [statusColumns]);

  const handleSeed = () => {
    const samples = createSampleCompanies(statusColumns);
    samples.forEach((c) => addCompany(c));
    // Link ScheduledActions to freshly added companies
    const freshCompanies = useAppStore.getState().companies;
    SAMPLE_SCHEDULED_ACTIONS.forEach((sa) => {
      const target = freshCompanies.find((c) => c.name === sa.companyName);
      if (!target) return;
      addScheduledAction({
        companyId: target.id,
        type: sa.type,
        subType: sa.subType,
        date: sa.date,
        startTime: sa.startTime,
        endTime: sa.endTime,
      });
    });
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleAdvanceStatus = (e: React.MouseEvent, company: Company) => {
    e.stopPropagation();
    const milestones = getMilestones(company);
    const currentStatus = statusColumns.find((col) => col.id === company.statusId);
    if (currentStatus?.name === '内定' || currentStatus?.name === '見送り') return;
    const currentIdx = milestones.findIndex((m) => currentStatus?.name?.includes(m));
    if (currentIdx === -1) return;
    if (company.selectionType === 'intern' && currentIdx >= milestones.length - 1) {
      setPromoteToMainTarget(company);
      return;
    }
    const nextMilestoneName = milestones[currentIdx + 1];
    if (!nextMilestoneName) return;
    const nextColumn = statusColumns.find((col) => col.name === nextMilestoneName);
    if (!nextColumn) return;
    setNextStageDate('');
    setNextStageStartTime('');
    setNextStageEndTime('');
    setNextStageTarget({ company, nextName: nextMilestoneName, nextColumnId: nextColumn.id });
  };

  const advanceToNextStage = (withDate: boolean) => {
    if (!nextStageTarget) return;
    const { company, nextName, nextColumnId } = nextStageTarget;
    const awaitingClear = company.awaitingResult
      ? { awaitingResult: false, tags: (company.tags ?? []).filter((t) => t !== '結果待ち') }
      : {};
    // 現在の選考段階のScheduledActionを削除
    const currentStatus = statusColumns.find((s) => s.id === company.statusId);
    if (currentStatus) {
      const { type: currentType, subType: currentSubType } = scheduleStageToAction(currentStatus.name);
      scheduledActions
        .filter((a) => a.companyId === company.id && a.type === currentType && a.subType === currentSubType)
        .forEach((a) => deleteScheduledAction(a.id));
    }
    if (withDate && nextStageDate) {
      // 日時あり: statusId + awaitingResultクリアを1回の呼び出しでまとめる
      updateCompany(company.id, { statusId: nextColumnId, ...awaitingClear });
      const { type, subType } = scheduleStageToAction(nextName);
      addScheduledAction({
        companyId: company.id,
        type,
        subType,
        date: nextStageDate,
        startTime: nextStageStartTime || undefined,
        endTime: nextStageEndTime || undefined,
      });
    } else {
      // スキップ: nextActionDate等を明示的にクリアし、awaitingResultも同時にクリア
      updateCompany(company.id, {
        statusId: nextColumnId,
        nextActionDate: undefined,
        nextActionType: undefined,
        nextActionTime: undefined,
        nextDeadline: undefined,
        ...awaitingClear,
      });
    }
    showToast(`『${company.name}』を【${nextName}】に更新しました。`);
    setNextStageTarget(null);
  };

  const handleBulkDelete = () => {
    if (!window.confirm(`全企業（${companies.length}社）を削除しますか？\nこの操作は取り消せません。`)) return;
    deleteAllCompanies();
  };

  const sortedAll = useMemo(() => {
    const cols = [...statusColumns].sort((a, b) => a.order - b.order);
    if (sortField === 'manual') return companies;
    return [...companies].sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortField === 'deadline') {
        if (!a.nextActionDate && !b.nextActionDate) return 0;
        if (!a.nextActionDate) return dir;
        if (!b.nextActionDate) return -dir;
        return a.nextActionDate.localeCompare(b.nextActionDate) * dir;
      }
      if (sortField === 'status') {
        const aIdx = cols.findIndex((c) => c.id === a.statusId);
        const bIdx = cols.findIndex((c) => c.id === b.statusId);
        return (aIdx - bIdx) * dir;
      }
      if (sortField === 'industry') {
        const aInd = a.industry ?? '';
        const bInd = b.industry ?? '';
        if (!aInd && !bInd) return 0;
        if (!aInd) return dir;
        if (!bInd) return -dir;
        return aInd.localeCompare(bInd, 'ja') * dir;
      }
      return 0;
    });
  }, [companies, sortField, sortOrder, statusColumns]);

  const industries = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => { if (c.industry) set.add(c.industry); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ja'));
  }, [companies]);

  const filtered = useMemo(() => {
    let list = sortedAll;
    if (activeFilters.size > 0) {
      list = list.filter((c) => {
        return [...activeFilters].some((f) => {
          if (f === 'awaiting') return c.awaitingResult === true;
          const name = getStatusName(c.statusId);
          if (FILTER_GROUPS[f]) return FILTER_GROUPS[f].includes(name);
          return name === f || name.includes(f);
        });
      });
    }
    if (selectedIndustry !== 'all') {
      list = list.filter((c) => (c.industry ?? '') === selectedIndustry);
    }
    return list;
  }, [sortedAll, activeFilters, selectedIndustry]);

  const active = filtered.filter((c) => getStatusName(c.statusId) !== '見送り');
  const archived = filtered.filter((c) => getStatusName(c.statusId) === '見送り');

  const handleDragEnd = (event: DragEndEvent) => {
    if (sortField !== 'manual') return;
    if (activeFilters.size > 0 || selectedIndustry !== 'all') return;
    const { active: dragActive, over } = event;
    if (!over || dragActive.id === over.id) return;
    const activeIdx = active.findIndex((c) => c.id === String(dragActive.id));
    const overIdx = active.findIndex((c) => c.id === String(over.id));
    if (activeIdx === -1 || overIdx === -1) return;
    const reordered = arrayMove(active, activeIdx, overIdx);
    reorderCompanies(reordered.map((c) => c.id));
  };

  return (
    <div className="pb-24 px-4 pt-4">


      {/* Filter chips + sort button */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar flex-1">
            {(() => {
              const esColor = statusColumns.find((c) => c.name === 'ES')?.color ?? '#8B5CF6';
              const webColor = statusColumns.find((c) => c.name === 'Webテスト')?.color ?? '#3B82F6';
              const interviewColor = statusColumns.find((c) => c.name.includes('面接'))?.color ?? '#F97316';
              const offerColor = statusColumns.find((c) => c.name === '内定')?.color ?? '#22C55E';
              const rejectedColor = statusColumns.find((c) => c.name === '見送り')?.color ?? '#6B7280';
              const entryColor = statusColumns.find((c) => c.name === 'エントリー前')?.color ?? '#9CA3AF';
              const colorMap: Record<string, string | null> = {
                '': null, active: null, awaiting: null,
                entry_before: entryColor, es: esColor, webtest: webColor,
                interview: interviewColor, offer: offerColor, rejected: rejectedColor,
              };
              return FILTER_OPTIONS.map(({ value, label }) => {
                const color = colorMap[value] ?? null;
                const isActive = value === '' ? activeFilters.size === 0 : activeFilters.has(value);
                return (
                  <button
                    key={value}
                    onClick={() => {
                      if (value === '') {
                        setActiveFilters(new Set());
                      } else {
                        setActiveFilters((prev) => {
                          const next = new Set(prev);
                          if (next.has(value)) next.delete(value);
                          else next.add(value);
                          return next;
                        });
                      }
                    }}
                    className="flex-none px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap ios-tap transition-colors"
                    style={
                      isActive
                        ? { backgroundColor: color ?? 'var(--color-primary)', color: 'white' }
                        : color
                        ? { backgroundColor: `${color}20`, color }
                        : { backgroundColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }
                    }
                  >
                    {label}
                  </button>
                );
              });
            })()}
          </div>
          <button
            onClick={() => setShowSortSheet(true)}
            className="flex-none flex items-center gap-1 px-3 py-1.5 bg-[var(--color-border)] rounded-full text-[13px] font-semibold text-[var(--color-text-secondary)] ios-tap whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M6 12h12M9 17h6" />
            </svg>
            {sortField === 'deadline' ? `締切${sortOrder === 'asc' ? '↑' : '↓'}` :
             sortField === 'status' ? `段階${sortOrder === 'asc' ? '↑' : '↓'}` :
             sortField === 'industry' ? `業界${sortOrder === 'asc' ? '↑' : '↓'}` : '手動'}
          </button>
        </div>
      </div>

      {active.length === 0 && archived.length === 0 && activeFilters.size === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--color-border)] flex items-center justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-[16px] font-semibold text-[var(--color-text)] mb-1">企業が登録されていません</p>
          <p className="text-[13px] text-[var(--color-text-secondary)]">右下の＋ボタンから追加してください</p>
          <button
            onClick={handleSeed}
            className="mt-4 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-semibold ios-tap"
          >
            サンプルを追加
          </button>
        </div>
      ) : active.length === 0 && archived.length === 0 && activeFilters.size > 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--color-border)] flex items-center justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
          </div>
          <p className="text-center text-[var(--color-text-secondary)]">該当する企業はありません</p>
        </div>
      ) : (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={active.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {active.map((c) => {
                  const statusName = getStatusName(c.statusId);
                  const ms = getMilestones(c);
                  const msIdx = getMilestoneIndex(statusName, ms);
                  const hasDeadlineNow = !!(c.nextActionDate && c.nextActionDate <= today);

                  return (
                    <TaskCard
                      key={c.id}
                      company={c}
                      statusName={statusName}
                      stageColor={getStatusColor(c.statusId)}
                      isDraggable={sortField === 'manual'}
                      hasDeadlineNow={hasDeadlineNow}
                      milestones={ms}
                      milestoneIdx={msIdx}
                      interviews={interviews}
                      displaySettings={displaySettings}
                      onOpenDetail={() => setSelectedCompanyId(c.id)}
                      onAdvance={(e) => handleAdvanceStatus(e, c)}
                      onToggleAwaitingResult={() => {
                        const willBeAwaiting = !c.awaitingResult;
                        const base = (c.tags ?? []).filter((t) => t !== '結果待ち');
                        updateCompany(c.id, {
                          awaitingResult: willBeAwaiting,
                          tags: willBeAwaiting ? [...base, '結果待ち'] : base,
                        });
                      }}
                      onLongPress={() => {
                        setQuickEditCompany(c);
                        setQuickEditStep('status');
                        setQuickEditColId('');
                        setQuickEditDate('');
                        setQuickEditStartTime('');
                        setQuickEditEndTime('');
                      }}
                      onSwipeLeft={() => {
                        const misuCol = statusColumns.find((s) => s.name === '見送り');
                        if (misuCol) {
                          updateCompany(c.id, {
                            statusId: misuCol.id,
                            ...(c.awaitingResult ? {
                              awaitingResult: false,
                              tags: (c.tags ?? []).filter((t) => t !== '結果待ち'),
                            } : {}),
                          });
                          showToast(`『${c.name}』を見送りに移動しました`);
                        }
                      }}
                      isSelectMode={isSelectMode}
                      isSelected={selectedIds.includes(c.id)}
                      onToggleSelect={() => toggleSelect(c.id)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

          {archived.length > 0 && (
            <div className="mt-6">
              <p className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide px-1 mb-2">
                アーカイブ（見送り {archived.length}件）
              </p>
              <div className="space-y-2 opacity-60">
                {archived.map((c) => {
                  const statusName = getStatusName(c.statusId);
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCompanyId(c.id)}
                      className="bg-card dark:bg-zinc-900 rounded-2xl px-5 py-3 shadow-sm border border-[var(--color-border)] flex items-center gap-3 cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[var(--color-text)] truncate">{c.name}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap flex-none ${getBadgeStyle(statusName)}`}>
                        {statusName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ソートシート */}
      {showSortSheet && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center modal-safe" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowSortSheet(false)} />
          <div className="relative bg-card rounded-2xl w-full max-w-lg px-5 pt-5 space-y-2" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
            <div className="flex justify-center pb-1">
              <div className="w-9 h-1 bg-[var(--color-border)] rounded-full" />
            </div>
            <h3 className="text-[15px] font-bold text-center text-[var(--color-text)] pb-1">並べ替え</h3>
            {SORT_BUTTONS.map(({ field, label }) => (
              <button
                key={field}
                onClick={() => { handleSort(field); setShowSortSheet(false); }}
                className={`w-full py-3 rounded-xl text-[15px] font-medium ios-tap flex items-center justify-center gap-1 ${
                  sortField === field
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'bg-[var(--color-bg)] text-[var(--color-text)]'
                }`}
              >
                {label}
                {sortField === field && field !== 'manual' && (
                  <span className="text-[13px]">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            ))}
            <button
              onClick={() => setShowSortSheet(false)}
              className="w-full py-3 rounded-xl text-[15px] font-medium ios-tap bg-[var(--color-bg)] text-[var(--color-text-secondary)]"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setShowAddForm(true)}
        className="fixed right-5 z-40 w-14 h-14 bg-[var(--color-primary)] text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center ios-tap transition-all duration-150 active:scale-95 hover:brightness-95"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
        aria-label="企業を追加"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <AnimatePresence>
        {showAddForm && <AddCompanyForm onClose={() => setShowAddForm(false)} />}
      </AnimatePresence>

      {showBulkAdd && <BulkImportModal statusColumns={trackStatuses} onClose={closeBulkAdd} />}

      {/* インターン→本選考 昇格ダイアログ */}
      <AnimatePresence>
        {promoteToMainTarget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center modal-safe">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setPromoteToMainTarget(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-card rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl">
              <h3 className="text-[17px] font-bold text-[var(--color-text)] mb-2">🎉 本選考に進みますか？</h3>
              <p className="text-[14px] text-[var(--color-text-secondary)] mb-1 font-semibold">{promoteToMainTarget.name}</p>
              <p className="text-[13px] text-[var(--color-text-secondary)] mb-4">選考タイプを「本選考」に切り替え、「インターン参加済み」タグを追加します。</p>
              <div className="flex gap-3">
                <button onClick={() => setPromoteToMainTarget(null)} className="flex-1 ios-button-secondary !border !border-[var(--color-border)] !rounded-xl">後で</button>
                <button
                  onClick={() => {
                    const c = promoteToMainTarget;
                    const newTags: Tag[] = [...(c.tags ?? [])];
                    if (!newTags.includes('インターン参加済み')) newTags.push('インターン参加済み');
                    updateCompany(c.id, { selectionType: 'main', customMilestones: undefined, tags: newTags });
                    showToast(`『${c.name}』を本選考に更新しました。`);
                    setPromoteToMainTarget(null);
                  }}
                  className="flex-1 ios-button-primary"
                >
                  本選考へ進む
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 次の段階へ 日時設定ポップアップ */}
      {nextStageTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 modal-safe"
          onPointerDown={() => setNextStageTarget(null)}
        >
          <div
            className="bg-card rounded-2xl p-6 mx-6 max-w-sm w-full shadow-xl"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[16px] font-semibold text-[var(--color-text)] text-center mb-2">
              {nextStageTarget.nextName}
            </p>
            <p className="text-[13px] text-[var(--color-text-secondary)] text-center mb-4">
              次の選考の日程を設定してください
            </p>
            <div className="space-y-2 mb-4">
              <DatePicker value={nextStageDate} onChange={setNextStageDate} />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[12px] text-[var(--color-text-secondary)] mb-1">開始</label>
                  <TimeSelect value={nextStageStartTime} onChange={(v) => { setNextStageStartTime(v); if (v && !nextStageEndTime) { const [h, m] = v.split(':').map(Number); setNextStageEndTime(`${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`); } }} />
                </div>
                <div className="flex-1">
                  <label className="block text-[12px] text-[var(--color-text-secondary)] mb-1">終了</label>
                  <TimeSelect value={nextStageEndTime} onChange={setNextStageEndTime} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mb-2">
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
            <button
              onClick={() => setNextStageTarget(null)}
              className="w-full py-2.5 rounded-xl text-[14px] font-medium text-[var(--color-text-secondary)] min-h-[44px]"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* クイック編集モーダル（長押し） — 全画面 */}
      <AnimatePresence>
        {quickEditCompany && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end justify-center modal-safe"
            style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
            onClick={() => setQuickEditCompany(null)}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-card rounded-3xl shadow-2xl flex flex-col"
              style={{ height: 'calc(100dvh - 3.5rem - env(safe-area-inset-top) - 4rem - env(safe-area-inset-bottom))' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ヘッダー */}
              <div className="px-6 pt-5 pb-4 flex-shrink-0">
                <div className="flex items-center justify-between mb-1">
                  {quickEditStep === 'datetime' ? (
                    <button
                      onClick={() => setQuickEditStep('status')}
                      className="flex items-center gap-1 text-[var(--color-primary)] text-[15px] font-medium -ml-1 px-1 py-1 min-w-[44px] min-h-[44px]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      戻る
                    </button>
                  ) : (
                    <p className="text-[17px] font-bold text-[var(--color-text)] truncate flex-1">{quickEditCompany.name}</p>
                  )}
                  <button
                    onClick={() => setQuickEditCompany(null)}
                    className="w-11 h-11 flex items-center justify-center rounded-full bg-[var(--color-border)] text-[var(--color-text-secondary)] flex-none ml-2"
                    aria-label="閉じる"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className={`text-[13px] text-[var(--color-text-secondary)] ${quickEditStep === 'datetime' ? 'mt-1' : ''}`}>
                  {quickEditStep === 'status' ? '選考段階を変更' : `${trackStatuses.find(c => c.id === quickEditColId)?.name ?? ''} の日時を設定`}
                </p>
              </div>

              {quickEditStep === 'status' ? (
                /* Step 1: 選考段階選択 */
                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2 hide-scrollbar">
                  {trackStatuses.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => {
                        if (col.id === quickEditCompany.statusId) {
                          setQuickEditCompany(null);
                          return;
                        }
                        setQuickEditColId(col.id);
                        setQuickEditStep('datetime');
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-[15px] font-medium ios-tap flex items-center gap-2 ${
                        col.id === quickEditCompany.statusId
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-[var(--color-border)] text-[var(--color-text)]'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-none"
                        style={{ backgroundColor: col.color }}
                      />
                      {col.name}
                      {col.id === quickEditCompany.statusId && (
                        <span className="ml-auto text-[12px] opacity-80">現在</span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                /* Step 2: 日時設定 */
                <>
                <div className="flex-1 overflow-y-auto px-6 pt-2 pb-4">
                  <div className="space-y-3">
                    <input
                      type="date"
                      value={quickEditDate}
                      onChange={(e) => setQuickEditDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-[15px]"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-[12px] text-[var(--color-text-secondary)] mb-1">開始</label>
                        <TimeSelect value={quickEditStartTime} onChange={(v) => { setQuickEditStartTime(v); if (v && !quickEditEndTime) { const [h, m] = v.split(':').map(Number); setQuickEditEndTime(`${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`); } }} />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[12px] text-[var(--color-text-secondary)] mb-1">終了</label>
                        <TimeSelect value={quickEditEndTime} onChange={setQuickEditEndTime} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 px-6 pt-3 border-t border-[var(--color-border)] space-y-2" style={{ paddingBottom: '1.5rem' }}>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        // スキップ: 日時なしで段階だけ更新、前の予定をクリア
                        const col = trackStatuses.find((c) => c.id === quickEditColId);
                        if (!col) return;
                        const prevStatus = statusColumns.find((s) => s.id === quickEditCompany.statusId);
                        if (prevStatus) {
                          const { type: prevType, subType: prevSubType } = scheduleStageToAction(prevStatus.name);
                          scheduledActions
                            .filter((a) => a.companyId === quickEditCompany.id && a.type === prevType && a.subType === prevSubType)
                            .forEach((a) => deleteScheduledAction(a.id));
                        }
                        updateCompany(quickEditCompany.id, {
                          statusId: quickEditColId,
                          nextActionDate: undefined,
                          nextActionType: undefined,
                          nextActionTime: undefined,
                          nextDeadline: undefined,
                          ...(quickEditCompany.awaitingResult ? { awaitingResult: false, tags: (quickEditCompany.tags ?? []).filter((t) => t !== '結果待ち') } : {}),
                        });
                        showToast(`『${quickEditCompany.name}』を【${col.name}】に変更しました`);
                        setQuickEditCompany(null);
                      }}
                      className="flex-1 py-3 rounded-xl text-[15px] font-semibold bg-[var(--color-border)] text-[var(--color-text)] min-h-[44px]"
                    >
                      スキップ
                    </button>
                    <button
                      onClick={() => {
                        const col = trackStatuses.find((c) => c.id === quickEditColId);
                        if (!col) return;
                        const prevStatus = statusColumns.find((s) => s.id === quickEditCompany.statusId);
                        if (prevStatus) {
                          const { type: prevType, subType: prevSubType } = scheduleStageToAction(prevStatus.name);
                          scheduledActions
                            .filter((a) => a.companyId === quickEditCompany.id && a.type === prevType && a.subType === prevSubType)
                            .forEach((a) => deleteScheduledAction(a.id));
                        }
                        updateCompany(quickEditCompany.id, {
                          statusId: quickEditColId,
                          ...(quickEditCompany.awaitingResult ? { awaitingResult: false, tags: (quickEditCompany.tags ?? []).filter((t) => t !== '結果待ち') } : {}),
                        });
                        if (quickEditDate) {
                          const { type, subType } = scheduleStageToAction(col.name);
                          addScheduledAction({
                            companyId: quickEditCompany.id,
                            type,
                            subType,
                            date: quickEditDate,
                            startTime: quickEditStartTime || undefined,
                            endTime: quickEditEndTime || undefined,
                          });
                        }
                        showToast(`『${quickEditCompany.name}』を【${col.name}】に変更しました`);
                        setQuickEditCompany(null);
                      }}
                      disabled={!quickEditDate}
                      className="flex-1 py-3 rounded-xl text-[15px] font-semibold bg-[var(--color-primary)] text-white min-h-[44px] disabled:opacity-40"
                    >
                      設定
                    </button>
                  </div>
                </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCompany && (
          <ErrorBoundary
            fallback={
              <div className="fixed inset-0 z-[60] flex items-center justify-center modal-safe">
                <div className="bg-card rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl text-center">
                  <p className="text-[17px] font-bold text-[var(--color-text)] mb-2">表示エラー</p>
                  <p className="text-[14px] text-[var(--color-text-secondary)] mb-4">企業データの読み込みに失敗しました。</p>
                  <button onClick={() => setSelectedCompanyId(null)} className="ios-button-primary">閉じる</button>
                </div>
              </div>
            }
          >
            <CompanyDetailModal
              company={selectedCompany}
              onClose={() => setSelectedCompanyId(null)}
            />
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {gradYear !== null && !tutorialFlags.companies && (
        <TutorialModal
          steps={[
            {
              title: '企業一覧へようこそ 📋',
              body: '応募中の全企業を一覧で管理できます\n上のチップで絞り込み、\nソートボタンで並び替えができます',
            },
            {
              title: 'カードをタップ',
              body: 'カードをタップすると\n企業の詳細画面が開きます\n\n選考予定・メモ・ログイン情報など\n企業ごとの情報をまとめて管理できます',
            },
            {
              title: 'カードの操作',
              body: '「次の段階へ →」\n→ 選考段階を1つ進める\n\n長押し\n→ 段階をクイック変更\n\n左にスワイプ\n→ 見送りに移動',
              highlight: '長押し・スワイプを使いこなそう！',
            },
            {
              title: '結果待ちマーク',
              body: '面接後など返事待ちのとき\nカード左端の色帯をタップすると\n「結果待ち」状態になります\n\n絞り込みで「結果待ち」だけ\nまとめて確認できます',
            },
          ]}
          onComplete={() => markTutorialSeen('companies')}
        />
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="pb-24 px-4 pt-4"><p className="text-[var(--color-text-secondary)]">読み込み中...</p></div>}>
      <TasksContent />
    </Suspense>
  );
}
