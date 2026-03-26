import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { parseISO, isValid, isBefore, set, startOfDay, subDays } from 'date-fns';
import type { Company, ScheduledAction } from './types';
import type { NotificationSettings } from '@/store/useAppStore';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const result = await LocalNotifications.requestPermissions();
  return result.display === 'granted';
}

export async function scheduleLocalNotifications(
  companies: Company[],
  scheduledActions: ScheduledAction[],
  notificationSettings: NotificationSettings
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // 既存の未送信通知をすべてキャンセル（重複防止）
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }

  if (!notificationSettings.enabled) return;

  const now = new Date();
  const notifications: Array<{
    id: number;
    title: string;
    body: string;
    schedule: { at: Date };
  }> = [];

  const offsets: Array<{
    key: keyof NotificationSettings['timing'];
    days: number;
    label: string;
  }> = [
    { key: 'sameDay',         days: 0, label: '当日' },
    { key: 'oneDayBefore',    days: 1, label: '1日前' },
    { key: 'threeDaysBefore', days: 3, label: '3日前' },
    { key: 'sevenDaysBefore', days: 7, label: '7日前' },
  ];

  let notifId = 1000;

  // 企業の nextDeadline
  for (const company of companies) {
    if (!company.nextDeadline) continue;
    const deadline = parseISO(company.nextDeadline);
    if (!isValid(deadline)) continue;

    for (const offset of offsets) {
      if (!notificationSettings.timing[offset.key]) continue;
      const targetDay = subDays(startOfDay(deadline), offset.days);
      const notifDate = set(targetDay, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
      if (isBefore(notifDate, now)) continue;

      notifications.push({
        id: notifId++,
        title: offset.days === 0
          ? `【本日締切】${company.name}`
          : `【${offset.label}締切】${company.name}`,
        body: `${company.name} の締切日が近づいています`,
        schedule: { at: notifDate },
      });
    }
  }

  // ScheduledActions（面接・ESなど）
  for (const action of scheduledActions) {
    const actionDate = parseISO(action.date);
    if (!isValid(actionDate)) continue;

    const company = companies.find((c) => c.id === action.companyId);
    const companyName = company?.name ?? '企業';
    const actionLabel = action.subType ?? action.type;

    for (const offset of offsets) {
      if (!notificationSettings.timing[offset.key]) continue;
      const targetDay = subDays(startOfDay(actionDate), offset.days);

      // 当日通知: startTime があればその時刻、なければ朝9:00
      let hours = 9;
      let minutes = 0;
      if (offset.days === 0 && action.startTime) {
        const parts = action.startTime.split(':');
        if (parts.length === 2) {
          const parsedHours = parseInt(parts[0], 10);
          const parsedMinutes = parseInt(parts[1], 10);
          if (isNaN(parsedHours) || isNaN(parsedMinutes)) {
            // 不正な時刻文字列はスキップ（朝9:00にフォールバック）
          } else {
            hours = parsedHours;
            minutes = parsedMinutes;
          }
        }
      }

      const notifDate = set(targetDay, { hours, minutes, seconds: 0, milliseconds: 0 });
      if (isBefore(notifDate, now)) continue;

      notifications.push({
        id: notifId++,
        title: offset.days === 0
          ? `【本日】${companyName} ${actionLabel}`
          : `【${offset.label}】${companyName} ${actionLabel}`,
        body: `${companyName} の${actionLabel}があります`,
        schedule: { at: notifDate },
      });
    }
  }

  if (notifications.length === 0) return;

  await LocalNotifications.schedule({ notifications });
}
