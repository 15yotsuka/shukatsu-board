// ============================
// 選考トラック種別
// ============================
export type TrackType = 'intern' | 'main';

// ============================
// ステータスカラム（カンバンの列）
// ============================
export interface StatusColumn {
  id: string;
  name: string;
  order: number;
  trackType: TrackType;
}

// ============================
// 企業
// ============================
export interface Company {
  id: string;
  name: string;
  industry?: string;
  url?: string;
  statusId: string;
  trackType: TrackType;
  orderInColumn: number;
  createdAt: string;
  updatedAt: string;
  interviews?: Interview[];
  esEntries?: ESEntry[];
  noteUrl?: string;
  memo?: string;
  myPageUrl?: string;
  myPageId?: string;
  myPagePassword?: string;
}

// ============================
// 面接（Phase 2）
// ============================
export interface Interview {
  id: string;
  companyId: string;
  datetime: string;
  type: string;
  location?: string;
  memo?: string;
  createdAt: string;
}

// ============================
// ES（Phase 3）
// ============================
export interface ESEntry {
  id: string;
  companyId: string;
  question: string;
  answer: string;
  charLimit?: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// ============================
// アプリ全体のストア
// ============================
export interface AppState {
  schemaVersion: number;
  companies: Company[];
  statusColumns: StatusColumn[];
  interviews: Interview[];
  esEntries: ESEntry[];
  activeTrack: TrackType;
}

// ============================
// ストレージデータ
// ============================
export interface StorageData {
  schemaVersion: number;
  companies: Company[];
  statusColumns: StatusColumn[];
  interviews: Interview[];
  esEntries: ESEntry[];
  activeTrack: TrackType;
}
