'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Company, StatusColumn as StatusColumnType } from '@/lib/types';
import { CompanyCard } from './CompanyCard';

interface StatusColumnProps {
  status: StatusColumnType;
  companies: Company[];
  onCompanyTap: (company: Company) => void;
}

export function StatusColumn({ status, companies, onCompanyTap }: StatusColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status.id}`,
    data: { type: 'column', statusId: status.id },
  });

  const sortedCompanies = [...companies].sort(
    (a, b) => a.orderInColumn - b.orderInColumn
  );

  return (
    <div
      className={`flex-shrink-0 min-w-[280px] w-[85vw] max-w-[320px] snap-start rounded-2xl p-3 ${
        isOver ? 'ring-2 ring-[#007AFF]' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide">
          {status.name}
        </h3>
        <span className="text-[12px] bg-[#E5E5EA] text-[#8E8E93] rounded-full px-2 py-0.5">
          {companies.length}
        </span>
      </div>
      <div ref={setNodeRef} className="min-h-[60px] space-y-2">
        <SortableContext
          items={sortedCompanies.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortedCompanies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              onTap={onCompanyTap}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
