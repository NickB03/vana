/**
 * SSE Client Implementation
 * Production-ready SSE client with auto-reconnection and fallback support
 */

import {
  SSEConfig,
  SSEConnectionState,
  SSEEvent,
  SSEEventType,
  SSEError,
  SSEErrorType,
  SSEMetrics,
  SSEHealthStatus,
  SSEEventHandlers,
  SSEStateHandler
} from './types';

export class SSEClient {
  private config: Required<SSEConfig>;
  private eventSource: EventSource | null = null;
  private state: SSEConnectionState = SSEConnectionState.IDLE;
  private eventHandlers: SSEEventHandlers = {};
  private stateHandlers: Set<SSEStateHandler> = new Set();
  private reconnectAttempt = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private lastHeartbeat = Date.now();
  private pollingTimer?: NodeJS.Timeout;
  private metrics: SSEMetrics = {
    connectionAttempts: 0,
    successfulConnections: 0,
    failedConnections: 0,
    messagesReceived: 0,
    errorsReceived: 0,
    bytesReceived: 0,
    uptime: 0
  };
  private startTime = Date.now();

  constructor(config: SSEConfig) {
    this.config = {
      url: config.url,
      withCredentials: config.withCredentials ?? true,
      headers: config.headers ?? {},
      reconnect: config.reconnect ?? true,
      reconnectAttempts: config.reconnectAttempts ?? 3,
      reconnectDelay: config.reconnectDelay ?? 1000,
      reconnectBackoff: config.reconnectBackoff ?? 2,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      timeout: config.timeout ?? 60000,
      pollingFallback: config.pollingFallback ?? true,
      pollingInterval: config.pollingInterval ?? 5000,
      onOpen: config.onOpen ?? (() => {}),
      onMessage: config.onMessage ?? (() => {}),
      onError: config.onError ?? (() => {}),
      onClose: config.onClose ?? (() => {}),
      onReconnecting: config.onReconnecting ?? (() => {})
    };
  }

  // Connect to SSE endpoint
  public connect(): void {
    if (this.state === SSEConnectionState.CONNECTED || 
        this.state === SSEConnectionState.CONNECTING) {
      return;
    }

    this.setState(SSEConnectionState.CONNECTING);
    this.metrics.connectionAttempts++;

    // Check if EventSource is supported
    if (!this.isEventSourceSupported() && this.config.pollingFallback) {
      this.startPollingFallback();
      return;
    }

    try {
      // Build URL with auth token if available
      const url = new URL(this.config.url);
      const token = this.getAuthToken();
      if (token) {
        url.searchParams.set('token', token);
      }

      // Create EventSource
      this.eventSource = new EventSource(url.toString(), {
        withCredentials: this.config.withCredentials
      });

      // Set up event handlers
      this.eventSource.onopen = this.handleOpen.bind(this);
      this.eventSource.onmessage = this.handleMessage.bind(this);
      this.eventSource.onerror = this.handleError.bind(this);

      // Register specific event listeners
      Object.values(SSEEventType).forEach(eventType => {
        this.eventSource!.addEventListener(eventType, (event: any) => {
          this.handleTypedEvent(eventType, event);
        });
      });

      // Start heartbeat monitoring
      this.startHeartbeat();

    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  // Disconnect from SSE
  public disconnect(): void {
    this.setState(SSEConnectionState.DISCONNECTED);
    this.cleanup();
    this.config.onClose();
  }

  // Register event handler
  public on(eventType: string, handler: (event: SSEEvent) => void): void {
    this.eventHandlers[eventType] = handler;
  }

  // Remove event handler
  public off(eventType: string): void {
    delete this.eventHandlers[eventType];
  }

  // Register state change handler
  public onStateChange(handler: SSEStateHandler): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  // Get current state
  public getState(): SSEConnectionState {
    return this.state;
  }

  // Get health status
  public getHealth(): SSEHealthStatus {
    return {
      connected: this.state === SSEConnectionState.CONNECTED,
      state: this.state,
      lastHeartbeat: this.lastHeartbeat,
      latency: this.calculateLatency(),
      metrics: { ...this.metrics, uptime: Date.now() - this.startTime }
    };
  }

  // Get metrics
  public getMetrics(): SSEMetrics {
    return { ...this.metrics, uptime: Date.now() - this.startTime };
  }

  // Private methods
  private handleOpen(): void {
    this.setState(SSEConnectionState.CONNECTED);
    this.metrics.successfulConnections++;
    this.metrics.lastConnectionTime = Date.now();
    this.reconnectAttempt = 0;
    this.config.onOpen();
    console.log('[SSE] Connected successfully');
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      const sseEvent: SSEEvent = {
        type: SSEEventType.MESSAGE,
        data,
        timestamp: Date.now()
      };

      this.metrics.messagesReceived++;
      this.metrics.bytesReceived += new Blob([event.data]).size;
      this.metrics.lastMessageTime = Date.now();

      // Call generic handler
      this.config.onMessage(sseEvent);

      // Call specific handler if registered
      const handler = this.eventHandlers[SSEEventType.MESSAGE];
      if (handler) {
        handler(sseEvent);
      }
    } catch (error) {
      this.handleParseError(error, event.data);
    }
  }

  private handleTypedEvent(eventType: string, event: any): void {
    try {
      const data = JSON.parse(event.data);
      const sseEvent: SSEEvent = {
        id: event.lastEventId,
        type: eventType,
        data,
        timestamp: Date.now()
      };

      // Update heartbeat for heartbeat events
      if (eventType === SSEEventType.HEARTBEAT) {
        this.lastHeartbeat = Date.now();
      }

      this.metrics.messagesReceived++;
      this.metrics.bytesReceived += new Blob([event.data]).size;

      // Call specific handler if registered
      const handler = this.eventHandlers[eventType];
      if (handler) {
        handler(sseEvent);
      }
    } catch (error) {
      this.handleParseError(error, event.data);
    }
  }

  private handleError(_event: Event): void {
    const error: SSEError = {
      type: SSEErrorType.CONNECTION,
      message: 'Connection error occurred',
      recoverable: this.reconnectAttempt < this.config.reconnectAttempts,
      timestamp: Date.now()
    };

    this.metrics.errorsReceived++;
    this.metrics.failedConnections++;
    this.config.onError(error);

    // Handle reconnection
    if (this.eventSource?.readyState === EventSource.CLOSED) {
      this.setState(SSEConnectionState.DISCONNECTED);
      
      if (this.config.reconnect && this.reconnectAttempt < this.config.reconnectAttempts) {
        this.scheduleReconnect();
      } else {
        this.setState(SSEConnectionState.ERROR);
        this.cleanup();
      }
    }
  }

  private handleConnectionError(error: any): void {
    const sseError: SSEError = {
      type: SSEErrorType.CONNECTION,
      message: error.message || 'Failed to establish connection',
      details: error,
      recoverable: true,
      timestamp: Date.now()
    };

    this.metrics.failedConnections++;
    this.config.onError(sseError);
    this.setState(SSEConnectionState.ERROR);

    if (this.config.reconnect && this.reconnectAttempt < this.config.reconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  private handleParseError(error: any, data: string): void {
    const sseError: SSEError = {
      type: SSEErrorType.PARSE,
      message: 'Failed to parse event data',
      details: { error, data },
      recoverable: true,
      timestamp: Date.now()
    };

    this.metrics.errorsReceived++;
    this.config.onError(sseError);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempt++;
    const delay = this.config.reconnectDelay * Math.pow(this.config.reconnectBackoff, this.reconnectAttempt - 1);
    
    this.setState(SSEConnectionState.RECONNECTING);
    this.config.onReconnecting(this.reconnectAttempt);

    console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt}/${this.config.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.cleanup();
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
      
      if (timeSinceLastHeartbeat > this.config.heartbeatInterval * 2) {
        console.warn('[SSE] Heartbeat timeout detected');
        this.handleError(new Event('heartbeat-timeout'));
      }
    }, this.config.heartbeatInterval);
  }

  private startPollingFallback(): void {
    console.log('[SSE] Using polling fallback');
    this.setState(SSEConnectionState.CONNECTED);
    
    const poll = async () => {
      try {
        const token = this.getAuthToken();
        const headers: HeadersInit = {
          'Accept': 'application/json',
          ...this.config.headers
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(this.config.url, {
          method: 'GET',
          headers,
          credentials: this.config.withCredentials ? 'include' : 'same-origin'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const sseEvent: SSEEvent = {
          type: SSEEventType.MESSAGE,
          data,
          timestamp: Date.now()
        };

        this.metrics.messagesReceived++;
        this.config.onMessage(sseEvent);

        // Call specific handler if registered
        const handler = this.eventHandlers[SSEEventType.MESSAGE];
        if (handler) {
          handler(sseEvent);
        }
      } catch (error) {
        this.handleConnectionError(error);
      }
    };

    // Initial poll
    poll();

    // Set up polling interval
    this.pollingTimer = setInterval(poll, this.config.pollingInterval);
  }

  private cleanup(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }
  }

  private setState(newState: SSEConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.stateHandlers.forEach(handler => handler(newState));
    }
  }

  private getAuthToken(): string | null {
    // Check for token in various locations
    if (typeof window !== 'undefined') {
      // Check localStorage
      const localToken = localStorage.getItem('auth-token');
      if (localToken) return localToken;

      // Check sessionStorage
      const sessionToken = sessionStorage.getItem('auth-token');
      if (sessionToken) return sessionToken;

      // Check cookies
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'auth-token') {
          return decodeURIComponent(value);
        }
      }
    }

    return null;
  }

  private isEventSourceSupported(): boolean {
    return typeof EventSource !== 'undefined';
  }

  private calculateLatency(): number {
    if (this.metrics.lastMessageTime && this.metrics.lastConnectionTime) {
      return this.metrics.lastMessageTime - this.metrics.lastConnectionTime;
    }
    return 0;
  }
}