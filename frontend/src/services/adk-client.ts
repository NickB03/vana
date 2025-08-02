/**
 * Unified ADK Client
 * Main service class that orchestrates all ADK integration components
 */

import type {
  IADKClient,
  ADKConfig,
  Session,
  MessageMetadata,
  ConnectionInfo,
  ConnectionState,
  ADKEvent
} from '../types/adk-service';
import type { UIEvent, ADKSSEEvent } from '../types/adk-events';

import { EventEmitter } from '../utils/event-emitter';
import { SessionService } from './session-service';
import { SSEManager } from './sse-manager';
import { MessageTransformer } from './message-transformer';
import { EventStore } from './event-store';

export class ADKClient extends EventEmitter implements IADKClient {
  private sessionService: SessionService;
  private sseManager: SSEManager;
  private messageTransformer: MessageTransformer;
  private eventStore: EventStore;
  private config: ADKConfig;
  private initialized = false;
  private currentUserId: string | null = null;

  constructor(config: ADKConfig) {
    super();
    
    this.config = {
      maxRetries: 5,
      retryDelay: 1000,
      timeout: 30000,
      enableLogging: true,
      ...config
    };

    // Initialize services
    this.sessionService = new SessionService(this.config);
    this.sseManager = new SSEManager(this.config);
    this.messageTransformer = new MessageTransformer();
    this.eventStore = new EventStore({
      debugMode: this.config.enableLogging,
      maxEvents: 10000
    });

    this.setupEventHandlers();
    this.log('ADK Client initialized');
  }

  /**
   * Initialize the client for a specific user
   */
  public async initialize(userId: string): Promise<void> {
    if (this.initialized && this.currentUserId === userId) {
      this.log('Already initialized for user:', userId);
      return;
    }

    this.log('Initializing for user:', userId);
    this.currentUserId = userId;

    try {
      // Get or create session
      const session = await this.sessionService.getOrCreateSession(userId);
      this.log('Session ready:', session.id);

      // Initialize SSE connection
      await this.sseManager.connect(userId, session.id);
      this.log('SSE connection ready');

      this.initialized = true;
      
      // Emit initialization complete
      this.emit('initialized', { userId, sessionId: session.id });
      
      // Add system event
      this.addSystemEvent('client_initialized', {
        userId,
        sessionId: session.id,
        timestamp: Date.now()
      });

    } catch (error) {
      this.log('Initialization error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Send a message to the ADK backend
   */
  public async sendMessage(content: string, metadata?: MessageMetadata): Promise<void> {
    if (!this.initialized) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    if (!content.trim()) {
      throw new Error('Message content cannot be empty.');
    }

    this.log('Sending message:', content);

    try {
      // Get current session
      const session = this.sessionService.getCurrentSession();
      if (!session) {
        throw new Error('No active session. Please reinitialize.');
      }

      // Create ADK message
      const adkMessage = this.messageTransformer.createUserMessage(content, session, metadata);
      
      // Add send event
      this.addSystemEvent('message_sent', {
        messageId: adkMessage.metadata?.messageId,
        contentLength: content.length,
        sessionId: session.id
      });

      // Send via SSE
      await this.sseManager.sendMessage(adkMessage);
      
      this.log('Message sent successfully');

    } catch (error) {
      this.log('Send message error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disconnect the client
   */
  public disconnect(): void {
    this.log('Disconnecting client');
    
    // Disconnect SSE
    this.sseManager.disconnect();
    
    // Clear session if needed
    this.sessionService.clearSession();
    
    this.initialized = false;
    this.currentUserId = null;
    
    this.emit('disconnected');
    
    this.addSystemEvent('client_disconnected', {
      timestamp: Date.now()
    });
  }

  /**
   * Get current connection information
   */
  public getConnectionInfo(): ConnectionInfo {
    return this.sseManager.getConnectionInfo();
  }

  /**
   * Get current session
   */
  public getCurrentSession(): Session | null {
    return this.sessionService.getCurrentSession();
  }

  /**
   * Check if client is connected and ready
   */
  public isConnected(): boolean {
    return this.initialized && this.getConnectionInfo().state === ConnectionState.CONNECTED;
  }

  /**
   * Get performance and debug information
   */
  public getDebugInfo() {
    return {
      initialized: this.initialized,
      userId: this.currentUserId,
      session: this.getCurrentSession(),
      connection: this.getConnectionInfo(),
      performance: this.sseManager.getPerformanceMetrics(),
      events: this.eventStore.getDebugInfo()
    };
  }

  /**
   * Refresh current session
   */
  public async refreshSession(): Promise<void> {
    const session = this.getCurrentSession();
    if (!session) {
      throw new Error('No active session to refresh');
    }

    try {
      const refreshedSession = await this.sessionService.refreshSession(session);
      this.log('Session refreshed:', refreshedSession.id);
      
      this.addSystemEvent('session_refreshed', {
        sessionId: refreshedSession.id,
        userId: refreshedSession.userId
      });
      
    } catch (error) {
      this.log('Session refresh error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get event history for current session
   */
  public getEventHistory(): ADKEvent[] {
    const session = this.getCurrentSession();
    if (!session) return [];
    
    return this.eventStore.getEventHistory(session.id);
  }

  /**
   * Subscribe to specific event types
   */
  public subscribeToEvents(
    eventTypes: string[],
    callback: (event: ADKEvent) => void
  ): () => void {
    const unsubscribeFunctions: (() => void)[] = [];

    for (const eventType of eventTypes) {
      const unsubscribe = this.eventStore.subscribe(
        callback,
        { type: eventType as any }
      );
      unsubscribeFunctions.push(unsubscribe);
    }

    // Return combined unsubscribe function
    return () => {
      unsubscribeFunctions.forEach(fn => fn());
    };
  }

  /**
   * Clear all stored events
   */
  public clearEventHistory(): void {
    this.eventStore.clearEvents();
    this.log('Event history cleared');
  }

  /**
   * Setup event handlers for internal services
   */
  private setupEventHandlers(): void {
    // SSE Manager events
    this.sseManager.on('connected', (data) => {
      this.emit('connected', data);
      this.addSystemEvent('sse_connected', data);
    });

    this.sseManager.on('disconnected', () => {
      this.emit('disconnected');
      this.addSystemEvent('sse_disconnected', {});
    });

    this.sseManager.on('reconnected', () => {
      this.emit('reconnected');
      this.addSystemEvent('sse_reconnected', {});
    });

    this.sseManager.on('connection_state_change', (data) => {
      this.emit('connection_change', data);
      this.addSystemEvent('connection_state_change', data);
    });

    this.sseManager.on('adk_event', (event: ADKSSEEvent, requestId: string) => {
      this.handleADKEvent(event, requestId);
    });

    this.sseManager.on('stream_start', (data) => {
      this.emit('stream_start', data);
      this.addSystemEvent('stream_start', data);
    });

    this.sseManager.on('stream_complete', (data) => {
      this.emit('stream_complete', data);
      this.addSystemEvent('stream_complete', data);
    });

    this.sseManager.on('message_error', (data) => {
      this.emit('message_error', data);
      this.addSystemEvent('message_error', data);
    });

    this.sseManager.on('parse_error', (data) => {
      this.emit('parse_error', data);
      this.addSystemEvent('parse_error', data);
    });

    // Forward UI events from event processing
    this.eventStore.subscribe((event: ADKEvent) => {
      if (event.type.startsWith('ui:')) {
        this.emit(event.type.replace('ui:', ''), event.data);
      }
    });
  }

  /**
   * Handle ADK events from SSE stream
   */
  private handleADKEvent(adkEvent: ADKSSEEvent, requestId: string): void {
    try {
      // Transform ADK event to UI events
      const uiEvents = this.messageTransformer.transformADKEvent(adkEvent);
      
      // Process each UI event
      for (const uiEvent of uiEvents) {
        this.processUIEvent(uiEvent, requestId);
      }

      // Store original ADK event
      this.addSystemEvent('adk_event_received', {
        requestId,
        author: adkEvent.author,
        hasContent: !!adkEvent.content,
        hasActions: !!adkEvent.actions,
        timestamp: Date.now()
      });

    } catch (error) {
      this.log('Error handling ADK event:', error);
      this.emit('error', error);
    }
  }

  /**
   * Process transformed UI events
   */
  private processUIEvent(uiEvent: UIEvent, requestId: string): void {
    // Emit the UI event
    this.emit(uiEvent.type, uiEvent.data);

    // Store as ADK event
    const adkEvent: ADKEvent = {
      id: this.generateEventId(),
      type: `ui:${uiEvent.type}` as any,
      timestamp: Date.now(),
      sessionId: this.getCurrentSession()?.id || 'unknown',
      data: {
        ...uiEvent.data,
        requestId
      }
    };

    this.eventStore.addEvent(adkEvent);
  }

  /**
   * Add system event to store
   */
  private addSystemEvent(eventType: string, data: any): void {
    const event: ADKEvent = {
      id: this.generateEventId(),
      type: `system:${eventType}` as any,
      timestamp: Date.now(),
      sessionId: this.getCurrentSession()?.id || 'system',
      data
    };

    this.eventStore.addEvent(event);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Log with configuration check
   */
  private log(...args: any[]): void {
    if (this.config.enableLogging) {
      console.log('[ADKClient]', ...args);
    }
  }
}