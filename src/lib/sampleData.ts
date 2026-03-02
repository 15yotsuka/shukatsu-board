import type { Company } from '@/lib/types';

const today = new Date();
const d = (days: number) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
};

export function createSampleCompanies(
  statusColumns: { id: string; name: string; trackType: string }[]
): Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'orderInColumn'>[] {
  const internStatuses = statusColumns.filter((s) => s.trackType === 'intern');
  const mainStatuses = statusColumns.filter((s) => s.trackType === 'main');

  const getStatus = (arr: typeof internStatuses, name: string) =>
    arr.find((s) => s.name.includes(name))?.id ?? arr[0]?.id ?? '';

  const internFirst = internStatuses[0]?.id ?? '';
  const internInterview = getStatus(internStatuses, '面接');
  const internOffer = getStatus(internStatuses, 'インターン参加');
  const mainFirst = mainStatuses[0]?.id ?? '';
  const mainInterview = getStatus(mainStatuses, '面接');
  const mainOffer = getStatus(mainStatuses, '内定');

  return [
    { name: 'トヨタ自動車株式会社', industry: '自動車', jobType: '総合職', trackType: 'intern', statusId: internFirst, nextDeadline: d(3) },
    { name: 'ソニーグループ株式会社', industry: '電機・電子', jobType: 'エンジニア', trackType: 'intern', statusId: internInterview, nextDeadline: d(7) },
    { name: 'アクセンチュア株式会社', industry: 'コンサル', jobType: 'コンサルタント', trackType: 'intern', statusId: internOffer },
    { name: '株式会社NTTデータ', industry: 'IT・SI', jobType: 'SE', trackType: 'main', statusId: mainFirst, nextDeadline: d(5) },
    { name: '三菱商事株式会社', industry: '総合商社', jobType: '総合職', trackType: 'main', statusId: mainFirst },
    { name: '楽天グループ株式会社', industry: 'IT・EC', jobType: 'エンジニア', trackType: 'main', statusId: mainInterview, nextDeadline: d(10) },
    { name: '株式会社リクルートホールディングス', industry: '人材・メディア', jobType: '総合職', trackType: 'main', statusId: mainInterview },
    { name: '野村證券株式会社', industry: '証券', jobType: '総合職', trackType: 'main', statusId: mainFirst, nextDeadline: d(14) },
    { name: '任天堂株式会社', industry: 'ゲーム', jobType: 'エンジニア', trackType: 'main', statusId: mainOffer },
    { name: 'デロイト トーマツ コンサルティング合同会社', industry: 'コンサル', jobType: 'コンサルタント', trackType: 'main', statusId: mainInterview },
  ] as Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'orderInColumn'>[];
}
