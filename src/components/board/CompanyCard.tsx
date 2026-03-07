'use client';

import { useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '@/store/useAppStore';
import { isAfter, startOfDay, format } from 'date-fns';
import type { Company } from '@/lib/types';
import { TAG_CONFIG } from '@/lib/types';

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

  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const didMoveRef = useRef(false);

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
      onPointerDown={(e) => {
        pointerStartRef.current = { x: e.clientX, y: e.clientY };
        didMoveRef.current = false;
      }}
      onPointerMove={(e) => {
        if (pointerStartRef.current) {
          const dx = Math.abs(e.clientX - pointerStartRef.current.x);
          const dy = Math.abs(e.clientY - pointerStartRef.current.y);
          if (dx > 6 || dy > 6) didMoveRef.current = true;
        }
      }}
      onClick={() => {
        if (!didMoveRef.current) onTap(company);
      }}
      className={`bg-card rounded-xl shadow-sm p-3.5 ios-card-hover cursor-grab active:cursor-grabbing touch-manipulation select-none ${isDragging ? 'opacity-50 shadow-lg' : ''
        }`}
    >
      <div className="flex items-start justify-between gap-1.5 mb-0.5">
        <p className="text-[15px] font-semibold text-[var(--color-text)] truncate flex-1">{company.name}</p>
        {company.tags && company.tags.length > 0 && TAG_CONFIG[company.tags[0]] && (
          <span className={`flex-none text-[11px] font-bold px-2 py-0.5 rounded-full ${TAG_CONFIG[company.tags[0]].className}`}>
            {TAG_CONFIG[company.tags[0]].label}
          </span>
        )}
      </div>
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
