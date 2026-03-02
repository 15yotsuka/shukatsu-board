'use client';

import { useAppStore } from '@/store/useAppStore';
import type { TrackType } from '@/lib/types';

const tabs: { value: TrackType; label: string }[] = [
  { value: 'intern', label: 'インターン' },
  { value: 'main', label: '本選考' },
];

export function TrackTabs() {
  const activeTrack = useAppStore((s) => s.activeTrack);
  const setActiveTrack = useAppStore((s) => s.setActiveTrack);

  return (
    <div className="sticky top-14 z-40 bg-[var(--color-bg)] dark:bg-zinc-950 px-4 py-3">
      <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-lg p-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTrack(tab.value)}
            className={`flex-1 py-2 text-[13px] font-semibold rounded-md transition-all duration-200 ${activeTrack === tab.value
              ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-zinc-400'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
