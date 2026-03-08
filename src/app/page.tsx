'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/shallow';
import { CompanyDetailModal } from '@/components/board/CompanyDetailModal';
import { ErrorBoundary } from '@/components/board/ErrorBoundary';
import { AnimatePresence } from 'framer-motion';
import { ACTION_TYPE_LABELS, TAG_CONFIG } from '@/lib/types';
import type { Company, Tag } from '@/lib/types';
import { format, parseISO, isValid, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';

interface TodoItem {
  id: string;
  companyId: string;
  companyName: string;
  label: string;
  date: string;
  time?: string;
  tags?: Tag[];
}

export default function Home() {
  const companies = useAppStore((s) => s.companies);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const scheduledActions = useAppStore((s) => s.scheduledActions);
  const interviews = useAppStore((s) => s.interviews);
  const displaySettings = useAppStore(useShallow((s) => s.displaySettings));

  const router = useRouter();
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekEnd = format(addDays(new Date(), 7), 'yyyy-MM-dd');

  const companyMap = useMemo(() => {
    const map = new Map<string, { name: string; tags?: Tag[] }>();
    companies.forEach((c) => map.set(c.id, { name: c.name, tags: c.tags }));
    return map;
  }, [companies]);

  const todoItems = useMemo((): TodoItem[] => {
    const items: TodoItem[] = [];

    scheduledActions
      .filter((a) => a.date >= today)
      .forEach((a) => {
        const aData = companyMap.get(a.companyId);
        items.push({
          id: `action-${a.id}`,
          companyId: a.companyId,
          companyName: aData?.name ?? '不明',
          label: ACTION_TYPE_LABELS[a.type] ?? a.type,
          date: a.date,
          time: a.time,
          tags: aData?.tags,
        });
      });

    interviews
      .filter((i) => {
        const dt = parseISO(i.datetime);
        return isValid(dt) && format(dt, 'yyyy-MM-dd') >= today;
      })
      .forEach((i) => {
        const dt = parseISO(i.datetime);
        const dateStr = format(dt, 'yyyy-MM-dd');
        const timeStr = format(dt, 'HH:mm');
        const iData = companyMap.get(i.companyId);
        items.push({
          id: `interview-${i.id}`,
          companyId: i.companyId,
          companyName: iData?.name ?? '不明',
          label: i.type || '面接',
          date: dateStr,
          time: timeStr !== '00:00' ? timeStr : undefined,
          tags: iData?.tags,
        });
      });

    // 企業の直接締切日（nextActionDate）
    companies.forEach((c) => {
      if (!c.nextActionDate || c.nextActionDate < today) return;
      const d = parseISO(c.nextActionDate);
      if (!isValid(d)) return;
      items.push({
        id: `deadline-${c.id}`,
        companyId: c.id,
        companyName: c.name,
        label: ACTION_TYPE_LABELS[c.nextActionType ?? 'other'] ?? 'アクション',
        date: c.nextActionDate,
        time: c.nextActionTime,
        tags: c.tags,
      });
    });

    items.sort((a, b) => {
      const dc = a.date.localeCompare(b.date);
      if (dc !== 0) return dc;
      if (a.time && b.time) return a.time.localeCompare(b.time);
      return a.time ? -1 : b.time ? 1 : 0;
    });

    return items;
  }, [scheduledActions, interviews, companies, companyMap, today]);

  const todayItems = todoItems.filter((i) => i.date === today);
  const thisWeekItems = todoItems.filter((i) => i.date > today && i.date <= weekEnd);
  const laterItems = todoItems.filter((i) => i.date > weekEnd);

  const getCount = (statusNames: string[]) => {
    const ids = statusColumns
      .filter((col) => statusNames.includes(col.name))
      .map((col) => col.id);
    return companies.filter((c) => ids.includes(c.statusId)).length;
  };

  const activeCount = getCount(['未エントリー', 'ES作成中', 'ES提出済', 'Webテスト受検済', '1次面接', '2次面接', '最終面接', 'インターン選考中']);
  const offerCount = getCount(['内定']);
  const sayonaraCount = getCount(['お見送り']);

  const handleItemClick = (companyId: string) => {
    const c = companies.find((co) => co.id === companyId);
    if (c) setSelectedCompany(c);
  };

  const renderTodoItem = (item: TodoItem) => {
    const d = parseISO(item.date);
    const dateStr = isValid(d) ? format(d, 'M/d(E)', { locale: ja }) : item.date;
    return (
      <button
        key={item.id}
        onClick={() => handleItemClick(item.companyId)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-card rounded-2xl shadow-sm border border-[var(--color-border)] text-left ios-tap active:scale-[0.98] transition-transform"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[15px] font-semibold text-[var(--color-text)] truncate">{item.companyName}</p>
            {displaySettings.showTag && item.tags && item.tags.map((tag) => TAG_CONFIG[tag] && (
              <span key={tag} className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-none ${TAG_CONFIG[tag].className}`}>
                {TAG_CONFIG[tag].label}
              </span>
            ))}
          </div>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            {item.label}
            {item.time && ` ${item.time}`}
          </p>
        </div>
        <span className="flex-none text-[13px] font-medium text-[var(--color-text-secondary)] whitespace-nowrap">{dateStr}</span>
      </button>
    );
  };

  const renderSection = (title: string, items: TodoItem[], emptyText?: string) => (
    <div key={title} className="mb-5">
      <h2 className="text-[13px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider px-1 mb-2">{title}</h2>
      {items.length === 0 && emptyText ? (
        <p className="text-[13px] text-[var(--color-text-secondary)] px-1 py-1">{emptyText}</p>
      ) : (
        <div className="space-y-2">{items.map(renderTodoItem)}</div>
      )}
    </div>
  );

  return (
    <div className="pb-28 px-4 pt-4">


      {todoItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[16px] font-semibold text-[var(--color-text)] mb-1">予定はありません</p>
          <p className="text-[13px] text-[var(--color-text-secondary)]">企業ページから予定アクションを追加してください</p>
        </div>
      ) : (
        <>
          {renderSection('今日', todayItems, 'なし')}
          {renderSection('今週', thisWeekItems, 'なし')}
          {laterItems.length > 0 && renderSection('それ以降', laterItems)}
        </>
      )}

      {/* Stat chips */}
      <div className="fixed bottom-[5.5rem] left-0 right-0 flex justify-center pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={() => router.push('/tasks?filter=active')}
            className="bg-card border border-[var(--color-border)] rounded-full px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)] shadow-sm ios-tap active:scale-95 transition-transform"
          >
            進行中 {activeCount}社
          </button>
          <button
            onClick={() => router.push('/tasks?filter=offer')}
            className="bg-card border border-[var(--color-border)] rounded-full px-3 py-1.5 text-[12px] font-semibold text-amber-500 shadow-sm ios-tap active:scale-95 transition-transform"
          >
            内定 {offerCount}社
          </button>
          <button
            onClick={() => router.push('/tasks?filter=rejected')}
            className="bg-card border border-[var(--color-border)] rounded-full px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)] shadow-sm ios-tap active:scale-95 transition-transform"
          >
            見送り {sayonaraCount}社
          </button>
        </div>
      </div>

      <AnimatePresence>
        {selectedCompany && (
          <ErrorBoundary
            fallback={
              <div className="fixed inset-0 z-[60] flex items-center justify-center">
                <div className="bg-card rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl text-center">
                  <p className="text-[17px] font-bold text-[var(--color-text)] mb-2">表示エラー</p>
                  <p className="text-[14px] text-[var(--color-text-secondary)] mb-4">企業データの読み込みに失敗しました。</p>
                  <button onClick={() => setSelectedCompany(null)} className="ios-button-primary">閉じる</button>
                </div>
              </div>
            }
          >
            <CompanyDetailModal
              company={selectedCompany}
              onClose={() => setSelectedCompany(null)}
            />
          </ErrorBoundary>
        )}
      </AnimatePresence>
    </div>
  );
}
