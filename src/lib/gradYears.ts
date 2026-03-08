export const GRAD_YEARS = [27, 28] as const;
export type GradYear = (typeof GRAD_YEARS)[number];

export const GRAD_YEAR_LABELS: Record<GradYear, string> = {
  27: '27卒（2027年3月卒）',
  28: '28卒（2028年3月卒）',
};

export function getDeadlineCSVPath(year: GradYear): string {
  return `/deadlines-${year}.csv`;
}
