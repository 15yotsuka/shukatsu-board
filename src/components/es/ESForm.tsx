'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { ESEntry } from '@/lib/types';

interface ESFormProps {
  entry: ESEntry;
}

export function ESForm({ entry }: ESFormProps) {
  const updateESEntry = useAppStore((s) => s.updateESEntry);
  const deleteESEntry = useAppStore((s) => s.deleteESEntry);

  const [question, setQuestion] = useState(entry.question);
  const [answer, setAnswer] = useState(entry.answer);
  const [charLimit, setCharLimit] = useState(entry.charLimit?.toString() ?? '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const parsedLimit = charLimit ? parseInt(charLimit, 10) : undefined;
  const isOverLimit = parsedLimit !== undefined && !isNaN(parsedLimit) && answer.length > parsedLimit;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [answer]);

  const handleBlur = () => {
    updateESEntry(entry.id, {
      question: question.trim(),
      answer,
      charLimit: parsedLimit && !isNaN(parsedLimit) ? parsedLimit : undefined,
    });
  };

  return (
    <div className="bg-white rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onBlur={handleBlur}
          className="flex-1 bg-transparent text-[15px] font-semibold text-[#1C1C1E] border-b border-[#E5E5EA] pb-2 focus:outline-none focus:border-[#007AFF]"
          placeholder="設問を入力"
        />
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-11 h-11 flex items-center justify-center text-[#FF3B30] flex-shrink-0 ios-tap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onBlur={handleBlur}
        className="w-full bg-[#F2F2F7] border-0 rounded-xl p-4 text-[16px] text-[#1C1C1E] focus:outline-none focus:ring-2 focus:ring-[#007AFF] min-h-[120px] resize-none overflow-hidden placeholder:text-[#C7C7CC]"
        placeholder="回答を入力..."
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#8E8E93]">文字数制限:</span>
          <input
            type="number"
            value={charLimit}
            onChange={(e) => setCharLimit(e.target.value)}
            onBlur={handleBlur}
            className="w-16 h-8 px-2 bg-[#F2F2F7] border-0 rounded-lg text-[13px] text-center text-[#1C1C1E] focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
            placeholder="なし"
            min={0}
          />
        </div>
        <span className={`text-[12px] ${isOverLimit ? 'text-[#FF3B30] font-bold' : 'text-[#8E8E93]'}`}>
          {answer.length}
          {parsedLimit !== undefined && !isNaN(parsedLimit) && `/${parsedLimit}`}文字
        </span>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-2xl p-6 mx-4 max-w-sm w-full animate-fade-in">
            <h3 className="text-[17px] font-bold text-[#1C1C1E] mb-2">削除確認</h3>
            <p className="text-[15px] text-[#8E8E93] mb-4">この設問と回答を削除しますか？</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 ios-button-secondary !border !border-[#E5E5EA] !rounded-xl"
              >
                キャンセル
              </button>
              <button
                onClick={() => deleteESEntry(entry.id)}
                className="flex-1 ios-button-primary !bg-[#FF3B30]"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
