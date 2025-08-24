# Vana Frontend Testing Infrastructure

This document outlines the comprehensive testing infrastructure for the Vana frontend application, including Jest, Vitest, and Playwright configurations.

## 🧪 Testing Stack

### Unit & Integration Testing
- **Jest** - Primary testing framework with Next.js integration
- **Vitest** - Alternative fast testing framework
- **React Testing Library** - Component testing utilities
- **Jest DOM** - Custom Jest matchers for DOM testing

### End-to-End Testing
- **Playwright** - Cross-browser E2E testing
- **Multiple browsers** - Chromium, Firefox, WebKit
- **Mobile testing** - iPhone, Android emulation
- **Visual testing** - Screenshots and video recording

## 📁 Project Structure

```
frontend/
├── jest.config.js              # Jest configuration
├── jest.setup.js               # Jest global setup
├── vitest.config.ts            # Vitest configuration
├── playwright.config.ts        # Playwright configuration
├── src/
│   ├── __tests__/
│   │   ├── components/         # Component tests
│   │   ├── hooks/             # Hook tests
│   │   ├── e2e/               # E2E tests
│   │   │   ├── global.setup.ts
│   │   │   ├── global.teardown.ts
│   │   │   └── *.spec.ts
│   │   └── vitest.setup.ts    # Vitest setup
│   └── components/
├── __mocks__/                 # Mock files
│   ├── fileMock.js
│   └── jose.js
├── coverage/                  # Coverage reports
├── test-results/              # Test artifacts
└── playwright-report/         # Playwright HTML reports
```

## 🚀 Getting Started

### Install Dependencies

```bash
npm install
```

### Install Playwright Browsers

```bash
npm run playwright:install
npm run playwright:install-deps
```

## 🔧 Available Test Commands

### Jest (Primary Testing Framework)

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI (no watch, with coverage)
npm run test:ci
```

### Vitest (Alternative Framework)

```bash
# Run Vitest tests
npm run test:vitest

# Run Vitest with UI
npm run test:vitest:ui

# Run Vitest with coverage
npm run test:vitest:coverage
```

### Playwright (E2E Testing)

```bash
# Run E2E tests
npm run test:e2e

# Run with browser UI visible
npm run test:e2e:headed

# Run with Playwright UI
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

### All Tests

```bash
# Run all test suites
npm run test:all
```

## 📊 Coverage Requirements

### Global Coverage Thresholds
- **Statements**: 85%
- **Branches**: 80%
- **Functions**: 85%
- **Lines**: 85%

### Critical Module Thresholds
- **src/lib/**: 90% statements, 85% branches, 90% functions, 90% lines
- **src/store/**: 90% statements, 85% branches, 90% functions, 90% lines
- **src/hooks/**: 85% statements, 80% branches, 85% functions, 85% lines

### Coverage Exclusions
- TypeScript declaration files (`*.d.ts`)
- Story files (`*.stories.*`)
- Test files and mocks
- Next.js layout files
- shadcn UI components (externally tested)
- Simple utility functions

## 🧩 Configuration Details

### Jest Configuration Features
- **Next.js integration** - Automatic Next.js config loading
- **TypeScript support** - Full TS/TSX transformation
- **Path mapping** - @/ imports work seamlessly
- **CSS/Asset mocking** - Proper handling of imports
- **Coverage reporting** - Multiple formats (HTML, LCOV, JSON)
- **Watch plugins** - Enhanced development experience

### Playwright Configuration Features
- **Multi-browser testing** - Chrome, Firefox, Safari
- **Mobile testing** - iPhone, Android emulation
- **Authentication states** - Pre-configured user sessions
- **Parallel execution** - Fast test runs
- **Retry logic** - Automatic retries on CI
- **Rich reporting** - HTML reports with traces

### Vitest Configuration Features
- **Fast execution** - Faster than Jest for unit tests
- **HMR support** - Hot module reloading during testing
- **Native ESM** - Modern JavaScript support
- **UI mode** - Interactive test interface
- **Coverage with V8** - Fast native coverage

## 🛠️ Writing Tests

### Component Testing Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  test('renders and handles clicks', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Hook Testing Example

```typescript
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/hooks/use-auth'

describe('useAuth Hook', () => {
  test('handles login', async () => {
    const { result } = renderHook(() => useAuth())
    
    await act(async () => {
      await result.current.login('user@example.com', 'password')
    })
    
    expect(result.current.isAuthenticated).toBe(true)
  })
})
```

### E2E Testing Example

```typescript
import { test, expect } from '@playwright/test'

test('user can navigate to dashboard', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Dashboard')
  await expect(page).toHaveURL(/.*dashboard/)
})
```

## 🎭 Mock Implementations

### Available Mocks
- **Next.js navigation** - useRouter, useSearchParams, etc.
- **Next.js headers** - cookies, headers
- **Next.js image** - Image component
- **Framer Motion** - Animation library
- **Web APIs** - localStorage, sessionStorage, matchMedia
- **Observers** - IntersectionObserver, ResizeObserver
- **Crypto** - Web Crypto API
- **Jose** - JWT library for authentication

### Custom Test Utilities

```typescript
import { createMockUser, createMockAgent, createMockSession } from './jest.setup.js'

const mockUser = createMockUser({ email: 'custom@example.com' })
const mockAgent = createMockAgent({ type: 'coder' })
```

## 🔍 Debugging Tests

### Jest Debugging
```bash
# Debug specific test
npm test -- --testNamePattern="Button Component"

# Run single test file
npm test Button.test.tsx

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Playwright Debugging
```bash
# Debug mode (opens browser)
npm run test:e2e:debug

# Headed mode (see browser)
npm run test:e2e:headed

# UI mode (interactive)
npm run test:e2e:ui
```

### Vitest Debugging
```bash
# UI mode
npm run test:vitest:ui

# Debug in VS Code
# Add breakpoints and run "Debug Current Test"
```

## 📈 Performance Optimization

### Jest Performance
- **maxWorkers**: 50% of CPU cores
- **Cache enabled** - Faster subsequent runs
- **Transform ignore patterns** - Skip unnecessary transforms
- **Module mapping** - Fast path resolution

### Playwright Performance
- **Parallel execution** - Multiple workers
- **Browser reuse** - Faster test startup
- **Smart waiting** - Efficient element waiting
- **Resource optimization** - Minimal network usage

### Vitest Performance
- **Native speed** - Faster than Jest
- **Thread pool** - Parallel test execution
- **Smart caching** - Intelligent test reruns
- **ESM native** - No transformation overhead

## 🚦 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Jest Tests
  run: npm run test:ci

- name: Run E2E Tests
  run: npm run test:e2e

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: coverage/lcov.info
```

### Test Reports
- **HTML Coverage** - `coverage/index.html`
- **Playwright Report** - `playwright-report/index.html`
- **Jest HTML Report** - `coverage/html-report/report.html`
- **JUnit XML** - For CI integration

## 🎯 Best Practices

### Test Structure
1. **Arrange** - Set up test data
2. **Act** - Perform the action
3. **Assert** - Verify the result

### Test Naming
- Describe what the test does
- Use present tense
- Be specific and clear

### Component Testing
- Test user interactions
- Test props and state changes
- Test accessibility
- Avoid testing implementation details

### E2E Testing
- Test critical user journeys
- Test cross-browser compatibility
- Test responsive design
- Keep tests independent

### Performance
- Use appropriate test types
- Mock external dependencies
- Parallel test execution
- Clean up after tests

## 🔧 Troubleshooting

### Common Issues

#### "Module not found" errors
- Check `moduleNameMapper` in jest.config.js
- Verify import paths use @/ aliases
- Ensure mock files exist

#### "Cannot read property" errors
- Check mock implementations
- Verify component props
- Add null checks in components

#### Playwright timeout errors
- Increase timeout values
- Use proper waiting strategies
- Check network conditions

#### Coverage too low
- Add missing test cases
- Remove unnecessary exclusions
- Test error conditions

### Getting Help
1. Check configuration files
2. Review existing test examples
3. Check console error messages
4. Use debug modes
5. Review official documentation

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Vitest Documentation](https://vitest.dev/guide/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Note**: This testing infrastructure provides comprehensive coverage for the Vana frontend application with modern tooling and best practices. All configurations are optimized for both development experience and CI/CD pipeline integration.