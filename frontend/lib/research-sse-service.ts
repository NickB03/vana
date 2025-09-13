/**
 * Real-time Research SSE Service for Vana AI
 * 
 * Handles Server-Sent Events connections for multi-agent research streaming.
 * Provides real-time progress updates, agent status tracking, and error handling.
 */

import { z } from 'zod';

// ============================================================================
// Type Definitions and Validation
// ============================================================================

const AgentStatusSchema = z.object({
  agent_id: z.string(),
  agent_type: z.string(),
  name: z.string(),
  status: z.enum(['waiting', 'current', 'completed', 'error']),
  progress: z.number().min(0).max(1),
  current_task: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
});

const ResearchProgressEventSchema = z.object({
  type: z.literal('research_progress'),
  sessionId: z.string(),
  status: z.enum(['initializing', 'running', 'completed', 'error']),
  overall_progress: z.number().min(0).max(1),
  current_phase: z.string(),
  agents: z.array(AgentStatusSchema),
  partial_results: z.record(z.unknown()).nullable().optional(),
  timestamp: z.string(),
});

const ConnectionEventSchema = z.object({
  type: z.literal('connection'),
  status: z.enum(['connected', 'disconnected']),
  sessionId: z.string(),
  timestamp: z.string(),
});

const ResearchStartedEventSchema = z.object({
  type: z.literal('research_started'),
  sessionId: z.string(),
  timestamp: z.string(),
});

const ResearchCompleteEventSchema = z.object({
  type: z.literal('research_complete'),
  sessionId: z.string(),
  status: z.enum(['completed', 'error']),
  final_report: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  timestamp: z.string(),
});

const ErrorEventSchema = z.object({
  type: z.literal('error'),
  sessionId: z.string(),
  error: z.string(),
  timestamp: z.string(),
});

export type AgentStatus = z.infer<typeof AgentStatusSchema>;
export type ResearchProgressEvent = z.infer<typeof ResearchProgressEventSchema>;
export type ConnectionEvent = z.infer<typeof ConnectionEventSchema>;
export type ResearchStartedEvent = z.infer<typeof ResearchStartedEventSchema>;
export type ResearchCompleteEvent = z.infer<typeof ResearchCompleteEventSchema>;
export type ErrorEvent = z.infer<typeof ErrorEventSchema>;

export type ResearchSSEEvent = 
  | ResearchProgressEvent 
  | ConnectionEvent 
  | ResearchStartedEvent
  | ResearchCompleteEvent 
  | ErrorEvent;

export interface ResearchRequest {
  query: string;
  sessionId?: string;
}

export interface ResearchSessionState {
  sessionId: string;
  status: 'connecting' | 'connected' | 'running' | 'completed' | 'error' | 'disconnected';
  overallProgress: number;
  currentPhase: string;
  agents: AgentStatus[];
  partialResults: Record<string, unknown> | null;
  finalReport: string | null;
  error: string | null;
  lastUpdate: Date;
}

// ============================================================================
// Circuit Breaker for SSE Connections
// ============================================================================

class SSECircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: Date | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  private readonly failureThreshold = 3;
  private readonly recoveryTimeoutMs = 30000; // 30 seconds
  
  canAttemptConnection(): boolean {
    switch (this.state) {
      case 'CLOSED':
        return true;
      case 'OPEN':
        if (this.lastFailureTime && 
            Date.now() - this.lastFailureTime.getTime() > this.recoveryTimeoutMs) {
          this.state = 'HALF_OPEN';
          return true;
        }
        return false;
      case 'HALF_OPEN':
        return true;
      default:
        return false;
    }
  }
  
  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
  }
  
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`[SSE Circuit Breaker] Circuit opened after ${this.failureCount} failures`);
    }
  }
  
  getState(): string {
    return this.state;
  }
  
  reset(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
    console.log('[SSE Circuit Breaker] Circuit manually reset');
  }
}

// ============================================================================
// Enhanced SSE Connection Manager with Better Error Handling
// ============================================================================

class SSEConnectionManager {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private listeners: ((event: ResearchSSEEvent) => void)[] = [];
  private connectionListeners: ((status: 'connected' | 'disconnected' | 'error') => void)[] = [];
  private lastConnectionUrl: string | null = null;
  private lastConnectionHeaders: Record<string, string> | undefined = undefined;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isExplicitDisconnect = false;
  
  // Circuit breaker for connection failures
  private circuitBreaker = new SSECircuitBreaker();
  
  connect(url: string, headers?: Record<string, string>): void {
    // Store connection details for potential reconnection
    this.lastConnectionUrl = url;
    this.lastConnectionHeaders = headers;
    this.isExplicitDisconnect = false;
    
    this.disconnect(); // Clean up any existing connection
    
    try {
      console.log('[Research SSE] Connecting to:', url, headers ? 'with auth' : 'without auth');
      
      // Create EventSource with proper configuration
      if (headers?.Authorization) {
        // EventSource doesn't support custom headers directly
        // We need to pass auth via URL params or rely on cookies
        const authUrl = new URL(url, window.location.origin);
        authUrl.searchParams.set('auth', encodeURIComponent(headers.Authorization));
        this.eventSource = new EventSource(authUrl.toString());
      } else {
        this.eventSource = new EventSource(url, {
          withCredentials: true // Include cookies for authentication
        });
      }
      
      this.eventSource.onopen = (event) => {
        console.log('[Research SSE] Connection opened successfully', {
          readyState: this.eventSource?.readyState,
          url: url
        });
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.notifyConnectionListeners('connected');
      };
      
      this.eventSource.onmessage = (event) => {
        try {
          console.log('[Research SSE] Received message:', event.data);
          const data = JSON.parse(event.data);
          this.handleSSEEvent(data);
        } catch (error) {
          console.error('[Research SSE] Failed to parse event data:', error, 'Raw data:', event.data);
        }
      };
      
      this.eventSource.onerror = (error) => {
        const readyState = this.eventSource?.readyState;
        console.error('[Research SSE] Connection error occurred:', {
          readyState: readyState,
          readyStateText: this.getReadyStateText(readyState),
          url: url,
          error: error,
          isExplicitDisconnect: this.isExplicitDisconnect
        });
        
        // Only handle as error if it's not an explicit disconnect
        if (!this.isExplicitDisconnect) {
          this.notifyConnectionListeners('error');
          this.handleConnectionError();
        }
      };
      
    } catch (error) {
      console.error('[Research SSE] Failed to create connection:', error);
      this.notifyConnectionListeners('error');
    }
  }
  
  private getReadyStateText(readyState?: number): string {
    switch (readyState) {
      case EventSource.CONNECTING: return 'CONNECTING';
      case EventSource.OPEN: return 'OPEN';
      case EventSource.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }
  
  private handleSSEEvent(data: unknown): void {
    try {
      // Type guard: ensure data is an object with a type property
      if (!data || typeof data !== 'object' || !('type' in data)) {
        console.error('[Research SSE] Invalid event data format:', data);
        return;
      }
      
      const eventData = data as { type: string; [key: string]: unknown };
      
      // Use safeParse to avoid crashes on validation errors
      let event: ResearchSSEEvent | null = null;
      let parseResult;
      
      if (eventData.type === 'research_progress') {
        parseResult = ResearchProgressEventSchema.safeParse(data);
        if (parseResult.success) {
          event = parseResult.data;
        } else {
          console.warn('[Research SSE] research_progress validation failed:', parseResult.error.message);
          // Create minimal valid event for compatibility
          event = {
            type: 'research_progress',
            sessionId: eventData.sessionId as string || 'unknown',
            status: 'running' as const,
            overall_progress: typeof eventData.overall_progress === 'number' ? eventData.overall_progress : 0,
            current_phase: eventData.current_phase as string || 'Unknown Phase',
            agents: Array.isArray(eventData.agents) ? eventData.agents as AgentStatus[] : [],
            timestamp: eventData.timestamp as string || new Date().toISOString()
          };
        }
      } else if (eventData.type === 'connection') {
        parseResult = ConnectionEventSchema.safeParse(data);
        if (parseResult.success) {
          event = parseResult.data;
        } else {
          console.warn('[Research SSE] connection validation failed:', parseResult.error.message);
          event = {
            type: 'connection',
            status: eventData.status as 'connected' | 'disconnected' || 'connected',
            sessionId: eventData.sessionId as string || 'unknown',
            timestamp: eventData.timestamp as string || new Date().toISOString()
          };
        }
      } else if (eventData.type === 'research_started') {
        parseResult = ResearchStartedEventSchema.safeParse(data);
        if (parseResult.success) {
          event = parseResult.data;
        } else {
          console.warn('[Research SSE] research_started validation failed:', parseResult.error.message);
          event = {
            type: 'research_started',
            sessionId: eventData.sessionId as string || 'unknown',
            timestamp: eventData.timestamp as string || new Date().toISOString()
          };
        }
      } else if (eventData.type === 'research_complete') {
        parseResult = ResearchCompleteEventSchema.safeParse(data);
        if (parseResult.success) {
          event = parseResult.data;
        } else {
          console.warn('[Research SSE] research_complete validation failed:', parseResult.error.message);
          event = {
            type: 'research_complete',
            sessionId: eventData.sessionId as string || 'unknown',
            status: eventData.status as 'completed' | 'error' || 'completed',
            timestamp: eventData.timestamp as string || new Date().toISOString()
          };
        }
      } else if (eventData.type === 'error') {
        parseResult = ErrorEventSchema.safeParse(data);
        if (parseResult.success) {
          event = parseResult.data;
        } else {
          console.warn('[Research SSE] error validation failed:', parseResult.error.message);
          event = {
            type: 'error',
            sessionId: eventData.sessionId as string || 'unknown',
            error: eventData.error as string || 'Unknown error',
            timestamp: eventData.timestamp as string || new Date().toISOString()
          };
        }
      } else {
        console.warn('[Research SSE] Unknown event type:', eventData.type);
        return;
      }
      
      // Only notify listeners if we have a valid event
      if (event) {
        this.listeners.forEach(listener => {
          try {
            listener(event!);
          } catch (error) {
            console.error('[Research SSE] Listener error:', error);
          }
        });
      }
      
    } catch (error) {
      console.error('[Research SSE] Event processing failed:', error, 'Raw data:', data);
    }
  }
  
  private handleConnectionError(): void {
    const currentReadyState = this.eventSource?.readyState;
    
    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.eventSource && !this.isExplicitDisconnect) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // Only attempt reconnection if we haven't reached max attempts and it wasn't an explicit disconnect
    if (this.reconnectAttempts < this.maxReconnectAttempts && !this.isExplicitDisconnect) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
      
      console.log(`[Research SSE] Scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`, {
        previousReadyState: this.getReadyStateText(currentReadyState),
        delay: delay,
        hasConnectionDetails: !!(this.lastConnectionUrl && this.lastConnectionHeaders)
      });
      
      this.reconnectTimer = setTimeout(() => {
        if (this.lastConnectionUrl && !this.isExplicitDisconnect) {
          console.log('[Research SSE] Attempting to reconnect to:', this.lastConnectionUrl);
          this.connect(this.lastConnectionUrl, this.lastConnectionHeaders);
        } else if (!this.isExplicitDisconnect) {
          console.error('[Research SSE] Cannot reconnect: missing connection details');
          this.notifyConnectionListeners('error');
        }
      }, delay);
    } else if (!this.isExplicitDisconnect) {
      console.error('[Research SSE] Max reconnection attempts reached or explicit disconnect');
      this.notifyConnectionListeners('error');
    }
  }
  
  disconnect(): void {
    this.isExplicitDisconnect = true;
    
    // Clear any pending reconnection
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.eventSource) {
      console.log('[Research SSE] Explicitly disconnecting');
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // Reset state
    this.reconnectAttempts = 0;
    this.lastConnectionUrl = null;
    this.lastConnectionHeaders = undefined;
    
    this.notifyConnectionListeners('disconnected');
  }
  
  addListener(callback: (event: ResearchSSEEvent) => void): void {
    this.listeners.push(callback);
  }
  
  removeListener(callback: (event: ResearchSSEEvent) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }
  
  addConnectionListener(callback: (status: 'connected' | 'disconnected' | 'error') => void): void {
    this.connectionListeners.push(callback);
  }
  
  removeConnectionListener(callback: (status: 'connected' | 'disconnected' | 'error') => void): void {
    this.connectionListeners = this.connectionListeners.filter(listener => listener !== callback);
  }
  
  private notifyConnectionListeners(status: 'connected' | 'disconnected' | 'error'): void {
    this.connectionListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('[Research SSE] Connection listener error:', error);
      }
    });
  }
  
  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }
  
  getConnectionState(): string {
    if (!this.eventSource) return 'DISCONNECTED';
    return this.getReadyStateText(this.eventSource.readyState);
  }
  
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}

// ============================================================================
// Enhanced Research SSE Service
// ============================================================================

export class ResearchSSEService {
  private connectionManager = new SSEConnectionManager();
  private activeSessions = new Map<string, ResearchSessionState>();
  private listeners = new Map<string, Set<(state: ResearchSessionState) => void>>();
  private baseUrl: string;
  
  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;
    
    // Set up global event handling with error protection
    this.connectionManager.addListener((event: ResearchSSEEvent) => {
      try {
        this.handleSSEEvent(event);
      } catch (error) {
        console.error('[Research SSE Service] Event handling error:', error, 'Event:', event);
      }
    });
    this.connectionManager.addConnectionListener((status) => {
      try {
        this.handleConnectionStatus(status);
      } catch (error) {
        console.error('[Research SSE Service] Connection status handling error:', error, 'Status:', status);
      }
    });
  }
  
  private generateSessionId(): string {
    return `research_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    
    // Try to get auth token
    if (typeof window !== 'undefined') {
      try {
        // Try to use secure token manager first
        try {
          const { tokenManager } = await import('./security');
          const token = tokenManager.getToken();
          if (token) {
            headers.Authorization = `Bearer ${token}`;
            console.log('[Research SSE] Using secure token manager for auth');
            return headers;
          }
        } catch (error) {
          // Security module not available, fall back
          console.warn('[Research SSE] Security module unavailable, falling back to localStorage');
        }
        
        // Fallback to localStorage
        const token = localStorage.getItem('vana_auth_token');
        if (token) {
          headers.Authorization = `Bearer ${token}`;
          console.log('[Research SSE] Using localStorage token for auth');
        } else {
          console.warn('[Research SSE] No authentication token found');
        }
      } catch (error) {
        console.warn('[Research SSE] Could not get auth token:', error);
      }
    }
    
    return headers;
  }
  
  async startResearch(request: ResearchRequest): Promise<string> {
    const sessionId = request.sessionId || this.generateSessionId();
    
    console.log('[Research SSE] Starting research session:', sessionId, 'Query:', request.query);
    
    // Initialize session state
    const sessionState: ResearchSessionState = {
      sessionId,
      status: 'connecting',
      overallProgress: 0,
      currentPhase: 'Initializing',
      agents: [],
      partialResults: null,
      finalReport: null,
      error: null,
      lastUpdate: new Date(),
    };
    
    this.activeSessions.set(sessionId, sessionState);
    this.notifyListeners(sessionId, sessionState);
    
    try {
      // Get auth headers
      const authHeaders = await this.getAuthHeaders();
      
      console.log('[Research SSE] Sending POST request to start research');
      
      // First, start the research via POST request
      const response = await fetch(`${this.baseUrl}/api/run_sse/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ query: request.query }),
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        const errorMessage = `Failed to start research: ${response.status} ${response.statusText} - ${errorText}`;
        console.error('[Research SSE] POST request failed:', errorMessage);
        throw new Error(errorMessage);
      }
      
      console.log('[Research SSE] POST request successful, connecting to SSE stream');
      
      // Connect to SSE stream
      const sseUrl = `${this.baseUrl}/api/run_sse/${sessionId}`;
      this.connectionManager.connect(sseUrl, authHeaders);
      
      sessionState.status = 'connected';
      sessionState.lastUpdate = new Date();
      this.notifyListeners(sessionId, sessionState);
      
      return sessionId;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start research';
      console.error('[Research SSE] Failed to start research:', errorMessage);
      
      sessionState.status = 'error';
      sessionState.error = errorMessage;
      sessionState.lastUpdate = new Date();
      this.notifyListeners(sessionId, sessionState);
      throw error;
    }
  }
  
  private handleSSEEvent(event: ResearchSSEEvent): void {
    try {
      // Safety check for event object
      if (!event || typeof event !== 'object' || !event.sessionId || !event.type) {
        console.error('[Research SSE] Invalid event object received:', event);
        return;
      }
      
      const sessionId = event.sessionId;
      const sessionState = this.activeSessions.get(sessionId);
      
      console.log('[Research SSE] Handling event:', event.type, 'for session:', sessionId);
      
      if (!sessionState) {
        console.warn('[Research SSE] Received event for unknown session:', sessionId);
        return;
      }
    } catch (error) {
      console.error('[Research SSE] Error in handleSSEEvent initial checks:', error, 'Event:', event);
      return;
    }
    
    // Update session state based on event type - wrapped in try-catch for safety
    try {
      switch (event.type) {
        case 'connection':
          sessionState.status = event.status === 'connected' ? 'connected' : 'disconnected';
          console.log('[Research SSE] Connection status updated:', sessionState.status);
          break;
          
        case 'research_started':
          sessionState.status = 'running';
          sessionState.currentPhase = 'Research Started';
          console.log('[Research SSE] Research started for session:', sessionId);
          break;
          
        case 'research_progress':
          sessionState.status = 'running';
          sessionState.overallProgress = event.overall_progress || 0;
          sessionState.currentPhase = event.current_phase || 'Unknown Phase';
          sessionState.agents = event.agents || [];
          sessionState.partialResults = event.partial_results || null;
          console.log('[Research SSE] Progress update:', Math.round((event.overall_progress || 0) * 100) + '%', event.current_phase);
          break;
          
        case 'research_complete':
          sessionState.status = event.status === 'completed' ? 'completed' : 'error';
          sessionState.finalReport = event.final_report || null;
          sessionState.error = event.error || null;
          sessionState.overallProgress = 1.0;
          console.log('[Research SSE] Research completed:', event.status, sessionId);
          break;
          
        case 'error':
          sessionState.status = 'error';
          sessionState.error = event.error || 'Unknown error';
          console.error('[Research SSE] Error event:', event.error, sessionId);
          break;
          
        default:
          console.warn('[Research SSE] Unknown event type:', (event as any).type);
          return; // Don't update if unknown event type
      }
      
      sessionState.lastUpdate = new Date();
      this.notifyListeners(sessionId, sessionState);
      
    } catch (error) {
      console.error('[Research SSE] Error processing event type:', event.type, 'Error:', error, 'Event:', event);
    }
  }
  
  private handleConnectionStatus(status: 'connected' | 'disconnected' | 'error'): void {
    console.log('[Research SSE] Global connection status changed:', status);
    
    // Update all active sessions with connection status
    for (const [sessionId, sessionState] of this.activeSessions.entries()) {
      if (status === 'error' || status === 'disconnected') {
        // Only update if not already completed
        if (sessionState.status !== 'completed' && sessionState.status !== 'error') {
          sessionState.status = status === 'error' ? 'error' : 'disconnected';
          if (status === 'error') {
            sessionState.error = sessionState.error || 'Connection lost';
          }
          sessionState.lastUpdate = new Date();
          this.notifyListeners(sessionId, sessionState);
        }
      }
    }
  }
  
  private notifyListeners(sessionId: string, state: ResearchSessionState): void {
    const listeners = this.listeners.get(sessionId);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(state);
        } catch (error) {
          console.error('[Research SSE] Listener error:', error);
        }
      });
    }
  }
  
  subscribeToSession(sessionId: string, callback: (state: ResearchSessionState) => void): () => void {
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, new Set());
    }
    
    const listeners = this.listeners.get(sessionId)!;
    listeners.add(callback);
    
    // Immediately call with current state if available
    const currentState = this.activeSessions.get(sessionId);
    if (currentState) {
      callback(currentState);
    }
    
    // Return unsubscribe function
    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(sessionId);
      }
    };
  }
  
  getSessionState(sessionId: string): ResearchSessionState | null {
    return this.activeSessions.get(sessionId) || null;
  }
  
  stopResearch(sessionId: string): void {
    console.log('[Research SSE] Stopping research session:', sessionId);
    this.activeSessions.delete(sessionId);
    this.listeners.delete(sessionId);
    
    // If this is the last active session, disconnect
    if (this.activeSessions.size === 0) {
      this.connectionManager.disconnect();
    }
  }
  
  disconnect(): void {
    console.log('[Research SSE] Disconnecting service');
    this.connectionManager.disconnect();
    this.activeSessions.clear();
    this.listeners.clear();
  }
  
  // Debug methods
  getConnectionState(): string {
    return this.connectionManager.getConnectionState();
  }
  
  getReconnectAttempts(): number {
    return this.connectionManager.getReconnectAttempts();
  }
  
  getAllSessions(): Map<string, ResearchSessionState> {
    return new Map(this.activeSessions);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const researchSSEService = new ResearchSSEService();

// ============================================================================
// React Hook Integration (for future use)
// ============================================================================

export interface UseResearchSSE {
  startResearch: (query: string) => Promise<string>;
  sessionState: ResearchSessionState | null;
  isConnected: boolean;
  error: string | null;
}

// This would be implemented as a React hook in a separate file
// Left as placeholder for the React integration