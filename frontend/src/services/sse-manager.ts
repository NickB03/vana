/**
 * SSE Manager for ADK Integration
 * Handles SSE connection lifecycle with per-message connections
 */

import type {
  ISSEService,
  ConnectionState,
  ConnectionInfo,
  ADKRequestMessage,
  ConnectionError,
  MessageError,
  SSEConfig
} from '../types/adk-service';
import type { ADKSSEEvent } from '../types/adk-events';
import { EventEmitter } from '../utils/event-emitter';

interface SSERequest {
  id: string;
  message: ADKRequestMessage;
  startTime: number;
  abortController: AbortController;
}

export class SSEManager extends EventEmitter implements ISSEService {
  private connectionInfo: ConnectionInfo;
  private activeRequests = new Map<string, SSERequest>();
  private config: Required<SSEConfig>;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private performanceMetrics = {
    connectionTime: 0,
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0,
    reconnections: 0,
    responseTimesMs: [] as number[]
  };

  constructor(config: SSEConfig) {
    super();
    
    this.config = {
      maxRetries: 5,
      retryDelay: 1000,
      timeout: 30000,
      enableLogging: true,
      reconnectAttempts: 3,
      backoffMultiplier: 2,
      maxBackoffDelay: 30000,
      ...config
    };

    this.connectionInfo = {
      state: ConnectionState.DISCONNECTED,
      reconnectAttempts: 0
    };
  }

  /**
   * Initialize connection (for ADK, this just sets up the client)
   */
  public async connect(userId: string, sessionId: string): Promise<void> {
    if (this.connectionInfo.state === ConnectionState.CONNECTED) {
      this.log('Already connected');
      return;
    }

    this.log(`Connecting for user: ${userId}, session: ${sessionId}`);
    this.setConnectionState(ConnectionState.CONNECTING);

    try {
      // For ADK, we don't maintain persistent connections
      // This just validates the configuration and sets state
      await this.validateConnection();
      
      this.setConnectionState(ConnectionState.CONNECTED);
      this.connectionInfo.lastConnected = new Date();
      this.connectionInfo.reconnectAttempts = 0;
      
      this.emit('connected', { userId, sessionId });
      this.log('Connected successfully');
      
    } catch (error) {
      this.handleConnectionError(error as Error);
      throw new ConnectionError('Failed to connect', { userId, sessionId, error });
    }
  }

  /**
   * Send message via SSE with per-message connection
   */
  public async sendMessage(message: ADKRequestMessage): Promise<void> {
    if (this.connectionInfo.state !== ConnectionState.CONNECTED) {
      throw new ConnectionError('Not connected. Call connect() first.');
    }

    const requestId = this.generateRequestId();
    const abortController = new AbortController();
    
    const request: SSERequest = {
      id: requestId,
      message,
      startTime: Date.now(),
      abortController
    };

    this.activeRequests.set(requestId, request);
    this.performanceMetrics.messagesSent++;

    try {
      this.log(`Sending message (${requestId}):`, message);
      await this.processSSERequest(request);
      
    } catch (error) {
      this.performanceMetrics.errors++;
      this.handleMessageError(error as Error, requestId);
      throw new MessageError('Failed to send message', { requestId, error });
      
    } finally {
      this.activeRequests.delete(requestId);
      this.updateResponseTime(request.startTime);
    }
  }

  /**
   * Disconnect and cleanup
   */
  public disconnect(): void {
    this.log('Disconnecting');
    
    // Abort all active requests
    for (const request of this.activeRequests.values()) {
      request.abortController.abort();
    }
    this.activeRequests.clear();

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.setConnectionState(ConnectionState.DISCONNECTED);
    this.emit('disconnected');
  }

  /**
   * Get current connection information
   */
  public getConnectionInfo(): ConnectionInfo {
    return { ...this.connectionInfo };
  }

  /**
   * Process SSE request with streaming response
   */
  private async processSSERequest(request: SSERequest): Promise<void> {
    const url = `${this.config.apiUrl}/run_sse?alt=sse`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(request.message),
      signal: request.abortController.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    await this.processSSEStream(response, request);
  }

  /**
   * Process SSE stream from response
   */
  private async processSSEStream(response: Response, request: SSERequest): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      this.emit('stream_start', { requestId: request.id });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              this.emit('stream_complete', { requestId: request.id });
              return;
            }
            
            try {
              const event: ADKSSEEvent = JSON.parse(data);
              this.performanceMetrics.messagesReceived++;
              this.emit('adk_event', event, request.id);
              
            } catch (error) {
              this.log('Failed to parse SSE event:', error, 'Data:', data);
              this.emit('parse_error', { error, data, requestId: request.id });
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Validate connection configuration
   */
  private async validateConnection(): Promise<void> {
    // Simple health check to validate the API endpoint
    try {
      const response = await fetch(`${this.config.apiUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        timeout: 5000
      });
      
      // Don't throw if health check fails - ADK might not have this endpoint
      if (response.ok) {
        this.log('Health check passed');
      } else {
        this.log('Health check failed but continuing');
      }
    } catch (error) {
      this.log('Health check unavailable, continuing anyway');
    }
  }

  /**
   * Handle connection errors with retry logic
   */
  private handleConnectionError(error: Error): void {
    this.log('Connection error:', error.message);
    this.connectionInfo.error = error;
    this.performanceMetrics.errors++;

    if (this.connectionInfo.reconnectAttempts < this.config.reconnectAttempts) {
      this.scheduleReconnect();
    } else {
      this.setConnectionState(ConnectionState.ERROR);
      this.emit('connection_failed', error);
    }
  }

  /**
   * Handle message-specific errors
   */
  private handleMessageError(error: Error, requestId: string): void {
    this.log(`Message error (${requestId}):`, error.message);
    this.emit('message_error', { error, requestId });
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    this.setConnectionState(ConnectionState.RECONNECTING);
    this.connectionInfo.reconnectAttempts++;
    this.performanceMetrics.reconnections++;

    const delay = Math.min(
      this.config.retryDelay * Math.pow(this.config.backoffMultiplier, this.connectionInfo.reconnectAttempts - 1),
      this.config.maxBackoffDelay
    );

    this.log(`Scheduling reconnect in ${delay}ms (attempt ${this.connectionInfo.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.validateConnection();
        this.setConnectionState(ConnectionState.CONNECTED);
        this.connectionInfo.reconnectAttempts = 0;
        this.emit('reconnected');
        
      } catch (error) {
        this.handleConnectionError(error as Error);
      }
    }, delay);
  }

  /**
   * Set connection state and emit events
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionInfo.state !== state) {
      const previousState = this.connectionInfo.state;
      this.connectionInfo.state = state;
      
      this.emit('connection_state_change', { 
        previous: previousState, 
        current: state,
        timestamp: new Date()
      });
      
      this.log(`Connection state: ${previousState} → ${state}`);
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Update performance metrics
   */
  private updateResponseTime(startTime: number): void {
    const responseTime = Date.now() - startTime;
    this.performanceMetrics.responseTimesMs.push(responseTime);
    
    // Keep only last 100 response times
    if (this.performanceMetrics.responseTimesMs.length > 100) {
      this.performanceMetrics.responseTimesMs.shift();
    }
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics() {
    const responseTimes = this.performanceMetrics.responseTimesMs;
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    return {
      ...this.performanceMetrics,
      averageResponseTime: Math.round(averageResponseTime),
      activeRequests: this.activeRequests.size
    };
  }

  /**
   * Abort specific request
   */
  public abortRequest(requestId: string): void {
    const request = this.activeRequests.get(requestId);
    if (request) {
      request.abortController.abort();
      this.activeRequests.delete(requestId);
      this.log(`Aborted request: ${requestId}`);
    }
  }

  /**
   * Abort all active requests
   */
  public abortAllRequests(): void {
    for (const [requestId, request] of this.activeRequests.entries()) {
      request.abortController.abort();
    }
    this.activeRequests.clear();
    this.log('Aborted all active requests');
  }

  /**
   * Log with optional console output
   */
  private log(...args: any[]): void {
    if (this.config.enableLogging) {
      console.log('[SSEManager]', ...args);
    }
  }
}