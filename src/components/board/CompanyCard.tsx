'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '@/store/useAppStore';
import { isAfter, startOfDay, format } from 'date-fns';
import type { Company } from '@/lib/types';

interface CompanyCardProps {
  company: Company;
  onTap: (company: Company) => void;
}

export function CompanyCard({ company, onTap }: CompanyCardProps) {
  const interviews = useAppStore((s) => s.interviews);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: company.id, data: { type: 'company', company } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const updatedDate = new Date(company.updatedAt).toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });

  const today = startOfDay(new Date());
  const nextInterview = interviews
    .filter(
      (i) =>
        i.companyId === company.id &&
        (isAfter(new Date(i.datetime), today) ||
          format(new Date(i.datetime), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'))
    )
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())[0];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onTap(company)}
      className={`bg-[var(--color-card)] rounded-xl shadow-sm p-3.5 ios-tap ios-card-hover cursor-grab active:cursor-grabbing touch-manipulation ${isDragging ? 'opacity-50 shadow-lg' : ''
        }`}
    >
      <p className="text-[15px] font-semibold text-[var(--color-text)] truncate">{company.name}</p>
      {company.industry && (
        <p className="text-[13px] text-[var(--color-text-secondary)] mt-1 truncate">{company.industry}</p>
      )}
      {nextInterview && (
        <div className="flex items-center gap-1 mt-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[12px] text-[var(--color-primary)]">
            {format(new Date(nextInterview.datetime), 'M/d HH:mm')} {nextInterview.type}
          </span>
        </div>
      )}
      <p className="text-[12px] text-[var(--color-text-secondary)] mt-1">{updatedDate}</p>
    </div>
  );
}
