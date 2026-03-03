import type { StorageData } from './types';
import { createAllDefaultStatuses } from './defaults';

const STORAGE_KEY = 'shukatsu-board-data';
const CURRENT_SCHEMA_VERSION = 1;

export function getDefaultStorageData(): StorageData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    companies: [],
    statusColumns: createAllDefaultStatuses(),
    interviews: [],
    esEntries: [],
    activeTrack: 'intern',
    scheduledActions: [],
  };
}

export function loadFromStorage(): StorageData {
  if (typeof window === 'undefined') {
    return getDefaultStorageData();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaultStorageData();
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isValidStorageData(parsed)) {
      return getDefaultStorageData();
    }

    const data = parsed;
    if (data.schemaVersion < CURRENT_SCHEMA_VERSION) {
      return migrateData(data);
    }

    return data;
  } catch {
    return getDefaultStorageData();
  }
}

export function saveToStorage(data: StorageData): void {
  if (typeof window === 'undefined') return;

  try {
    const json = JSON.stringify({
      ...data,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    });
    localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // localStorage full or unavailable - silently fail
  }
}

function isValidStorageData(data: unknown): data is StorageData {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.schemaVersion === 'number' &&
    Array.isArray(obj.companies) &&
    Array.isArray(obj.statusColumns)
  );
}

function migrateData(data: StorageData): StorageData {
  // Future migrations will be handled here
  // For now, v1 is the only version
  return {
    ...data,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    interviews: data.interviews ?? [],
    esEntries: data.esEntries ?? [],
    activeTrack: data.activeTrack ?? 'intern',
    scheduledActions: data.scheduledActions ?? [],
  };
}
