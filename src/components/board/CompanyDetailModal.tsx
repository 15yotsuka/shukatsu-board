'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { useAppStore, normalizeCompanyName } from '@/store/useAppStore';
import type { Company } from '@/lib/types';

import { TutorialModal } from '@/components/onboarding/TutorialModal';
import { TimeSelect } from '@/components/ui/TimeSelect';
import { fireConfetti } from '@/lib/confetti';
import { useToast } from '@/lib/useToast';
import {
  TAG_CONFIG,
  ACTION_TYPE_LABELS,
  ACTION_TYPE_COLORS,
  scheduleStageToAction,
  getDateLabel,
  needsTimeInput,
  type Tag,
} from '@/lib/types';
import { INDUSTRIES } from '@/lib/industries';
import { SelectionFlowEditor, DEFAULT_FLOW_STAGES } from '@/components/board/SelectionFlowEditor';
import { format } from 'date-fns';
import { useDeadlines } from '@/contexts/DeadlineContext';
import { ja } from 'date-fns/locale';
import { formatDateUnified, formatTimeRange } from '@/lib/dateUtils';
import { DatePicker } from '@/components/ui/DatePicker';

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
  const dragControls = useDragControls();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const updateCompany = useAppStore((s) => s.updateCompany);
  const deleteCompany = useAppStore((s) => s.deleteCompany);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const tutorialFlags = useAppStore((s) => s.tutorialFlags);
  const markTutorialSeen = useAppStore((s) => s.markTutorialSeen);
  const gradYear = useAppStore((s) => s.gradYear);
  const allScheduledActions = useAppStore((s) => s.scheduledActions);
  const scheduledActions = useMemo(
    () => allScheduledActions.filter((a) => a.companyId === company.id),
    [allScheduledActions, company.id]
  );
  const addScheduledAction = useAppStore((s) => s.addScheduledAction);
  const deleteScheduledAction = useAppStore((s) => s.deleteScheduledAction);
  const showToast = useToast((s) => s.show);
  const { deadlines: allCsvDeadlines } = useDeadlines();
  const csvDeadlines = useMemo(
    () => allCsvDeadlines.filter((d) => normalizeCompanyName(d.company_name) === normalizeCompanyName(company.name)),
    [allCsvDeadlines, company.name]
  );

  const [activeTab, setActiveTab] = useState<TabIndex>(0);

  const [name, setName] = useState(company.name);
  const [industry, setIndustry] = useState(company.industry ?? '');
  const [jobType, setJobType] = useState(company.jobType ?? '');
  const [url, setUrl] = useState(company.url ?? '');
  const [statusId, setStatusId] = useState(company.statusId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [nameError, setNameError] = useState('');

  const [myPageUrl, setMyPageUrl] = useState(company.myPageUrl ?? '');
  const [myPageId, setMyPageId] = useState(company.myPageId ?? '');
  const [myPagePassword, setMyPagePassword] = useState(company.myPagePassword ?? '');
  const [showPassword, setShowPassword] = useState(false);

  const [memo, setMemo] = useState<MemoData>(() => parseMemo(company.selectionMemo));
  const [tags, setTags] = useState<Tag[]>(company.tags ?? []);
  const [showStagePicker, setShowStagePicker] = useState(false);
  const [stagePickerSelectedId, setStagePickerSelectedId] = useState<string | null>(null);
  const [stagePickerDate, setStagePickerDate] = useState('');
  const [stagePickerStartTime, setStagePickerStartTime] = useState('');
  const [stagePickerEndTime, setStagePickerEndTime] = useState('');
  const [showNextStagePopup, setShowNextStagePopup] = useState(false);
  const [nextStageDate, setNextStageDate] = useState('');
  const [nextStageStartTime, setNextStageStartTime] = useState('');
  const [nextStageEndTime, setNextStageEndTime] = useState('');

  const [flowStages, setFlowStages] = useState<string[]>(() =>
    company.selectionFlow && company.selectionFlow.length > 0
      ? company.selectionFlow
      : DEFAULT_FLOW_STAGES
  );
  const [showFlowEditor, setShowFlowEditor] = useState(false);

  const trackStatuses = [...statusColumns].sort((a, b) => a.order - b.order);

  const currentStatusIndex = trackStatuses.findIndex((s) => s.id === statusId);
  const nextStatus = currentStatusIndex >= 0 && currentStatusIndex < trackStatuses.length - 1
    ? trackStatuses[currentStatusIndex + 1]
    : null;

  // scheduleStageToAction from types.ts handles ActionType + subType mapping

  const toggleTag = (tag: Tag) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

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

    const isDefaultFlow =
      flowStages.length === DEFAULT_FLOW_STAGES.length &&
      flowStages.every((s, i) => s === DEFAULT_FLOW_STAGES[i]);

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
      selectionFlow: isDefaultFlow ? undefined : flowStages,
    });
    onClose();
  };

  const handleDelete = () => {
    deleteCompany(company.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center modal-safe" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
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
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={(_, { offset, velocity }) => {
          if (offset.y > 100 || velocity.y > 500) onClose();
        }}
        className="relative bg-[var(--color-bg)] rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden overflow-x-hidden"
        style={{ height: 'calc(100dvh - 3.5rem - env(safe-area-inset-top) - 4rem - env(safe-area-inset-bottom))', maxHeight: '100%' }}
      >
        {/* Fixed header */}
        <div className="bg-card px-4 pt-4 pb-0 flex-shrink-0 border-b border-[var(--color-border)]">
          {/* Grab bar — drag to dismiss */}
          <div
            className="flex justify-center pb-2 md:hidden"
            onPointerDown={(e) => dragControls.start(e)}
            style={{ touchAction: 'none', cursor: 'grab' }}
          >
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
              className="flex-none w-10 h-10 flex items-center justify-center text-[var(--color-text-secondary)] bg-[var(--color-border)] rounded-full ios-tap text-[16px]"
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>

          {/* Status + deadline row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <button
              onClick={() => setShowStagePicker(true)}
              className="shrink-0 whitespace-nowrap max-w-[120px] truncate text-[14px] font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full px-3 py-1 ios-tap text-left"
            >
              {statusColumns.find((s) => s.id === statusId)?.name ?? ''} ▾
            </button>
            {nextStatus && nextStatus.name !== '見送り' && (
              <button
                onClick={() => {
                  setNextStageDate('');
                  setNextStageStartTime('');
                  setNextStageEndTime('');
                  setShowNextStagePopup(true);
                }}
                className="flex-none text-[12px] font-semibold rounded-full px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] ios-tap"
              >
                次へ →
              </button>
            )}
            {(() => {
              const today = format(new Date(), 'yyyy-MM-dd');
              const next = [...scheduledActions]
                .filter((a) => a.date >= today)
                .sort((a, b) => a.date.localeCompare(b.date))[0];
              if (!next) return null;
              const color = ACTION_TYPE_COLORS[next.type];
              return (
                <span
                  className="flex-none text-[13px] font-semibold rounded-full px-3 py-1"
                  style={{ backgroundColor: `${color}15`, color }}
                >
                  {next.subType ?? ACTION_TYPE_LABELS[next.type]} {formatDateUnified(next.date)}{next.startTime && ` ${formatTimeRange(next.startTime, next.endTime)}`}
                </span>
              );
            })()}
            {(() => {
              const today = format(new Date(), 'yyyy-MM-dd');
              const futureCsvDeadlines = csvDeadlines.filter((d) => d.deadline >= today);
              if (futureCsvDeadlines.length === 0) return null;
              return (
                <span className="flex-none text-[13px] font-semibold rounded-full px-3 py-1 bg-[var(--color-border)] text-[var(--color-text-secondary)]">
                  締切 {formatDateUnified(futureCsvDeadlines[0].deadline)}
                  {futureCsvDeadlines.length > 1 && ` 他${futureCsvDeadlines.length - 1}件`}
                </span>
              );
            })()}
          </div>

          {/* Segmented control — 4 tabs */}
          <div className="flex gap-0 mb-0">
            {TAB_LABELS.map((label, i) => (
              <button
                key={label}
                onClick={() => setActiveTab(i as TabIndex)}
                className={`flex-1 pb-2.5 pt-1 text-[12px] font-semibold relative ${
                  activeTab === i ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
                }`}
              >
                {label}
                {activeTab === i && (
                  <div
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
              {/* 選考フロー */}
              <div className="bg-card rounded-xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/5 px-4 py-3">
                <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">選考フロー</label>
                <button
                  type="button"
                  onClick={() => setShowFlowEditor(!showFlowEditor)}
                  className="text-[13px] text-[var(--color-primary)] ios-tap mb-2"
                >
                  ✏️ {showFlowEditor ? 'フロー編集を閉じる' : '選考フローを変更'}
                </button>
                {showFlowEditor && (
                  <div className="mt-1 bg-[var(--color-border)]/30 rounded-xl p-3">
                    <SelectionFlowEditor
                      stages={flowStages}
                      onChange={setFlowStages}
                      onReset={() => setFlowStages(DEFAULT_FLOW_STAGES)}
                    />
                  </div>
                )}
                {!showFlowEditor && (
                  <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
                    {flowStages.join(' → ')}
                  </div>
                )}
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
        <div className="flex-shrink-0 px-4 pt-3 border-t border-[var(--color-border)] bg-card space-y-2" style={{ paddingBottom: '1.5rem' }}>
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

      {gradYear !== null && !tutorialFlags.detail && (
        <TutorialModal
          steps={[
            { title: '📅 選考詳細タブ', body: '面接・ES・GDなどの\n選考予定を日時付きで登録できます\n\n「次の段階へ」を押すと\n自動で選考予定が追加されます' },
            { title: '📝 メモタブ', body: 'ESの内容・面接で聞かれたこと\nなどを自由に記録できます\n\n選考が終わった後の振り返りにも使えます' },
            { title: '🔑 マイページタブ', body: 'マイページのログインIDや\nパスワードを保存できます\n\n応募ごとにバラバラになりがちな\nアカウント情報を一元管理できます' },
          ]}
          onComplete={() => markTutorialSeen('detail')}
        />
      )}

      {/* 選考段階ピッカー — Step 1: 段階選択（全画面） */}
      {showStagePicker && !stagePickerSelectedId && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center modal-safe" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onPointerDown={() => setShowStagePicker(false)} />
          <div
            className="relative bg-card rounded-2xl w-full max-w-lg flex flex-col shadow-xl"
            style={{ height: 'calc(100dvh - 3.5rem - env(safe-area-inset-top) - 4rem - env(safe-area-inset-bottom))' }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="px-4 pt-4 pb-3 flex-shrink-0 border-b border-[var(--color-border)]">
              <h3 className="font-bold text-center text-[16px] text-[var(--color-text)]">選考段階を変更</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {trackStatuses.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setStagePickerSelectedId(s.id);
                    setStagePickerDate('');
                    setStagePickerStartTime('');
                    setStagePickerEndTime('');
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-[15px] ios-tap ${
                    s.id === statusId
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold'
                      : 'text-[var(--color-text)]'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <div className="flex-shrink-0 px-4 pt-3 border-t border-[var(--color-border)]" style={{ paddingBottom: '1.5rem' }}>
              <button
                onClick={() => setShowStagePicker(false)}
                className="w-full py-3 rounded-xl text-[15px] font-medium text-[var(--color-text-secondary)] bg-[var(--color-border)]"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 選考段階ピッカー — Step 2: 日時入力（全画面） */}
      {showStagePicker && stagePickerSelectedId && (() => {
        const pickedStatus = trackStatuses.find((s) => s.id === stagePickerSelectedId);
        if (!pickedStatus) return null;
        return (
          <div className="fixed inset-0 z-[70] flex items-end justify-center modal-safe" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onPointerDown={() => { setShowStagePicker(false); setStagePickerSelectedId(null); }} />
            <div
              className="relative bg-card rounded-2xl w-full max-w-lg flex flex-col shadow-xl"
              style={{ height: 'calc(100dvh - 3.5rem - env(safe-area-inset-top) - 4rem - env(safe-area-inset-bottom))' }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="px-4 pt-4 pb-3 flex-shrink-0 border-b border-[var(--color-border)]">
                <button onClick={() => setStagePickerSelectedId(null)} className="text-[13px] text-[var(--color-text-secondary)] ios-tap mb-2">
                  ← 戻る
                </button>
                <h3 className="font-bold text-[16px] text-[var(--color-text)]">{pickedStatus.name}</h3>
                <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">{getDateLabel(pickedStatus.name)}はありますか？（任意）</p>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                <DatePicker value={stagePickerDate} onChange={setStagePickerDate} />
                {needsTimeInput(pickedStatus.name) && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[12px] text-[var(--color-text-secondary)] mb-1">開始</label>
                      <TimeSelect value={stagePickerStartTime} onChange={(v) => { setStagePickerStartTime(v); if (v && !stagePickerEndTime) { const [h, m] = v.split(':').map(Number); setStagePickerEndTime(`${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`); } }} />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[12px] text-[var(--color-text-secondary)] mb-1">終了</label>
                      <TimeSelect value={stagePickerEndTime} onChange={setStagePickerEndTime} />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 px-4 pt-3 border-t border-[var(--color-border)] space-y-2" style={{ paddingBottom: '1.5rem' }}>
                <div className="flex gap-2">
                  <button onClick={() => {
                    const currentStageName = trackStatuses[currentStatusIndex]?.name ?? '';
                    const { type: skipType, subType: skipSubType } = scheduleStageToAction(currentStageName);
                    allScheduledActions
                      .filter((a) => a.companyId === company.id && a.type === skipType && a.subType === skipSubType)
                      .forEach((a) => deleteScheduledAction(a.id));
                    setStatusId(pickedStatus.id); updateCompany(company.id, { statusId: pickedStatus.id }); setShowStagePicker(false); setStagePickerSelectedId(null); }} className="flex-1 py-3 text-[14px] text-[var(--color-text-secondary)] bg-[var(--color-border)] rounded-xl ios-tap">
                    スキップ
                  </button>
                  <button onClick={() => { if (!stagePickerDate) return; setStatusId(pickedStatus.id); updateCompany(company.id, { statusId: pickedStatus.id }); const { type, subType } = scheduleStageToAction(pickedStatus.name); addScheduledAction({ companyId: company.id, type, subType, date: stagePickerDate, startTime: stagePickerStartTime || undefined, endTime: stagePickerEndTime || undefined }); setShowStagePicker(false); setStagePickerSelectedId(null); }} disabled={!stagePickerDate} className="flex-1 py-3 text-[14px] text-white bg-[var(--color-primary)] rounded-xl ios-tap disabled:opacity-40">
                    設定
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 次の段階へポップアップ */}
      {showNextStagePopup && nextStatus && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center modal-safe">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onPointerDown={() => setShowNextStagePopup(false)} />
          <div className="relative bg-card rounded-xl p-4 mx-4 max-w-sm w-full shadow-xl" onPointerDown={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-[var(--color-text)] mb-3 text-[16px]">
              {nextStatus.name}の日程を設定
            </h3>
            <label className="block text-[12px] text-[var(--color-text-secondary)] mb-2">
              {getDateLabel(nextStatus.name)}はありますか？（任意）
            </label>
            <div className="space-y-2 mb-4">
              <DatePicker value={nextStageDate} onChange={setNextStageDate} />
              {needsTimeInput(nextStatus.name) && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[12px] text-[var(--color-text-secondary)] mb-1">開始</label>
                    <TimeSelect value={nextStageStartTime} onChange={(v) => { setNextStageStartTime(v); if (v && !nextStageEndTime) { const [h, m] = v.split(':').map(Number); setNextStageEndTime(`${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`); } }} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[12px] text-[var(--color-text-secondary)] mb-1">終了</label>
                    <TimeSelect value={nextStageEndTime} onChange={setNextStageEndTime}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setStatusId(nextStatus.id);
                  updateCompany(company.id, {
                    statusId: nextStatus.id,
                    ...(company.awaitingResult ? {
                      awaitingResult: false,
                      tags: (company.tags ?? []).filter((t) => t !== '結果待ち'),
                    } : {}),
                  });
                  const currentSkipStageName = trackStatuses[currentStatusIndex]?.name ?? '';
                  const { type: skipType, subType: skipSubType } = scheduleStageToAction(currentSkipStageName);
                  allScheduledActions
                    .filter((a) => a.companyId === company.id && a.type === skipType && a.subType === skipSubType)
                    .forEach((a) => deleteScheduledAction(a.id));
                  setShowNextStagePopup(false);
                }}
                className="flex-1 py-2.5 text-[14px] text-[var(--color-text-secondary)] bg-[var(--color-border)] rounded-xl ios-tap"
              >
                スキップ
              </button>
              <button
                onClick={() => {
                  if (!nextStageDate) return;
                  setStatusId(nextStatus.id);
                  updateCompany(company.id, {
                    statusId: nextStatus.id,
                    ...(company.awaitingResult ? {
                      awaitingResult: false,
                      tags: (company.tags ?? []).filter((t) => t !== '結果待ち'),
                    } : {}),
                  });
                  const currentStageName = trackStatuses[currentStatusIndex]?.name ?? '';
                  const { type: currentType, subType: currentSubType } = scheduleStageToAction(currentStageName);
                  allScheduledActions
                    .filter((a) => a.companyId === company.id && a.type === currentType && a.subType === currentSubType)
                    .forEach((a) => deleteScheduledAction(a.id));
                  const { type, subType } = scheduleStageToAction(nextStatus.name);
                  addScheduledAction({
                    companyId: company.id,
                    type,
                    subType,
                    date: nextStageDate,
                    startTime: nextStageStartTime || undefined,
                    endTime: nextStageEndTime || undefined,
                  });
                  setShowNextStagePopup(false);
                }}
                disabled={!nextStageDate}
                className="flex-1 py-2.5 text-[14px] text-white bg-[var(--color-primary)] rounded-xl ios-tap disabled:opacity-40"
              >
                設定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center modal-safe">
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

    </div>
  );
}
