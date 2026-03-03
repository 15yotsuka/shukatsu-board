'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { AddCompanyForm } from '@/components/board/AddCompanyForm';
import { CompanyDetailModal } from '@/components/board/CompanyDetailModal';
import { createSampleCompanies } from '@/lib/sampleData';
import type { Company } from '@/lib/types';
import { PRIORITY_CONFIG } from '@/lib/types';
import { useToast } from '@/lib/useToast';
import { format } from 'date-fns';

const getBadgeStyle = (statusName: string): string => {
  if (statusName.includes('面接')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
  if (statusName.includes('内定')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (statusName.includes('インターン')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  if (statusName.includes('ES') || statusName.includes('書類')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  if (statusName.includes('通過')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
  return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';
};

const MILESTONES = ['ES', 'Webテスト', '面接', '最終面接', '内定'];

const getMilestoneIndex = (statusName: string): number => {
  if (statusName.includes('最終')) return 3;
  if (statusName.includes('内定')) return 4;
  if (statusName.includes('面接')) return 2;
  if (statusName.includes('Web') || statusName.includes('テスト')) return 1;
  if (statusName.includes('ES') || statusName.includes('書類')) return 0;
  return 0;
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
    const trackCols = statusColumns
      .filter((s) => s.trackType === company.trackType)
      .sort((a, b) => a.order - b.order);
    const total = trackCols.length;
    const current = trackCols.findIndex((s) => s.id === company.statusId) + 1;
    return { current, total };
  };

  const handlePass = (company: Company) => {
    const trackCols = statusColumns
      .filter((s) => s.trackType === company.trackType)
      .sort((a, b) => a.order - b.order);
    const currentIdx = trackCols.findIndex((s) => s.id === company.statusId);
    if (currentIdx === -1 || currentIdx >= trackCols.length - 1) return;
    const nextStatus = trackCols[currentIdx + 1];
    updateCompany(company.id, { statusId: nextStatus.id });
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
        return name === filter || name.includes(filter);
      })
    : companies;

  const sorted = [...filtered].sort((a, b) => {
    if (a.nextDeadline && b.nextDeadline) return a.nextDeadline.localeCompare(b.nextDeadline);
    if (a.nextDeadline) return -1;
    if (b.nextDeadline) return 1;
    return 0;
  });

  const today = format(new Date(), 'yyyy-MM-dd');

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

      {sorted.length === 0 && !filter ? (
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
      ) : sorted.length === 0 && filter ? (
        <p className="text-center text-[var(--color-text-secondary)] py-20">該当する企業はありません</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((c) => {
            const statusName = getStatusName(c.statusId);
            const milestoneIdx = getMilestoneIndex(statusName);
            const { current, total } = getStatusPosition(c);
            const isExpanded = expandedId === c.id;
            const hasDeadlineNow = !!(c.nextDeadline && c.nextDeadline <= today);

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
                    {c.nextDeadline && (
                      <p className={`text-[12px] mt-0.5 ${hasDeadlineNow ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-secondary)]'}`}>
                        締切: {c.nextDeadline.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2/$3')}
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
                              style={{ width: `${(milestoneIdx / (MILESTONES.length - 1)) * 100}%` }}
                            />
                          </div>
                          {MILESTONES.map((label, i) => (
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
          <CompanyDetailModal
            company={selectedCompany}
            onClose={() => setSelectedCompany(null)}
          />
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
