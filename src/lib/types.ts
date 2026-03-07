// ============================
// ステータスカラム（カンバンの列）
// ============================
export interface StatusColumn {
  id: string;
  name: string;
  order: number;
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
  // 直近の予定アクション（ソート・カルーセル用）
  nextActionDate?: string;
  nextActionType?: ActionType;
  nextActionTime?: string;
  // 優先度タグ
  priority?: CompanyPriority;
  // 選考タイプ（進捗バー表示用）
  selectionType?: SelectionType;
  // カスタム選考ステップ（未設定の場合はデフォルトを使用）
  customMilestones?: string[];
}

// ============================
// 選考タイプ
// ============================
export type SelectionType = 'intern' | 'main' | 'intern_to_main';

export const SELECTION_TYPE_LABELS: Record<SelectionType, string> = {
  intern: 'インターン選考',
  main: '本選考',
  intern_to_main: '本選考（インターン内包）',
};

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
  scheduledActions: ScheduledAction[];
}

// ============================
// 予定アクション（締切・面接など）
// ============================
export type ActionType = 'es' | 'webtest' | 'interview' | 'final' | 'other';

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  es: 'ES提出',
  webtest: 'Webテスト',
  interview: '面接',
  final: '最終面接',
  other: 'その他',
};

export const ACTION_TYPE_COLORS: Record<ActionType, string> = {
  es: '#007AFF',
  webtest: '#9B59B6',
  interview: '#FF9500',
  final: '#FF3B30',
  other: '#8E8E93',
};

export interface ScheduledAction {
  id: string;
  companyId: string;
  type: ActionType;
  date: string; // "2026-03-15"
  time?: string; // "HH:mm"
  note?: string;
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
  scheduledActions: ScheduledAction[];
}
