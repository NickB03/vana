# Developer Guide

This comprehensive guide covers everything you need to know to develop, debug, and deploy the Vana Frontend effectively.

## Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Debugging Guide](#debugging-guide)
- [Performance Optimization](#performance-optimization)
- [Deployment Guide](#deployment-guide)
- [Troubleshooting](#troubleshooting)
- [Advanced Topics](#advanced-topics)

---

## Quick Start

### Environment Setup

1. **Prerequisites Installation**
   ```bash
   # Install Node.js (use nvm for version management)
   nvm install 18
   nvm use 18
   
   # Verify installations
   node --version  # Should be 18.x.x
   npm --version   # Should be 9.x.x
   ```

2. **Project Setup**
   ```bash
   # Clone and navigate to frontend
   git clone https://github.com/vana-project/vana.git
   cd vana/frontend
   
   # Install dependencies
   npm install
   
   # Copy environment template
   cp .env.example .env.local
   ```

3. **Environment Configuration**
   ```bash
   # .env.local
   VITE_API_URL=http://localhost:8000
   VITE_WS_URL=ws://localhost:8000/ws
   VITE_APP_NAME=Vana
   VITE_DEBUG_MODE=true
   ```

4. **Start Development**
   ```bash
   # Terminal 1: Start development server
   npm run dev
   
   # Terminal 2: Run tests in watch mode
   npm run test --watch
   
   # Terminal 3: Type checking (optional)
   npm run type-check --watch
   ```

### First Feature Development

Let's create a simple feature to understand the workflow:

```typescript
// 1. Create a new component
// src/components/features/sample/SampleFeature.tsx
import React from 'react';
import { useAuth } from '@/contexts';
import { Button } from '@/components/ui/button';

interface SampleFeatureProps {
  title: string;
  onAction: () => void;
}

export const SampleFeature: React.FC<SampleFeatureProps> = ({ 
  title, 
  onAction 
}) => {
  const { user } = useAuth();
  
  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-4">
        Welcome, {user?.name || 'Guest'}!
      </p>
      <Button onClick={onAction}>
        Take Action
      </Button>
    </div>
  );
};
```

```typescript
// 2. Write tests
// src/components/features/sample/__tests__/SampleFeature.test.tsx
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { SampleFeature } from '../SampleFeature';
import { AuthProvider } from '@/contexts/AuthContext';

const renderWithAuth = (component: React.ReactElement, user = null) => {
  return render(
    <AuthProvider value={{ user, isLoading: false }}>
      {component}
    </AuthProvider>
  );
};

describe('SampleFeature', () => {
  it('renders title and action button', () => {
    renderWithAuth(
      <SampleFeature title="Test Feature" onAction={vi.fn()} />
    );
    
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take Action' })).toBeInTheDocument();
  });
  
  it('calls onAction when button is clicked', async () => {
    const mockAction = vi.fn();
    renderWithAuth(
      <SampleFeature title="Test Feature" onAction={mockAction} />
    );
    
    await userEvent.click(screen.getByRole('button', { name: 'Take Action' }));
    expect(mockAction).toHaveBeenCalledTimes(1);
  });
});
```

```typescript
// 3. Add to main application
// src/App.tsx
import { SampleFeature } from '@/components/features/sample/SampleFeature';

function App() {
  const handleSampleAction = () => {
    console.log('Sample action triggered!');
  };
  
  return (
    <RootProvider>
      <div className="container mx-auto p-4">
        <SampleFeature 
          title="My Sample Feature" 
          onAction={handleSampleAction}
        />
      </div>
    </RootProvider>
  );
}
```

---

## Project Structure

### Directory Organization

```
src/
├── components/           # React components
│   ├── ui/              # Base UI components (shadcn/ui, kibo-ui)
│   │   ├── shadcn/      # shadcn/ui components
│   │   ├── kibo-ui/     # AI-specific components
│   │   └── custom/      # Project-specific UI components
│   ├── features/        # Feature-specific components
│   │   ├── chat/        # Chat-related components
│   │   ├── auth/        # Authentication components
│   │   └── research/    # Research workflow components
│   └── layout/          # Layout components (Header, Sidebar, etc.)
├── contexts/            # React contexts for state management
│   ├── AuthContext.tsx  # User authentication
│   ├── SessionContext.tsx # ADK sessions
│   ├── AppContext.tsx   # Global app state
│   ├── SSEContext.tsx   # Real-time events
│   └── RootProvider.tsx # Combined provider
├── hooks/               # Custom React hooks
│   ├── useSSE.ts        # SSE connection management
│   └── useLocalStorage.ts # Local storage utilities
├── services/            # Business logic and API integration
│   ├── adk-client.ts    # Main ADK client
│   ├── session-service.ts # Session management
│   ├── sse-manager.ts   # SSE connection handling
│   └── index.ts         # Service exports
├── types/               # TypeScript type definitions
│   ├── adk-events.ts    # ADK event types
│   ├── auth.ts          # Authentication types
│   └── session.ts       # Session types
├── utils/               # Utility functions
│   ├── event-emitter.ts # Event handling utilities
│   └── cn.ts            # Class name utilities
├── lib/                 # Configuration and setup
│   ├── config.ts        # App configuration
│   └── utils.ts         # General utilities
└── test/                # Testing utilities and setup
    ├── setup.ts         # Test configuration
    ├── utils/           # Test helpers
    └── mocks/           # Mock data and services
```

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Components** | PascalCase | `ChatInterface.tsx` |
| **Hooks** | camelCase with `use` prefix | `useSSE.ts` |
| **Services** | kebab-case | `adk-client.ts` |
| **Types** | kebab-case | `adk-events.ts` |
| **Utils** | kebab-case | `event-emitter.ts` |
| **Tests** | Same as source + `.test` | `ChatInterface.test.tsx` |

### Import Organization

```typescript
// 1. External libraries
import React, { useState, useEffect } from 'react';
import { Button } from '@radix-ui/react-button';

// 2. Internal imports (absolute paths)
import { useAuth } from '@/contexts';
import { ChatService } from '@/services';
import type { Message } from '@/types';

// 3. Relative imports (same directory)
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import type { ChatInterfaceProps } from './types';
```

---

## Development Workflow

### Daily Development Process

#### 1. Start Development Session
```bash
# Pull latest changes
git pull origin main

# Create feature branch
git checkout -b feature/new-feature

# Start development servers
npm run dev        # Terminal 1: Dev server
npm run test       # Terminal 2: Tests
```

#### 2. Development Loop
```bash
# Make changes to code
# Tests run automatically (watch mode)

# Check code quality
npm run lint       # ESLint
npm run type-check # TypeScript
npm run format     # Prettier

# Manual testing in browser
# http://localhost:5173
```

#### 3. Pre-commit Checks
```bash
# Run all checks
npm run test:coverage  # Ensure coverage > 80%
npm run lint          # Fix any linting issues
npm run type-check    # Ensure no type errors
npm run build         # Ensure build succeeds

# Commit changes
git add .
git commit -m "feat: add new feature"
```

### Code Quality Gates

#### Automated Checks (Husky Pre-commit)
- **ESLint**: Code style and best practice validation
- **Prettier**: Code formatting
- **TypeScript**: Type checking
- **Tests**: Unit test execution

#### Manual Checks
- **Functionality**: Feature works as expected
- **Responsiveness**: Mobile/tablet/desktop compatibility
- **Accessibility**: Screen reader and keyboard navigation
- **Performance**: No significant performance regression

### Git Workflow

#### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates
- `test/description` - Test improvements

#### Commit Messages
```bash
# Format: type(scope): description
# Types: feat, fix, docs, style, refactor, test, chore

git commit -m "feat(chat): add message editing functionality"
git commit -m "fix(sse): resolve connection timeout issues"
git commit -m "docs(api): update service layer documentation"
```

---

## Debugging Guide

### React DevTools

#### Component Debugging
```typescript
// 1. Install React DevTools browser extension
// 2. Use component inspector to examine props and state
// 3. Use profiler to identify performance issues

// Debug component renders
const ChatInterface = ({ sessionId }) => {
  console.log('ChatInterface render:', { sessionId });
  
  useEffect(() => {
    console.log('ChatInterface mounted');
    return () => console.log('ChatInterface unmounted');
  }, []);
  
  // Component implementation
};
```

#### Performance Profiling
```typescript
import { Profiler } from 'react';

const onRenderCallback = (id, phase, actualDuration, baseDuration) => {
  if (actualDuration > 16) { // > 60fps
    console.warn(`Slow render: ${id} took ${actualDuration}ms`);
  }
};

<Profiler id="ChatInterface" onRender={onRenderCallback}>
  <ChatInterface />
</Profiler>
```

### Network Debugging

#### SSE Connection Debugging
```typescript
// Enable SSE debugging
const sseManager = new SSEManager({
  apiUrl: 'http://localhost:8000',
  enableLogging: true // Enable console logging
});

// Debug SSE events in browser DevTools
// 1. Open Network tab
// 2. Filter by "EventStream"
// 3. Click on SSE connection to see events
```

#### API Request Debugging
```typescript
// Debug API calls with request/response logging
const apiClient = axios.create({
  baseURL: process.env.VITE_API_URL,
});

apiClient.interceptors.request.use(request => {
  console.log('API Request:', request);
  return request;
});

apiClient.interceptors.response.use(
  response => {
    console.log('API Response:', response);
    return response;
  },
  error => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);
```

### State Debugging

#### Context State Debugging
```typescript
// Add debug logging to contexts
const useAuth = () => {
  const context = useContext(AuthContext);
  
  // Debug state changes
  useEffect(() => {
    console.log('Auth state changed:', context);
  }, [context.user, context.isLoading]);
  
  return context;
};
```

#### Redux DevTools (if using Redux)
```typescript
// Enable Redux DevTools for complex state
const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== 'production'
});
```

### Error Debugging

#### Error Boundaries
```typescript
// Enhanced error boundary with logging
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Log to console
    console.error('Error Boundary caught error:', error, errorInfo);
    
    // Log to external service (optional)
    if (process.env.NODE_ENV === 'production') {
      logErrorToService(error, errorInfo);
    }
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.resetError} />;
    }
    
    return this.props.children;
  }
}
```

#### Console Debugging
```typescript
// Structured logging for debugging
const logger = {
  debug: (message: string, data?: any) => {
    if (process.env.VITE_DEBUG_MODE === 'true') {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
  
  info: (message: string, data?: any) => {
    console.info(`[INFO] ${message}`, data);
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data);
  },
  
  error: (message: string, error?: Error) => {
    console.error(`[ERROR] ${message}`, error);
  }
};

// Usage
logger.debug('SSE connection established', { connectionId });
logger.error('Failed to send message', error);
```

---

## Performance Optimization

### Bundle Size Optimization

#### Code Splitting
```typescript
// Route-based splitting
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));

// Component-based splitting
const HeavyComponent = lazy(() => import('@/components/HeavyComponent'));

// Conditional splitting
const DevTools = lazy(() => 
  process.env.NODE_ENV === 'development'
    ? import('@/components/DevTools')
    : Promise.resolve({ default: () => null })
);
```

#### Tree Shaking
```typescript
// ✅ Good - specific imports
import { debounce } from 'lodash-es';
import { format } from 'date-fns';

// ❌ Bad - imports entire library
import _ from 'lodash';
import * as dateFns from 'date-fns';
```

#### Bundle Analysis
```bash
# Analyze bundle size
npm run build -- --analyze

# Check bundle composition
npm run preview
```

### Runtime Performance

#### React Optimization
```typescript
// Memoization for expensive calculations
const ExpensiveComponent = React.memo(({ data }) => {
  const processedData = useMemo(() => {
    return expensiveProcessing(data);
  }, [data]);
  
  return <div>{processedData}</div>;
});

// Callback memoization
const ChatInterface = ({ onMessageSent }) => {
  const handleSubmit = useCallback((message) => {
    onMessageSent(message);
  }, [onMessageSent]);
  
  return <ChatInput onSubmit={handleSubmit} />;
};
```

#### Virtual Scrolling
```typescript
// For large lists (1000+ items)
import { FixedSizeList as List } from 'react-window';

const VirtualizedList = ({ items }) => (
  <List
    height={600}
    itemCount={items.length}
    itemSize={80}
    overscanCount={5}
  >
    {({ index, style }) => (
      <div style={style}>
        <ItemComponent item={items[index]} />
      </div>
    )}
  </List>
);
```

### Memory Management

#### Cleanup Patterns
```typescript
// Proper cleanup in useEffect
useEffect(() => {
  const subscription = subscribe('events', handler);
  const timer = setInterval(updateData, 1000);
  
  return () => {
    subscription.unsubscribe();
    clearInterval(timer);
  };
}, []);

// Cleanup in services
class ServiceManager {
  private connections = new Map();
  
  cleanup() {
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
  }
}
```

### Performance Monitoring

#### Custom Performance Hooks
```typescript
const usePerformanceMonitor = (componentName: string) => {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (renderTime > 16) { // > 60fps
        console.warn(`${componentName} render took ${renderTime}ms`);
      }
    };
  });
};

// Usage
const MyComponent = () => {
  usePerformanceMonitor('MyComponent');
  return <div>Component content</div>;
};
```

---

## Deployment Guide

### Build Configuration

#### Environment-Specific Builds
```bash
# Development build
npm run build:dev

# Production build
npm run build

# Staging build
npm run build:staging
```

#### Environment Variables
```bash
# .env.production
VITE_API_URL=https://api.vana-prod.com
VITE_APP_NAME=Vana
VITE_DEBUG_MODE=false
VITE_SENTRY_DSN=your-sentry-dsn

# .env.staging
VITE_API_URL=https://api.vana-staging.com
VITE_APP_NAME=Vana (Staging)
VITE_DEBUG_MODE=true
```

### Static Hosting Deployment

#### Vercel Deployment
```json
// vercel.json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

#### Netlify Deployment
```toml
# netlify.toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Docker Deployment

#### Multi-stage Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Nginx Configuration
```nginx
# nginx.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    
    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
}
```

### CI/CD Pipeline

#### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run lint
      - run: npm run type-check
  
  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
        env:
          VITE_API_URL: ${{ secrets.PROD_API_URL }}
          VITE_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
          
      - name: Deploy to Vercel
        uses: vercel/action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Troubleshooting

### Common Issues

#### Build Issues

**Issue: "Cannot resolve module '@/components'"**
```bash
# Solution: Check tsconfig.json paths configuration
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

**Issue: "Module not found: Can't resolve 'some-package'"**
```bash
# Solution: Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Runtime Issues

**Issue: SSE connections failing**
```typescript
// Debug SSE issues
const debugSSE = () => {
  console.log('API URL:', process.env.VITE_API_URL);
  console.log('Connection status:', navigator.onLine);
  
  // Check CORS headers
  fetch(`${process.env.VITE_API_URL}/health`)
    .then(response => console.log('API accessible:', response.ok))
    .catch(error => console.error('API error:', error));
};
```

**Issue: Context not found errors**
```typescript
// Ensure component is wrapped in provider
const useAuthSafely = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

#### Performance Issues

**Issue: Slow rendering**
```typescript
// Use React Profiler to identify bottlenecks
import { Profiler } from 'react';

const onRender = (id, phase, actualDuration) => {
  if (actualDuration > 16) {
    console.warn(`Slow component: ${id} (${actualDuration}ms)`);
  }
};

<Profiler id="SlowComponent" onRender={onRender}>
  <YourComponent />
</Profiler>
```

**Issue: Memory leaks**
```typescript
// Check for proper cleanup
useEffect(() => {
  const subscription = subscribe();
  const timer = setInterval(update, 1000);
  
  return () => {
    subscription.unsubscribe(); // Don't forget cleanup
    clearInterval(timer);
  };
}, []);
```

### Debugging Commands

```bash
# Development debugging
npm run dev -- --debug    # Enable debug mode
npm run dev -- --host     # Expose to network

# Build debugging
npm run build -- --debug  # Debug build process
npm run preview -- --port 3000  # Preview on custom port

# Dependency debugging
npm ls                     # List all dependencies
npm audit                  # Security audit
npm outdated              # Check for updates
```

---

## Advanced Topics

### Custom Hooks Development

#### Pattern: Data Fetching Hook
```typescript
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function useApi<T>(url: string): UseApiState<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
    refetch: async () => {}
  });
  
  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Fetch failed');
      
      const data = await response.json();
      setState(prev => ({ ...prev, data, loading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error as Error, 
        loading: false 
      }));
    }
  }, [url]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const refetch = useCallback(() => fetchData(), [fetchData]);
  
  return { ...state, refetch };
}
```

### Service Architecture Patterns

#### Pattern: Service Factory
```typescript
interface ServiceDependencies {
  apiClient: ApiClient;
  eventBus: EventBus;
  storage: Storage;
}

class ServiceFactory {
  private services = new Map<string, any>();
  
  constructor(private dependencies: ServiceDependencies) {}
  
  getService<T>(ServiceClass: new (...args: any[]) => T): T {
    const serviceName = ServiceClass.name;
    
    if (!this.services.has(serviceName)) {
      const service = new ServiceClass(this.dependencies);
      this.services.set(serviceName, service);
    }
    
    return this.services.get(serviceName);
  }
}

// Usage
const factory = new ServiceFactory({
  apiClient: new ApiClient(),
  eventBus: new EventBus(),
  storage: localStorage
});

const chatService = factory.getService(ChatService);
```

### State Management Patterns

#### Pattern: Reducer with Actions
```typescript
// Define action types
type Action = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DATA'; payload: Data }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'RESET' };

// Create action creators
const actions = {
  setLoading: (loading: boolean): Action => ({ 
    type: 'SET_LOADING', 
    payload: loading 
  }),
  setData: (data: Data): Action => ({ 
    type: 'SET_DATA', 
    payload: data 
  }),
  setError: (error: Error | null): Action => ({ 
    type: 'SET_ERROR', 
    payload: error 
  }),
  reset: (): Action => ({ type: 'RESET' })
};

// Reducer implementation
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_DATA':
      return { ...state, data: action.payload, loading: false };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
};
```

### Testing Advanced Patterns

#### Pattern: Integration Test Suite
```typescript
// Create a test suite for complete user workflows
describe('Chat Workflow Integration', () => {
  let mockServer: SetupServerApi;
  
  beforeAll(() => {
    mockServer = setupServer(
      rest.post('/api/sessions', (req, res, ctx) => {
        return res(ctx.json({ id: 'session-1' }));
      }),
      rest.post('/api/run_sse', (req, res, ctx) => {
        // Mock SSE response
        return res(ctx.json({ success: true }));
      })
    );
    mockServer.listen();
  });
  
  afterAll(() => mockServer.close());
  
  it('completes full chat workflow', async () => {
    render(
      <RootProvider>
        <ChatApplication />
      </RootProvider>
    );
    
    // 1. User signs in
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });
    
    // 2. User starts new session
    await userEvent.click(screen.getByRole('button', { name: /new chat/i }));
    
    // 3. User sends message
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Hello, AI!{enter}');
    
    // 4. Verify message appears
    expect(await screen.findByText('Hello, AI!')).toBeInTheDocument();
    
    // 5. Verify loading state
    expect(screen.getByText(/thinking/i)).toBeInTheDocument();
  });
});
```

This developer guide provides comprehensive coverage of development practices for the Vana Frontend. For specific technical details, refer to the other documentation files in the docs folder.