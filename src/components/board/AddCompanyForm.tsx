'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { COMPANY_SUGGESTIONS } from '@/lib/companySuggestions';

interface AddCompanyFormProps {
  onClose: () => void;
}

export function AddCompanyForm({ onClose }: AddCompanyFormProps) {
  const addCompany = useAppStore((s) => s.addCompany);
  const activeTrack = useAppStore((s) => s.activeTrack);
  const statusColumns = useAppStore((s) => s.statusColumns);

  const trackStatuses = statusColumns
    .filter((s) => s.trackType === activeTrack)
    .sort((a, b) => a.order - b.order);

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [url, setUrl] = useState('');
  const [deadline, setDeadline] = useState('');
  const [statusId, setStatusId] = useState(trackStatuses[0]?.id ?? '');
  const [nameError, setNameError] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
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
      trackType: activeTrack,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-card rounded-t-2xl md:rounded-2xl w-full max-w-lg animate-slide-up">
        {/* Grab bar */}
        <div className="flex justify-center pt-2 pb-0 md:hidden">
          <div className="w-9 h-1 bg-[var(--color-border)] rounded-full" />
        </div>

        <div className="px-4 pt-4 pb-2">
          <h2 className="text-[17px] font-bold text-center text-[var(--color-text)]">企業を追加</h2>
        </div>

        <div className="p-4 space-y-4">
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
                const trimmed = val.trim();
                if (trimmed.length > 0) {
                  const filtered = COMPANY_SUGGESTIONS.filter((s) =>
                    s.startsWith(trimmed)
                  ).slice(0, 5);
                  setSuggestions(filtered);
                  setShowSuggestions(filtered.length > 0);
                } else {
                  setSuggestions([]);
                  setShowSuggestions(false);
                }
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
                    key={s}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setName(s);
                      setShowSuggestions(false);
                    }}
                    className="px-4 py-2.5 text-[15px] text-[var(--color-text)] hover:bg-[var(--color-border)] cursor-pointer"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>

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

          <div>
            <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">締切日</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="ios-input"
            />
          </div>

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

          <button onClick={handleSubmit} className="ios-button-primary">
            追加する
          </button>
          <button onClick={onClose} className="ios-button-secondary">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
