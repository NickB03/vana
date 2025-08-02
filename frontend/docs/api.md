# API Documentation

This document provides comprehensive API documentation for the Vana Frontend service layer, contexts, and component interfaces.

## Table of Contents

- [Service Layer APIs](#service-layer-apis)
- [Context APIs](#context-apis)
- [Component Interfaces](#component-interfaces)
- [Type Definitions](#type-definitions)
- [Error Handling](#error-handling)
- [Event System](#event-system)

---

## Service Layer APIs

### ADKClient

The main interface for interacting with the ADK backend.

```typescript
interface IADKClient extends EventEmitter {
  // Connection Management
  initialize(userId: string): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getConnectionInfo(): ConnectionInfo;

  // Messaging
  sendMessage(content: string, metadata?: MessageMetadata): Promise<void>;
  
  // Event Subscription
  subscribeToEvents(events: string[], handler: EventHandler): () => void;
  
  // Service Access
  getServices(): ADKServices;
}
```

#### Usage Example

```typescript
import { setupADK } from '@/services';

const { client } = await setupADK('user_123');

// Send a message
await client.sendMessage('Research quantum computing', {
  messageId: 'msg_001',
  priority: 'high'
});

// Listen for responses
client.on('message_update', (data) => {
  console.log('Response:', data.content);
});

// Cleanup
client.disconnect();
```

### SessionService

Manages ADK sessions with persistence and validation.

```typescript
interface ISessionService {
  // Session Management
  createSession(userId: string, config?: SessionConfig): Promise<ADKSession>;
  getSession(sessionId: string): Promise<ADKSession | null>;
  updateSession(sessionId: string, updates: Partial<ADKSession>): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  
  // Persistence
  saveToStorage(session: ADKSession): void;
  loadFromStorage(sessionId: string): ADKSession | null;
  clearStorage(): void;
}
```

#### Session Configuration

```typescript
interface SessionConfig {
  appName?: string;
  maxMessages?: number;
  timeout?: number;
  persistent?: boolean;
}
```

### SSEManager

Handles Server-Sent Events with ADK's per-message pattern.

```typescript
interface ISSEManager {
  // Connection Management
  connect(request: SSERequest): Promise<SSEConnection>;
  disconnect(connectionId: string): void;
  getActiveConnections(): SSEConnection[];
  
  // Event Streaming
  subscribe(eventType: string, handler: EventHandler): () => void;
  unsubscribe(eventType: string, handler: EventHandler): void;
  
  // Status
  getConnectionStatus(): ConnectionStatus;
}
```

#### SSE Request Format

```typescript
interface SSERequest {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body: {
    appName: string;
    userId: string;
    sessionId: string;
    newMessage: {
      parts: Array<{ text: string }>;
      role: 'user';
    };
    streaming: true;
  };
}
```

### MessageTransformer

Transforms data between ADK and UI formats.

```typescript
interface IMessageTransformer {
  // UI to ADK
  transformToADKRequest(
    content: string,
    metadata: MessageMetadata
  ): ADKRequest;
  
  // ADK to UI
  transformFromADKEvent(event: SSEEvent): UIEvent;
  transformThinkingUpdate(data: any): ThinkingUpdate;
  transformMessageUpdate(data: any): MessageUpdate;
  transformWorkflowUpdate(data: any): WorkflowUpdate;
}
```

### EventStore

Centralized event storage with debugging capabilities.

```typescript
interface IEventStore {
  // Event Management
  addEvent(event: StoredEvent): void;
  getEvents(filter?: EventFilter): StoredEvent[];
  clearEvents(): void;
  
  // Session Management
  getSessionEvents(sessionId: string): StoredEvent[];
  clearSessionEvents(sessionId: string): void;
  
  // Debug Features
  enableDebugMode(): void;
  disableDebugMode(): void;
  getDebugInfo(): DebugInfo;
  exportEvents(format: 'json' | 'csv'): string;
}
```

---

## Context APIs

### AuthContext

Manages user authentication and authorization.

```typescript
interface AuthContextValue {
  // State
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  signIn(credentials: SignInCredentials): Promise<void>;
  signUp(credentials: SignUpCredentials): Promise<void>;
  signOut(): Promise<void>;
  enterGuestMode(): Promise<void>;
  refreshToken(): Promise<void>;
  
  // User Management
  updateProfile(updates: Partial<UserProfile>): Promise<void>;
  changePassword(oldPassword: string, newPassword: string): Promise<void>;
}
```

#### Usage

```typescript
import { useAuth } from '@/contexts';

function LoginComponent() {
  const { signIn, isLoading, user } = useAuth();
  
  const handleSignIn = async (email: string, password: string) => {
    try {
      await signIn({ email, password });
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };
  
  if (user) {
    return <div>Welcome, {user.name}!</div>;
  }
  
  return <LoginForm onSubmit={handleSignIn} loading={isLoading} />;
}
```

### SessionContext

Manages research sessions and ADK integration.

```typescript
interface SessionContextValue {
  // State
  currentSession: ResearchSession | null;
  sessions: ResearchSession[];
  isLoading: boolean;
  
  // Session Management
  createSession(config: ResearchConfig): Promise<ResearchSession>;
  loadSession(sessionId: string): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  
  // Research Operations
  startResearch(query: string): Promise<void>;
  sendMessage(content: string): Promise<void>;
  stopResearch(): void;
  
  // State Management
  updateSessionConfig(config: Partial<ResearchConfig>): void;
  exportSession(format: 'json' | 'markdown'): string;
}
```

#### Research Configuration

```typescript
interface ResearchConfig {
  model: 'gemini-2.5-pro' | 'gemini-2.5-flash';
  maxIterations: number;
  includeImages: boolean;
  outputFormat: 'markdown' | 'html';
  citationStyle: 'apa' | 'mla' | 'chicago';
}
```

### AppContext

Global application state and UI preferences.

```typescript
interface AppContextValue {
  // UI State
  ui: UIPreferences;
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  
  // Notifications
  notifications: NotificationItem[];
  addNotification(notification: Omit<NotificationItem, 'id'>): void;
  removeNotification(id: string): void;
  clearNotifications(): void;
  
  // Preferences
  updatePreferences(preferences: Partial<UIPreferences>): void;
  setTheme(theme: 'light' | 'dark' | 'system'): void;
  toggleSidebar(): void;
  
  // Modal Management
  modals: ModalState;
  openModal(modal: ModalType, props?: any): void;
  closeModal(modal: ModalType): void;
}
```

### SSEContext

Real-time event handling and connection management.

```typescript
interface SSEContextValue {
  // Connection State
  connection: ConnectionStatus;
  isConnected: boolean;
  reconnectAttempts: number;
  
  // Event Subscription
  subscribe(eventType: string, handler: EventHandler): () => void;
  unsubscribe(eventType: string, handler: EventHandler): void;
  
  // Connection Management
  connect(): void;
  disconnect(): void;
  reconnect(): void;
  
  // Event History
  getRecentEvents(count?: number): SSEEvent[];
  clearEventHistory(): void;
}
```

---

## Component Interfaces

### ChatInterface

Main chat component for ADK interactions.

```typescript
interface ChatInterfaceProps {
  // Required
  sessionId: string;
  
  // Optional
  placeholder?: string;
  maxHeight?: string;
  showTimestamps?: boolean;
  enableFileUpload?: boolean;
  
  // Event Handlers
  onMessageSent?: (message: string) => void;
  onFileUpload?: (files: File[]) => void;
  onError?: (error: Error) => void;
  
  // Customization
  className?: string;
  theme?: 'light' | 'dark';
  variant?: 'default' | 'compact' | 'minimal';
}
```

### ThinkingPanel

Displays agent activity and reasoning.

```typescript
interface ThinkingPanelProps {
  // Data
  activities: AgentActivity[];
  currentAgent?: string;
  
  // Display Options
  showDetails?: boolean;
  autoScroll?: boolean;
  maxItems?: number;
  
  // Event Handlers
  onActivityClick?: (activity: AgentActivity) => void;
  onClearHistory?: () => void;
  
  // Styling
  className?: string;
  height?: string;
}
```

### ConnectionStatus

Shows real-time connection status.

```typescript
interface ConnectionStatusProps {
  // Connection Info
  status: ConnectionStatus;
  
  // Display Options
  showDetails?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  // Event Handlers
  onRetryClick?: () => void;
  onSettingsClick?: () => void;
  
  // Styling
  className?: string;
  variant?: 'badge' | 'banner' | 'modal';
}
```

---

## Type Definitions

### Core Types

```typescript
// User and Authentication
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  preferences: UserPreferences;
  createdAt: Date;
  lastLoginAt: Date;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: NotificationSettings;
  research: ResearchPreferences;
}

// Research Session
interface ResearchSession {
  id: string;
  userId: string;
  title: string;
  description?: string;
  config: ResearchConfig;
  messages: Message[];
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}

// Messages
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: MessageMetadata;
  timestamp: Date;
}

interface MessageMetadata {
  sources?: Source[];
  agentActivity?: AgentActivity[];
  confidence?: number;
  processingTime?: number;
}

// Agent Activity
interface AgentActivity {
  id: string;
  agent: string;
  action: string;
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  details?: any;
}
```

### Event Types

```typescript
// SSE Events
interface SSEEvent {
  id: string;
  event: string;
  data: any;
  timestamp: Date;
  retry?: number;
}

// UI Events
interface UIEvent {
  type: 'thinking_update' | 'message_update' | 'workflow_update' | 'error';
  data: any;
  sessionId: string;
  timestamp: Date;
}

// Connection Events
interface ConnectionEvent {
  type: 'connected' | 'disconnected' | 'error' | 'reconnecting';
  timestamp: Date;
  details?: any;
}
```

### Configuration Types

```typescript
// ADK Configuration
interface ADKConfig {
  apiUrl: string;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  enableLogging: boolean;
}

// UI Configuration
interface UIPreferences {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  showTimestamps: boolean;
  fontSize: 'small' | 'medium' | 'large';
  density: 'compact' | 'comfortable' | 'spacious';
}
```

---

## Error Handling

### Error Types

```typescript
// Base Error
class ADKError extends Error {
  code: string;
  details?: any;
  timestamp: Date;
  
  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'ADKError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

// Specific Error Types
class SessionError extends ADKError {
  constructor(message: string, details?: any) {
    super(message, 'SESSION_ERROR', details);
    this.name = 'SessionError';
  }
}

class ConnectionError extends ADKError {
  constructor(message: string, details?: any) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = 'ConnectionError';
  }
}

class MessageError extends ADKError {
  constructor(message: string, details?: any) {
    super(message, 'MESSAGE_ERROR', details);
    this.name = 'MessageError';
  }
}
```

### Error Handling Patterns

```typescript
// Service Layer Error Handling
try {
  await client.sendMessage('test message');
} catch (error) {
  if (error instanceof SessionError) {
    // Handle session-specific errors
    console.error('Session error:', error.message);
  } else if (error instanceof ConnectionError) {
    // Handle connection errors
    console.error('Connection error:', error.message);
  } else {
    // Handle unknown errors
    console.error('Unknown error:', error);
  }
}

// Context Error Handling
const { error, clearError } = useContext(SomeContext);

useEffect(() => {
  if (error) {
    // Display error to user
    console.error('Context error:', error);
    // Clear after displaying
    setTimeout(clearError, 5000);
  }
}, [error, clearError]);
```

---

## Event System

### Event Types and Payloads

```typescript
// Thinking Updates
interface ThinkingUpdateEvent {
  type: 'thinking_update';
  data: {
    agent: string;
    action: string;
    status: 'running' | 'completed' | 'failed';
    details?: any;
  };
}

// Message Updates
interface MessageUpdateEvent {
  type: 'message_update';
  data: {
    content: string;
    isComplete: boolean;
    sources?: Source[];
    metadata?: any;
  };
}

// Workflow Updates
interface WorkflowUpdateEvent {
  type: 'workflow_update';
  data: {
    phase: 'planning' | 'research' | 'composition';
    progress: number;
    currentStep: string;
    estimatedTimeRemaining?: number;
  };
}

// Connection Updates
interface ConnectionUpdateEvent {
  type: 'connection_change';
  data: {
    status: 'connected' | 'disconnected' | 'reconnecting';
    timestamp: Date;
    error?: Error;
  };
}
```

### Event Subscription Patterns

```typescript
// Component Event Subscription
function MyComponent() {
  const { subscribe } = useSSE();
  
  useEffect(() => {
    const unsubscribe = subscribe('message_update', (event) => {
      console.log('New message chunk:', event.data.content);
    });
    
    return unsubscribe; // Cleanup on unmount
  }, [subscribe]);
}

// Service Event Subscription
const client = await setupADK('user_123');

const unsubscribeAll = client.subscribeToEvents([
  'thinking_update',
  'message_update',
  'workflow_update'
], (event) => {
  console.log('Event received:', event.type, event.data);
});

// Cleanup
unsubscribeAll();
```

### Custom Event Emitters

```typescript
// Create custom event emitter
import { EventEmitter } from '@/utils/event-emitter';

class CustomService extends EventEmitter {
  async doSomething() {
    this.emit('started', { timestamp: new Date() });
    
    try {
      const result = await someAsyncOperation();
      this.emit('completed', { result });
    } catch (error) {
      this.emit('error', { error });
    }
  }
}

// Usage
const service = new CustomService();

service.on('started', () => console.log('Operation started'));
service.on('completed', (data) => console.log('Result:', data.result));
service.on('error', (data) => console.error('Error:', data.error));
```

---

## API Versioning and Compatibility

### Version Information

- **Current Version**: 1.0.0
- **Minimum ADK Version**: 0.10.0
- **Breaking Changes**: See [CHANGELOG.md](../CHANGELOG.md)

### Deprecation Policy

- Deprecated APIs are marked with `@deprecated` JSDoc tags
- Deprecated APIs remain functional for at least 2 minor versions
- Migration guides are provided for breaking changes

### Compatibility Matrix

| Frontend Version | ADK Version | Status |
|------------------|-------------|--------|
| 1.0.x | 0.10.x | ✅ Supported |
| 1.0.x | 0.9.x | ⚠️ Limited support |
| 0.9.x | 0.9.x | 🚫 Deprecated |

---

## Rate Limiting and Quotas

### Default Limits

- **Messages per minute**: 60
- **SSE connections**: 10 concurrent
- **Session duration**: 4 hours
- **Storage per user**: 100MB

### Handling Rate Limits

```typescript
// Rate limit error handling
try {
  await client.sendMessage('test');
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    const retryAfter = error.details?.retryAfter || 60;
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);
  }
}
```

---

This API documentation provides a comprehensive reference for developers working with the Vana Frontend. For additional examples and use cases, see the [examples directory](../src/examples/).