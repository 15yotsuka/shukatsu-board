import { nanoid } from 'nanoid';
import type { StatusColumn } from './types';
import { STAGE_COLORS } from './stageColors';

export const DEFAULT_STATUS_NAMES = [
  'エントリー前',
  'ES',
  'Webテスト',
  '1次面接',
  '2次面接',
  '3次面接',
  '最終面接',
  '内定',
  '見送り',
];

export const ES_TEMPLATE_QUESTIONS = [
  '志望動機を教えてください',
  '学生時代に力を入れたことを教えてください（ガクチカ）',
  'あなたの強みと弱みを教えてください',
  '入社後にやりたいことを教えてください',
  '自己PRをしてください',
];

export function createAllDefaultStatuses(): StatusColumn[] {
  return DEFAULT_STATUS_NAMES.map((name, index) => ({
    id: nanoid(),
    name,
    order: index,
    color: STAGE_COLORS[name] ?? '#9CA3AF',
  }));
}
