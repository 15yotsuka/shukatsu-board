'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { INDUSTRIES } from '@/lib/industries';
import { nanoid } from 'nanoid';
import { getCompanySuggestions } from '@/lib/companySuggestions';

interface BulkRow {
  id: string;
  name: string;
  industry: string;
}

function createEmptyRow(): BulkRow {
  return { id: nanoid(6), name: '', industry: '' };
}

const MAX_ROWS = 20;
const INITIAL_ROWS = 3;

interface BulkImportModalProps {
  statusColumns: { id: string; name: string }[];
  onClose: () => void;
}

export function BulkImportModal({ statusColumns, onClose }: BulkImportModalProps) {
  const addCompany = useAppStore((s) => s.addCompany);
  const [selectedStatusId, setSelectedStatusId] = useState(statusColumns[0]?.id ?? '');
  const [rows, setRows] = useState<BulkRow[]>(() =>
    Array.from({ length: INITIAL_ROWS }, createEmptyRow)
  );
  const [mode, setMode] = useState<'rows' | 'text'>('rows');
  const [textInput, setTextInput] = useState('');

  const parsedTextRows = useMemo(() => {
    if (!textInput.trim()) return [];
    return textInput.trim().split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      if (trimmed.includes(',')) {
        const [name, industry] = trimmed.split(',').map(s => s.trim());
        return { name, industry: industry || '' };
      }
      return { name: trimmed, industry: '' };
    }).filter(Boolean) as { name: string; industry: string }[];
  }, [textInput]);

  const autoIndustry = (name: string): string => {
    const suggestions = getCompanySuggestions(name);
    return suggestions[0]?.industry || '';
  };

  const handleTextImport = () => {
    if (parsedTextRows.length === 0) return;
    parsedTextRows.forEach((r) => {
      const industry = r.industry || autoIndustry(r.name);
      addCompany({
        name: r.name,
        industry: industry || undefined,
        statusId: selectedStatusId,
      });
    });
    onClose();
  };

  const updateRow = (id: string, field: keyof Omit<BulkRow, 'id'>, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const addRow = () => {
    if (rows.length >= MAX_ROWS) return;
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const validRows = rows.filter((r) => r.name.trim().length > 0);

  const handleImport = () => {
    if (validRows.length === 0) return;
    validRows.forEach((r) => {
      addCompany({
        name: r.name.trim(),
        industry: r.industry || undefined,
        statusId: selectedStatusId,
      });
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card w-full max-w-lg rounded-t-2xl md:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Grab bar */}
        <div className="flex justify-center pt-2 pb-0 md:hidden">
          <div className="w-9 h-1 bg-[var(--color-border)] rounded-full" />
        </div>

        <div className="px-5 pt-4 pb-2 flex-shrink-0">
          <h3 className="text-[17px] font-bold text-[var(--color-text)]">企業を一括追加</h3>
        </div>

        <div className="px-5 pb-2 flex-shrink-0">
          <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">
            初期選考段階
          </label>
          <select
            value={selectedStatusId}
            onChange={(e) => setSelectedStatusId(e.target.value)}
            className="ios-input"
          >
            {statusColumns.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 px-5 mb-3">
          <button
            onClick={() => setMode('rows')}
            className={`flex-1 py-2 text-[13px] font-semibold rounded-xl ios-tap ${mode === 'rows' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'}`}
          >
            フォーム入力
          </button>
          <button
            onClick={() => setMode('text')}
            className={`flex-1 py-2 text-[13px] font-semibold rounded-xl ios-tap ${mode === 'text' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'}`}
          >
            テキスト貼り付け
          </button>
        </div>

        {/* Scrollable rows (form mode) */}
        {mode === 'rows' && (
          <div className="flex-1 overflow-y-auto px-5 pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="space-y-2">
              {rows.map((row, idx) => (
                <div
                  key={row.id}
                  className="bg-[var(--color-bg)] rounded-xl p-3 space-y-2 border border-[var(--color-border)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-[var(--color-text-secondary)] w-5 text-center flex-none">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                      placeholder="企業名"
                      className="ios-input flex-1 text-[14px] !py-1.5"
                      autoFocus={idx === 0}
                    />
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="w-9 h-9 flex items-center justify-center text-[var(--color-danger)] ios-tap flex-none"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 pl-7">
                    <select
                      value={row.industry}
                      onChange={(e) => updateRow(row.id, 'industry', e.target.value)}
                      className="ios-input flex-1 text-[13px] !py-1.5"
                    >
                      <option value="">業界</option>
                      {INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {rows.length < MAX_ROWS && (
              <button
                type="button"
                onClick={addRow}
                className="w-full mt-2 py-2 text-[13px] font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 rounded-xl ios-tap"
              >
                + 行を追加（{rows.length}/{MAX_ROWS}）
              </button>
            )}
          </div>
        )}

        {/* Text paste mode */}
        {mode === 'text' && (
          <div className="px-5 flex-1 overflow-y-auto">
            <p className="text-[12px] text-[var(--color-text-secondary)] mb-2">
              1行につき1社。カンマで区切ると業界も指定できます。
            </p>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={'ソニーグループ,メーカー\n三菱商事,商社\n野村証券'}
              className="ios-input w-full min-h-[200px] resize-y text-[14px]"
            />
            {parsedTextRows.length > 0 && (
              <p className="text-[12px] text-[var(--color-text-secondary)] mt-2">
                {parsedTextRows.length}社を追加します
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-6 pt-3 flex-shrink-0 space-y-2 border-t border-[var(--color-border)]">
          {mode === 'rows' ? (
            <>
              {validRows.length > 0 && (
                <p className="text-[12px] text-[var(--color-text-secondary)] text-center">
                  {validRows.length}社を追加します
                </p>
              )}
              <button
                onClick={handleImport}
                disabled={validRows.length === 0}
                className="ios-button-primary disabled:opacity-40"
              >
                {validRows.length > 0 ? `${validRows.length}社を追加する` : '追加する'}
              </button>
            </>
          ) : (
            <button
              onClick={handleTextImport}
              disabled={parsedTextRows.length === 0}
              className="ios-button-primary disabled:opacity-40"
            >
              {parsedTextRows.length > 0 ? `${parsedTextRows.length}社を追加する` : '追加する'}
            </button>
          )}
          <button onClick={onClose} className="ios-button-secondary">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
