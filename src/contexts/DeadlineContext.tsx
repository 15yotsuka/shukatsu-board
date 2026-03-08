'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { DeadlineEntry } from '@/lib/types';

interface DeadlineContextType {
  deadlines: DeadlineEntry[];
  loading: boolean;
  error: string | null;
}

const DeadlineContext = createContext<DeadlineContextType>({
  deadlines: [],
  loading: true,
  error: null,
});

export function useDeadlines() {
  return useContext(DeadlineContext);
}

function parseCSV(text: string): DeadlineEntry[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    return {
      company_name: (cols[0] || '').trim(),
      type: (cols[1] || '').trim(),
      deadline: (cols[2] || '').trim(),
      label: (cols[3] || '').trim(),
      job_type: (cols[4] || '').trim(),
    };
  }).filter((entry) => entry.company_name && entry.deadline);
}

export function DeadlineProvider({ children }: { children: ReactNode }) {
  const [deadlines, setDeadlines] = useState<DeadlineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/deadlines.csv')
      .then((res) => {
        if (!res.ok) throw new Error('データを取得できませんでした');
        return res.text();
      })
      .then((text) => {
        const parsed = parseCSV(text);
        setDeadlines(parsed);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'データを取得できませんでした');
        setLoading(false);
      });
  }, []);

  return (
    <DeadlineContext.Provider value={{ deadlines, loading, error }}>
      {children}
    </DeadlineContext.Provider>
  );
}
