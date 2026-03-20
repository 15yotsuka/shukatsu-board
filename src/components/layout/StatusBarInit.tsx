'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export function StatusBarInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      StatusBar.setOverlaysWebView({ overlay: true });
      const isDark = document.documentElement.classList.contains('dark');
      StatusBar.setStyle({ style: isDark ? Style.Light : Style.Dark });
    });
  }, []);

  return null;
}
