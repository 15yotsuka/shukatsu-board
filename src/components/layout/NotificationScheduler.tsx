'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/shallow';
import { scheduleLocalNotifications } from '@/lib/notifications';

export function NotificationScheduler() {
  const companies = useAppStore((s) => s.companies);
  const scheduledActions = useAppStore((s) => s.scheduledActions);
  const notificationSettings = useAppStore(useShallow((s) => s.notificationSettings));

  // companies・scheduledActions・notificationSettings が変わるたびに再スケジュール
  useEffect(() => {
    scheduleLocalNotifications(companies, scheduledActions, notificationSettings);
  }, [companies, scheduledActions, notificationSettings]);

  return null;
}
