import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  AppState,
  Company,
  StatusColumn,
  TrackType,
  Interview,
  ESEntry,
  ScheduledAction,
} from '@/lib/types';
import { createAllDefaultStatuses } from '@/lib/defaults';

interface AppActions {
  // Company CRUD
  addCompany: (
    company: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'orderInColumn'>
  ) => void;
  updateCompany: (id: string, updates: Partial<Omit<Company, 'id'>>) => void;
  deleteCompany: (id: string) => void;
  moveCompany: (companyId: string, newStatusId: string, newOrder: number) => void;

  // Status CRUD
  addStatus: (name: string, trackType: TrackType) => void;
  updateStatus: (id: string, name: string) => void;
  deleteStatus: (id: string) => boolean;
  reorderStatuses: (trackType: TrackType, orderedIds: string[]) => void;

  // Track
  setActiveTrack: (track: TrackType) => void;

  // Promote
  promoteToMain: (companyId: string) => void;

  // Interview CRUD (Phase 2)
  addInterview: (
    interview: Omit<Interview, 'id' | 'createdAt'>
  ) => void;
  updateInterview: (id: string, updates: Partial<Omit<Interview, 'id'>>) => void;
  deleteInterview: (id: string) => void;

  // ES CRUD (Phase 3)
  addESEntry: (entry: Omit<ESEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateESEntry: (id: string, updates: Partial<Omit<ESEntry, 'id'>>) => void;
  deleteESEntry: (id: string) => void;
  reorderESEntries: (companyId: string, orderedIds: string[]) => void;

  // ScheduledAction CRUD
  addScheduledAction: (action: Omit<ScheduledAction, 'id'>) => void;
  updateScheduledAction: (id: string, updates: Partial<ScheduledAction>) => void;
  deleteScheduledAction: (id: string) => void;

  // Backup / Restore
  loadBackup: (data: Partial<AppState>) => void;
}

type AppStore = AppState & AppActions;

const CURRENT_SCHEMA_VERSION = 2;

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      schemaVersion: CURRENT_SCHEMA_VERSION,
      companies: [],
      statusColumns: createAllDefaultStatuses(),
      interviews: [],
      esEntries: [],
      scheduledActions: [],
      activeTrack: 'intern' as TrackType,

      // Company CRUD
      addCompany: (company) => {
        const now = new Date().toISOString();
        const state = get();
        const companiesInColumn = state.companies.filter(
          (c) => c.statusId === company.statusId
        );
        const newCompany: Company = {
          ...company,
          id: nanoid(),
          orderInColumn: companiesInColumn.length,
          createdAt: now,
          updatedAt: now,
        };
        set({ companies: [...state.companies, newCompany] });
      },

      updateCompany: (id, updates) => {
        set((state) => ({
          companies: state.companies.map((c) =>
            c.id === id
              ? { ...c, ...updates, updatedAt: new Date().toISOString() }
              : c
          ),
        }));
      },

      deleteCompany: (id) => {
        set((state) => ({
          companies: state.companies.filter((c) => c.id !== id),
          interviews: state.interviews.filter((i) => i.companyId !== id),
          esEntries: state.esEntries.filter((e) => e.companyId !== id),
          scheduledActions: state.scheduledActions.filter((a) => a.companyId !== id),
        }));
      },

      moveCompany: (companyId, newStatusId, newOrder) => {
        set((state) => {
          const company = state.companies.find((c) => c.id === companyId);
          if (!company) return state;

          const oldStatusId = company.statusId;
          let updatedCompanies = state.companies.map((c) => {
            if (c.id === companyId) {
              return {
                ...c,
                statusId: newStatusId,
                orderInColumn: newOrder,
                updatedAt: new Date().toISOString(),
              };
            }
            return c;
          });

          // Reorder companies in the old column (if different)
          if (oldStatusId !== newStatusId) {
            const oldColumnCompanies = updatedCompanies
              .filter((c) => c.statusId === oldStatusId && c.id !== companyId)
              .sort((a, b) => a.orderInColumn - b.orderInColumn);
            updatedCompanies = updatedCompanies.map((c) => {
              if (c.statusId === oldStatusId && c.id !== companyId) {
                const idx = oldColumnCompanies.findIndex((oc) => oc.id === c.id);
                return { ...c, orderInColumn: idx };
              }
              return c;
            });
          }

          // Reorder companies in the new column
          const newColumnCompanies = updatedCompanies
            .filter((c) => c.statusId === newStatusId)
            .sort((a, b) => {
              if (a.id === companyId) return newOrder - b.orderInColumn;
              if (b.id === companyId) return a.orderInColumn - newOrder;
              return a.orderInColumn - b.orderInColumn;
            });

          updatedCompanies = updatedCompanies.map((c) => {
            if (c.statusId === newStatusId) {
              const idx = newColumnCompanies.findIndex((nc) => nc.id === c.id);
              return { ...c, orderInColumn: idx >= 0 ? idx : c.orderInColumn };
            }
            return c;
          });

          return { companies: updatedCompanies };
        });
      },

      // Status CRUD
      addStatus: (name, trackType) => {
        const state = get();
        const trackStatuses = state.statusColumns.filter(
          (s) => s.trackType === trackType
        );
        const newStatus: StatusColumn = {
          id: nanoid(),
          name,
          order: trackStatuses.length,
          trackType,
        };
        set({ statusColumns: [...state.statusColumns, newStatus] });
      },

      updateStatus: (id, name) => {
        set((state) => ({
          statusColumns: state.statusColumns.map((s) =>
            s.id === id ? { ...s, name } : s
          ),
        }));
      },

      deleteStatus: (id) => {
        const state = get();
        const companiesInStatus = state.companies.filter(
          (c) => c.statusId === id
        );
        if (companiesInStatus.length > 0) {
          return false;
        }
        set({
          statusColumns: state.statusColumns.filter((s) => s.id !== id),
        });
        return true;
      },

      reorderStatuses: (trackType, orderedIds) => {
        set((state) => ({
          statusColumns: state.statusColumns.map((s) => {
            if (s.trackType !== trackType) return s;
            const newOrder = orderedIds.indexOf(s.id);
            return newOrder >= 0 ? { ...s, order: newOrder } : s;
          }),
        }));
      },

      // Track
      setActiveTrack: (track) => {
        set({ activeTrack: track });
      },

      // Promote
      promoteToMain: (companyId) => {
        const state = get();
        const company = state.companies.find((c) => c.id === companyId);
        if (!company) return;

        const mainStatuses = state.statusColumns
          .filter((s) => s.trackType === 'main')
          .sort((a, b) => a.order - b.order);
        const firstMainStatus = mainStatuses[0];
        if (!firstMainStatus) return;

        const now = new Date().toISOString();
        const companiesInTarget = state.companies.filter(
          (c) => c.statusId === firstMainStatus.id
        );
        const newCompany: Company = {
          id: nanoid(),
          name: company.name,
          industry: company.industry,
          jobType: company.jobType,
          url: company.url,
          myPageUrl: company.myPageUrl,
          myPageId: company.myPageId,
          myPagePassword: company.myPagePassword,
          selectionMemo: company.selectionMemo,
          statusId: firstMainStatus.id,
          trackType: 'main',
          orderInColumn: companiesInTarget.length,
          createdAt: now,
          updatedAt: now,
        };
        set({
          companies: [
            ...state.companies.filter((c) => c.id !== companyId),
            newCompany,
          ],
        });
      },

      // Interview CRUD
      addInterview: (interview) => {
        const newInterview: Interview = {
          ...interview,
          id: nanoid(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          interviews: [...state.interviews, newInterview],
        }));
      },

      updateInterview: (id, updates) => {
        set((state) => ({
          interviews: state.interviews.map((i) =>
            i.id === id ? { ...i, ...updates } : i
          ),
        }));
      },

      deleteInterview: (id) => {
        set((state) => ({
          interviews: state.interviews.filter((i) => i.id !== id),
        }));
      },

      // ES CRUD
      addESEntry: (entry) => {
        const now = new Date().toISOString();
        const newEntry: ESEntry = {
          ...entry,
          id: nanoid(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          esEntries: [...state.esEntries, newEntry],
        }));
      },

      updateESEntry: (id, updates) => {
        set((state) => ({
          esEntries: state.esEntries.map((e) =>
            e.id === id
              ? { ...e, ...updates, updatedAt: new Date().toISOString() }
              : e
          ),
        }));
      },

      deleteESEntry: (id) => {
        set((state) => ({
          esEntries: state.esEntries.filter((e) => e.id !== id),
        }));
      },

      reorderESEntries: (companyId, orderedIds) => {
        set((state) => ({
          esEntries: state.esEntries.map((e) => {
            if (e.companyId !== companyId) return e;
            const newOrder = orderedIds.indexOf(e.id);
            return newOrder >= 0 ? { ...e, order: newOrder } : e;
          }),
        }));
      },

      // ScheduledAction CRUD
      addScheduledAction: (action) => {
        const newAction: ScheduledAction = { ...action, id: nanoid() };
        set((state) => {
          const newActions = [...state.scheduledActions, newAction];
          const today = new Date().toISOString().slice(0, 10);
          const nextAction = newActions
            .filter((a) => a.companyId === action.companyId && a.date >= today)
            .sort((a, b) => a.date.localeCompare(b.date))[0];
          return {
            scheduledActions: newActions,
            companies: state.companies.map((c) =>
              c.id === action.companyId
                ? {
                    ...c,
                    nextActionDate: nextAction?.date,
                    nextActionType: nextAction?.type,
                    nextDeadline: nextAction?.date,
                    updatedAt: new Date().toISOString(),
                  }
                : c
            ),
          };
        });
      },

      updateScheduledAction: (id, updates) => {
        set((state) => ({
          scheduledActions: state.scheduledActions.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        }));
      },

      deleteScheduledAction: (id) => {
        set((state) => {
          const removed = state.scheduledActions.find((a) => a.id === id);
          const newActions = state.scheduledActions.filter((a) => a.id !== id);
          if (!removed) return { scheduledActions: newActions };
          const today = new Date().toISOString().slice(0, 10);
          const nextAction = newActions
            .filter((a) => a.companyId === removed.companyId && a.date >= today)
            .sort((a, b) => a.date.localeCompare(b.date))[0];
          return {
            scheduledActions: newActions,
            companies: state.companies.map((c) =>
              c.id === removed.companyId
                ? {
                    ...c,
                    nextActionDate: nextAction?.date,
                    nextActionType: nextAction?.type,
                    nextDeadline: nextAction?.date,
                    updatedAt: new Date().toISOString(),
                  }
                : c
            ),
          };
        });
      },

      // Backup / Restore
      loadBackup: (data) => {
        set({
          schemaVersion: data.schemaVersion ?? CURRENT_SCHEMA_VERSION,
          companies: data.companies ?? [],
          statusColumns: data.statusColumns ?? createAllDefaultStatuses(),
          interviews: data.interviews ?? [],
          esEntries: data.esEntries ?? [],
          scheduledActions: (data as AppState).scheduledActions ?? [],
          activeTrack: data.activeTrack ?? 'intern',
        });
      },
    }),
    {
      name: 'shukatsu-board-data',
      version: CURRENT_SCHEMA_VERSION,
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<AppState>;
        if (version < CURRENT_SCHEMA_VERSION) {
          return {
            schemaVersion: CURRENT_SCHEMA_VERSION,
            companies: state.companies ?? [],
            statusColumns: state.statusColumns ?? createAllDefaultStatuses(),
            interviews: state.interviews ?? [],
            esEntries: state.esEntries ?? [],
            scheduledActions: state.scheduledActions ?? [],
            activeTrack: state.activeTrack ?? 'intern',
          } as AppState;
        }
        return persistedState as AppState;
      },
    }
  )
);
