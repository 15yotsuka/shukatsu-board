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
import { useAppStore } from '@/store/useAppStore';
import type { StatusColumn } from '@/lib/types';

interface StatusEditorProps {
  onClose: () => void;
}

export function StatusEditor({ onClose }: StatusEditorProps) {
  const statusColumns = useAppStore((s) => s.statusColumns);
  const companies = useAppStore((s) => s.companies);
  const addStatus = useAppStore((s) => s.addStatus);
  const updateStatus = useAppStore((s) => s.updateStatus);
  const deleteStatus = useAppStore((s) => s.deleteStatus);
  const reorderStatuses = useAppStore((s) => s.reorderStatuses);
  const loadBackup = useAppStore((s) => s.loadBackup);
  const deleteAllCompanies = useAppStore((s) => s.deleteAllCompanies);

  const [newStatusName, setNewStatusName] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const state = useAppStore.getState();
    const data = {
      schemaVersion: state.schemaVersion,
      companies: state.companies,
      statusColumns: state.statusColumns,
      interviews: state.interviews,
      esEntries: state.esEntries,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const a = document.createElement('a');
    a.href = url;
    a.download = `shukatsu-board-backup-${today}.json`;
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
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-[var(--color-bg)] rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up">
        {/* Grab bar */}
        <div className="flex justify-center pt-2 pb-0 md:hidden">
          <div className="w-9 h-1 bg-[var(--color-border)] rounded-full" />
        </div>

        <div className="px-4 pt-4 pb-2">
          <h2 className="text-[17px] font-bold text-center text-[var(--color-text)]">ステータス編集</h2>
        </div>

        <div className="p-4">
          {deleteError && (
            <div className="mb-3 p-3 bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-[14px] rounded-xl">
              {deleteError}
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={trackStatuses.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="bg-card rounded-xl divide-y divide-[var(--color-border)] mb-6">
                {trackStatuses.map((status) => (
                  <SortableStatusItem
                    key={status.id}
                    status={status}
                    companyCount={
                      companies.filter((c) => c.statusId === status.id).length
                    }
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

          {/* Backup / Restore */}
          <div className="mt-6 bg-card rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-[var(--color-border)]">
              <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                バックアップ
              </span>
            </div>
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-3 px-4 py-3 text-left ios-tap border-b border-[var(--color-border)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[var(--color-primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <div>
                <div className="text-[15px] text-[var(--color-text)]">エクスポート</div>
                <div className="text-[12px] text-[var(--color-text-secondary)]">JSONファイルとして保存</div>
              </div>
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-3 text-left ios-tap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[var(--color-success)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <div>
                <div className="text-[15px] text-[var(--color-text)]">インポート（復元）</div>
                <div className="text-[12px] text-[var(--color-text-secondary)]">JSONファイルから復元</div>
              </div>
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

          {/* 企業データ一括操作 */}
          <div className="mt-4 bg-card rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-[var(--color-border)]">
              <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                企業データ
              </span>
            </div>
            <button
              onClick={() => setShowBulkImport(true)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left ios-tap border-b border-[var(--color-border)]"
            >
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

          <button onClick={onClose} className="ios-button-secondary mt-4">
            完了
          </button>

          {/* 一括追加モーダル */}
          {showBulkImport && (
            <BulkImportModal
              statusColumns={trackStatuses}
              onClose={() => { setShowBulkImport(false); setBulkText(''); }}
              bulkText={bulkText}
              setBulkText={setBulkText}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface SortableStatusItemProps {
  status: StatusColumn;
  companyCount: number;
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

function SortableStatusItem({
  status,
  companyCount,
  onUpdate,
  onDelete,
}: SortableStatusItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(status.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== status.name) {
      onUpdate(status.id, trimmed);
    }
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`px-4 py-3 flex items-center gap-3 min-h-[44px] ${isDragging ? 'opacity-50 bg-[var(--color-bg)]' : ''
        }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-manipulation p-1 text-[var(--color-border)]"
      >
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
        <button
          onClick={() => setIsEditing(true)}
          className="flex-1 text-left text-[15px] text-[var(--color-text)] min-h-[44px] flex items-center ios-tap"
        >
          {status.name}
        </button>
      )}

      <span className="text-[12px] text-[var(--color-text-secondary)] bg-[var(--color-border)] rounded-full px-2 py-0.5">
        {companyCount}
      </span>

      <button
        onClick={() => onDelete(status.id)}
        className="w-11 h-11 flex items-center justify-center text-[var(--color-danger)] ios-tap"
        title={companyCount > 0 ? '企業がある場合は削除できません' : '削除'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

interface BulkImportModalProps {
  statusColumns: { id: string; name: string }[];
  onClose: () => void;
  bulkText: string;
  setBulkText: (v: string) => void;
}

function BulkImportModal({ statusColumns, onClose, bulkText, setBulkText }: BulkImportModalProps) {
  const addCompany = useAppStore((s) => s.addCompany);
  const [selectedStatusId, setSelectedStatusId] = useState(statusColumns[0]?.id ?? '');

  const handleImport = () => {
    const names = bulkText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (names.length === 0) return;
    names.forEach((name) => {
      addCompany({ name, statusId: selectedStatusId });
    });
    onClose();
  };

  const previewCount = bulkText.split('\n').filter((s) => s.trim().length > 0).length;

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card w-full max-w-lg rounded-t-2xl md:rounded-2xl p-5 pb-8 space-y-4 shadow-2xl">
        <div className="flex justify-center mb-1 md:hidden">
          <div className="w-9 h-1 bg-[var(--color-border)] rounded-full" />
        </div>
        <h3 className="text-[17px] font-bold text-[var(--color-text)]">企業を一括追加</h3>
        <div>
          <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">
            初期ステータス
          </label>
          <select
            value={selectedStatusId}
            onChange={(e) => setSelectedStatusId(e.target.value)}
            className="ios-input"
          >
            {statusColumns.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">
            企業名（1行に1社）
          </label>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={'株式会社A\n株式会社B\n株式会社C'}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 text-[15px] text-[var(--color-text)] min-h-[140px] outline-none resize-none"
            autoFocus
          />
          {previewCount > 0 && (
            <p className="text-[12px] text-[var(--color-text-secondary)] mt-1">{previewCount}社を追加します</p>
          )}
        </div>
        <button
          onClick={handleImport}
          disabled={previewCount === 0}
          className="ios-button-primary disabled:opacity-40"
        >
          {previewCount}社を追加する
        </button>
        <button onClick={onClose} className="ios-button-secondary">キャンセル</button>
      </div>
    </div>
  );
}
