export const STAGE_COLORS: Record<string, string> = {
  'エントリー前': '#9CA3AF',
  'ES': '#8B5CF6',
  'Webテスト': '#3B82F6',
  '1次面接': '#F97316',
  '2次面接': '#F97316',
  '3次面接': '#F97316',
  '最終面接': '#F97316',
  '内定': '#22C55E',
  '見送り': '#6B7280',
};

export function getStageColor(stage: string): string {
  return STAGE_COLORS[stage] || '#9CA3AF';
}
