export const INDUSTRIES = [
  'メーカー',
  '商社',
  '金融',
  '不動産・建設',
  'IT・通信',
  'サービス・インフラ',
  'マスコミ・広告・エンタメ',
  'コンサル',
  '流通・小売',
  '人材・教育・その他',
] as const;

export type Industry = typeof INDUSTRIES[number];
