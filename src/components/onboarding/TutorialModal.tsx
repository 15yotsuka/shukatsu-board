'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface TutorialStep {
  title: string;
  body: string;
}

interface TutorialModalProps {
  steps: TutorialStep[];
  onComplete: () => void;
}

export function TutorialModal({ steps, onComplete }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.25 }}
        className="relative bg-card rounded-2xl p-6 mx-6 max-w-sm w-full shadow-2xl"
      >
        {/* Step indicator dots */}
        {steps.length > 1 && (
          <div className="flex justify-center gap-1.5 mb-4">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentStep ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
                }`}
              />
            ))}
          </div>
        )}

        <h3 className="text-[17px] font-bold text-[var(--color-text)] text-center mb-3">
          {step.title}
        </h3>
        <p className="text-[14px] text-[var(--color-text-secondary)] text-center whitespace-pre-line leading-relaxed mb-6">
          {step.body}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onComplete}
            className="flex-none text-[14px] text-[var(--color-text-secondary)] py-3 px-4 ios-tap"
          >
            スキップ
          </button>
          <button
            onClick={() => isLast ? onComplete() : setCurrentStep(currentStep + 1)}
            className="flex-1 py-3 rounded-xl text-[15px] font-semibold bg-[var(--color-primary)] text-white ios-tap"
          >
            {isLast ? 'はじめる' : '次へ'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
