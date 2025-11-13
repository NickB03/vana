# Edge Functions Refactoring - Test Plan

## Executive Summary

This document outlines the comprehensive testing strategy for the newly refactored Supabase Edge Functions shared modules. The refactoring extracted common logic into 4 reusable modules, and this test plan ensures 90%+ code coverage with robust, maintainable tests.

## Modules Under Test

1. **config.ts** - Centralized configuration constants (165 lines)
2. **error-handler.ts** - Centralized error response builder (330 lines)
3. **validators.ts** - Request validation with Open/Closed Principle (347 lines)
4. **rate-limiter.ts** - Rate limiting service class (274 lines)

**Total Lines of Code:** 1,116 lines

## Testing Strategy

### 1. Testing Pyramid

```
                    /\
                   /  \
                  / E2E \ (10% - Integration tests)
                 /______\
                /        \
               /  INTEG.  \ (20% - Module integration)
              /____________\
             /              \
            /   UNIT TESTS   \ (70% - Isolated unit tests)
           /________________\
```

### 2. Test Framework

- **Framework:** Deno built-in test runner
- **Assertions:** `@std/assert` library
- **Mocking:** Custom mocks + Deno stubs
- **Coverage:** Deno's built-in coverage tool

### 3. Coverage Goals

| Module | Target Coverage | Critical Paths |
|--------|----------------|----------------|
| config.ts | 100% | Type safety, immutability |
| error-handler.ts | 95% | All error types, headers, status codes |
| validators.ts | 95% | All validation paths, error messages |
| rate-limiter.ts | 90% | Rate limit logic, header generation |
| **Overall** | **90%+** | All public APIs |

### 4. Test Categories

#### Unit Tests (70%)
- Test each function/method in isolation
- Mock all external dependencies
- Fast execution (<100ms per test)
- Clear "should..." naming convention

#### Integration Tests (20%)
- Test module interactions (validator + error handler)
- Test rate limiter + error handler
- Test end-to-end validation flows
- Mock only external services (Supabase, Deno.env)

#### End-to-End Tests (10%)
- Test complete request flows
- Test real-world scenarios
- Verify cross-module contracts

## Test Execution

### Local Development

```bash
# Run all tests
deno test supabase/functions/_shared/__tests__/

# Run specific test file
deno test supabase/functions/_shared/__tests__/config.test.ts

# Run with coverage
deno test --coverage=coverage supabase/functions/_shared/__tests__/
deno coverage coverage --lcov > coverage.lcov

# Watch mode during development
deno test --watch supabase/functions/_shared/__tests__/

# Run only failing tests
deno test --fail-fast supabase/functions/_shared/__tests__/
```

### CI/CD Pipeline

```yaml
# Runs on: Pull Request, Push to main
# Steps:
#   1. Checkout code
#   2. Setup Deno
#   3. Run tests with coverage
#   4. Upload coverage to Codecov
#   5. Fail PR if coverage < 90%
```

## Mock Strategies

### 1. Supabase Client Mocking

```typescript
// Mock Supabase RPC calls
const mockSupabaseClient = {
  rpc: (name: string, params: any) => {
    // Return mock data based on function name
    return { data: mockData, error: null };
  }
};
```

### 2. Deno Environment Mocking

```typescript
// Mock environment variables
const originalEnv = Deno.env.get;
Deno.env.get = (key: string) => {
  const mocks: Record<string, string> = {
    "SUPABASE_URL": "https://test.supabase.co",
    "SUPABASE_SERVICE_ROLE_KEY": "test-key"
  };
  return mocks[key] || "";
};
```

### 3. Request Object Mocking

```typescript
// Mock HTTP requests
function mockRequest(headers?: Record<string, string>): Request {
  return new Request("https://test.com", {
    method: "POST",
    headers: new Headers(headers || {})
  });
}
```

## Test File Structure

```
supabase/functions/_shared/__tests__/
├── config.test.ts              # Config constant tests (15 tests)
├── error-handler.test.ts       # Error response tests (40 tests)
├── validators.test.ts          # Validation logic tests (50 tests)
├── rate-limiter.test.ts        # Rate limiting tests (30 tests)
├── integration.test.ts         # Cross-module integration (20 tests)
└── test-utils.ts              # Shared mocks and helpers
```

**Total Test Count:** ~155 tests

## Detailed Test Plans by Module

### 1. config.ts Tests (15 tests)

**Test Coverage:**
- ✅ All constants are properly exported
- ✅ Const assertions prevent mutations
- ✅ TypeScript type inference works correctly
- ✅ All rate limit values are positive numbers
- ✅ All validation limits are reasonable
- ✅ HTTP status codes match standards
- ✅ Array types (MESSAGE_ROLES, ARTIFACT_TYPES) are readonly

**Edge Cases:**
- Attempt to mutate const values (should fail at compile time)
- Type narrowing for union types

### 2. error-handler.ts Tests (40 tests)

**Test Coverage:**

**ErrorResponseBuilder Class:**
- ✅ `create()` factory method with CORS headers
- ✅ `withHeaders()` factory method
- ✅ `validation()` returns 400 with proper body
- ✅ `unauthorized()` returns 401 with proper body
- ✅ `forbidden()` returns 403 with proper body
- ✅ `rateLimited()` returns 429 with rate limit headers
- ✅ `internal()` returns 500 with error message
- ✅ `serviceUnavailable()` returns 503 with retry headers
- ✅ `apiError()` handles different status codes (429, 503, 5xx)
- ✅ `toStreamResponse()` formats streaming errors correctly
- ✅ Request ID included in all responses
- ✅ CORS headers included in all responses
- ✅ Retry-After header calculated correctly

**Custom Error Classes:**
- ✅ `ValidationError` extends Error with details
- ✅ `AuthenticationError` extends Error with defaults
- ✅ `RateLimitError` includes reset time and limits

**Edge Cases:**
- Empty error messages
- Very long error messages
- Missing request ID
- Null origin (wildcards CORS)
- Future reset times
- Past reset times (negative retry)

### 3. validators.ts Tests (50 tests)

**Test Coverage:**

**MessageArrayValidator:**
- ✅ Rejects null/undefined messages
- ✅ Rejects non-array messages
- ✅ Rejects empty array
- ✅ Rejects arrays exceeding MAX_MESSAGES
- ✅ Accepts valid message array

**MessageValidator:**
- ✅ Rejects non-object messages
- ✅ Rejects missing role
- ✅ Rejects invalid role types
- ✅ Rejects unknown roles
- ✅ Rejects missing content
- ✅ Rejects non-string content
- ✅ Rejects empty/whitespace content
- ✅ Rejects content exceeding MAX_LENGTH
- ✅ Accepts valid message with all roles
- ✅ Includes index in error messages

**MessagesValidator:**
- ✅ Validates array then individual messages
- ✅ Reports first failing message
- ✅ TypeScript type assertion works

**ImageRequestValidator:**
- ✅ Rejects missing prompt
- ✅ Rejects non-string prompt
- ✅ Rejects empty prompt
- ✅ Rejects prompt exceeding MAX_PROMPT_LENGTH
- ✅ Rejects missing mode
- ✅ Rejects invalid mode values
- ✅ Rejects missing baseImage in edit mode
- ✅ Rejects invalid baseImage format
- ✅ Accepts valid generate request
- ✅ Accepts valid edit request with baseImage

**ChatRequestValidator:**
- ✅ Rejects non-object request
- ✅ Rejects missing messages
- ✅ Validates messages array
- ✅ Rejects invalid sessionId type
- ✅ Rejects invalid isGuest type
- ✅ Validates currentArtifact structure
- ✅ Rejects incomplete artifact
- ✅ Accepts valid chat request

**RequestValidator Factory:**
- ✅ `forChat()` returns ChatRequestValidator
- ✅ `forImage()` returns ImageRequestValidator
- ✅ `forMessages()` returns MessagesValidator
- ✅ `validateChat()` convenience method works
- ✅ `validateImage()` convenience method works

**Edge Cases:**
- Exact boundary values (MAX - 1, MAX, MAX + 1)
- Unicode characters in content
- Special characters in prompts
- Data URLs with various MIME types
- Optional fields present vs. absent

### 4. rate-limiter.ts Tests (30 tests)

**Test Coverage:**

**RateLimiter Class:**
- ✅ Constructor initializes Supabase client
- ✅ `checkAll()` runs checks in parallel
- ✅ `checkAll()` prioritizes API throttle
- ✅ `checkAll()` handles guest vs user correctly
- ✅ `checkAll()` returns headers on success
- ✅ `checkApiThrottle()` calls correct RPC
- ✅ `checkApiThrottle()` handles errors
- ✅ `checkGuestLimit()` extracts IP correctly
- ✅ `checkGuestLimit()` calls correct RPC
- ✅ `checkUserLimit()` requires userId
- ✅ `checkUserLimit()` calls correct RPC
- ✅ IP extraction from X-Forwarded-For
- ✅ IP extraction from X-Real-IP
- ✅ IP extraction fallback to "unknown"
- ✅ Rate limit headers built correctly
- ✅ Reset time calculation

**getRateLimiter() Singleton:**
- ✅ Returns same instance on multiple calls
- ✅ Initializes on first call

**Edge Cases:**
- Database RPC errors (should throw)
- Missing environment variables
- Invalid IP formats
- Multiple IPs in X-Forwarded-For (use first)
- Missing userId for authenticated check
- Rate limit exactly at boundary
- Concurrent checkAll() calls

### 5. integration.test.ts Tests (20 tests)

**Test Coverage:**

**Validator + Error Handler:**
- ✅ ValidationError caught and converted to 400 response
- ✅ Error response includes ValidationError details
- ✅ Multiple validation errors handled correctly

**RateLimiter + Error Handler:**
- ✅ Rate limit exceeded returns 429 response
- ✅ Rate limit headers included in error response
- ✅ Retry-After header calculated from resetAt

**End-to-End Flows:**
- ✅ Valid chat request → successful validation → rate limit check → success
- ✅ Invalid chat request → validation error → 400 response
- ✅ Valid request + rate limited → 429 response
- ✅ Guest request flow (IP extraction → rate check)
- ✅ Authenticated request flow (userId → rate check)

**Error Propagation:**
- ✅ ValidationError → ErrorResponseBuilder.validation()
- ✅ RateLimitError → ErrorResponseBuilder.rateLimited()
- ✅ Generic Error → ErrorResponseBuilder.internal()

**Edge Cases:**
- Streaming error responses
- API errors with retry logic
- Multiple errors in same request

## Test Naming Convention

All tests follow the "should..." pattern for clarity:

```typescript
// ✅ GOOD
Deno.test("RequestValidator.forChat should reject empty messages array", () => {
  // Test implementation
});

Deno.test("ErrorResponseBuilder.validation should return 400 status", () => {
  // Test implementation
});

// ❌ BAD
Deno.test("Empty messages", () => {
  // Test implementation
});
```

## Assertions

Use descriptive assertions from `@std/assert`:

```typescript
import {
  assertEquals,      // Exact equality
  assertNotEquals,   // Inequality
  assertThrows,      // Expects exception
  assertRejects,     // Expects async exception
  assert,            // Truthy assertion
  assertExists,      // Not null/undefined
  assertInstanceOf,  // Type checking
  assertMatch,       // Regex matching
  assertArrayIncludes, // Array contains
  assertStringIncludes // String contains
} from "@std/assert";
```

## Performance Benchmarks

Tests should execute quickly to enable fast feedback:

| Test Category | Target Time | Max Acceptable |
|--------------|-------------|----------------|
| Single unit test | <10ms | 50ms |
| Single integration test | <50ms | 100ms |
| Full test suite | <2s | 5s |

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Edge Functions Tests

on:
  pull_request:
    paths:
      - 'supabase/functions/_shared/**'
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x

      - name: Run tests with coverage
        run: |
          deno test --coverage=coverage \
            supabase/functions/_shared/__tests__/

      - name: Generate coverage report
        run: |
          deno coverage coverage --lcov > coverage.lcov

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.lcov
          fail_ci_if_error: true

      - name: Verify coverage threshold
        run: |
          deno coverage coverage --detailed | \
            grep -E "^Total" | \
            awk '{if ($2 < 90) exit 1}'
```

### Coverage Badge

Add to README.md:

```markdown
[![Coverage](https://codecov.io/gh/your-repo/branch/main/graph/badge.svg)](https://codecov.io/gh/your-repo)
```

## Test Maintenance

### When to Update Tests

1. **Adding new validators:** Add corresponding test file in `__tests__/`
2. **Changing validation rules:** Update validator tests + integration tests
3. **New error types:** Add error-handler tests
4. **Config changes:** Update config tests (rarely needed)

### Test Review Checklist

Before merging test changes, verify:

- [ ] All tests have descriptive "should..." names
- [ ] Edge cases are covered (boundaries, nulls, errors)
- [ ] Mocks are properly isolated
- [ ] Integration tests verify cross-module contracts
- [ ] Coverage report shows 90%+ coverage
- [ ] All tests pass in CI
- [ ] Performance benchmarks met (<5s total)

## Known Limitations

1. **No browser environment:** Cannot test CORS in actual browser context
2. **Mock Supabase:** Database RPC calls are mocked (not real DB)
3. **No load testing:** Rate limiter tested functionally, not under load
4. **No mutation testing:** Test quality assessed manually, not with mutation tools

## Future Improvements

1. **Mutation Testing:** Add Stryker or similar tool to verify test quality
2. **Property-Based Testing:** Use `fast-check` for randomized input generation
3. **Visual Regression:** Snapshot test error messages for consistency
4. **Performance Profiling:** Add benchmarking for critical paths
5. **E2E with Real DB:** Docker-based integration tests with real Supabase

## Success Criteria

This test plan is successful when:

- ✅ 90%+ code coverage achieved
- ✅ All tests pass in CI/CD pipeline
- ✅ Tests execute in <5 seconds
- ✅ Zero flaky tests (100% reliability)
- ✅ New developers can understand test patterns
- ✅ Refactoring is safe (tests catch regressions)

## Resources

- **Deno Testing:** https://docs.deno.com/runtime/manual/basics/testing/
- **Deno Assertions:** https://jsr.io/@std/assert
- **Deno Coverage:** https://docs.deno.com/runtime/manual/basics/testing/coverage
- **GitHub Actions:** https://docs.github.com/en/actions

---

**Document Version:** 1.0
**Last Updated:** 2025-11-13
**Author:** AI Test Automation Engineer
**Status:** Ready for Implementation
