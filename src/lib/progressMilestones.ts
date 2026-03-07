import type { Company, SelectionType } from './types';

export const DEFAULT_MILESTONES: Record<SelectionType, string[]> = {
  intern: [
    'ES',
    'Webテスト',
    '面接',
    'インターン参加',
  ],
  main: [
    'ES',
    'Webテスト',
    '一次面接',
    '二次面接',
    '最終面接',
    '内定',
  ],
};

export function getMilestones(company: Company): string[] {
  if (company?.customMilestones && company.customMilestones.length > 0) {
    return company.customMilestones;
  }
  const type = company?.selectionType ?? 'main';
  return DEFAULT_MILESTONES[type] ?? DEFAULT_MILESTONES['main'];
}

export function getMilestoneIndex(statusName: string, milestones: string[]): number {
  // Reverse scan: find the last milestone whose label prefix appears in the status name
  for (let i = milestones.length - 1; i >= 0; i--) {
    const m = milestones[i];
    if (m.length >= 2 && statusName.includes(m.slice(0, 2))) return i;
  }
  // Fallback: keyword-based heuristics
  if (statusName.includes('内定')) return milestones.length - 1;
  if (statusName.includes('最終')) return Math.max(0, milestones.length - 2);
  if (statusName.includes('2次') || statusName.includes('二次')) return Math.min(3, milestones.length - 1);
  if (statusName.includes('1次') || statusName.includes('一次') || statusName.includes('面接')) return Math.min(2, milestones.length - 1);
  if (statusName.includes('インターン')) return Math.min(2, milestones.length - 1);
  if (statusName.includes('Web') || statusName.includes('テスト')) return Math.min(1, milestones.length - 1);
  return 0;
}
