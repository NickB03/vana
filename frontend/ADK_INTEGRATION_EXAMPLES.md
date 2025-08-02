# ADK Integration Code Examples

## 1. Complete ADK Manager Implementation

```typescript
// services/adk/adk-manager.ts
import { EventEmitter } from 'events';
import type { 
  ADKConfig, 
  Session, 
  ADKMessage, 
  ADKEvent,
  MessageMetadata 
} from '../types';

export class ADKManager extends EventEmitter {
  private config: ADKConfig;
  private sessionManager: SessionManager;
  private sseClient: SSEClient;
  private eventProcessor: EventProcessor;
  private errorHandler: ADKErrorHandler;
  private isInitialized = false;

  constructor(config: ADKConfig) {
    super();
    this.config = config;
    this.sessionManager = new SessionManager(config);
    this.sseClient = new SSEClient(config);
    this.eventProcessor = new EventProcessor();
    this.errorHandler = new ADKErrorHandler(config.errorHandling);
    
    this.setupEventHandlers();
  }

  async initialize(userId: string = 'default_user'): Promise<void> {
    if (this.isInitialized) {
      console.log('[ADKManager] Already initialized');
      return;
    }

    try {
      // Get or create session
      const session = await this.sessionManager.getOrCreateSession(userId);
      
      // Initialize SSE connection
      await this.sseClient.connect(session.id, userId);
      
      this.isInitialized = true;
      this.emit('initialized', { session });
    } catch (error) {
      this.emit('error', { 
        type: 'initialization_failed', 
        error 
      });
      throw error;
    }
  }

  async sendMessage(
    content: string, 
    metadata?: MessageMetadata
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('ADKManager not initialized. Call initialize() first.');
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Get current session
      const session = await this.sessionManager.getCurrentSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Transform message to ADK format
      const adkMessage = this.createADKMessage(content, session, messageId, metadata);
      
      // Send via SSE client
      await this.sseClient.sendMessage(adkMessage);
      
      return messageId;
    } catch (error) {
      await this.errorHandler.handle(error, {
        operation: 'sendMessage',
        messageId,
        content
      });
      throw error;
    }
  }

  private createADKMessage(
    content: string,
    session: Session,
    messageId: string,
    metadata?: MessageMetadata
  ): ADKMessage {
    return {
      app_name: 'app',
      user_id: session.userId,
      session_id: session.id,
      new_message: {
        role: 'user',
        parts: [{ text: content }]
      },
      streaming: true,
      metadata: {
        message_id: messageId,
        client_timestamp: Date.now(),
        client_version: this.config.clientVersion,
        ...metadata
      }
    };
  }

  private setupEventHandlers(): void {
    // SSE Events
    this.sseClient.on('event', async (rawEvent) => {
      try {
        const events = await this.eventProcessor.process(rawEvent);
        events.forEach(event => this.emit(event.type, event));
      } catch (error) {
        this.emit('error', { type: 'event_processing_failed', error });
      }
    });

    // Connection events
    this.sseClient.on('connected', () => {
      this.emit('connection:change', { status: 'connected' });
    });

    this.sseClient.on('disconnected', () => {
      this.emit('connection:change', { status: 'disconnected' });
    });

    // Session events
    this.sessionManager.on('session:created', (session) => {
      this.emit('session:created', session);
    });

    this.sessionManager.on('session:expired', async () => {
      this.emit('session:expired');
      // Auto-refresh session
      await this.refreshSession();
    });
  }

  async refreshSession(): Promise<void> {
    try {
      const currentSession = await this.sessionManager.getCurrentSession();
      if (!currentSession) return;

      const newSession = await this.sessionManager.refreshSession(currentSession);
      await this.sseClient.updateSession(newSession);
      
      this.emit('session:refreshed', newSession);
    } catch (error) {
      this.emit('error', { type: 'session_refresh_failed', error });
    }
  }

  disconnect(): void {
    this.sseClient.disconnect();
    this.sessionManager.clearSession();
    this.isInitialized = false;
    this.emit('disconnected');
  }
}
```

## 2. Event Processor with Agent Detection

```typescript
// services/adk/event-processor.ts
export class EventProcessor {
  private transformers: Map<string, EventTransformer> = new Map();
  
  constructor() {
    this.registerTransformers();
  }

  async process(rawEvent: ADKSSEEvent): Promise<ADKEvent[]> {
    const events: ADKEvent[] = [];
    
    // Detect event type and process accordingly
    if (this.isAgentEvent(rawEvent)) {
      events.push(...await this.processAgentEvent(rawEvent));
    }
    
    if (this.hasContent(rawEvent)) {
      events.push(...await this.processContentEvent(rawEvent));
    }
    
    if (this.hasWorkflowUpdate(rawEvent)) {
      events.push(...await this.processWorkflowEvent(rawEvent));
    }
    
    if (this.hasUsageMetadata(rawEvent)) {
      events.push(await this.processUsageEvent(rawEvent));
    }
    
    return events;
  }

  private isAgentEvent(event: ADKSSEEvent): boolean {
    return event.author !== undefined && event.author !== 'user';
  }

  private hasContent(event: ADKSSEEvent): boolean {
    return event.content?.parts !== undefined && event.content.parts.length > 0;
  }

  private hasWorkflowUpdate(event: ADKSSEEvent): boolean {
    return event.actions?.stateDelta !== undefined;
  }

  private hasUsageMetadata(event: ADKSSEEvent): boolean {
    return event.usageMetadata !== undefined;
  }

  private async processAgentEvent(event: ADKSSEEvent): Promise<ADKEvent[]> {
    const events: ADKEvent[] = [];
    
    // Extract agent information
    const agent = event.author!;
    const action = this.extractAgentAction(event);
    const stepId = `step_${agent}_${Date.now()}`;
    
    // Create thinking update event
    events.push({
      id: stepId,
      type: ADKEventType.AGENT_THINKING,
      timestamp: Date.now(),
      sessionId: event.sessionId || '',
      data: {
        stepId,
        agent: this.getAgentDisplayName(agent),
        action,
        status: 'active',
        rawAgent: agent
      }
    });
    
    // If agent has function calls, create additional events
    if (event.content?.parts) {
      for (const part of event.content.parts) {
        if (part.functionCall) {
          events.push({
            id: `func_${part.functionCall.id}`,
            type: ADKEventType.AGENT_ACTION,
            timestamp: Date.now(),
            sessionId: event.sessionId || '',
            data: {
              agent,
              function: part.functionCall.name,
              args: part.functionCall.args,
              stepId
            }
          });
        }
      }
    }
    
    return events;
  }

  private async processContentEvent(event: ADKSSEEvent): Promise<ADKEvent[]> {
    const events: ADKEvent[] = [];
    
    for (const part of event.content!.parts) {
      if (part.text) {
        const isPartial = event.partial === true;
        
        events.push({
          id: `content_${Date.now()}`,
          type: isPartial ? ADKEventType.MESSAGE_CHUNK : ADKEventType.MESSAGE_COMPLETE,
          timestamp: Date.now(),
          sessionId: event.sessionId || '',
          data: {
            content: part.text,
            isPartial,
            author: event.author || 'assistant'
          }
        });
      }
    }
    
    return events;
  }

  private async processWorkflowEvent(event: ADKSSEEvent): Promise<ADKEvent[]> {
    const events: ADKEvent[] = [];
    const stateDelta = event.actions!.stateDelta!;
    
    if (stateDelta.research_plan) {
      events.push({
        id: `plan_${Date.now()}`,
        type: ADKEventType.PLAN_GENERATED,
        timestamp: Date.now(),
        sessionId: event.sessionId || '',
        data: {
          plan: stateDelta.research_plan,
          isRefinement: this.isRefinedPlan(stateDelta.research_plan)
        }
      });
    }
    
    if (stateDelta.final_report_with_citations) {
      events.push({
        id: `report_${Date.now()}`,
        type: ADKEventType.RESEARCH_COMPLETE,
        timestamp: Date.now(),
        sessionId: event.sessionId || '',
        data: {
          report: stateDelta.final_report_with_citations,
          sources: stateDelta.sources || [],
          urlMapping: stateDelta.url_to_short_id || {}
        }
      });
    }
    
    return events;
  }

  private extractAgentAction(event: ADKSSEEvent): string {
    // Try to extract meaningful action from content
    if (event.content?.parts) {
      for (const part of event.content.parts) {
        if (part.text) {
          // Extract first line or meaningful action
          const lines = part.text.split('\n');
          const firstLine = lines[0].trim();
          
          if (firstLine.length > 0 && firstLine.length <= 100) {
            return firstLine;
          }
          
          // Look for action patterns
          const actionMatch = part.text.match(/^(Searching|Analyzing|Generating|Evaluating|Creating|Composing)/i);
          if (actionMatch) {
            return actionMatch[0] + '...';
          }
        }
        
        if (part.functionCall) {
          return this.getFunctionDescription(part.functionCall.name);
        }
      }
    }
    
    return 'Processing';
  }

  private getAgentDisplayName(agent: string): string {
    const displayNames: Record<string, string> = {
      'interactive_planner_agent': 'Research Planner',
      'plan_generator': 'Plan Generator',
      'section_planner': 'Section Planner',
      'section_researcher': 'Researcher',
      'research_evaluator': 'Quality Evaluator',
      'enhanced_search_executor': 'Search Expert',
      'report_composer_with_citations': 'Report Composer',
      'research_pipeline': 'Research Pipeline',
      'iterative_refinement_loop': 'Refinement Loop',
      'escalation_checker': 'Completion Checker'
    };
    
    return displayNames[agent] || agent;
  }

  private getFunctionDescription(functionName: string): string {
    const descriptions: Record<string, string> = {
      'google_search': 'Searching the web',
      'analyze_content': 'Analyzing content',
      'generate_plan': 'Generating research plan',
      'compose_report': 'Composing report',
      'evaluate_quality': 'Evaluating quality'
    };
    
    return descriptions[functionName] || `Executing ${functionName}`;
  }

  private isRefinedPlan(plan: string): boolean {
    return plan.includes('[MODIFIED]') || plan.includes('[NEW]');
  }
}
```

## 3. React Hook Implementation

```typescript
// hooks/useADK.ts
import { useContext, useEffect, useReducer, useCallback, useRef } from 'react';
import { ADKContext } from '../contexts/ADKContext';
import type { ADKState, ADKAction, MessageOptions } from '../types';

const initialState: ADKState = {
  status: 'disconnected',
  session: null,
  messages: [],
  activeAgents: [],
  currentPlan: null,
  isProcessing: false,
  error: null
};

function adkReducer(state: ADKState, action: ADKAction): ADKState {
  switch (action.type) {
    case 'CONNECTION_CHANGE':
      return {
        ...state,
        status: action.payload.status,
        error: action.payload.status === 'error' ? action.payload.error : null
      };
    
    case 'SESSION_CREATED':
      return {
        ...state,
        session: action.payload
      };
    
    case 'MESSAGE_SENT':
      return {
        ...state,
        messages: [...state.messages, {
          id: action.payload.id,
          content: action.payload.content,
          role: 'user',
          timestamp: Date.now()
        }],
        isProcessing: true
      };
    
    case 'MESSAGE_CHUNK':
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage?.role === 'assistant' && !lastMessage.isComplete) {
        const updatedMessages = [...state.messages];
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMessage,
          content: lastMessage.content + action.payload.content
        };
        return { ...state, messages: updatedMessages };
      } else {
        return {
          ...state,
          messages: [...state.messages, {
            id: action.payload.id,
            content: action.payload.content,
            role: 'assistant',
            timestamp: Date.now(),
            isComplete: false
          }]
        };
      }
    
    case 'MESSAGE_COMPLETE':
      const messages = [...state.messages];
      const incompleteIndex = messages.findIndex(m => 
        m.role === 'assistant' && !m.isComplete
      );
      if (incompleteIndex >= 0) {
        messages[incompleteIndex] = {
          ...messages[incompleteIndex],
          isComplete: true
        };
      }
      return {
        ...state,
        messages,
        isProcessing: false
      };
    
    case 'AGENT_ACTIVE':
      return {
        ...state,
        activeAgents: [...state.activeAgents, action.payload]
      };
    
    case 'AGENT_COMPLETE':
      return {
        ...state,
        activeAgents: state.activeAgents.filter(
          agent => agent.stepId !== action.payload.stepId
        )
      };
    
    case 'PLAN_GENERATED':
      return {
        ...state,
        currentPlan: action.payload
      };
    
    case 'ERROR':
      return {
        ...state,
        error: action.payload,
        isProcessing: false
      };
    
    case 'RESET':
      return initialState;
    
    default:
      return state;
  }
}

export function useADK() {
  const services = useContext(ADKContext);
  if (!services) {
    throw new Error('useADK must be used within ADKProvider');
  }
  
  const [state, dispatch] = useReducer(adkReducer, initialState);
  const messageQueueRef = useRef<Set<string>>(new Set());
  
  // Set up event listeners
  useEffect(() => {
    const { manager } = services;
    
    const handlers = {
      'connection:change': (data: any) => {
        dispatch({ type: 'CONNECTION_CHANGE', payload: data });
      },
      'session:created': (session: any) => {
        dispatch({ type: 'SESSION_CREATED', payload: session });
      },
      [ADKEventType.AGENT_THINKING]: (event: ADKEvent) => {
        dispatch({ type: 'AGENT_ACTIVE', payload: event.data });
      },
      [ADKEventType.AGENT_COMPLETE]: (event: ADKEvent) => {
        dispatch({ type: 'AGENT_COMPLETE', payload: event.data });
      },
      [ADKEventType.MESSAGE_CHUNK]: (event: ADKEvent) => {
        dispatch({ type: 'MESSAGE_CHUNK', payload: event.data });
      },
      [ADKEventType.MESSAGE_COMPLETE]: (event: ADKEvent) => {
        dispatch({ type: 'MESSAGE_COMPLETE', payload: event.data });
      },
      [ADKEventType.PLAN_GENERATED]: (event: ADKEvent) => {
        dispatch({ type: 'PLAN_GENERATED', payload: event.data });
      },
      'error': (error: any) => {
        dispatch({ type: 'ERROR', payload: error });
      }
    };
    
    // Register all handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      manager.on(event, handler);
    });
    
    // Cleanup
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        manager.off(event, handler);
      });
    };
  }, [services]);
  
  // Initialize on mount
  useEffect(() => {
    services.manager.initialize().catch(error => {
      dispatch({ type: 'ERROR', payload: error });
    });
  }, [services]);
  
  // Send message handler with deduplication
  const sendMessage = useCallback(async (
    content: string, 
    options?: MessageOptions
  ) => {
    // Prevent duplicate messages
    const messageKey = `${content}_${Date.now()}`;
    if (messageQueueRef.current.has(messageKey)) {
      console.log('[useADK] Ignoring duplicate message');
      return;
    }
    
    messageQueueRef.current.add(messageKey);
    
    try {
      const messageId = await services.manager.sendMessage(content, options?.metadata);
      
      dispatch({ 
        type: 'MESSAGE_SENT', 
        payload: { id: messageId, content } 
      });
      
      // Clean up after a delay
      setTimeout(() => {
        messageQueueRef.current.delete(messageKey);
      }, 5000);
      
    } catch (error) {
      dispatch({ type: 'ERROR', payload: error });
      messageQueueRef.current.delete(messageKey);
      throw error;
    }
  }, [services]);
  
  // Approve plan handler
  const approvePlan = useCallback(async () => {
    if (!state.currentPlan) {
      throw new Error('No plan to approve');
    }
    
    try {
      await sendMessage('Looks good, please proceed with the research');
    } catch (error) {
      dispatch({ type: 'ERROR', payload: error });
      throw error;
    }
  }, [state.currentPlan, sendMessage]);
  
  // Reset conversation
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    services.manager.disconnect();
    services.manager.initialize();
  }, [services]);
  
  return {
    // State
    ...state,
    
    // Actions
    sendMessage,
    approvePlan,
    reset,
    
    // Services (for advanced usage)
    services
  };
}
```

## 4. SSE Client with Robust Error Handling

```typescript
// services/adk/sse-client.ts
export class SSEClient extends EventEmitter {
  private config: SSEConfig;
  private abortController: AbortController | null = null;
  private reconnectAttempts = 0;
  private messageBuffer: Map<string, MessageBuffer> = new Map();
  
  constructor(config: SSEConfig) {
    super();
    this.config = {
      maxRetries: 5,
      retryDelay: 1000,
      timeout: 120000, // 2 minutes
      ...config
    };
  }

  async sendMessage(message: ADKMessage): Promise<void> {
    // Cancel any existing request
    if (this.abortController) {
      this.abortController.abort();
    }
    
    this.abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      this.abortController?.abort();
    }, this.config.timeout);
    
    try {
      const response = await this.executeRequest(message);
      await this.processResponse(response, message.metadata?.message_id);
    } catch (error) {
      await this.handleError(error, message);
    } finally {
      clearTimeout(timeoutId);
      this.abortController = null;
    }
  }

  private async executeRequest(message: ADKMessage): Promise<Response> {
    const url = `${this.config.apiUrl}/run_sse?alt=sse`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'X-Client-Version': this.config.clientVersion || '1.0.0'
      },
      body: JSON.stringify(message),
      signal: this.abortController!.signal
    });
    
    if (!response.ok) {
      throw new HTTPError(response.status, await response.text());
    }
    
    return response;
  }

  private async processResponse(
    response: Response, 
    messageId?: string
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }
    
    const decoder = new TextDecoder();
    const buffer = this.getOrCreateBuffer(messageId);
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer.add(chunk);
        
        // Process complete events
        const events = buffer.extractEvents();
        for (const event of events) {
          await this.processEvent(event);
        }
      }
      
      // Handle stream completion
      this.emit('stream:complete', { messageId });
    } finally {
      reader.releaseLock();
      this.messageBuffer.delete(messageId || '');
    }
  }

  private async processEvent(eventData: string): Promise<void> {
    if (eventData === '[DONE]') {
      this.emit('stream:done');
      return;
    }
    
    try {
      const event = JSON.parse(eventData);
      this.emit('event', event);
    } catch (error) {
      console.error('[SSEClient] Failed to parse event:', error);
      this.emit('error', new ParseError(eventData, error));
    }
  }

  private async handleError(error: any, message: ADKMessage): Promise<void> {
    if (error.name === 'AbortError') {
      this.emit('error', new TimeoutError(this.config.timeout));
      return;
    }
    
    if (this.shouldRetry(error)) {
      await this.retryRequest(message, error);
    } else {
      this.emit('error', error);
    }
  }

  private shouldRetry(error: any): boolean {
    if (this.reconnectAttempts >= this.config.maxRetries) {
      return false;
    }
    
    // Retry on network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }
    
    // Retry on specific HTTP status codes
    if (error instanceof HTTPError) {
      return [502, 503, 504].includes(error.status);
    }
    
    return false;
  }

  private async retryRequest(message: ADKMessage, error: any): Promise<void> {
    this.reconnectAttempts++;
    
    const delay = this.calculateBackoff();
    this.emit('retry', { 
      attempt: this.reconnectAttempts, 
      delay, 
      error 
    });
    
    await this.delay(delay);
    
    try {
      await this.sendMessage(message);
      this.reconnectAttempts = 0; // Reset on success
    } catch (retryError) {
      // Will be handled by the same error handler
    }
  }

  private calculateBackoff(): number {
    const base = this.config.retryDelay;
    const attempt = this.reconnectAttempts;
    return Math.min(base * Math.pow(2, attempt), 30000);
  }

  private getOrCreateBuffer(messageId?: string): MessageBuffer {
    const id = messageId || 'default';
    if (!this.messageBuffer.has(id)) {
      this.messageBuffer.set(id, new MessageBuffer());
    }
    return this.messageBuffer.get(id)!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Helper class for buffering SSE data
class MessageBuffer {
  private buffer = '';
  
  add(chunk: string): void {
    this.buffer += chunk;
  }
  
  extractEvents(): string[] {
    const events: string[] = [];
    const lines = this.buffer.split('\n');
    
    // Keep incomplete line in buffer
    this.buffer = lines.pop() || '';
    
    let currentEvent = '';
    for (const line of lines) {
      if (line.trim() === '') {
        if (currentEvent) {
          events.push(currentEvent);
          currentEvent = '';
        }
      } else if (line.startsWith('data: ')) {
        currentEvent = line.slice(6);
      }
    }
    
    return events;
  }
}
```

## 5. React Context Provider

```typescript
// contexts/ADKContext.tsx
import React, { createContext, useEffect, useMemo, useState } from 'react';
import { ADKServiceFactory, type IADKServices } from '../services';
import type { ADKConfig } from '../types';

interface ADKContextValue extends IADKServices {
  isReady: boolean;
  error: Error | null;
}

export const ADKContext = createContext<ADKContextValue | null>(null);

interface ADKProviderProps {
  config?: Partial<ADKConfig>;
  children: React.ReactNode;
}

export const ADKProvider: React.FC<ADKProviderProps> = ({ 
  config = {}, 
  children 
}) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Merge with default config
  const finalConfig: ADKConfig = useMemo(() => ({
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    clientVersion: '1.0.0',
    enableLogging: import.meta.env.DEV,
    errorHandling: {
      maxRetries: 5,
      retryDelay: 1000,
      enableRecovery: true
    },
    performance: {
      eventBatching: true,
      batchDelay: 16,
      messageDebounce: 50
    },
    ...config
  }), [config]);
  
  // Create services
  const services = useMemo(() => {
    try {
      return ADKServiceFactory.create(finalConfig);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [finalConfig]);
  
  // Initialize services
  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      try {
        await services.manager.initialize();
        if (mounted) {
          setIsReady(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      }
    };
    
    initialize();
    
    return () => {
      mounted = false;
      services.manager.disconnect();
    };
  }, [services]);
  
  const contextValue: ADKContextValue = {
    ...services,
    isReady,
    error
  };
  
  return (
    <ADKContext.Provider value={contextValue}>
      {children}
    </ADKContext.Provider>
  );
};

// Error boundary for ADK errors
export class ADKErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ADKErrorBoundary] Caught error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError && this.state.error) {
      const Fallback = this.props.fallback || DefaultErrorFallback;
      return <Fallback error={this.state.error} />;
    }
    
    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded">
    <h2 className="text-red-700 font-bold">ADK Error</h2>
    <p className="text-red-600">{error.message}</p>
  </div>
);
```

## 6. Type Definitions

```typescript
// types/adk.ts
export interface ADKConfig {
  apiUrl: string;
  clientVersion: string;
  enableLogging: boolean;
  errorHandling: ErrorHandlingConfig;
  performance: PerformanceConfig;
}

export interface ErrorHandlingConfig {
  maxRetries: number;
  retryDelay: number;
  enableRecovery: boolean;
}

export interface PerformanceConfig {
  eventBatching: boolean;
  batchDelay: number;
  messageDebounce: number;
}

export interface Session {
  id: string;
  userId: string;
  status: SessionStatus;
  metadata: SessionMetadata;
  createdAt: Date;
  lastActivity: Date;
}

export type SessionStatus = 'active' | 'expired' | 'refreshing';

export interface SessionMetadata {
  clientVersion: string;
  platform: string;
  [key: string]: any;
}

export interface ADKMessage {
  app_name: string;
  user_id: string;
  session_id: string;
  new_message: {
    role: 'user' | 'assistant';
    parts: MessagePart[];
  };
  streaming: boolean;
  metadata?: Record<string, any>;
}

export interface MessagePart {
  text?: string;
  functionCall?: FunctionCall;
  functionResponse?: FunctionResponse;
}

export interface FunctionCall {
  name: string;
  args: Record<string, any>;
  id: string;
}

export interface FunctionResponse {
  name: string;
  response: any;
  id: string;
}

export enum ADKEventType {
  // Agent Events
  AGENT_THINKING = 'agent:thinking',
  AGENT_ACTION = 'agent:action',
  AGENT_COMPLETE = 'agent:complete',
  
  // Message Events
  MESSAGE_START = 'message:start',
  MESSAGE_CHUNK = 'message:chunk',
  MESSAGE_COMPLETE = 'message:complete',
  
  // Workflow Events
  PLAN_GENERATED = 'workflow:plan_generated',
  PLAN_APPROVED = 'workflow:plan_approved',
  RESEARCH_START = 'workflow:research_start',
  RESEARCH_COMPLETE = 'workflow:research_complete',
  
  // System Events
  SESSION_CREATED = 'system:session_created',
  ERROR = 'system:error',
  CONNECTION_CHANGE = 'system:connection_change'
}

export interface ADKEvent {
  id: string;
  type: ADKEventType;
  timestamp: number;
  sessionId: string;
  data: any;
  metadata?: EventMetadata;
}

export interface EventMetadata {
  source?: string;
  correlationId?: string;
  [key: string]: any;
}

// Custom Error Types
export class ADKError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ADKError';
  }
}

export class HTTPError extends ADKError {
  constructor(
    public status: number,
    public statusText: string
  ) {
    super(`HTTP ${status}: ${statusText}`, 'HTTP_ERROR', { status, statusText });
    this.name = 'HTTPError';
  }
}

export class ParseError extends ADKError {
  constructor(
    public rawData: string,
    public originalError: any
  ) {
    super('Failed to parse SSE event', 'PARSE_ERROR', { rawData, originalError });
    this.name = 'ParseError';
  }
}

export class TimeoutError extends ADKError {
  constructor(public timeout: number) {
    super(`Request timed out after ${timeout}ms`, 'TIMEOUT', { timeout });
    this.name = 'TimeoutError';
  }
}

export class SessionError extends ADKError {
  constructor(message: string, details?: any) {
    super(message, 'SESSION_ERROR', details);
    this.name = 'SessionError';
  }
}
```

These examples provide concrete implementations of the key components in the ADK integration architecture, demonstrating:

1. **ADKManager**: Central service coordinating all ADK interactions
2. **EventProcessor**: Transforms raw SSE events into typed UI events
3. **useADK Hook**: React integration with state management
4. **SSEClient**: Robust SSE handling with error recovery
5. **Context Provider**: React context setup with error boundaries
6. **Type Definitions**: Complete TypeScript types for type safety

Each component is designed to be:
- **Modular**: Can be tested and developed independently
- **Resilient**: Includes error handling and recovery
- **Performant**: Uses batching and debouncing where appropriate
- **Type-safe**: Full TypeScript support
- **Testable**: Clear interfaces and dependency injection