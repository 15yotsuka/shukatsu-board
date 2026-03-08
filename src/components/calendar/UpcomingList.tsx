'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { format, isAfter, startOfDay, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CompanyDetailModal } from '@/components/board/CompanyDetailModal';
import { ACTION_TYPE_LABELS, ACTION_TYPE_COLORS } from '@/lib/types';
import type { Company } from '@/lib/types';
import { type FilterKind, ALL_FILTERS } from '@/components/calendar/FilterChips';

type UnifiedItem =
  | { kind: 'interview'; sortKey: string; companyId: string; label: string; sub: string; color: string }
  | { kind: 'action'; sortKey: string; companyId: string; label: string; sub: string; color: string };

interface UpcomingListProps {
  activeFilters?: Set<FilterKind>;
}

export function UpcomingList({ activeFilters }: UpcomingListProps) {
  const filters = activeFilters ?? new Set(ALL_FILTERS);
  const interviews = useAppStore((s) => s.interviews);
  const scheduledActions = useAppStore((s) => s.scheduledActions);
  const companies = useAppStore((s) => s.companies);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const today = startOfDay(new Date());

  const getCompanyName = (id: string) => companies.find((c) => c.id === id)?.name ?? '不明な企業';
  const getCompany = (id: string) => companies.find((c) => c.id === id);

  const toFilterKind = (type: string | undefined): FilterKind => {
    if (type === 'es') return 'es';
    if (type === 'webtest') return 'webtest';
    if (type === 'final') return 'interview';
    if (type === 'interview') return 'interview';
    return 'other';
  };

  const interviewItems: UnifiedItem[] = filters.has('interview')
    ? interviews
        .filter((i) => isAfter(new Date(i.datetime), today) || format(new Date(i.datetime), 'yyyy-MM-dd') === todayStr)
        .map((i) => ({
          kind: 'interview' as const,
          sortKey: i.datetime,
          companyId: i.companyId,
          label: `${i.type} - ${getCompanyName(i.companyId)}`,
          sub: format(new Date(i.datetime), 'M/d（E）HH:mm', { locale: ja }),
          color: ACTION_TYPE_COLORS.interview,
        }))
    : [];

  const actionItems: UnifiedItem[] = scheduledActions
    .filter((a) => a.date >= todayStr && filters.has(toFilterKind(a.type)))
    .map((a) => ({
      kind: 'action' as const,
      sortKey: a.date,
      companyId: a.companyId,
      label: `${ACTION_TYPE_LABELS[a.type]} - ${getCompanyName(a.companyId)}`,
      sub: format(parseISO(a.date), 'M/d（E）', { locale: ja }),
      color: ACTION_TYPE_COLORS[a.type],
    }));

  const deadlineItems: UnifiedItem[] = filters.has('deadline')
    ? companies
        .filter((c) => c.nextDeadline && c.nextDeadline >= todayStr)
        .map((c) => ({
          kind: 'action' as const,
          sortKey: c.nextDeadline! + 'T00:00:00',
          companyId: c.id,
          label: `締切 - ${c.name}`,
          sub: format(parseISO(c.nextDeadline!), 'M/d（E）', { locale: ja }),
          color: '#FF3B30',
        }))
    : [];

  const unified = [...interviewItems, ...actionItems, ...deadlineItems]
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .slice(0, 10);

  if (unified.length === 0) {
    return (
      <div className="bg-card dark:bg-zinc-900 rounded-xl p-4 mb-4">
        <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">直近の予定</h3>
        <p className="text-[14px] text-[var(--color-text-secondary)] text-center py-4">予定はまだありません</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card dark:bg-zinc-900 rounded-xl mb-4 overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">直近の予定</h3>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {unified.map((item, idx) => (
            <div
              key={idx}
              onClick={() => {
                const c = getCompany(item.companyId);
                if (c) setSelectedCompany(c);
              }}
              className="flex items-center gap-3 px-4 py-3 ios-tap cursor-pointer"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-[var(--color-text)] truncate">{item.label}</p>
                <p className="text-[13px] text-[var(--color-text-secondary)]">{item.sub}</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[var(--color-border)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          ))}
        </div>
      </div>

      {selectedCompany && (
        <CompanyDetailModal
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      )}
    </>
  );
}
