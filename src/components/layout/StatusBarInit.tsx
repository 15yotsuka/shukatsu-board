'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export function StatusBarInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      StatusBar.setOverlaysWebView({ overlay: false });
      StatusBar.setStyle({ style: Style.Default });
    });
  }, []);

  return null;
}
