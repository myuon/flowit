import type { Language } from "@flowit/shared";

export interface Translations {
  // Common
  appName: string;
  loading: string;
  saving: string;
  save: string;
  load: string;
  cancel: string;
  error: string;
  all: string;
  success: string;
  output: string;

  // Auth
  login: string;
  logout: string;
  loginWithGoogle: string;
  accessDenied: string;
  noPermission: string;
  goHome: string;

  // Editor
  new: string;
  execute: string;
  clear: string;
  executionLogs: string;
  noLogs: string;
  runWorkflow: string;
  running: string;

  // Node Palette
  nodePalette: string;
  addNode: string;
  nodes: string;
  searchNodes: string;

  // Params Panel
  parameters: string;
  selectNode: string;
  nodeId: string;
  nodeType: string;
  properties: string;
  selectOption: string;
  enabled: string;
  noParameters: string;

  // Templates
  selectTemplate: string;
  startBlank: string;
  orStartBlank: string;
  createNewWorkflow: string;
  templateDescription: string;
  blankWorkflow: string;
  startFromScratch: string;
  skipAndStartBlank: string;

  // Admin
  admin: string;
  adminDashboard: string;
  backToEditor: string;
  currentUser: string;
  settings: string;
  language: string;
  userId: string;
  email: string;
  name: string;

  // Workflow Status
  draft: string;
  published: string;
  publish: string;
  version: string;
  untitledWorkflow: string;

  // Webhook
  webhookUrl: string;
  copyUrl: string;
  webhookNote: string;
  saveWorkflowFirst: string;

  // Workflow List
  workflows: string;
  newWorkflow: string;
  noWorkflows: string;
  createFirstWorkflow: string;
  lastUpdated: string;
  delete: string;
  confirmDelete: string;

  // Log Viewer
  refresh: string;
  clearAllLogs: string;
  confirmClearLogs: string;
  executionLogsHistory: string;
  noExecutionLogs: string;
  noExecutionLogsDescription: string;
  executionId: string;
  logs: string;

  // View Toggle
  editor: string;
}

const en: Translations = {
  // Common
  appName: "Flowit",
  loading: "Loading...",
  saving: "Saving...",
  save: "Save",
  load: "Load",
  cancel: "Cancel",
  error: "Error",
  all: "All",
  success: "Success",
  output: "Output:",

  // Auth
  login: "Login",
  logout: "Logout",
  loginWithGoogle: "Login with Google",
  accessDenied: "Access Denied",
  noPermission: "You do not have permission to access this page.",
  goHome: "Go Home",

  // Editor
  new: "New",
  execute: "Execute",
  clear: "Clear",
  executionLogs: "Execution Logs",
  noLogs: "No logs yet. Execute a workflow to see results.",
  runWorkflow: "Click Execute to run the workflow...",
  running: "Running...",

  // Node Palette
  nodePalette: "Node Palette",
  addNode: "Add Node",
  nodes: "Nodes",
  searchNodes: "Search nodes...",

  // Params Panel
  parameters: "Parameters",
  selectNode: "Select a node to edit",
  nodeId: "Node ID",
  nodeType: "Type",
  properties: "Properties",
  selectOption: "Select...",
  enabled: "Enabled",
  noParameters: "This node has no configurable parameters.",

  // Templates
  selectTemplate: "Select a Template",
  startBlank: "Start Blank",
  orStartBlank: "Or start with a blank canvas",
  createNewWorkflow: "Create New Workflow",
  templateDescription: "Start from a template or create a blank workflow",
  blankWorkflow: "Blank Workflow",
  startFromScratch: "Start from scratch",
  skipAndStartBlank: "Skip and start blank",

  // Admin
  admin: "Admin",
  adminDashboard: "Admin Dashboard",
  backToEditor: "Back to Editor",
  currentUser: "Current User",
  settings: "Settings",
  language: "Language",
  userId: "ID",
  email: "Email",
  name: "Name",

  // Workflow Status
  draft: "Draft",
  published: "Published",
  publish: "Publish",
  version: "v",
  untitledWorkflow: "Untitled Workflow",

  // Webhook
  webhookUrl: "Webhook URL",
  copyUrl: "Copy URL",
  webhookNote: "Publish the workflow to enable webhook triggers",
  saveWorkflowFirst: "Save the workflow to get a webhook URL",

  // Workflow List
  workflows: "Workflows",
  newWorkflow: "New Workflow",
  noWorkflows: "No workflows yet",
  createFirstWorkflow: "Create your first workflow",
  lastUpdated: "Last updated",
  delete: "Delete",
  confirmDelete: "Are you sure you want to delete \"{name}\"?",

  // Log Viewer
  refresh: "Refresh",
  clearAllLogs: "Clear All Logs",
  confirmClearLogs: "Are you sure you want to clear all execution logs?",
  executionLogsHistory: "Execution Logs History",
  noExecutionLogs: "No execution logs yet",
  noExecutionLogsDescription: "Execute a workflow with log nodes to see logs here.",
  executionId: "Execution",
  logs: "logs",

  // View Toggle
  editor: "Editor",
};

const ja: Translations = {
  // Common
  appName: "Flowit",
  loading: "読み込み中...",
  saving: "保存中...",
  save: "保存",
  load: "読み込み",
  cancel: "キャンセル",
  error: "エラー",
  all: "すべて",
  success: "成功",
  output: "出力:",

  // Auth
  login: "ログイン",
  logout: "ログアウト",
  loginWithGoogle: "Googleでログイン",
  accessDenied: "アクセス拒否",
  noPermission: "このページにアクセスする権限がありません。",
  goHome: "ホームへ戻る",

  // Editor
  new: "新規",
  execute: "実行",
  clear: "クリア",
  executionLogs: "実行ログ",
  noLogs: "ログはまだありません。ワークフローを実行すると結果が表示されます。",
  runWorkflow: "実行ボタンをクリックしてワークフローを実行...",
  running: "実行中...",

  // Node Palette
  nodePalette: "ノードパレット",
  addNode: "ノードを追加",
  nodes: "ノード",
  searchNodes: "ノードを検索...",

  // Params Panel
  parameters: "パラメータ",
  selectNode: "ノードを選択して編集",
  nodeId: "ノードID",
  nodeType: "タイプ",
  properties: "プロパティ",
  selectOption: "選択...",
  enabled: "有効",
  noParameters: "このノードには設定可能なパラメータがありません。",

  // Templates
  selectTemplate: "テンプレートを選択",
  startBlank: "空白で開始",
  orStartBlank: "または空白のキャンバスで開始",
  createNewWorkflow: "新規ワークフロー作成",
  templateDescription: "テンプレートから開始するか、空白のワークフローを作成",
  blankWorkflow: "空白のワークフロー",
  startFromScratch: "ゼロから開始",
  skipAndStartBlank: "スキップして空白で開始",

  // Admin
  admin: "管理者",
  adminDashboard: "管理ダッシュボード",
  backToEditor: "エディタへ戻る",
  currentUser: "現在のユーザー",
  settings: "設定",
  language: "言語",
  userId: "ID",
  email: "メール",
  name: "名前",

  // Workflow Status
  draft: "下書き",
  published: "公開済み",
  publish: "公開",
  version: "v",
  untitledWorkflow: "無題のワークフロー",

  // Webhook
  webhookUrl: "Webhook URL",
  copyUrl: "URLをコピー",
  webhookNote: "Webhookを有効にするにはワークフローを公開してください",
  saveWorkflowFirst: "Webhook URLを取得するにはワークフローを保存してください",

  // Workflow List
  workflows: "ワークフロー",
  newWorkflow: "新規ワークフロー",
  noWorkflows: "ワークフローがありません",
  createFirstWorkflow: "最初のワークフローを作成",
  lastUpdated: "最終更新",
  delete: "削除",
  confirmDelete: "「{name}」を削除してもよろしいですか？",

  // Log Viewer
  refresh: "更新",
  clearAllLogs: "すべてのログを削除",
  confirmClearLogs: "すべての実行ログを削除してもよろしいですか？",
  executionLogsHistory: "実行ログ履歴",
  noExecutionLogs: "実行ログがありません",
  noExecutionLogsDescription: "ログノードを含むワークフローを実行すると、ここにログが表示されます。",
  executionId: "実行",
  logs: "件",

  // View Toggle
  editor: "エディタ",
};

export const translations: Record<Language, Translations> = {
  en,
  ja,
};

export function getTranslations(language: Language): Translations {
  return translations[language] || translations.en;
}
