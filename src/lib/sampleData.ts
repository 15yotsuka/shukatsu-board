import type { Company, ActionType } from '@/lib/types';
import { format, addDays } from 'date-fns';

const now = new Date();

export function createSampleCompanies(
  statusColumns: { id: string; name: string }[]
): Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'orderInColumn'>[] {
  const getStatus = (name: string) =>
    statusColumns.find((s) => s.name === name)?.id ?? statusColumns[0]?.id ?? '';

  return [
    {
      name: 'ソニーグループ',
      industry: 'メーカー',
      statusId: getStatus('エントリー前'),
    },
    {
      name: '三菱UFJ銀行',
      industry: '金融',
      statusId: getStatus('ES'),
      nextDeadline: format(addDays(now, 5), 'yyyy-MM-dd'),
    },
    {
      name: '野村證券',
      industry: '金融',
      statusId: getStatus('Webテスト'),
      nextDeadline: format(addDays(now, 8), 'yyyy-MM-dd'),
    },
    {
      name: 'アクセンチュア',
      industry: 'コンサル',
      statusId: getStatus('1次面接'),
    },
    {
      name: '三井物産',
      industry: '商社',
      statusId: getStatus('最終面接'),
    },
  ];
}

export interface SampleScheduledAction {
  companyName: string;
  type: ActionType;
  subType?: string;
  date: string;
  startTime?: string;
  endTime?: string;
}

export const SAMPLE_SCHEDULED_ACTIONS: SampleScheduledAction[] = [
  {
    companyName: '三菱UFJ銀行',
    type: 'es',
    date: format(addDays(now, 5), 'yyyy-MM-dd'),
  },
  {
    companyName: '野村證券',
    type: 'webtest',
    date: format(addDays(now, 8), 'yyyy-MM-dd'),
  },
  {
    companyName: 'アクセンチュア',
    type: 'interview',
    subType: '1次面接',
    date: format(addDays(now, 3), 'yyyy-MM-dd'),
    startTime: '14:00',
    endTime: '15:00',
  },
  {
    companyName: '三井物産',
    type: 'interview',
    subType: '最終面接',
    date: format(addDays(now, 10), 'yyyy-MM-dd'),
    startTime: '13:00',
    endTime: '14:30',
  },
];
