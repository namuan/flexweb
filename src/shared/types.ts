export type ModificationType = 'css' | 'javascript' | 'hybrid';

export interface SafetyFinding {
  severity: 'info' | 'warning' | 'blocker';
  category: string;
  message: string;
}

export interface Modification {
  id: string;
  name: string;
  description: string;
  matchPatterns: string[];
  type: ModificationType;
  sourcePrompt: string;
  css?: string;
  javascript?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  permissionsRequired: string[];
  safetyStatus: 'generated' | 'template' | 'user-reviewed';
  safetyFindings?: SafetyFinding[];
  rollbackNotes?: string;
  lastRun?: { at: string; status: 'applied' | 'error'; message?: string };
}

export interface LibraryItem {
  id: string;
  title: string;
  category: string;
  description: string;
  supportedSites: string[];
  modificationTemplate: Pick<Modification, 'name' | 'description' | 'type' | 'css' | 'javascript'>;
  author: string;
  trustLevel: 'built-in';
}

export interface ProviderSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  privacyMode: 'strict' | 'page-context';
}

export interface PageContext {
  url: string;
  title: string;
  selectedText: string;
  headings: string[];
  visibleTextSample: string;
  elementSummary: Array<{ selector: string; role: string; text: string }>;
  targetElement?: SelectedElement;
}

export interface SelectedElement {
  selector: string;
  tagName: string;
  role: string;
  text: string;
  attributes: Record<string, string>;
  path: string[];
}

export interface GenerateRequest {
  prompt: string;
  pageContext: PageContext;
}

export interface GeneratedModification {
  name: string;
  description: string;
  matchPatterns: string[];
  type: ModificationType;
  css?: string;
  javascript?: string;
  explanation: string;
  implementationPlan?: string[];
  refinedPrompt?: string;
  rollbackNotes?: string;
  safetyFindings?: SafetyFinding[];
  riskLevel: 'low' | 'medium' | 'high';
}

export type RuntimeMessage =
  | { type: 'GET_PAGE_CONTEXT' }
  | { type: 'START_ELEMENT_PICKER' }
  | { type: 'HIGHLIGHT_SELECTED_ELEMENT'; selector: string }
  | { type: 'CLEAR_ELEMENT_HIGHLIGHT' }
  | { type: 'APPLY_MODIFICATIONS'; modifications: Modification[] }
  | { type: 'GET_STATE' }
  | { type: 'SAVE_SETTINGS'; settings: ProviderSettings }
  | { type: 'GENERATE_MODIFICATION'; request: GenerateRequest }
  | { type: 'SAVE_MODIFICATION'; modification: Modification }
  | { type: 'DELETE_MODIFICATION'; id: string }
  | { type: 'TOGGLE_MODIFICATION'; id: string; enabled: boolean }
  | { type: 'DISABLE_ALL_MODIFICATIONS' }
  | { type: 'REPORT_MODIFICATION_RUN'; id: string; status: 'applied' | 'error'; message?: string }
  | { type: 'INSTALL_LIBRARY_ITEM'; itemId: string; matchPattern: string }
  | { type: 'PAGE_READY'; url: string }
  | { type: 'ROUTE_CHANGED'; url: string };

export interface AppState {
  modifications: Modification[];
  settings: ProviderSettings;
}
