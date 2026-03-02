'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Interview } from '@/lib/types';

interface InterviewFormProps {
  companyId: string;
  interview?: Interview;
  onClose: () => void;
}

export function InterviewForm({ companyId, interview, onClose }: InterviewFormProps) {
  const addInterview = useAppStore((s) => s.addInterview);
  const updateInterview = useAppStore((s) => s.updateInterview);

  const [date, setDate] = useState(
    interview ? interview.datetime.split('T')[0] : ''
  );
  const [time, setTime] = useState(
    interview ? interview.datetime.split('T')[1]?.substring(0, 5) ?? '' : ''
  );
  const [type, setType] = useState(interview?.type ?? '');
  const [location, setLocation] = useState(interview?.location ?? '');
  const [memo, setMemo] = useState(interview?.memo ?? '');

  const handleSubmit = () => {
    if (!date || !time || !type.trim()) return;

    const datetime = `${date}T${time}:00`;

    if (interview) {
      updateInterview(interview.id, {
        datetime,
        type: type.trim(),
        location: location.trim() || undefined,
        memo: memo.trim() || undefined,
      });
    } else {
      addInterview({
        companyId,
        datetime,
        type: type.trim(),
        location: location.trim() || undefined,
        memo: memo.trim() || undefined,
      });
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
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">日付</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="ios-input"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">時間</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="ios-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">面接種別</label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="ios-input"
              placeholder="例: 一次面接"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">場所</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="ios-input flex-1"
                placeholder="例: 本社 or オンライン"
              />
              <button
                onClick={() => setLocation('オンライン')}
                className="px-4 text-[var(--color-primary)] text-[15px] font-medium ios-tap whitespace-nowrap"
              >
                オンライン
              </button>
            </div>
          </div>

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
