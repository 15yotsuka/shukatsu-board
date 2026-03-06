import type { Company } from '@/lib/types';

const today = new Date();
const d = (days: number) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
};

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
  const interview = getStatus('面接');
  const offer = getStatus('内定');

  return [
    { name: 'トヨタ自動車株式会社', industry: '自動車', jobType: '総合職', statusId: first, nextDeadline: d(3) },
    { name: 'ソニーグループ株式会社', industry: '電機・電子', jobType: 'エンジニア', statusId: interview, nextDeadline: d(7) },
    { name: 'アクセンチュア株式会社', industry: 'コンサル', jobType: 'コンサルタント', statusId: getStatus('ES') },
    { name: '株式会社NTTデータ', industry: 'IT・SI', jobType: 'SE', statusId: first, nextDeadline: d(5) },
    { name: '三菱商事株式会社', industry: '総合商社', jobType: '総合職', statusId: first },
    { name: '楽天グループ株式会社', industry: 'IT・EC', jobType: 'エンジニア', statusId: interview, nextDeadline: d(10) },
    { name: '株式会社リクルートホールディングス', industry: '人材・メディア', jobType: '総合職', statusId: interview },
    { name: '野村證券株式会社', industry: '証券', jobType: '総合職', statusId: first, nextDeadline: d(14) },
    { name: '任天堂株式会社', industry: 'ゲーム', jobType: 'エンジニア', statusId: offer },
    { name: 'デロイト トーマツ コンサルティング合同会社', industry: 'コンサル', jobType: 'コンサルタント', statusId: interview },
  ] as Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'orderInColumn'>[];
}
