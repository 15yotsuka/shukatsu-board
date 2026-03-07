'use client';

import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { DeadlineReminder } from '@/components/board/DeadlineReminder';
import { HeroCardCarousel } from '@/components/board/HeroCardCarousel';
import { MiniWeekCalendar } from '@/components/board/MiniWeekCalendar';

export default function Home() {
  const companies = useAppStore((s) => s.companies);
  const statusColumns = useAppStore((s) => s.statusColumns);

  const getCount = (statusNames: string[]) => {
    const ids = statusColumns
      .filter((col) => statusNames.includes(col.name))
      .map((col) => col.id);
    return companies.filter((c) => ids.includes(c.statusId)).length;
  };

  const entryCount = getCount(['未エントリー', 'ES作成中', 'ES提出済', 'Webテスト受検済']);
  const interviewingCount = getCount(['1次面接', '2次面接', '最終面接']);
  const internCount = getCount(['インターン選考中']);
  const offerCount = getCount(['内定']);

  const stats = [
    { label: 'エントリー', value: entryCount, unit: '社', color: 'text-[var(--color-text)]', href: '/tasks?filter=エントリー' },
    { label: '面接中', value: interviewingCount, unit: '社', color: 'text-[var(--color-primary)]', href: '/tasks?filter=面接中' },
    { label: 'インターン', value: internCount, unit: '社', color: 'text-[var(--color-success)]', href: '/tasks?filter=インターン選考中' },
    { label: '内定', value: offerCount, unit: '社', color: 'text-[var(--color-warning)]', href: '/tasks?filter=内定' },
  ];

  return (
    <div className="pb-24">
      <DeadlineReminder />
      <HeroCardCarousel />

      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-[14px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
            現在の進捗
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-card dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-[var(--color-border)] block cursor-pointer active:scale-95 transition-transform duration-100 hover:brightness-95 select-none"
            >
              <p className="text-xs text-[var(--color-text-secondary)] mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-bold ${stat.color}`}>{stat.value}</span>
                <span className="text-xs text-[var(--color-text-secondary)]">{stat.unit}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <MiniWeekCalendar />
    </div>
  );
}
