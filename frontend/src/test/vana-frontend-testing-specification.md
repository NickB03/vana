# Vana Frontend Testing Specification

## Test Overview

This document provides comprehensive testing specifications for the Vana frontend rebuild project, covering both the frontend foundation and ADK service layer implementations.

## Project Architecture Summary

### Frontend Foundation
- **React 19.1** with TypeScript and Vite
- **shadcn/ui** + **kibo-ui** component libraries
- **Context-based state management** (AuthContext, SessionContext, AppContext, SSEContext)
- **Tailwind CSS** styling with theme support

### ADK Service Layer
- **ADKClient**: Unified service orchestration
- **SSEManager**: Per-message SSE connections
- **SessionService**: Session management with persistence
- **MessageTransformer**: ADK ↔ UI format conversion
- **EventStore**: Event storage and debugging

## Testing Framework Configuration

### Core Tools
- **Vitest**: Test runner with ES modules support
- **React Testing Library**: Component testing utilities
- **jsdom**: Browser environment simulation
- **MSW (Mock Service Worker)**: API mocking
- **@testing-library/user-event**: User interaction testing

### Configuration Files
- `vitest.config.ts`: Main test configuration
- `src/test/setup.ts`: Global test setup with mocks
- Coverage target: 80% minimum unit test coverage

## Test Categories and Structure

### 1. Unit Tests (`*.test.ts|tsx`)

#### Context Providers (`src/contexts/__tests__/`)
- [x] `AuthContext.test.tsx` - ✅ Complete
- [x] `integration.test.tsx` - ✅ Complete  
- [ ] `SessionContext.test.tsx` - ⏳ Pending
- [ ] `AppContext.test.tsx` - ⏳ Pending
- [ ] `SSEContext.test.tsx` - ⏳ Pending

#### Service Layer (`src/services/__tests__/`)
- [ ] `adk-client.test.ts` - ⏳ Pending
- [ ] `sse-manager.test.ts` - ⏳ Pending
- [ ] `session-service.test.ts` - ⏳ Pending
- [ ] `message-transformer.test.ts` - ⏳ Pending
- [ ] `event-store.test.ts` - ⏳ Pending

#### Utilities (`src/utils/__tests__/`)
- [ ] `event-emitter.test.ts` - ⏳ Pending

### 2. Integration Tests (`src/test/integration/`)
- [ ] `context-service-integration.test.tsx` - Context + Service interaction
- [ ] `sse-flow-integration.test.ts` - End-to-end SSE message flow
- [ ] `session-persistence-integration.test.ts` - Session lifecycle testing
- [ ] `error-recovery-integration.test.ts` - Error handling flows

### 3. Component Tests (`src/components/__tests__/`)
- [ ] `ChatInterface.test.tsx` - Main chat component
- [ ] `ThinkingPanel.test.tsx` - AI thinking display
- [ ] `ConnectionStatus.test.tsx` - Connection indicator
- [ ] `ui/ai-components.test.tsx` - kibo-ui AI components

### 4. E2E Scenarios (`src/test/e2e/`)
- [ ] `user-authentication-flow.test.ts` - Complete auth flow
- [ ] `research-session-flow.test.ts` - Session creation and messaging
- [ ] `sse-real-time-updates.test.ts` - Real-time event handling
- [ ] `connection-recovery.test.ts` - Offline/online scenarios

## Test Utilities and Helpers

### Mock Strategies

#### 1. LocalStorage Mock
```typescript
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
```

#### 2. EventSource Mock
```typescript
const mockEventSource = {
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: EventSource.OPEN,
};
```

#### 3. MSW API Mocking
- Mock ADK backend endpoints
- Simulate SSE streams
- Handle authentication flows
- Error response scenarios

### Test Utilities (`src/test/utils/`)

#### 1. Render Helpers
- `renderWithProviders()` - Render with all contexts
- `renderWithAuth()` - Render with authenticated user
- `renderWithSession()` - Render with active session

#### 2. Event Simulators
- `simulateSSEEvent()` - Generate mock SSE events
- `simulateUserMessage()` - Create user message events
- `simulateConnectionError()` - Generate connection failures

#### 3. Data Generators
- `createMockUser()` - Generate user objects
- `createMockSession()` - Generate session objects
- `createMockADKEvent()` - Generate ADK events

#### 4. Performance Helpers
- `measureRenderTime()` - Component render performance
- `measureEventProcessing()` - Event handling performance
- `waitForConnection()` - Connection establishment

## Detailed Test Specifications

## Test Cases by Module

### AuthContext Tests

| Test ID | Description | Type | Priority |
| ------- | ----------- | ---- | -------- |
| AUTH-01 | Initial state provides correct defaults | Unit | High |
| AUTH-02 | Guest mode activation and persistence | Unit | High |
| AUTH-03 | User sign-in flow and state updates | Unit | High |
| AUTH-04 | Sign-out flow and cleanup | Unit | High |
| AUTH-05 | Context splitting performance optimization | Unit | Medium |
| AUTH-06 | LocalStorage persistence and restoration | Unit | High |
| AUTH-07 | Error handling for invalid credentials | Unit | Medium |
| AUTH-08 | Context provider boundary errors | Unit | Low |

### SessionContext Tests

| Test ID | Description | Type | Priority |
| ------- | ----------- | ---- | -------- |
| SESS-01 | Session creation with valid parameters | Unit | High |
| SESS-02 | Session persistence across page reloads | Unit | High |
| SESS-03 | Multiple session management | Unit | Medium |
| SESS-04 | Session cleanup on user logout | Unit | High |
| SESS-05 | Session restoration from localStorage | Unit | High |
| SESS-06 | Invalid session data handling | Unit | Medium |
| SESS-07 | Session timeout and renewal | Unit | Low |

### SSEContext Tests

| Test ID | Description | Type | Priority |
| ------- | ----------- | ---- | -------- |
| SSE-01 | Connection establishment for authenticated users | Unit | High |
| SSE-02 | Event subscription and unsubscription | Unit | High |
| SSE-03 | Connection state management | Unit | High |
| SSE-04 | Reconnection logic and backoff | Unit | Medium |
| SSE-05 | Event filtering and routing | Unit | Medium |
| SSE-06 | Connection cleanup on component unmount | Unit | High |
| SSE-07 | Error handling for connection failures | Unit | Medium |

### ADKClient Tests

| Test ID | Description | Type | Priority |
| ------- | ----------- | ---- | -------- |
| ADK-01 | Client initialization with valid config | Unit | High |
| ADK-02 | Message sending with proper formatting | Unit | High |
| ADK-03 | Event transformation and routing | Unit | High |
| ADK-04 | Connection lifecycle management | Unit | High |
| ADK-05 | Error handling and recovery | Unit | Medium |
| ADK-06 | Performance metrics collection | Unit | Low |
| ADK-07 | Debug information generation | Unit | Low |
| ADK-08 | Event history management | Unit | Medium |

### SSEManager Tests

| Test ID | Description | Type | Priority |
| ------- | ----------- | ---- | -------- |
| SSE-M-01 | Per-message connection establishment | Unit | High |
| SSE-M-02 | Message streaming and parsing | Unit | High |
| SSE-M-03 | Connection timeout handling | Unit | Medium |
| SSE-M-04 | Request abortion and cleanup | Unit | Medium |
| SSE-M-05 | Performance metrics tracking | Unit | Low |
| SSE-M-06 | Error event handling | Unit | Medium |
| SSE-M-07 | Concurrent request management | Unit | High |

### MessageTransformer Tests

| Test ID | Description | Type | Priority |
| ------- | ----------- | ---- | -------- |
| MSG-01 | ADK event to UI event transformation | Unit | High |
| MSG-02 | User message to ADK format conversion | Unit | High |
| MSG-03 | Metadata preservation during transformation | Unit | Medium |
| MSG-04 | Invalid event format handling | Unit | Medium |
| MSG-05 | Complex nested event structures | Unit | Low |
| MSG-06 | Event type mapping accuracy | Unit | High |

### EventStore Tests

| Test ID | Description | Type | Priority |
| ------- | ----------- | ---- | -------- |
| EVT-01 | Event storage and retrieval | Unit | High |
| EVT-02 | Event filtering by session/type | Unit | High |
| EVT-03 | Event subscription and callbacks | Unit | High |
| EVT-04 | Memory management and event cleanup | Unit | Medium |
| EVT-05 | Debug mode information | Unit | Low |
| EVT-06 | Performance with large event volumes | Unit | Low |

## Integration Test Scenarios

### Context-Service Integration

| Test ID | Description | Priority |
| ------- | ----------- | -------- |
| INT-01 | Auth context triggering SSE connection | High |
| INT-02 | Session context coordinating with ADK client | High |
| INT-03 | App context managing global state with services | Medium |
| INT-04 | Error propagation between contexts and services | Medium |
| INT-05 | Performance impact of context updates on services | Low |

### SSE Flow Integration

| Test ID | Description | Priority |
| ------- | ----------- | -------- |
| SSE-INT-01 | End-to-end message sending and receiving | High |
| SSE-INT-02 | Event transformation pipeline | High |
| SSE-INT-03 | Connection recovery during active sessions | Medium |
| SSE-INT-04 | Multiple concurrent message streams | Medium |
| SSE-INT-05 | Performance under high message volume | Low |

## Component Test Scenarios

### ChatInterface Tests

| Test ID | Description | Priority |
| ------- | ----------- | -------- |
| CHAT-01 | Message input and submission | High |
| CHAT-02 | Message history display and scrolling | High |
| CHAT-03 | Real-time message updates | High |
| CHAT-04 | Loading states during processing | Medium |
| CHAT-05 | Error message display | Medium |
| CHAT-06 | Accessibility compliance | Low |

### ThinkingPanel Tests

| Test ID | Description | Priority |
| ------- | ----------- | -------- |
| THINK-01 | Thinking state visualization | High |
| THINK-02 | Progress indicators | Medium |
| THINK-03 | Reasoning step display | Medium |
| THINK-04 | Animation and transitions | Low |

## E2E Test Scenarios

### User Authentication Flow

```typescript
describe('E2E: User Authentication', () => {
  it('should complete full authentication cycle', async () => {
    // 1. Start as anonymous user
    // 2. Enter guest mode
    // 3. Upgrade to authenticated user
    // 4. Verify persistent session
    // 5. Sign out and verify cleanup
  });
});
```

### Research Session Flow

```typescript
describe('E2E: Research Session', () => {
  it('should create and manage research session', async () => {
    // 1. Authenticate user
    // 2. Create new research session
    // 3. Send research query
    // 4. Receive and display responses
    // 5. Verify session persistence
  });
});
```

## Performance Benchmarks

### Lighthouse Targets
- **Performance**: 90+
- **Accessibility**: 95+
- **Best Practices**: 90+
- **SEO**: 90+

### Custom Metrics
- Initial render time: < 100ms
- Context provider initialization: < 50ms
- SSE connection establishment: < 500ms
- Message processing latency: < 100ms
- Memory usage growth: < 10MB per hour

## Coverage Requirements

### Unit Tests
- **Minimum Coverage**: 80%
- **Critical Paths**: 95%
- **Service Layer**: 90%
- **Context Providers**: 90%

### Integration Tests
- All critical user workflows covered
- Error scenarios tested
- Performance edge cases included

### E2E Tests
- Main user journey: Guest → Auth → Research
- Connection recovery scenarios
- Cross-browser compatibility (Chrome, Firefox, Safari)

## Test Data Management

### Mock Data Structure
```typescript
// User mock data
const mockUsers = {
  guest: { isGuest: true, id: 'guest_123' },
  authenticated: { isGuest: false, email: 'user@example.com' },
  expired: { isGuest: false, tokenExpired: true }
};

// Session mock data
const mockSessions = {
  basic: { id: 'sess_123', topic: 'Test Research' },
  withHistory: { id: 'sess_456', messages: [...] },
  expired: { id: 'sess_789', expired: true }
};

// ADK event mock data
const mockADKEvents = {
  userMessage: { type: 'user_message', content: 'Hello' },
  agentResponse: { type: 'agent_response', content: 'Hi there' },
  thinking: { type: 'thinking', reasoning: [...] }
};
```

### Environment Configuration
```typescript
// Test environment variables
const testConfig = {
  ADK_API_URL: 'http://localhost:3001/api',
  SSE_ENDPOINT: 'http://localhost:3001/sse',
  ENABLE_MOCK_RESPONSES: true,
  TEST_USER_TOKEN: 'test-token-123'
};
```

## Test Execution Strategy

### Local Development
```bash
# Run all tests
npm run test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test auth.test.tsx

# Run in watch mode
npm run test --watch
```

### CI/CD Pipeline
1. **Pre-commit**: Lint and quick unit tests
2. **PR Validation**: Full test suite + coverage report
3. **Staging Deploy**: Integration tests + E2E tests
4. **Production Deploy**: Smoke tests + monitoring

### Performance Testing
```bash
# Lighthouse CI integration
npm run lighthouse:ci

# Bundle analysis
npm run analyze

# Performance regression testing
npm run perf:test
```

## Error Scenarios and Edge Cases

### Network Conditions
- Offline/online transitions
- Slow network connections
- Connection timeouts
- SSL certificate errors

### Data Conditions
- Empty/null responses
- Malformed JSON data
- Large payload handling
- Character encoding issues

### User Conditions
- Token expiration during session
- Multiple tab scenarios
- Browser storage disabled
- JavaScript disabled

### System Conditions
- Memory pressure
- CPU throttling
- Service worker conflicts
- Third-party script interference

## Test Maintenance Guidelines

### Regular Updates
- Update mocks when API changes
- Verify test data remains valid
- Review and update performance benchmarks
- Maintain browser compatibility matrix

### Deprecation Strategy
- Mark obsolete tests for removal
- Migrate to new testing patterns
- Update documentation and examples
- Maintain backward compatibility where possible

### Quality Assurance
- Regular test suite performance audits
- False positive/negative monitoring
- Test flakiness tracking and resolution
- Coverage gap identification and filling

## Success Criteria

### Development Phase
- [ ] All unit tests pass with 80%+ coverage
- [ ] Integration tests cover critical workflows
- [ ] Component tests validate UI behavior
- [ ] Performance benchmarks within targets

### Pre-Production
- [ ] E2E tests pass across target browsers
- [ ] Load testing validates performance under stress
- [ ] Accessibility testing confirms compliance
- [ ] Security testing validates auth flows

### Production Readiness
- [ ] Monitoring and alerting in place
- [ ] Error tracking and reporting configured
- [ ] Performance monitoring baseline established
- [ ] Test suite integrated into CI/CD pipeline

---

*This specification serves as the foundation for comprehensive testing of the Vana frontend rebuild. All test implementations should reference this document for consistency and completeness.*