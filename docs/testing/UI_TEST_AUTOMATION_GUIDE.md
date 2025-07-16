# VANA UI Test Automation Guide

## Overview
This guide provides comprehensive instructions for implementing and running UI tests for VANA using Playwright, covering all three phases of the enhancement plan.

## Test Architecture

### Directory Structure
```
tests/
├── e2e/
│   ├── phase1-specialists.spec.ts      # Phase 1 tests
│   ├── phase2-specialists.spec.ts      # Phase 2 tests (to be created)
│   ├── phase3-workflows.spec.ts        # Phase 3 tests (to be created)
│   ├── phase1_ui_test_plan.md         # Phase 1 test plan
│   ├── phase2_ui_test_plan.md         # Phase 2 test plan
│   └── phase3_ui_test_plan.md         # Phase 3 test plan
├── fixtures/
│   ├── test-data.json                  # Test data fixtures
│   └── expected-responses.json         # Expected response patterns
└── utils/
    ├── helpers.ts                      # Test helper functions
    └── selectors.ts                    # UI element selectors
```

### Test Categories

1. **Smoke Tests**: Quick validation of core functionality
2. **Regression Tests**: Comprehensive feature validation
3. **Integration Tests**: Multi-specialist workflows
4. **Performance Tests**: Response time and load testing
5. **Accessibility Tests**: WCAG compliance validation

## Setup Instructions

### Prerequisites
```bash
# Install Node.js (v18+ recommended)
# Install project dependencies
npm install

# Install Playwright
npm install -D @playwright/test
npm install -D @types/node

# Install browsers
npx playwright install

# Install additional reporters
npm install -D @playwright/test @playwright/test-reporter
```

### Configuration
1. Ensure `playwright.config.ts` is in project root
2. Set environment variables:
   ```bash
   export VANA_TEST_URL=http://localhost:5173  # Or your test URL
   export VANA_TEST_TIMEOUT=30000              # Default timeout
   ```

## Running Tests

### Command Line Options

```bash
# Run all Phase 1 tests
npx playwright test tests/e2e/phase1-specialists.spec.ts

# Run specific test suite
npx playwright test -g "Content Creation Specialist"

# Run in specific browser
npx playwright test --project=chromium

# Run with UI mode (interactive)
npx playwright test --ui

# Run with debug mode
npx playwright test --debug

# Run smoke tests only
./scripts/run_phase1_ui_tests.sh smoke

# Run on all browsers
./scripts/run_phase1_ui_tests.sh all-browsers

# Generate and view report
npx playwright show-report
```

### Using Test Scripts

```bash
# Phase 1 tests
./scripts/run_phase1_ui_tests.sh [test-type] [browser] [keep-running]

# Examples:
./scripts/run_phase1_ui_tests.sh smoke chromium
./scripts/run_phase1_ui_tests.sh full firefox
./scripts/run_phase1_ui_tests.sh all-browsers
./scripts/run_phase1_ui_tests.sh performance webkit true
```

## Writing New Tests

### Test Structure Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature: Specialist Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should perform specific action', async ({ page }) => {
    // Arrange
    const prompt = 'Your test prompt';
    
    // Act
    await submitPrompt(page, prompt);
    await waitForResponse(page);
    
    // Assert
    const response = await getLastResponse(page);
    expect(response).toContain('expected content');
  });
});
```

### Best Practices

1. **Use Data-TestId Attributes**
   ```html
   <input data-testid="chat-input" />
   <button data-testid="submit-button">Send</button>
   <div data-testid="message">Response</div>
   ```

2. **Implement Proper Waits**
   ```typescript
   // Wait for element
   await page.waitForSelector('[data-testid="message"]');
   
   // Wait for network idle
   await page.waitForLoadState('networkidle');
   
   // Wait with timeout
   await page.waitForResponse(
     response => response.url().includes('/api/chat'),
     { timeout: 30000 }
   );
   ```

3. **Handle Dynamic Content**
   ```typescript
   // Wait for loading to complete
   await page.waitForSelector('.loading', { state: 'hidden' });
   
   // Wait for specific text
   await expect(page.locator('.response')).toContainText('complete');
   ```

4. **Use Page Object Pattern**
   ```typescript
   class ChatPage {
     constructor(private page: Page) {}
     
     async sendMessage(message: string) {
       await this.page.fill('[data-testid="chat-input"]', message);
       await this.page.click('[data-testid="submit-button"]');
     }
     
     async getLastMessage() {
       const messages = await this.page.locator('.message').all();
       return messages[messages.length - 1].textContent();
     }
   }
   ```

## Test Data Management

### Fixtures
Create reusable test data:

```typescript
// tests/fixtures/test-prompts.json
{
  "contentCreation": {
    "report": "Write a technical report about {topic}",
    "blog": "Create a blog post about {topic}",
    "documentation": "Generate API documentation for {endpoint}"
  },
  "research": {
    "basic": "Research {topic}",
    "factCheck": "Fact check: {claim}",
    "comparison": "Compare {item1} and {item2}"
  }
}
```

### Dynamic Data Generation
```typescript
import { faker } from '@faker-js/faker';

function generateTestPrompt() {
  return {
    topic: faker.technology.noun(),
    claim: `${faker.company.name()} is worth ${faker.finance.amount()} billion`,
    document: faker.lorem.paragraphs(3)
  };
}
```

## Debugging Tests

### Visual Debugging
```bash
# Run with headed browser
npx playwright test --headed

# Use Playwright Inspector
npx playwright test --debug

# Take screenshots on failure
await page.screenshot({ path: 'failure.png' });
```

### Trace Viewer
```bash
# Run with trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### Console Logs
```typescript
page.on('console', msg => console.log('Browser:', msg.text()));
page.on('pageerror', err => console.error('Page error:', err));
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Playwright Tests
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 18
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
    
    - name: Run Playwright tests
      run: npx playwright test
    
    - uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

## Performance Testing

### Response Time Monitoring
```typescript
test('should respond within SLA', async ({ page }) => {
  const startTime = Date.now();
  
  await submitPrompt(page, 'Simple query');
  await waitForResponse(page);
  
  const responseTime = Date.now() - startTime;
  expect(responseTime).toBeLessThan(5000); // 5 second SLA
  
  // Log to performance report
  console.log(`Response time: ${responseTime}ms`);
});
```

### Load Testing
```typescript
test('should handle concurrent requests', async ({ page }) => {
  const promises = [];
  
  for (let i = 0; i < 5; i++) {
    promises.push(submitAndMeasure(page, `Query ${i}`));
  }
  
  const results = await Promise.all(promises);
  const avgTime = results.reduce((a, b) => a + b) / results.length;
  
  expect(avgTime).toBeLessThan(10000);
});
```

## Accessibility Testing

### Automated Checks
```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test('should be accessible', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: {
      html: true
    }
  });
});
```

### Manual Checks
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- Focus indicators
- ARIA labels

## Reporting

### Test Reports
1. **HTML Report**: Interactive test results
   ```bash
   npx playwright show-report
   ```

2. **JSON Report**: Machine-readable results
   ```bash
   cat test-results/results.json
   ```

3. **JUnit XML**: CI/CD integration
   ```bash
   cat test-results/junit.xml
   ```

### Custom Reporting
```typescript
import { Reporter } from '@playwright/test/reporter';

class CustomReporter implements Reporter {
  onTestEnd(test, result) {
    console.log(`${test.title}: ${result.status}`);
    if (result.status === 'failed') {
      // Send alert or create ticket
    }
  }
}
```

## Maintenance

### Regular Tasks
1. **Update Selectors**: Review and update element selectors monthly
2. **Test Data Refresh**: Update test data to reflect current features
3. **Browser Updates**: Run `npx playwright install` monthly
4. **Dependency Updates**: Update Playwright and dependencies
5. **Flaky Test Review**: Investigate and fix unstable tests

### Test Health Metrics
- Pass rate > 95%
- Flaky test rate < 5%
- Average execution time < 5 minutes
- Coverage of all critical paths

## Troubleshooting

### Common Issues

1. **Timeout Errors**
   - Increase timeout in config
   - Add explicit waits
   - Check network conditions

2. **Element Not Found**
   - Verify selector accuracy
   - Add wait for element
   - Check for dynamic loading

3. **Flaky Tests**
   - Add retry logic
   - Improve wait conditions
   - Mock external dependencies

4. **CI Failures**
   - Check browser installation
   - Verify environment variables
   - Review resource limits

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Community Forum](https://github.com/microsoft/playwright/discussions)