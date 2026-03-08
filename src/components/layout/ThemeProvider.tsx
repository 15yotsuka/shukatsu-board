'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
    theme: Theme;
    setTheme: (t: Theme) => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: 'system',
    setTheme: () => { },
    isDark: false,
});

export function useTheme() {
    return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('system');
    const [isDark, setIsDark] = useState(false);

    // テーマをhtmlタグに反映
    const applyTheme = useCallback((t: Theme) => {
        const root = document.documentElement;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const dark = t === 'dark' || (t === 'system' && prefersDark);
        root.classList.toggle('dark', dark);
        setIsDark(dark);
    }, []);

    // 初期化（localStorage から読み込み）
    useEffect(() => {
        const stored = (localStorage.getItem('theme') as Theme) ?? 'system';
        setThemeState(stored);
        applyTheme(stored);
    }, [applyTheme]);

    // システムテーマ変更を監視
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            if (theme === 'system') applyTheme('system');
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [theme, applyTheme]);

    const setTheme = useCallback((t: Theme) => {
        localStorage.setItem('theme', t);
        setThemeState(t);
        applyTheme(t);
    }, [applyTheme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
}
