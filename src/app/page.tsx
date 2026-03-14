'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/shallow';
import { CompanyDetailModal } from '@/components/board/CompanyDetailModal';
import { ErrorBoundary } from '@/components/board/ErrorBoundary';
import { AnimatePresence } from 'framer-motion';
import { TutorialModal } from '@/components/onboarding/TutorialModal';
import { ACTION_TYPE_LABELS, ACTION_TYPE_COLORS, TAG_CONFIG } from '@/lib/types';
import type { Company, Tag, ActionType } from '@/lib/types';
import { format, parseISO, isValid, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { FilterKind } from '@/components/calendar/FilterChips';

interface TodoItem {
  id: string;
  companyId: string;
  companyName: string;
  label: string;
  date: string;
  time?: string;
  tags?: Tag[];
  filterKind: FilterKind;
}

type SortKind = 'asc' | 'desc' | 'name';

function toFilterKind(type: string | undefined): FilterKind {
  if (type === 'es') return 'es';
  if (type === 'webtest') return 'webtest';
  if (type === 'final') return 'interview';
  if (type === 'interview') return 'interview';
  return 'other';
}

function filterKindToColor(kind: FilterKind): string {
  const map: Record<string, string> = {
    es: ACTION_TYPE_COLORS.es,
    webtest: ACTION_TYPE_COLORS.webtest,
    interview: ACTION_TYPE_COLORS.interview,
    gd: ACTION_TYPE_COLORS.gd,
    other: ACTION_TYPE_COLORS.other,
    deadline: '#EF4444',
  };
  return map[kind] ?? ACTION_TYPE_COLORS.other;
}

export default function Home() {
  const companies = useAppStore((s) => s.companies);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const scheduledActions = useAppStore((s) => s.scheduledActions);
  const interviews = useAppStore((s) => s.interviews);
  const displaySettings = useAppStore(useShallow((s) => s.displaySettings));
  const tutorialFlags = useAppStore((s) => s.tutorialFlags);
  const markTutorialSeen = useAppStore((s) => s.markTutorialSeen);
  const gradYear = useAppStore((s) => s.gradYear);

  const router = useRouter();
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [filterValue, setFilterValue] = useState<string>('all');
  const [sortKind, setSortKind] = useState<SortKind>('asc');
  const [showSortSheet, setShowSortSheet] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekEnd = format(addDays(new Date(), 7), 'yyyy-MM-dd');

  const companyMap = useMemo(() => {
    const map = new Map<string, { name: string; tags?: Tag[] }>();
    companies.forEach((c) => map.set(c.id, { name: c.name, tags: c.tags }));
    return map;
  }, [companies]);

  const todoItems = useMemo((): TodoItem[] => {
    const items: TodoItem[] = [];

    // 内定・見送り企業を除外
    const excludedStages = new Set(['内定', '見送り']);
    const activeCompanyIds = new Set(
      companies
        .filter((c) => {
          const col = statusColumns.find((s) => s.id === c.statusId);
          return col && !excludedStages.has(col.name);
        })
        .map((c) => c.id)
    );

    scheduledActions
      .filter((a) => a.date >= today && activeCompanyIds.has(a.companyId))
      .forEach((a) => {
        const aData = companyMap.get(a.companyId);
        items.push({
          id: `action-${a.id}`,
          companyId: a.companyId,
          companyName: aData?.name ?? '不明',
          label: ACTION_TYPE_LABELS[a.type] ?? a.type,
          date: a.date,
          time: a.startTime,
          tags: aData?.tags,
          filterKind: toFilterKind(a.type),
        });
      });

    interviews
      .filter((i) => {
        const dt = parseISO(i.datetime);
        return isValid(dt) && format(dt, 'yyyy-MM-dd') >= today && activeCompanyIds.has(i.companyId);
      })
      .forEach((i) => {
        const dt = parseISO(i.datetime);
        const dateStr = format(dt, 'yyyy-MM-dd');
        // Dedup: skip if a ScheduledAction already covers this event
        const isDuplicate = scheduledActions.some(
          (a) => a.companyId === i.companyId && a.date === dateStr &&
            (a.type === 'interview' || a.subType === i.type)
        );
        if (isDuplicate) return;
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
          filterKind: 'interview' as FilterKind,
        });
      });

    items.sort((a, b) => {
      const dc = a.date.localeCompare(b.date);
      if (dc !== 0) return dc;
      if (a.time && b.time) return a.time.localeCompare(b.time);
      return a.time ? -1 : b.time ? 1 : 0;
    });

    return items;
  }, [scheduledActions, interviews, companies, companyMap, statusColumns, today]);

  const filteredSortedItems = useMemo(() => {
    const filtered = filterValue === 'all'
      ? todoItems
      : filterValue === '面接'
        ? todoItems.filter((item) => item.filterKind === 'interview')
        : filterValue === 'ES'
          ? todoItems.filter((item) => item.filterKind === 'es')
          : filterValue === 'Webテスト'
            ? todoItems.filter((item) => item.filterKind === 'webtest')
            : filterValue === '締切'
              ? todoItems.filter((item) => item.filterKind === 'deadline')
              : todoItems.filter((item) => item.filterKind === 'other');
    if (sortKind === 'desc') {
      return [...filtered].sort((a, b) => {
        const dc = b.date.localeCompare(a.date);
        if (dc !== 0) return dc;
        if (a.time && b.time) return b.time.localeCompare(a.time);
        return a.time ? 1 : b.time ? -1 : 0;
      });
    }
    if (sortKind === 'name') {
      return [...filtered].sort((a, b) => a.companyName.localeCompare(b.companyName, 'ja'));
    }
    return filtered; // asc: already sorted in todoItems useMemo
  }, [todoItems, filterValue, sortKind]);

  const isDefaultSort = sortKind === 'asc';
  const todayItems    = isDefaultSort ? filteredSortedItems.filter((i) => i.date === today) : [];
  const thisWeekItems = isDefaultSort ? filteredSortedItems.filter((i) => i.date > today && i.date <= weekEnd) : [];
  const laterItems    = isDefaultSort ? filteredSortedItems.filter((i) => i.date > weekEnd) : [];

  const getCount = (statusNames: string[]) => {
    const ids = statusColumns
      .filter((col) => statusNames.includes(col.name))
      .map((col) => col.id);
    return companies.filter((c) => ids.includes(c.statusId)).length;
  };

  const activeCount = getCount(['エントリー前', 'ES', 'Webテスト', '1次面接', '2次面接', '3次面接', '最終面接']);
  const offerCount = getCount(['内定']);
  const sayonaraCount = getCount(['見送り']);

  const handleItemClick = (companyId: string) => {
    const c = companies.find((co) => co.id === companyId);
    if (c) setSelectedCompany(c);
  };

  const renderTodoItem = (item: TodoItem) => {
    const d = parseISO(item.date);
    const dateStr = isValid(d) ? format(d, 'M/d(E)', { locale: ja }) : item.date;
    const stripColor = filterKindToColor(item.filterKind);
    return (
      <button
        key={item.id}
        onClick={() => handleItemClick(item.companyId)}
        className="w-full flex items-center gap-3 pr-4 py-3 bg-card rounded-2xl shadow-sm border border-[var(--color-border)] text-left ios-tap active:scale-[0.98] transition-transform overflow-hidden relative"
      >
        {/* Left color strip */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl" style={{ backgroundColor: stripColor }} />
        <div className="pl-5 flex-1 min-w-0">
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

      {/* 色凡例 */}
      <div className="flex flex-wrap items-center gap-3 px-1 text-xs text-gray-400 dark:text-gray-500 mb-3">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:'#9CA3AF'}} />エントリー前</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:'#8B5CF6'}} />ES</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:'#3B82F6'}} />Webテスト</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:'#F97316'}} />面接</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:'#22C55E'}} />内定</span>
      </div>

      {/* フィルター + 並べ替え */}
      <div className="flex items-center gap-2 mb-4">
        <select
          value={filterValue}
          onChange={(e) => setFilterValue(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-card text-[var(--color-text)] text-[14px] font-medium"
        >
          <option value="all">すべて</option>
          <option value="ES">ES提出</option>
          <option value="Webテスト">Webテスト</option>
          <option value="面接">面接</option>
          <option value="締切">締切</option>
          <option value="その他">その他</option>
        </select>
        <button
          onClick={() => setShowSortSheet(true)}
          className="flex-none flex items-center gap-1 px-3 py-2 bg-[var(--color-border)] rounded-xl text-[13px] font-semibold text-[var(--color-text-secondary)] ios-tap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M6 12h12M9 17h6" />
          </svg>
          {sortKind === 'asc' ? '近い順' : sortKind === 'desc' ? '遠い順' : '企業名順'}
        </button>
      </div>

      {filteredSortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[16px] font-semibold text-[var(--color-text)] mb-1">
            {todoItems.length === 0 ? '予定はありません' : '該当する予定がありません'}
          </p>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            {todoItems.length === 0 ? '企業ページから選考予定を追加してください' : 'フィルターを変更してみてください'}
          </p>
        </div>
      ) : isDefaultSort ? (
        <>
          {renderSection('今日', todayItems, 'なし')}
          {renderSection('今週', thisWeekItems, 'なし')}
          {laterItems.length > 0 && renderSection('それ以降', laterItems)}
        </>
      ) : (
        <div className="space-y-2">
          {filteredSortedItems.map(renderTodoItem)}
        </div>
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

      {showSortSheet && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowSortSheet(false)} />
          <div className="relative bg-card rounded-t-2xl w-full max-w-lg p-5 space-y-2">
            <div className="flex justify-center pb-1">
              <div className="w-9 h-1 bg-[var(--color-border)] rounded-full" />
            </div>
            <h3 className="text-[15px] font-bold text-center text-[var(--color-text)] pb-1">並べ替え</h3>
            {([
              ['asc',  '近い順（デフォルト）'],
              ['desc', '遠い順'],
              ['name', '企業名順'],
            ] as [SortKind, string][]).map(([kind, label]) => (
              <button
                key={kind}
                onClick={() => { setSortKind(kind); setShowSortSheet(false); }}
                className={`w-full py-3 rounded-xl text-[15px] font-medium ios-tap ${
                  sortKind === kind
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'bg-[var(--color-bg)] text-[var(--color-text)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {gradYear !== null && !tutorialFlags.home && (
        <TutorialModal
          steps={[{
            title: '色は選考段階を表します',
            body: '🟣 ES　🔵 Webテスト　🟠 面接　🟢 内定\nカードの左端の色帯で一目で分かります\n\n💡 色帯をタップすると「結果待ち」に切り替わります\n結果が出たら「次の段階へ→」で自動解除されます'
          }]}
          onComplete={() => markTutorialSeen('home')}
        />
      )}
    </div>
  );
}
