import { nanoid } from 'nanoid';
import type { StatusColumn } from './types';

export const DEFAULT_STATUS_NAMES = [
  '未エントリー',
  'ES作成中',
  'ES提出済',
  'Webテスト受検済',
  '1次面接',
  '2次面接',
  '最終面接',
  'インターン選考中',
  '内定',
  'お見送り',
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
  }));
}
