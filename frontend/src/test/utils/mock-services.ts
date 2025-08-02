/**
 * Mock Services
 * 
 * Mock implementations of services for testing
 */

import { vi } from 'vitest';
import type { 
  IADKClient, 
  ISSEService, 
  ISessionService, 
  IMessageTransformer, 
  IEventStore,
  ADKConfig,
  SSEConfig,
  Session,
  MessageMetadata,
  ADKRequestMessage,
  ConnectionInfo,
  ConnectionState,
  ADKEvent
} from '@/types/adk-service';
import type { ADKSSEEvent, UIEvent } from '@/types/adk-events';

// Mock ADK Client
export class MockADKClient implements IADKClient {
  private initialized = false;
  private currentUserId: string | null = null;
  private events = new Map<string, (...args: any[]) => void>();

  constructor(private config: ADKConfig) {}

  async initialize(userId: string): Promise<void> {
    this.initialized = true;
    this.currentUserId = userId;
    this.emit('initialized', { userId });
  }

  async sendMessage(content: string, metadata?: MessageMetadata): Promise<void> {
    if (!this.initialized) {
      throw new Error('Client not initialized');
    }
    
    this.emit('message_sent', { content, metadata });
    
    // Simulate async response
    setTimeout(() => {
      this.emit('message_received', {
        content: `Echo: ${content}`,
        timestamp: new Date().toISOString(),
      });
    }, 100);
  }

  disconnect(): void {
    this.initialized = false;
    this.currentUserId = null;
    this.emit('disconnected');
  }

  getConnectionInfo(): ConnectionInfo {
    return {
      state: this.initialized ? ConnectionState.CONNECTED : ConnectionState.DISCONNECTED,
      reconnectAttempts: 0,
    };
  }

  getCurrentSession(): Session | null {
    if (!this.initialized) return null;
    
    return {
      id: 'mock_session_123',
      userId: this.currentUserId!,
      title: 'Mock Session',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  isConnected(): boolean {
    return this.initialized;
  }

  getDebugInfo() {
    return {
      initialized: this.initialized,
      userId: this.currentUserId,
      session: this.getCurrentSession(),
      connection: this.getConnectionInfo(),
      performance: {
        connectionTime: 100,
        messagesSent: 5,
        messagesReceived: 3,
        errors: 0,
      },
      events: {
        eventCount: 10,
        oldestEvent: Date.now() - 10000,
        newestEvent: Date.now(),
      },
    };
  }

  async refreshSession(): Promise<void> {
    if (!this.getCurrentSession()) {
      throw new Error('No active session to refresh');
    }
    this.emit('session_refreshed');
  }

  getEventHistory(): ADKEvent[] {
    return [
      {
        id: 'evt_123',
        type: 'system:client_initialized',
        timestamp: Date.now(),
        sessionId: 'mock_session_123',
        data: { userId: this.currentUserId },
      },
    ];
  }

  subscribeToEvents(eventTypes: string[], callback: (event: ADKEvent) => void): () => void {
    const unsubscribeFunctions: (() => void)[] = [];

    eventTypes.forEach(eventType => {
      const key = `event_${eventType}`;
      this.events.set(key, callback);
      
      unsubscribeFunctions.push(() => {
        this.events.delete(key);
      });
    });

    return () => {
      unsubscribeFunctions.forEach(fn => fn());
    };
  }

  clearEventHistory(): void {
    this.emit('events_cleared');
  }

  // Event emitter methods
  on(event: string, listener: (...args: any[]) => void): void {
    this.events.set(event, listener);
  }

  emit(event: string, ...args: any[]): void {
    const listener = this.events.get(event);
    if (listener) {
      listener(...args);
    }
  }

  off(event: string): void {
    this.events.delete(event);
  }
}

// Mock SSE Manager
export class MockSSEManager implements ISSEService {
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private events = new Map<string, (...args: any[]) => void>();
  private performanceMetrics = {
    connectionTime: 100,
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0,
    reconnections: 0,
    responseTimesMs: [],
  };

  constructor(private config: SSEConfig) {}

  async connect(userId: string, sessionId: string): Promise<void> {
    this.connectionState = ConnectionState.CONNECTED;
    this.emit('connected', { userId, sessionId });
  }

  async sendMessage(message: ADKRequestMessage): Promise<void> {
    if (this.connectionState !== ConnectionState.CONNECTED) {
      throw new Error('Not connected');
    }

    this.performanceMetrics.messagesSent++;
    this.emit('message_sent', message);

    // Simulate async response
    setTimeout(() => {
      const mockEvent: ADKSSEEvent = {
        author: 'mock_agent',
        content: `Response to: ${message.new_message.parts[0].text}`,
        timestamp: new Date().toISOString(),
      };
      
      this.performanceMetrics.messagesReceived++;
      this.emit('adk_event', mockEvent, 'mock_request_id');
    }, 50);
  }

  disconnect(): void {
    this.connectionState = ConnectionState.DISCONNECTED;
    this.emit('disconnected');
  }

  getConnectionInfo(): ConnectionInfo {
    return {
      state: this.connectionState,
      reconnectAttempts: 0,
      url: this.config.baseUrl || 'http://localhost:8081/sse',
    };
  }

  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  // Event emitter methods
  on(event: string, listener: (...args: any[]) => void): void {
    this.events.set(event, listener);
  }

  emit(event: string, ...args: any[]): void {
    const listener = this.events.get(event);
    if (listener) {
      listener(...args);
    }
  }

  off(event: string): void {
    this.events.delete(event);
  }
}

// Mock Session Service
export class MockSessionService implements ISessionService {
  private currentSession: Session | null = null;

  async getOrCreateSession(userId: string): Promise<Session> {
    if (!this.currentSession) {
      this.currentSession = {
        id: `session_${Date.now()}`,
        userId,
        title: 'Mock Session',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return this.currentSession;
  }

  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  async refreshSession(session: Session): Promise<Session> {
    if (!session) {
      throw new Error('No session to refresh');
    }

    const refreshedSession = {
      ...session,
      updatedAt: new Date().toISOString(),
    };

    this.currentSession = refreshedSession;
    return refreshedSession;
  }

  clearSession(): void {
    this.currentSession = null;
  }
}

// Mock Message Transformer
export class MockMessageTransformer implements IMessageTransformer {
  createUserMessage(
    content: string,
    session: Session,
    metadata?: MessageMetadata
  ): ADKRequestMessage {
    return {
      app_name: 'app',
      user_id: session.userId,
      session_id: session.id,
      new_message: {
        role: 'user',
        parts: [{ text: content }],
      },
      streaming: true,
      metadata: {
        messageId: metadata?.messageId || `msg_${Date.now()}`,
        timestamp: metadata?.timestamp || Date.now(),
        clientVersion: '1.0.0',
        ...metadata,
      },
    };
  }

  transformADKEvent(event: ADKSSEEvent): UIEvent[] {
    const uiEvents: UIEvent[] = [];

    // Transform content
    if (event.content) {
      uiEvents.push({
        type: 'content_update',
        data: {
          agent: event.author,
          content: event.content,
          timestamp: event.timestamp,
        },
      });
    }

    // Transform thinking
    if (event.actions) {
      event.actions.forEach(action => {
        if (action.function_name === 'thinking') {
          try {
            const params = JSON.parse(action.function_parameters);
            uiEvents.push({
              type: 'thinking_update',
              data: {
                agent: event.author,
                reasoning: params.reasoning,
                step: params.step,
                timestamp: event.timestamp,
              },
            });
          } catch (error) {
            // Ignore malformed action parameters
          }
        }
      });
    }

    return uiEvents;
  }
}

// Mock Event Store
export class MockEventStore implements IEventStore {
  private events: ADKEvent[] = [];
  private subscriptions = new Map<string, (event: ADKEvent) => void>();
  private nextSubscriptionId = 1;

  addEvent(event: ADKEvent): void {
    this.events.push(event);
    
    // Notify subscribers
    this.subscriptions.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Subscription callback error:', error);
      }
    });
  }

  getEvents(filter?: any): ADKEvent[] {
    let filtered = [...this.events];

    if (filter) {
      if (filter.type) {
        filtered = filtered.filter(event => event.type === filter.type);
      }
      if (filter.sessionId) {
        filtered = filtered.filter(event => event.sessionId === filter.sessionId);
      }
      if (filter.timeRange) {
        filtered = filtered.filter(event => 
          event.timestamp >= filter.timeRange.start &&
          event.timestamp <= filter.timeRange.end
        );
      }
    }

    return filtered;
  }

  getEventHistory(sessionId: string): ADKEvent[] {
    return this.events.filter(event => event.sessionId === sessionId);
  }

  subscribe(callback: (event: ADKEvent) => void, filter?: any): () => void {
    const subscriptionId = `sub_${this.nextSubscriptionId++}`;
    
    const wrappedCallback = (event: ADKEvent) => {
      // Apply filter if provided
      if (filter) {
        if (filter.type && event.type !== filter.type) return;
        if (filter.sessionId && event.sessionId !== filter.sessionId) return;
      }
      
      callback(event);
    };

    this.subscriptions.set(subscriptionId, wrappedCallback);

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(subscriptionId);
    };
  }

  clearEvents(): void {
    this.events = [];
  }

  getDebugInfo() {
    return {
      eventCount: this.events.length,
      subscriptionCount: this.subscriptions.size,
      oldestEvent: this.events.length > 0 ? this.events[0].timestamp : null,
      newestEvent: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : null,
      memoryUsage: {
        eventsSize: this.events.length * 1000, // Rough estimate
        subscriptionsSize: this.subscriptions.size * 100,
        totalEstimatedSize: (this.events.length * 1000) + (this.subscriptions.size * 100),
      },
    };
  }
}

// Factory functions for creating mocks
export const createMockADKClient = (config?: Partial<ADKConfig>) => {
  const defaultConfig: ADKConfig = {
    baseUrl: 'http://localhost:8081',
    apiKey: 'mock-api-key',
    enableLogging: false,
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000,
  };

  return new MockADKClient({ ...defaultConfig, ...config });
};

export const createMockSSEManager = (config?: Partial<SSEConfig>) => {
  const defaultConfig: SSEConfig = {
    baseUrl: 'http://localhost:8081',
    enableLogging: false,
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000,
    reconnectAttempts: 3,
    backoffMultiplier: 2,
    maxBackoffDelay: 30000,
  };

  return new MockSSEManager({ ...defaultConfig, ...config });
};

export const createMockSessionService = () => new MockSessionService();
export const createMockMessageTransformer = () => new MockMessageTransformer();
export const createMockEventStore = () => new MockEventStore();

// Mock service factory
export const createMockServices = (overrides?: {
  adkClient?: Partial<ADKConfig>;
  sseManager?: Partial<SSEConfig>;
}) => ({
  adkClient: createMockADKClient(overrides?.adkClient),
  sseManager: createMockSSEManager(overrides?.sseManager),
  sessionService: createMockSessionService(),
  messageTransformer: createMockMessageTransformer(),
  eventStore: createMockEventStore(),
});

// Vitest mock helpers
export const mockADKClientModule = () => {
  vi.mock('@/services/adk-client', () => ({
    ADKClient: vi.fn().mockImplementation((config: ADKConfig) => createMockADKClient(config)),
  }));
};

export const mockSSEManagerModule = () => {
  vi.mock('@/services/sse-manager', () => ({
    SSEManager: vi.fn().mockImplementation((config: SSEConfig) => createMockSSEManager(config)),
  }));
};

export const mockAllServiceModules = () => {
  mockADKClientModule();
  mockSSEManagerModule();
  
  vi.mock('@/services/session-service', () => ({
    SessionService: vi.fn().mockImplementation(() => createMockSessionService()),
  }));

  vi.mock('@/services/message-transformer', () => ({
    MessageTransformer: vi.fn().mockImplementation(() => createMockMessageTransformer()),
  }));

  vi.mock('@/services/event-store', () => ({
    EventStore: vi.fn().mockImplementation(() => createMockEventStore()),
  }));
};