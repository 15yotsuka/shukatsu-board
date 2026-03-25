'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useTasksUI } from '@/store/useTasksUI';
import { useAppStore } from '@/store/useAppStore';

const PAGE_TITLES: Record<string, string> = {
  '/': 'ホーム',
  '/tasks': '企業一覧',
  '/calendar': 'カレンダー',
  '/deadline': '締切',
};

export function Header() {
  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const { isDark, setTheme, theme } = useTheme();
  const pathname = usePathname();
  const isTasksPage = pathname === '/tasks';

  const { isSelectMode, selectedIds, enterSelectMode, exitSelectMode, handleDeleteSelected, openBulkAdd } = useTasksUI();
  const hasCompanies = useAppStore((s) => s.companies.length > 0);

  const title = PAGE_TITLES[pathname] ?? 'ShukatsuBoard';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-zinc-800" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {isTasksPage && isSelectMode ? (
          /* 選択モード: ヘッダー全体を置き換え */
          <div className="flex items-center justify-between h-14 px-4">
            <button
              onClick={exitSelectMode}
              className="ios-tap text-[15px] font-medium text-[var(--color-primary)]"
            >
              キャンセル
            </button>
            <span className="text-[15px] font-semibold text-[var(--color-text)]">
              {selectedIds.length}社選択中
            </span>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0}
              className="ios-tap w-10 h-10 flex items-center justify-center rounded-full disabled:opacity-30"
              aria-label="選択した企業を削除"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px] text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ) : (
          /* 通常ヘッダー */
          <div className="flex items-center justify-between h-14 px-4">
            <h1 className="text-lg font-bold text-[var(--color-text)] tracking-tight">
              {title}
            </h1>
            <div className="flex items-center gap-1">
              {/* 企業一覧専用ボタン */}
              {isTasksPage && (
                <>
                  <button
                    onClick={openBulkAdd}
                    className="ios-tap h-9 px-2.5 flex items-center text-[13px] font-semibold text-[var(--color-primary)] rounded-lg"
                    aria-label="一括追加"
                  >
                    + 一括追加
                  </button>
                  {hasCompanies && (
                    <button
                      onClick={enterSelectMode}
                      className="ios-tap w-10 h-10 flex items-center justify-center rounded-full"
                      aria-label="削除モード"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px] text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </>
              )}
              {/* ダーク/ライト切替 */}
              <button
                onClick={toggleTheme}
                className="ios-tap w-11 h-11 flex items-center justify-center rounded-full"
                aria-label={isDark ? 'ライトモード' : 'ダークモード'}
              >
                {isDark ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px] text-[#FF9F0A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
                  </svg>
                ) : (
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
        )}
      </header>
      {showStatusEditor && (
        <SettingsModal onClose={() => setShowStatusEditor(false)} />
      )}
    </>
  );
}
