'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ES_TEMPLATE_QUESTIONS } from '@/lib/defaults';

interface ESTemplatesProps {
  companyId: string;
  onClose: () => void;
}

export function ESTemplates({ companyId, onClose }: ESTemplatesProps) {
  const addESEntry = useAppStore((s) => s.addESEntry);
  const esEntries = useAppStore((s) => s.esEntries);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const existingCount = esEntries.filter((e) => e.companyId === companyId).length;

  const toggleQuestion = (index: number) => {
    const newSet = new Set(selected);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelected(newSet);
  };

  const handleAdd = () => {
    const sortedIndices = [...selected].sort((a, b) => a - b);
    sortedIndices.forEach((index, i) => {
      addESEntry({
        companyId,
        question: ES_TEMPLATE_QUESTIONS[index],
        answer: '',
        order: existingCount + i,
      });
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg animate-slide-up">
        {/* Grab bar */}
        <div className="flex justify-center pt-2 pb-0 md:hidden">
          <div className="w-9 h-1 bg-[#E5E5EA] rounded-full" />
        </div>

        <div className="px-4 pt-4 pb-2">
          <h2 className="text-[17px] font-bold text-center text-[#1C1C1E]">テンプレートから追加</h2>
        </div>

        <div className="p-4 space-y-2">
          {ES_TEMPLATE_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => toggleQuestion(i)}
              className={`w-full text-left p-3.5 rounded-xl text-[15px] flex items-center gap-3 min-h-[44px] ios-tap transition-colors ${
                selected.has(i) ? 'bg-[#E8F0FE]' : 'bg-[#F2F2F7]'
              }`}
            >
              <div
                className={`w-[22px] h-[22px] rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  selected.has(i) ? 'bg-[#007AFF] border-[#007AFF]' : 'border-[#C7C7CC]'
                }`}
              >
                {selected.has(i) && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-[#1C1C1E]">{q}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-[#E5E5EA]">
          <button
            onClick={handleAdd}
            disabled={selected.size === 0}
            className="ios-button-primary"
          >
            {selected.size > 0 ? `${selected.size}件追加する` : '設問を選択してください'}
          </button>
        </div>
      </div>
    </div>
  );
}
