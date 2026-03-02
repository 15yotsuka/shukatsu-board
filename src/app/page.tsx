'use client';

import { useState } from 'react';
import { TrackTabs } from '@/components/layout/TrackTabs';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { AddCompanyForm } from '@/components/board/AddCompanyForm';

export default function Home() {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <>
      <TrackTabs />
      <KanbanBoard />

      {/* FAB - Floating Action Button */}
      <button
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-20 right-5 z-40 w-14 h-14 bg-[#007AFF] text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center ios-tap"
        aria-label="企業を追加"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showAddForm && (
        <AddCompanyForm onClose={() => setShowAddForm(false)} />
      )}
    </>
  );
}
