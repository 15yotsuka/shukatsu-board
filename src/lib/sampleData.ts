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
      nextActionDate: format(addDays(now, 3), 'yyyy-MM-dd'),
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
      statusId: getStatus('ES'),
      selectionType: 'intern' as SelectionType,
      nextActionDate: format(addDays(now, 5), 'yyyy-MM-dd'),
      nextActionType: 'webtest' as ActionType,
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
    companyName: '株式会社サンプルB',
    type: '一次面接',
    date: format(addDays(now, 7), 'yyyy-MM-dd'),
    startTime: '14:00',
    endTime: '15:00',
    location: 'オンライン',
  },
];
