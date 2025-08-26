export interface SSEEvent {
  id?: string;
  type: string;
  data: unknown;
  retry?: number;
  timestamp?: number;
}

export interface SSEConnectionState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  retryCount: number;
  lastEventId: string | null;
  connectionType: 'sse' | 'polling' | 'disconnected';
}

export interface SSEClientConfig {
  baseUrl?: string;
  sessionId?: string;
  enablePollingFallback?: boolean;
  maxRetries?: number;
  pollingInterval?: number;
  headers?: Record<string, string>;
}

type EventHandler = (event: SSEEvent) => void;
type ConnectionChangeHandler = (state: SSEConnectionState) => void;

export class SSEClient {
  private config: Required<SSEClientConfig>;
  private eventSource: EventSource | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private connectionChangeHandlers: Set<ConnectionChangeHandler> = new Set();
  private state: SSEConnectionState = {
    connected: false,
    connecting: false,
    error: null,
    retryCount: 0,
    lastEventId: null,
    connectionType: 'disconnected',
  };

  constructor(config: Partial<SSEClientConfig> = {}) {
    this.config = {
      baseUrl: 'http://localhost:8000',
      sessionId: '',
      enablePollingFallback: true,
      maxRetries: 10,
      pollingInterval: 5000,
      headers: {},
      ...config,
    };
  }

  private setState(newState: Partial<SSEConnectionState>) {
    this.state = { ...this.state, ...newState };
    this.connectionChangeHandlers.forEach(handler => handler(this.state));
  }

  private emitEvent(event: SSEEvent) {
    const handlers = this.eventHandlers.get(event.type) || new Set();
    handlers.forEach(handler => handler(event));

    // Also emit to 'message' handlers for all events
    if (event.type !== 'message') {
      const messageHandlers = this.eventHandlers.get('message') || new Set();
      messageHandlers.forEach(handler => handler(event));
    }
  }

  async connect(): Promise<void> {
    if (this.state.connecting || this.state.connected) {
      return;
    }

    if (!this.config.sessionId) {
      throw new Error('Session ID is required for SSE connection');
    }

    this.setState({ connecting: true, error: null });

    try {
      await this.connectSSE();
    } catch (error) {
      console.warn('SSE connection failed, trying polling fallback...', error);
      if (this.config.enablePollingFallback) {
        this.connectPolling();
      } else {
        this.setState({
          connecting: false,
          error: error instanceof Error ? error.message : 'Connection failed',
        });
      }
    }
  }

  private async connectSSE(): Promise<void> {
    // For secure connection, use the Next.js proxy route
    const url = new URL(`/api/sse`, window.location.origin);
    url.searchParams.set('session_id', this.config.sessionId);
    
    if (this.state.lastEventId) {
      url.searchParams.set('lastEventId', this.state.lastEventId);
    }
    
    // Add token if available in headers
    const authHeader = this.config.headers['Authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      url.searchParams.set('token', token);
    }

    this.eventSource = new EventSource(url.toString());

    this.eventSource.onopen = () => {
      this.setState({
        connected: true,
        connecting: false,
        retryCount: 0,
        connectionType: 'sse',
      });
    };

    this.eventSource.onmessage = (event) => {
      this.handleSSEMessage(event);
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      this.handleConnectionError('SSE connection error');
    };

    // Add custom event listeners for specific event types
    ['agent_network_update', 'connection', 'error', 'keepalive'].forEach(eventType => {
      this.eventSource?.addEventListener(eventType, (event) => {
        this.handleSSEMessage(event as MessageEvent);
      });
    });
  }

  private handleSSEMessage(event: MessageEvent) {
    try {
      let data: unknown;
      try {
        data = JSON.parse(event.data);
      } catch {
        data = event.data;
      }

      const sseEvent: SSEEvent = {
        id: event.lastEventId || undefined,
        type: event.type || 'message',
        data,
        timestamp: Date.now(),
      };

      this.state.lastEventId = event.lastEventId;
      this.emitEvent(sseEvent);
    } catch (error) {
      console.error('Error processing SSE message:', error);
    }
  }

  private connectPolling() {
    this.setState({ connectionType: 'polling' });
    this.startPolling();
  }

  private startPolling() {
    this.pollingInterval = setInterval(async () => {
      try {
        // Use the Next.js proxy route for polling as well
        const url = new URL(`/api/sse`, window.location.origin);
        url.searchParams.set('session_id', this.config.sessionId);
        url.searchParams.set('polling', 'true'); // Indicate polling mode
        
        if (this.state.lastEventId) {
          url.searchParams.set('lastEventId', this.state.lastEventId);
        }
        
        // Add token if available in headers
        const authHeader = this.config.headers['Authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.replace('Bearer ', '');
          url.searchParams.set('token', token);
        }

        const response = await fetch(url.toString(), {
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Polling failed: ${response.status}`);
        }

        const events = await response.json();
        if (Array.isArray(events)) {
          events.forEach((eventData) => {
            const sseEvent: SSEEvent = {
              ...eventData,
              timestamp: eventData.timestamp || Date.now(),
            };
            this.emitEvent(sseEvent);
          });
        }

        if (!this.state.connected) {
          this.setState({ connected: true, connecting: false, retryCount: 0 });
        }
      } catch (error) {
        console.error('Polling error:', error);
        this.handleConnectionError(error instanceof Error ? error.message : 'Polling failed');
      }
    }, this.config.pollingInterval);
  }

  private handleConnectionError(errorMessage: string) {
    if (this.state.retryCount >= this.config.maxRetries) {
      this.setState({
        connecting: false,
        connected: false,
        error: `Max retries reached: ${errorMessage}`,
        connectionType: 'disconnected',
      });
      return;
    }

    this.setState({
      retryCount: this.state.retryCount + 1,
      error: errorMessage,
    });

    // Retry connection after delay
    setTimeout(() => {
      if (!this.state.connected && this.state.retryCount > 0) {
        this.connect();
      }
    }, Math.min(1000 * Math.pow(2, this.state.retryCount), 30000));
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.setState({
      connected: false,
      connecting: false,
      connectionType: 'disconnected',
    });
  }

  destroy() {
    this.disconnect();
    this.eventHandlers.clear();
    this.connectionChangeHandlers.clear();
  }

  on(eventType: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);

    return () => {
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(eventType);
        }
      }
    };
  }

  off(eventType: string, handler: EventHandler) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventType);
      }
    }
  }

  onConnectionChange(handler: ConnectionChangeHandler): () => void {
    this.connectionChangeHandlers.add(handler);
    return () => {
      this.connectionChangeHandlers.delete(handler);
    };
  }

  updateSession(sessionId: string) {
    if (this.config.sessionId === sessionId) {
      return;
    }

    const wasConnected = this.state.connected;
    this.disconnect();
    
    this.config.sessionId = sessionId;
    this.setState({
      lastEventId: null,
      retryCount: 0,
      error: null,
    });

    if (wasConnected) {
      this.connect();
    }
  }

  getState(): SSEConnectionState {
    return { ...this.state };
  }
}