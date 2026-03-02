'use client';

import { useAppStore } from '@/store/useAppStore';
import { TrackTabs } from '@/components/layout/TrackTabs';
import { DeadlineReminder } from '@/components/board/DeadlineReminder';
import { TodayDeadlineCarousel } from '@/components/board/TodayDeadlineCarousel';

export default function Home() {
  const companies = useAppStore((s) => s.companies);
  const statusColumns = useAppStore((s) => s.statusColumns);

  const getStatusName = (statusId: string) =>
    statusColumns.find((s) => s.id === statusId)?.name ?? '';

  const totalEntries = companies.length;
  const interviewingCount = companies.filter((c) =>
    getStatusName(c.statusId).includes('面接')
  ).length;
  const internCount = companies.filter((c) =>
    getStatusName(c.statusId) === 'インターン参加'
  ).length;
  const offerCount = companies.filter((c) =>
    getStatusName(c.statusId) === '内定'
  ).length;

  const stats = [
    { label: 'エントリー', value: totalEntries, unit: '社', color: 'text-[var(--color-text)]' },
    { label: '面接中', value: interviewingCount, unit: '社', color: 'text-[var(--color-primary)]' },
    { label: 'インターン参加', value: internCount, unit: '社', color: 'text-[var(--color-success)]' },
    { label: '内定', value: offerCount, unit: '社', color: 'text-[var(--color-warning)]' },
  ];

  return (
    <div className="pb-24">
      <TrackTabs />
      <DeadlineReminder />

      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[14px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
            現在の進捗
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-[var(--color-border)]"
            >
              <p className="text-xs text-[var(--color-text-secondary)] mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-bold ${stat.color}`}>{stat.value}</span>
                <span className="text-xs text-[var(--color-text-secondary)]">{stat.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TodayDeadlineCarousel />
    </div>
  );
}
