'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { getStageColor } from '@/lib/stageColors';
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

type SortField = 'deadline' | 'status' | 'industry' | 'manual';
type SortOrder = 'asc' | 'desc';

const FILTER_GROUPS: Record<string, string[]> = {
  'active': ['ES', 'Webテスト', '1次面接', '2次面接', '3次面接', '最終面接'],
  'entry_before': ['エントリー前'],
  'entry': ['ES', 'Webテスト'],
  'interview': ['1次面接', '2次面接', '3次面接', '最終面接'],
  'offer': ['内定'],
  'rejected': ['見送り'],
};

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'active', label: '進行中' },
  { value: 'awaiting', label: '結果待ち' },
  { value: 'entry_before', label: 'エントリー前' },
  { value: 'entry', label: 'ES/Webテスト' },
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
  isDraggable: boolean;
  hasDeadlineNow: boolean;
  milestones: string[];
  milestoneIdx: number;
  interviews: Interview[];
  displaySettings: DisplaySettings;
  onOpenDetail: () => void;
  onAdvance: (e: React.MouseEvent) => void;
  onToggleAwaitingResult: () => void;
}

function TaskCard({
  company,
  statusName,
  isDraggable,
  hasDeadlineNow,
  milestones,
  milestoneIdx,
  interviews,
  displaySettings,
  onOpenDetail,
  onAdvance,
  onToggleAwaitingResult,
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

  const upcomingInterview = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return (
      interviews
        .filter((i) => i.companyId === company.id && i.datetime.substring(0, 10) >= today)
        .sort((a, b) => a.datetime.localeCompare(b.datetime))[0] ?? null
    );
  }, [interviews, company.id]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onOpenDetail}
      className="relative bg-card dark:bg-zinc-900 rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
    >
      {/* Left color strip (stage color) - tappable to toggle awaitingResult */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleAwaitingResult(); }}
        onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onToggleAwaitingResult(); }}
        className="absolute left-0 top-0 bottom-0 w-6 rounded-l-2xl transition-opacity"
        style={{
          backgroundColor: getStageColor(statusName),
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
            className="flex-none text-[12px] px-2 py-1 rounded-lg bg-blue-500/20 text-blue-500 font-medium whitespace-nowrap ios-tap"
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

        {/* Row 3: deadline + interview (conditional) */}
        {(nextStepLabel || upcomingInterview) && (
          <div className="flex items-center gap-3 flex-wrap text-[12px]">
            {nextStepLabel && (
              <span className={`flex items-center gap-1 ${hasDeadlineNow ? 'text-[var(--color-danger)]' : 'text-zinc-400'}`}>
                {nextStepLabel}
              </span>
            )}
            {displaySettings.showNextInterview && upcomingInterview && (() => {
              const dt = new Date(upcomingInterview.datetime);
              const dateStr = format(dt, 'M/d(E)', { locale: ja });
              const startTime = format(dt, 'HH:mm');
              const endStr = upcomingInterview.endTime ? `~${upcomingInterview.endTime}` : '';
              return (
                <span className="flex items-center gap-1 text-blue-500">
                  {dateStr} {startTime}{endStr} {upcomingInterview.type}
                </span>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}

const SORT_BUTTONS: { field: SortField; label: string }[] = [
  { field: 'deadline', label: '締切日' },
  { field: 'status', label: '選考段階' },
  { field: 'industry', label: '業界' },
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
  const toggleAwaitingResult = useAppStore((s) => s.toggleAwaitingResult);
  const reorderCompanies = useAppStore((s) => s.reorderCompanies);
  const deleteAllCompanies = useAppStore((s) => s.deleteAllCompanies);
  const displaySettings = useAppStore(useShallow((s) => s.displaySettings));
  const tutorialFlags = useAppStore((s) => s.tutorialFlags);
  const markTutorialSeen = useAppStore((s) => s.markTutorialSeen);
  const gradYear = useAppStore((s) => s.gradYear);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [promoteToMainTarget, setPromoteToMainTarget] = useState<Company | null>(null);
  const [nextStageTarget, setNextStageTarget] = useState<{ company: Company; nextName: string; nextColumnId: string } | null>(null);
  const [nextStageDate, setNextStageDate] = useState('');
  const [nextStageStartTime, setNextStageStartTime] = useState('');
  const [nextStageEndTime, setNextStageEndTime] = useState('');
  const [sortField, setSortField] = useState<SortField>('deadline');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const searchParams = useSearchParams();
  const router = useRouter();
  const filter = searchParams.get('filter') ?? '';
  const showToast = useToast((s) => s.show);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const today = format(new Date(), 'yyyy-MM-dd');

  const getStatusName = (statusId: string) =>
    statusColumns.find((s) => s.id === statusId)?.name ?? '';

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
    if (currentStatus?.name === '内定' || currentStatus?.name === 'お見送り') return;
    if (company.selectionType === 'intern' && currentStatus?.name === 'インターン選考中') {
      setPromoteToMainTarget(company);
      return;
    }
    const currentIdx = milestones.findIndex((m) => m === currentStatus?.name);
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
    if (company.awaitingResult) toggleAwaitingResult(company.id);
    updateCompany(company.id, { statusId: nextColumnId });
    // 現在の選考段階のScheduledActionを削除（CompanyDetailModalと同じ処理）
    const currentStatus = statusColumns.find((s) => s.id === company.statusId);
    if (currentStatus) {
      const { type: currentType } = scheduleStageToAction(currentStatus.name);
      scheduledActions
        .filter((a) => a.companyId === company.id && a.type === currentType)
        .forEach((a) => deleteScheduledAction(a.id));
    }
    if (withDate && nextStageDate) {
      const { type, subType } = scheduleStageToAction(nextName);
      addScheduledAction({
        companyId: company.id,
        type,
        subType,
        date: nextStageDate,
        startTime: nextStageStartTime || undefined,
        endTime: nextStageEndTime || undefined,
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
    if (filter) {
      list = list.filter((c) => {
        if (filter === 'awaiting') return c.awaitingResult === true;
        const name = getStatusName(c.statusId);
        if (FILTER_GROUPS[filter]) return FILTER_GROUPS[filter].includes(name);
        return name === filter || name.includes(filter);
      });
    }
    if (selectedIndustry !== 'all') {
      list = list.filter((c) => (c.industry ?? '') === selectedIndustry);
    }
    return list;
  }, [sortedAll, filter, selectedIndustry]);

  const active = filtered.filter((c) => getStatusName(c.statusId) !== '見送り');
  const archived = filtered.filter((c) => getStatusName(c.statusId) === '見送り');

  const handleDragEnd = (event: DragEndEvent) => {
    if (sortField !== 'manual') return;
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
      {/* 色凡例 */}
      <div className="flex flex-wrap items-center gap-3 px-1 text-xs text-gray-400 dark:text-gray-500 mb-3">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:'#9CA3AF'}} />エントリー前</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:'#8B5CF6'}} />ES</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:'#3B82F6'}} />Webテスト</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:'#F97316'}} />面接</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:'#22C55E'}} />内定</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:'#6B7280'}} />見送り</span>
      </div>

      {/* Header row with bulk action buttons */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setShowBulkAdd(true)}
            className="text-[13px] px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-500 font-medium ios-tap"
          >
            + 一括追加
          </button>
          {companies.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="text-[13px] px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 font-medium ios-tap"
            >
              一括削除
            </button>
          )}
        </div>
      </div>

      {/* Sort buttons */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {SORT_BUTTONS.map(({ field, label }) => {
          const isActive = sortField === field;
          return (
            <button
              key={field}
              onClick={() => handleSort(field)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-semibold ios-tap transition-all ${
                isActive
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
              }`}
            >
              {label}
              {isActive && field !== 'manual' && (
                <span className="text-[11px]">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter dropdowns */}
      <div className="flex gap-2 mb-4">
        <select
          value={filter}
          onChange={(e) => {
            const v = e.target.value;
            router.push(v ? `/tasks?filter=${encodeURIComponent(v)}` : '/tasks');
          }}
          className="flex-1 px-3 py-2 rounded-xl text-[14px] font-medium bg-card border border-[var(--color-border)] text-[var(--color-text)] appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")` }}
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={selectedIndustry}
          onChange={(e) => setSelectedIndustry(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl text-[14px] font-medium bg-card border border-[var(--color-border)] text-[var(--color-text)] appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")` }}
        >
          <option value="all">すべての業界</option>
          {industries.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
      </div>

      {active.length === 0 && archived.length === 0 && !filter ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[16px] font-semibold text-[var(--color-text)] mb-1">企業が登録されていません</p>
          <p className="text-[13px] text-[var(--color-text-secondary)]">右下の＋ボタンから追加してください</p>
          <button
            onClick={handleSeed}
            className="mt-4 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-semibold ios-tap"
          >
            サンプルを追加
          </button>
        </div>
      ) : active.length === 0 && archived.length === 0 && filter ? (
        <p className="text-center text-[var(--color-text-secondary)] py-20">該当する企業はありません</p>
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
                      isDraggable={sortField === 'manual'}
                      hasDeadlineNow={hasDeadlineNow}
                      milestones={ms}
                      milestoneIdx={msIdx}
                      interviews={interviews}
                      displaySettings={displaySettings}
                      onOpenDetail={() => setSelectedCompany(c)}
                      onAdvance={(e) => handleAdvanceStatus(e, c)}
                      onToggleAwaitingResult={() => {
                        const willBeAwaiting = !c.awaitingResult;
                        toggleAwaitingResult(c.id);
                        const base = (c.tags ?? []).filter((t) => t !== '結果待ち');
                        updateCompany(c.id, { tags: willBeAwaiting ? [...base, '結果待ち'] : base });
                      }}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

          {archived.length > 0 && (
            <div className="mt-6">
              <p className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide px-1 mb-2">
                アーカイブ（お見送り {archived.length}件）
              </p>
              <div className="space-y-2 opacity-60">
                {archived.map((c) => {
                  const statusName = getStatusName(c.statusId);
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCompany(c)}
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

      <button
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-20 right-5 z-40 w-14 h-14 bg-[var(--color-primary)] text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center ios-tap transition-all duration-150 active:scale-95 hover:brightness-95"
        aria-label="企業を追加"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <AnimatePresence>
        {showAddForm && <AddCompanyForm onClose={() => setShowAddForm(false)} />}
      </AnimatePresence>

      {showBulkAdd && <BulkImportModal statusColumns={trackStatuses} onClose={() => setShowBulkAdd(false)} />}

      {/* インターン→本選考 昇格ダイアログ */}
      <AnimatePresence>
        {promoteToMainTarget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
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

      <AnimatePresence>
        {selectedCompany && (
          <ErrorBoundary
            fallback={
              <div className="fixed inset-0 z-[60] flex items-center justify-center">
                <div className="bg-card rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl text-center">
                  <p className="text-[17px] font-bold text-[var(--color-text)] mb-2">表示エラー</p>
                  <p className="text-[14px] text-[var(--color-text-secondary)] mb-4">企業データの読み込みに失敗しました。</p>
                  <button onClick={() => setSelectedCompany(null)} className="ios-button-primary">閉じる</button>
                </div>
              </div>
            }
          >
            <CompanyDetailModal
              company={selectedCompany}
              onClose={() => setSelectedCompany(null)}
            />
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {gradYear !== null && !tutorialFlags.companies && (
        <TutorialModal
          steps={[
            {
              title: '企業一覧へようこそ',
              body: '応募中の企業を一覧で管理できます。\n並べ替え・絞り込みで\n今の状況をすぐ把握できます。',
            },
            {
              title: '結果待ちをマークしよう',
              body: '面接後など、返事を待っているときに\n使えるマーク機能があります。',
              highlight: '左端の色帯をタップすると\n「結果待ち」タグが付きます！\n絞り込みでまとめて確認できます。',
            },
            {
              title: 'カードの操作',
              body: '「次の段階へ →」で選考段階を更新\n長押しでクイック編集\n左スワイプで見送りに移動',
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
