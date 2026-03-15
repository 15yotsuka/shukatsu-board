import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  AppState,
  Company,
  StatusColumn,
  Interview,
  ScheduledAction,
  Tag,
} from '@/lib/types';
import { createAllDefaultStatuses } from '@/lib/defaults';
import type { GradYear } from '@/lib/gradYears';

export interface DisplaySettings {
  showTag: boolean;
  showIndustry: boolean;
  showNextInterview: boolean;
  showUpdatedDate: boolean;
  showDeadlineBadge: boolean;
  showProgressBar: boolean;
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  showTag: true,
  showIndustry: true,
  showNextInterview: true,
  showUpdatedDate: true,
  showDeadlineBadge: true,
  showProgressBar: true,
};

export interface NotificationSettings {
  enabled: boolean;
  timing: {
    sameDay: boolean;
    oneDayBefore: boolean;
    threeDaysBefore: boolean;
    sevenDaysBefore: boolean;
  };
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  timing: {
    sameDay: true,
    oneDayBefore: true,
    threeDaysBefore: true,
    sevenDaysBefore: true,
  },
};

export interface TutorialFlags {
  home: boolean;
  companies: boolean;
  detail: boolean;
  calendar: boolean;
  settings: boolean;
  addCompany: boolean;
  deadline: boolean;
}

export const DEFAULT_TUTORIAL_FLAGS: TutorialFlags = {
  home: false,
  companies: false,
  detail: false,
  calendar: false,
  settings: false,
  addCompany: false,
  deadline: false,
};

interface AppActions {
  // Company CRUD
  addCompany: (
    company: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'orderInColumn'>
  ) => void;
  updateCompany: (id: string, updates: Partial<Omit<Company, 'id'>>) => void;
  deleteCompany: (id: string) => void;
  deleteAllCompanies: () => void;
  moveCompany: (companyId: string, newStatusId: string, newOrder: number) => void;

  // Status CRUD
  addStatus: (name: string) => void;
  updateStatus: (id: string, name: string) => void;
  deleteStatus: (id: string) => boolean;
  reorderStatuses: (orderedIds: string[]) => void;

  // Interview CRUD (Phase 2)
  addInterview: (
    interview: Omit<Interview, 'id' | 'createdAt'>
  ) => void;
  updateInterview: (id: string, updates: Partial<Omit<Interview, 'id'>>) => void;
  deleteInterview: (id: string) => void;

  // Reorder companies (manual sort)
  reorderCompanies: (orderedIds: string[]) => void;

  // ScheduledAction CRUD
  addScheduledAction: (action: Omit<ScheduledAction, 'id'>) => void;
  updateScheduledAction: (id: string, updates: Partial<ScheduledAction>) => void;
  deleteScheduledAction: (id: string) => void;

  // Display settings
  updateDisplaySetting: <K extends keyof DisplaySettings>(key: K, value: boolean) => void;

  // Notification settings
  updateNotificationEnabled: (value: boolean) => void;
  updateNotificationTiming: <K extends keyof NotificationSettings['timing']>(key: K, value: boolean) => void;

  // Grad year
  setGradYear: (year: GradYear) => void;

  // Awaiting result
  toggleAwaitingResult: (companyId: string) => void;

  // Tutorial flags
  markTutorialSeen: (key: keyof TutorialFlags) => void;
  resetTutorials: () => void;

  // Backup / Restore
  loadBackup: (data: Partial<AppState>) => void;
}

type AppStore = AppState & {
  displaySettings: DisplaySettings;
  notificationSettings: NotificationSettings;
  gradYear: GradYear | null;
  tutorialFlags: TutorialFlags;
} & AppActions;

const CURRENT_SCHEMA_VERSION = 14;

export function normalizeCompanyName(name: string): string {
  return name
    .replace(/^株式会社\s*/u, '')
    .replace(/\s*株式会社$/u, '')
    .replace(/^有限会社\s*/u, '')
    .replace(/\s*有限会社$/u, '')
    .trim();
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      schemaVersion: CURRENT_SCHEMA_VERSION,
      companies: [],
      statusColumns: createAllDefaultStatuses(),
      interviews: [],
      scheduledActions: [],
      displaySettings: DEFAULT_DISPLAY_SETTINGS,
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      gradYear: null,
      tutorialFlags: DEFAULT_TUTORIAL_FLAGS,

      // Company CRUD
      addCompany: (company) => {
        const now = new Date().toISOString();
        const state = get();
        const companiesInColumn = state.companies.filter(
          (c) => c.statusId === company.statusId
        );
        const newCompany: Company = {
          ...company,
          name: normalizeCompanyName(company.name),
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
              ? {
                  ...c,
                  ...updates,
                  name: updates.name !== undefined ? normalizeCompanyName(updates.name) : c.name,
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        }));
      },

      deleteCompany: (id) => {
        set((state) => ({
          companies: state.companies.filter((c) => c.id !== id),
          interviews: state.interviews.filter((i) => i.companyId !== id),
          scheduledActions: state.scheduledActions.filter((a) => a.companyId !== id),
        }));
      },

      deleteAllCompanies: () => {
        set({ companies: [], interviews: [], scheduledActions: [] });
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
      addStatus: (name) => {
        const state = get();
        const newStatus: StatusColumn = {
          id: nanoid(),
          name,
          order: state.statusColumns.length,
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

      reorderStatuses: (orderedIds) => {
        set((state) => ({
          statusColumns: state.statusColumns.map((s) => {
            const newOrder = orderedIds.indexOf(s.id);
            return newOrder >= 0 ? { ...s, order: newOrder } : s;
          }),
        }));
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

      // Reorder companies (manual sort)
      reorderCompanies: (orderedIds) => {
        set((state) => {
          const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
          return {
            companies: [...state.companies].sort((a, b) => {
              const aIdx = orderMap.has(a.id) ? orderMap.get(a.id)! : Infinity;
              const bIdx = orderMap.has(b.id) ? orderMap.get(b.id)! : Infinity;
              if (aIdx === Infinity && bIdx === Infinity) return 0;
              return aIdx - bIdx;
            }),
          };
        });
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
                    nextActionTime: nextAction?.startTime,
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
                    nextActionTime: nextAction?.startTime,
                    nextDeadline: nextAction?.date,
                    updatedAt: new Date().toISOString(),
                  }
                : c
            ),
          };
        });
      },

      // Display settings
      updateDisplaySetting: (key, value) => {
        set((state) => ({
          displaySettings: { ...state.displaySettings, [key]: value },
        }));
      },

      // Notification settings
      updateNotificationEnabled: (value) => {
        set((state) => ({
          notificationSettings: { ...state.notificationSettings, enabled: value },
        }));
      },

      updateNotificationTiming: (key, value) => {
        set((state) => ({
          notificationSettings: {
            ...state.notificationSettings,
            timing: { ...state.notificationSettings.timing, [key]: value },
          },
        }));
      },

      // Grad year
      setGradYear: (year) => {
        set({ gradYear: year });
      },

      // Awaiting result
      toggleAwaitingResult: (companyId) => {
        set((state) => ({
          companies: state.companies.map((c) =>
            c.id === companyId
              ? { ...c, awaitingResult: !c.awaitingResult, updatedAt: new Date().toISOString() }
              : c
          ),
        }));
      },

      // Tutorial flags
      markTutorialSeen: (key) => {
        set((state) => ({
          tutorialFlags: { ...state.tutorialFlags, [key]: true },
        }));
      },
      resetTutorials: () => {
        set({ tutorialFlags: DEFAULT_TUTORIAL_FLAGS });
      },

      // Backup / Restore
      loadBackup: (data) => {
        set({
          schemaVersion: data.schemaVersion ?? CURRENT_SCHEMA_VERSION,
          companies: data.companies ?? [],
          statusColumns: data.statusColumns ?? createAllDefaultStatuses(),
          interviews: data.interviews ?? [],
          scheduledActions: (data as AppState).scheduledActions ?? [],
        });
      },
    }),
    {
      name: 'shukatsu-board-data',
      version: CURRENT_SCHEMA_VERSION,
      migrate: (persistedState, version) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = persistedState as any;
        // v1→v2→v3: strip trackType from companies/statusColumns, remove activeTrack
        // v3→v4: rename selectionType values (intern_only→intern, main_only→main)
        // v4→v5: remove intern_to_main selectionType; convert old priority → tags[]
        const selectionTypeRemap: Record<string, string> = {
          intern_only: 'intern',
          main_only: 'main',
          intern_to_main: 'main',
        };
        const priorityToTagRemap: Record<string, Tag> = {
          S: '優遇あり',
          '早期': '早期選考',
          'リク面': 'リクルーター面談',
          '結果待ち': '結果待ち',
          // '持ち駒' intentionally dropped
        };

        // Pre-v10: strip trackType & remap selectionType/priority
        let companies = (state.companies ?? []).map((c: Company & { trackType?: unknown; priority?: string }) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { trackType, priority: oldPriority, ...rest } = c as Company & { trackType?: unknown; priority?: string };
          const rawType = rest.selectionType as string | undefined;
          const remapped = rawType
            ? (selectionTypeRemap[rawType] ?? rawType)
            : 'main';
          let tags = rest.tags as Tag[] | undefined;
          if (!tags && oldPriority) {
            const converted = priorityToTagRemap[oldPriority];
            if (converted) tags = [converted];
          }
          return {
            ...rest,
            selectionType: remapped,
            ...(tags ? { tags } : {}),
          };
        });

        let statusColumns: StatusColumn[] = (state.statusColumns ?? createAllDefaultStatuses()).map(
          (s: StatusColumn & { trackType?: unknown }) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { trackType, ...rest } = s as StatusColumn & { trackType?: unknown };
            return rest;
          }
        );

        // v9→v10: remap status column names, deduplicate, add awaitingResult, tutorialFlags
        if (version < 10) {
          const nameRemap: Record<string, string> = {
            '未エントリー': 'エントリー前',
            'ES作成中': 'ES',
            'ES提出済': 'ES',
            'Webテスト受検済': 'Webテスト',
            'インターン選考中': 'エントリー前',
            'お見送り': '見送り',
          };

          // Remap column names
          statusColumns = statusColumns.map((col: StatusColumn) => ({
            ...col,
            name: nameRemap[col.name] ?? col.name,
          }));

          // Deduplicate: keep first column with each name, merge companies from removed columns
          const seen = new Map<string, string>(); // name → kept column id
          const removedToKept = new Map<string, string>(); // removed column id → kept column id
          for (const col of statusColumns) {
            if (seen.has(col.name)) {
              removedToKept.set(col.id, seen.get(col.name)!);
            } else {
              seen.set(col.name, col.id);
            }
          }

          // Move companies from removed columns to kept columns
          if (removedToKept.size > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            companies = companies.map((c: any) => {
              const keptId = removedToKept.get(c.statusId);
              if (keptId) {
                return { ...c, statusId: keptId };
              }
              return c;
            });
          }

          // Remove duplicate columns
          statusColumns = statusColumns.filter((col: StatusColumn) => !removedToKept.has(col.id));

          // Re-number order sequentially
          statusColumns = statusColumns
            .sort((a: StatusColumn, b: StatusColumn) => a.order - b.order)
            .map((col: StatusColumn, idx: number) => ({ ...col, order: idx }));

          // Add awaitingResult: false to all companies
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          companies = companies.map((c: any) => ({
            ...c,
            awaitingResult: c.awaitingResult ?? false,
          }));
        }

        // v10→v11: add showProgressBar to displaySettings
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingDisplay = (state as any).displaySettings ?? DEFAULT_DISPLAY_SETTINGS;
        const displaySettings = {
          ...DEFAULT_DISPLAY_SETTINGS,
          ...existingDisplay,
          showProgressBar: existingDisplay.showProgressBar ?? true,
        };

        // v11→v12: migrate 'final' ActionType → 'interview' with subType='最終面接'
        const migratedScheduledActions = (state.scheduledActions ?? []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any) => {
            if (a.type === 'final') {
              return { ...a, type: 'interview', subType: '最終面接' };
            }
            return a;
          }
        );

        // v12→v13: strip 株式会社/有限会社 from existing company names
        const normalizedCompanies = companies.map((c: Company) => ({
          ...c,
          name: normalizeCompanyName(c.name),
        }));

        // v13→v14: rename ScheduledAction.time → startTime
        const migratedScheduledActionsV14 = migratedScheduledActions.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any) => {
            const { time, ...rest } = a;
            return {
              ...rest,
              startTime: rest.startTime ?? time ?? undefined,
            };
          }
        );

        return {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          companies: normalizedCompanies,
          statusColumns,
          interviews: state.interviews ?? [],
          scheduledActions: migratedScheduledActionsV14,
          displaySettings,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          notificationSettings: (state as any).notificationSettings ?? DEFAULT_NOTIFICATION_SETTINGS,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          gradYear: (state as any).gradYear ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tutorialFlags: (state as any).tutorialFlags ?? DEFAULT_TUTORIAL_FLAGS,
        } as AppState;
      },
    }
  )
);
