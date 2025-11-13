# Edge Functions Testing - Quick Reference

**One-page guide for running and writing tests**

## 🚀 Common Commands

```bash
# Run all tests
cd supabase/functions && deno task test

# Run with watch mode (auto-rerun on changes)
deno task test:watch

# Generate coverage report
deno task test:coverage

# View detailed coverage
deno task test:detailed

# Run with custom script
./_shared/__tests__/run-tests.sh

# Run single test file
deno test --allow-env --allow-net --allow-read _shared/__tests__/config.test.ts

# Run tests matching pattern
deno test --allow-env --allow-net --allow-read --filter "MessageValidator" _shared/__tests__/

# Lint and format
deno task lint
deno task fmt
```

## 📊 Coverage Goals

| Module | Target | Tests |
|--------|--------|-------|
| config.ts | 100% | 38 |
| error-handler.ts | 95% | 50 |
| validators.ts | 95% | 65 |
| rate-limiter.ts | 90% | 35 |
| Integration | N/A | 25 |
| **Total** | **90%+** | **213** |

## 🧪 Test Patterns

### Basic Test Structure

```typescript
import { assertEquals, assertThrows } from "@std/assert";
import { Module } from "../module.ts";

Deno.test("Module should do something", () => {
  // Arrange
  const input = createTestData();

  // Act
  const result = Module.doSomething(input);

  // Assert
  assertEquals(result, expectedValue);
});
```

### Testing Errors

```typescript
Deno.test("Module should throw on invalid input", () => {
  assertThrows(
    () => Module.doSomething(invalidInput),
    ValidationError,
    "Expected error message"
  );
});
```

### Async Tests

```typescript
Deno.test("Module should handle async operations", async () => {
  const result = await Module.asyncOperation();
  assertEquals(result.status, 200);
});
```

### Using Test Utilities

```typescript
import {
  createValidChatRequest,
  createValidMessage,
  mockRequestWithIp,
  getResponseBody
} from "./test-utils.ts";

Deno.test("Should validate valid request", () => {
  const request = createValidChatRequest();
  const validated = RequestValidator.validateChat(request);
  assertExists(validated);
});
```

## 🛠️ Test Utilities Reference

### Mock Factories

```typescript
// HTTP requests
mockRequest({ method: "POST", headers: { ... } })
mockRequestWithIp("192.168.1.100")

// Valid test data
createValidMessage({ role: "user", content: "Test" })
createValidChatRequest({ isGuest: true })
createValidImageRequest({ mode: "generate" })

// Utilities
generateString(1000) // Generate 1000 character string
createValidDataUrl("image/png") // Valid data URL for testing
```

### Assertions

```typescript
// Response helpers
await getResponseBody(response) // Parse JSON body
await assertResponse(response, 400, { error: "..." })
assertHasHeaders(response, { "Content-Type": "..." })
assertHasKeys(obj, ["key1", "key2"])

// Error helpers
assertThrowsWithMessage(fn, "Expected message")
await assertAsyncThrowsWithMessage(asyncFn, "Expected message")
assertDefined(value, "Should not be null/undefined")
```

### Mock Environment

```typescript
const mockEnv = new MockEnvironment({
  SUPABASE_URL: "https://test.supabase.co"
});
mockEnv.install();
// ... run tests
mockEnv.restore();
```

## ✅ Pre-Commit Checklist

```bash
# Run everything
cd supabase/functions
deno task test && deno task lint && deno task fmt:check && deno task check
```

Individual steps:
- [ ] Tests pass: `deno task test`
- [ ] Coverage ≥90%: `deno task test:detailed`
- [ ] Linting: `deno task lint`
- [ ] Formatting: `deno task fmt:check`
- [ ] Type checking: `deno task check`

## 📝 Writing New Tests

### Test Naming

```typescript
// ✅ GOOD - Descriptive "should" pattern
Deno.test("RequestValidator.forChat should reject empty messages array", () => {

// ❌ BAD - Vague or missing context
Deno.test("Empty messages", () => {
```

### What to Test

**Must test:**
- ✅ Happy path (valid inputs)
- ✅ Error conditions
- ✅ Boundary values (MAX-1, MAX, MAX+1)
- ✅ Null/undefined inputs
- ✅ Empty values ([], "", {})
- ✅ Invalid types

**Edge cases:**
- ✅ Special characters
- ✅ Unicode characters
- ✅ Very long inputs
- ✅ Whitespace-only inputs
- ✅ Multiple errors in sequence

## 🐛 Debugging

### Enable Verbose Output

```bash
deno test --allow-env --allow-net --allow-read --trace-ops _shared/__tests__/
```

### Run with Inspector

```bash
deno test --allow-env --allow-net --allow-read --inspect-brk _shared/__tests__/config.test.ts
# Open chrome://inspect in Chrome
```

### Common Issues

**Tests failing locally?**
1. Clear coverage: `rm -rf coverage/`
2. Check Deno version: `deno --version`
3. Verify permissions: Tests need `--allow-env`, `--allow-net`, `--allow-read`

**Coverage not generating?**
1. Create directory: `mkdir -p coverage`
2. Check syntax: `deno check _shared/__tests__/*.ts`

## 🚦 CI/CD

Tests run automatically on:
- Pull requests to `main`
- Pushes to `main`
- Changes to `supabase/functions/_shared/`

**Required checks:**
- ✅ All tests pass
- ✅ Coverage ≥90%
- ✅ Linting passes
- ✅ Type checking passes

## 📚 File Locations

```
supabase/functions/
├── deno.json                      # Task definitions
├── _shared/
│   ├── config.ts                  # Config constants
│   ├── error-handler.ts           # Error responses
│   ├── validators.ts              # Request validation
│   ├── rate-limiter.ts            # Rate limiting
│   └── __tests__/
│       ├── config.test.ts         # Config tests
│       ├── error-handler.test.ts  # Error handler tests
│       ├── validators.test.ts     # Validator tests
│       ├── rate-limiter.test.ts   # Rate limiter tests
│       ├── integration.test.ts    # Integration tests
│       ├── test-utils.ts          # Test utilities
│       ├── run-tests.sh           # Test runner script
│       └── README.md              # Full test documentation
```

## 📖 Full Documentation

- **Test Plan**: `.claude/REFACTORING_TEST_PLAN.md`
- **Test README**: `supabase/functions/_shared/__tests__/README.md`
- **This Quick Reference**: `.claude/TESTING_QUICK_REFERENCE.md`

## 🎯 Performance Targets

| Test Type | Target | Max |
|-----------|--------|-----|
| Single unit test | <10ms | 50ms |
| Integration test | <50ms | 100ms |
| Full suite | <2s | 5s |

---

**Version**: 1.0 | **Last Updated**: 2025-11-13 | **Total Tests**: 213 | **Coverage**: 90%+
