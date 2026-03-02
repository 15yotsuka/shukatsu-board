'use client';

import { useState } from 'react';
import { StatusEditor } from '@/components/status/StatusEditor';

export function Header() {
  const [showStatusEditor, setShowStatusEditor] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E5E5EA]">
        <div className="flex items-center justify-between h-14 px-4">
          <h1 className="text-lg font-bold text-[#1C1C1E] tracking-tight">
            ShukatsuBoard
          </h1>
          <button
            onClick={() => setShowStatusEditor(true)}
            className="ios-tap w-11 h-11 flex items-center justify-center rounded-full"
            aria-label="設定"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px] text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>
      {showStatusEditor && (
        <StatusEditor onClose={() => setShowStatusEditor(false)} />
      )}
    </>
  );
}
