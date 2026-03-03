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
  jobType?: string;
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
  // 拡張メモ（面接メモ・ES・逆質問など自由記述）
  selectionMemo?: string;
  // 次の締切日（統計・ソート用）ISO 8601: "2026-03-15"
  nextDeadline?: string;
  // 優先度タグ
  priority?: CompanyPriority;
}

// ============================
// 優先度タグ
// ============================
export type CompanyPriority = 'S' | '早期' | 'リク面' | '持ち駒' | '結果待ち';

export const PRIORITY_CONFIG: Record<CompanyPriority, { label: string; className: string }> = {
  S: { label: 'Sランク', className: 'bg-red-500/10 text-red-500' },
  早期: { label: '早期選考', className: 'bg-blue-500/10 text-blue-500' },
  リク面: { label: 'リク面あり', className: 'bg-purple-500/10 text-purple-500' },
  持ち駒: { label: '持ち駒', className: 'bg-zinc-500/10 text-zinc-400' },
  結果待ち: { label: '結果待ち', className: 'bg-amber-500/10 text-amber-500' },
};

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
