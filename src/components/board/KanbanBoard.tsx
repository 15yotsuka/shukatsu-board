'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { useAppStore } from '@/store/useAppStore';
import type { Company } from '@/lib/types';
import { StatusColumn } from './StatusColumn';
import { CompanyDetailModal } from './CompanyDetailModal';

export function KanbanBoard() {
  const activeTrack = useAppStore((s) => s.activeTrack);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const companies = useAppStore((s) => s.companies);
  const moveCompany = useAppStore((s) => s.moveCompany);

  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [activeColIndex, setActiveColIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);

  const trackStatuses = statusColumns
    .filter((s) => s.trackType === activeTrack)
    .sort((a, b) => a.order - b.order);

  const trackCompanies = companies.filter((c) => c.trackType === activeTrack);

  // スクロール位置でアクティブカラムを検出
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      let closestIdx = 0;
      let minDist = Infinity;
      colRefs.current.forEach((el, i) => {
        if (!el) return;
        const dist = Math.abs(el.offsetLeft - scrollLeft);
        if (dist < minDist) { minDist = dist; closestIdx = i; }
      });
      setActiveColIndex(closestIdx);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [trackStatuses.length]);

  // trackが変わったらリセット
  useEffect(() => { setActiveColIndex(0); }, [activeTrack]);

  const scrollToColumn = (idx: number) => {
    const el = colRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      setActiveColIndex(idx);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const company = event.active.data.current?.company as Company | undefined;
    if (company) setActiveCompany(company);
  }, []);

  const handleDragOver = useCallback((_event: DragOverEvent) => { }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveCompany(null);
      const { active, over } = event;
      if (!over) return;
      const companyId = active.id as string;
      let newStatusId: string | undefined;
      if (over.data.current?.type === 'column') {
        newStatusId = over.data.current.statusId as string;
      } else if (over.data.current?.type === 'company') {
        const overCompany = over.data.current.company as Company;
        newStatusId = overCompany.statusId;
      }
      if (newStatusId) {
        const companiesInTarget = companies.filter(
          (c) => c.statusId === newStatusId && c.id !== companyId
        );
        moveCompany(companyId, newStatusId, companiesInTarget.length);
      }
    },
    [companies, moveCompany]
  );

  const handleCompanyTap = useCallback((company: Company) => {
    setSelectedCompany(company);
  }, []);

  // Empty state
  if (trackCompanies.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 bg-[var(--color-primary-light)] rounded-2xl flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-[17px] font-semibold text-[var(--color-text)] mb-1">企業を追加しましょう</p>
          <p className="text-[14px] text-[var(--color-text-secondary)]">右下の＋ボタンから最初の企業を追加</p>
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

  return (
    <>
      {/* カラムナビゲーター（ピル） */}
      <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto hide-scrollbar">
        {trackStatuses.map((status, idx) => {
          const count = companies.filter((c) => c.statusId === status.id).length;
          const isActive = idx === activeColIndex;
          return (
            <button
              key={status.id}
              onClick={() => scrollToColumn(idx)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold ios-tap transition-colors duration-200 ${isActive
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-card text-[var(--color-text-secondary)]'
                }`}
            >
              {status.name}
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${isActive
                ? 'bg-white/25 text-white'
                : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={scrollRef}
          className="flex overflow-x-auto hide-scrollbar gap-3 px-4 pb-4 pt-2 snap-x snap-mandatory"
        >
          {trackStatuses.map((status, idx) => {
            const columnCompanies = companies.filter(
              (c) => c.statusId === status.id
            );
            return (
              <StatusColumn
                key={status.id}
                colRef={(el: HTMLDivElement | null) => { colRefs.current[idx] = el; }}
                status={status}
                companies={columnCompanies}
                onCompanyTap={handleCompanyTap}
              />
            );
          })}
        </div>
        <DragOverlay>
          {activeCompany ? (
            <div className="bg-card rounded-xl shadow-lg border border-[var(--color-primary)]/20 p-3.5 w-[280px] opacity-90 rotate-3 scale-105">
              <p className="text-[15px] font-semibold text-[var(--color-text)]">{activeCompany.name}</p>
              {activeCompany.industry && (
                <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">{activeCompany.industry}</p>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {selectedCompany && (
        <CompanyDetailModal
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      )}
    </>
  );
}
