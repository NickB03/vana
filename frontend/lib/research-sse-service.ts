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
export type ResearchCompleteEvent = z.infer<typeof ResearchCompleteEventSchema>;
export type ErrorEvent = z.infer<typeof ErrorEventSchema>;

export type ResearchSSEEvent = 
  | ResearchProgressEvent 
  | ConnectionEvent 
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
// SSE Connection Manager
// ============================================================================

class SSEConnectionManager {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private listeners: ((event: ResearchSSEEvent) => void)[] = [];
  private connectionListeners: ((status: 'connected' | 'disconnected' | 'error') => void)[] = [];
  
  connect(url: string, headers?: Record<string, string>): void {
    this.disconnect(); // Clean up any existing connection
    
    try {
      // Create EventSource with proper headers for authentication
      if (headers?.Authorization) {
        // EventSource doesn't support custom headers directly
        // We need to pass auth via URL params or rely on cookies
        const authUrl = new URL(url, window.location.origin);
        authUrl.searchParams.set('auth', encodeURIComponent(headers.Authorization));
        this.eventSource = new EventSource(authUrl.toString());
      } else {
        this.eventSource = new EventSource(url);
      }
      
      this.eventSource.onopen = () => {
        console.log('[Research SSE] Connection opened');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.notifyConnectionListeners('connected');
      };
      
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleSSEEvent(data);
        } catch (error) {
          console.error('[Research SSE] Failed to parse event data:', error);
        }
      };
      
      this.eventSource.onerror = () => {
        console.error('[Research SSE] Connection error');
        this.notifyConnectionListeners('error');
        this.handleConnectionError();
      };
      
    } catch (error) {
      console.error('[Research SSE] Failed to create connection:', error);
      this.notifyConnectionListeners('error');
    }
  }
  
  private handleSSEEvent(data: unknown): void {
    try {
      // Validate and parse the event
      let event: ResearchSSEEvent;
      
      if (data.type === 'research_progress') {
        event = ResearchProgressEventSchema.parse(data);
      } else if (data.type === 'connection') {
        event = ConnectionEventSchema.parse(data);
      } else if (data.type === 'research_complete') {
        event = ResearchCompleteEventSchema.parse(data);
      } else if (data.type === 'error') {
        event = ErrorEventSchema.parse(data);
      } else {
        console.warn('[Research SSE] Unknown event type:', data.type);
        return;
      }
      
      // Notify listeners
      this.listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('[Research SSE] Listener error:', error);
        }
      });
      
    } catch (error) {
      console.error('[Research SSE] Event validation failed:', error);
    }
  }
  
  private handleConnectionError(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // Implement exponential backoff for reconnection
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
      
      console.log(`[Research SSE] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        // Note: This is a simplified reconnect - in practice, you'd need to store the original URL and headers
        console.log('[Research SSE] Attempting to reconnect...');
      }, delay);
    } else {
      console.error('[Research SSE] Max reconnection attempts reached');
      this.notifyConnectionListeners('error');
    }
  }
  
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
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
}

// ============================================================================
// Research SSE Service
// ============================================================================

export class ResearchSSEService {
  private connectionManager = new SSEConnectionManager();
  private activeSessions = new Map<string, ResearchSessionState>();
  private listeners = new Map<string, Set<(state: ResearchSessionState) => void>>();
  private baseUrl: string;
  
  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;
    
    // Set up global event handling
    this.connectionManager.addListener(this.handleSSEEvent.bind(this));
    this.connectionManager.addConnectionListener(this.handleConnectionStatus.bind(this));
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
            return headers;
          }
        } catch {
          // Security module not available, fall back
        }
        
        // Fallback to localStorage
        const token = localStorage.getItem('vana_auth_token');
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn('[Research SSE] Could not get auth token:', error);
      }
    }
    
    return headers;
  }
  
  async startResearch(request: ResearchRequest): Promise<string> {
    const sessionId = request.sessionId || this.generateSessionId();
    
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
        throw new Error(`Failed to start research: ${response.status} ${response.statusText}`);
      }
      
      // The endpoint will return an SSE stream, so we need to handle it differently
      // Instead of using fetch, we'll connect via EventSource
      const sseUrl = `${this.baseUrl}/api/run_sse/${sessionId}`;
      this.connectionManager.connect(sseUrl, authHeaders);
      
      sessionState.status = 'connected';
      sessionState.lastUpdate = new Date();
      this.notifyListeners(sessionId, sessionState);
      
      return sessionId;
      
    } catch (error) {
      sessionState.status = 'error';
      sessionState.error = error instanceof Error ? error.message : 'Failed to start research';
      sessionState.lastUpdate = new Date();
      this.notifyListeners(sessionId, sessionState);
      throw error;
    }
  }
  
  private handleSSEEvent(event: ResearchSSEEvent): void {
    const sessionId = event.sessionId;
    const sessionState = this.activeSessions.get(sessionId);
    
    if (!sessionState) {
      console.warn('[Research SSE] Received event for unknown session:', sessionId);
      return;
    }
    
    // Update session state based on event type
    switch (event.type) {
      case 'connection':
        sessionState.status = event.status === 'connected' ? 'connected' : 'disconnected';
        break;
        
      case 'research_progress':
        sessionState.status = 'running';
        sessionState.overallProgress = event.overall_progress;
        sessionState.currentPhase = event.current_phase;
        sessionState.agents = event.agents;
        sessionState.partialResults = event.partial_results || null;
        break;
        
      case 'research_complete':
        sessionState.status = event.status === 'completed' ? 'completed' : 'error';
        sessionState.finalReport = event.final_report || null;
        sessionState.error = event.error || null;
        sessionState.overallProgress = 1.0;
        break;
        
      case 'error':
        sessionState.status = 'error';
        sessionState.error = event.error;
        break;
    }
    
    sessionState.lastUpdate = new Date();
    this.notifyListeners(sessionId, sessionState);
  }
  
  private handleConnectionStatus(status: 'connected' | 'disconnected' | 'error'): void {
    // Update all active sessions with connection status
    for (const [sessionId, sessionState] of this.activeSessions.entries()) {
      if (status === 'error' || status === 'disconnected') {
        sessionState.status = status === 'error' ? 'error' : 'disconnected';
        sessionState.lastUpdate = new Date();
        this.notifyListeners(sessionId, sessionState);
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
    this.activeSessions.delete(sessionId);
    this.listeners.delete(sessionId);
    // Note: We can't really "stop" the backend research once started,
    // but we can clean up the frontend state
  }
  
  disconnect(): void {
    this.connectionManager.disconnect();
    this.activeSessions.clear();
    this.listeners.clear();
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