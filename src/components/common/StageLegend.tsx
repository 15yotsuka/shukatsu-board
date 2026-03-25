import { getStageColor } from '@/lib/stageColors';

const LEGEND_STAGES = [
  { key: 'エントリー前', label: 'エントリー前' },
  { key: 'ES',          label: 'ES' },
  { key: 'Webテスト',   label: 'Webテスト' },
  { key: '1次面接',     label: '面接' },
  { key: '内定',        label: '内定' },
];

export function StageLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 px-1 text-xs text-gray-400 dark:text-gray-500 mb-3">
      {LEGEND_STAGES.map(({ key, label }) => (
        <span key={key} className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getStageColor(key) }} />
          {label}
        </span>
      ))}
    </div>
  );
}
