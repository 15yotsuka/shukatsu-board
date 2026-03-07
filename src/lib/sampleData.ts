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
      name: 'ソニーグループ',
      industry: 'メーカー（電機・電子）',
      statusId: first,
      selectionType: 'main' as SelectionType,
      nextActionDate: format(now, 'yyyy-MM-dd'),
      nextActionType: 'es' as ActionType,
    },
    {
      name: 'アクセンチュア',
      industry: 'コンサルティング',
      statusId: getStatus('1次面接'),
      selectionType: 'main' as SelectionType,
      nextActionDate: format(addDays(now, 7), 'yyyy-MM-dd'),
      nextActionType: 'interview' as ActionType,
    },
    {
      name: '日立製作所',
      industry: 'メーカー（電機・電子）',
      statusId: getStatus('ES提出済'),
      selectionType: 'intern' as SelectionType,
      nextActionDate: format(addDays(now, 5), 'yyyy-MM-dd'),
      nextActionType: 'webtest' as ActionType,
    },
    {
      name: '三菱UFJ銀行',
      industry: '金融（銀行）',
      statusId: getStatus('ES作成中'),
      selectionType: 'main' as SelectionType,
      nextActionDate: format(addDays(now, 3), 'yyyy-MM-dd'),
      nextActionType: 'es' as ActionType,
    },
    {
      name: '三井物産',
      industry: '商社（総合）',
      statusId: getStatus('最終面接'),
      selectionType: 'main' as SelectionType,
      nextActionDate: format(addDays(now, 10), 'yyyy-MM-dd'),
      nextActionType: 'final' as ActionType,
    },
    {
      name: '電通',
      industry: '広告・メディア',
      statusId: getStatus('Webテスト'),
      selectionType: 'main' as SelectionType,
      nextActionDate: format(addDays(now, 4), 'yyyy-MM-dd'),
      nextActionType: 'webtest' as ActionType,
    },
    {
      name: 'サイバーエージェント',
      industry: 'IT・通信',
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
    companyName: 'ソニーグループ',
    type: '一次面接',
    date: format(now, 'yyyy-MM-dd'),
    startTime: '10:00',
    endTime: '11:00',
    location: 'オンライン',
  },
  {
    companyName: 'アクセンチュア',
    type: '一次面接',
    date: format(addDays(now, 7), 'yyyy-MM-dd'),
    startTime: '14:00',
    endTime: '15:00',
    location: 'オンライン',
  },
  {
    companyName: '三井物産',
    type: '最終面接',
    date: format(addDays(now, 10), 'yyyy-MM-dd'),
    startTime: '13:00',
    endTime: '14:30',
    location: '本社',
  },
  {
    companyName: 'サイバーエージェント',
    type: '二次面接',
    date: format(addDays(now, 14), 'yyyy-MM-dd'),
    startTime: '15:00',
    endTime: '16:00',
    location: '渋谷本社',
  },
];
