export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    model?: string;
    tool_calls?: unknown[];
    error?: string;
    streaming?: boolean;
    attachments?: string[];
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: number;
  updated_at: number;
  model?: string;
  tools?: string[];
}

export interface SessionState {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  isLoading: boolean;
  error: string | null;
}

// SSE Event Types for ADK Backend Integration
export interface SSEAgentEvent {
  type: 'agent_network_update' | 'agent_network_snapshot' | 'connection' | 'agent_start' | 'agent_complete' | 'error' | 'heartbeat';
  data: unknown;
  id?: string;
  timestamp: string;
  sessionId?: string;
}

export interface AgentNetworkUpdate {
  agents: AgentInfo[];
  active_count: number;
  total_messages: number;
  session_id: string;
  timestamp: string;
  network_state: 'initializing' | 'active' | 'idle' | 'error';
}

export interface AgentInfo {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'idle' | 'error' | 'completed';
  last_activity?: string;
  message_count: number;
  capabilities?: string[];
}

export interface ConnectionEvent {
  status: 'connected' | 'disconnected' | 'error';
  session_id: string;
  timestamp: string;
  connection_type?: 'sse' | 'polling';
  retry_count?: number;
  error_message?: string;
}

export interface AgentTaskEvent {
  agent_id: string;
  agent_name: string;
  task: string;
  status: 'started' | 'completed' | 'failed';
  session_id: string;
  timestamp: string;
  result?: unknown;
  error?: string;
}

export interface KeepAliveEvent {
  timestamp: string;
  connection_type: 'sse' | 'polling';
  active_sessions: number;
}