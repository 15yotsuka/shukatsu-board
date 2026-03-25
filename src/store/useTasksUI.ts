'use client';

import { create } from 'zustand';
import { useAppStore } from '@/store/useAppStore';

interface TasksUIStore {
  isSelectMode: boolean;
  selectedIds: string[];
  showBulkAdd: boolean;
  enterSelectMode: () => void;
  exitSelectMode: () => void;
  toggleSelect: (id: string) => void;
  openBulkAdd: () => void;
  closeBulkAdd: () => void;
  handleDeleteSelected: () => void;
}

export const useTasksUI = create<TasksUIStore>((set, get) => ({
  isSelectMode: false,
  selectedIds: [],
  showBulkAdd: false,

  enterSelectMode: () => set({ isSelectMode: true, selectedIds: [] }),
  exitSelectMode: () => set({ isSelectMode: false, selectedIds: [] }),

  toggleSelect: (id) => {
    const { selectedIds } = get();
    if (selectedIds.includes(id)) {
      set({ selectedIds: selectedIds.filter((x) => x !== id) });
    } else {
      set({ selectedIds: [...selectedIds, id] });
    }
  },

  openBulkAdd: () => set({ showBulkAdd: true }),
  closeBulkAdd: () => set({ showBulkAdd: false }),

  handleDeleteSelected: () => {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    if (!window.confirm(`選択した${selectedIds.length}社を削除しますか？\nこの操作は取り消せません。`)) return;
    const { deleteCompany } = useAppStore.getState();
    selectedIds.forEach((id) => deleteCompany(id));
    set({ isSelectMode: false, selectedIds: [] });
  },
}));
