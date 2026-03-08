'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import type { Company } from '@/lib/types';
import { InterviewForm } from '@/components/calendar/InterviewForm';
import { fireConfetti } from '@/lib/confetti';
import { useToast } from '@/lib/useToast';
import {
  TAG_CONFIG,
  ACTION_TYPE_LABELS,
  ACTION_TYPE_COLORS,
  SELECTION_TYPE_LABELS,
  type Tag,
  type ActionType,
  type SelectionType,
} from '@/lib/types';
import { INDUSTRIES } from '@/lib/industries';
import { DEFAULT_MILESTONES, getMilestoneIndex } from '@/lib/progressMilestones';
import { format, parseISO, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';

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

const TAB_LABELS = ['選考詳細', '基本情報', 'マイページ', 'メモ'] as const;
type TabIndex = 0 | 1 | 2 | 3;

export function CompanyDetailModal({ company, onClose }: CompanyDetailModalProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const updateCompany = useAppStore((s) => s.updateCompany);
  const deleteCompany = useAppStore((s) => s.deleteCompany);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const interviews = useAppStore((s) => s.interviews);
  const deleteInterview = useAppStore((s) => s.deleteInterview);
  const allScheduledActions = useAppStore((s) => s.scheduledActions);
  const scheduledActions = allScheduledActions.filter((a) => a.companyId === company.id);
  const addScheduledAction = useAppStore((s) => s.addScheduledAction);
  const deleteScheduledAction = useAppStore((s) => s.deleteScheduledAction);
  const showToast = useToast((s) => s.show);

  const [activeTab, setActiveTab] = useState<TabIndex>(0);

  const [name, setName] = useState(company.name);
  const [industry, setIndustry] = useState(company.industry ?? '');
  const [jobType, setJobType] = useState(company.jobType ?? '');
  const [url, setUrl] = useState(company.url ?? '');
  const [statusId, setStatusId] = useState(company.statusId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [nameError, setNameError] = useState('');

  const [myPageUrl, setMyPageUrl] = useState(company.myPageUrl ?? '');
  const [myPageId, setMyPageId] = useState(company.myPageId ?? '');
  const [myPagePassword, setMyPagePassword] = useState(company.myPagePassword ?? '');
  const [showPassword, setShowPassword] = useState(false);

  const [memo, setMemo] = useState<MemoData>(() => parseMemo(company.selectionMemo));
  const [tags, setTags] = useState<Tag[]>(company.tags ?? []);
  const [selectionType, setSelectionType] = useState<SelectionType>(company.selectionType ?? 'main');
  const [customMilestones, setCustomMilestones] = useState<string[] | undefined>(company.customMilestones);
  const [editingMilestones, setEditingMilestones] = useState(false);
  const [newStepText, setNewStepText] = useState('');
  const [newActionType, setNewActionType] = useState<ActionType>('es');
  const [newActionDate, setNewActionDate] = useState('');
  const [newActionTime, setNewActionTime] = useState('');

  const trackStatuses = [...statusColumns].sort((a, b) => a.order - b.order);
  const effectiveMilestones = (customMilestones && customMilestones.length > 0)
    ? customMilestones
    : (DEFAULT_MILESTONES[selectionType] ?? DEFAULT_MILESTONES['main']);
  const currentStatusName = statusColumns.find((s) => s.id === statusId)?.name ?? '';
  const headerMilestoneIdx = getMilestoneIndex(currentStatusName, effectiveMilestones);

  // インターン→本選考 昇格ダイアログ表示条件
  const showPromoteBanner =
    selectionType === 'intern' &&
    headerMilestoneIdx >= effectiveMilestones.length - 1;

  const handlePromoteToMain = () => {
    const newTags: Tag[] = [...tags];
    if (!newTags.includes('インターン参加済み')) {
      newTags.push('インターン参加済み');
    }
    updateCompany(company.id, {
      selectionType: 'main',
      customMilestones: undefined,
      tags: newTags,
    });
    setSelectionType('main');
    setCustomMilestones(undefined);
    setTags(newTags);
    setShowPromoteDialog(false);
    fireConfetti();
    showToast(`『${name}』を本選考に更新しました。`);
  };

  const toggleTag = (tag: Tag) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const companyInterviews = interviews
    .filter((i) => i.companyId === company.id)
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('企業名は必須です');
      return;
    }

    const newStatus = statusColumns.find((s) => s.id === statusId);
    if (statusId !== company.statusId && newStatus) {
      if (newStatus.name === '内定' || newStatus.name === 'インターン参加') {
        fireConfetti();
      }
      showToast(`『${trimmed}』を【${newStatus.name}】に更新しました。`);
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const futureActions = scheduledActions
      .filter((a) => a.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
    const autoDeadline = futureActions[0]?.date;

    updateCompany(company.id, {
      name: trimmed,
      industry: industry.trim() || undefined,
      jobType: jobType.trim() || undefined,
      url: url.trim() || undefined,
      selectionMemo: (memo.es || memo.interview || memo.reverseQuestion || memo.other)
        ? JSON.stringify(memo)
        : undefined,
      nextDeadline: autoDeadline || undefined,
      statusId,
      myPageUrl: myPageUrl.trim() || undefined,
      myPageId: myPageId.trim() || undefined,
      myPagePassword: myPagePassword.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      selectionType,
      customMilestones: customMilestones && customMilestones.length > 0 ? customMilestones : undefined,
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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm touch-none"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        className="relative bg-[var(--color-bg)] rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden overflow-x-hidden"
      >
        {/* Fixed header */}
        <div className="bg-card px-4 pt-4 pb-0 flex-shrink-0 border-b border-[var(--color-border)]">
          {/* Grab bar */}
          <div className="flex justify-center pb-2 md:hidden">
            <div className="w-10 h-1.5 bg-[var(--color-border)] rounded-full" />
          </div>

          {/* Editable company name + close button */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(''); }}
                className="w-full text-[20px] font-bold bg-transparent text-[var(--color-text)] outline-none"
              />
              {nameError && <p className="text-[var(--color-danger)] text-[12px] mt-0.5">{nameError}</p>}
            </div>
            <button
              onClick={onClose}
              className="flex-none w-8 h-8 flex items-center justify-center text-[var(--color-text-secondary)] bg-[var(--color-border)] rounded-full ios-tap text-[16px]"
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>

          {/* Status + deadline row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <select
              value={statusId}
              onChange={(e) => setStatusId(e.target.value)}
              className="flex-1 min-w-0 text-[14px] font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-0 rounded-full px-3 py-1 outline-none ios-tap"
            >
              {trackStatuses.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {(() => {
              const today = format(new Date(), 'yyyy-MM-dd');
              const next = [...scheduledActions]
                .filter((a) => a.date >= today)
                .sort((a, b) => a.date.localeCompare(b.date))[0];
              if (!next) return null;
              const daysLeft = (new Date(next.date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24);
              const colorClass = daysLeft <= 3
                ? 'text-orange-500 bg-orange-500/10'
                : 'text-[var(--color-danger)] bg-[var(--color-danger)]/10';
              return (
                <span className={`flex-none text-[13px] font-semibold rounded-full px-3 py-1 ${colorClass}`}>
                  {ACTION_TYPE_LABELS[next.type]} {next.date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2/$3')}
                </span>
              );
            })()}
          </div>

          {/* 選考タイプ */}
          <div className="mb-2">
            <select
              value={selectionType}
              onChange={(e) => {
                setSelectionType(e.target.value as SelectionType);
                setCustomMilestones(undefined);
                setEditingMilestones(false);
              }}
              className="text-[13px] font-semibold bg-[var(--color-border)] text-[var(--color-text-secondary)] border-0 rounded-full px-3 py-1 outline-none ios-tap"
            >
              {(Object.entries(SELECTION_TYPE_LABELS) as [SelectionType, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* 進捗バー */}
          <div className="relative flex items-start justify-between w-full mb-3 px-0.5">
            <div className="absolute left-0 right-0 h-px bg-zinc-200 dark:bg-zinc-700" style={{ top: '5px' }}>
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${effectiveMilestones.length > 1 ? (headerMilestoneIdx / (effectiveMilestones.length - 1)) * 100 : 0}%` }}
              />
            </div>
            {effectiveMilestones.map((label, i) => (
              <div key={i} className="flex flex-col items-center relative z-10 gap-1">
                <div className={`w-2.5 h-2.5 rounded-full flex-none ${
                  i < headerMilestoneIdx
                    ? 'bg-blue-500'
                    : i === headerMilestoneIdx
                    ? 'bg-orange-500 ring-2 ring-orange-200 dark:ring-orange-900'
                    : 'bg-zinc-200 dark:bg-zinc-700'
                }`} />
                <span className={`text-[8px] text-center leading-tight max-w-[32px] ${
                  i === headerMilestoneIdx ? 'text-orange-500 font-bold' : 'text-zinc-400 dark:text-zinc-500'
                }`}>{label}</span>
              </div>
            ))}
          </div>

          {/* インターン参加 → 本選考 昇格バナー */}
          {showPromoteBanner && (
            <div className="mb-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-amber-700 dark:text-amber-400">
                🎉 インターン参加おめでとう！
              </span>
              <button
                type="button"
                onClick={() => setShowPromoteDialog(true)}
                className="text-[13px] font-bold text-[var(--color-primary)] ios-tap"
              >
                本選考に進む →
              </button>
            </div>
          )}

          {/* Segmented control — 4 tabs */}
          <div className="flex gap-0 mb-0">
            {TAB_LABELS.map((label, i) => (
              <button
                key={label}
                onClick={() => setActiveTab(i as TabIndex)}
                className={`flex-1 pb-2.5 pt-1 text-[12px] font-semibold transition-colors relative ${
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

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>

          {/* Tab 0: 選考詳細 */}
          {activeTab === 0 && (
            <div className="p-4 space-y-5">

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
                  <p className="text-[14px] text-[var(--color-text-secondary)] text-center py-3">面接予定はありません</p>
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
                            {interview.endTime && `〜${interview.endTime}`}
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

              {/* 選考ステップ */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">選考ステップ</p>
                  <button
                    type="button"
                    onClick={() => setEditingMilestones(!editingMilestones)}
                    className="text-[13px] font-semibold text-[var(--color-primary)] ios-tap min-h-[44px] px-2"
                  >
                    {editingMilestones ? '完了' : '編集'}
                  </button>
                </div>
                {!editingMilestones ? (
                  <div className="flex items-center gap-1 flex-wrap px-1">
                    {effectiveMilestones.map((step, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="text-[12px] font-medium text-[var(--color-text)]">{step}</span>
                        {i < effectiveMilestones.length - 1 && (
                          <span className="text-[11px] text-[var(--color-text-secondary)]">→</span>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="bg-card rounded-xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                    <div className="divide-y divide-[var(--color-border)]">
                      {effectiveMilestones.map((step, i) => (
                        <div key={i} className="flex items-center gap-1 px-3 py-2">
                          <span className="flex-1 text-[14px] text-[var(--color-text)]">{step}</span>
                          <button type="button" onClick={() => { if (i === 0) return; const arr = [...effectiveMilestones]; [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; setCustomMilestones(arr); }} disabled={i === 0} className="w-8 h-8 flex items-center justify-center text-[var(--color-text-secondary)] disabled:opacity-30 ios-tap text-[16px]">↑</button>
                          <button type="button" onClick={() => { if (i === effectiveMilestones.length - 1) return; const arr = [...effectiveMilestones]; [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; setCustomMilestones(arr); }} disabled={i === effectiveMilestones.length - 1} className="w-8 h-8 flex items-center justify-center text-[var(--color-text-secondary)] disabled:opacity-30 ios-tap text-[16px]">↓</button>
                          <button type="button" onClick={() => setCustomMilestones(effectiveMilestones.filter((_, idx) => idx !== i))} className="w-8 h-8 flex items-center justify-center text-[var(--color-danger)] ios-tap text-[16px]">×</button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 p-3 border-t border-[var(--color-border)]">
                      <input type="text" value={newStepText} onChange={(e) => setNewStepText(e.target.value)} placeholder="新しいステップ名" className="ios-input flex-1 text-[13px] py-1.5" onKeyDown={(e) => { if (e.key === 'Enter' && newStepText.trim()) { setCustomMilestones([...effectiveMilestones, newStepText.trim()]); setNewStepText(''); } }} />
                      <button type="button" onClick={() => { if (!newStepText.trim()) return; setCustomMilestones([...effectiveMilestones, newStepText.trim()]); setNewStepText(''); }} disabled={!newStepText.trim()} className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-xl text-[13px] font-semibold ios-tap disabled:opacity-40 flex-none">+ 追加</button>
                    </div>
                    <div className="px-3 pb-3">
                      <button type="button" onClick={() => setCustomMilestones(undefined)} className="w-full py-2 rounded-xl text-[13px] font-semibold text-[var(--color-text-secondary)] bg-[var(--color-border)] ios-tap">デフォルトに戻す</button>
                    </div>
                  </div>
                )}
              </div>

              {/* 予定アクション */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">予定アクション</h3>
                </div>
                <div className="space-y-2 mb-3">
                  <div className="flex gap-2">
                    <select value={newActionType} onChange={(e) => setNewActionType(e.target.value as ActionType)} className="ios-input flex-none w-auto text-[13px] py-2">
                      {(Object.entries(ACTION_TYPE_LABELS) as [ActionType, string][]).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <input type="date" value={newActionDate} onChange={(e) => setNewActionDate(e.target.value)} className="ios-input flex-1 text-[13px] py-2" />
                    <input type="time" value={newActionTime} onChange={(e) => setNewActionTime(e.target.value)} className="ios-input w-[7rem] flex-none text-[13px] py-2" />
                  </div>
                  <button
                    onClick={() => {
                      if (!newActionDate) return;
                      addScheduledAction({ companyId: company.id, type: newActionType, date: newActionDate, time: newActionTime || undefined });
                      setNewActionDate('');
                      setNewActionTime('');
                    }}
                    disabled={!newActionDate}
                    className="w-full px-3 py-2 bg-[var(--color-primary)] text-white rounded-xl text-[13px] font-semibold ios-tap disabled:opacity-40"
                  >
                    + 追加
                  </button>
                </div>
                {scheduledActions.length > 0 && (
                  <div className="bg-card rounded-xl divide-y divide-[var(--color-border)] shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                    {[...scheduledActions].sort((a, b) => a.date.localeCompare(b.date)).map((action) => (
                      <div key={action.id} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: ACTION_TYPE_COLORS[action.type] }} />
                          <span className="text-[14px] font-medium text-[var(--color-text)]">{ACTION_TYPE_LABELS[action.type]}</span>
                          <span className="text-[13px] text-[var(--color-text-secondary)]">
                            {(() => { const d = parseISO(action.date); return isValid(d) ? format(d, 'M/d(E)', { locale: ja }) : action.date; })()}
                            {action.time && ` ${action.time}`}
                          </span>
                        </div>
                        <button onClick={() => deleteScheduledAction(action.id)} className="w-9 h-9 flex items-center justify-center text-[var(--color-danger)] ios-tap">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* タグ */}
              <div className="px-1">
                <p className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">タグ</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(TAG_CONFIG) as [Tag, typeof TAG_CONFIG[Tag]][]).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleTag(key)}
                      className={`px-3 py-1 rounded-full text-[13px] font-semibold transition-all ios-tap ${
                        tags.includes(key)
                          ? config.className + ' ring-2 ring-current'
                          : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: 基本情報 */}
          {activeTab === 1 && (
            <div className="p-4 space-y-4">
              <div className="bg-card rounded-xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                <div className="divide-y divide-[var(--color-border)]">
                  <div className="px-4 py-3">
                    <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">業界</label>
                    <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="ios-input">
                      <option value="">業界を選択</option>
                      {INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>
                  <div className="px-4 py-3">
                    <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">職種</label>
                    <input type="text" value={jobType} onChange={(e) => setJobType(e.target.value)} className="ios-input" placeholder="例: 総合職・エンジニア" />
                  </div>
                  <div className="px-4 py-3">
                    <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">URL</label>
                    <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className="ios-input" placeholder="https://..." />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: マイページ */}
          {activeTab === 2 && (
            <div className="p-4">
              <div className="bg-card rounded-xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                <div className="divide-y divide-[var(--color-border)]">
                  <div className="px-4 py-3">
                    <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">マイページURL</label>
                    <input type="url" value={myPageUrl} onChange={(e) => setMyPageUrl(e.target.value)} className="ios-input" placeholder="https://mypage.example.com" />
                    {myPageUrl.trim() && (
                      <a href={myPageUrl.trim()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[14px] text-[var(--color-primary)] font-medium ios-tap">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
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
                      <input type={showPassword ? 'text' : 'password'} value={myPagePassword} onChange={(e) => setMyPagePassword(e.target.value)} className="ios-input flex-1" placeholder="パスワード" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="w-11 h-11 flex items-center justify-center text-[var(--color-text-secondary)] ios-tap shrink-0" aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}>
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: メモ */}
          {activeTab === 3 && (
            <div className="p-4 space-y-4">
              <div className="bg-card rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                <div className="px-4 pt-3 pb-1 border-b border-[var(--color-border)]"><h4 className="text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">ES・志望動機</h4></div>
                <div className="p-4"><textarea placeholder="ES回答・志望動機を記録..." value={memo.es} onChange={(e) => setMemo((prev) => ({ ...prev, es: e.target.value }))} className="w-full bg-transparent text-[var(--color-text)] text-[15px] leading-relaxed min-h-32 resize-y outline-none" /></div>
              </div>
              <div className="bg-card rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                <div className="px-4 pt-3 pb-1 border-b border-[var(--color-border)]"><h4 className="text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">面接ログ</h4></div>
                <div className="p-4"><textarea placeholder="面接日時、質問内容、自分の回答を記録..." value={memo.interview} onChange={(e) => setMemo((prev) => ({ ...prev, interview: e.target.value }))} className="w-full bg-transparent text-[var(--color-text)] text-[15px] leading-relaxed min-h-32 resize-y outline-none" /></div>
              </div>
              <div className="bg-card rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                <div className="px-4 pt-3 pb-1 border-b border-[var(--color-border)]"><h4 className="text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">逆質問</h4></div>
                <div className="p-4"><textarea placeholder="準備した逆質問、実際に聞いた内容..." value={memo.reverseQuestion} onChange={(e) => setMemo((prev) => ({ ...prev, reverseQuestion: e.target.value }))} className="w-full bg-transparent text-[var(--color-text)] text-[15px] leading-relaxed min-h-24 resize-y outline-none" /></div>
              </div>
              <div className="bg-card rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                <div className="px-4 pt-3 pb-1 border-b border-[var(--color-border)]"><h4 className="text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">その他メモ</h4></div>
                <div className="p-4"><textarea placeholder="感想、次回への改善点、企業の雰囲気など..." value={memo.other} onChange={(e) => setMemo((prev) => ({ ...prev, other: e.target.value }))} className="w-full bg-transparent text-[var(--color-text)] text-[15px] leading-relaxed min-h-24 resize-y outline-none" /></div>
              </div>
            </div>
          )}
        </div>

        {/* Fixed footer */}
        <div className="flex-shrink-0 px-4 pb-6 pt-3 border-t border-[var(--color-border)] bg-card space-y-2">
          <button onClick={handleSave} className="ios-button-primary shadow-sm hover:opacity-90 transition-opacity">
            保存
          </button>
          <div className="flex items-center justify-between pt-1">
            <button onClick={() => setShowDeleteConfirm(true)} className="text-[var(--color-danger)] text-[14px] font-medium ios-tap py-2">
              削除
            </button>
          </div>
        </div>
      </motion.div>

      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-card rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl">
            <h3 className="text-[17px] font-bold text-[var(--color-text)] mb-2">削除確認</h3>
            <p className="text-[15px] text-[var(--color-text-secondary)] mb-4">「{company.name}」を削除しますか？この操作は取り消せません。</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 ios-button-secondary !border !border-[var(--color-border)] !rounded-xl">キャンセル</button>
              <button onClick={handleDelete} className="flex-1 ios-button-primary !bg-[var(--color-danger)]">削除</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 本選考昇格ダイアログ (Mod 6) */}
      {showPromoteDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowPromoteDialog(false)} />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-card rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl">
            <h3 className="text-[17px] font-bold text-[var(--color-text)] mb-2">🎉 本選考に進みますか？</h3>
            <p className="text-[14px] text-[var(--color-text-secondary)] mb-4">
              選考タイプを「本選考」に切り替え、「インターン参加済み」タグを自動追加します。
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowPromoteDialog(false)} className="flex-1 ios-button-secondary !border !border-[var(--color-border)] !rounded-xl">後で</button>
              <button onClick={handlePromoteToMain} className="flex-1 ios-button-primary">本選考へ進む</button>
            </div>
          </motion.div>
        </div>
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
