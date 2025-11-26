# E2E Testing with Playwright

This directory contains end-to-end tests for the Vana AI chat application using Playwright.

## Test Structure

```
tests/
├── e2e/
│   ├── auth.spec.ts       # Authentication flow tests
│   ├── chat.spec.ts       # Chat functionality tests
│   ├── guest.spec.ts      # Guest mode tests
│   └── artifacts.spec.ts  # Artifact generation and interaction tests
├── fixtures/
│   ├── test-data.ts       # Reusable test data and constants
│   └── test-helpers.ts    # Helper functions for tests
└── README.md              # This file
```

## Test Coverage

### Authentication Flow (auth.spec.ts)
- ✅ Redirect unauthenticated users to auth page
- ✅ Show continue as guest option
- ✅ Allow guest to continue without login
- ✅ Display login form on auth page
- ✅ Persist session across page refresh
- ✅ Show validation for empty credentials
- ✅ Handle OAuth callback flow
- ✅ Navigate between auth and guest mode
- ✅ Maintain session state in localStorage
- ✅ Clear session on logout

### Chat Flow (chat.spec.ts)
- ✅ Send a message and receive a response
- ✅ Display streaming response in real-time
- ✅ Persist message history
- ✅ Handle empty message submission
- ✅ Create a new chat session
- ✅ Handle long messages
- ✅ Display user and assistant messages differently
- ✅ Handle rapid message sending
- ✅ Preserve chat history after page refresh
- ✅ Show send button state changes
- ✅ Handle message with special characters
- ✅ Support markdown in messages
- ✅ List previous chat sessions in sidebar
- ✅ Auto-generate session title

### Guest Flow (guest.spec.ts)
- ✅ Allow guest to access app without login
- ✅ Create guest session automatically
- ✅ Allow guest to send messages
- ✅ Show upgrade prompt for guests
- ✅ Persist guest session across page refresh
- ✅ Track guest usage in session storage
- ✅ Track guest request count
- ✅ Show rate limit message when limit reached
- ✅ Prompt guest to sign in when rate limited
- ✅ Allow individual guests based on IP/identifier
- ✅ Show sign-in option for guests
- ✅ Work with limited features as guest
- ✅ Handle guest session expiry gracefully

### Artifact Flow (artifacts.spec.ts)
- ✅ Generate React artifact from prompt
- ✅ Generate HTML artifact from prompt
- ✅ Generate diagram from prompt
- ✅ Handle image generation request
- ✅ Render artifact in iframe
- ✅ Open artifact in canvas panel
- ✅ Close artifact canvas panel
- ✅ Handle multiple artifacts in conversation
- ✅ Show export options for artifact
- ✅ Copy artifact code to clipboard
- ✅ Download artifact as file
- ✅ Create new artifact version on edit request
- ✅ Show version history button
- ✅ Maintain artifact state across messages
- ✅ Handle artifact generation failure gracefully
- ✅ Show error message for invalid artifact code

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers (if not already installed):
   ```bash
   npx playwright install chromium
   ```

3. Ensure the dev server is NOT running (Playwright will start it automatically)

### Run All Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run with browser visible (headed mode)
npm run test:e2e:headed

# Run in debug mode (step through tests)
npm run test:e2e:debug
```

### Run Specific Test Files

```bash
# Run only auth tests
npx playwright test auth.spec.ts

# Run only chat tests
npx playwright test chat.spec.ts

# Run only guest tests
npx playwright test guest.spec.ts

# Run only artifact tests
npx playwright test artifacts.spec.ts
```

### Run Specific Tests

```bash
# Run tests matching a pattern
npx playwright test -g "should send a message"

# Run a specific test file with pattern
npx playwright test chat.spec.ts -g "streaming"
```

### View Test Reports

```bash
# Show HTML report (opens in browser)
npm run test:e2e:report

# Or directly
npx playwright show-report
```

## Test Configuration

Tests are configured in `playwright.config.ts` at the project root. Key settings:

- **Base URL**: `http://localhost:8080`
- **Timeout**: 30s per test
- **Browser**: Chromium (default)
- **Screenshots**: On failure only
- **Videos**: On failure only
- **Traces**: On first retry

## CI/CD Integration

Tests can run in CI/CD pipelines with:

```bash
# CI mode (no retries, sequential execution)
CI=true npm run test:e2e
```

The configuration automatically:
- Starts the dev server before tests
- Retries failed tests 2x on CI
- Runs tests sequentially on CI (no parallelization)
- Generates JSON report for CI integration

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { continueAsGuest, sendChatMessage } from '../fixtures/test-helpers';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await continueAsGuest(page);
  });

  test('should do something', async ({ page }) => {
    // Your test code here
  });
});
```

### Using Test Helpers

Helper functions are available in `tests/fixtures/test-helpers.ts`:

- `navigateToApp(page)` - Navigate to app and wait for load
- `continueAsGuest(page)` - Continue as guest user
- `sendChatMessage(page, message)` - Send a chat message
- `waitForStreamingComplete(page)` - Wait for AI response to finish
- `waitForArtifact(page)` - Wait for artifact to render
- `isArtifactVisible(page)` - Check if artifact is visible
- `openArtifact(page)` - Open artifact in canvas
- `startNewChat(page)` - Start a new chat session
- `isRateLimited(page)` - Check if rate limited
- `getMessageCount(page)` - Count messages in chat
- `clearBrowserData(page)` - Clear localStorage and cookies

### Using Test Data

Constants are available in `tests/fixtures/test-data.ts`:

- `SAMPLE_MESSAGES` - Pre-defined test messages
- `UI_SELECTORS` - CSS selectors for UI elements
- `TIMEOUTS` - Timeout values for different operations
- `EXPECTED_TEXT` - Expected text patterns

## Debugging Tests

### Visual Debugging

```bash
# Run with UI mode to see tests execute
npm run test:e2e:ui

# Run in headed mode to see browser
npm run test:e2e:headed
```

### Step-by-Step Debugging

```bash
# Run in debug mode
npm run test:e2e:debug
```

This opens Playwright Inspector where you can:
- Step through each action
- Inspect the page at any point
- Try out locators in real-time

### Screenshots and Videos

Failed tests automatically capture:
- Screenshot at point of failure
- Video of the entire test execution
- Trace file for debugging

These are saved in `test-results/` directory.

## Best Practices

1. **Use helpers**: Leverage test helpers for common operations
2. **Wait appropriately**: Use proper waits for async operations
3. **Clear state**: Clear browser data in `beforeEach` for isolated tests
4. **Descriptive names**: Write clear, descriptive test names
5. **Handle flakiness**: Use retries and proper waits for flaky elements
6. **Test real flows**: Test complete user journeys, not isolated actions
7. **Check visibility**: Always verify elements are visible before interaction
8. **Use timeouts**: Set appropriate timeouts for slow operations (streaming, etc.)

## Troubleshooting

### Tests fail with "Timeout waiting for element"

- Increase timeout in test or config
- Check if selector is correct
- Verify element is actually rendered
- Check for JavaScript errors in console

### Tests fail with "Navigation timeout"

- Ensure dev server is running
- Check network connectivity
- Increase `navigationTimeout` in config

### Tests fail intermittently

- Add explicit waits for async operations
- Use `waitForLoadState('networkidle')`
- Increase timeout for streaming responses

### Can't find element

- Use Playwright Inspector to test selectors
- Check if element is in shadow DOM or iframe
- Verify element is not dynamically generated

## Additional Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Test Runner](https://playwright.dev/docs/test-runners)
- [Playwright Debugging](https://playwright.dev/docs/debug)
