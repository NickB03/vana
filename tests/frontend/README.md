# Vana Frontend Testing Strategy

This directory contains the comprehensive testing suite for the Vana frontend application, designed to ensure quality, performance, and accessibility across all user interactions.

## Testing Philosophy

Our testing approach follows the testing pyramid with emphasis on:

1. **Fast Feedback**: Unit tests provide immediate feedback during development
2. **User-Centric**: E2E tests validate real user workflows
3. **Accessibility-First**: WCAG 2.1 AA compliance built into the testing process
4. **Performance-Aware**: Continuous performance validation with Lighthouse
5. **Reliability**: Comprehensive error handling and edge case coverage

## Test Structure

```
tests/frontend/
├── unit/                    # Unit tests (Vitest + React Testing Library)
│   ├── components/         # Component unit tests
│   ├── hooks/             # Custom hook tests
│   ├── stores/            # Zustand store tests
│   ├── lib/               # Utility function tests
│   └── utils/             # Testing utilities
├── integration/           # Integration tests
│   ├── api-integration.test.ts    # API integration tests
│   ├── auth-flow.test.tsx        # Authentication flow tests
│   └── sse-integration.test.ts   # SSE streaming tests
├── e2e/                   # End-to-end tests (Playwright)
│   ├── critical-user-flows.spec.ts    # Core user journeys
│   ├── canvas-interactions.spec.ts    # Canvas functionality
│   └── file-upload.spec.ts            # File upload scenarios
├── performance/           # Performance tests
│   ├── performance.spec.ts         # Core Web Vitals & metrics
│   └── lighthouse-config.js        # Lighthouse configuration
├── accessibility/         # Accessibility tests
│   └── accessibility.spec.ts      # WCAG compliance tests
├── fixtures/             # Test data and mock files
│   ├── test-document.md          # Sample markdown file
│   └── sample.js                 # Sample code file
└── utils/                # Testing utilities
    ├── test-setup.ts             # Global test setup
    ├── test-wrapper.tsx          # React testing wrapper
    ├── global-setup.ts           # Playwright global setup
    └── global-teardown.ts        # Playwright cleanup
```

## Testing Tools & Technologies

### Unit & Integration Testing
- **Vitest**: Fast unit testing with Vite integration
- **React Testing Library**: Component testing with user-centric approach
- **MSW**: Mock Service Worker for API mocking
- **@testing-library/jest-dom**: Custom Jest matchers

### End-to-End Testing
- **Playwright**: Cross-browser E2E testing
- **Multiple Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile Testing**: Responsive design validation

### Performance Testing
- **Lighthouse**: Core Web Vitals and performance audits
- **Custom Metrics**: Bundle size, memory usage, SSE performance
- **Performance Budgets**: Automated performance regression detection

### Accessibility Testing
- **Axe Core**: Automated accessibility testing
- **WCAG 2.1 AA**: Compliance validation
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader**: ARIA compliance testing

## Running Tests

### Development Workflow

```bash
# Run all unit tests in watch mode
npm run test:watch

# Run specific test file
npm run test -- message.test.tsx

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run accessibility tests only
npm run test:accessibility

# Run performance tests only
npm run test:performance

# Run all tests (CI pipeline)
npm run test:ci
```

### Test-Driven Development

```bash
# 1. Write failing test
npm run test:watch

# 2. Implement feature
# ... code changes ...

# 3. Verify test passes
# ✓ Tests should now pass

# 4. Run full test suite
npm run test:all
```

## Performance Targets

Our performance tests validate the following targets:

| Metric | Target | Description |
|--------|---------|-------------|
| First Contentful Paint | < 1.5s | Time to first visible content |
| Largest Contentful Paint | < 2.5s | Time to largest content element |
| Total Blocking Time | < 200ms | Total time of long tasks |
| Cumulative Layout Shift | < 0.1 | Visual stability metric |
| Time to Interactive | < 5s | Time until page is fully interactive |
| JavaScript Bundle | < 800KB | Total JS bundle size |
| CSS Bundle | < 100KB | Total CSS bundle size |
| SSE First Token | < 500ms | Time to first streaming token |
| Memory Usage | < 50MB | Maximum heap size increase |

## Accessibility Requirements

All components and pages must pass:

### WCAG 2.1 AA Compliance
- ✅ Color contrast ratios (4.5:1 normal, 3:1 large text)
- ✅ Keyboard navigation support
- ✅ Screen reader compatibility
- ✅ Focus management
- ✅ Semantic HTML structure

### Testing Approach
- **Automated**: Axe-core accessibility audits
- **Manual**: Keyboard navigation verification
- **Screen Reader**: ARIA implementation validation
- **Visual**: Focus indicator visibility

## Test Data Management

### Fixtures
- **test-document.md**: Sample markdown file for upload testing
- **sample.js**: JavaScript file for code editor testing
- **sample.py**: Python file for language detection
- **data.csv**: CSV file for file handling tests

### Factories
```typescript
// Create test data programmatically
const message = factories.message({
  role: 'assistant',
  content: 'Test response'
})

const session = factories.session({
  title: 'Test Session',
  messages: [message]
})
```

## Mocking Strategy

### API Mocking (MSW)
```typescript
// Mock successful API responses
server.use(
  http.post('/api/sessions', () => {
    return HttpResponse.json({ id: 'session-123' })
  })
)
```

### Component Mocking
```typescript
// Mock complex components for focused testing
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: any) => (
    <textarea value={value} onChange={e => onChange(e.target.value)} />
  )
}))
```

### Store Mocking
```typescript
// Mock Zustand stores
vi.mock('@/stores/chatStore', () => ({
  useChatStore: () => ({
    messages: [],
    addMessage: vi.fn(),
    isStreaming: false
  })
}))
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Frontend Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:ci
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: |
            coverage/
            playwright-report/
            lighthouse-report.html
```

### Quality Gates
- Unit test coverage > 80%
- All E2E tests pass
- Performance targets met
- Zero accessibility violations
- Bundle size within limits

## Debugging Tests

### Unit Tests
```bash
# Debug with VS Code
npm run test:ui

# Debug specific test
npm run test -- --inspect-brk message.test.tsx
```

### E2E Tests
```bash
# Debug with Playwright UI
npm run test:e2e:ui

# Debug specific test
npm run test:e2e:debug -- critical-user-flows.spec.ts
```

### Performance Analysis
```bash
# Generate Lighthouse report
npm run lighthouse

# Analyze bundle size
npm run build:analyze
```

## Best Practices

### Unit Testing
1. **Test Behavior, Not Implementation**: Focus on what the component does, not how
2. **Use Real User Interactions**: Prefer `userEvent` over `fireEvent`
3. **Test Accessibility**: Include accessibility assertions in component tests
4. **Mock External Dependencies**: Keep tests focused and fast
5. **Descriptive Test Names**: Tests should read like specifications

### E2E Testing
1. **Test Critical User Paths**: Focus on high-value user journeys
2. **Use Page Object Model**: Encapsulate page interactions
3. **Handle Async Operations**: Properly wait for dynamic content
4. **Test Error States**: Include unhappy path scenarios
5. **Keep Tests Independent**: Each test should be able to run in isolation

### Performance Testing
1. **Set Performance Budgets**: Define clear thresholds
2. **Test Real Conditions**: Use realistic data and network conditions
3. **Monitor Regressions**: Track performance over time
4. **Test on Different Devices**: Include mobile performance testing

### Accessibility Testing
1. **Automate Where Possible**: Use axe-core for comprehensive coverage
2. **Test Keyboard Navigation**: Verify all functionality is keyboard accessible
3. **Test with Screen Readers**: Validate ARIA implementation
4. **Include Edge Cases**: Test error states and dynamic content

## Troubleshooting

### Common Issues

**Tests failing intermittently**
- Check for race conditions in async operations
- Ensure proper cleanup in `afterEach` hooks
- Verify mock implementations are deterministic

**Performance tests flaky**
- Run tests multiple times and use averages
- Account for system variance in CI environments
- Use relative thresholds rather than absolute values

**E2E tests timeout**
- Increase timeout values for slower operations
- Check for proper wait conditions
- Verify test environment stability

**Accessibility violations**
- Review component implementation for semantic HTML
- Check ARIA attributes and roles
- Verify keyboard navigation implementation

## Contributing

### Adding New Tests
1. Follow the established test structure
2. Include both happy path and error scenarios
3. Add performance and accessibility considerations
4. Update documentation for new testing patterns

### Test Review Checklist
- [ ] Tests are focused and well-named
- [ ] Both success and error cases are covered
- [ ] Performance implications are considered
- [ ] Accessibility requirements are validated
- [ ] Tests are deterministic and reliable
- [ ] Documentation is updated if needed

## Resources

- [Testing Library Documentation](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Axe Core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)