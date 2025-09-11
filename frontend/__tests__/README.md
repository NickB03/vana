# Frontend Integration Testing Suite

Comprehensive integration tests for the Google ADK backend integration including API client, SSE streaming, authentication, React components, and end-to-end workflows.

## 🏗️ Test Architecture

### Test Structure
```
__tests__/
├── integration/           # Integration test suites
│   ├── api-client.test.ts        # API client functionality
│   ├── sse-integration.test.ts   # Server-Sent Events
│   ├── auth-integration.test.ts  # Authentication flows
│   ├── components-integration.test.tsx # React components
│   └── performance.test.ts       # Performance benchmarks
├── e2e/                  # End-to-end tests
│   ├── chat-workflow.spec.ts     # Complete user workflows
│   ├── global-setup.ts           # E2E environment setup
│   └── global-teardown.ts        # E2E cleanup
├── mocks/                # Mock service worker setup
│   ├── server.ts                 # MSW server configuration
│   └── handlers.ts               # API endpoint mocks
└── utils/                # Test utilities
    └── test-helpers.ts           # Reusable test utilities
```

### Test Categories

#### 🔌 **API Client Tests** (`api-client.test.ts`)
- HTTP client functionality (GET, POST requests)
- Error handling (network failures, timeouts, API errors)
- Retry logic with exponential backoff
- Authentication token handling
- Response validation with Zod schemas
- Rate limiting and server errors

#### 🌊 **SSE Integration Tests** (`sse-integration.test.ts`)
- SSE connection establishment and management
- Real-time event handling and parsing
- Reconnection logic and error recovery
- Memory leak prevention and cleanup
- Connection state management
- Performance with rapid events

#### 🔐 **Authentication Tests** (`auth-integration.test.ts`)
- Login/logout functionality
- Token storage and retrieval
- Automatic token refresh
- Protected route behavior
- Error handling for auth failures
- Session management

#### ⚛️ **Component Integration Tests** (`components-integration.test.tsx`)
- Chat interface with real API calls
- Streaming message components with SSE
- Error states and loading indicators
- User authentication UI components
- Real backend integration

#### 🎭 **End-to-End Tests** (`chat-workflow.spec.ts`)
- Complete user workflows
- Authentication flow from login to logout
- Error recovery scenarios
- Real-time streaming experience
- Mobile responsiveness
- Performance with large conversations

#### ⚡ **Performance Tests** (`performance.test.ts`)
- API client response times
- SSE connection performance
- Memory usage monitoring
- Concurrent connection handling
- Large data handling
- SLA compliance

## 🚀 Quick Start

### Prerequisites
```bash
cd frontend
npm install
```

### Run All Tests
```bash
# Run all integration tests
npm test

# Run specific test suites
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:e2e           # End-to-end tests only

# Run with coverage
npm run test:coverage
```

### Watch Mode (Development)
```bash
npm run test:watch
```

## 🔧 Configuration

### Jest Configuration (`jest.config.js`)
- **Environment**: jsdom for React component testing
- **Coverage**: 80%+ targets for lines, functions, branches, statements
- **Timeout**: 10 seconds for integration tests
- **Module mapping**: `@/` alias support
- **Transform ignore**: MSW and ES modules support

### Playwright Configuration (`playwright.config.ts`)
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome/Safari
- **Parallel execution**: Full parallelization
- **Screenshots**: On failure only
- **Video**: Retain on failure
- **Traces**: On first retry
- **Retries**: 2 on CI, 0 locally

### MSW Setup (`mocks/`)
Mock Service Worker provides realistic API responses:
- Health check endpoints
- Chat message creation and streaming
- Authentication flows
- Error simulation (rate limits, network failures)
- Agent network events

## 📊 Test Coverage

### Coverage Requirements
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

### Coverage Reports
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## 🎯 Running Specific Tests

### By Test Suite
```bash
# API client tests only
npx jest api-client.test.ts

# SSE integration tests
npx jest sse-integration.test.ts

# Performance tests
npx jest performance.test.ts

# E2E chat workflow
npx playwright test chat-workflow.spec.ts
```

### By Pattern
```bash
# Tests matching pattern
npx jest --testNamePattern="should handle"

# Files matching pattern
npx jest --testPathPattern="integration"
```

### Debug Mode
```bash
# Jest debug mode
npx jest --detectOpenHandles --verbose

# Playwright debug mode
npx playwright test --debug
```

## 🔍 Writing New Tests

### API Client Tests
```typescript
import { apiService, ApiError } from '@/lib/api-client'
import { server } from '../mocks/server'

describe('New API Feature', () => {
  it('should handle new endpoint', async () => {
    const response = await apiService.newEndpoint()
    expect(response).toEqual(expectedResponse)
  })
})
```

### SSE Tests
```typescript
import { streamChatResponse } from '@/lib/chat-api'
import { SSETestUtils } from '../utils/test-helpers'

describe('New SSE Feature', () => {
  it('should handle new event type', async () => {
    server.use(
      SSETestUtils.createMockSSEStream(['test message'])
    )
    
    const responses = []
    for await (const response of streamChatResponse('test')) {
      responses.push(response)
    }
    
    expect(responses.length).toBeGreaterThan(0)
  })
})
```

### Component Tests
```typescript
import { render, screen, waitFor } from '../utils/test-helpers'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent Integration', () => {
  it('should integrate with real API', async () => {
    render(<MyComponent />)
    
    // Trigger API call
    fireEvent.click(screen.getByRole('button'))
    
    // Wait for response
    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument()
    })
  })
})
```

### E2E Tests
```typescript
import { test, expect } from '@playwright/test'

test('new user workflow', async ({ page }) => {
  await page.goto('/')
  
  // Perform user actions
  await page.click('[data-testid="action-button"]')
  
  // Verify results
  await expect(page.locator('[data-testid="result"]')).toBeVisible()
})
```

## 🛠️ Test Utilities

### Authentication Helpers
```typescript
import { AuthTestUtils } from '../utils/test-helpers'

// Set up authenticated state
AuthTestUtils.setupAuth('mock_token')

// Mock login success
AuthTestUtils.mockSuccessfulLogin()

// Mock protected endpoint
AuthTestUtils.mockProtectedEndpoint('/api/data', { data: 'test' })
```

### SSE Helpers
```typescript
import { SSETestUtils } from '../utils/test-helpers'

// Create custom SSE stream
server.use(
  SSETestUtils.createMockSSEStream(['msg1', 'msg2'], 100)
)

// Mock failed stream
SSETestUtils.mockFailedSSEStream('error-chat')

// Mock rapid events
server.use(
  SSETestUtils.mockRapidSSEStream(100)
)
```

### Performance Helpers
```typescript
import { PerformanceTestUtils } from '../utils/test-helpers'

// Measure execution time
const { duration, result } = await PerformanceTestUtils.measureTime(
  () => apiService.healthCheck()
)

// Benchmark function
const benchmark = await PerformanceTestUtils.benchmarkFunction(
  () => apiService.healthCheck(),
  10 // iterations
)

// Monitor memory
const { memoryIncrease } = await PerformanceTestUtils.monitorMemory(
  () => performLargeOperation()
)
```

## 🚨 Troubleshooting

### Common Issues

#### Tests Timeout
```bash
# Increase timeout for specific test
jest.setTimeout(30000)

# Or in test file
test('long running test', async () => {
  // test code
}, 30000)
```

#### MSW Handler Not Found
```typescript
// Ensure handler is registered
server.use(
  http.get('http://localhost:8000/endpoint', () => {
    return HttpResponse.json({ data: 'test' })
  })
)
```

#### Memory Leaks
```typescript
// Clean up after each test
afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
  sessionStorage.clear()
})
```

#### E2E Test Flakiness
```typescript
// Use waitFor instead of fixed timeouts
await expect(page.locator('[data-testid="element"]')).toBeVisible({
  timeout: 10000
})

// Add explicit waits for network
await page.waitForResponse('**/api/endpoint')
```

### Debug Commands
```bash
# View test output in detail
npm test -- --verbose

# Run single test file
npm test api-client.test.ts

# Debug with node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Playwright debug mode
npx playwright test --debug --headed
```

### Environment Variables
```bash
# Frontend test environment
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH=false
NODE_ENV=test

# CI environment
CI=true
CODECOV_TOKEN=your-token
```

## 📈 Performance Benchmarks

### SLA Targets
- **Health Check**: < 500ms
- **Chat Message**: < 2 seconds
- **Stream Start**: < 1 second
- **API Request**: < 1 second

### Memory Limits
- **Single Chat Session**: < 10MB increase
- **Multiple Sessions**: < 50MB increase
- **Long-running Streams**: < 10MB increase

### Concurrency
- **10 Concurrent API Calls**: < 3 seconds
- **5 Concurrent SSE Streams**: < 10 seconds
- **100 Rapid SSE Events**: < 2 seconds

## 🔄 CI/CD Integration

### GitHub Actions
The test suite runs automatically on:
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`
- Manual workflow dispatch

### Test Pipeline
1. **Unit Tests**: Fast feedback on core functionality
2. **Integration Tests**: Backend integration verification
3. **E2E Tests**: Complete user workflow validation
4. **Performance Tests**: SLA compliance verification

### Artifacts
- Test coverage reports
- Playwright HTML reports
- Performance benchmarks
- Screenshots and videos (on failure)

## 🤝 Contributing

### Adding New Tests
1. **Identify the test category** (unit, integration, e2e)
2. **Use existing utilities** from `test-helpers.ts`
3. **Follow naming conventions**: `describe('Component/Feature', () => {})`
4. **Add appropriate mocks** in `mocks/handlers.ts`
5. **Document complex test scenarios**

### Test Review Checklist
- [ ] Tests cover happy path and error cases
- [ ] Appropriate use of test utilities
- [ ] No hardcoded timeouts (use waitFor)
- [ ] Clean up after tests (no side effects)
- [ ] Clear test descriptions and comments
- [ ] Performance considerations documented

### Best Practices
- **Test behavior, not implementation**
- **Use descriptive test names**
- **Keep tests independent and isolated**
- **Mock external dependencies appropriately**
- **Write tests that are easy to maintain**
- **Focus on user-facing functionality**

## 📚 Resources

- [Testing Library Docs](https://testing-library.com/)
- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)