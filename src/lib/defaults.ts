import { nanoid } from 'nanoid';
import type { StatusColumn, TrackType } from './types';

export const DEFAULT_INTERN_STATUS_NAMES = [
  '興味あり',
  'ES提出',
  '書類通過',
  '面接',
  '参加確定',
  '参加済み',
];

export const DEFAULT_MAIN_STATUS_NAMES = [
  '興味あり',
  'ES提出',
  '書類通過',
  '一次面接',
  '二次面接',
  '最終面接',
  '内定',
  '不合格',
];

export const ES_TEMPLATE_QUESTIONS = [
  '志望動機を教えてください',
  '学生時代に力を入れたことを教えてください（ガクチカ）',
  'あなたの強みと弱みを教えてください',
  '入社後にやりたいことを教えてください',
  '自己PRをしてください',
];

export function createDefaultStatuses(
  trackType: TrackType,
  names: string[]
): StatusColumn[] {
  return names.map((name, index) => ({
    id: nanoid(),
    name,
    order: index,
    trackType,
  }));
}

export function createAllDefaultStatuses(): StatusColumn[] {
  return [
    ...createDefaultStatuses('intern', DEFAULT_INTERN_STATUS_NAMES),
    ...createDefaultStatuses('main', DEFAULT_MAIN_STATUS_NAMES),
  ];
}
