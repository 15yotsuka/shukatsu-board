import type { Company, ActionType, SelectionType } from '@/lib/types';
import { format, addDays } from 'date-fns';

const now = new Date();

export function createSampleCompanies(
  statusColumns: { id: string; name: string }[]
): Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'orderInColumn'>[] {
  const sorted = [...statusColumns].sort((a, b) => {
    const aIdx = statusColumns.indexOf(a);
    const bIdx = statusColumns.indexOf(b);
    return aIdx - bIdx;
  });

  const getStatus = (name: string) =>
    sorted.find((s) => s.name.includes(name))?.id ?? sorted[0]?.id ?? '';

  const first = sorted[0]?.id ?? '';

  return [
    {
      name: '株式会社サンプルA',
      industry: 'IT・通信',
      statusId: first,
      selectionType: 'main' as SelectionType,
      nextActionDate: format(now, 'yyyy-MM-dd'),
      nextActionType: 'es' as ActionType,
    },
    {
      name: '株式会社サンプルB',
      industry: 'コンサルティング',
      statusId: getStatus('1次面接'),
      selectionType: 'main' as SelectionType,
      nextActionDate: format(addDays(now, 7), 'yyyy-MM-dd'),
      nextActionType: 'interview' as ActionType,
    },
    {
      name: '株式会社サンプルC',
      industry: 'メーカー（電機・電子）',
      statusId: getStatus('ES提出済'),
      selectionType: 'intern' as SelectionType,
      nextActionDate: format(addDays(now, 5), 'yyyy-MM-dd'),
      nextActionType: 'webtest' as ActionType,
    },
    {
      name: '株式会社サンプルD',
      industry: '金融（銀行）',
      statusId: getStatus('ES作成中'),
      selectionType: 'main' as SelectionType,
      nextActionDate: format(addDays(now, 3), 'yyyy-MM-dd'),
      nextActionType: 'es' as ActionType,
    },
    {
      name: '株式会社サンプルE',
      industry: '商社（総合）',
      statusId: getStatus('最終面接'),
      selectionType: 'main' as SelectionType,
      nextActionDate: format(addDays(now, 10), 'yyyy-MM-dd'),
      nextActionType: 'final' as ActionType,
    },
    {
      name: '株式会社サンプルF',
      industry: '広告・メディア',
      statusId: getStatus('Webテスト'),
      selectionType: 'main' as SelectionType,
      nextActionDate: format(addDays(now, 4), 'yyyy-MM-dd'),
      nextActionType: 'webtest' as ActionType,
    },
    {
      name: '株式会社サンプルG',
      industry: 'エンタメ・ゲーム',
      statusId: getStatus('2次面接'),
      selectionType: 'intern' as SelectionType,
      nextActionDate: format(addDays(now, 14), 'yyyy-MM-dd'),
      nextActionType: 'interview' as ActionType,
    },
  ];
}

export interface SampleInterview {
  companyName: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
}

export const SAMPLE_INTERVIEWS: SampleInterview[] = [
  {
    companyName: '株式会社サンプルA',
    type: '一次面接',
    date: format(now, 'yyyy-MM-dd'),
    startTime: '10:00',
    endTime: '11:00',
    location: 'オンライン',
  },
  {
    companyName: '株式会社サンプルB',
    type: '一次面接',
    date: format(addDays(now, 7), 'yyyy-MM-dd'),
    startTime: '14:00',
    endTime: '15:00',
    location: 'オンライン',
  },
  {
    companyName: '株式会社サンプルE',
    type: '最終面接',
    date: format(addDays(now, 10), 'yyyy-MM-dd'),
    startTime: '13:00',
    endTime: '14:30',
    location: '本社',
  },
  {
    companyName: '株式会社サンプルG',
    type: '二次面接',
    date: format(addDays(now, 14), 'yyyy-MM-dd'),
    startTime: '15:00',
    endTime: '16:00',
    location: '支社',
  },
];
