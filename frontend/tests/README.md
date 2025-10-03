# Vana Frontend Testing Framework

## Overview

This comprehensive testing framework ensures the reliability, accessibility, and performance of the Vana frontend's layout-first architecture with persistent sidebar and conditional chat system.

## Testing Strategy

### Test Pyramid Distribution
- **Unit Tests (70%)**: Component logic, hooks, utilities
- **Integration Tests (20%)**: Component interactions, API integration
- **End-to-End Tests (10%)**: Complete user journeys

### Coverage Requirements
- **Overall Coverage**: 80%+ (statements, branches, functions, lines)
- **Core Components**: 90%+ coverage
- **Custom Hooks**: 85%+ coverage
- **Utility Functions**: 95%+ coverage

## Test Suite Organization

```
tests/
├── unit/                          # Unit tests (70% of test suite)
│   ├── components/               # Component testing
│   │   ├── VanaHomePage.test.tsx         # Home page functionality
│   │   ├── VanaChatInterface.test.tsx    # Chat interface behavior
│   │   ├── VanaSidebar.test.tsx          # Sidebar interactions
│   │   └── VanaCapabilitySuggestions.test.tsx
│   ├── hooks/                    # Custom hook testing
│   │   ├── useChatState.test.ts          # Chat state management
│   │   ├── useSSE.test.ts                # SSE connection handling
│   │   └── useSidebarState.test.ts       # Sidebar state logic
│   └── utils/                    # Utility function testing
│       ├── chatAPI.test.ts
│       └── helpers.test.ts
├── integration/                   # Integration tests (20% of test suite)
│   ├── chat-flow.test.tsx               # Home → Chat flow
│   ├── sidebar-navigation.test.tsx       # Sidebar interactions
│   ├── responsive-layout.test.tsx        # Layout responsiveness
│   └── authentication.test.tsx           # Auth integration
├── e2e/                          # End-to-end tests (10% of test suite)
│   ├── user-journeys.spec.ts            # Complete user workflows
│   ├── responsive-design.spec.ts         # Cross-device testing
│   ├── accessibility.spec.ts            # A11y validation
│   └── performance.spec.ts              # Performance validation
├── accessibility/                # Accessibility testing
│   ├── aria-compliance.test.tsx          # ARIA compliance
│   ├── keyboard-navigation.test.tsx      # Keyboard accessibility
│   └── screen-reader.test.tsx           # Screen reader compatibility
├── performance/                  # Performance testing
│   ├── rendering.test.tsx               # Render performance
│   ├── memory-usage.test.tsx            # Memory leak detection
│   └── sse-performance.test.tsx         # Real-time performance
├── setup/                        # Test configuration
│   ├── vitest.setup.ts                  # Global test setup
│   ├── accessibility.setup.ts           # A11y testing tools
│   ├── performance.setup.ts             # Performance utilities
│   ├── global-setup.ts                  # E2E setup
│   └── global-teardown.ts               # E2E cleanup
└── utils/                        # Test utilities
    └── testing-utils.tsx                # Custom render functions, mocks
```

## Running Tests

### All Tests
```bash
npm run test:ci              # Run all test suites
```

### Individual Test Suites
```bash
npm run test:unit            # Unit tests with coverage
npm run test:integration     # Integration tests
npm run test:e2e            # End-to-end tests
npm run test:accessibility  # Accessibility tests
npm run test:performance    # Performance tests
```

### Development Testing
```bash
npm run test:watch          # Watch mode for development
npm run test:coverage       # Generate coverage report
npm run test:e2e:ui         # E2E tests with UI
```

## Test Configuration

### Vitest Configuration
- **Unit Tests**: `vitest.config.ts`
- **Integration Tests**: `vitest.integration.config.ts`
- **Accessibility Tests**: `vitest.accessibility.config.ts`
- **Performance Tests**: `vitest.performance.config.ts`

### Playwright Configuration
- **E2E Tests**: `playwright.config.ts`
- **Cross-browser testing**: Chrome, Firefox, Safari, Edge
- **Mobile testing**: iPhone, Pixel devices

## Key Testing Features

### 1. Layout Architecture Testing
Tests the persistent sidebar + conditional chat pattern:

```typescript
// Test sidebar persistence across routes
it('maintains sidebar state during navigation', async () => {
  // Open sidebar on home page
  await user.click(screen.getByTestId('sidebar-toggle'))
  
  // Navigate to chat
  await user.click(screen.getByTestId('capability-research'))
  
  // Sidebar should remain available
  expect(screen.getByTestId('sidebar')).toBeInTheDocument()
})
```

### 2. SSE Real-time Testing
Validates streaming functionality:

```typescript
// Test SSE message handling
it('receives and processes SSE messages', async () => {
  const { result } = renderHook(() => useSSE(testUrl))
  
  // Simulate SSE message
  act(() => {
    mockEventSource.onmessage({
      data: JSON.stringify({ type: 'agent_progress', progress: 50 })
    })
  })
  
  expect(result.current.messages).toHaveLength(1)
})
```

### 3. Accessibility Testing
Ensures WCAG 2.1 AA compliance:

```typescript
// Test ARIA compliance
it('passes axe accessibility checks', async () => {
  const { container } = render(<VanaHomePage />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### 4. Performance Testing
Validates performance budgets:

```typescript
// Test render performance
it('renders component within budget', async () => {
  const { duration } = await measureFunction(
    () => render(<VanaChatInterface messageCount={500} />)
  )
  
  expect(duration).toBeLessThan(200) // 200ms budget
})
```

## Testing Utilities

### Custom Render Function
Provides pre-configured providers:

```typescript
import { render } from '../utils/testing-utils'

// Automatically includes QueryClient, Auth, Theme providers
render(<MyComponent />)
```

### Mock Factories
Generate consistent test data:

```typescript
const mockMessage = createMockMessage({
  content: 'Test message',
  role: 'user'
})

const mockConversation = createMockConversation({
  title: 'Test Conversation',
  messages: [mockMessage]
})
```

### SSE Testing Utilities
Simulate server-sent events:

```typescript
// Simulate SSE message
eventUtils.simulateSSEMessage(mockSSE, 'agent_progress', {
  agentId: 'agent-1',
  progress: 75
})
```

## Accessibility Testing

### ARIA Compliance
- All interactive elements have proper ARIA labels
- Landmarks and headings follow semantic structure
- Form controls have associated labels

### Keyboard Navigation
- Complete keyboard accessibility
- Logical tab order
- Focus management during navigation

### Screen Reader Support
- Proper role attributes
- Live regions for dynamic content
- Descriptive text for complex interactions

## Performance Testing

### Rendering Performance
- Component mount/unmount timing
- Update performance with large datasets
- Memory usage monitoring

### Network Performance
- SSE connection efficiency
- API request optimization
- Bundle size analysis

### Performance Budgets
- Render time: <100ms
- Component mount: <80ms
- Memory usage: <30MB baseline

## CI/CD Integration

### GitHub Actions Pipeline
- **Lint & Type Check**: Code quality validation
- **Unit Tests**: Core functionality testing
- **Integration Tests**: Component interaction testing
- **Accessibility Tests**: A11y compliance verification
- **Performance Tests**: Performance budget validation
- **E2E Tests**: Cross-browser user journey testing
- **Security Scan**: Vulnerability assessment

### Quality Gates
All tests must pass for deployment:
- Unit test coverage >80%
- Integration tests >90% pass rate
- E2E tests >95% pass rate
- No critical accessibility violations
- Performance budgets met
- No critical security vulnerabilities

## Best Practices

### 1. Test Structure
```typescript
describe('Component/Feature', () => {
  describe('specific behavior', () => {
    it('should do something specific', () => {
      // Arrange
      // Act
      // Assert
    })
  })
})
```

### 2. Test Naming
- Descriptive test names explaining behavior
- Use "should" for expected outcomes
- Group related tests in describe blocks

### 3. Test Data
- Use factory functions for consistent data
- Avoid hardcoded values
- Clean up after tests

### 4. Async Testing
```typescript
// Proper async testing
await waitFor(() => {
  expect(screen.getByText('Expected text')).toBeInTheDocument()
})
```

### 5. Error Testing
```typescript
// Test error conditions
it('handles network errors gracefully', async () => {
  server.use(
    http.get('/api/data', () => {
      return HttpResponse.error()
    })
  )
  
  render(<MyComponent />)
  
  await expect(screen.findByText('Error message')).toBeInTheDocument()
})
```

## Debugging Tests

### Test Debugging
```bash
# Run specific test
npm run test -- tests/unit/components/VanaHomePage.test.tsx

# Run with debug output
npm run test -- --reporter=verbose

# Open test UI
npm run test -- --ui
```

### E2E Debugging
```bash
# Run with browser visible
npm run test:e2e -- --headed

# Generate trace
npm run test:e2e -- --trace=on

# Debug specific test
npm run test:e2e -- --debug tests/e2e/user-journeys.spec.ts
```

## Continuous Improvement

### Coverage Monitoring
- Regular coverage reports
- Identify untested code paths
- Prioritize testing critical functionality

### Performance Monitoring
- Track performance trends
- Identify regressions early
- Optimize based on real usage patterns

### Accessibility Audits
- Regular accessibility testing
- User testing with assistive technologies
- Continuous improvement of inclusive design

## Documentation Updates

Keep testing documentation current:
- Update when adding new test types
- Document new testing utilities
- Share testing best practices
- Review and update testing strategies

## Support

For testing questions or issues:
1. Check this documentation
2. Review existing test examples
3. Consult team testing guidelines
4. Create issues for testing framework improvements