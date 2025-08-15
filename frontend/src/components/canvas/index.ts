export { CanvasSystem } from './canvas-system';
export { CanvasModes } from './canvas-modes';
export { MonacoEditor } from './monaco-editor';
export { ExportSystem } from './export-system';
export { CollaborativeEditor } from './collaborative-editor';
export { AgentCursors } from './agent-cursors';
export { AgentSuggestions } from './agent-suggestions';

// Re-export types
export type {
  CanvasMode,
  CanvasContent,
  CanvasState,
  ExportOptions,
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