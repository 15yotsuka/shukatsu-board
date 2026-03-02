'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import type { Company } from '@/lib/types';
import { PromoteDialog } from '@/components/status/PromoteDialog';
import { InterviewForm } from '@/components/calendar/InterviewForm';
import { ESForm } from '@/components/es/ESForm';
import { fireConfetti } from '@/lib/confetti';

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

  // ES
  const esEntries = useAppStore((s) => s.esEntries);
  const addESEntry = useAppStore((s) => s.addESEntry);

  const [activeTab, setActiveTab] = useState<'basic' | 'mypage' | 'memo' | 'es'>('basic');

  const [name, setName] = useState(company.name);
  const [industry, setIndustry] = useState(company.industry ?? '');
  const [jobType, setJobType] = useState(company.jobType ?? '');
  const [url, setUrl] = useState(company.url ?? '');
  const [memo, setMemo] = useState(company.memo ?? '');
  const [statusId, setStatusId] = useState(company.statusId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [nameError, setNameError] = useState('');

  // マイページ情報
  const [myPageUrl, setMyPageUrl] = useState(company.myPageUrl ?? '');
  const [myPageId, setMyPageId] = useState(company.myPageId ?? '');
  const [myPagePassword, setMyPagePassword] = useState(company.myPagePassword ?? '');
  const [showPassword, setShowPassword] = useState(false);

  const [selectionMemo, setSelectionMemo] = useState(company.selectionMemo ?? '');
  const [nextDeadline, setNextDeadline] = useState(company.nextDeadline ?? '');

  const trackStatuses = statusColumns
    .filter((s) => s.trackType === company.trackType)
    .sort((a, b) => a.order - b.order);

  const companyInterviews = interviews
    .filter((i) => i.companyId === company.id)
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  const companyEntries = esEntries
    .filter((e) => e.companyId === company.id)
    .sort((a, b) => a.order - b.order);

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
      memo: memo.trim() || undefined,
      selectionMemo: selectionMemo.trim() || undefined,
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

  const handleAddBlankES = () => {
    addESEntry({
      companyId: company.id,
      question: '',
      answer: '',
      order: companyEntries.length,
    });
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const reordered = [...companyEntries];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    const store = useAppStore.getState();
    store.reorderESEntries(
      company.id,
      reordered.map((e) => e.id)
    );
  };

  const handleMoveDown = (index: number) => {
    if (index >= companyEntries.length - 1) return;
    const reordered = [...companyEntries];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    const store = useAppStore.getState();
    store.reorderESEntries(
      company.id,
      reordered.map((e) => e.id)
    );
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
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative bg-[var(--color-bg)] rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header & Tabs */}
        <div className="bg-card px-4 pt-4 pb-0 flex-shrink-0 z-10 border-b border-[var(--color-border)]">
          {/* Grab bar */}
          <div className="flex justify-center pb-2 md:hidden">
            <div className="w-10 h-1.5 bg-[var(--color-border)] rounded-full" />
          </div>
          <h2 className="text-[18px] font-bold text-center text-[var(--color-text)] mb-3">{company.name}</h2>

          <div className="flex gap-1 px-2 overflow-x-auto">
            {([
              { key: 'basic', label: '基本情報' },
              { key: 'mypage', label: 'マイページ' },
              { key: 'memo', label: 'メモ' },
              { key: 'es', label: 'ES管理' },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 px-2 text-[14px] font-semibold transition-colors relative whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)]'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--color-primary)] rounded-t-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'basic' && (
              <motion.div
                key="basic"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Grouped list - basic info */}
                <div className="bg-card rounded-xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                  <div className="divide-y divide-[var(--color-border)]">
                    <div className="px-4 py-3">
                      <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">
                        企業名 <span className="text-[var(--color-danger)]">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setNameError(''); }}
                        className="ios-input"
                      />
                      {nameError && <p className="text-[var(--color-danger)] text-[12px] mt-1">{nameError}</p>}
                    </div>
                    <div className="px-4 py-3">
                      <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">業界</label>
                      <input
                        type="text"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="ios-input"
                        placeholder="例: IT・通信"
                      />
                    </div>
                    <div className="px-4 py-3">
                      <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">職種</label>
                      <input
                        type="text"
                        value={jobType}
                        onChange={(e) => setJobType(e.target.value)}
                        className="ios-input"
                        placeholder="例: 総合職・エンジニア"
                      />
                    </div>
                    <div className="px-4 py-3">
                      <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">URL</label>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="ios-input"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="px-4 py-3">
                      <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">ステータス</label>
                      <select
                        value={statusId}
                        onChange={(e) => setStatusId(e.target.value)}
                        className="ios-input"
                      >
                        {trackStatuses.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="px-4 py-3">
                      <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">次の締切日</label>
                      <input
                        type="date"
                        value={nextDeadline}
                        onChange={(e) => setNextDeadline(e.target.value)}
                        className="ios-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Interview section */}
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

                {/* Action buttons */}
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
                  className="w-full text-[var(--color-danger)] text-center py-3 text-[16px] font-medium ios-tap"
                >
                  削除
                </button>
              </motion.div>
            )}

            {activeTab === 'mypage' && (
              <motion.div
                key="mypage"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* マイページ情報 */}
                <div className="bg-card rounded-xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                  <div className="divide-y divide-[var(--color-border)]">
                    <div className="px-4 py-3">
                      <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">
                        マイページURL
                      </label>
                      <input
                        type="url"
                        value={myPageUrl}
                        onChange={(e) => setMyPageUrl(e.target.value)}
                        className="ios-input"
                        placeholder="https://mypage.example.com"
                      />
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
                      <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">
                        ログインID
                      </label>
                      <input
                        type="text"
                        value={myPageId}
                        onChange={(e) => setMyPageId(e.target.value)}
                        className="ios-input"
                        placeholder="メールアドレス / ID"
                      />
                    </div>
                    <div className="px-4 py-3">
                      <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">
                        パスワード
                      </label>
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

                <button onClick={handleSave} className="ios-button-primary shadow-sm hover:opacity-90 transition-opacity">
                  保存
                </button>
              </motion.div>
            )}

            {activeTab === 'memo' && (
              <motion.div
                key="memo"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="bg-card rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-4">
                  <textarea
                    placeholder="ESの回答、面接内容、逆質問などを自由にメモ..."
                    value={selectionMemo}
                    onChange={(e) => setSelectionMemo(e.target.value)}
                    className="w-full bg-transparent text-[var(--color-text)] min-h-48 resize-y outline-none"
                  />
                </div>
                <button onClick={handleSave} className="ios-button-primary shadow-sm hover:opacity-90 transition-opacity">
                  保存
                </button>
              </motion.div>
            )}

            {activeTab === 'es' && (
              <motion.div
                key="es"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex gap-2">
                  <button
                    onClick={handleAddBlankES}
                    className="flex-1 ios-button-primary !py-3 !text-[14px] shadow-sm"
                  >
                    + 設問を追加
                  </button>
                </div>

                {companyEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-14 h-14 bg-[var(--color-primary-light)] rounded-2xl flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <p className="text-[16px] font-semibold text-[var(--color-text)] mb-1">設問を追加しましょう</p>
                    <p className="text-[13px] text-[var(--color-text-secondary)]">上のボタンから設問を追加</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {companyEntries.map((entry, index) => (
                      <div key={entry.id} className="bg-card rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-4">
                        <div className="flex items-center justify-end gap-1 mb-1 border-b border-[var(--color-border)] pb-2">
                          <span className="text-[12px] font-medium text-[var(--color-text-secondary)] mr-auto">
                            設問 {index + 1}
                          </span>
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="w-8 h-8 flex items-center justify-center text-[var(--color-primary)] disabled:text-[var(--color-border)] ios-tap"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index === companyEntries.length - 1}
                            className="w-8 h-8 flex items-center justify-center text-[var(--color-primary)] disabled:text-[var(--color-border)] ios-tap"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                        <ESForm entry={entry} />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-card rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl">
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
