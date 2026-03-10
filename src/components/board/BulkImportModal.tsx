'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { INDUSTRIES } from '@/lib/industries';
import { nanoid } from 'nanoid';
import { getCompanySuggestions, type CompanySuggestion } from '@/lib/companySuggestions';
import type { ActionType } from '@/lib/types';

interface BulkRow {
  id: string;
  name: string;
  industry: string;
  statusId: string;
  deadline: string;
}

function createEmptyRow(): BulkRow {
  return { id: nanoid(6), name: '', industry: '', statusId: '', deadline: '' };
}

const MAX_ROWS = 20;
const INITIAL_ROWS = 3;

// ヘッダー行判定用キーワード
const NAME_HEADERS = ['企業名', '会社名', 'name', 'Name', '名前', '社名', 'company'];
const INDUSTRY_HEADERS = ['業界', 'industry', 'Industry', '業種', 'セクター'];

function isHeaderRow(fields: string[]): boolean {
  const first = fields[0]?.trim().toLowerCase() ?? '';
  return NAME_HEADERS.some((h) => first === h.toLowerCase());
}

function detectNameAndIndustryColumns(fields: string[]): { nameCol: number; industryCol: number } {
  let nameCol = 0;
  let industryCol = -1;
  fields.forEach((f, i) => {
    const lower = f.trim().toLowerCase();
    if (NAME_HEADERS.some((h) => lower === h.toLowerCase())) nameCol = i;
    if (INDUSTRY_HEADERS.some((h) => lower === h.toLowerCase())) industryCol = i;
  });
  return { nameCol, industryCol };
}

function splitLine(line: string): string[] {
  // タブ区切り優先、なければカンマ区切り
  if (line.includes('\t')) return line.split('\t');
  return line.split(',');
}

interface ParsedEntry {
  name: string;
  industry: string;
}

function parseTextLines(text: string): ParsedEntry[] {
  if (!text.trim()) return [];
  const lines = text.trim().split('\n');

  // 1行目がヘッダーかチェック
  const firstFields = splitLine(lines[0]);
  const hasHeader = isHeaderRow(firstFields);
  const { nameCol, industryCol } = hasHeader
    ? detectNameAndIndustryColumns(firstFields)
    : { nameCol: 0, industryCol: firstFields.length > 1 ? 1 : -1 };

  const startIdx = hasHeader ? 1 : 0;
  const results: ParsedEntry[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    const fields = splitLine(trimmed);
    const name = fields[nameCol]?.trim() ?? '';
    const industry = industryCol >= 0 ? (fields[industryCol]?.trim() ?? '') : '';
    if (name) results.push({ name, industry });
  }
  return results;
}

function decodeBuffer(buffer: ArrayBuffer): string {
  // BOM付きUTF-8チェック
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder('utf-8').decode(buffer);
  }
  // UTF-8でデコード試行
  const utf8 = new TextDecoder('utf-8', { fatal: true });
  try {
    return utf8.decode(buffer);
  } catch {
    // Shift_JISフォールバック
    try {
      return new TextDecoder('shift_jis').decode(buffer);
    } catch {
      return new TextDecoder('utf-8').decode(buffer);
    }
  }
}

const mapStageToActionType = (stageName: string): ActionType => {
  if (stageName === 'ES') return 'es';
  if (stageName === 'Webテスト') return 'webtest';
  if (stageName.includes('面接')) return 'interview';
  return 'other';
};

const mapStageToSubType = (stageName: string): string | undefined => {
  if (stageName === '1次面接') return '1次面接';
  if (stageName === '2次面接') return '2次面接';
  if (stageName === '3次面接') return '3次面接';
  if (stageName === '最終面接') return '最終面接';
  return undefined;
};

interface BulkImportModalProps {
  statusColumns: { id: string; name: string }[];
  onClose: () => void;
}

export function BulkImportModal({ statusColumns, onClose }: BulkImportModalProps) {
  const addCompany = useAppStore((s) => s.addCompany);
  const addScheduledAction = useAppStore((s) => s.addScheduledAction);
  const [selectedStatusId, setSelectedStatusId] = useState(statusColumns[0]?.id ?? '');
  const [rows, setRows] = useState<BulkRow[]>(() =>
    Array.from({ length: INITIAL_ROWS }, createEmptyRow)
  );
  const [mode, setMode] = useState<'rows' | 'text' | 'file'>('rows');
  const [textInput, setTextInput] = useState('');
  const [filePreview, setFilePreview] = useState<ParsedEntry[]>([]);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Suggestion state: track which row is showing suggestions
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [rowSuggestions, setRowSuggestions] = useState<CompanySuggestion[]>([]);

  const parsedTextRows = useMemo(() => parseTextLines(textInput), [textInput]);

  const autoIndustry = (name: string): string => {
    const suggestions = getCompanySuggestions(name);
    return suggestions[0]?.industry || '';
  };

  const isValidIndustry = (industry: string): boolean => {
    return (INDUSTRIES as readonly string[]).includes(industry);
  };

  const resolveIndustry = (name: string, rawIndustry: string): { industry: string; autoDetected: boolean } => {
    if (rawIndustry && isValidIndustry(rawIndustry)) {
      return { industry: rawIndustry, autoDetected: false };
    }
    const auto = autoIndustry(name);
    return { industry: auto, autoDetected: !!auto };
  };

  const handleTextImport = () => {
    if (parsedTextRows.length === 0) return;
    let autoCount = 0;
    parsedTextRows.forEach((r) => {
      const { industry, autoDetected } = resolveIndustry(r.name, r.industry);
      if (autoDetected) autoCount++;
      addCompany({
        name: r.name,
        industry: industry || undefined,
        statusId: selectedStatusId,
      });
    });
    onClose();
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const buffer = await file.arrayBuffer();
    const text = decodeBuffer(buffer);
    const parsed = parseTextLines(text);
    setFilePreview(parsed);
  }, []);

  const handleFileImport = () => {
    if (filePreview.length === 0) return;
    filePreview.forEach((r) => {
      const { industry } = resolveIndustry(r.name, r.industry);
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

  const handleNameChange = (rowId: string, value: string) => {
    updateRow(rowId, 'name', value);
    const results = getCompanySuggestions(value);
    if (results.length > 0) {
      setActiveRowId(rowId);
      setRowSuggestions(results);
    } else {
      if (activeRowId === rowId) {
        setActiveRowId(null);
        setRowSuggestions([]);
      }
    }
  };

  const handleSelectSuggestion = (rowId: string, s: CompanySuggestion) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, name: s.name, industry: s.industry || r.industry }
          : r
      )
    );
    setActiveRowId(null);
    setRowSuggestions([]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (activeRowId === id) {
      setActiveRowId(null);
      setRowSuggestions([]);
    }
  };

  const addRow = () => {
    if (rows.length >= MAX_ROWS) return;
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const validRows = rows.filter((r) => r.name.trim().length > 0);

  const handleImport = () => {
    if (validRows.length === 0) return;
    validRows.forEach((r) => {
      const resolvedStatusId = r.statusId || selectedStatusId;
      addCompany({
        name: r.name.trim(),
        industry: r.industry || undefined,
        statusId: resolvedStatusId,
        nextDeadline: r.deadline || undefined,
      });

      // Create ScheduledAction if deadline is set
      if (r.deadline) {
        const newCompanies = useAppStore.getState().companies;
        const newCompany = newCompanies[newCompanies.length - 1];
        if (newCompany) {
          const selectedStatus = statusColumns.find((s) => s.id === resolvedStatusId);
          if (selectedStatus) {
            addScheduledAction({
              companyId: newCompany.id,
              type: mapStageToActionType(selectedStatus.name),
              subType: mapStageToSubType(selectedStatus.name),
              date: r.deadline,
            });
          }
        }
      }
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
            初期選考段階（共通）
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
        <div className="flex gap-1.5 px-5 mb-3">
          {([
            { key: 'rows' as const, label: 'フォーム' },
            { key: 'text' as const, label: 'テキスト' },
            { key: 'file' as const, label: 'ファイル' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-xl ios-tap ${mode === key ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'}`}
            >
              {label}
            </button>
          ))}
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
                  {/* Row 1: Number + Company name + Delete */}
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-[var(--color-text-secondary)] w-5 text-center flex-none">
                      {idx + 1}
                    </span>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => handleNameChange(row.id, e.target.value)}
                        onFocus={() => {
                          if (row.name.trim()) {
                            const results = getCompanySuggestions(row.name);
                            if (results.length > 0) {
                              setActiveRowId(row.id);
                              setRowSuggestions(results);
                            }
                          }
                        }}
                        onBlur={() => {
                          // Delay to allow suggestion click
                          setTimeout(() => {
                            if (activeRowId === row.id) {
                              setActiveRowId(null);
                              setRowSuggestions([]);
                            }
                          }, 150);
                        }}
                        placeholder="企業名"
                        className="ios-input w-full text-[14px] !py-1.5"
                        autoFocus={idx === 0}
                      />
                      {activeRowId === row.id && rowSuggestions.length > 0 && (
                        <ul className="absolute z-10 w-full mt-1 bg-card rounded-xl shadow-lg ring-1 ring-black/10 dark:ring-white/10 overflow-hidden max-h-40 overflow-y-auto">
                          {rowSuggestions.map((s) => (
                            <li
                              key={s.name}
                              onPointerDown={(e) => {
                                e.preventDefault();
                                handleSelectSuggestion(row.id, s);
                              }}
                              className="flex items-center justify-between px-3 py-2 hover:bg-[var(--color-border)] cursor-pointer gap-2"
                            >
                              <span className="text-[13px] text-[var(--color-text)] truncate">{s.name}</span>
                              {s.industry && (
                                <span
                                  className="flex-none text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                                  style={{
                                    color: s.color,
                                    backgroundColor: `${s.color}18`,
                                  }}
                                >
                                  {s.industry}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
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
                  {/* Row 2: Industry + Status */}
                  <div className="grid grid-cols-2 gap-2 pl-7">
                    <select
                      value={row.industry}
                      onChange={(e) => updateRow(row.id, 'industry', e.target.value)}
                      className="ios-input text-[13px] !py-1.5"
                    >
                      <option value="">業界</option>
                      {INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                    <select
                      value={row.statusId}
                      onChange={(e) => updateRow(row.id, 'statusId', e.target.value)}
                      className="ios-input text-[13px] !py-1.5"
                    >
                      <option value="">選考段階（共通）</option>
                      {statusColumns.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Row 3: Date */}
                  <div className="pl-7">
                    <input
                      type="date"
                      value={row.deadline}
                      onChange={(e) => updateRow(row.id, 'deadline', e.target.value)}
                      className="ios-input w-full text-[13px] !py-1.5"
                      placeholder="日付"
                    />
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
            <div className="text-[12px] text-[var(--color-text-secondary)] mb-2 p-2 bg-[var(--color-border)]/20 rounded-lg">
              <p className="font-medium mb-1">入力方法：</p>
              <p>1行に1社ずつ企業名を入力してください。</p>
              <p>業界も入れたい場合はカンマ区切りで入力：</p>
              <p className="font-mono mt-1">ソニーグループ,メーカー</p>
              <p className="font-mono">三菱商事,商社</p>
            </div>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={'企業名,業界\nソニーグループ,メーカー\n三菱商事\t商社\n野村証券'}
              className="ios-input w-full min-h-[200px] resize-y text-[14px]"
            />
            {parsedTextRows.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-[12px] font-semibold text-[var(--color-text-secondary)]">
                  プレビュー（{parsedTextRows.length}社）
                </p>
                <div className="max-h-32 overflow-y-auto rounded-lg border border-[var(--color-border)]">
                  {parsedTextRows.slice(0, 20).map((r, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5 text-[13px] border-b border-[var(--color-border)] last:border-0">
                      <span className="text-[var(--color-text)] truncate">{r.name}</span>
                      <span className="text-[var(--color-text-secondary)] flex-none ml-2">
                        {r.industry || autoIndustry(r.name) || '—'}
                      </span>
                    </div>
                  ))}
                  {parsedTextRows.length > 20 && (
                    <p className="text-[12px] text-center text-[var(--color-text-secondary)] py-1">
                      他{parsedTextRows.length - 20}社...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* File upload mode */}
        {mode === 'file' && (
          <div className="px-5 flex-1 overflow-y-auto">
            <div className="text-[12px] text-[var(--color-text-secondary)] mb-2 p-2 bg-[var(--color-border)]/20 rounded-lg">
              <p className="font-medium mb-1">対応ファイル形式：</p>
              <p>CSV (.csv) または TSV (.tsv) ファイル</p>
              <p className="mt-1 font-medium">ファイルの作り方：</p>
              <p>1. Excelやスプレッドシートを開く</p>
              <p>2. A列に企業名、B列に業界を入力</p>
              <p>3.「CSV（カンマ区切り）」で保存</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 border-2 border-dashed border-[var(--color-primary)]/40 rounded-xl text-[var(--color-primary)] font-medium text-[14px] hover:bg-[var(--color-primary-light)] transition-colors flex items-center justify-center gap-2 ios-tap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              CSVファイルを選択
            </button>
            {fileName && (
              <p className="text-[13px] text-[var(--color-text)] mt-2 font-medium">
                {fileName}
              </p>
            )}
            {filePreview.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-[12px] font-semibold text-[var(--color-text-secondary)]">
                  {filePreview.length}社見つかりました。追加しますか？
                </p>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--color-border)]">
                  {filePreview.slice(0, 30).map((r, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5 text-[13px] border-b border-[var(--color-border)] last:border-0">
                      <span className="text-[var(--color-text)] truncate">{r.name}</span>
                      <span className="text-[var(--color-text-secondary)] flex-none ml-2">
                        {r.industry || autoIndustry(r.name) || '—'}
                      </span>
                    </div>
                  ))}
                  {filePreview.length > 30 && (
                    <p className="text-[12px] text-center text-[var(--color-text-secondary)] py-1">
                      他{filePreview.length - 30}社...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-6 pt-3 flex-shrink-0 space-y-2 border-t border-[var(--color-border)]">
          {mode === 'rows' && (
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
          )}
          {mode === 'text' && (
            <button
              onClick={handleTextImport}
              disabled={parsedTextRows.length === 0}
              className="ios-button-primary disabled:opacity-40"
            >
              {parsedTextRows.length > 0 ? `${parsedTextRows.length}社を追加する` : '追加する'}
            </button>
          )}
          {mode === 'file' && (
            <button
              onClick={handleFileImport}
              disabled={filePreview.length === 0}
              className="ios-button-primary disabled:opacity-40"
            >
              {filePreview.length > 0 ? `${filePreview.length}社を追加する` : '追加する'}
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
