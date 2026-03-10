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
  // タグ（複数選択可）
  tags?: Tag[];
  // 選考タイプ（進捗バー表示用）
  selectionType?: SelectionType;
  // カスタム選考ステップ（未設定の場合はデフォルトを使用）
  customMilestones?: string[];
  awaitingResult?: boolean;
  // 企業ごとカスタム選考フロー（undefinedならデフォルト9段階を使用）
  selectionFlow?: string[];
}

// ============================
// 選考タイプ
// ============================
export type SelectionType = 'intern' | 'main';

export const SELECTION_TYPE_LABELS: Record<SelectionType, string> = {
  intern: 'インターン選考',
  main: '本選考',
};

// ============================
// タグ（複数選択可）
// ============================
export type Tag = '優遇あり' | '早期選考' | 'リクルーター面談' | '結果待ち' | 'インターン参加済み';

export const TAG_CONFIG: Record<Tag, { label: string; className: string }> = {
  '優遇あり':         { label: '優遇あり',  className: 'bg-red-500/10 text-red-500' },
  '早期選考':         { label: '早期選考',  className: 'bg-blue-500/10 text-blue-500' },
  'リクルーター面談': { label: 'リク面',    className: 'bg-purple-500/10 text-purple-500' },
  '結果待ち':         { label: '結果待ち',  className: 'bg-amber-500/10 text-amber-500' },
  'インターン参加済み': { label: 'インターン済', className: 'bg-green-500/10 text-green-500' },
};

// ============================
// 面接（Phase 2）
// ============================
export const INTERVIEW_TYPES = [
  '一次面接', '二次面接', '三次面接', '最終面接',
  'インターン面接', 'OB面談', 'リクルーター面談', 'グループ面接', 'その他',
] as const;
export type InterviewType = typeof INTERVIEW_TYPES[number];

export const INTERVIEW_LOCATIONS = ['オンライン', '本社', '支社', '別会場'] as const;
export type InterviewLocation = typeof INTERVIEW_LOCATIONS[number];

export interface Interview {
  id: string;
  companyId: string;
  datetime: string;
  endTime?: string; // "HH:mm"
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
export type ActionType = 'es' | 'webtest' | 'gd' | 'interview' | 'other';

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  es: 'ES提出',
  webtest: 'Webテスト',
  gd: 'GD',
  interview: '面接',
  other: 'その他',
};

export const ACTION_TYPE_COLORS: Record<ActionType, string> = {
  es: '#8B5CF6',
  webtest: '#3B82F6',
  gd: '#EC4899',
  interview: '#F97316',
  other: '#8E8E93',
};

export interface ScheduledAction {
  id: string;
  companyId: string;
  type: ActionType;
  subType?: string; // 面接時: '1次面接'|'2次面接'|'3次面接'|'最終面接'
  date: string; // "2026-03-15"
  time?: string; // "HH:mm"
  note?: string;
}

// ============================
// 締切情報（fetch方式 / public/deadlines-{gradYear}.csv）
// ============================
export interface DeadlineEntry {
  company_name: string;
  type: string;
  deadline: string; // YYYY-MM-DD
  label: string;
  job_type: string;
  industry: string;
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
