'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Company } from '@/lib/types';
import { PromoteDialog } from '@/components/status/PromoteDialog';
import { InterviewForm } from '@/components/calendar/InterviewForm';

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

  const [name, setName] = useState(company.name);
  const [industry, setIndustry] = useState(company.industry ?? '');
  const [url, setUrl] = useState(company.url ?? '');
  const [statusId, setStatusId] = useState(company.statusId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [nameError, setNameError] = useState('');

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
    updateCompany(company.id, {
      name: trimmed,
      industry: industry.trim() || undefined,
      url: url.trim() || undefined,
      statusId,
    });
    onClose();
  };

  const handleDelete = () => {
    deleteCompany(company.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up">
        {/* Grab bar */}
        <div className="flex justify-center pt-2 pb-0 md:hidden">
          <div className="w-9 h-1 bg-[#E5E5EA] rounded-full" />
        </div>

        <div className="px-4 pt-4 pb-2">
          <h2 className="text-[17px] font-bold text-center text-[#1C1C1E]">企業詳細</h2>
        </div>

        <div className="p-4 space-y-4">
          {/* Grouped list - basic info */}
          <div className="bg-[#F2F2F7] rounded-xl overflow-hidden">
            <div className="bg-white divide-y divide-[#E5E5EA]">
              <div className="px-4 py-3">
                <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">
                  企業名 <span className="text-[#FF3B30]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(''); }}
                  className="ios-input"
                />
                {nameError && <p className="text-[#FF3B30] text-[12px] mt-1">{nameError}</p>}
              </div>
              <div className="px-4 py-3">
                <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">業界</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="ios-input"
                  placeholder="例: IT・通信"
                />
              </div>
              <div className="px-4 py-3">
                <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="ios-input"
                  placeholder="https://..."
                />
              </div>
              <div className="px-4 py-3">
                <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">ステータス</label>
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
            </div>
          </div>

          {/* Interview section */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide">面接予定</h3>
              <button
                onClick={() => setShowInterviewForm(true)}
                className="text-[15px] text-[#007AFF] font-medium ios-tap min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                + 追加
              </button>
            </div>
            {companyInterviews.length === 0 ? (
              <p className="text-[14px] text-[#8E8E93] text-center py-4">面接予定はありません</p>
            ) : (
              <div className="bg-white rounded-xl divide-y divide-[#E5E5EA]">
                {companyInterviews.map((interview) => (
                  <div key={interview.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[15px] font-medium text-[#1C1C1E]">{interview.type}</p>
                      <p className="text-[13px] text-[#8E8E93]">
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
                      className="w-11 h-11 flex items-center justify-center text-[#FF3B30] ios-tap"
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
          <button onClick={handleSave} className="ios-button-primary">
            保存
          </button>

          {company.trackType === 'intern' && (
            <button
              onClick={() => setShowPromote(true)}
              className="w-full text-[#007AFF] bg-[#E8F0FE] rounded-xl py-3 text-center text-[16px] font-semibold ios-tap"
            >
              本選考に進む
            </button>
          )}

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full text-[#FF3B30] text-center py-3 text-[16px] font-medium ios-tap"
          >
            削除
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-2xl p-6 mx-4 max-w-sm w-full animate-fade-in">
            <h3 className="text-[17px] font-bold text-[#1C1C1E] mb-2">削除確認</h3>
            <p className="text-[15px] text-[#8E8E93] mb-4">
              「{company.name}」を削除しますか？この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 ios-button-secondary !border !border-[#E5E5EA] !rounded-xl"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 ios-button-primary !bg-[#FF3B30]"
              >
                削除
              </button>
            </div>
          </div>
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
