'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { INTERVIEW_TYPES } from '@/lib/types';
import type { Interview } from '@/lib/types';

interface InterviewFormProps {
  companyId: string;
  interview?: Interview;
  onClose: () => void;
}

const LOCATION_PRESETS = ['オンライン', '本社', '支社', '別会場'];

function addHour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const endH = (h + 1) % 24;
  return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const INTERVIEW_TYPE_TO_STATUS: Partial<Record<string, string>> = {
  '一次面接': '1次面接',
  '二次面接': '2次面接',
  '最終面接': '最終面接',
};

export function InterviewForm({ companyId, interview, onClose }: InterviewFormProps) {
  const addInterview = useAppStore((s) => s.addInterview);
  const updateInterview = useAppStore((s) => s.updateInterview);
  const companies = useAppStore((s) => s.companies);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const updateCompany = useAppStore((s) => s.updateCompany);

  const [date, setDate] = useState(
    interview ? interview.datetime.split('T')[0] : ''
  );
  const [time, setTime] = useState(
    interview ? interview.datetime.split('T')[1]?.substring(0, 5) ?? '' : ''
  );
  const [endTime, setEndTime] = useState(interview?.endTime ?? '');
  const [type, setType] = useState(interview?.type ?? '');
  const [location, setLocation] = useState(interview?.location ?? '');
  const [memo, setMemo] = useState(interview?.memo ?? '');

  const handleStartTimeChange = (t: string) => {
    setTime(t);
    if (t && !endTime) {
      setEndTime(addHour(t));
    }
  };

  const autoAdvanceStatus = (interviewType: string) => {
    const targetStatusName = INTERVIEW_TYPE_TO_STATUS[interviewType];
    if (!targetStatusName) return;
    const company = companies.find((c) => c.id === companyId);
    if (!company) return;
    const sortedCols = [...statusColumns].sort((a, b) => a.order - b.order);
    const currentOrder = sortedCols.findIndex((col) => col.id === company.statusId);
    const targetCol = statusColumns.find((col) => col.name === targetStatusName);
    if (!targetCol) return;
    const targetOrder = sortedCols.findIndex((col) => col.id === targetCol.id);
    if (targetOrder > currentOrder) {
      updateCompany(companyId, { statusId: targetCol.id });
    }
  };

  const handleSubmit = () => {
    if (!date || !time || !type.trim()) return;

    const datetime = `${date}T${time}:00`;
    const trimmedType = type.trim();

    if (interview) {
      updateInterview(interview.id, {
        datetime,
        endTime: endTime || undefined,
        type: trimmedType,
        location: location.trim() || undefined,
        memo: memo.trim() || undefined,
      });
    } else {
      addInterview({
        companyId,
        datetime,
        endTime: endTime || undefined,
        type: trimmedType,
        location: location.trim() || undefined,
        memo: memo.trim() || undefined,
      });
      autoAdvanceStatus(trimmedType);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-card rounded-t-2xl md:rounded-2xl w-full max-w-lg animate-slide-up">
        {/* Grab bar */}
        <div className="flex justify-center pt-2 pb-0 md:hidden">
          <div className="w-9 h-1 bg-[var(--color-border)] rounded-full" />
        </div>

        <div className="px-4 pt-4 pb-2">
          <h2 className="text-[17px] font-bold text-center text-[var(--color-text)]">
            {interview ? '面接を編集' : '面接を追加'}
          </h2>
        </div>

        <div className="p-4 space-y-4">
          {/* 日付 + 開始時間 + 終了時間 */}
          <div className="flex gap-2">
            <div className="flex-[2]">
              <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">日付</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="ios-input"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">開始</label>
              <input
                type="time"
                value={time}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="ios-input"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">終了</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="ios-input"
              />
            </div>
          </div>

          {/* 面接種別 */}
          <div>
            <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">面接種別</label>
            <select
              value={INTERVIEW_TYPES.includes(type as typeof INTERVIEW_TYPES[number]) ? type : 'その他'}
              onChange={(e) => setType(e.target.value)}
              className="ios-input"
            >
              {INTERVIEW_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* 場所 */}
          <div>
            <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">場所</label>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {LOCATION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setLocation(location === preset ? '' : preset)}
                  className={`px-3 py-1.5 rounded-full text-[13px] font-semibold ios-tap transition-all ${
                    location === preset
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="ios-input"
              placeholder="その他の場所を入力"
            />
          </div>

          {/* メモ */}
          <div>
            <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">メモ</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="ios-input !min-h-[80px] resize-y"
              placeholder="メモ（任意）"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!date || !time || !type.trim()}
            className="ios-button-primary"
          >
            {interview ? '更新' : '追加する'}
          </button>
          <button onClick={onClose} className="ios-button-secondary">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
