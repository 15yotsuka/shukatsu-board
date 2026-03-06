'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { AddCompanyForm } from '@/components/board/AddCompanyForm';
import { CompanyDetailModal } from '@/components/board/CompanyDetailModal';
import { ErrorBoundary } from '@/components/board/ErrorBoundary';
import { createSampleCompanies } from '@/lib/sampleData';
import type { Company } from '@/lib/types';
import { PRIORITY_CONFIG, ACTION_TYPE_LABELS } from '@/lib/types';
import { MILESTONES, getMilestoneIndex } from '@/lib/progressMilestones';
import { useToast } from '@/lib/useToast';
import { format } from 'date-fns';

const FILTER_GROUPS: Record<string, string[]> = {
  'エントリー': ['未エントリー', 'ES作成中', 'ES提出済', 'Webテスト受検済'],
  '面接中': ['1次面接', '2次面接', '最終面接'],
};

const getBadgeStyle = (statusName: string): string => {
  if (statusName.includes('面接')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
  if (statusName.includes('内定')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (statusName.includes('インターン')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  if (statusName.includes('ES') || statusName.includes('書類')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  if (statusName.includes('通過')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
  return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';
};

function TasksContent() {
  const companies = useAppStore((s) => s.companies);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const addCompany = useAppStore((s) => s.addCompany);
  const updateCompany = useAppStore((s) => s.updateCompany);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const filter = searchParams.get('filter') ?? '';
  const showToast = useToast((s) => s.show);

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

  const filtered = filter
    ? companies.filter((c) => {
        const name = getStatusName(c.statusId);
        if (FILTER_GROUPS[filter]) return FILTER_GROUPS[filter].includes(name);
        return name === filter || name.includes(filter);
      })
    : companies;

  const today = format(new Date(), 'yyyy-MM-dd');

  // お見送りを分離してアーカイブ表示
  const active = filtered.filter((c) => !getStatusName(c.statusId).includes('お見送り'));
  const archived = filtered.filter((c) => getStatusName(c.statusId).includes('お見送り'));

  const sorted = [...active].sort((a, b) => {
    if (a.nextActionDate && b.nextActionDate)
      return a.nextActionDate.localeCompare(b.nextActionDate);
    if (a.nextActionDate) return -1;
    if (b.nextActionDate) return 1;
    const orderA = statusColumns.find((s) => s.id === a.statusId)?.order ?? 0;
    const orderB = statusColumns.find((s) => s.id === b.statusId)?.order ?? 0;
    return orderB - orderA;
  });

  return (
    <div className="pb-24 px-4 pt-4">
      <h1 className="text-[22px] font-bold text-[var(--color-text)] mb-4">企業一覧</h1>

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

      {sorted.length === 0 && archived.length === 0 && !filter ? (
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
      ) : sorted.length === 0 && archived.length === 0 && filter ? (
        <p className="text-center text-[var(--color-text-secondary)] py-20">該当する企業はありません</p>
      ) : (
        <>
        <div className="space-y-2">
          {sorted.map((c) => {
            const statusName = getStatusName(c.statusId);
            const milestoneIdx = getMilestoneIndex(statusName, c.selectionType ?? 'main_only');
            const { current, total } = getStatusPosition(c);
            const isExpanded = expandedId === c.id;
            const hasDeadlineNow = !!(c.nextActionDate && c.nextActionDate <= today);

            return (
              <div
                key={c.id}
                className="bg-card dark:bg-zinc-900 rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden"
              >
                {/* Card header — tap to expand/collapse */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  className="px-5 py-4 flex items-center gap-3 cursor-pointer transition-colors duration-150 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 active:scale-[0.98]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[15px] font-semibold text-[var(--color-text)] truncate">{c.name}</p>
                      {c.priority && PRIORITY_CONFIG[c.priority] && (
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-none ${PRIORITY_CONFIG[c.priority].className}`}>
                          {PRIORITY_CONFIG[c.priority].label}
                        </span>
                      )}
                    </div>
                    {c.industry && (
                      <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5 truncate">{c.industry}</p>
                    )}
                    {c.nextActionDate && (
                      <p className={`text-[12px] mt-0.5 ${hasDeadlineNow ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-secondary)]'}`}>
                        {c.nextActionType ? ACTION_TYPE_LABELS[c.nextActionType] : '予定'}:{' '}
                        {c.nextActionDate.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2/$3')}
                        {hasDeadlineNow && ' ・結果は？'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${getBadgeStyle(statusName)}`}>
                      {statusName}
                    </span>
                    <span className="text-[11px] text-[var(--color-text-secondary)] tabular-nums font-medium">
                      {current}/{total}
                    </span>
                    <motion.div
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[var(--color-border)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.div>
                  </div>
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
                        {/* Progress bar */}
                        <div className="relative flex items-start justify-between w-full">
                          {/* Background line */}
                          <div className="absolute left-0 right-0 h-0.5 bg-zinc-200 dark:bg-zinc-700 top-[5px]">
                            <div
                              className="h-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${(milestoneIdx / (MILESTONES[c.selectionType ?? 'main_only'].length - 1)) * 100}%` }}
                            />
                          </div>
                          {MILESTONES[c.selectionType ?? 'main_only'].map((label, i) => (
                            <div key={i} className="flex flex-col items-center relative z-10 gap-1">
                              <div className={`w-3 h-3 rounded-full flex-none ${
                                i < milestoneIdx
                                  ? 'bg-blue-500'
                                  : i === milestoneIdx
                                  ? 'bg-orange-500 ring-2 ring-orange-200 dark:ring-orange-900'
                                  : 'bg-zinc-200 dark:bg-zinc-700'
                              }`} />
                              <span className={`text-[9px] text-center leading-tight max-w-[36px] ${
                                i < milestoneIdx
                                  ? 'text-blue-500'
                                  : i === milestoneIdx
                                  ? 'text-orange-500 font-bold'
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
                                onClick={(e) => { e.stopPropagation(); handlePass(c); }}
                                className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 text-[13px] font-semibold transition-all duration-150 active:scale-95 hover:brightness-95"
                              >
                                ⭕ 通過
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReject(c); }}
                                className="flex-1 py-2 rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 text-[13px] font-semibold transition-all duration-150 active:scale-95 hover:brightness-95"
                              >
                                ❌ 見送り
                              </button>
                            </>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedCompany(c); }}
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
          })}
        </div>

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
