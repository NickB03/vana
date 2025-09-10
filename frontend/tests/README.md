# Frontend Testing Suite

## Overview

Comprehensive testing infrastructure for the Vana frontend application, ensuring reliability, performance, and quality of the Google ADK-integrated research platform.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual components and services
│   ├── api-client.test.ts   # API client functionality tests
│   ├── auth-service.test.ts # Authentication service tests
│   └── simple.test.ts       # Basic Jest setup validation
├── integration/             # Integration tests for system components
│   ├── google-adk-integration.test.ts    # Google ADK backend integration
│   ├── event-processing.test.ts          # SSE event processing tests
│   ├── error-handling.test.ts            # Error scenarios and recovery
│   ├── connection-resilience.test.ts     # SSE connection stability
│   ├── end-to-end-workflow.test.ts       # Complete user journey tests
│   └── performance-memory.test.ts        # Performance and memory tests
├── e2e/                     # End-to-end browser tests
│   └── research-workflow.spec.ts         # Playwright E2E tests
├── utils/                   # Test utilities and helpers
│   └── test-helpers.ts      # Shared testing utilities
├── jest.setup.js           # Jest configuration and global setup
└── README.md               # This documentation
```

## Testing Categories

### 1. Unit Tests (`tests/unit/`)

**Purpose**: Test individual components and services in isolation

**Key Features**:
- API client functionality testing
- Authentication service validation
- Mock-based testing for external dependencies
- Fast execution and focused scope

**Coverage Targets**:
- Functions: >80%
- Branches: >75%
- Statements: >85%
- Lines: >80%

### 2. Integration Tests (`tests/integration/`)

**Purpose**: Test interactions between components and external systems

**Google ADK Integration Tests**:
- Real backend connectivity validation
- Session management testing
- Authentication flow validation
- API error handling scenarios

**Event Processing Tests**:
- All 8 Google ADK agent event types
- Event transformation accuracy
- Agent coordination workflows
- Progress calculation correctness

**Error Handling Tests**:
- Network failure scenarios
- API error responses (400, 401, 500, 503)
- SSE connection interruptions
- Component error boundaries

**Connection Resilience Tests**:
- Automatic reconnection logic
- Heartbeat monitoring
- Exponential backoff implementation
- Connection cleanup validation

**Performance Tests**:
- Memory leak detection
- Event processing performance
- Connection stability under load
- Concurrent session handling

### 3. End-to-End Tests (`tests/e2e/`)

**Purpose**: Test complete user workflows in real browser environments

**Research Workflow Tests**:
- Complete research query submission
- Agent progress monitoring
- Result display validation
- Error handling in UI
- Mobile and desktop responsiveness

**Browser Coverage**:
- Chromium (Desktop Chrome)
- Firefox (Desktop Firefox)
- WebKit (Desktop Safari)

## Test Configuration

### Jest Configuration (`jest.config.js`)

```javascript
{
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
    '^@/contexts/(.*)$': '<rootDir>/contexts/$1'
  },
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 75,
      functions: 80,
      lines: 80
    }
  }
}
```

### Playwright Configuration (`playwright.config.ts`)

```javascript
{
  testDir: './tests/e2e',
  fullyParallel: true,
  projects: ['chromium', 'firefox', 'webkit'],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000'
  }
}
```

## Running Tests

### Quick Commands

```bash
# Run all tests
npm run test:all

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Run with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Individual Test Categories

```bash
# Unit tests
npm test -- tests/unit/

# Integration tests  
npm test -- tests/integration/

# Specific test file
npm test -- tests/unit/api-client.test.ts

# Playwright E2E tests
npx playwright test

# Playwright with UI mode
npx playwright test --ui
```

## Test Utilities

### Global Test Utilities (`global.testUtils`)

```javascript
// Mock data generators
testUtils.createMockUser()
testUtils.createMockSession()
testUtils.createMockQuery()

// SSE event generators
testUtils.createSSEEvent(type, data)
testUtils.createMessageEvent(data)

// API response mocks
testUtils.mockApiResponse(data)
testUtils.mockApiError(status, message)

// Async utilities
testUtils.waitFor(ms)
testUtils.waitForCondition(condition)
```

### Event Source Testing

```javascript
// Mock EventSource for SSE testing
const eventSource = global.EventSource.getLatest()
eventSource.simulateMessage(data)
eventSource.simulateError()
```

### Performance Testing

```javascript
// Memory usage tracking
const memoryBefore = testUtils.measureMemoryUsage()
// ... perform operations
const memoryAfter = testUtils.measureMemoryUsage()

// Performance measurement
const duration = await testUtils.measurePerformance(async () => {
  // operations to measure
})
```

## Mock Services

### Authentication

- Development session creation
- Token lifecycle management
- Login/logout simulation
- Permission validation

### API Client

- HTTP request/response mocking
- Network error simulation
- Timeout testing
- Concurrent request handling

### EventSource (SSE)

- Connection lifecycle simulation
- Event message creation
- Error scenario testing
- Cleanup validation

## Test Data Management

### Factories and Builders

```javascript
// User data
const user = createMockUser({
  email: 'test@example.com',
  displayName: 'Test User'
})

// Session data
const session = createMockSession({
  title: 'Custom Session'
})

// Agent workflow
const workflow = createFullAgentWorkflow('query-123')
```

### Event Simulation

```javascript
// Connection events
const connectionEvent = createConnectionEvent(sessionId, 'connected')

// Agent lifecycle events
const startEvent = createAgentStartedEvent('team_leader')
const progressEvent = createAgentProgressEvent('team_leader-001', 50)
const completeEvent = createAgentCompletedEvent('team_leader-001', true)
```

## Coverage Requirements

### Minimum Coverage Targets

- **Statements**: 85%
- **Branches**: 75% 
- **Functions**: 80%
- **Lines**: 80%

### Critical Path Coverage

- **Error Handling**: 100%
- **Event Processing**: 100%
- **Authentication**: 95%
- **API Integration**: 90%

## Best Practices

### Test Organization

1. **Descriptive Test Names**: Use clear, behavior-focused descriptions
2. **AAA Pattern**: Arrange, Act, Assert structure
3. **Single Responsibility**: One assertion per test where possible
4. **Test Independence**: No dependencies between tests

### Mock Management

1. **Reset Between Tests**: Clear all mocks in beforeEach/afterEach
2. **Focused Mocking**: Mock only necessary dependencies
3. **Realistic Data**: Use representative test data
4. **Error Simulation**: Test both success and failure scenarios

### Performance Considerations

1. **Fast Unit Tests**: Keep unit tests under 100ms each
2. **Efficient Integration Tests**: Group related tests to reduce setup
3. **Memory Cleanup**: Verify no memory leaks in long-running tests
4. **Concurrent Testing**: Use test isolation for parallel execution

## Debugging Tests

### Common Issues

1. **Mock Not Applied**: Check mock timing and scope
2. **Async Timing**: Use proper async/await patterns
3. **Memory Leaks**: Verify cleanup in afterEach hooks
4. **Environment Differences**: Check browser vs Node.js behavior

### Debugging Tools

```bash
# Run single test with verbose output
npm test -- --verbose tests/specific-test.ts

# Debug mode with Node.js debugger
node --inspect-brk node_modules/.bin/jest

# Playwright debug mode
npx playwright test --debug
```

## CI/CD Integration

### Pipeline Configuration

Tests run automatically on:
- Pull request creation/updates
- Main branch pushes
- Release candidate builds

### Quality Gates

- All tests must pass
- Coverage thresholds must be met
- No new ESLint violations
- Playwright tests pass in all browsers

### Performance Monitoring

- Test execution time tracking
- Memory usage validation
- Coverage trend analysis
- Flaky test detection

## Maintenance

### Regular Tasks

1. **Update Test Data**: Keep mock data current with API changes
2. **Review Coverage**: Monitor coverage trends and gaps
3. **Performance Analysis**: Check for test suite slowdowns
4. **Dependency Updates**: Keep testing libraries current

### Test Health Metrics

- Test execution time
- Flaky test frequency
- Coverage percentage trends
- Failed test analysis

## Contributing

### Adding New Tests

1. Choose appropriate test category (unit/integration/e2e)
2. Follow existing naming conventions
3. Use shared test utilities where possible
4. Ensure proper cleanup and isolation

### Test Review Checklist

- [ ] Tests are focused and independent
- [ ] Mocks are appropriate and realistic
- [ ] Error scenarios are covered
- [ ] Performance impact is minimal
- [ ] Documentation is updated if needed

## Advanced Testing Patterns

### Agent Network Testing

```javascript
// Test complete 8-agent workflow
const workflow = createFullAgentWorkflow()
workflow.forEach(event => {
  eventSource.simulateMessage(event)
})

// Verify all agents completed
expect(result.current.agents).toHaveLength(8)
expect(result.current.agents.every(a => a.status === 'completed')).toBe(true)
```

### Error Recovery Testing

```javascript
// Simulate network failure and recovery
eventSource.simulateError()
expect(result.current.connectionStatus).toBe('error')

// Trigger reconnection
await act(() => result.current.reconnect())
expect(result.current.connectionStatus).toBe('connecting')
```

### Performance Validation

```javascript
// Memory leak detection
const initialMemory = performance.memory.usedJSHeapSize
// ... perform operations
const finalMemory = performance.memory.usedJSHeapSize
expect(finalMemory - initialMemory).toBeLessThan(10 * 1024 * 1024) // <10MB
```

This comprehensive testing suite ensures the reliability, performance, and quality of the Vana frontend application, providing confidence for production deployment and ongoing development.