/**
 * Type definitions for chat streaming functionality
 */

import { AgentStatus, ResearchProgress, ChatMessage, SessionSummary } from '../../lib/api/types';
import type { AdkEvent } from '@/lib/streaming/adk/types';

export interface ChatStreamState {
  // Session management
  currentSessionId: string | null;
  sessions: Record<string, ChatSession>;

  // Actions
  createSession: () => string;
  createSessionViaBackend: () => Promise<{ success: boolean; sessionId?: string; error?: string }>;
  switchOrCreateSession: (sessionId?: string) => Promise<void>;
  setCurrentSession: (sessionId: string | null) => void;
  hydrateSessions: (sessions: ChatSession[]) => void;
  replaceMessages: (sessionId: string, messages: ChatMessage[]) => void;
  updateSessionMeta: (sessionId: string, updates: Partial<ChatSession>) => void;
  addMessage: (sessionId: string, message: ChatMessage) => void;
  updateMessage: (sessionId: string, messageId: string, updater: (message: ChatMessage) => ChatMessage) => void;
  updateStreamingMessage: (sessionId: string, messageId: string, content: string) => void;
  completeStreamingMessage: (sessionId: string, messageId: string) => void;
  updateAgents: (sessionId: string, agents: AgentStatus[]) => void;
  updateProgress: (sessionId: string, progress: ResearchProgress) => void;
  setSessionStreaming: (sessionId: string, streaming: boolean) => void;
  setSessionError: (sessionId: string, error: string | null) => void;
  clearSession: (sessionId: string) => void;
  clearAllSessions: () => void;
  deleteSession: (sessionId: string) => void;

  // Chat actions for editing and feedback
  setEditingMessage: (sessionId: string, messageId: string | null) => void;
  updateMessageContent: (sessionId: string, messageId: string, newContent: string) => void;
  deleteMessage: (sessionId: string, messageId: string) => void;
  deleteMessageAndSubsequent: (sessionId: string, messageId: string) => void;
  setMessageFeedback: (sessionId: string, messageId: string, feedback: 'upvote' | 'downvote' | null) => void;
  updateFeedback: (sessionId: string, messageId: string, feedback: 'upvote' | 'downvote' | null) => void;
  updateThoughtProcess: (sessionId: string, messageId: string, thoughtProcess: string) => void;

  // Phase 3.2: ADK event storage
  storeAdkEvent: (sessionId: string, event: AdkEvent) => void;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  agents: AgentStatus[];
  progress: ResearchProgress | null;
  isStreaming: boolean;
  error: string | null;
  created_at: string;
  updated_at: string;
  status?: string;
  title?: string | null;
  historyLoaded: boolean;
  user_id?: number | null;
  final_report?: string | null;
  current_phase?: string | null;
  overallProgress?: number | null;
  editingMessageId?: string | null;
  messagesFeedback?: Record<string, 'upvote' | 'downvote' | null>;
  thoughtProcesses?: Record<string, string>;
  regeneratingMessageId?: string | null;

  /** Phase 3.3: Session metadata */
  metadata?: {
    kind?: 'canonical-session' | 'legacy-session';
    backendCreated?: boolean;
    [key: string]: any;
  };

  /** Phase 3.2: Raw ADK events (canonical mode only) - NOT persisted to localStorage */
  rawAdkEvents?: AdkEvent[];

  /** Phase 3.2: Event metadata for debugging */
  eventMetadata?: {
    totalEvents: number;
    lastEventId: string;
    lastInvocationId: string;
    lastAuthor?: string;
  };
}

export interface ChatStreamOptions {
  /** Whether to auto-create a session if none exists */
  autoCreateSession?: boolean;
  /** Maximum number of messages to keep in memory */
  maxMessages?: number;
  /** Whether to persist sessions to localStorage */
  persistSessions?: boolean;
}

export interface ChatStreamReturn {
  // Session state
  currentSession: ChatSession | null;
  sessionId: string | null;
  isStreaming: boolean;
  
  // Messages
  messages: ChatMessage[];
  
  // Agent coordination
  agents: AgentStatus[];
  progress: ResearchProgress | null;
  
  // SSE connection state
  connectionState: string;
  isConnected: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  sendMessage: (content: string) => Promise<void>;
  createNewSession: () => string;
  switchSession: (sessionId: string | null) => void;
  clearCurrentSession: () => void;
  retryLastMessage: () => Promise<void>;
  
  // Connection management
  connect: () => void;
  disconnect: () => void;
  
  // Helpers
  getAllSessions: () => ChatSession[];
  getSessionById: (sessionId: string) => ChatSession | null;
}

export interface SSEEventData {
  type: string;
  payload: Record<string, any>;
  timestamp: string;
}

export interface StableResearchEvent {
  type: string;
  payload: Record<string, any>;
  timestamp: string;
}

export interface StableAgentEvent {
  type: string;
  agents?: AgentStatus[];
  payload?: Record<string, any>;
  timestamp: string;
}

// Utility function
export function summaryToChatSession(summary: SessionSummary): ChatSession {
  return {
    id: summary.id,
    messages: [],
    agents: [],
    progress: null,
    isStreaming: false,
    error: summary.error ?? null,
    created_at: summary.created_at,
    updated_at: summary.updated_at,
    status: summary.status,
    title: summary.title ?? null,
    historyLoaded: false,
    user_id: summary.user_id ?? null,
    final_report: summary.final_report ?? null,
    current_phase: summary.current_phase ?? null,
    overallProgress: summary.progress ?? null,
    editingMessageId: null,
    messagesFeedback: {},
    thoughtProcesses: {},
    regeneratingMessageId: null,
  };
}
