'use client';

import { useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useShallow } from 'zustand/shallow';
import { useAppStore } from '@/store/useAppStore';
import type { DisplaySettings, NotificationSettings } from '@/store/useAppStore';
import { BulkImportModal } from '@/components/board/BulkImportModal';
import type { StatusColumn } from '@/lib/types';
import { GRAD_YEARS, GRAD_YEAR_LABELS, type GradYear } from '@/lib/gradYears';

type Tab = 'status' | 'display' | 'notification' | 'data';

interface SettingsModalProps {
  onClose: () => void;
}

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: 'status', label: 'ステータス' },
  { id: 'display', label: '表示' },
  { id: 'notification', label: '通知' },
  { id: 'data', label: 'データ' },
];

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('status');

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-[var(--color-bg)] rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-slide-up">
        {/* Grab bar (mobile) */}
        <div className="flex justify-center pt-2 pb-0 md:hidden">
          <div className="w-9 h-1 bg-[var(--color-border)] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <h2 className="text-[17px] font-bold text-[var(--color-text)]">設定</h2>
          <button
            onClick={onClose}
            className="ios-tap w-9 h-9 flex items-center justify-center rounded-full text-[var(--color-text-secondary)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-[var(--color-border)] px-4 shrink-0">
          {TAB_LABELS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 text-[13px] font-semibold py-2.5 border-b-2 transition-colors ios-tap ${
                activeTab === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-secondary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="h-[400px] overflow-y-auto p-4">
          {activeTab === 'status' && <StatusTab onClose={onClose} />}
          {activeTab === 'display' && <DisplayTab />}
          {activeTab === 'notification' && <NotificationTab />}
          {activeTab === 'data' && <DataTab onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

// ─── ステータス管理タブ ───────────────────────────────────────────

function StatusTab({ onClose }: { onClose: () => void }) {
  const statusColumns = useAppStore((s) => s.statusColumns);
  const companies = useAppStore((s) => s.companies);
  const addStatus = useAppStore((s) => s.addStatus);
  const updateStatus = useAppStore((s) => s.updateStatus);
  const deleteStatus = useAppStore((s) => s.deleteStatus);
  const reorderStatuses = useAppStore((s) => s.reorderStatuses);

  const [newStatusName, setNewStatusName] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const trackStatuses = [...statusColumns].sort((a, b) => a.order - b.order);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleAddStatus = () => {
    const trimmed = newStatusName.trim();
    if (!trimmed) return;
    addStatus(trimmed);
    setNewStatusName('');
  };

  const handleDelete = (id: string) => {
    const success = deleteStatus(id);
    if (!success) {
      setDeleteError('企業を移動してから削除してください');
      setTimeout(() => setDeleteError(''), 3000);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = trackStatuses.findIndex((s) => s.id === active.id);
    const newIndex = trackStatuses.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = [...trackStatuses];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    reorderStatuses(reordered.map((s) => s.id));
  };

  return (
    <div className="space-y-4">
      {deleteError && (
        <div className="p-3 bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-[14px] rounded-xl">
          {deleteError}
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={trackStatuses.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="bg-card rounded-xl divide-y divide-[var(--color-border)]">
            {trackStatuses.map((status) => (
              <SortableStatusItem
                key={status.id}
                status={status}
                companyCount={companies.filter((c) => c.statusId === status.id).length}
                onUpdate={updateStatus}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2">
        <input
          type="text"
          value={newStatusName}
          onChange={(e) => setNewStatusName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddStatus()}
          className="ios-input flex-1"
          placeholder="新しいステータス名"
        />
        <button
          onClick={handleAddStatus}
          disabled={!newStatusName.trim()}
          className="ios-button-primary !w-auto !px-6 disabled:opacity-40"
        >
          追加
        </button>
      </div>

      <button onClick={onClose} className="ios-button-secondary w-full">
        完了
      </button>
    </div>
  );
}

interface SortableStatusItemProps {
  status: StatusColumn;
  companyCount: number;
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

function SortableStatusItem({ status, companyCount, onUpdate, onDelete }: SortableStatusItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(status.name);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: status.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const handleSave = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== status.name) onUpdate(status.id, trimmed);
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`px-4 py-3 flex items-center gap-3 min-h-[44px] ${isDragging ? 'opacity-50 bg-[var(--color-bg)]' : ''}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-manipulation p-1 text-[var(--color-border)]">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
        </svg>
      </div>
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="flex-1 ios-input !py-1 !px-2 !text-[15px]"
          autoFocus
        />
      ) : (
        <button onClick={() => setIsEditing(true)} className="flex-1 text-left text-[15px] text-[var(--color-text)] min-h-[44px] flex items-center ios-tap">
          {status.name}
        </button>
      )}
      <span className="text-[12px] text-[var(--color-text-secondary)] bg-[var(--color-border)] rounded-full px-2 py-0.5">
        {companyCount}
      </span>
      <button onClick={() => onDelete(status.id)} className="w-11 h-11 flex items-center justify-center text-[var(--color-danger)] ios-tap">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

// ─── 表示設定タブ ──────────────────────────────────────────────────

const DISPLAY_ITEMS: { key: keyof DisplaySettings; label: string }[] = [
  { key: 'showTag', label: 'タグ（優遇・早期選考など）' },
  { key: 'showIndustry', label: '業界名' },
  { key: 'showNextInterview', label: '次の面接日時' },
  { key: 'showUpdatedDate', label: '更新日' },
  { key: 'showDeadlineBadge', label: '締切バッジ' },
];

function DisplayTab() {
  const displaySettings = useAppStore(useShallow((s) => s.displaySettings));
  const updateDisplaySetting = useAppStore((s) => s.updateDisplaySetting);
  const gradYear = useAppStore((s) => s.gradYear);
  const setGradYear = useAppStore((s) => s.setGradYear);

  return (
    <div className="space-y-4">
      {/* 卒業年度 */}
      <div className="bg-card rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-[var(--color-border)]">
          <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">卒業年度</span>
        </div>
        <div className="px-4 py-3">
          <select
            value={gradYear ?? ''}
            onChange={(e) => setGradYear(Number(e.target.value) as GradYear)}
            className="ios-input w-full"
          >
            {GRAD_YEARS.map((year) => (
              <option key={year} value={year}>
                {GRAD_YEAR_LABELS[year as GradYear]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* カード表示設定 */}
      <div className="text-[13px] text-[var(--color-text-secondary)] px-1">
        カードに表示する項目を選択してください。企業名は常に表示されます。
      </div>
      <div className="bg-card rounded-xl divide-y divide-[var(--color-border)]">
        {DISPLAY_ITEMS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between px-4 py-3 min-h-[52px]">
            <span className="text-[15px] text-[var(--color-text)]">{label}</span>
            <Toggle
              value={displaySettings[key]}
              onChange={(v) => updateDisplaySetting(key, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 通知・リマインダータブ ────────────────────────────────────────

function NotificationTab() {
  const notificationSettings = useAppStore(useShallow((s) => s.notificationSettings));
  const updateNotificationEnabled = useAppStore((s) => s.updateNotificationEnabled);
  const updateNotificationTiming = useAppStore((s) => s.updateNotificationTiming);

  const timingItems: { key: keyof NotificationSettings['timing']; label: string }[] = [
    { key: 'sameDay', label: '当日' },
    { key: 'oneDayBefore', label: '1日前' },
    { key: 'threeDaysBefore', label: '3日前' },
    { key: 'sevenDaysBefore', label: '7日前' },
  ];

  return (
    <div className="space-y-4">
      {/* 案内バナー */}
      <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[13px] text-amber-700 dark:text-amber-300">
          通知機能はアプリ版で利用可能になります（現在準備中）。設定内容は保存されます。
        </p>
      </div>

      {/* リマインダー有効/無効 */}
      <div className="bg-card rounded-xl">
        <div className="flex items-center justify-between px-4 py-3 min-h-[52px]">
          <span className="text-[15px] text-[var(--color-text)]">リマインダー通知</span>
          <Toggle
            value={notificationSettings.enabled}
            onChange={updateNotificationEnabled}
          />
        </div>
      </div>

      {/* タイミング設定 */}
      <div className="bg-card rounded-xl divide-y divide-[var(--color-border)]">
        <div className="px-4 py-2">
          <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">通知タイミング</span>
        </div>
        {timingItems.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between px-4 py-3 min-h-[52px]">
            <span className={`text-[15px] ${notificationSettings.enabled ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}`}>
              {label}
            </span>
            <Toggle
              value={notificationSettings.timing[key]}
              onChange={(v) => updateNotificationTiming(key, v)}
              disabled={!notificationSettings.enabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── データ管理タブ ───────────────────────────────────────────────

function DataTab({ onClose }: { onClose: () => void }) {
  const companies = useAppStore((s) => s.companies);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const loadBackup = useAppStore((s) => s.loadBackup);
  const deleteAllCompanies = useAppStore((s) => s.deleteAllCompanies);

  const [showBulkImport, setShowBulkImport] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const trackStatuses = [...statusColumns].sort((a, b) => a.order - b.order);

  const handleExportJSON = () => {
    const state = useAppStore.getState();
    const data = {
      schemaVersion: state.schemaVersion,
      companies: state.companies,
      statusColumns: state.statusColumns,
      interviews: state.interviews,
      esEntries: state.esEntries,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const a = document.createElement('a');
    a.href = url;
    a.download = `shukatsu-board-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const state = useAppStore.getState();
    const statusMap = Object.fromEntries(state.statusColumns.map((s) => [s.id, s.name]));
    const BOM = '\uFEFF';
    const header = '企業名,業界,ステータス,メモ,作成日\n';
    const escape = (v: string) => {
      if (v.includes(',') || v.includes('"') || v.includes('\n')) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    };
    const rows = state.companies
      .map((c) =>
        [
          escape(c.name),
          escape(c.industry || ''),
          escape(statusMap[c.statusId] || ''),
          escape(c.memo || ''),
          c.createdAt || '',
        ].join(',')
      )
      .join('\n');
    const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().split('T')[0];
    const a = document.createElement('a');
    a.href = url;
    a.download = `shukatsu-board-export-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!window.confirm('現在のデータはすべて上書きされます。\nバックアップから復元しますか？')) return;
        loadBackup(data);
      } catch {
        alert('JSONファイルの読み込みに失敗しました。\nファイルが正しい形式か確認してください。');
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* バックアップ */}
      <div className="bg-card rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-[var(--color-border)]">
          <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">バックアップ</span>
        </div>
        <button onClick={handleExportJSON} className="w-full flex items-center gap-3 px-4 py-3 text-left ios-tap border-b border-[var(--color-border)]">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[var(--color-primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <div>
            <div className="text-[15px] text-[var(--color-text)]">エクスポート（JSON）</div>
            <div className="text-[12px] text-[var(--color-text-secondary)]">全データをJSONファイルとして保存</div>
          </div>
        </button>
        <button onClick={() => importRef.current?.click()} className="w-full flex items-center gap-3 px-4 py-3 text-left ios-tap">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[var(--color-success)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <div>
            <div className="text-[15px] text-[var(--color-text)]">インポート（復元）</div>
            <div className="text-[12px] text-[var(--color-text-secondary)]">JSONファイルから復元</div>
          </div>
        </button>
        <input ref={importRef} type="file" accept=".json,application/json" onChange={handleImportFile} className="hidden" />
      </div>

      {/* CSVエクスポート */}
      <div className="bg-card rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-[var(--color-border)]">
          <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">CSVエクスポート</span>
        </div>
        <button onClick={handleExportCSV} className="w-full flex items-center gap-3 px-4 py-3 text-left ios-tap">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[var(--color-primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <div className="text-[15px] text-[var(--color-text)]">企業データをCSVで書き出し</div>
            <div className="text-[12px] text-[var(--color-text-secondary)]">企業名・業界・ステータス・メモ（Excel対応）</div>
          </div>
        </button>
      </div>

      {/* 企業データ */}
      <div className="bg-card rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-[var(--color-border)]">
          <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">企業データ</span>
        </div>
        <button onClick={() => setShowBulkImport(true)} className="w-full flex items-center gap-3 px-4 py-3 text-left ios-tap border-b border-[var(--color-border)]">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[var(--color-primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <div className="text-[15px] text-[var(--color-text)]">一括追加</div>
            <div className="text-[12px] text-[var(--color-text-secondary)]">企業名を改行区切りで複数追加</div>
          </div>
        </button>
        <button
          onClick={() => {
            if (!window.confirm(`全企業（${companies.length}社）を削除しますか？\nこの操作は取り消せません。`)) return;
            deleteAllCompanies();
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-left ios-tap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[var(--color-danger)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <div>
            <div className="text-[15px] text-[var(--color-danger)]">全企業を削除</div>
            <div className="text-[12px] text-[var(--color-text-secondary)]">登録済み {companies.length}社をすべて削除</div>
          </div>
        </button>
      </div>

      <button onClick={onClose} className="ios-button-secondary w-full">
        完了
      </button>

      {showBulkImport && (
        <BulkImportModal statusColumns={trackStatuses} onClose={() => setShowBulkImport(false)} />
      )}
    </div>
  );
}

// ─── トグルスイッチ共通コンポーネント ────────────────────────────

function Toggle({
  value,
  onChange,
  disabled = false,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : 'ios-tap'
      } ${value ? 'bg-[var(--color-primary)]' : 'bg-gray-300 dark:bg-gray-600'}`}
      aria-checked={value}
      role="switch"
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          value ? 'translate-x-[22px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}
