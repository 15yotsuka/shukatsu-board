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
import { TutorialModal } from '@/components/onboarding/TutorialModal';
import type { StatusColumn } from '@/lib/types';
import { GRAD_YEARS, GRAD_YEAR_LABELS, type GradYear } from '@/lib/gradYears';

type Tab = 'status' | 'display' | 'notification' | 'data';

interface SettingsModalProps {
  onClose: () => void;
}

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: 'status', label: '選考段階' },
  { id: 'display', label: '表示' },
  { id: 'notification', label: '通知' },
  { id: 'data', label: 'データ' },
];

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('status');
  const tutorialFlags = useAppStore((s) => s.tutorialFlags);
  const markTutorialSeen = useAppStore((s) => s.markTutorialSeen);
  const gradYear = useAppStore((s) => s.gradYear);

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center modal-safe" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-[var(--color-bg)] rounded-2xl w-full max-w-lg h-[85vh] flex flex-col animate-slide-up" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
        <div className="flex-1 overflow-y-auto p-4 overscroll-contain relative">
          {activeTab === 'status' && <StatusTab onClose={onClose} />}
          {activeTab === 'display' && <DisplayTab />}
          {activeTab === 'notification' && <NotificationTab />}
          {activeTab === 'data' && <DataTab onClose={onClose} />}
        </div>
      </div>

      {gradYear !== null && !tutorialFlags.settings && (
        <TutorialModal
          steps={[{ title: '⚙️ 設定でできること', body: '・選考段階の管理：選考ステップの追加・削除・並び替え\n・表示設定：カードに表示する情報のON/OFF\n・データ管理：バックアップ・復元・企業の一括追加\n・機種変更時はCSVエクスポート→新端末でインポート' }]}
          onComplete={() => markTutorialSeen('settings')}
        />
      )}
    </div>
  );
}

// ─── 選考段階管理タブ ───────────────────────────────────────────

const COLOR_SWATCHES = ['#8B5CF6','#3B82F6','#F97316','#22C55E','#EF4444','#EC4899','#F59E0B','#9CA3AF'];

function StatusTab({ onClose }: { onClose: () => void }) {
  const statusColumns = useAppStore((s) => s.statusColumns);
  const companies = useAppStore((s) => s.companies);
  const addStatus = useAppStore((s) => s.addStatus);
  const updateStatus = useAppStore((s) => s.updateStatus);
  const updateStatusColor = useAppStore((s) => s.updateStatusColor);
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
                onUpdateColor={updateStatusColor}
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
          placeholder="新しい選考段階名"
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
  onUpdateColor: (id: string, color: string) => void;
  onDelete: (id: string) => void;
}

function SortableStatusItem({ status, companyCount, onUpdate, onUpdateColor, onDelete }: SortableStatusItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(status.name);
  const [showColorPicker, setShowColorPicker] = useState(false);

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
      className={`${isDragging ? 'opacity-50 bg-[var(--color-bg)]' : ''}`}
    >
      <div className="px-4 py-3 flex items-center gap-3 min-h-[44px]">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-manipulation p-1 text-[var(--color-border)]">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
          </svg>
        </div>
        {/* 色ドット */}
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="w-5 h-5 rounded-full flex-none ios-tap"
          style={{ backgroundColor: status.color }}
        />
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
      {showColorPicker && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {COLOR_SWATCHES.map((color) => (
            <button
              key={color}
              onClick={() => { onUpdateColor(status.id, color); setShowColorPicker(false); }}
              className="w-7 h-7 rounded-full ios-tap flex items-center justify-center"
              style={{ backgroundColor: color }}
            >
              {status.color === color && (
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
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
  { key: 'showProgressBar', label: '選考進捗ドット（●●○○○）' },
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
            onChange={(e) => { if (e.target.value !== '') setGradYear(Number(e.target.value) as GradYear); }}
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
      <div className="text-[13px] text-[var(--color-text-secondary)] px-1 leading-relaxed">
        デフォルトでは企業名と次の選考予定のみ表示しています。<br/>
        ここで表示項目を追加してカードの情報量を増やせます。
      </div>
      <div className="bg-card rounded-xl divide-y divide-[var(--color-border)]">
        {DISPLAY_ITEMS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between px-4 py-3 min-h-[52px]">
            <span className="text-[15px] text-[var(--color-text)]">{label}</span>
            <Toggle
              value={displaySettings[key] as boolean}
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

  const handleEnableToggle = async (v: boolean) => {
    if (v) {
      const { requestNotificationPermission } = await import('@/lib/notifications');
      const granted = await requestNotificationPermission();
      if (!granted) return; // 許可拒否時はトグルを有効にしない
    }
    updateNotificationEnabled(v);
  };

  const timingItems: { key: keyof NotificationSettings['timing']; label: string }[] = [
    { key: 'sameDay', label: '当日' },
    { key: 'oneDayBefore', label: '1日前' },
    { key: 'threeDaysBefore', label: '3日前' },
    { key: 'sevenDaysBefore', label: '7日前' },
  ];

  return (
    <div className="space-y-4">
      {/* リマインダー有効/無効 */}
      <div className="bg-card rounded-xl">
        <div className="flex items-center justify-between px-4 py-3 min-h-[52px]">
          <span className="text-[15px] text-[var(--color-text)]">リマインダー通知</span>
          <Toggle
            value={notificationSettings.enabled}
            onChange={handleEnableToggle}
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

// RFC 4180準拠の1行CSVパーサー（quoted fields対応）
function parseCSVRow(line: string): string[] {
  const cols: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (line[i] === '"') {
      let field = '';
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else { field += line[i++]; }
      }
      cols.push(field);
      if (line[i] === ',') i++;
    } else {
      const end = line.indexOf(',', i);
      if (end === -1) { cols.push(line.slice(i)); break; }
      cols.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return cols;
}

function DataTab({ onClose }: { onClose: () => void }) {
  const companies = useAppStore((s) => s.companies);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const addCompany = useAppStore((s) => s.addCompany);
  const deleteAllCompanies = useAppStore((s) => s.deleteAllCompanies);
  const resetTutorials = useAppStore((s) => s.resetTutorials);

  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showCsvHelp, setShowCsvHelp] = useState(false);
  const csvImportRef = useRef<HTMLInputElement>(null);

  const trackStatuses = [...statusColumns].sort((a, b) => a.order - b.order);

  const handleExportCSV = () => {
    const state = useAppStore.getState();
    const statusMap = Object.fromEntries(state.statusColumns.map((s) => [s.id, s.name]));
    const BOM = '\uFEFF';
    const header = '企業名,業界,選考段階,メモ,作成日\n';
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
          escape(c.selectionMemo || ''),
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

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        let text = ev.target?.result as string;
        if (text.startsWith('\uFEFF')) text = text.slice(1); // BOM除去
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) { alert('インポートするデータがありません。'); return; }

        // ヘッダー行からカラム位置を特定
        const headers = parseCSVRow(lines[0]).map((h) => h.trim());
        const idx = {
          name:     headers.indexOf('企業名'),
          industry: headers.indexOf('業界'),
          stage:    headers.indexOf('選考段階'),
          memo:     headers.indexOf('メモ'),
        };
        if (idx.name === -1) {
          alert('「企業名」列が見つかりません。\n1行目にヘッダー行が必要です（例：企業名,業界,選考段階,メモ）');
          return;
        }

        const unknownStages: string[] = [];
        const toImport: { name: string; statusId: string; industry?: string; selectionMemo?: string }[] = [];

        for (const line of lines.slice(1)) {
          const cols = parseCSVRow(line);
          const name = cols[idx.name]?.trim();
          if (!name) continue;
          const industry  = idx.industry >= 0 ? cols[idx.industry]?.trim() || undefined : undefined;
          const stageName = idx.stage    >= 0 ? cols[idx.stage]?.trim()    || ''        : '';
          const selectionMemo = idx.memo >= 0 ? cols[idx.memo]?.trim()     || undefined : undefined;
          const matched = trackStatuses.find((s) => s.name === stageName);
          if (!matched && stageName && !unknownStages.includes(stageName)) {
            unknownStages.push(stageName);
          }
          const statusId = matched?.id ?? trackStatuses[0]?.id;
          if (!statusId) continue;
          toImport.push({ name, statusId, industry, selectionMemo });
        }

        if (toImport.length === 0) { alert('有効な企業データがありませんでした。'); return; }

        let msg = `${toImport.length}社を既存データに追加しますか？`;
        if (unknownStages.length > 0) {
          msg += `\n\n⚠️ 不明な選考段階（「${trackStatuses[0]?.name ?? 'エントリー前'}」として追加）:\n${unknownStages.join(', ')}`;
        }
        if (!window.confirm(msg)) return;

        for (const c of toImport) addCompany(c);
        alert(`${toImport.length}社をインポートしました。`);
      } catch {
        alert('CSVファイルの読み込みに失敗しました。\nファイル形式を確認してください。');
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
        <button onClick={handleExportCSV} className="w-full flex items-center gap-3 px-4 py-3 text-left ios-tap border-b border-[var(--color-border)]">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[var(--color-primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <div>
            <div className="text-[15px] text-[var(--color-text)]">CSVエクスポート</div>
            <div className="text-[12px] text-[var(--color-text-secondary)]">企業名・業界・選考段階・メモ（Excel対応）</div>
          </div>
        </button>
        <button onClick={() => setShowCsvHelp(true)} className="w-full flex items-center gap-3 px-4 py-3 text-left ios-tap">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[var(--color-success)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <div>
            <div className="text-[15px] text-[var(--color-text)]">CSVインポート</div>
            <div className="text-[12px] text-[var(--color-text-secondary)]">CSVから企業を追加（既存データに追記）</div>
          </div>
        </button>
        <input ref={csvImportRef} type="file" accept=".csv,text/csv" onChange={handleImportCSV} className="hidden" />
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

      {/* チュートリアル */}
      <div className="bg-card rounded-xl overflow-hidden">
        <button
          onClick={() => {
            resetTutorials();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-left ios-tap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[var(--color-primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <div>
            <div className="text-[15px] text-[var(--color-text)]">チュートリアルを再表示</div>
            <div className="text-[12px] text-[var(--color-text-secondary)]">各画面の使い方ガイドをリセット</div>
          </div>
        </button>
      </div>

      <div className="text-center">
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] text-[var(--color-text-secondary)] underline"
        >
          プライバシーポリシー
        </a>
      </div>

      <button onClick={onClose} className="ios-button-secondary w-full">
        完了
      </button>

      {showBulkImport && (
        <BulkImportModal statusColumns={trackStatuses} onClose={() => setShowBulkImport(false)} />
      )}

      {showCsvHelp && (
        <div className="absolute inset-0 z-[80] flex items-end justify-center" style={{ paddingBottom: '1rem' }}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCsvHelp(false)} />
          <div className="relative bg-[var(--color-bg)] rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[var(--color-border)] shrink-0">
              <h3 className="text-[17px] font-bold text-[var(--color-text)]">CSVインポートの使い方</h3>
              <button onClick={() => setShowCsvHelp(false)} className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--color-text-secondary)] ios-tap">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-4">

              {/* おすすめ */}
              <div className="bg-blue-50 dark:bg-blue-950/40 rounded-xl px-4 py-3">
                <p className="text-[13px] font-semibold text-blue-600 dark:text-blue-400 mb-1">まず「CSVエクスポート」を試してみよう</p>
                <p className="text-[12px] text-blue-500 dark:text-blue-300 leading-relaxed">
                  アプリからエクスポートしたCSVをExcelで編集して再インポートするのが一番簡単です。列の順番・名前が自動的に正しい形式になります。
                </p>
              </div>

              {/* 列の説明 */}
              <div className="bg-card rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-[var(--color-border)]">
                  <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">使用できる列（順番は自由）</span>
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {[
                    { col: '企業名', required: true,  note: '必須。この列がないとインポートできません' },
                    { col: '業界',   required: false, note: '任意。省略可' },
                    { col: '選考段階', required: false, note: '任意。アプリの段階名と完全一致が必要' },
                    { col: 'メモ',   required: false, note: '任意。省略可' },
                    { col: '作成日', required: false, note: '任意。書いても無視されます（自動設定）' },
                  ].map(({ col, required, note }) => (
                    <div key={col} className="px-4 py-2.5 flex items-start gap-3">
                      <span className="text-[12px] font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 rounded px-2 py-0.5 shrink-0 mt-0.5 font-mono">{col}</span>
                      <div className="min-w-0">
                        {required && <span className="text-[11px] font-bold text-red-500 mr-1">必須</span>}
                        <span className="text-[12px] text-[var(--color-text-secondary)]">{note}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 bg-[var(--color-border)]/30">
                  <p className="text-[12px] text-[var(--color-text-secondary)]">1行目はヘッダー行（列名）にしてください。列の順番はA・B・C…どこでも構いません。</p>
                </div>
              </div>

              {/* 記載例 */}
              <div className="bg-card rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-[var(--color-border)]">
                  <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">記載例（列順変更もOK）</span>
                </div>
                <div className="px-4 py-3 overflow-x-auto space-y-3">
                  <div>
                    <p className="text-[11px] text-[var(--color-text-secondary)] mb-1">例①　標準の並び</p>
                    <pre className="text-[11px] text-[var(--color-text)] font-mono leading-relaxed whitespace-pre bg-[var(--color-border)]/30 rounded-lg p-2">{`企業名,業界,選考段階,メモ
トヨタ自動車,メーカー,ES,
三菱UFJ銀行,金融,Webテスト,
ソニー,メーカー,1次面接,志望動機メモ`}</pre>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--color-text-secondary)] mb-1">例②　列順を変えてもOK（企業名さえあればよい）</p>
                    <pre className="text-[11px] text-[var(--color-text)] font-mono leading-relaxed whitespace-pre bg-[var(--color-border)]/30 rounded-lg p-2">{`選考段階,企業名,メモ
ES,トヨタ自動車,
1次面接,ソニー,志望動機メモ`}</pre>
                  </div>
                </div>
              </div>

              {/* 選考段階の一覧 */}
              <div className="bg-card rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-[var(--color-border)]">
                  <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">使用できる選考段階名</span>
                </div>
                <div className="px-4 py-3 flex flex-wrap gap-1.5">
                  {trackStatuses.map((s) => (
                    <span key={s.id} className="text-[12px] font-medium bg-[var(--color-border)] text-[var(--color-text)] rounded-full px-2.5 py-1 font-mono">{s.name}</span>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-border)]/30">
                  <p className="text-[12px] text-[var(--color-text-secondary)]">上記以外の名前が入力された場合は「{trackStatuses[0]?.name ?? 'エントリー前'}」として追加されます。</p>
                </div>
              </div>

              {/* 注意事項 */}
              <div className="bg-card rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-[var(--color-border)]">
                  <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">注意事項</span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {[
                    '既存のデータは消えません。インポートした企業が追記されます。',
                    '選考予定・面接日程はCSVに含まれません。追加後に各企業の詳細画面から設定してください。',
                    'ExcelでCSVを編集する際は「CSV UTF-8（BOM付き）」形式で保存してください。',
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[var(--color-text-secondary)] text-[12px] mt-0.5 shrink-0">•</span>
                      <p className="text-[13px] text-[var(--color-text)] leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-4 pt-4 border-t border-[var(--color-border)] shrink-0 space-y-2" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
              <button
                onClick={() => { setShowCsvHelp(false); csvImportRef.current?.click(); }}
                className="ios-button-primary"
              >
                ファイルを選択してインポート
              </button>
              <button onClick={() => setShowCsvHelp(false)} className="ios-button-secondary">
                キャンセル
              </button>
            </div>
          </div>
        </div>
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
      } ${disabled ? 'bg-gray-300 dark:bg-gray-400' : value ? 'bg-[var(--color-primary)]' : 'bg-gray-300 dark:bg-gray-600'}`}
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
