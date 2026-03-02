'use client';

import { useState } from 'react';
import { StatusEditor } from '@/components/status/StatusEditor';
import { useTheme } from '@/components/layout/ThemeProvider';

export function Header() {
  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const { isDark, setTheme, theme } = useTheme();

  const toggleTheme = () => {
    // system → light → dark → light ...
    if (theme === 'system') {
      setTheme(isDark ? 'light' : 'dark');
    } else {
      setTheme(isDark ? 'light' : 'dark');
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-zinc-800">
        <div className="flex items-center justify-between h-14 px-4">
          <h1 className="text-lg font-bold text-[var(--color-text)] tracking-tight">
            ShukatsuBoard
          </h1>
          <div className="flex items-center gap-1">
            {/* ダーク/ライト切替 */}
            <button
              onClick={toggleTheme}
              className="ios-tap w-11 h-11 flex items-center justify-center rounded-full"
              aria-label={isDark ? 'ライトモード' : 'ダークモード'}
            >
              {isDark ? (
                /* 太陽アイコン（ライトモードへ） */
                <svg xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px] text-[#FF9F0A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
                </svg>
              ) : (
                /* 月アイコン（ダークモードへ） */
                <svg xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px] text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            {/* 設定ボタン */}
            <button
              onClick={() => setShowStatusEditor(true)}
              className="ios-tap w-11 h-11 flex items-center justify-center rounded-full"
              aria-label="設定"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px] text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      {showStatusEditor && (
        <StatusEditor onClose={() => setShowStatusEditor(false)} />
      )}
    </>
  );
}
