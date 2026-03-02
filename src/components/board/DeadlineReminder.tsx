'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { differenceInDays, startOfDay } from 'date-fns';

export function DeadlineReminder() {
    const interviews = useAppStore((s) => s.interviews);
    const companies = useAppStore((s) => s.companies);
    const [dismissed, setDismissed] = useState(false);

    // sessionStorage で「今のセッションで閉じた」かを管理
    useEffect(() => {
        if (sessionStorage.getItem('deadline-dismissed') === 'true') {
            setDismissed(true);
        }
    }, []);

    const handleDismiss = () => {
        sessionStorage.setItem('deadline-dismissed', 'true');
        setDismissed(true);
    };

    const today = startOfDay(new Date());

    // 今後7日以内の面接を抽出
    const upcoming = interviews
        .map((interview) => {
            const interviewDay = startOfDay(new Date(interview.datetime));
            const daysUntil = differenceInDays(interviewDay, today);
            const company = companies.find((c) => c.id === interview.companyId);
            return { interview, daysUntil, company };
        })
        .filter(({ daysUntil }) => daysUntil >= 0 && daysUntil <= 7)
        .sort((a, b) => a.daysUntil - b.daysUntil);

    if (dismissed || upcoming.length === 0) return null;

    const getDayLabel = (days: number) => {
        if (days === 0) return '今日';
        if (days === 1) return '明日';
        return `${days}日後`;
    };

    const getUrgency = (days: number) => {
        if (days <= 1) return 'urgent'; // 赤
        return 'warning'; // 黄
    };

    return (
        <div className="mx-3 mt-3 rounded-2xl overflow-hidden shadow-sm">
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[var(--color-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="text-[13px] font-semibold text-[var(--color-text)]">直近の面接／締切</span>
                </div>
                <button
                    onClick={handleDismiss}
                    className="ios-tap w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-text-secondary)]"
                    aria-label="閉じる"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* リスト */}
            <div className="bg-card divide-y divide-[var(--color-border)]">
                {upcoming.map(({ interview, daysUntil, company }) => {
                    const urgency = getUrgency(daysUntil);
                    return (
                        <div key={interview.id} className="flex items-center gap-3 px-4 py-3">
                            {/* 緊急度バッジ */}
                            <div className={`shrink-0 min-w-[44px] text-center px-2 py-1 rounded-lg text-[12px] font-bold ${urgency === 'urgent'
                                ? 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]'
                                : 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
                                }`}>
                                {getDayLabel(daysUntil)}
                            </div>
                            {/* 内容 */}
                            <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-medium text-[var(--color-text)] truncate">
                                    {company?.name ?? '不明な企業'}
                                </p>
                                <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
                                    {interview.type}
                                    {interview.location && ` · ${interview.location}`}
                                    {' · '}
                                    {new Date(interview.datetime).toLocaleString('ja-JP', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
