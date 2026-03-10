import { format, parseISO, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * 統一日付フォーマット: "3/10(火)" 形式（ゼロ埋めなし + 曜日付き）
 */
export function formatDateUnified(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  if (!isValid(date)) return '';
  return format(date, 'M/d(E)', { locale: ja });
}

/**
 * 時刻範囲の表示: "14:00~15:00" or "14:00" or ""
 */
export function formatTimeRange(startTime?: string, endTime?: string): string {
  if (!startTime) return '';
  if (!endTime) return startTime;
  return `${startTime}~${endTime}`;
}

/**
 * カード用1行表示: "3/10(火) 14:00~15:00 1次面接"
 */
export function formatScheduledActionOneLine(action: {
  date: string;
  startTime?: string;
  endTime?: string;
  label: string;
}): string {
  const datePart = formatDateUnified(action.date);
  const timePart = formatTimeRange(action.startTime, action.endTime);
  return [datePart, timePart, action.label].filter(Boolean).join(' ');
}
