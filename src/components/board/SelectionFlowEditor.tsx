'use client';

import { useState } from 'react';
import { DEFAULT_STATUS_NAMES } from '@/lib/defaults';

// デフォルトフローステージ（DEFAULT_STATUS_NamesからOKなもの）
export const DEFAULT_FLOW_STAGES = DEFAULT_STATUS_NAMES.filter(
  (s) => s !== '内定' && s !== '見送り'
);

// 追加候補として表示するプリセット（デフォルトに含まれないもの）
const EXTRA_PRESETS = ['グループディスカッション', '適性検査', '会社説明会', 'OB・OG訪問'];

const ALL_PRESETS = [...DEFAULT_FLOW_STAGES, ...EXTRA_PRESETS];

interface SelectionFlowEditorProps {
  stages: string[];
  onChange: (stages: string[]) => void;
  onReset?: () => void;
}

export function SelectionFlowEditor({ stages, onChange, onReset }: SelectionFlowEditorProps) {
  const [customInput, setCustomInput] = useState('');

  const availablePresets = ALL_PRESETS.filter((p) => !stages.includes(p));

  const addStage = (stage: string) => {
    const trimmed = stage.trim();
    if (!trimmed || stages.includes(trimmed)) return;
    onChange([...stages, trimmed]);
  };

  const removeStage = (index: number) => {
    onChange(stages.filter((_, i) => i !== index));
  };

  const handleAddCustom = () => {
    addStage(customInput);
    setCustomInput('');
  };

  return (
    <div className="space-y-3">
      {/* 現在のフロー（削除可能チップ） */}
      {stages.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1">
          {stages.map((stage, i) => (
            <span key={i} className="flex items-center">
              {i > 0 && (
                <span className="text-[var(--color-text-secondary)] text-[11px] mx-0.5">→</span>
              )}
              <span className="flex items-center gap-0.5 px-2 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-[12px] font-semibold">
                {stage}
                <button
                  type="button"
                  onClick={() => removeStage(i)}
                  className="ml-0.5 text-[var(--color-primary)]/60 hover:text-[var(--color-primary)] leading-none ios-tap"
                >
                  ×
                </button>
              </span>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-[var(--color-text-secondary)]">ステージを追加してください</p>
      )}

      {/* プリセット追加ボタン */}
      {availablePresets.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">
            追加できるステージ
          </p>
          <div className="flex flex-wrap gap-1.5">
            {availablePresets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => addStage(p)}
                className="px-2.5 py-1 bg-[var(--color-border)] text-[var(--color-text-secondary)] rounded-full text-[12px] ios-tap hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors"
              >
                ＋ {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* カスタム入力 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="独自のステージ名（例: GD）"
          className="ios-input flex-1 text-[13px] !py-1.5"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCustom();
            }
          }}
        />
        <button
          type="button"
          onClick={handleAddCustom}
          disabled={!customInput.trim()}
          className="px-3 rounded-xl text-[13px] font-semibold bg-[var(--color-primary)] text-white ios-tap disabled:opacity-40"
        >
          追加
        </button>
      </div>

      {/* リセット */}
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-[12px] text-[var(--color-text-secondary)] ios-tap"
        >
          リセット（デフォルトに戻す）
        </button>
      )}
    </div>
  );
}
