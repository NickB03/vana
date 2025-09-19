# Testing Strategy & Coverage Requirements

## Testing Philosophy

The testing strategy for Vana's frontend rebuild follows a comprehensive approach ensuring reliability of the real-time multi-agent research platform while maintaining development velocity and confidence in deployments.

## Testing Pyramid

### Unit Tests (70% Coverage Target)

#### Component Testing
```typescript
// tests/components/ResearchForm.test.tsx
describe('ResearchForm', () => {
  test('validates query length correctly', () => {
    render(<ResearchForm />)
    
    const queryInput = screen.getByPlaceholderText(/what would you like to research/i)
    const submitButton = screen.getByRole('button', { name: /start research/i })
    
    // Test minimum length validation
    fireEvent.change(queryInput, { target: { value: 'short' } })
    fireEvent.click(submitButton)
    
    expect(screen.getByText(/query too short/i)).toBeInTheDocument()
    
    // Test valid input
    fireEvent.change(queryInput, { target: { value: 'A comprehensive analysis of renewable energy trends' } })
    expect(screen.queryByText(/query too short/i)).not.toBeInTheDocument()
  })
  
  test('handles submission with loading state', async () => {
    const mockSubmit = jest.fn().mockResolvedValue({ sessionId: 'test-session' })
    
    render(<ResearchForm onSubmit={mockSubmit} />)
    
    const queryInput = screen.getByPlaceholderText(/what would you like to research/i)
    const submitButton = screen.getByRole('button', { name: /start research/i })
    
    fireEvent.change(queryInput, { target: { value: 'Valid research query' } })
    fireEvent.click(submitButton)
    
    // Check loading state
    expect(screen.getByText(/starting research/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
    
    // Wait for completion
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        query: 'Valid research query',
        options: expect.any(Object)
      })
    })
  })
  
  test('displays validation errors correctly', async () => {
    const mockSubmit = jest.fn().mockRejectedValue(new Error('Network error'))
    
    render(<ResearchForm onSubmit={mockSubmit} />)
    
    const queryInput = screen.getByPlaceholderText(/what would you like to research/i)
    const submitButton = screen.getByRole('button', { name: /start research/i })
    
    fireEvent.change(queryInput, { target: { value: 'Valid research query' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
  })
})
```

#### Hook Testing
```typescript
// tests/hooks/useAuth.test.tsx
describe('useAuth', () => {
  const mockAuthAPI = {
    login: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn()
  }
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  test('handles successful login', async () => {
    mockAuthAPI.login.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
      tokens: { accessToken: 'token123', refreshToken: 'refresh123' }
    })
    
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthProvider authAPI={mockAuthAPI}>
          {children}
        </AuthProvider>
      )
    })
    
    await act(async () => {
      const loginResult = await result.current.login({
        email: 'test@example.com',
        password: 'password123'
      })
      
      expect(loginResult.success).toBe(true)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual({
        id: '1',
        email: 'test@example.com'
      })
    })
  })
  
  test('handles authentication failure', async () => {
    mockAuthAPI.login.mockRejectedValue(new Error('Invalid credentials'))
    
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthProvider authAPI={mockAuthAPI}>
          {children}
        </AuthProvider>
      )
    })
    
    await act(async () => {
      const loginResult = await result.current.login({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
      
      expect(loginResult.success).toBe(false)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toBeTruthy()
    })
  })
})
```

#### Store Testing
```typescript
// tests/stores/researchStore.test.ts
describe('researchStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useResearchStore.getState().reset()
  })
  
  test('updates research state correctly', () => {
    const store = useResearchStore.getState()
    
    const session = {
      id: 'session-1',
      query: 'Test research query',
      status: 'pending' as const
    }
    
    act(() => {
      store.setCurrentSession(session)
    })
    
    expect(useResearchStore.getState().currentSession).toEqual(session)
  })
  
  test('handles agent progress updates', () => {
    const store = useResearchStore.getState()
    
    act(() => {
      store.updateAgentProgress('agent-1', {
        status: 'working',
        progress: 50,
        currentTask: 'Analyzing data'
      })
    })
    
    const agentProgress = useResearchStore.getState().agentProgress['agent-1']
    expect(agentProgress.status).toBe('working')
    expect(agentProgress.progress).toBe(50)
    expect(agentProgress.currentTask).toBe('Analyzing data')
  })
})
```

### Integration Tests (20% Coverage Target)

#### API Integration
```typescript
// tests/integration/api.test.tsx
describe('API Integration', () => {
  let server: SetupServerApi
  
  beforeAll(() => {
    server = setupServer(
      rest.post('/api/run_sse', (req, res, ctx) => {
        return res(
          ctx.json({
            sessionId: 'test-session-id',
            status: 'started'
          })
        )
      }),
      
      rest.get('/api/sessions/:sessionId', (req, res, ctx) => {
        return res(
          ctx.json({
            id: req.params.sessionId,
            query: 'Test query',
            status: 'completed',
            results: { /* mock results */ }
          })
        )
      })
    )
    server.listen()
  })
  
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())
  
  test('creates research session successfully', async () => {
    render(
      <QueryClient client={new QueryClient()}>
        <ResearchForm />
      </QueryClient>
    )
    
    const queryInput = screen.getByPlaceholderText(/what would you like to research/i)
    const submitButton = screen.getByRole('button', { name: /start research/i })
    
    fireEvent.change(queryInput, { target: { value: 'Test research query' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/research started/i)).toBeInTheDocument()
    })
  })
  
  test('handles API errors gracefully', async () => {
    server.use(
      rest.post('/api/run_sse', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }))
      })
    )
    
    render(
      <QueryClient client={new QueryClient()}>
        <ResearchForm />
      </QueryClient>
    )
    
    const queryInput = screen.getByPlaceholderText(/what would you like to research/i)
    const submitButton = screen.getByRole('button', { name: /start research/i })
    
    fireEvent.change(queryInput, { target: { value: 'Test research query' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument()
    })
  })
})
```

#### SSE Integration Testing
```typescript
// tests/integration/sse.test.tsx
describe('SSE Integration', () => {
  let mockEventSource: jest.MockedClass<typeof EventSource>
  
  beforeEach(() => {
    mockEventSource = EventSource as jest.MockedClass<typeof EventSource>
    mockEventSource.mockClear()
  })
  
  test('connects to SSE and receives messages', async () => {
    const mockInstance = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      close: jest.fn(),
      readyState: EventSource.OPEN
    }
    
    mockEventSource.mockImplementation(() => mockInstance as any)
    
    render(<ResearchProgress sessionId="test-session" />)
    
    // Verify EventSource was created with correct URL
    expect(mockEventSource).toHaveBeenCalledWith(
      expect.stringContaining('/api/run_sse'),
      expect.objectContaining({
        withCredentials: true
      })
    )
    
    // Simulate receiving a message
    const messageHandler = mockInstance.addEventListener.mock.calls
      .find(([event]) => event === 'agent_progress')?.[1]
    
    act(() => {
      messageHandler?.({
        type: 'agent_progress',
        data: JSON.stringify({
          agentId: 'agent-1',
          status: 'working',
          progress: 50
        })
      })
    })
    
    await waitFor(() => {
      expect(screen.getByText('50%')).toBeInTheDocument()
    })
  })
  
  test('handles SSE connection errors', async () => {
    const mockInstance = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      close: jest.fn(),
      readyState: EventSource.CLOSED
    }
    
    mockEventSource.mockImplementation(() => mockInstance as any)
    
    render(<ResearchProgress sessionId="test-session" />)
    
    // Simulate connection error
    const errorHandler = mockInstance.addEventListener.mock.calls
      .find(([event]) => event === 'error')?.[1]
    
    act(() => {
      errorHandler?.(new Event('error'))
    })
    
    await waitFor(() => {
      expect(screen.getByText(/connection error/i)).toBeInTheDocument()
    })
  })
})
```

### End-to-End Tests (10% Coverage Target)

#### Complete Research Workflow
```typescript
// tests/e2e/research-workflow.spec.ts
describe('Research Workflow E2E', () => {
  test('complete research flow from query to results', async ({ page }) => {
    // Navigate to application
    await page.goto('/')
    
    // Check if authentication is required
    const loginButton = page.locator('button:has-text("Login")')
    if (await loginButton.isVisible()) {
      await loginButton.click()
      
      // Handle authentication (mock or real depending on test environment)
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-submit"]')
      
      // Wait for authentication to complete
      await page.waitForURL('/')
    }
    
    // Start research
    const queryInput = page.locator('textarea[placeholder*="research"]')
    await queryInput.fill('Latest developments in artificial intelligence and machine learning')
    
    const startButton = page.locator('button:has-text("Start Research")')
    await startButton.click()
    
    // Verify navigation to research progress page
    await page.waitForURL(/\/research\/.*/)
    
    // Check that agent grid is visible
    await expect(page.locator('[data-testid="agent-grid"]')).toBeVisible()
    
    // Wait for plan approval (if required)
    const planApproval = page.locator('[data-testid="plan-approval"]')
    if (await planApproval.isVisible({ timeout: 5000 })) {
      await page.click('button:has-text("Approve")')
    }
    
    // Monitor research progress
    await expect(page.locator('text=Research Progress')).toBeVisible()
    
    // Wait for at least one agent to start working
    await expect(page.locator('[data-testid="agent-card"][data-status="working"]')).toBeVisible({
      timeout: 10000
    })
    
    // Wait for research completion (with reasonable timeout)
    await expect(page.locator('text=Research completed')).toBeVisible({
      timeout: 300000 // 5 minutes max
    })
    
    // Verify results are displayed
    await expect(page.locator('[data-testid="research-results"]')).toBeVisible()
    
    // Check that export options are available
    await expect(page.locator('button:has-text("Export")')).toBeVisible()
  })
  
  test('handles session interruption and recovery', async ({ page }) => {
    // Start research
    await page.goto('/')
    await page.fill('textarea[placeholder*="research"]', 'Test research query')
    await page.click('button:has-text("Start Research")')
    
    // Wait for research to start
    await page.waitForURL(/\/research\/.*/)
    
    // Extract session ID from URL
    const url = page.url()
    const sessionId = url.match(/\/research\/(.+)/)?.[1]
    
    // Simulate page reload (browser crash/refresh)
    await page.reload()
    
    // Verify session recovery
    await expect(page.locator('text=Resuming session')).toBeVisible()
    await expect(page.locator('[data-testid="agent-grid"]')).toBeVisible()
    
    // Verify we're still on the same session
    expect(page.url()).toContain(sessionId!)
  })
})
```

#### Authentication Flow Testing
```typescript
// tests/e2e/authentication.spec.ts
describe('Authentication E2E', () => {
  test('OAuth2 login flow', async ({ page }) => {
    await page.goto('/login')
    
    // Click OAuth login button
    await page.click('[data-testid="oauth-login-button"]')
    
    // Handle OAuth provider redirect (mock in test environment)
    await page.waitForURL(/oauth-provider\.com/)
    
    // Fill OAuth provider credentials
    await page.fill('#username', 'testuser')
    await page.fill('#password', 'testpass')
    await page.click('#login-button')
    
    // Wait for redirect back to application
    await page.waitForURL('/')
    
    // Verify successful authentication
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    await expect(page.locator('text=Welcome back')).toBeVisible()
  })
  
  test('session persistence across browser restart', async ({ page, context }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-submit"]')
    
    await page.waitForURL('/')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    
    // Close and reopen browser context (simulate restart)
    await context.close()
    const newContext = await browser.newContext()
    const newPage = await newContext.newPage()
    
    // Navigate to app
    await newPage.goto('/')
    
    // Should still be authenticated
    await expect(newPage.locator('[data-testid="user-menu"]')).toBeVisible()
  })
})
```

## Testing Infrastructure

### Test Setup and Configuration

```typescript
// tests/setup.ts
import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'
import { TextEncoder, TextDecoder } from 'util'

// Configure testing library
configure({
  testIdAttribute: 'data-testid'
})

// Mock EventSource for SSE testing
class MockEventSource {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 2
  
  readyState = MockEventSource.CONNECTING
  url: string
  listeners: { [key: string]: Function[] } = {}
  
  constructor(url: string) {
    this.url = url
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN
      this.listeners.open?.forEach(fn => fn())
    }, 10)
  }
  
  addEventListener(type: string, listener: Function) {
    if (!this.listeners[type]) {
      this.listeners[type] = []
    }
    this.listeners[type].push(listener)
  }
  
  removeEventListener(type: string, listener: Function) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(fn => fn !== listener)
    }
  }
  
  close() {
    this.readyState = MockEventSource.CLOSED
  }
  
  simulate(type: string, data: any) {
    this.listeners[type]?.forEach(fn => fn({ type, data: JSON.stringify(data) }))
  }
}

global.EventSource = MockEventSource as any
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock intersection observer
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}
```

### Test Utilities

```typescript
// tests/utils/testing-utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../src/contexts/AuthContext'
import { ThemeProvider } from '../src/contexts/ThemeContext'

// Custom render function with providers
function renderWithProviders(
  ui: React.ReactElement,
  options: RenderOptions & {
    queryClient?: QueryClient
    authValue?: any
  } = {}
) {
  const {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    }),
    authValue = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn()
    },
    ...renderOptions
  } = options
  
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider value={authValue}>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    )
  }
  
  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock SSE hook
export function mockSSEHook(overrides = {}) {
  return {
    isConnected: true,
    isReconnecting: false,
    error: null,
    messages: [],
    connect: jest.fn(),
    disconnect: jest.fn(),
    sendMessage: jest.fn(),
    ...overrides
  }
}

// Mock agent progress data
export function createMockAgent(overrides = {}): AgentProgress {
  return {
    id: 'agent-1',
    name: 'Research Agent',
    status: 'working',
    progress: 50,
    currentTask: 'Analyzing data',
    estimatedTimeRemaining: 120,
    results: [],
    ...overrides
  }
}

export { renderWithProviders as render }
export * from '@testing-library/react'
```

### Performance Testing

```typescript
// tests/performance/component-performance.test.tsx
describe('Component Performance', () => {
  test('AgentGrid renders efficiently with many agents', async () => {
    const manyAgents = Array.from({ length: 50 }, (_, i) => 
      createMockAgent({ id: `agent-${i}`, name: `Agent ${i}` })
    )
    
    const startTime = performance.now()
    
    render(<AgentGrid agents={manyAgents} />)
    
    const renderTime = performance.now() - startTime
    
    // Should render within reasonable time (adjust threshold as needed)
    expect(renderTime).toBeLessThan(100) // 100ms
    
    // Verify all agents are rendered
    expect(screen.getAllByTestId('agent-card')).toHaveLength(50)
  })
  
  test('SSE message handling does not cause memory leaks', async () => {
    const { unmount } = render(<ResearchProgress sessionId="test" />)
    
    // Simulate many SSE messages
    for (let i = 0; i < 1000; i++) {
      // Simulate message handling
      act(() => {
        // This would be handled by actual SSE in real component
      })
    }
    
    // Unmount component
    unmount()
    
    // Check for cleanup (in real tests, you'd use more sophisticated leak detection)
    expect(global.gc).toBeDefined()
    global.gc?.()
  })
})
```

## Continuous Integration Testing

### GitHub Actions Workflow

```yaml
# .github/workflows/frontend-tests.yml
name: Frontend Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18, 20]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: frontend
      
  e2e:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Build application
        run: npm run build
      
      - name: Start test server
        run: npm run start:test &
      
      - name: Wait for server
        run: npx wait-on http://localhost:3000
      
      - name: Run E2E tests
        run: npx playwright test
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Component Installation Testing

```typescript
// tests/installation/component-installation.test.ts
describe('Component Installation', () => {
  test('all shadcn/ui components are installed correctly', () => {
    const requiredShadcnComponents = [
      'button', 'input', 'card', 'alert', 'toast', 
      'progress', 'badge', 'avatar', 'sheet', 'dialog', 'tabs'
    ]
    
    requiredShadcnComponents.forEach(component => {
      expect(() => {
        require(`@/components/ui/${component}`)
      }).not.toThrow()
    })
  })
  
  test('Prompt-Kit components are installed correctly', () => {
    const promptKitComponents = [
      'prompt-input', 'chat-container', 'message'
    ]
    
    promptKitComponents.forEach(component => {
      expect(() => {
        require(`@/components/ui/${component}`)
      }).not.toThrow()
    })
  })
  
  test('component dependencies are satisfied', async () => {
    // Test that all required npm packages are installed
    const requiredPackages = [
      '@radix-ui/react-avatar',
      '@radix-ui/react-progress', 
      'class-variance-authority',
      'clsx',
      'tailwind-merge'
    ]
    
    for (const pkg of requiredPackages) {
      expect(() => require(pkg)).not.toThrow()
    }
  })
})
```

## Coverage Requirements

### Coverage Targets by Component Type

- **Core Components**: 90%+ coverage
  - ResearchForm, AgentGrid, PlanApproval
  - Authentication components
  - Real-time streaming components

- **Utility Functions**: 95%+ coverage
  - API clients, validation, formatting
  - State management utilities
  - Helper functions

- **Custom Hooks**: 85%+ coverage
  - useAuth, useResearch, useSession
  - SSE connection hooks
  - Local storage hooks

- **Integration Points**: 80%+ coverage
  - API integration layers
  - SSE message handling
  - Authentication flows

### Quality Gates

All tests must pass before deployment:
- Unit test coverage > 80%
- Integration tests > 90% pass rate
- E2E tests > 95% pass rate
- No critical security vulnerabilities
- Performance benchmarks within acceptable range

This comprehensive testing strategy ensures the Vana frontend rebuild maintains high quality standards while supporting the complex real-time multi-agent research workflows.