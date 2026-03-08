'use client';

import { useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { useAppStore } from '@/store/useAppStore';
import type { DeadlineEntry } from '@/lib/types';

export default function DeadlineTab() {
  const deadlines = useAppStore((s) => s.deadlines);
  const importDeadlines = useAppStore((s) => s.importDeadlines);
  const deleteDeadline = useAppStore((s) => s.deleteDeadline);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...deadlines].sort((a, b) =>
    a.deadlineDate.localeCompare(b.deadlineDate)
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim());
      const entries: DeadlineEntry[] = lines
        .slice(1) // skip header
        .map((line) => {
          const parts = line.split(',');
          const companyName = parts[0]?.trim() ?? '';
          const deadlineType = parts[1]?.trim() ?? '';
          const deadlineDate = parts[2]?.trim() ?? '';
          const note = parts.slice(3).join(',').trim() || undefined;
          return { id: nanoid(), companyName, deadlineType, deadlineDate, note };
        })
        .filter((entry) => entry.companyName && entry.deadlineDate);

      importDeadlines(entries);
      setSuccessMsg(`${entries.length}件インポートしました`);
      setTimeout(() => setSuccessMsg(null), 3000);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  return (
    <div className="px-4 py-4 pb-28 space-y-4">
      {successMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#007AFF] text-white text-[14px] font-semibold px-5 py-2.5 rounded-full shadow-lg">
          {successMsg}
        </div>
      )}

      {/* ヘッダー + インポートボタン */}
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-bold text-[var(--color-text)]">締切情報</h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#007AFF] text-white text-[14px] font-semibold rounded-full ios-tap shadow-sm shadow-blue-500/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          CSVインポート
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* 締切一覧 */}
      {sorted.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 flex flex-col items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-[15px] text-[var(--color-text-secondary)] text-center">
            CSVをインポートして締切を管理しましょう
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
          {/* テーブルヘッダー */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-2 border-b border-[var(--color-border)]">
            <span className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wide">会社名</span>
            <span className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wide">種別</span>
            <span className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wide">締切日</span>
            <span />
          </div>

          {/* テーブル行 */}
          <div className="divide-y divide-[var(--color-border)]">
            {sorted.map((entry) => {
              const isPast = entry.deadlineDate < today;
              const dateClass = isPast
                ? 'text-red-500 font-semibold'
                : 'text-[var(--color-text)]';
              const parts = entry.deadlineDate.split('-');
              const mmdd =
                parts[1] && parts[2]
                  ? `${parseInt(parts[1])}/${parseInt(parts[2])}`
                  : entry.deadlineDate;

              return (
                <div
                  key={entry.id}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[var(--color-text)] truncate">
                      {entry.companyName}
                    </p>
                    {entry.note && (
                      <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
                        {entry.note}
                      </p>
                    )}
                  </div>
                  <span className="text-[12px] text-[var(--color-text-secondary)] whitespace-nowrap">
                    {entry.deadlineType}
                  </span>
                  <span className={`text-[13px] whitespace-nowrap ${dateClass}`}>
                    {mmdd}
                  </span>
                  <button
                    onClick={() => deleteDeadline(entry.id)}
                    className="w-9 h-9 flex items-center justify-center text-[var(--color-danger)] ios-tap"
                    aria-label="削除"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
