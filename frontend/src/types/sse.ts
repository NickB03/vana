/**
 * Server-Sent Events (SSE) types for real-time communication
 * Handles ADK event streaming and real-time updates
 */

export interface SSEEvent {
  /** Event ID */
  id?: string;
  /** Event type */
  event: string;
  /** Event data */
  data: unknown;
  /** Event timestamp */
  timestamp: string;
  /** Retry timeout for reconnection */
  retry?: number;
}

export interface SSEConnectionStatus {
  /** Connection state */
  readyState: 'CONNECTING' | 'OPEN' | 'CLOSED';
  /** Last connection error */
  lastError?: string;
  /** Reconnection attempts count */
  reconnectAttempts: number;
  /** Connection URL */
  url: string;
  /** Whether auto-reconnect is enabled */
  autoReconnect: boolean;
  /** Connection established timestamp */
  connectedAt?: string;
  /** Last event received timestamp */
  lastEventAt?: string;
  /** Events received count */
  eventsReceived: number;
}

export interface SSEConfiguration {
  /** SSE endpoint URL */
  url: string;
  /** Whether to auto-reconnect on connection loss */
  autoReconnect: boolean;
  /** Maximum reconnection attempts */
  maxReconnectAttempts: number;
  /** Reconnection delay (ms) */
  reconnectDelay: number;
  /** Connection timeout (ms) */
  timeout: number;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Whether to include credentials */
  withCredentials: boolean;
}

export interface SSEState {
  /** Connection status */
  connection: SSEConnectionStatus;
  /** SSE configuration */
  config: SSEConfiguration;
  /** Event handlers by event type */
  eventHandlers: Map<string, Set<(event: SSEEvent) => void>>;
  /** Recent events buffer */
  recentEvents: SSEEvent[];
  /** Maximum events to keep in buffer */
  maxBufferSize: number;
  /** Whether SSE is enabled */
  enabled: boolean;
}

export interface SSEContextValue extends SSEState {
  /** Connect to SSE endpoint */
  connect: () => void;
  /** Disconnect from SSE endpoint */
  disconnect: () => void;
  /** Reconnect to SSE endpoint */
  reconnect: () => void;
  /** Subscribe to specific event type */
  subscribe: (eventType: string, handler: (event: SSEEvent) => void) => () => void;
  /** Unsubscribe from specific event type */
  unsubscribe: (eventType: string, handler: (event: SSEEvent) => void) => void;
  /** Update SSE configuration */
  updateConfig: (config: Partial<SSEConfiguration>) => void;
  /** Enable/disable SSE */
  setEnabled: (enabled: boolean) => void;
  /** Clear recent events buffer */
  clearEvents: () => void;
  /** Get events by type */
  getEventsByType: (eventType: string) => SSEEvent[];
}

export type SSEAction =
  | { type: 'SSE_CONNECTING'; payload: { url: string } }
  | { type: 'SSE_CONNECTED'; payload: { timestamp: string } }
  | { type: 'SSE_DISCONNECTED'; payload: { error?: string } }
  | { type: 'SSE_ERROR'; payload: { error: string } }
  | { type: 'SSE_EVENT_RECEIVED'; payload: { event: SSEEvent } }
  | { type: 'SSE_RECONNECT_ATTEMPT'; payload: { attempt: number } }
  | { type: 'SSE_CONFIG_UPDATE'; payload: { config: Partial<SSEConfiguration> } }
  | { type: 'SSE_ENABLED_SET'; payload: { enabled: boolean } }
  | { type: 'SSE_EVENTS_CLEAR' }
  | { type: 'SSE_HANDLER_ADD'; payload: { eventType: string; handler: (event: SSEEvent) => void } }
  | { type: 'SSE_HANDLER_REMOVE'; payload: { eventType: string; handler: (event: SSEEvent) => void } };

/**
 * ADK-specific event types
 */
export const ADK_SSE_EVENTS = {
  // Agent lifecycle events
  AGENT_STARTED: 'agent.started',
  AGENT_STOPPED: 'agent.stopped',
  AGENT_ERROR: 'agent.error',
  
  // Research workflow events
  RESEARCH_PLAN_CREATED: 'research.plan.created',
  RESEARCH_PLAN_UPDATED: 'research.plan.updated',
  RESEARCH_STARTED: 'research.started',
  RESEARCH_PROGRESS: 'research.progress',
  RESEARCH_COMPLETED: 'research.completed',
  RESEARCH_ERROR: 'research.error',
  
  // Search and analysis events
  SEARCH_STARTED: 'search.started',
  SEARCH_RESULTS: 'search.results',
  SEARCH_COMPLETED: 'search.completed',
  ANALYSIS_STARTED: 'analysis.started',
  ANALYSIS_COMPLETED: 'analysis.completed',
  
  // Composition events
  COMPOSITION_STARTED: 'composition.started',
  COMPOSITION_PROGRESS: 'composition.progress',
  COMPOSITION_COMPLETED: 'composition.completed',
  
  // Agent messages
  AGENT_MESSAGE: 'agent.message',
  AGENT_THINKING: 'agent.thinking',
  AGENT_REASONING: 'agent.reasoning',
  
  // Timeline events
  TIMELINE_EVENT: 'timeline.event',
  TIMELINE_UPDATE: 'timeline.update',
  
  // System events
  SYSTEM_STATUS: 'system.status',
  SYSTEM_ERROR: 'system.error',
  HEARTBEAT: 'heartbeat',
} as const;

export type ADKSSEEventType = (typeof ADK_SSE_EVENTS)[keyof typeof ADK_SSE_EVENTS];

/**
 * Event payload types for specific ADK events
 */
export interface AgentStartedEvent {
  agentId: string;
  agentName: string;
  sessionId: string;
  timestamp: string;
}

export interface ResearchProgressEvent {
  sessionId: string;
  phase: 'planning' | 'researching' | 'analyzing' | 'composing';
  progress: number; // 0-100
  currentTask: string;
  estimatedTimeRemaining?: number;
  timestamp: string;
}

export interface AgentMessageEvent {
  sessionId: string;
  agentId: string;
  agentName: string;
  message: {
    id: string;
    content: string;
    role: 'assistant' | 'system';
    timestamp: string;
  };
}

export interface TimelineEventPayload {
  sessionId: string;
  event: {
    id: string;
    type: string;
    title: string;
    description?: string;
    agentId: string;
    agentName: string;
    timestamp: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    progress?: number;
  };
}

/**
 * Default SSE configuration
 */
export const DEFAULT_SSE_CONFIG: SSEConfiguration = {
  url: '',
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  timeout: 30000,
  withCredentials: true,
};

/**
 * Utility functions for SSE events
 */
export function parseSSEEvent(eventString: string): SSEEvent | null {
  try {
    const lines = eventString.trim().split('\n');
    const event: Partial<SSEEvent> = {
      timestamp: new Date().toISOString(),
    };

    for (const line of lines) {
      const [field, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      switch (field.trim()) {
        case 'id':
          event.id = value;
          break;
        case 'event':
          event.event = value;
          break;
        case 'data':
          try {
            event.data = JSON.parse(value);
          } catch {
            event.data = value;
          }
          break;
        case 'retry':
          event.retry = parseInt(value, 10);
          break;
      }
    }

    if (event.event) {
      return event as SSEEvent;
    }
  } catch (error) {
    console.error('[SSE] Failed to parse event:', error);
  }

  return null;
}

export function createSSEEvent(
  eventType: string,
  data: unknown,
  id?: string
): SSEEvent {
  return {
    id,
    event: eventType,
    data,
    timestamp: new Date().toISOString(),
  };
}