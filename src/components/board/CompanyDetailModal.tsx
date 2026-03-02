'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import type { Company } from '@/lib/types';
import { PromoteDialog } from '@/components/status/PromoteDialog';
import { InterviewForm } from '@/components/calendar/InterviewForm';
import { fireConfetti } from '@/lib/confetti';

interface MemoData {
  es: string;
  interview: string;
  reverseQuestion: string;
  other: string;
}

function parseMemo(raw: string | undefined): MemoData {
  if (!raw) return { es: '', interview: '', reverseQuestion: '', other: '' };
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'es' in parsed) {
      return parsed as MemoData;
    }
    return { es: '', interview: '', reverseQuestion: '', other: raw };
  } catch {
    return { es: '', interview: '', reverseQuestion: '', other: raw };
  }
}

interface CompanyDetailModalProps {
  company: Company;
  onClose: () => void;
}

export function CompanyDetailModal({ company, onClose }: CompanyDetailModalProps) {
  const updateCompany = useAppStore((s) => s.updateCompany);
  const deleteCompany = useAppStore((s) => s.deleteCompany);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const interviews = useAppStore((s) => s.interviews);
  const deleteInterview = useAppStore((s) => s.deleteInterview);

  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);

  const [name, setName] = useState(company.name);
  const [industry, setIndustry] = useState(company.industry ?? '');
  const [jobType, setJobType] = useState(company.jobType ?? '');
  const [url, setUrl] = useState(company.url ?? '');
  const [statusId, setStatusId] = useState(company.statusId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [nameError, setNameError] = useState('');

  const [myPageUrl, setMyPageUrl] = useState(company.myPageUrl ?? '');
  const [myPageId, setMyPageId] = useState(company.myPageId ?? '');
  const [myPagePassword, setMyPagePassword] = useState(company.myPagePassword ?? '');
  const [showPassword, setShowPassword] = useState(false);

  const [memo, setMemo] = useState<MemoData>(() => parseMemo(company.selectionMemo));
  const [nextDeadline, setNextDeadline] = useState(company.nextDeadline ?? '');

  const trackStatuses = statusColumns
    .filter((s) => s.trackType === company.trackType)
    .sort((a, b) => a.order - b.order);

  const companyInterviews = interviews
    .filter((i) => i.companyId === company.id)
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('企業名は必須です');
      return;
    }

    if (statusId !== company.statusId) {
      const newStatus = statusColumns.find((s) => s.id === statusId);
      if (newStatus && (newStatus.name === '内定' || newStatus.name === 'インターン参加')) {
        fireConfetti();
      }
    }

    updateCompany(company.id, {
      name: trimmed,
      industry: industry.trim() || undefined,
      jobType: jobType.trim() || undefined,
      url: url.trim() || undefined,
      selectionMemo: (memo.es || memo.interview || memo.reverseQuestion || memo.other)
        ? JSON.stringify(memo)
        : undefined,
      nextDeadline: nextDeadline.trim() || undefined,
      statusId,
      myPageUrl: myPageUrl.trim() || undefined,
      myPageId: myPageId.trim() || undefined,
      myPagePassword: myPagePassword.trim() || undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    deleteCompany(company.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative bg-[var(--color-bg)] rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Fixed header */}
        <div className="bg-card px-4 pt-4 pb-0 flex-shrink-0 border-b border-[var(--color-border)]">
          {/* Grab bar */}
          <div className="flex justify-center pb-2 md:hidden">
            <div className="w-10 h-1.5 bg-[var(--color-border)] rounded-full" />
          </div>

          {/* Editable company name */}
          <div className="mb-3">
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              className="w-full text-[20px] font-bold bg-transparent text-[var(--color-text)] outline-none"
            />
            {nameError && <p className="text-[var(--color-danger)] text-[12px] mt-0.5">{nameError}</p>}
          </div>

          {/* Status + deadline row */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <select
              value={statusId}
              onChange={(e) => setStatusId(e.target.value)}
              className="flex-1 min-w-0 text-[14px] font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-0 rounded-full px-3 py-1 outline-none ios-tap"
            >
              {trackStatuses.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {nextDeadline && (
              <span className="flex-none text-[13px] font-semibold text-[var(--color-danger)] bg-[var(--color-danger)]/10 rounded-full px-3 py-1">
                {nextDeadline.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2/$3')}
              </span>
            )}
          </div>

          {/* Segmented control */}
          <div className="flex gap-0 mb-0">
            {(['基本情報', 'マイページ', 'メモ'] as const).map((label, i) => (
              <button
                key={label}
                onClick={() => setActiveTab(i as 0 | 1 | 2)}
                className={`flex-1 pb-2.5 pt-1 text-[13px] font-semibold transition-colors relative ${
                  activeTab === i ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
                }`}
              >
                {label}
                {activeTab === i && (
                  <motion.div
                    layoutId="modal-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--color-primary)] rounded-t-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal swipe content */}
        <div className="overflow-hidden flex-1">
          <div
            className="flex h-full transition-transform duration-300"
            style={{ transform: `translateX(-${activeTab * 100}%)` }}
          >
            {/* Page 0: 基本情報 */}
            <div className="w-full flex-none overflow-y-auto p-4 space-y-4">
              <div className="bg-card rounded-xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                <div className="divide-y divide-[var(--color-border)]">
                  <div className="px-4 py-3">
                    <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">業界</label>
                    <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} className="ios-input" placeholder="例: IT・通信" />
                  </div>
                  <div className="px-4 py-3">
                    <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">職種</label>
                    <input type="text" value={jobType} onChange={(e) => setJobType(e.target.value)} className="ios-input" placeholder="例: 総合職・エンジニア" />
                  </div>
                  <div className="px-4 py-3">
                    <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">URL</label>
                    <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className="ios-input" placeholder="https://..." />
                  </div>
                  <div className="px-4 py-3">
                    <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">次の締切日</label>
                    <input type="date" value={nextDeadline} onChange={(e) => setNextDeadline(e.target.value)} className="ios-input" />
                  </div>
                </div>
              </div>

              {/* 面接予定 */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">面接予定</h3>
                  <button
                    onClick={() => setShowInterviewForm(true)}
                    className="text-[15px] text-[var(--color-primary)] font-medium ios-tap min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    + 追加
                  </button>
                </div>
                {companyInterviews.length === 0 ? (
                  <p className="text-[14px] text-[var(--color-text-secondary)] text-center py-4">面接予定はありません</p>
                ) : (
                  <div className="bg-card rounded-xl divide-y divide-[var(--color-border)] shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                    {companyInterviews.map((interview) => (
                      <div key={interview.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-[15px] font-medium text-[var(--color-text)]">{interview.type}</p>
                          <p className="text-[13px] text-[var(--color-text-secondary)]">
                            {new Date(interview.datetime).toLocaleString('ja-JP', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {interview.location && ` / ${interview.location}`}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteInterview(interview.id)}
                          className="w-11 h-11 flex items-center justify-center text-[var(--color-danger)] ios-tap"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Page 1: マイページ */}
            <div className="w-full flex-none overflow-y-auto p-4">
              <div className="bg-card rounded-xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                <div className="divide-y divide-[var(--color-border)]">
                  <div className="px-4 py-3">
                    <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">マイページURL</label>
                    <input type="url" value={myPageUrl} onChange={(e) => setMyPageUrl(e.target.value)} className="ios-input" placeholder="https://mypage.example.com" />
                    {myPageUrl.trim() && (
                      <a
                        href={myPageUrl.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-[14px] text-[var(--color-primary)] font-medium ios-tap"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        マイページを開く
                      </a>
                    )}
                  </div>
                  <div className="px-4 py-3">
                    <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">ログインID</label>
                    <input type="text" value={myPageId} onChange={(e) => setMyPageId(e.target.value)} className="ios-input" placeholder="メールアドレス / ID" />
                  </div>
                  <div className="px-4 py-3">
                    <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">パスワード</label>
                    <div className="flex items-center gap-2">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={myPagePassword}
                        onChange={(e) => setMyPagePassword(e.target.value)}
                        className="ios-input flex-1"
                        placeholder="パスワード"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="w-11 h-11 flex items-center justify-center text-[var(--color-text-secondary)] ios-tap shrink-0"
                        aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Page 2: メモ（選考ログ） */}
            <div className="w-full flex-none overflow-y-auto p-4 space-y-4">
              {/* ES・志望動機 */}
              <div className="bg-card rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                <div className="px-4 pt-3 pb-1 border-b border-[var(--color-border)]">
                  <h4 className="text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
                    ES・志望動機
                  </h4>
                </div>
                <div className="p-4">
                  <textarea
                    placeholder="ES回答・志望動機を記録..."
                    value={memo.es}
                    onChange={(e) => setMemo((prev) => ({ ...prev, es: e.target.value }))}
                    className="w-full bg-transparent text-[var(--color-text)] text-[15px] leading-relaxed min-h-32 resize-y outline-none"
                  />
                </div>
              </div>

              {/* 面接ログ */}
              <div className="bg-card rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                <div className="px-4 pt-3 pb-1 border-b border-[var(--color-border)]">
                  <h4 className="text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
                    面接ログ
                  </h4>
                </div>
                <div className="p-4">
                  <textarea
                    placeholder="面接日時、質問内容、自分の回答を記録..."
                    value={memo.interview}
                    onChange={(e) => setMemo((prev) => ({ ...prev, interview: e.target.value }))}
                    className="w-full bg-transparent text-[var(--color-text)] text-[15px] leading-relaxed min-h-32 resize-y outline-none"
                  />
                </div>
              </div>

              {/* 逆質問 */}
              <div className="bg-card rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                <div className="px-4 pt-3 pb-1 border-b border-[var(--color-border)]">
                  <h4 className="text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
                    逆質問
                  </h4>
                </div>
                <div className="p-4">
                  <textarea
                    placeholder="準備した逆質問、実際に聞いた内容..."
                    value={memo.reverseQuestion}
                    onChange={(e) => setMemo((prev) => ({ ...prev, reverseQuestion: e.target.value }))}
                    className="w-full bg-transparent text-[var(--color-text)] text-[15px] leading-relaxed min-h-24 resize-y outline-none"
                  />
                </div>
              </div>

              {/* その他メモ */}
              <div className="bg-card rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                <div className="px-4 pt-3 pb-1 border-b border-[var(--color-border)]">
                  <h4 className="text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
                    その他メモ
                  </h4>
                </div>
                <div className="p-4">
                  <textarea
                    placeholder="感想、次回への改善点、企業の雰囲気など..."
                    value={memo.other}
                    onChange={(e) => setMemo((prev) => ({ ...prev, other: e.target.value }))}
                    className="w-full bg-transparent text-[var(--color-text)] text-[15px] leading-relaxed min-h-24 resize-y outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed footer */}
        <div className="flex-shrink-0 px-4 pb-6 pt-3 border-t border-[var(--color-border)] bg-card space-y-2">
          <button onClick={handleSave} className="ios-button-primary shadow-sm hover:opacity-90 transition-opacity">
            保存
          </button>
          {company.trackType === 'intern' && (
            <button
              onClick={() => setShowPromote(true)}
              className="w-full text-[var(--color-primary)] bg-[var(--color-primary-light)] rounded-xl py-3 text-center text-[16px] font-semibold ios-tap"
            >
              本選考に進む
            </button>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full text-[var(--color-danger)] text-center py-2.5 text-[15px] font-medium ios-tap"
          >
            削除
          </button>
        </div>
      </motion.div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-card rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl"
          >
            <h3 className="text-[17px] font-bold text-[var(--color-text)] mb-2">削除確認</h3>
            <p className="text-[15px] text-[var(--color-text-secondary)] mb-4">
              「{company.name}」を削除しますか？この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 ios-button-secondary !border !border-[var(--color-border)] !rounded-xl"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 ios-button-primary !bg-[var(--color-danger)]"
              >
                削除
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showPromote && (
        <PromoteDialog
          company={company}
          onClose={() => setShowPromote(false)}
          onPromoted={onClose}
        />
      )}

      {showInterviewForm && (
        <InterviewForm
          companyId={company.id}
          onClose={() => setShowInterviewForm(false)}
        />
      )}
    </div>
  );
}
