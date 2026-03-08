'use client';

import { useEffect } from 'react';
import { useToast } from '@/lib/useToast';

export function ToastDisplay() {
  const { message, clear } = useToast();

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(clear, 3000);
    return () => clearTimeout(t);
  }, [message, clear]);

  if (!message) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
      <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[14px] font-medium px-4 py-3 rounded-2xl shadow-2xl max-w-[320px] text-center animate-slide-up">
        {message}
      </div>
    </div>
  );
}
