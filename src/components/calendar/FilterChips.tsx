'use client';

import { ACTION_TYPE_COLORS } from '@/lib/types';

export type FilterKind = 'interview' | 'es' | 'webtest' | 'final' | 'deadline' | 'other';

export const FILTER_LABELS: Record<FilterKind, string> = {
  interview: '面接',
  es: 'ES提出',
  webtest: 'Webテスト',
  final: '最終面接',
  deadline: '締切',
  other: 'その他',
};

export const FILTER_COLORS: Record<FilterKind, string> = {
  interview: ACTION_TYPE_COLORS.interview,
  es: ACTION_TYPE_COLORS.es,
  webtest: ACTION_TYPE_COLORS.webtest,
  final: ACTION_TYPE_COLORS.final,
  deadline: '#FF3B30',
  other: ACTION_TYPE_COLORS.other,
};

export const ALL_FILTERS: FilterKind[] = ['interview', 'es', 'webtest', 'final', 'deadline', 'other'];

interface FilterChipsProps {
  active: Set<FilterKind>;
  onChange: (next: Set<FilterKind>) => void;
}

export function FilterChips({ active, onChange }: FilterChipsProps) {
  const toggle = (kind: FilterKind) => {
    const next = new Set(active);
    if (next.has(kind)) {
      if (next.size === 1) return; // keep at least one active
      next.delete(kind);
    } else {
      next.add(kind);
    }
    onChange(next);
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {ALL_FILTERS.map((kind) => {
        const isOn = active.has(kind);
        const color = FILTER_COLORS[kind];
        return (
          <button
            key={kind}
            type="button"
            onClick={() => toggle(kind)}
            className={`flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold ios-tap transition-all ${
              isOn
                ? 'text-white'
                : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
            }`}
            style={isOn ? { backgroundColor: color } : undefined}
          >
            <span
              className="w-2 h-2 rounded-full flex-none"
              style={{ backgroundColor: isOn ? 'rgba(255,255,255,0.7)' : color }}
            />
            {FILTER_LABELS[kind]}
          </button>
        );
      })}
    </div>
  );
}
