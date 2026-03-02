'use client';

import { useState } from 'react';
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
  const activeTrack = useAppStore((s) => s.activeTrack);
  const statusColumns = useAppStore((s) => s.statusColumns);
  const companies = useAppStore((s) => s.companies);
  const addStatus = useAppStore((s) => s.addStatus);
  const updateStatus = useAppStore((s) => s.updateStatus);
  const deleteStatus = useAppStore((s) => s.deleteStatus);
  const reorderStatuses = useAppStore((s) => s.reorderStatuses);

  const [newStatusName, setNewStatusName] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const trackStatuses = statusColumns
    .filter((s) => s.trackType === activeTrack)
    .sort((a, b) => a.order - b.order);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleAddStatus = () => {
    const trimmed = newStatusName.trim();
    if (!trimmed) return;
    addStatus(trimmed, activeTrack);
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
    reorderStatuses(activeTrack, reordered.map((s) => s.id));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-[#F2F2F7] rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up">
        {/* Grab bar */}
        <div className="flex justify-center pt-2 pb-0 md:hidden">
          <div className="w-9 h-1 bg-[#E5E5EA] rounded-full" />
        </div>

        <div className="px-4 pt-4 pb-2">
          <h2 className="text-[17px] font-bold text-center text-[#1C1C1E]">ステータス編集</h2>
        </div>

        <div className="p-4">
          {deleteError && (
            <div className="mb-3 p-3 bg-[#FF3B30]/10 text-[#FF3B30] text-[14px] rounded-xl">
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
              <div className="bg-white rounded-xl divide-y divide-[#E5E5EA] mb-6">
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

          <button onClick={onClose} className="ios-button-secondary mt-4">
            完了
          </button>
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
      className={`px-4 py-3 flex items-center gap-3 min-h-[44px] ${
        isDragging ? 'opacity-50 bg-[#F2F2F7]' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-manipulation p-1 text-[#C7C7CC]"
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
          className="flex-1 text-left text-[15px] text-[#1C1C1E] min-h-[44px] flex items-center ios-tap"
        >
          {status.name}
        </button>
      )}

      <span className="text-[12px] text-[#8E8E93] bg-[#E5E5EA] rounded-full px-2 py-0.5">
        {companyCount}
      </span>

      <button
        onClick={() => onDelete(status.id)}
        className="w-11 h-11 flex items-center justify-center text-[#FF3B30] ios-tap"
        title={companyCount > 0 ? '企業がある場合は削除できません' : '削除'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
