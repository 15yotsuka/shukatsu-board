'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ESForm } from '@/components/es/ESForm';
import { ESTemplates } from '@/components/es/ESTemplates';
import { ESCopyDialog } from '@/components/es/ESCopyDialog';

export default function ESPage() {
  const companies = useAppStore((s) => s.companies);
  const esEntries = useAppStore((s) => s.esEntries);
  const addESEntry = useAppStore((s) => s.addESEntry);

  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);

  const companyEntries = esEntries
    .filter((e) => e.companyId === selectedCompanyId)
    .sort((a, b) => a.order - b.order);

  const handleAddBlank = () => {
    if (!selectedCompanyId) return;
    addESEntry({
      companyId: selectedCompanyId,
      question: '',
      answer: '',
      order: companyEntries.length,
    });
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const reordered = [...companyEntries];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    const store = useAppStore.getState();
    store.reorderESEntries(
      selectedCompanyId,
      reordered.map((e) => e.id)
    );
  };

  const handleMoveDown = (index: number) => {
    if (index >= companyEntries.length - 1) return;
    const reordered = [...companyEntries];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    const store = useAppStore.getState();
    store.reorderESEntries(
      selectedCompanyId,
      reordered.map((e) => e.id)
    );
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Company selector */}
      <div>
        <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">
          企業を選択
        </label>
        <select
          value={selectedCompanyId}
          onChange={(e) => setSelectedCompanyId(e.target.value)}
          className="ios-input"
        >
          <option value="">企業を選択してください</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}（{c.trackType === 'intern' ? 'インターン' : '本選考'}）
            </option>
          ))}
        </select>
      </div>

      {/* Empty state */}
      {!selectedCompanyId && (
        <p className="text-[14px] text-[var(--color-text-secondary)] text-center py-8">
          企業を選択してください
        </p>
      )}

      {selectedCompanyId && (
        <>
          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleAddBlank}
              className="flex-1 ios-button-primary !py-3 !text-[14px]"
            >
              + 設問を追加
            </button>
            <button
              onClick={() => setShowTemplates(true)}
              className="flex-1 bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded-xl py-3 text-[14px] font-semibold ios-tap"
            >
              テンプレート
            </button>
            <button
              onClick={() => setShowCopyDialog(true)}
              className="bg-[var(--color-bg)] text-[var(--color-text-secondary)] rounded-xl px-4 py-3 text-[14px] font-medium ios-tap"
            >
              コピー
            </button>
          </div>

          {/* ES entries */}
          {companyEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-[var(--color-primary-light)] rounded-2xl flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p className="text-[17px] font-semibold text-[var(--color-text)] mb-1">設問を追加しましょう</p>
              <p className="text-[14px] text-[var(--color-text-secondary)]">上のボタンから設問を追加</p>
            </div>
          ) : (
            <div className="space-y-3">
              {companyEntries.map((entry, index) => (
                <div key={entry.id}>
                  <div className="flex items-center justify-end gap-1 mb-1">
                    <span className="text-[12px] text-[var(--color-text-secondary)] mr-auto">
                      設問 {index + 1}
                    </span>
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="w-8 h-8 flex items-center justify-center text-[var(--color-primary)] disabled:text-[var(--color-border)] ios-tap"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === companyEntries.length - 1}
                      className="w-8 h-8 flex items-center justify-center text-[var(--color-primary)] disabled:text-[var(--color-border)] ios-tap"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  <ESForm entry={entry} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showTemplates && selectedCompanyId && (
        <ESTemplates
          companyId={selectedCompanyId}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {showCopyDialog && selectedCompanyId && (
        <ESCopyDialog
          targetCompanyId={selectedCompanyId}
          onClose={() => setShowCopyDialog(false)}
        />
      )}
    </div>
  );
}
