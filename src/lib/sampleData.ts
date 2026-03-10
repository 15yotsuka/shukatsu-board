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
    // 未エントリー
    {
      name: 'ソニーグループ',
      industry: 'メーカー',
      statusId: first,
      selectionType: 'main' as SelectionType,
      nextActionDate: format(now, 'yyyy-MM-dd'),
      nextActionType: 'es' as ActionType,
    },
    {
      name: 'トヨタ自動車',
      industry: 'メーカー',
      statusId: first,
      selectionType: 'main' as SelectionType,
      nextActionDate: format(addDays(now, 6), 'yyyy-MM-dd'),
      nextActionType: 'es' as ActionType,
    },
    // ES作成中
    {
      name: '三菱UFJ銀行',
      industry: '金融',
      statusId: getStatus('ES作成中'),
      selectionType: 'main' as SelectionType,
      nextActionDate: format(addDays(now, 3), 'yyyy-MM-dd'),
      nextActionType: 'es' as ActionType,
    },
    {
      name: '野村證券',
      industry: '金融',
      statusId: getStatus('ES作成中'),
      selectionType: 'main' as SelectionType,
      nextActionDate: format(addDays(now, 5), 'yyyy-MM-dd'),
      nextActionType: 'es' as ActionType,
    },
    // ES提出済
    {
      name: '日立製作所',
      industry: 'メーカー',
      statusId: getStatus('ES提出済'),
      selectionType: 'intern' as SelectionType,
      nextActionDate: format(addDays(now, 5), 'yyyy-MM-dd'),
      nextActionType: 'webtest' as ActionType,
    },
    {
      name: '味の素',
      industry: 'メーカー',
      statusId: getStatus('ES提出済'),
      selectionType: 'main' as SelectionType,
      nextActionDate: format(addDays(now, 8), 'yyyy-MM-dd'),
      nextActionType: 'webtest' as ActionType,
    },
    // Webテスト受検済
    {
      name: '電通',
      industry: 'マスコミ・広告・エンタメ',
      statusId: getStatus('Webテスト'),
      selectionType: 'main' as SelectionType,
      nextActionDate: format(addDays(now, 4), 'yyyy-MM-dd'),
      nextActionType: 'interview' as ActionType,
    },
    {
      name: '博報堂',
      industry: 'マスコミ・広告・エンタメ',
      statusId: getStatus('Webテスト'),
      selectionType: 'main' as SelectionType,
      nextActionDate: format(addDays(now, 9), 'yyyy-MM-dd'),
      nextActionType: 'interview' as ActionType,
    },
    // 1次面接
    {
      name: 'アクセンチュア',
      industry: 'コンサル',
      statusId: getStatus('1次面接'),
      selectionType: 'main' as SelectionType,
      nextActionDate: format(now, 'yyyy-MM-dd'),
      nextActionType: 'interview' as ActionType,
    },
    {
      name: 'デロイトトーマツ',
      industry: 'コンサル',
      statusId: getStatus('1次面接'),
      selectionType: 'main' as SelectionType,
      nextActionDate: format(addDays(now, 11), 'yyyy-MM-dd'),
      nextActionType: 'interview' as ActionType,
    },
    // 2次面接
    {
      name: 'サイバーエージェント',
      industry: 'IT・通信',
      statusId: getStatus('2次面接'),
      selectionType: 'intern' as SelectionType,
      nextActionDate: format(addDays(now, 14), 'yyyy-MM-dd'),
      nextActionType: 'interview' as ActionType,
    },
    {
      name: '楽天グループ',
      industry: 'IT・通信',
      statusId: getStatus('2次面接'),
      selectionType: 'main' as SelectionType,
      nextActionDate: format(addDays(now, 12), 'yyyy-MM-dd'),
      nextActionType: 'interview' as ActionType,
    },
    // 最終面接
    {
      name: '三井物産',
      industry: '商社',
      statusId: getStatus('最終面接'),
      selectionType: 'main' as SelectionType,
      nextActionDate: format(addDays(now, 10), 'yyyy-MM-dd'),
      nextActionType: 'interview' as ActionType,
    },
    {
      name: '伊藤忠商事',
      industry: '商社',
      statusId: getStatus('最終面接'),
      selectionType: 'main' as SelectionType,
      nextActionDate: format(addDays(now, 13), 'yyyy-MM-dd'),
      nextActionType: 'interview' as ActionType,
    },
    // インターン選考中
    {
      name: 'NTTデータ',
      industry: 'IT・通信',
      statusId: getStatus('インターン'),
      selectionType: 'intern' as SelectionType,
      nextActionDate: format(addDays(now, 8), 'yyyy-MM-dd'),
      nextActionType: 'interview' as ActionType,
    },
    {
      name: '三菱商事',
      industry: '商社',
      statusId: getStatus('インターン'),
      selectionType: 'intern' as SelectionType,
      nextActionDate: format(addDays(now, 11), 'yyyy-MM-dd'),
      nextActionType: 'other' as ActionType,
    },
    // 内定
    {
      name: 'リクルート',
      industry: 'IT・通信',
      statusId: getStatus('内定'),
      selectionType: 'main' as SelectionType,
    },
    {
      name: '東京海上日動',
      industry: '金融',
      statusId: getStatus('内定'),
      selectionType: 'main' as SelectionType,
    },
    // お見送り
    {
      name: 'キーエンス',
      industry: 'メーカー',
      statusId: getStatus('お見送り'),
      selectionType: 'main' as SelectionType,
    },
    {
      name: '三井住友銀行',
      industry: '金融',
      statusId: getStatus('お見送り'),
      selectionType: 'main' as SelectionType,
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
    companyName: 'アクセンチュア',
    type: '一次面接',
    date: format(now, 'yyyy-MM-dd'),
    startTime: '14:00',
    endTime: '15:00',
    location: 'オンライン',
  },
  {
    companyName: 'デロイトトーマツ',
    type: '一次面接',
    date: format(addDays(now, 11), 'yyyy-MM-dd'),
    startTime: '10:00',
    endTime: '11:00',
    location: 'オンライン',
  },
  {
    companyName: '楽天グループ',
    type: '二次面接',
    date: format(addDays(now, 12), 'yyyy-MM-dd'),
    startTime: '16:00',
    endTime: '17:00',
    location: '二子玉川本社',
  },
  {
    companyName: '三井物産',
    type: '最終面接',
    date: format(addDays(now, 10), 'yyyy-MM-dd'),
    startTime: '13:00',
    endTime: '14:30',
    location: '大手町本社',
  },
  {
    companyName: '伊藤忠商事',
    type: '最終面接',
    date: format(addDays(now, 13), 'yyyy-MM-dd'),
    startTime: '11:00',
    endTime: '12:00',
    location: '北青山本社',
  },
  {
    companyName: 'サイバーエージェント',
    type: '二次面接',
    date: format(addDays(now, 14), 'yyyy-MM-dd'),
    startTime: '15:00',
    endTime: '16:00',
    location: '渋谷本社',
  },
  {
    companyName: 'NTTデータ',
    type: 'インターン面接',
    date: format(addDays(now, 8), 'yyyy-MM-dd'),
    startTime: '09:30',
    endTime: '10:30',
    location: '豊洲本社',
  },
];
