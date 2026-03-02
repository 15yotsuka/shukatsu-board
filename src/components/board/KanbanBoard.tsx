'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
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

  const trackStatuses = statusColumns
    .filter((s) => s.trackType === activeTrack)
    .sort((a, b) => a.order - b.order);

  const trackCompanies = companies.filter((c) => c.trackType === activeTrack);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const company = event.active.data.current?.company as Company | undefined;
    if (company) {
      setActiveCompany(company);
    }
  }, []);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Visual feedback handled by droppable isOver state
  }, []);

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
          <div className="w-16 h-16 bg-[#E8F0FE] rounded-2xl flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-[17px] font-semibold text-[#1C1C1E] mb-1">企業を追加しましょう</p>
          <p className="text-[14px] text-[#8E8E93]">右下の＋ボタンから最初の企業を追加</p>
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex overflow-x-auto hide-scrollbar gap-3 px-4 pb-4 pt-2 snap-x snap-mandatory">
          {trackStatuses.map((status) => {
            const columnCompanies = companies.filter(
              (c) => c.statusId === status.id
            );
            return (
              <StatusColumn
                key={status.id}
                status={status}
                companies={columnCompanies}
                onCompanyTap={handleCompanyTap}
              />
            );
          })}
        </div>
        <DragOverlay>
          {activeCompany ? (
            <div className="bg-white rounded-xl shadow-lg border border-[#007AFF]/20 p-3.5 w-[280px] opacity-90 rotate-3 scale-105">
              <p className="text-[15px] font-semibold text-[#1C1C1E]">{activeCompany.name}</p>
              {activeCompany.industry && (
                <p className="text-[13px] text-[#8E8E93] mt-1">{activeCompany.industry}</p>
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
