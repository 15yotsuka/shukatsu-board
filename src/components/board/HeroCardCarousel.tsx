'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { useAppStore } from '@/store/useAppStore';
import { parseISO, startOfDay, addDays, isWithinInterval, format, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';

type HeroMode = 'deadline' | 'interview' | 'custom';

export function HeroCardCarousel() {
  const companies = useAppStore((s) => s.companies);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const interviews = useAppStore((s) => s.interviews);

  const [mode, setMode] = useState<HeroMode>('deadline');
  const [customText, setCustomText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [tempMode, setTempMode] = useState<HeroMode>('deadline');
  const [tempCustomText, setTempCustomText] = useState('');

  const [emblaRef] = useEmblaCarousel({ dragFree: true, containScroll: 'trimSnaps' });

  useEffect(() => {
    const saved = localStorage.getItem('heroCardMode') as HeroMode | null;
    const savedText = localStorage.getItem('heroCardCustomText') ?? '';
    if (saved) setMode(saved);
    setCustomText(savedText);
  }, []);

  const today = startOfDay(new Date());
  const limit = addDays(today, 7);

  const deadlineItems = companies
    .filter((c) => {
      if (!c.nextDeadline) return false;
      const d = parseISO(c.nextDeadline);
      if (!isValid(d)) return false;
      const dayStart = startOfDay(d);
      return isWithinInterval(dayStart, { start: today, end: limit });
    })
    .sort((a, b) => a.nextDeadline!.localeCompare(b.nextDeadline!));

  const interviewItems = interviews
    .filter((i) => new Date(i.datetime) >= today)
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
    .slice(0, 10);

  const getStatusName = (statusId: string) =>
    statusColumns.find((s) => s.id === statusId)?.name ?? '';
  const getCompanyName = (companyId: string) =>
    companies.find((c) => c.id === companyId)?.name ?? '';

  const openSettings = () => {
    setTempMode(mode);
    setTempCustomText(customText);
    setShowSettings(true);
  };

  const saveSettings = () => {
    setMode(tempMode);
    setCustomText(tempCustomText);
    localStorage.setItem('heroCardMode', tempMode);
    localStorage.setItem('heroCardCustomText', tempCustomText);
    setShowSettings(false);
  };

  const hasContent =
    mode === 'custom'
      ? !!customText.trim()
      : mode === 'deadline'
      ? deadlineItems.length > 0
      : interviewItems.length > 0;

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between mb-3 px-5">
        <h2 className="text-[13px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
          {mode === 'deadline' ? '直近の締切' : mode === 'interview' ? '次の面接' : 'メモ'}
        </h2>
        <button
          onClick={openSettings}
          className="w-11 h-11 flex items-center justify-center text-[var(--color-text-secondary)] ios-tap"
          aria-label="ヒーローカード設定"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {!hasContent && mode !== 'custom' ? (
        <div className="px-4">
          <div className="w-full bg-gradient-to-br from-blue-600 to-blue-900 rounded-3xl p-6 shadow-2xl">
            <p className="text-[13px] font-semibold text-blue-200 uppercase tracking-widest mb-2">
              {mode === 'deadline' ? '締切管理' : '面接管理'}
            </p>
            <p className="text-[18px] font-bold text-white mb-1">
              {mode === 'deadline' ? '予定を登録すると、ここに表示されます' : '面接予定を追加しよう'}
            </p>
            <p className="text-[13px] text-blue-300 leading-relaxed">
              {mode === 'deadline'
                ? '企業の詳細画面から締切日を設定すると、ここに表示されます'
                : '企業の詳細画面から面接予定を追加すると、ここに表示されます'}
            </p>
          </div>
        </div>
      ) : mode === 'custom' ? (
        <div className="px-4">
          <div className="w-full bg-gradient-to-br from-blue-600 to-blue-900 rounded-3xl p-6 shadow-2xl">
            <p className="text-[16px] text-white whitespace-pre-wrap">{customText || '—'}</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden pl-4" ref={emblaRef}>
          <div className="flex gap-3 pr-4">
            {mode === 'deadline' &&
              deadlineItems.map((c) => {
                const parsed = parseISO(c.nextDeadline!);
                const dateLabel = isValid(parsed) ? format(parsed, 'M/d (E)', { locale: ja }) : c.nextDeadline!;
                return (
                  <div
                    key={c.id}
                    className="flex-none w-[88vw] max-w-sm bg-gradient-to-br from-blue-600 to-blue-900 rounded-3xl p-6 shadow-2xl"
                  >
                    <p className="text-[17px] font-bold text-white mb-2">{c.name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-full px-2.5 py-0.5 text-[12px] font-medium bg-white/20 text-white">
                        {getStatusName(c.statusId)}
                      </span>
                      <span className="text-[13px] font-semibold text-white/90">{dateLabel}</span>
                    </div>
                  </div>
                );
              })}
            {mode === 'interview' &&
              interviewItems.map((i) => (
                <div
                  key={i.id}
                  className="flex-none w-[88vw] max-w-sm bg-gradient-to-br from-blue-600 to-blue-900 rounded-3xl p-6 shadow-2xl"
                >
                  <Clock className="w-5 h-5 text-white/70 mb-2" />
                  <p className="text-[17px] font-bold text-white mb-2">{getCompanyName(i.companyId)}</p>
                  <p className="text-[14px] font-medium text-white/80 mb-1">{i.type}</p>
                  <p className="text-[13px] font-semibold text-white">
                    {(() => { const d = new Date(i.datetime); return isValid(d) ? format(d, 'M/d (E) HH:mm', { locale: ja }) : i.datetime; })()}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />
          <div className="relative bg-card w-full max-w-lg rounded-t-2xl p-5 pb-8 space-y-4 shadow-2xl">
            <div className="flex justify-center mb-1">
              <div className="w-9 h-1 bg-[var(--color-border)] rounded-full" />
            </div>
            <h3 className="text-[17px] font-bold text-[var(--color-text)]">ヒーローカードの表示</h3>
            {(['deadline', 'interview', 'custom'] as HeroMode[]).map((m) => (
              <label key={m} className="flex items-center gap-3 cursor-pointer ios-tap">
                <input
                  type="radio"
                  name="heroMode"
                  value={m}
                  checked={tempMode === m}
                  onChange={() => setTempMode(m)}
                  className="accent-[var(--color-primary)] w-4 h-4"
                />
                <span className="text-[15px] text-[var(--color-text)]">
                  {m === 'deadline' ? '今日の締切' : m === 'interview' ? '次の面接' : 'カスタムテキスト'}
                </span>
              </label>
            ))}
            {tempMode === 'custom' && (
              <textarea
                value={tempCustomText}
                onChange={(e) => setTempCustomText(e.target.value)}
                placeholder="表示したいテキストを入力..."
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 text-[15px] text-[var(--color-text)] min-h-[80px] outline-none resize-none"
              />
            )}
            <button onClick={saveSettings} className="ios-button-primary">
              保存
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
