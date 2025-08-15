export type CanvasMode = 'markdown' | 'code' | 'web' | 'sandbox';

export interface CanvasContent {
  id: string;
  mode: CanvasMode;
  title: string;
  content: string;
  language?: string; // For code mode
  lastModified: Date;
  metadata?: Record<string, unknown>;
}

export interface ExportOptions {
  format: 'copy' | 'download' | 'pdf' | 'share';
  filename?: string;
  includeMetadata?: boolean;
}

export interface FileUpload {
  file: File;
  content: string;
  autoDetectedMode?: CanvasMode;
}

export interface CanvasState {
  currentMode: CanvasMode;
  content: CanvasContent;
  isEditing: boolean;
  isDirty: boolean;
  lastSaved?: Date;
  collaborativeSession?: CollaborativeSession;
}

export interface MonacoEditorOptions {
  language: string;
  theme: 'vs-dark' | 'light';
  readOnly: boolean;
  minimap: boolean;
  wordWrap: boolean;
}

// Multi-Agent Collaboration Types
export interface AgentInfo {
  id: string;
  name: string;
  type: 'coder' | 'reviewer' | 'researcher' | 'architect' | 'tester' | 'coordinator';
  color: string;
  avatar?: string;
  capabilities: string[];
  status: 'active' | 'idle' | 'working' | 'offline';
  lastActivity: Date;
}

export interface AgentCursor {
  agentId: string;
  position: {
    lineNumber: number;
    column: number;
  };
  selection?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  timestamp: Date;
}

export interface AgentSuggestion {
  id: string;
  agentId: string;
  type: 'edit' | 'comment' | 'review' | 'optimization' | 'bug-fix';
  position: {
    lineNumber: number;
    column: number;
  };
  range?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  title: string;
  description: string;
  originalText?: string;
  suggestedText?: string;
  confidence: number; // 0-1
  status: 'pending' | 'accepted' | 'rejected' | 'implemented';
  timestamp: Date;
}

export interface AgentActivity {
  id: string;
  agentId: string;
  type: 'edit' | 'cursor-move' | 'selection' | 'suggestion' | 'review' | 'comment';
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface CollaborativeSession {
  id: string;
  canvasId: string;
  agents: AgentInfo[];
  cursors: Record<string, AgentCursor>; // agentId -> cursor
  suggestions: AgentSuggestion[];
  activities: AgentActivity[];
  createdAt: Date;
  lastActivity: Date;
}

export interface AgentWorkspace {
  agentId: string;
  activeFiles: string[];
  currentTask?: string;
  workingDirectory: string;
  recentChanges: Array<{
    file: string;
    change: string;
    timestamp: Date;
  }>;
  suggestions: AgentSuggestion[];
}

export interface AgentToolMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  agentTypes: AgentInfo['type'][];
  capabilities: string[];
}