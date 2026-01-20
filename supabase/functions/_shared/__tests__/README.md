# Edge Functions Test Suite

## Overview

This directory contains the comprehensive test suite for Supabase Edge Functions shared modules, including **real API integration tests** that make actual API calls to external services (GLM/Z.ai, OpenRouter, Tavily).

Unlike unit tests that mock external dependencies, the integration tests validate:
- API contracts and response formats
- Tool calling behavior and structured outputs
- Streaming response handling
- Error handling and resilience patterns
- Rate limiting enforcement

## Integration Test Files

| File | Description | Cost/Run |
|------|-------------|----------|
| `glm-integration.test.ts` | GLM API (Z.ai) - tool calling, thinking mode | ~$0.02 |
| `openrouter-integration.test.ts` | OpenRouter - image generation, chat | ~$0.05 |
| `chat-endpoint-integration.test.ts` | /chat Edge Function - streaming, tools | ~$0.05 |
| `circuit-breaker-integration.test.ts` | Resilience layer - fallback behavior | ~$0.03 |
| `image-endpoint-integration.test.ts` | /generate-image Edge Function | ~$0.05 |
| `title-endpoint-integration.test.ts` | /generate-title Edge Function | ~$0.005 |
| `artifact-endpoint-integration.test.ts` | /generate-artifact Edge Function (DEPRECATED - endpoint not in use) | ~$0.02 |
| `rate-limiting-integration.test.ts` | Rate limiting RPC functions (disabled) | ~$0.00 |
| `tavily-integration.test.ts` | Tavily search API | ~$0.01 |

**Run locally:** `supabase start && deno task test:integration:endpoints`

## Prerequisites

### 1. Supabase Running Locally

```bash
supabase start
```

This starts the local Supabase stack including the Edge Functions runtime.

### 2. Required Environment Variables

Set these in your environment or `.env` file:

| Variable | Description | Required For |
|----------|-------------|--------------|
| `GLM_API_KEY` | Z.ai API key for GLM models | GLM tests, artifact generation |
| `OPENROUTER_GEMINI_FLASH_KEY` | OpenRouter key for chat | Chat endpoint, circuit breaker |
| `OPENROUTER_GEMINI_IMAGE_KEY` | OpenRouter key for images | Image generation |
| `TAVILY_API_KEY` | Tavily search API key | Search/browser tools |
| `SUPABASE_URL` | Local Supabase URL (http://127.0.0.1:54321) | All endpoint tests |
| `SUPABASE_ANON_KEY` | Local Supabase anon key | All endpoint tests |

## Running Tests

### From Project Root

```bash
# Run all integration tests
npm run test:integration

# Run with verbose output
npm run test:integration -- --reporter=verbose
```

### Individual Test Files

```bash
cd supabase/functions

# GLM API tests
deno test --allow-net --allow-env _shared/__tests__/glm-integration.test.ts

# OpenRouter tests
deno test --allow-net --allow-env _shared/__tests__/openrouter-integration.test.ts

# Chat endpoint tests
deno test --allow-net --allow-env _shared/__tests__/chat-endpoint-integration.test.ts

# Circuit breaker tests
deno test --allow-net --allow-env _shared/__tests__/circuit-breaker-integration.test.ts

# Image endpoint tests
deno test --allow-net --allow-env _shared/__tests__/image-endpoint-integration.test.ts

# Title endpoint tests
deno test --allow-net --allow-env _shared/__tests__/title-endpoint-integration.test.ts

# Artifact endpoint tests (DEPRECATED - test file does not exist, endpoint not in use)
# deno test --allow-net --allow-env _shared/__tests__/artifact-endpoint-integration.test.ts

# Rate limiting tests
deno test --allow-net --allow-env _shared/__tests__/rate-limiting-integration.test.ts

# Tavily search tests
deno test --allow-net --allow-env _shared/__tests__/tavily-integration.test.ts
```

### Run Specific Test

```bash
deno test --allow-net --allow-env --filter "should complete chat with tool call" _shared/__tests__/glm-integration.test.ts
```

## Test Philosophy

### 1. Real API Calls (Not Mocked)

These tests hit actual external APIs to verify real-world behavior. This catches issues that mocks would miss:
- API contract changes
- Rate limiting behavior
- Network timeout handling
- Response format variations

### 2. Fail Loudly on Errors

Tests are designed to fail explicitly when something goes wrong:
- No silent catches that swallow errors
- Clear error messages indicating what failed
- Stack traces preserved for debugging

### 3. Strict Contract Enforcement for Tool Calling

Tool call responses are validated strictly:
- Required fields must be present
- Field types must match expected schema
- Tool names must match defined tools
- Arguments must be valid JSON

### 4. Soft Assertions for AI-Generated Content

Since AI responses are non-deterministic, content validation uses soft assertions:
- Check that content exists and is non-empty
- Verify content type (string, object, etc.)
- Don't assert exact content matches
- Allow reasonable variation in responses

## Notes

### Rate Limit Tests

Rate limiting tests in `rate-limiting-integration.test.ts` are **commented out** by default. This is because:
- The demo environment has limited quotas
- Triggering rate limits could affect other tests
- Rate limit windows may persist across test runs

To run rate limit tests, uncomment them and run in isolation.

### Test Timeouts

Integration tests have longer timeouts than unit tests:
- Default: 30 seconds per test
- Image generation: 60 seconds
- Streaming tests: 45 seconds

### Cost Awareness

**Total cost per full run: ~$0.25**

Be mindful of costs when:
- Running tests repeatedly during development
- Setting up CI/CD pipelines
- Running the full suite unnecessarily

Consider running individual test files during development rather than the full suite.

---

# Unit Test Suite

Comprehensive unit test suite for the refactored Supabase Edge Functions shared modules with **90%+ code coverage**.

## Unit Test Files

| Module | Test File | Coverage Target |
|--------|-----------|-----------------|
| api-error-handler.ts | api-error-handler.test.ts | 95% |
| artifact-validator.ts | artifact-validator.test.ts | 95% |
| cdn-fallback.ts | cdn-fallback.test.ts | 90% |
| config.ts | config.test.ts | 100% |
| config-env.ts | config-env.test.ts | 100% |
| context-selector.ts | context-selector.test.ts | 90% |
| cors-config.ts | cors-config.test.ts | 95% |
| error-handler.ts | error-handler.test.ts | 95% |
| glm-chat-router.ts | glm-chat-router.test.ts | 90% |
| glm-conversation-messages.ts | glm-conversation-messages.test.ts | 90% |
| glm-openai-format.ts | glm-openai-format.validation.test.ts | 90% |
| glm-stream-error-resilience.ts | glm-stream-error-resilience.test.ts | 90% |
| glm-tool-continuation.ts | glm-tool-continuation.test.ts | 90% |
| immutability-validator.ts | immutability-validator.test.ts | 95% |
| logger.ts | logger.test.ts | 90% |
| model-config.ts | model-config.test.ts | 95% |
| prebuilt-bundles.ts | prebuilt-bundles.test.ts | 90% |
| prompt-normalization.ts | prompt-normalization.test.ts | 90% |
| query-rewriter.ts | query-rewriter.test.ts | 90% |
| rate-limiter.ts | rate-limiter.test.ts | 90% |
| reasoning-provider.ts | reasoning-provider.test.ts | 90% |
| storage-retry.ts | storage-retry.test.ts | 90% |
| tavily-client.ts | tavily-client.test.ts | 90% |
| title-transformer.ts | title-transformer.test.ts | 90% |
| token-counter.ts | token-counter.test.ts | 90% |
| tool-result-content.ts | tool-result-content.test.ts | 90% |
| validators.ts | validators.test.ts | 95% |
| Cross-module | integration.test.ts | N/A |
| **Total** | **28 unit test files** | **90%+** |

## Quick Start

### Run All Unit Tests

```bash
cd supabase/functions
deno task test
```

### Run Tests in Watch Mode

```bash
deno task test:watch
```

### Generate Coverage Report

```bash
deno task test:coverage
```

### View Detailed Coverage

```bash
deno task test:detailed
```

## Test Structure

```
__tests__/
├── # Integration Tests (real API calls)
├── glm-integration.test.ts               # GLM API tests
├── openrouter-integration.test.ts        # OpenRouter API tests
├── tavily-integration.test.ts            # Tavily search API tests
├── chat-endpoint-integration.test.ts     # /chat endpoint tests
├── artifact-endpoint-integration.test.ts # /generate-artifact endpoint tests (DEPRECATED - file does not exist)
├── image-endpoint-integration.test.ts    # /generate-image endpoint tests
├── title-endpoint-integration.test.ts    # /generate-title endpoint tests
├── circuit-breaker-integration.test.ts   # Resilience/fallback tests
├── rate-limiting-integration.test.ts     # Rate limiting tests
│
├── # Unit Tests
├── api-error-handler.test.ts             # API error handling tests
├── artifact-validator.test.ts            # Artifact validation tests
├── cdn-fallback.test.ts                  # CDN fallback tests
├── config.test.ts                        # Config constant tests
├── config-env.test.ts                    # Environment config tests
├── context-selector.test.ts              # Context selection tests
├── cors-config.test.ts                   # CORS configuration tests
├── error-handler.test.ts                 # Error response builder tests
├── glm-chat-router.test.ts               # GLM chat routing tests
├── glm-conversation-messages.test.ts     # GLM message format tests
├── glm-openai-format.validation.test.ts  # GLM OpenAI format tests
├── glm-stream-error-resilience.test.ts   # GLM stream error tests
├── glm-tool-continuation.test.ts         # GLM tool continuation tests
├── immutability-validator.test.ts        # Immutability tests
├── integration.test.ts                   # Cross-module integration tests
├── logger.test.ts                        # Logger tests
├── model-config.test.ts                  # Model configuration tests
├── prebuilt-bundles.test.ts              # Prebuilt bundle tests
├── prompt-normalization.test.ts          # Prompt normalization tests
├── query-rewriter.test.ts                # Query rewriter tests
├── rate-limiter.test.ts                  # Rate limiting service tests
├── reasoning-provider.test.ts            # Reasoning provider tests
├── storage-retry.test.ts                 # Storage retry tests
├── tavily-client.test.ts                 # Tavily client unit tests
├── title-transformer.test.ts             # Title transformer tests
├── token-counter.test.ts                 # Token counting tests
├── tool-result-content.test.ts           # Tool result content tests
├── validators.test.ts                    # Request validation tests
│
├── # Utilities & Examples
├── test-utils.ts                         # Shared test utilities
├── test-apis.ts                          # API test helpers
├── test-glm-endpoints.ts                 # GLM endpoint helpers
├── tavily-client.example.ts              # Tavily client example
└── README.md                             # This file
```

## Test Categories

### Unit Tests (70%)

Test individual functions/methods in isolation with mocked dependencies.

**Example:**
```typescript
Deno.test("MessageValidator should reject empty content", () => {
  const validator = new MessageValidator();

  assertThrows(
    () => validator.validate({ role: "user", content: "" }),
    ValidationError,
    "Empty message content"
  );
});
```

### Integration Tests (20%)

Test module interactions and cross-module contracts.

**Example:**
```typescript
Deno.test("ValidationError should convert to 400 response", async () => {
  try {
    RequestValidator.validateChat({ messages: [] });
  } catch (error) {
    if (error instanceof ValidationError) {
      const response = errors.validation(error.message, error.details);
      assertEquals(response.status, 400);
    }
  }
});
```

### End-to-End Tests (10%)

Test complete request flows from validation to response.

**Example:**
```typescript
Deno.test("Complete guest chat flow", () => {
  const request = createValidChatRequest({ isGuest: true });
  const validated = RequestValidator.validateChat(request);
  // ... rate limit check simulation
});
```

## Test Utilities

The `test-utils.ts` module provides helper functions for common testing patterns:

### Mock Factories

```typescript
// Create mock HTTP requests
const req = mockRequest({ headers: { "x-forwarded-for": "192.168.1.100" } });

// Create valid test data
const message = createValidMessage({ role: "user", content: "Test" });
const chatRequest = createValidChatRequest({ isGuest: true });
const imageRequest = createValidImageRequest({ mode: "generate" });
```

### Mock Environment

```typescript
// Mock Deno environment variables
const mockEnv = new MockEnvironment({
  SUPABASE_URL: "https://test.supabase.co"
});
mockEnv.install();
// ... run tests
mockEnv.restore();
```

### Assertions

```typescript
// Parse response body
const body = await getResponseBody(response);

// Assert response structure
await assertResponse(response, 400, { error: "Invalid input" });

// Assert headers
assertHasHeaders(response, { "Content-Type": "application/json" });

// Generate test strings
const longString = generateString(5000); // 5000 character string
```

## Coverage Goals

### Overall Target: 90%+

- **config.ts**: 100% (all constants validated)
- **error-handler.ts**: 95% (all error types, edge cases)
- **validators.ts**: 95% (all validation paths, boundaries)
- **rate-limiter.ts**: 90% (core logic, IP extraction)

### Running Coverage Report

```bash
# Generate coverage data
deno task test:coverage

# View detailed report
deno task test:detailed

# Generate LCOV report for tools like VSCode Coverage Gutters
deno coverage coverage --lcov > coverage.lcov
```

## Running Specific Tests

### Run Single Test File

```bash
deno test --allow-env --allow-net --allow-read _shared/__tests__/config.test.ts
```

### Run Tests Matching Pattern

```bash
deno test --allow-env --allow-net --allow-read --filter "MessageValidator" _shared/__tests__/
```

### Run Only Failed Tests

```bash
deno test --allow-env --allow-net --allow-read --fail-fast _shared/__tests__/
```

## Debugging Tests

### Enable Verbose Output

```bash
deno test --allow-env --allow-net --allow-read --trace-ops _shared/__tests__/
```

### Run with Inspector

```bash
deno test --allow-env --allow-net --allow-read --inspect-brk _shared/__tests__/config.test.ts
```

### View Test Timing

```bash
deno test --allow-env --allow-net --allow-read --parallel=1 _shared/__tests__/
```

## Pre-Commit Checklist

Before committing changes to shared modules, ensure:

- [ ] All tests pass: `deno task test`
- [ ] Coverage meets 90% threshold: `deno task test:detailed`
- [ ] Linting passes: `deno task lint`
- [ ] Formatting is correct: `deno task fmt:check`
- [ ] Type checking passes: `deno task check`

### Quick Pre-Commit Command

```bash
deno task test && deno task lint && deno task fmt:check && deno task check
```

## CI/CD Integration

Tests run automatically on:

- **Pull Requests** targeting `main`
- **Pushes** to `main` branch
- **File changes** in `supabase/functions/_shared/`

### GitHub Actions Workflow

See `.github/workflows/edge-functions-tests.yml`

**Jobs:**
1. **test**: Run all tests with coverage
2. **lint**: Lint code with Deno
3. **type-check**: TypeScript type checking
4. **summary**: Generate test summary

### PR Checks

- All tests must pass before merging
- Coverage must be >= 90%
- Linting and formatting must pass
- Type checking must pass

## Writing New Tests

### Test Naming Convention

Use descriptive "should..." pattern:

```typescript
// GOOD
Deno.test("RequestValidator.forChat should reject empty messages array", () => {
  // Test implementation
});

// BAD
Deno.test("Empty messages", () => {
  // Test implementation
});
```

### Test Structure

```typescript
import { assertEquals, assertThrows } from "@std/assert";
import { SomeModule } from "../some-module.ts";

// ==================== Feature Tests ====================

Deno.test("Module should do something correctly", () => {
  // Arrange
  const input = createTestInput();

  // Act
  const result = SomeModule.doSomething(input);

  // Assert
  assertEquals(result, expectedValue);
});

Deno.test("Module should handle errors", () => {
  // Arrange & Assert
  assertThrows(
    () => SomeModule.doSomething(invalidInput),
    ErrorType,
    "Expected error message"
  );
});
```

### Edge Cases to Test

- Null/undefined inputs
- Empty values ([], "", {})
- Boundary values (MAX-1, MAX, MAX+1)
- Invalid types
- Special characters
- Unicode characters
- Very long inputs
- Whitespace-only inputs

## Troubleshooting

### Tests Failing Locally

1. **Clear coverage cache:**
   ```bash
   rm -rf coverage/
   deno task test
   ```

2. **Check Deno version:**
   ```bash
   deno --version
   # Should be v1.40+
   ```

3. **Verify permissions:**
   Tests require `--allow-env`, `--allow-net`, `--allow-read`

### Integration Tests Failing

1. **Check Supabase is running:**
   ```bash
   supabase status
   ```

2. **Verify environment variables are set**

3. **Check API key validity and quotas**

4. **Review Edge Function logs:**
   ```bash
   supabase functions logs <function-name>
   ```

5. **Try running the specific test in isolation**

### Coverage Not Generating

1. **Ensure coverage directory exists:**
   ```bash
   mkdir -p coverage
   deno task test:coverage
   ```

2. **Check for syntax errors:**
   ```bash
   deno check _shared/__tests__/*.ts
   ```

### Slow Test Execution

1. **Run in parallel (default):**
   ```bash
   deno test --allow-env --allow-net --allow-read --parallel _shared/__tests__/
   ```

2. **Profile test timing:**
   ```bash
   deno test --allow-env --allow-net --allow-read --parallel=1 _shared/__tests__/
   ```

## Performance Benchmarks

Target execution times:

| Test Category | Target Time | Max Acceptable |
|--------------|-------------|----------------|
| Single unit test | <10ms | 50ms |
| Single integration test | <50ms | 100ms |
| Full unit test suite | <2s | 5s |
| Full integration suite | <60s | 120s |

## Contributing

When adding new shared modules:

1. **Create test file:** `module-name.test.ts`
2. **Write tests first** (TDD approach)
3. **Aim for 90%+ coverage**
4. **Add integration tests** if module interacts with others
5. **Update this README** with test count and coverage target

### Test Review Checklist

- [ ] Descriptive test names
- [ ] Edge cases covered
- [ ] Mocks properly isolated
- [ ] Integration contracts verified
- [ ] Coverage meets threshold
- [ ] Performance benchmarks met

## Additional Resources

- **E2E Testing Guide**: See `.claude/E2E_TESTING.md`
- **Deno Testing**: https://docs.deno.com/runtime/manual/basics/testing/
- **Deno Assertions**: https://jsr.io/@std/assert
- **Coverage Guide**: https://docs.deno.com/runtime/manual/basics/testing/coverage

---

**Last Updated**: 2025-12-31
**Test Suite Version**: 2.0
**Total Test Files**: 37 (28 unit + 9 integration)
**Coverage**: 90%+
