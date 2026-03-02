'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { AddCompanyForm } from '@/components/board/AddCompanyForm';

export default function TasksPage() {
  const companies = useAppStore((s) => s.companies);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const [showAddForm, setShowAddForm] = useState(false);

  const getStatusName = (statusId: string) =>
    statusColumns.find((s) => s.id === statusId)?.name ?? '';

  const sorted = [...companies].sort((a, b) => {
    if (a.nextDeadline && b.nextDeadline) return a.nextDeadline.localeCompare(b.nextDeadline);
    if (a.nextDeadline) return -1;
    if (b.nextDeadline) return 1;
    return 0;
  });

  return (
    <div className="pb-24 px-4 pt-4">
      <h1 className="text-[22px] font-bold text-[var(--color-text)] mb-4">企業一覧</h1>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[16px] font-semibold text-[var(--color-text)] mb-1">企業が登録されていません</p>
          <p className="text-[13px] text-[var(--color-text-secondary)]">右下の＋ボタンから追加してください</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((c) => {
            const statusName = getStatusName(c.statusId);
            return (
              <div
                key={c.id}
                className="bg-card dark:bg-zinc-900 rounded-2xl px-4 py-3 shadow-sm border border-[var(--color-border)] flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[var(--color-text)] truncate">{c.name}</p>
                  {c.nextDeadline && (
                    <p className="text-[12px] text-[var(--color-danger)] mt-0.5">
                      締切: {c.nextDeadline.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2/$3')}
                    </p>
                  )}
                </div>
                <span className="flex-none rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)] whitespace-nowrap">
                  {statusName}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-20 right-5 z-40 w-14 h-14 bg-[var(--color-primary)] text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center ios-tap"
        aria-label="企業を追加"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showAddForm && (
        <AddCompanyForm onClose={() => setShowAddForm(false)} />
      )}
    </div>
  );
}
