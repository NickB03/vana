/**
 * ADK Service Layer Types
 * Comprehensive type definitions for the ADK service layer
 */

import type { ADKSSEEvent, UIEvent } from './adk-events';

// Configuration types
export interface ADKConfig {
  apiUrl: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  enableLogging?: boolean;
}

export interface SSEConfig extends ADKConfig {
  reconnectAttempts?: number;
  backoffMultiplier?: number;
  maxBackoffDelay?: number;
}

// Session types
export interface Session {
  id: string;
  userId: string;
  status: SessionStatus;
  metadata: SessionMetadata;
  createdAt: Date;
  lastActivity: Date;
}

export enum SessionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  ERROR = 'error'
}

export interface SessionMetadata {
  clientVersion: string;
  platform: string;
  userAgent?: string;
  [key: string]: any;
}

// Message types
export interface UserMessage {
  content: string;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  messageId?: string;
  timestamp?: number;
  attachments?: FileAttachment[];
  [key: string]: any;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

export interface ADKRequestMessage {
  app_name: string;
  user_id: string;
  session_id: string;
  new_message: {
    role: 'user';
    parts: Array<{ text: string }>;
  };
  streaming: boolean;
  metadata?: Record<string, any>;
}

// Connection types
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

export interface ConnectionInfo {
  state: ConnectionState;
  lastConnected?: Date;
  reconnectAttempts: number;
  error?: Error;
}

// Event types
export enum ADKEventType {
  // Agent Events
  AGENT_THINKING = 'agent:thinking',
  AGENT_ACTION = 'agent:action',
  AGENT_COMPLETE = 'agent:complete',
  
  // Message Events
  MESSAGE_START = 'message:start',
  MESSAGE_CHUNK = 'message:chunk',
  MESSAGE_COMPLETE = 'message:complete',
  
  // Workflow Events
  PLAN_GENERATED = 'workflow:plan_generated',
  PLAN_APPROVED = 'workflow:plan_approved',
  RESEARCH_START = 'workflow:research_start',
  RESEARCH_COMPLETE = 'workflow:research_complete',
  
  // System Events
  SESSION_CREATED = 'system:session_created',
  ERROR = 'system:error',
  CONNECTION_CHANGE = 'system:connection_change'
}

export interface ADKEvent {
  id: string;
  type: ADKEventType;
  timestamp: number;
  sessionId: string;
  data: any;
  metadata?: Record<string, any>;
}

// Error types
export class ADKError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ADKError';
  }
}

export class SessionError extends ADKError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'SESSION_ERROR', context);
    this.name = 'SessionError';
  }
}

export class ConnectionError extends ADKError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONNECTION_ERROR', context);
    this.name = 'ConnectionError';
  }
}

export class MessageError extends ADKError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'MESSAGE_ERROR', context);
    this.name = 'MessageError';
  }
}

// Service interfaces
export interface ISessionService {
  getOrCreateSession(userId: string): Promise<Session>;
  getCurrentSession(): Session | null;
  refreshSession(session: Session): Promise<Session>;
  clearSession(): void;
  validateSession(session: Session): boolean;
}

export interface ISSEService {
  connect(userId: string, sessionId: string): Promise<void>;
  sendMessage(message: ADKRequestMessage): Promise<void>;
  disconnect(): void;
  getConnectionInfo(): ConnectionInfo;
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
}

export interface IMessageTransformer {
  createUserMessage(content: string, session: Session, metadata?: MessageMetadata): ADKRequestMessage;
  transformADKEvent(event: ADKSSEEvent): UIEvent[];
  extractThinkingUpdate(event: ADKSSEEvent): UIEvent | null;
  extractContentUpdate(event: ADKSSEEvent): UIEvent | null;
}

export interface IEventStore {
  addEvent(event: ADKEvent): void;
  getEvents(filter?: EventFilter): ADKEvent[];
  clearEvents(): void;
  subscribe(listener: (event: ADKEvent) => void): () => void;
  getEventHistory(sessionId: string): ADKEvent[];
}

export interface EventFilter {
  type?: ADKEventType;
  sessionId?: string;
  since?: Date;
  limit?: number;
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  multiplier: number;
  retryableErrors: string[];
}

// Event emitter interface
export interface EventEmitter {
  emit(event: string, ...args: any[]): boolean;
  on(event: string, listener: (...args: any[]) => void): this;
  off(event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  removeAllListeners(event?: string): this;
}

// Service factory types
export interface ADKServices {
  client: IADKClient;
  session: ISessionService;
  sse: ISSEService;
  transformer: IMessageTransformer;
  eventStore: IEventStore;
}

export interface IADKClient extends EventEmitter {
  initialize(userId: string): Promise<void>;
  sendMessage(content: string, metadata?: MessageMetadata): Promise<void>;
  disconnect(): void;
  getConnectionInfo(): ConnectionInfo;
  getCurrentSession(): Session | null;
  isConnected(): boolean;
}

// Middleware types
export type EventMiddleware = (event: ADKEvent) => Promise<boolean>;
export type MessageMiddleware = (message: UserMessage) => Promise<UserMessage>;

// Performance monitoring
export interface PerformanceMetrics {
  connectionTime: number;
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  reconnections: number;
  averageResponseTime: number;
}

// Debug interface
export interface DebugInfo {
  connectionState: ConnectionState;
  sessionInfo: Session | null;
  eventCount: number;
  lastError: Error | null;
  performance: PerformanceMetrics;
}