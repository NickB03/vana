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
    let response: Response;
    
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(request.message),
        signal: request.abortController.signal
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          this.log(`Request ${request.id} was aborted`);
          throw new Error('Request was cancelled');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          this.emit('network_error', { 
            requestId: request.id, 
            error: 'Network connection failed. Please check your internet connection.' 
          });
          throw new Error('Network connection failed. Please check your internet connection.');
        }
      }
      this.emit('request_error', { requestId: request.id, error });
      throw new Error(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    if (!response.ok) {
      let errorText = 'Unknown server error';
      try {
        errorText = await response.text();
      } catch (e) {
        this.log('Failed to read error response body');
      }

      const errorMessage = this.getErrorMessage(response.status, errorText);
      this.emit('http_error', { 
        requestId: request.id, 
        status: response.status, 
        message: errorMessage 
      });
      throw new Error(errorMessage);
    }

    try {
      await this.processSSEStream(response, request);
    } catch (error) {
      this.emit('stream_error', { requestId: request.id, error });
      throw error;
    }
  }

  /**
   * Process SSE stream from response
   */
  private async processSSEStream(response: Response, request: SSERequest): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      const error = new Error('No response body available');
      this.emit('stream_error', { requestId: request.id, error: error.message });
      throw error;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let isStreamCompleted = false;

    try {
      this.emit('stream_start', { requestId: request.id });

      while (!isStreamCompleted) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            if (!isStreamCompleted) {
              this.emit('stream_incomplete', { requestId: request.id });
              this.log(`Stream ended unexpectedly for request ${request.id}`);
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line

          for (const line of lines) {
            if (line.trim() === '') continue;
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                isStreamCompleted = true;
                this.emit('stream_complete', { requestId: request.id });
                return;
              }
              
              try {
                const event: ADKSSEEvent = JSON.parse(data);
                this.performanceMetrics.messagesReceived++;
                this.emit('adk_event', event, request.id);
                
              } catch (parseError) {
                this.log('Failed to parse SSE event:', parseError, 'Data:', data);
                this.emit('parse_error', { 
                  error: parseError, 
                  data, 
                  requestId: request.id,
                  message: 'Failed to parse server response. The data may be corrupted.'
                });
                // Continue processing other events instead of failing completely
              }
            } else if (line.startsWith('event: ') || line.startsWith('id: ')) {
              // Handle other SSE fields if needed
              this.log('SSE metadata:', line);
            }
          }
        } catch (readError) {
          if (readError instanceof Error && readError.name === 'AbortError') {
            this.log(`Stream reading aborted for request ${request.id}`);
            return;
          }
          
          this.emit('stream_read_error', { 
            requestId: request.id, 
            error: readError,
            message: 'Error reading from server stream. Connection may have been interrupted.'
          });
          throw new Error(`Stream reading failed: ${readError instanceof Error ? readError.message : 'Unknown error'}`);
        }
      }
    } finally {
      try {
        reader.releaseLock();
      } catch (e) {
        this.log('Warning: Failed to release reader lock:', e);
      }
    }
  }

  /**
   * Get user-friendly error message based on HTTP status
   */
  private getErrorMessage(status: number, errorText: string): string {
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication failed. Please log in again.';
      case 403:
        return 'Access denied. You don\'t have permission to perform this action.';
      case 404:
        return 'Service not found. The requested endpoint may be unavailable.';
      case 429:
        return 'Too many requests. Please wait a moment before trying again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again in a few minutes.';
      default:
        return `Server error (${status}): ${errorText || 'Unknown error occurred'}`;
    }
  }

  /**
   * Validate connection configuration
   */
  private async validateConnection(): Promise<void> {
    // Enhanced health check with better error handling
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.config.apiUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        this.log('Health check passed');
        const healthData = await response.json().catch(() => ({}));
        this.emit('health_check_success', healthData);
      } else {
        this.log(`Health check failed with status ${response.status}, but continuing`);
        this.emit('health_check_warning', { status: response.status });
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          this.log('Health check timed out, continuing anyway');
          this.emit('health_check_timeout');
        } else {
          this.log('Health check unavailable:', error.message, ', continuing anyway');
          this.emit('health_check_unavailable', { error: error.message });
        }
      } else {
        this.log('Health check failed with unknown error, continuing anyway');
        this.emit('health_check_unavailable', { error: 'Unknown error' });
      }
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