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
}

type AppStore = AppState & AppActions;

const CURRENT_SCHEMA_VERSION = 1;

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      schemaVersion: CURRENT_SCHEMA_VERSION,
      companies: [],
      statusColumns: createAllDefaultStatuses(),
      interviews: [],
      esEntries: [],
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
          url: company.url,
          statusId: firstMainStatus.id,
          trackType: 'main',
          orderInColumn: companiesInTarget.length,
          createdAt: now,
          updatedAt: now,
        };
        set({ companies: [...state.companies, newCompany] });
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
    }),
    {
      name: 'shukatsu-board-data',
      version: CURRENT_SCHEMA_VERSION,
      migrate: (persistedState, version) => {
        if (version === 0 || version < CURRENT_SCHEMA_VERSION) {
          const state = persistedState as Partial<AppState>;
          return {
            schemaVersion: CURRENT_SCHEMA_VERSION,
            companies: state.companies ?? [],
            statusColumns: state.statusColumns ?? createAllDefaultStatuses(),
            interviews: state.interviews ?? [],
            esEntries: state.esEntries ?? [],
            activeTrack: state.activeTrack ?? 'intern',
          } as AppState;
        }
        return persistedState as AppState;
      },
    }
  )
);
