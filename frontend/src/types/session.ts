/**
 * Session types for ADK integration and WebSocket communication
 * Handles research sessions, agent interactions, and timeline tracking
 */

export interface ResearchConfig {
  /** Research topic/question */
  topic: string;
  /** Target depth of research */
  depth: 'shallow' | 'moderate' | 'deep';
  /** Preferred sources */
  sources?: string[];
  /** Maximum time for research (minutes) */
  timeLimit?: number;
  /** Include citations */
  includeCitations: boolean;
  /** Output format */
  format: 'report' | 'summary' | 'outline';
}

export interface AgentMessage {
  /** Unique message ID */
  id: string;
  /** Message content */
  content: string;
  /** Message role */
  role: 'user' | 'assistant' | 'system';
  /** Timestamp */
  timestamp: string;
  /** Agent that generated this message */
  agentId?: string;
  /** Message metadata */
  metadata?: Record<string, unknown>;
  /** Associated timeline events */
  timelineEvents?: TimelineEvent[];
}

export interface TimelineEvent {
  /** Unique event ID */
  id: string;
  /** Event type */
  type: 'planning' | 'research' | 'analysis' | 'composition' | 'review' | 'error' | 'completion';
  /** Event title */
  title: string;
  /** Event description */
  description?: string;
  /** Agent responsible for this event */
  agentId: string;
  /** Agent display name */
  agentName: string;
  /** Event timestamp */
  timestamp: string;
  /** Event status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  /** Progress percentage (0-100) */
  progress?: number;
  /** Event metadata */
  metadata?: Record<string, unknown>;
  /** Duration in milliseconds */
  duration?: number;
}

export interface ResearchSession {
  /** Unique session ID */
  id: string;
  /** User ID who owns this session */
  userId: string;
  /** Session title */
  title: string;
  /** Research configuration */
  config: ResearchConfig;
  /** Current session status */
  status: 'draft' | 'planning' | 'researching' | 'composing' | 'completed' | 'error';
  /** Session messages */
  messages: AgentMessage[];
  /** Timeline events */
  timeline: TimelineEvent[];
  /** Session creation timestamp */
  createdAt: string;
  /** Last updated timestamp */
  updatedAt: string;
  /** Session completion timestamp */
  completedAt?: string;
  /** Final research output */
  output?: string;
  /** Session metadata */
  metadata?: Record<string, unknown>;
}

export interface ConnectionStatus {
  /** WebSocket connection state */
  isConnected: boolean;
  /** Connection attempt count */
  reconnectAttempts: number;
  /** Last connection error */
  lastError?: string;
  /** Connection latency in ms */
  latency?: number;
}

export interface SessionState {
  /** Current active session */
  currentSession: ResearchSession | null;
  /** All user sessions */
  sessions: ResearchSession[];
  /** Session loading state */
  isLoading: boolean;
  /** Session operation in progress */
  isProcessing: boolean;
  /** Connection status */
  connection: ConnectionStatus;
  /** Current error */
  error: string | null;
}

export interface SessionContextValue extends SessionState {
  /** Create new research session */
  createSession: (config: ResearchConfig) => Promise<ResearchSession>;
  /** Load existing session */
  loadSession: (sessionId: string) => Promise<void>;
  /** Update session configuration */
  updateSession: (sessionId: string, updates: Partial<ResearchSession>) => Promise<void>;
  /** Delete session */
  deleteSession: (sessionId: string) => Promise<void>;
  /** Send message to current session */
  sendMessage: (content: string) => Promise<void>;
  /** Start research process */
  startResearch: () => Promise<void>;
  /** Stop/pause research */
  stopResearch: () => Promise<void>;
  /** Clear current error */
  clearError: () => void;
  /** Refresh sessions list */
  refreshSessions: () => Promise<void>;
  /** Clear current session */
  clearCurrentSession: () => void;
}

export type SessionAction =
  | { type: 'SESSION_LOADING_START' }
  | { type: 'SESSION_LOADING_END' }
  | { type: 'SESSION_PROCESSING_START' }
  | { type: 'SESSION_PROCESSING_END' }
  | { type: 'SESSION_CREATE_SUCCESS'; payload: { session: ResearchSession } }
  | { type: 'SESSION_LOAD_SUCCESS'; payload: { session: ResearchSession } }
  | { type: 'SESSION_UPDATE_SUCCESS'; payload: { session: ResearchSession } }
  | { type: 'SESSION_DELETE_SUCCESS'; payload: { sessionId: string } }
  | { type: 'SESSION_MESSAGE_ADD'; payload: { message: AgentMessage } }
  | { type: 'SESSION_TIMELINE_UPDATE'; payload: { event: TimelineEvent } }
  | { type: 'SESSION_STATUS_UPDATE'; payload: { sessionId: string; status: ResearchSession['status'] } }
  | { type: 'SESSIONS_LOAD_SUCCESS'; payload: { sessions: ResearchSession[] } }
  | { type: 'SESSION_ERROR'; payload: { error: string } }
  | { type: 'SESSION_ERROR_CLEAR' }
  | { type: 'SESSION_CLEAR_CURRENT' }
  | { type: 'CONNECTION_STATUS_UPDATE'; payload: { connection: ConnectionStatus } };

/**
 * ADK Agent types and configurations
 */
export interface AgentConfig {
  /** Agent identifier */
  id: string;
  /** Agent display name */
  name: string;
  /** Agent description */
  description: string;
  /** Agent capabilities */
  capabilities: string[];
  /** Agent status */
  status: 'active' | 'idle' | 'busy' | 'error';
}

/**
 * WebSocket message types for ADK communication
 */
export interface WebSocketMessage {
  /** Message type */
  type: 'session_update' | 'message' | 'timeline_event' | 'status_change' | 'error';
  /** Message payload */
  payload: unknown;
  /** Session ID */
  sessionId?: string;
  /** Timestamp */
  timestamp: string;
}

/**
 * Research phase definitions matching ADK workflow
 */
export const RESEARCH_PHASES = {
  PLANNING: 'planning',
  RESEARCHING: 'researching',
  ANALYZING: 'analyzing',
  COMPOSING: 'composing',
  REVIEWING: 'reviewing',
} as const;

export type ResearchPhase = (typeof RESEARCH_PHASES)[keyof typeof RESEARCH_PHASES];

/**
 * Timeline event types for better categorization
 */
export const TIMELINE_EVENT_TYPES = {
  PLANNING: 'planning',
  RESEARCH: 'research',
  ANALYSIS: 'analysis',
  COMPOSITION: 'composition',
  REVIEW: 'review',
  ERROR: 'error',
  COMPLETION: 'completion',
} as const;

export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[keyof typeof TIMELINE_EVENT_TYPES];