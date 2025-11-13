# Edge Functions Shared Modules - Test Suite

Comprehensive test suite for the refactored Supabase Edge Functions shared modules with **90%+ code coverage**.

## 📋 Test Overview

| Module | Test File | Tests | Coverage Target |
|--------|-----------|-------|-----------------|
| config.ts | config.test.ts | 38 | 100% |
| error-handler.ts | error-handler.test.ts | 50 | 95% |
| validators.ts | validators.test.ts | 65 | 95% |
| rate-limiter.ts | rate-limiter.test.ts | 35 | 90% |
| Integration | integration.test.ts | 25 | N/A |
| **Total** | **5 files** | **~213 tests** | **90%+** |

## 🚀 Quick Start

### Run All Tests

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

## 📦 Test Structure

```
__tests__/
├── config.test.ts              # Config constant tests
├── error-handler.test.ts       # Error response builder tests
├── validators.test.ts          # Request validation tests
├── rate-limiter.test.ts        # Rate limiting service tests
├── integration.test.ts         # Cross-module integration tests
├── test-utils.ts              # Shared test utilities
└── README.md                  # This file
```

## 🧪 Test Categories

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

## 📝 Test Utilities

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

## 🎯 Coverage Goals

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

### Coverage Output Example

```
cover file:///Users/.../config.ts ... 100.000% (165/165)
cover file:///Users/.../error-handler.ts ... 95.454% (315/330)
cover file:///Users/.../validators.ts ... 95.098% (330/347)
cover file:///Users/.../rate-limiter.ts ... 90.146% (247/274)

Total: 93.289% (1057/1116)
```

## 🔍 Running Specific Tests

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

## 🐛 Debugging Tests

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

## ✅ Pre-Commit Checklist

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

## 🚦 CI/CD Integration

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

✅ All tests must pass before merging

✅ Coverage must be ≥90%

✅ Linting and formatting must pass

✅ Type checking must pass

## 📚 Writing New Tests

### Test Naming Convention

Use descriptive "should..." pattern:

```typescript
// ✅ GOOD
Deno.test("RequestValidator.forChat should reject empty messages array", () => {
  // Test implementation
});

// ❌ BAD
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

## 🔧 Troubleshooting

### Tests Failing Locally

1. **Clear coverage cache:**
   ```bash
   rm -rf coverage/
   deno task test
   ```

2. **Check Deno version:**
   ```bash
   deno --version
   # Should be v1.x
   ```

3. **Verify permissions:**
   Tests require `--allow-env`, `--allow-net`, `--allow-read`

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

## 📊 Performance Benchmarks

Target execution times:

| Test Category | Target Time | Max Acceptable |
|--------------|-------------|----------------|
| Single unit test | <10ms | 50ms |
| Single integration test | <50ms | 100ms |
| Full test suite | <2s | 5s |

### Actual Performance

```bash
# Example output
test config.test.ts ... ok (127ms)
test error-handler.test.ts ... ok (245ms)
test validators.test.ts ... ok (318ms)
test rate-limiter.test.ts ... ok (156ms)
test integration.test.ts ... ok (289ms)

Total time: 1.135s
```

## 🤝 Contributing

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

## 📖 Additional Resources

- **Test Plan**: See `.claude/REFACTORING_TEST_PLAN.md`
- **Deno Testing**: https://docs.deno.com/runtime/manual/basics/testing/
- **Deno Assertions**: https://jsr.io/@std/assert
- **Coverage Guide**: https://docs.deno.com/runtime/manual/basics/testing/coverage

---

**Last Updated**: 2025-11-13
**Test Suite Version**: 1.0
**Total Tests**: ~213
**Coverage**: 90%+
