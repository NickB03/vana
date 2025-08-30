export type CanvasMode = 'markdown' | 'code' | 'web' | 'sandbox';

export type CodeLanguage = 
  | 'javascript' 
  | 'typescript' 
  | 'python' 
  | 'html' 
  | 'css' 
  | 'json' 
  | 'sql' 
  | 'yaml' 
  | 'markdown';

export interface CanvasVersion {
  id: string;
  timestamp: Date;
  content: string;
  mode: CanvasMode;
  language?: CodeLanguage;
  title: string;
}

export interface CanvasState {
  content: string;
  mode: CanvasMode;
  language: CodeLanguage;
  versions: CanvasVersion[];
  currentVersionId?: string;
  isPreviewEnabled: boolean;
  isVersionHistoryOpen: boolean;
}

export interface ExportOptions {
  format: 'txt' | 'md' | 'html' | 'pdf';
  includeMetadata: boolean;
  filename: string;
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
}