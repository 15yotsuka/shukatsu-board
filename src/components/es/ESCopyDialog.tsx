'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface ESCopyDialogProps {
  targetCompanyId: string;
  onClose: () => void;
}

export function ESCopyDialog({ targetCompanyId, onClose }: ESCopyDialogProps) {
  const companies = useAppStore((s) => s.companies);
  const esEntries = useAppStore((s) => s.esEntries);
  const addESEntry = useAppStore((s) => s.addESEntry);

  const [sourceCompanyId, setSourceCompanyId] = useState('');

  const companiesWithES = companies.filter(
    (c) =>
      c.id !== targetCompanyId &&
      esEntries.some((e) => e.companyId === c.id)
  );

  const sourceEntries = esEntries
    .filter((e) => e.companyId === sourceCompanyId)
    .sort((a, b) => a.order - b.order);

  const existingCount = esEntries.filter(
    (e) => e.companyId === targetCompanyId
  ).length;

  const handleCopy = () => {
    sourceEntries.forEach((entry, i) => {
      addESEntry({
        companyId: targetCompanyId,
        question: entry.question,
        answer: entry.answer,
        charLimit: entry.charLimit,
        order: existingCount + i,
      });
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up">
        {/* Grab bar */}
        <div className="flex justify-center pt-2 pb-0 md:hidden">
          <div className="w-9 h-1 bg-[#E5E5EA] rounded-full" />
        </div>

        <div className="px-4 pt-4 pb-2">
          <h2 className="text-[17px] font-bold text-center text-[#1C1C1E]">他の企業からコピー</h2>
        </div>

        <div className="p-4 space-y-4">
          {companiesWithES.length === 0 ? (
            <p className="text-[14px] text-[#8E8E93] text-center py-4">
              コピーできるESがある企業がありません
            </p>
          ) : (
            <>
              <div>
                <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">
                  コピー元の企業
                </label>
                <select
                  value={sourceCompanyId}
                  onChange={(e) => setSourceCompanyId(e.target.value)}
                  className="ios-input"
                >
                  <option value="">選択してください</option>
                  {companiesWithES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}（{esEntries.filter((e) => e.companyId === c.id).length}問）
                    </option>
                  ))}
                </select>
              </div>

              {sourceCompanyId && sourceEntries.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide">プレビュー</p>
                  <div className="bg-[#F2F2F7] rounded-xl divide-y divide-[#E5E5EA]">
                    {sourceEntries.map((entry) => (
                      <div key={entry.id} className="px-4 py-3">
                        <p className="text-[15px] font-medium text-[#1C1C1E]">{entry.question}</p>
                        {entry.answer && (
                          <p className="text-[13px] text-[#8E8E93] mt-1 line-clamp-2">
                            {entry.answer}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleCopy}
                disabled={!sourceCompanyId || sourceEntries.length === 0}
                className="ios-button-primary"
              >
                コピーする
              </button>
            </>
          )}

          <button onClick={onClose} className="ios-button-secondary">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
