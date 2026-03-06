'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { getCompanySuggestions, type CompanySuggestion } from '@/lib/companySuggestions';
import { PRIORITY_CONFIG, type CompanyPriority } from '@/lib/types';

interface AddCompanyFormProps {
  onClose: () => void;
}

export function AddCompanyForm({ onClose }: AddCompanyFormProps) {
  const addCompany = useAppStore((s) => s.addCompany);
  const statusColumns = useAppStore((s) => s.statusColumns);

  const trackStatuses = [...statusColumns].sort((a, b) => a.order - b.order);

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [url, setUrl] = useState('');
  const [deadline, setDeadline] = useState('');
  const [statusId, setStatusId] = useState(trackStatuses[0]?.id ?? '');
  const [priority, setPriority] = useState<CompanyPriority | ''>('');
  const [nameError, setNameError] = useState('');
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('企業名は必須です');
      return;
    }

    addCompany({
      name: trimmed,
      industry: industry.trim() || undefined,
      url: url.trim() || undefined,
      nextDeadline: deadline.trim() || undefined,
      statusId,
      priority: priority || undefined,
    });
    onClose();
  };

  const handleSelectSuggestion = (s: CompanySuggestion) => {
    setName(s.name);
    if (s.industry) setIndustry(s.industry);
    setShowSuggestions(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <motion.div
        className="absolute inset-0 bg-black/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-card rounded-t-2xl md:rounded-2xl w-full max-w-lg"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
      >
        {/* Grab bar */}
        <div className="flex justify-center pt-2 pb-0 md:hidden">
          <div className="w-9 h-1 bg-[var(--color-border)] rounded-full" />
        </div>

        <div className="px-4 pt-4 pb-2">
          <h2 className="text-[17px] font-bold text-center text-[var(--color-text)]">企業を追加</h2>
        </div>

        <div className="p-4 space-y-4">
          {/* 企業名 + サジェスト */}
          <div className="relative">
            <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">
              企業名 <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                const val = e.target.value;
                setName(val);
                setNameError('');
                const results = getCompanySuggestions(val);
                setSuggestions(results);
                setShowSuggestions(results.length > 0);
              }}
              className={`ios-input ${nameError ? '!shadow-[0_0_0_3px_rgba(255,59,48,0.3)]' : ''}`}
              placeholder="例: 株式会社○○"
              autoFocus
            />
            {nameError && <p className="text-[var(--color-danger)] text-[12px] mt-1">{nameError}</p>}
            {showSuggestions && (
              <ul className="absolute z-10 w-full mt-1 bg-card rounded-xl shadow-lg ring-1 ring-black/10 dark:ring-white/10 overflow-hidden">
                {suggestions.map((s) => (
                  <li
                    key={s.name}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handleSelectSuggestion(s);
                    }}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--color-border)] cursor-pointer gap-3"
                  >
                    <span className="text-[15px] text-[var(--color-text)] truncate">{s.name}</span>
                    {s.industry && (
                      <span
                        className="flex-none text-[11px] font-semibold px-2 py-0.5 rounded-full"
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

          {/* 業界 */}
          <div>
            <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">業界</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="ios-input"
              placeholder="例: IT・通信"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="ios-input"
              placeholder="https://..."
            />
          </div>

          {/* 締切日 */}
          <div>
            <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">締切日</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="ios-input"
            />
          </div>

          {/* 初期ステータス */}
          <div>
            <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">初期ステータス</label>
            <select
              value={statusId}
              onChange={(e) => setStatusId(e.target.value)}
              className="ios-input"
            >
              {trackStatuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* 優先度タグ */}
          <div>
            <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">優先度タグ</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(PRIORITY_CONFIG) as [CompanyPriority, typeof PRIORITY_CONFIG[CompanyPriority]][]).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPriority(priority === key ? '' : key)}
                  className={`px-3 py-1 rounded-full text-[13px] font-semibold transition-all ios-tap ${
                    priority === key
                      ? config.className + ' ring-2 ring-current'
                      : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSubmit} className="ios-button-primary">
            追加する
          </button>
          <button onClick={onClose} className="ios-button-secondary">
            キャンセル
          </button>
        </div>
      </motion.div>
    </div>
  );
}
