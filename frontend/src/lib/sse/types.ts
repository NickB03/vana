/**
 * SSE Types and Interfaces
 * Comprehensive type definitions for SSE client infrastructure
 */

// Connection states
export enum SSEConnectionState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  CLOSED = 'CLOSED'
}

// SSE Event Types
export enum SSEEventType {
  MESSAGE = 'message',
  STATUS = 'status',
  ERROR = 'error',
  AGENT_UPDATE = 'agent-update',
  SESSION_UPDATE = 'session-update',
  HEARTBEAT = 'heartbeat',
  NOTIFICATION = 'notification',
  PROGRESS = 'progress',
  RESULT = 'result'
}

// Base SSE Event
export interface SSEEvent<T = any> {
  id?: string;
  type: SSEEventType | string;
  data: T;
  timestamp: number;
  retry?: number;
}

// Message Event
export interface MessageEvent extends SSEEvent<MessagePayload> {
  type: SSEEventType.MESSAGE;
}

export interface MessagePayload {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  sessionId: string;
  metadata?: Record<string, any>;
}

// Agent Update Event
export interface AgentUpdateEvent extends SSEEvent<AgentUpdatePayload> {
  type: SSEEventType.AGENT_UPDATE;
}

export interface AgentUpdatePayload {
  agentId: string;
  status: 'idle' | 'thinking' | 'working' | 'complete' | 'error';
  message?: string;
  progress?: number;
  result?: any;
}

// Status Event
export interface StatusEvent extends SSEEvent<StatusPayload> {
  type: SSEEventType.STATUS;
}

export interface StatusPayload {
  code: number;
  message: string;
  details?: Record<string, any>;
}

// Error Event
export interface ErrorEvent extends SSEEvent<ErrorPayload> {
  type: SSEEventType.ERROR;
}

export interface ErrorPayload {
  code: string;
  message: string;
  stack?: string;
  recoverable: boolean;
}

// Progress Event
export interface ProgressEvent extends SSEEvent<ProgressPayload> {
  type: SSEEventType.PROGRESS;
}

export interface ProgressPayload {
  taskId: string;
  current: number;
  total: number;
  message?: string;
}

// SSE Configuration
export interface SSEConfig {
  url: string;
  withCredentials?: boolean;
  headers?: Record<string, string>;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  reconnectBackoff?: number;
  heartbeatInterval?: number;
  timeout?: number;
  pollingFallback?: boolean;
  pollingInterval?: number;
  onOpen?: () => void;
  onMessage?: (event: SSEEvent) => void;
  onError?: (error: SSEError) => void;
  onClose?: () => void;
  onReconnecting?: (attempt: number) => void;
}

// SSE Error Types
export enum SSEErrorType {
  CONNECTION = 'CONNECTION',
  AUTHENTICATION = 'AUTHENTICATION',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  PARSE = 'PARSE',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

export interface SSEError {
  type: SSEErrorType;
  message: string;
  code?: string;
  details?: any;
  recoverable: boolean;
  timestamp: number;
}

// Event Handler Types
export type SSEEventHandler<T = any> = (event: SSEEvent<T>) => void;
export type SSEErrorHandler = (error: SSEError) => void;
export type SSEStateHandler = (state: SSEConnectionState) => void;

// Event Handler Map
export interface SSEEventHandlers {
  [SSEEventType.MESSAGE]?: SSEEventHandler<MessagePayload>;
  [SSEEventType.STATUS]?: SSEEventHandler<StatusPayload>;
  [SSEEventType.ERROR]?: SSEEventHandler<ErrorPayload>;
  [SSEEventType.AGENT_UPDATE]?: SSEEventHandler<AgentUpdatePayload>;
  [SSEEventType.SESSION_UPDATE]?: SSEEventHandler<any>;
  [SSEEventType.HEARTBEAT]?: SSEEventHandler<any>;
  [SSEEventType.NOTIFICATION]?: SSEEventHandler<any>;
  [SSEEventType.PROGRESS]?: SSEEventHandler<ProgressPayload>;
  [SSEEventType.RESULT]?: SSEEventHandler<any>;
  [key: string]: SSEEventHandler<any> | undefined;
}

// Metrics
export interface SSEMetrics {
  connectionAttempts: number;
  successfulConnections: number;
  failedConnections: number;
  messagesReceived: number;
  errorsReceived: number;
  bytesReceived: number;
  lastConnectionTime?: number;
  lastMessageTime?: number;
  averageLatency?: number;
  uptime: number;
}

// Health Status
export interface SSEHealthStatus {
  connected: boolean;
  state: SSEConnectionState;
  lastHeartbeat?: number;
  latency?: number;
  metrics: SSEMetrics;
}