'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { useAppStore } from '@/store/useAppStore';
import { format, parseISO, isWithinInterval, addDays, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';

export function TodayDeadlineCarousel() {
  const companies = useAppStore((s) => s.companies);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const [emblaRef] = useEmblaCarousel({ dragFree: true, containScroll: 'trimSnaps' });

  const today = startOfDay(new Date());
  const limit = addDays(today, 7);

  const upcoming = companies
    .filter((c) => {
      if (!c.nextDeadline) return false;
      const d = startOfDay(parseISO(c.nextDeadline));
      return isWithinInterval(d, { start: today, end: limit });
    })
    .sort((a, b) => a.nextDeadline!.localeCompare(b.nextDeadline!));

  if (upcoming.length === 0) return null;

  return (
    <section className="px-4 mt-4">
      <h2 className="text-[14px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3 px-1">
        直近の締切
      </h2>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3">
          {upcoming.map((c) => {
            const status = statusColumns.find((s) => s.id === c.statusId);
            const deadlineDate = parseISO(c.nextDeadline!);
            const dateLabel = format(deadlineDate, 'M/d (E)', { locale: ja });
            return (
              <div
                key={c.id}
                className="flex-none w-44 bg-card dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-[var(--color-border)]"
              >
                <p className="text-[15px] font-bold text-[var(--color-text)] truncate mb-2">{c.name}</p>
                <p className="text-[13px] font-semibold text-[var(--color-danger)] mb-2">{dateLabel}</p>
                {status && (
                  <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                    {status.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
