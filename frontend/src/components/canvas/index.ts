export { CanvasContainer } from './canvas-container';
export { CanvasToolbar } from './canvas-toolbar';
export { CanvasEditor } from './canvas-editor';
export { CanvasPreview } from './canvas-preview';
export { CanvasVersionHistory } from './canvas-version-history';
export { CanvasExportDialog } from './canvas-export-dialog';

// Legacy exports (keep for compatibility)
export { CanvasSystem } from './canvas-system';
export { CanvasModes } from './canvas-modes';
export { MonacoEditor } from './monaco-editor';
export { ExportSystem } from './export-system';
export { CollaborativeEditor } from './collaborative-editor';
export { AgentCursors } from './agent-cursors';
export { AgentSuggestions } from './agent-suggestions';

// Re-export types from our new system
export type {
  CanvasMode,
  CodeLanguage,
  CanvasVersion,
  CanvasState,
  ExportOptions,
  KeyboardShortcut,
} from './types';

// Legacy types (keep for compatibility)
export type {
  CanvasContent,
  FileUpload,
  MonacoEditorOptions,
  AgentInfo,
  AgentCursor,
  AgentSuggestion,
  AgentActivity,
  CollaborativeSession,
  AgentWorkspace,
  AgentToolMode
} from '@/types/canvas';