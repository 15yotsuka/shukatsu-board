'use client';

import { GRAD_YEARS, GRAD_YEAR_LABELS, type GradYear } from '@/lib/gradYears';
import { useAppStore } from '@/store/useAppStore';

export default function GradYearSelectModal() {
  const gradYear = useAppStore((state) => state.gradYear);
  const setGradYear = useAppStore((state) => state.setGradYear);

  if (gradYear !== null) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-[var(--color-bg)] rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl">
        <h2 className="text-[20px] font-bold text-[var(--color-text)] text-center mb-2">
          ようこそ！
        </h2>
        <p className="text-[14px] text-[var(--color-text-secondary)] text-center mb-6">
          あなたの卒業年度を選んでください
        </p>
        <div className="space-y-3">
          {GRAD_YEARS.map((year) => (
            <button
              key={year}
              onClick={() => setGradYear(year as GradYear)}
              className="w-full py-4 px-4 rounded-xl border-2 border-[var(--color-border)] text-[var(--color-text)] font-semibold text-[17px] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors ios-tap"
            >
              {GRAD_YEAR_LABELS[year as GradYear]}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-[var(--color-text-secondary)] text-center mt-4">
          設定画面からいつでも変更できます
        </p>
      </div>
    </div>
  );
}
