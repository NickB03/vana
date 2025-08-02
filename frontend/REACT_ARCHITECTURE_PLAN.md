# React Frontend Architecture Plan for Vana

## Executive Summary

This plan outlines the comprehensive React frontend architecture for Vana that integrates seamlessly with the ADK backend architecture. The frontend is built on React 18+, TypeScript, Vite, and shadcn/ui, with a focus on real-time SSE updates, type safety, and production readiness.

## Table of Contents

1. [Component Architecture](#component-architecture)
2. [State Management Strategy](#state-management-strategy)
3. [Routing Structure](#routing-structure)
4. [Data Flow Patterns](#data-flow-patterns)
5. [Real-time Update Handling](#real-time-update-handling)
6. [Performance Optimizations](#performance-optimizations)
7. [Build and Deployment](#build-and-deployment)
8. [Testing Strategies](#testing-strategies)
9. [Implementation Roadmap](#implementation-roadmap)

## Component Architecture

### 1. Component Hierarchy Diagram

```
App.tsx
├── Providers (Context Providers)
│   ├── ThemeProvider
│   ├── AuthProvider
│   ├── SessionProvider
│   └── ResearchProvider
├── Router
│   ├── Public Routes
│   │   ├── LandingPage
│   │   ├── Login
│   │   └── Register
│   └── Protected Routes
│       ├── Layout
│       │   ├── Header
│       │   ├── Sidebar (optional)
│       │   └── Main Content Area
│       ├── ResearchInterface
│       │   ├── ChatInterface
│       │   │   ├── MessageList
│       │   │   │   ├── UserMessage
│       │   │   │   └── AssistantMessage
│       │   │   │       └── ThinkingPanel
│       │   │   ├── InputArea
│       │   │   └── ConnectionStatus
│       │   └── ResearchPanel
│       │       ├── ResearchPlan
│       │       ├── SourceList
│       │       └── ProgressTracker
│       ├── HistoryView
│       └── SettingsView
└── ErrorBoundary
```

### 2. Core Component Descriptions

#### App.tsx
- Root component that sets up providers and routing
- Handles global error boundaries
- Manages theme and authentication state

#### Providers Layer
```typescript
// providers/index.tsx
export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
        <SessionProvider>
          <ResearchProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ResearchProvider>
        </SessionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
```

#### Layout Components
```typescript
// components/Layout/index.tsx
export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { sessionId } = useSession();
  
  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};
```

#### Chat Interface Components
```typescript
// components/ChatInterface/types.ts
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
  thinkingSteps?: ThinkingStep[];
  metadata?: {
    model?: string;
    tokens?: number;
    duration?: number;
  };
}

export interface ThinkingStep {
  id: string;
  agent: string;
  action: string;
  status: 'pending' | 'active' | 'complete';
  duration?: string;
  result?: any;
}
```

## State Management Strategy

### 1. Context-Based Architecture

#### Authentication Context
```typescript
// contexts/AuthContext.tsx
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);
```

#### Session Context
```typescript
// contexts/SessionContext.tsx
interface SessionContextValue {
  sessionId: string | null;
  userId: string;
  createSession: () => Promise<string>;
  clearSession: () => void;
  isSessionActive: boolean;
}

export const SessionContext = React.createContext<SessionContextValue | undefined>(undefined);
```

#### Research Context
```typescript
// contexts/ResearchContext.tsx
interface ResearchContextValue {
  currentResearch: Research | null;
  researchHistory: Research[];
  startNewResearch: (topic: string) => Promise<void>;
  updateResearchPlan: (plan: ResearchPlan) => void;
  completeResearch: (report: string) => void;
}

export const ResearchContext = React.createContext<ResearchContextValue | undefined>(undefined);
```

### 2. Local State Management

#### Message State Management
```typescript
// hooks/useMessages.ts
export const useMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);
  
  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  }, []);
  
  return { messages, isTyping, addMessage, updateMessage, setIsTyping };
};
```

## Routing Structure

### 1. Route Configuration

```typescript
// routes/index.tsx
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'research',
        element: <ProtectedRoute><ResearchInterface /></ProtectedRoute>,
      },
      {
        path: 'research/:sessionId',
        element: <ProtectedRoute><ResearchInterface /></ProtectedRoute>,
      },
      {
        path: 'history',
        element: <ProtectedRoute><HistoryView /></ProtectedRoute>,
      },
      {
        path: 'settings',
        element: <ProtectedRoute><SettingsView /></ProtectedRoute>,
      },
    ],
  },
]);
```

### 2. Protected Routes

```typescript
// components/ProtectedRoute.tsx
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};
```

## Data Flow Patterns

### 1. SSE Integration Architecture

```typescript
// services/sse/SSEManager.ts
export class SSEManager {
  private sseClient: SSEClient;
  private messageHandlers: Map<string, MessageHandler>;
  private reconnectStrategy: ReconnectStrategy;
  
  constructor(config: SSEConfig) {
    this.sseClient = new SSEClient(config);
    this.messageHandlers = new Map();
    this.reconnectStrategy = new ExponentialBackoffStrategy();
  }
  
  async connect(userId: string, sessionId: string): Promise<void> {
    await this.sseClient.connect(userId, sessionId);
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    this.sseClient.on('thinking_update', this.handleThinkingUpdate);
    this.sseClient.on('message_update', this.handleMessageUpdate);
    this.sseClient.on('error', this.handleError);
  }
}
```

### 2. Message Flow Pattern

```
User Input → SSE Client → ADK Backend → Agent Processing → SSE Events → UI Updates

1. User types message in ChatInterface
2. Message sent via SSE client with unique ID
3. ADK processes with multiple agents
4. Each agent sends thinking_update events
5. Final response streams via message_update events
6. UI updates in real-time
```

### 3. Type-Safe Data Flow

```typescript
// types/api.ts
export interface APIResponse<T> {
  data: T;
  error?: APIError;
  metadata?: ResponseMetadata;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
}

// hooks/useAPI.ts
export function useAPI<T>() {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<APIError | null>(null);
  const [loading, setLoading] = useState(false);
  
  const execute = useCallback(async (request: () => Promise<APIResponse<T>>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await request();
      if (response.error) {
        setError(response.error);
      } else {
        setData(response.data);
      }
    } catch (err) {
      setError({ code: 'UNKNOWN', message: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { data, error, loading, execute };
}
```

## Real-time Update Handling

### 1. SSE Event Processing

```typescript
// hooks/useSSEUpdates.ts
export const useSSEUpdates = () => {
  const { sessionId } = useSession();
  const { addMessage, updateMessage } = useMessages();
  const [thinkingSteps, setThinkingSteps] = useState<Map<string, ThinkingStep>>(new Map());
  
  useEffect(() => {
    if (!sessionId) return;
    
    const handleThinkingUpdate = (update: ThinkingUpdate) => {
      setThinkingSteps(prev => {
        const next = new Map(prev);
        next.set(update.stepId, {
          id: update.stepId,
          agent: update.agent,
          action: update.action,
          status: update.status,
          duration: update.duration,
        });
        return next;
      });
    };
    
    const handleMessageUpdate = (update: MessageUpdate) => {
      if (update.isComplete) {
        // Convert thinking steps to array for message
        const steps = Array.from(thinkingSteps.values());
        updateMessage(update.messageId, {
          content: update.content,
          status: 'sent',
          thinkingSteps: steps,
        });
        setThinkingSteps(new Map()); // Clear for next message
      } else {
        updateMessage(update.messageId, {
          content: update.content,
          status: 'sending',
        });
      }
    };
    
    sseClient.on('thinking_update', handleThinkingUpdate);
    sseClient.on('message_update', handleMessageUpdate);
    
    return () => {
      sseClient.off('thinking_update', handleThinkingUpdate);
      sseClient.off('message_update', handleMessageUpdate);
    };
  }, [sessionId, updateMessage]);
  
  return { thinkingSteps };
};
```

### 2. Optimistic Updates

```typescript
// hooks/useOptimisticMessage.ts
export const useOptimisticMessage = () => {
  const { addMessage } = useMessages();
  const { sendMessage } = useSSE();
  
  const send = useCallback(async (content: string) => {
    const messageId = generateMessageId();
    
    // Add user message immediately
    const userMessage: Message = {
      id: messageId,
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'sent',
    };
    addMessage(userMessage);
    
    // Add placeholder AI message
    const aiMessageId = generateMessageId();
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'sending',
    };
    addMessage(aiMessage);
    
    // Send via SSE
    try {
      await sendMessage(content, aiMessageId);
    } catch (error) {
      updateMessage(aiMessageId, {
        content: 'Failed to send message. Please try again.',
        status: 'error',
      });
    }
  }, [addMessage, sendMessage]);
  
  return { send };
};
```

## Performance Optimizations

### 1. Component Optimization

```typescript
// components/MessageList.tsx
export const MessageList = React.memo(({ messages }: { messages: Message[] }) => {
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });
  
  return (
    <div ref={scrollRef} className="h-full overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const message = messages[virtualItem.index];
          return (
            <div
              key={message.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <MessageItem message={message} />
            </div>
          );
        })}
      </div>
    </div>
  );
});

// Memoized message item
const MessageItem = React.memo(({ message }: { message: Message }) => {
  if (message.role === 'user') {
    return <UserMessage {...message} />;
  }
  return <AssistantMessage {...message} />;
}, (prev, next) => {
  // Custom comparison - only re-render if content or status changes
  return (
    prev.message.content === next.message.content &&
    prev.message.status === next.message.status &&
    prev.message.thinkingSteps?.length === next.message.thinkingSteps?.length
  );
});
```

### 2. Code Splitting

```typescript
// routes/lazy.ts
import { lazy } from 'react';

// Lazy load heavy components
export const ResearchInterface = lazy(() => 
  import('../components/ResearchInterface').then(m => ({ default: m.ResearchInterface }))
);

export const HistoryView = lazy(() => 
  import('../components/HistoryView').then(m => ({ default: m.HistoryView }))
);

export const SettingsView = lazy(() => 
  import('../components/SettingsView').then(m => ({ default: m.SettingsView }))
);
```

### 3. Bundle Optimization

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      template: 'treemap',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'utils': ['clsx', 'tailwind-merge', 'class-variance-authority'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
```

## Build and Deployment

### 1. Environment Configuration

```typescript
// config/env.ts
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8000',
  environment: import.meta.env.VITE_ENV || 'development',
  features: {
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableDebugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
  },
};

// Type-safe environment validation
const validateEnv = () => {
  const required = ['VITE_API_URL'];
  const missing = required.filter(key => !import.meta.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};
```

### 2. Build Configuration

```json
// package.json scripts
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:prod": "NODE_ENV=production vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### 3. Docker Configuration

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## Testing Strategies

### 1. Component Testing

```typescript
// __tests__/components/ChatInterface.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '../ChatInterface';
import { TestProviders } from '../../test-utils';

describe('ChatInterface', () => {
  it('sends message when user submits input', async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();
    
    render(
      <TestProviders>
        <ChatInterface onSendMessage={onSendMessage} />
      </TestProviders>
    );
    
    const input = screen.getByPlaceholderText('Message VANA...');
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    await user.type(input, 'Test message');
    await user.click(sendButton);
    
    expect(onSendMessage).toHaveBeenCalledWith('Test message');
  });
  
  it('displays thinking steps during processing', async () => {
    const { mockSSEClient } = render(
      <TestProviders>
        <ChatInterface />
      </TestProviders>
    );
    
    // Simulate thinking update
    mockSSEClient.emit('thinking_update', {
      stepId: 'step1',
      agent: 'Research Planner',
      action: 'Generating research plan',
      status: 'active',
    });
    
    await waitFor(() => {
      expect(screen.getByText('Research Planner')).toBeInTheDocument();
      expect(screen.getByText('Generating research plan')).toBeInTheDocument();
    });
  });
});
```

### 2. Integration Testing

```typescript
// __tests__/integration/research-flow.test.tsx
import { renderApp, mockServer } from '../../test-utils';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Research Flow', () => {
  beforeEach(() => {
    mockServer.reset();
  });
  
  it('completes full research workflow', async () => {
    const user = userEvent.setup();
    
    // Setup mock responses
    mockServer.use(
      rest.post('/api/sessions', (req, res, ctx) => {
        return res(ctx.json({ sessionId: 'test-session' }));
      }),
      rest.post('/run_sse', (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.set('Content-Type', 'text/event-stream'),
          ctx.body(generateSSEStream([
            { type: 'thinking_update', data: { agent: 'planner', action: 'Planning' } },
            { type: 'message_update', data: { content: 'Research complete' } },
          ]))
        );
      })
    );
    
    renderApp();
    
    // Navigate to research
    await user.type(screen.getByPlaceholderText('What would you like to research?'), 'AI safety');
    await user.click(screen.getByRole('button', { name: /start research/i }));
    
    // Verify thinking panel shows
    await waitFor(() => {
      expect(screen.getByText('Planning')).toBeInTheDocument();
    });
    
    // Verify final message
    await waitFor(() => {
      expect(screen.getByText('Research complete')).toBeInTheDocument();
    });
  });
});
```

### 3. E2E Testing

```typescript
// e2e/research.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Research Interface', () => {
  test('user can start and complete research', async ({ page }) => {
    await page.goto('/');
    
    // Enter research topic
    await page.fill('[placeholder="What would you like to research?"]', 'Climate change solutions');
    await page.click('button:has-text("Start Research")');
    
    // Wait for chat interface
    await expect(page.locator('.chat-interface')).toBeVisible();
    
    // Verify message appears
    await expect(page.locator('.user-message')).toContainText('Climate change solutions');
    
    // Wait for AI response
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 30000 });
    
    // Check thinking panel
    await page.click('button:has-text("Show Agent activity")');
    await expect(page.locator('.thinking-panel')).toBeVisible();
    await expect(page.locator('.thinking-step')).toHaveCount(greaterThan(0));
  });
});
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. Set up project structure with Vite and TypeScript
2. Implement core providers (Auth, Session, Research)
3. Create base components (Layout, Router)
4. Set up SSE client with reconnection logic
5. Implement basic chat interface

### Phase 2: Core Features (Week 3-4)
1. Complete ChatInterface with thinking panel
2. Implement message streaming and updates
3. Add research plan display
4. Create connection status indicators
5. Implement error handling and recovery

### Phase 3: Enhanced Features (Week 5-6)
1. Add history view with search/filter
2. Implement settings management
3. Add file upload support
4. Create source viewer component
5. Implement export functionality

### Phase 4: Optimization (Week 7-8)
1. Add virtual scrolling for messages
2. Implement code splitting
3. Optimize bundle size
4. Add PWA support
5. Implement offline capabilities

### Phase 5: Polish & Testing (Week 9-10)
1. Complete unit test coverage
2. Add integration tests
3. Implement E2E tests
4. Performance profiling
5. Accessibility audit and fixes

## Key Implementation Examples

### 1. SSE Hook with Auto-Reconnect

```typescript
// hooks/useSSEWithReconnect.ts
export const useSSEWithReconnect = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  
  const connect = useCallback(async () => {
    try {
      setConnectionState('connecting');
      await sseClient.connect(userId, sessionId);
      setConnectionState('connected');
      reconnectAttemptsRef.current = 0;
    } catch (error) {
      setConnectionState('error');
      
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;
        
        setTimeout(() => {
          connect();
        }, delay);
      }
    }
  }, [userId, sessionId]);
  
  useEffect(() => {
    connect();
    
    const handleDisconnect = () => {
      setConnectionState('reconnecting');
      connect();
    };
    
    sseClient.on('disconnect', handleDisconnect);
    
    return () => {
      sseClient.off('disconnect', handleDisconnect);
      sseClient.disconnect();
    };
  }, [connect]);
  
  return { connectionState };
};
```

### 2. Research Plan Component

```typescript
// components/ResearchPlan/index.tsx
export const ResearchPlan: React.FC<{ plan: string }> = ({ plan }) => {
  const sections = parseResearchPlan(plan);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Research Plan</h3>
      <div className="space-y-2">
        {sections.map((section) => (
          <Collapsible
            key={section.id}
            open={expandedSections.has(section.id)}
            onOpenChange={(open) => {
              setExpandedSections(prev => {
                const next = new Set(prev);
                if (open) {
                  next.add(section.id);
                } else {
                  next.delete(section.id);
                }
                return next;
              });
            }}
          >
            <CollapsibleTrigger className="flex items-center gap-2">
              <ChevronRight className={cn(
                "h-4 w-4 transition-transform",
                expandedSections.has(section.id) && "rotate-90"
              )} />
              <span className={cn(
                "font-medium",
                section.isModified && "text-yellow-500",
                section.isNew && "text-green-500"
              )}>
                {section.title}
              </span>
              {section.tag && (
                <Badge variant="outline" className="text-xs">
                  {section.tag}
                </Badge>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 pt-2">
              <div className="text-sm text-gray-400">
                {section.content}
              </div>
              {section.deliverables && (
                <div className="mt-2">
                  <span className="text-xs font-semibold">Deliverables:</span>
                  <ul className="list-disc list-inside text-xs text-gray-500">
                    {section.deliverables.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </Card>
  );
};
```

### 3. Performance Monitor Component

```typescript
// components/PerformanceMonitor/index.tsx
export const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memory: 0,
    renderTime: 0,
  });
  
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        setMetrics(prev => ({
          ...prev,
          fps: Math.round((frameCount * 1000) / (currentTime - lastTime)),
          memory: performance.memory ? 
            Math.round(performance.memory.usedJSHeapSize / 1048576) : 0,
        }));
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    const rafId = requestAnimationFrame(measureFPS);
    
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);
  
  if (!import.meta.env.DEV) return null;
  
  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white p-2 text-xs font-mono">
      <div>FPS: {metrics.fps}</div>
      <div>Memory: {metrics.memory}MB</div>
      <div>Render: {metrics.renderTime}ms</div>
    </div>
  );
};
```

## Conclusion

This architecture plan provides a comprehensive foundation for building a production-ready React frontend for Vana that:

1. **Integrates seamlessly with ADK** - Handles SSE events, agent updates, and research workflows
2. **Maintains type safety** - Full TypeScript coverage with proper types
3. **Optimizes performance** - Virtual scrolling, code splitting, and memoization
4. **Ensures reliability** - Error boundaries, reconnection logic, and graceful degradation
5. **Supports testing** - Comprehensive testing strategies at all levels
6. **Scales effectively** - Modular architecture that grows with requirements

The implementation follows React best practices while providing a exceptional user experience for AI-powered research workflows.