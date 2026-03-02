'use client';

import { useAppStore } from '@/store/useAppStore';
import type { Company } from '@/lib/types';

interface PromoteDialogProps {
  company: Company;
  onClose: () => void;
  onPromoted: () => void;
}

export function PromoteDialog({ company, onClose, onPromoted }: PromoteDialogProps) {
  const promoteToMain = useAppStore((s) => s.promoteToMain);

  const handlePromote = () => {
    promoteToMain(company.id);
    onPromoted();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 mx-4 max-w-sm w-full animate-fade-in">
        <h3 className="text-[17px] font-bold text-[#1C1C1E] mb-2">本選考に進む</h3>
        <p className="text-[15px] text-[#8E8E93] mb-1">
          「{company.name}」を本選考ボードに追加しますか？
        </p>
        <p className="text-[13px] text-[#C7C7CC] mb-4">
          インターン側のカードはそのまま残ります
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 ios-button-secondary !border !border-[#E5E5EA] !rounded-xl">
            キャンセル
          </button>
          <button onClick={handlePromote} className="flex-1 ios-button-primary !bg-[#34C759]">
            追加する
          </button>
        </div>
      </div>
    </div>
  );
}
