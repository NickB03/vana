// Research types for build optimization
export interface Agent {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  name: string;
  type: string;
  progress?: number;
}

export interface SessionState {
  agents?: Agent[];
  overallProgress?: number;
  currentPhase?: string;
  sessionId?: string;
  status?: string;
}

export interface ResearchMetadata {
  totalAgents: number;
  completedAgents: number;
  overallProgress: number;
  currentPhase: string;
}

export interface ExportOptions {
  format: 'markdown' | 'pdf' | 'json';
  includeMetadata: boolean;
  includeProgress: boolean;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ConnectionState {
  isConnected: boolean;
  lastPing?: Date;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

// Network API types
export interface NetworkConnection {
  connection?: {
    effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
    type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
    downlink: number;
    rtt: number;
    saveData: boolean;
  };
  mozConnection?: NetworkConnection['connection'];
  webkitConnection?: NetworkConnection['connection'];
}

export interface NetworkNavigator extends Navigator {
  connection?: NetworkConnection['connection'];
  mozConnection?: NetworkConnection['connection'];
  webkitConnection?: NetworkConnection['connection'];
}