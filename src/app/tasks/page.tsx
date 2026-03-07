'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { AddCompanyForm } from '@/components/board/AddCompanyForm';
import { CompanyDetailModal } from '@/components/board/CompanyDetailModal';
import { ErrorBoundary } from '@/components/board/ErrorBoundary';
import { createSampleCompanies } from '@/lib/sampleData';
import type { Company } from '@/lib/types';
import { PRIORITY_CONFIG, ACTION_TYPE_LABELS } from '@/lib/types';
import { getMilestones, getMilestoneIndex } from '@/lib/progressMilestones';
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

type SortKey = 'deadline_asc' | 'deadline_desc' | 'status_asc' | 'status_desc' | 'priority_asc' | 'name_asc' | 'manual';

const FILTER_GROUPS: Record<string, string[]> = {
  'エントリー': ['未エントリー', 'ES作成中', 'ES提出済', 'Webテスト受検済'],
  '面接中': ['1次面接', '2次面接', '最終面接'],
};


const PRIORITY_ORDER = ['S', '早期', 'リク面', '持ち駒', '結果待ち'];

const getStepColor = (index: number, total: number): string => {
  const progress = total <= 1 ? 0 : index / (total - 1);
  if (progress <= 0.4) return 'bg-blue-500';
  if (progress <= 0.8) return 'bg-orange-500';
  return 'bg-red-500';
};

const getStepTextColor = (index: number, total: number): string => {
  const progress = total <= 1 ? 0 : index / (total - 1);
  if (progress <= 0.4) return 'text-blue-500';
  if (progress <= 0.8) return 'text-orange-500';
  return 'text-red-500';
};

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

function CompactProgressDots({ company, statusName }: { company: Company; statusName: string }) {
  const milestones = getMilestones(company);
  const total = milestones.length;
  const currentIdx = getMilestoneIndex(statusName, milestones);
  return (
    <div className="flex gap-1.5 items-center mt-1.5">
      {milestones.map((_, i) => {
        const progress = total <= 1 ? 0 : i / (total - 1);
        const colorClass =
          i <= currentIdx
            ? progress > 0.7
              ? 'bg-red-500'
              : progress > 0.4
              ? 'bg-orange-500'
              : 'bg-blue-500'
            : 'bg-zinc-300 dark:bg-zinc-600';
        return <div key={i} className={`w-2 h-2 rounded-full flex-none ${colorClass}`} />;
      })}
    </div>
  );
}

interface TaskCardProps {
  company: Company;
  statusName: string;
  isExpanded: boolean;
  isDraggable: boolean;
  hasDeadlineNow: boolean;
  milestones: string[];
  milestoneIdx: number;
  statusPosition: { current: number; total: number };
  onToggle: () => void;
  onOpenDetail: () => void;
  onPass: () => void;
  onReject: () => void;
}

function TaskCard({
  company,
  statusName,
  isExpanded,
  isDraggable,
  hasDeadlineNow,
  milestones,
  milestoneIdx,
  onToggle,
  onOpenDetail,
  onPass,
  onReject,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card dark:bg-zinc-900 rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden"
    >
      {/* Card header */}
      <div
        onClick={onToggle}
        className="px-4 py-3.5 flex items-center gap-2 cursor-pointer transition-colors duration-150 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 active:scale-[0.98]"
      >
        {/* Drag handle — manual sort only */}
        {isDraggable && (
          <button
            className="w-6 flex-none flex items-center justify-center text-zinc-400 cursor-grab active:cursor-grabbing touch-none select-none"
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
          {/* Row 1: name + badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[15px] font-semibold text-[var(--color-text)] truncate">{company.name}</p>
            {company.priority && PRIORITY_CONFIG[company.priority] && (
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-none ${PRIORITY_CONFIG[company.priority].className}`}>
                {PRIORITY_CONFIG[company.priority].label}
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap flex-none ${getBadgeStyle(statusName)}`}>
              {statusName}
            </span>
          </div>

          {/* Row 2: industry */}
          {company.industry && (
            <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5 truncate">{company.industry}</p>
          )}

          {/* Row 3: next step label */}
          {nextStepLabel && (
            <p className={`text-[12px] mt-0.5 flex items-center gap-1 ${hasDeadlineNow ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-secondary)]'}`}>
              <span>📅</span>
              {nextStepLabel}
              {hasDeadlineNow && ' ・結果は？'}
            </p>
          )}

          {/* Row 4: compact progress dots */}
          <CompactProgressDots company={company} statusName={statusName} />
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[var(--color-border)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </motion.div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-3 border-t border-[var(--color-border)]">
              {/* Full progress bar with labels */}
              <div className="relative flex items-start justify-between w-full">
                <div className="absolute left-0 right-0 h-0.5 bg-zinc-200 dark:bg-zinc-700 top-[5px]">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${milestones.length > 1 ? (milestoneIdx / (milestones.length - 1)) * 100 : 0}%` }}
                  />
                </div>
                {milestones.map((label, i) => (
                  <div key={i} className="flex flex-col items-center relative z-10 gap-1">
                    <div className={`w-3 h-3 rounded-full flex-none transition-colors ${
                      i < milestoneIdx
                        ? getStepColor(i, milestones.length)
                        : i === milestoneIdx
                        ? getStepColor(i, milestones.length) + ' ring-2 ring-offset-1 ring-current'
                        : 'bg-zinc-200 dark:bg-zinc-700'
                    }`} />
                    <span className={`text-[9px] text-center leading-tight max-w-[36px] ${
                      i < milestoneIdx
                        ? getStepTextColor(i, milestones.length)
                        : i === milestoneIdx
                        ? getStepTextColor(i, milestones.length) + ' font-bold'
                        : 'text-zinc-400 dark:text-zinc-500'
                    }`}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-4">
                {hasDeadlineNow && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); onPass(); }}
                      className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 text-[13px] font-semibold transition-all duration-150 active:scale-95 hover:brightness-95"
                    >
                      ⭕ 通過
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onReject(); }}
                      className="flex-1 py-2 rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 text-[13px] font-semibold transition-all duration-150 active:scale-95 hover:brightness-95"
                    >
                      ❌ 見送り
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}
                  className="flex-1 py-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[13px] font-semibold transition-all duration-150 active:scale-95 hover:brightness-95"
                >
                  詳細を開く →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TasksContent() {
  const companies = useAppStore((s) => s.companies);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const addCompany = useAppStore((s) => s.addCompany);
  const updateCompany = useAppStore((s) => s.updateCompany);
  const reorderCompanies = useAppStore((s) => s.reorderCompanies);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('deadline_asc');
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

  const handleSeed = () => {
    const samples = createSampleCompanies(statusColumns);
    samples.forEach((c) => addCompany(c));
  };

  const getStatusPosition = (company: Company) => {
    const trackCols = [...statusColumns].sort((a, b) => a.order - b.order);
    const total = trackCols.length;
    const current = trackCols.findIndex((s) => s.id === company.statusId) + 1;
    return { current, total };
  };

  const handlePass = (company: Company) => {
    const trackCols = [...statusColumns].sort((a, b) => a.order - b.order);
    const currentIdx = trackCols.findIndex((s) => s.id === company.statusId);
    if (currentIdx === -1 || currentIdx >= trackCols.length - 1) return;
    const nextStatus = trackCols[currentIdx + 1];
    updateCompany(company.id, {
      statusId: nextStatus.id,
      nextActionDate: undefined,
      nextActionType: undefined,
      nextDeadline: undefined,
    });
    showToast(`『${company.name}』を【${nextStatus.name}】に更新しました。`);
    setExpandedId(null);
  };

  const handleReject = (company: Company) => {
    const sayonara = statusColumns.find((s) => s.name === 'お見送り');
    if (!sayonara) return;
    updateCompany(company.id, { statusId: sayonara.id });
    showToast(`『${company.name}』を【お見送り】に更新しました。`);
    setExpandedId(null);
  };

  const sortedAll = useMemo(() => {
    const cols = [...statusColumns].sort((a, b) => a.order - b.order);
    if (sortKey === 'manual') return companies;
    return [...companies].sort((a, b) => {
      if (sortKey === 'deadline_asc' || sortKey === 'deadline_desc') {
        const dir = sortKey === 'deadline_asc' ? 1 : -1;
        if (!a.nextActionDate && !b.nextActionDate) return 0;
        if (!a.nextActionDate) return dir;
        if (!b.nextActionDate) return -dir;
        return a.nextActionDate.localeCompare(b.nextActionDate) * dir;
      }
      if (sortKey === 'status_asc' || sortKey === 'status_desc') {
        const dir = sortKey === 'status_asc' ? 1 : -1;
        const aIdx = cols.findIndex((c) => c.id === a.statusId);
        const bIdx = cols.findIndex((c) => c.id === b.statusId);
        return (aIdx - bIdx) * dir;
      }
      if (sortKey === 'priority_asc') {
        const aIdx = a.priority ? PRIORITY_ORDER.indexOf(a.priority) : PRIORITY_ORDER.length;
        const bIdx = b.priority ? PRIORITY_ORDER.indexOf(b.priority) : PRIORITY_ORDER.length;
        return aIdx - bIdx;
      }
      if (sortKey === 'name_asc') {
        return a.name.localeCompare(b.name, 'ja');
      }
      return 0;
    });
  }, [companies, sortKey, statusColumns]);

  const filtered = filter
    ? sortedAll.filter((c) => {
        const name = getStatusName(c.statusId);
        if (FILTER_GROUPS[filter]) return FILTER_GROUPS[filter].includes(name);
        return name === filter || name.includes(filter);
      })
    : sortedAll;

  const active = filtered.filter((c) => !getStatusName(c.statusId).includes('お見送り'));
  const archived = filtered.filter((c) => getStatusName(c.statusId).includes('お見送り'));

  const handleDragEnd = (event: DragEndEvent) => {
    if (sortKey !== 'manual') return;
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
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[22px] font-bold text-[var(--color-text)]">企業一覧</h1>
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] text-[var(--color-text-secondary)]">↕</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-[13px] font-semibold bg-[var(--color-border)] text-[var(--color-text-secondary)] border-0 rounded-full px-3 py-1.5 outline-none ios-tap"
          >
            <option value="deadline_asc">締切日が近い順</option>
            <option value="deadline_desc">締切日が遠い順</option>
            <option value="status_asc">ステータス順↑</option>
            <option value="status_desc">ステータス順↓</option>
            <option value="priority_asc">優先度順</option>
            <option value="name_asc">企業名順</option>
            <option value="manual">手動</option>
          </select>
        </div>
      </div>

      {filter && (
        <div className="flex items-center justify-between bg-[var(--color-primary)]/10 rounded-xl px-4 py-2.5 mb-4">
          <span className="text-[14px] font-medium text-[var(--color-primary)]">フィルタ: {filter}</span>
          <button
            onClick={() => router.push('/tasks')}
            className="text-[14px] font-semibold text-[var(--color-primary)] ios-tap"
          >
            × 解除
          </button>
        </div>
      )}

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
                  const milestones = getMilestones(c);
                  const milestoneIdx = getMilestoneIndex(statusName, milestones);
                  const statusPosition = getStatusPosition(c);
                  const hasDeadlineNow = !!(c.nextActionDate && c.nextActionDate <= today);

                  return (
                    <TaskCard
                      key={c.id}
                      company={c}
                      statusName={statusName}
                      isExpanded={expandedId === c.id}
                      isDraggable={sortKey === 'manual'}
                      hasDeadlineNow={hasDeadlineNow}
                      milestones={milestones}
                      milestoneIdx={milestoneIdx}
                      statusPosition={statusPosition}
                      onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                      onOpenDetail={() => setSelectedCompany(c)}
                      onPass={() => handlePass(c)}
                      onReject={() => handleReject(c)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

          {/* アーカイブ（お見送り）セクション */}
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
                        {c.industry && (
                          <p className="text-[12px] text-[var(--color-text-secondary)] truncate">{c.industry}</p>
                        )}
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
