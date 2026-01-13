# Testing Guide

> **Last Updated**: 2025-12-31

This guide covers the complete testing strategy for Vana, optimized for solo development with AI-assisted workflows.

## Test Tiers

We use a **three-tier testing strategy** to balance speed, coverage, and confidence:

```
┌─────────────────────────────────────────────────────────────┐
│  TIER 1: Unit Tests (Mocked)                    ~2 min     │
│  ├─ Pure functions (validators, parsers, transpilers)      │
│  ├─ Fast, isolated, mocked external dependencies           │
│  └─ Run on: Every PR                                        │
├─────────────────────────────────────────────────────────────┤
│  TIER 2: Integration Tests (Real APIs)          ~5 min     │
│  ├─ Database: Hooks with real local Supabase               │
│  ├─ API: Real calls to OpenRouter, Gemini, Tavily          │
│  ├─ Endpoints: /chat, /generate-image, /generate-title     │
│  ├─ Resilience: Circuit breaker, fallback behavior         │
│  └─ Run on: Before merge, locally                           │
├─────────────────────────────────────────────────────────────┤
│  TIER 3: E2E Tests (Full App)                   ~10 min    │
│  ├─ Complete user flows in real browser                     │
│  ├─ Catches UI regressions, integration issues              │
│  └─ Run on: Manual trigger, main merge                      │
└─────────────────────────────────────────────────────────────┘
```

## Quick Reference

| Task | Command |
|------|---------|
| **Unit tests** | `npm run test` |
| **Integration tests (all)** | `npm run test:integration` |
| **API integration (Gemini)** | `OPENROUTER_GEMINI_FLASH_KEY=xxx deno test --allow-net --allow-env --allow-read _shared/__tests__/gemini-integration.test.ts` |
| **API integration (OpenRouter)** | `OPENROUTER_GEMINI_FLASH_KEY=xxx deno test --allow-net --allow-env --allow-read _shared/__tests__/openrouter-integration.test.ts` |
| **E2E (local)** | `npm run test:e2e:headed` |
| **E2E (GitHub)** | `gh workflow run e2e-manual.yml` |
| **E2E critical only** | `gh workflow run e2e-manual.yml -f test_filter="@critical"` |

---

## Tier 1: Unit Tests

Unit tests use **mocks** for external dependencies (Supabase, Sentry) to run fast.

### When to Use
- Testing pure functions
- Testing component rendering
- Testing utility logic

### What Gets Mocked
- `@supabase/supabase-js` - Mocked globally in `src/test/setup.ts`
- `@sentry/react` - External monitoring service
- Browser APIs (`ResizeObserver`, `matchMedia`, `localStorage`)

### Running Unit Tests
```bash
npm run test              # All unit tests
npm run test:hooks        # Hook tests only
npm run test:components   # Component tests only
npm run test:coverage     # With coverage report
```

---

## Tier 2: Integration Tests

Integration tests verify **real API behavior** against actual services - both local Supabase and external AI providers.

### Two Types of Integration Tests

1. **Database Integration Tests** (`src/hooks/__tests__/*.integration.test.ts`)
   - Use real local Supabase
   - Test data persistence, constraints, RLS policies
   - Run with Vitest

2. **API Integration Tests** (`supabase/functions/_shared/__tests__/*-integration.test.ts`)
   - Make real API calls to OpenRouter, Gemini, Tavily
   - Test Edge Function endpoints
   - Run with Deno

---

### Database Integration Tests

#### When to Use
- Testing database operations
- Testing hooks that persist data
- Verifying constraints and RLS policies

#### Prerequisites
```bash
# Start local Supabase (must be running)
supabase start
```

#### Running Database Integration Tests
```bash
npm run test:integration         # Run all integration tests
npm run test:integration:watch   # Watch mode
```

#### File Naming
Database integration tests use the `.integration.test.ts` suffix:
```
src/hooks/__tests__/useMessageFeedback.integration.test.ts
```

#### What Makes Integration Tests Different

| Unit Test (Mocked) | Integration Test (Real) |
|--------------------|-------------------------|
| `expect(mockInsert).toHaveBeenCalled()` | Query DB to verify row exists |
| Mock returns success | Verify FK constraints work |
| Mock returns error | Verify unique constraints work |
| Tests the mock | Tests the actual behavior |

#### Example: Mock vs Real

```typescript
// ❌ UNIT TEST: Tests mock returns mock value
vi.mocked(supabase.from).mockReturnValue({
  insert: vi.fn().mockResolvedValue({ data: mockFeedback })
});
const result = await submitFeedback(data);
expect(result).toEqual(mockFeedback); // Just verifies mock works

// ✅ INTEGRATION TEST: Tests real database
const result = await submitFeedback(data);
// Query DB directly to verify it was actually inserted
const { data: dbRow } = await testSupabase
  .from('message_feedback')
  .select()
  .eq('id', result.id)
  .single();
expect(dbRow.rating).toBe('positive'); // Verifies real persistence
```

---

### API Integration Tests (Edge Functions)

Located in `supabase/functions/_shared/__tests__/`, these tests make **real API calls** to verify the complete request/response cycle.

#### Test Suite Overview

| Test File | What It Tests | Cost |
|-----------|---------------|------|
| `gemini-integration.test.ts` | Gemini 3 Flash chat, tool calling, reasoning | ~$0.02 |
| `openrouter-integration.test.ts` | Gemini Flash chat, image generation | ~$0.05 |
| `chat-endpoint-integration.test.ts` | /chat endpoint: streaming, tool calls, validation | ~$0.05 |
| `circuit-breaker-integration.test.ts` | Fallback behavior, primary → backup routing | ~$0.05 |
| `image-endpoint-integration.test.ts` | /generate-image endpoint validation | ~$0.05 |
| `title-endpoint-integration.test.ts` | /generate-title endpoint, title quality | ~$0.005 |
| `artifact-endpoint-integration.test.ts` | /generate-artifact endpoint, validation, metadata | ~$0.05 |
| `rate-limiting-integration.test.ts` | Rate limit RPC functions: guest, user, API throttle | Free (DB only) |
| `tavily-integration.test.ts` | Tavily search API, retry logic | ~$0.01 |

#### Running API Integration Tests

```bash
# Run all API integration tests (from project root)
npm run test:integration

# Run from supabase/functions directory with individual files
cd supabase/functions

# Gemini API tests
OPENROUTER_GEMINI_FLASH_KEY=xxx deno test --allow-net --allow-env --allow-read _shared/__tests__/gemini-integration.test.ts

# OpenRouter tests
OPENROUTER_GEMINI_FLASH_KEY=xxx OPENROUTER_GEMINI_IMAGE_KEY=xxx \
  deno test --allow-net --allow-env --allow-read _shared/__tests__/openrouter-integration.test.ts

# Chat endpoint tests (requires local Supabase)
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=xxx \
  deno test --allow-net --allow-env --allow-read _shared/__tests__/chat-endpoint-integration.test.ts

# Circuit breaker tests
OPENROUTER_GEMINI_FLASH_KEY=xxx \
  deno test --allow-net --allow-env --allow-read _shared/__tests__/circuit-breaker-integration.test.ts

# Rate limiting RPC tests (requires local Supabase)
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=xxx \
  deno test --allow-net --allow-env --allow-read _shared/__tests__/rate-limiting-integration.test.ts

# Tavily search tests
TAVILY_API_KEY=xxx deno test --allow-net --allow-env --allow-read _shared/__tests__/tavily-integration.test.ts
```

#### Environment Variables Required

| Variable | Used By | Purpose |
|----------|---------|---------|
| `OPENROUTER_GEMINI_FLASH_KEY` | Gemini tests, chat, artifact, circuit breaker | OpenRouter API access for Gemini 3 Flash |
| `OPENROUTER_GEMINI_IMAGE_KEY` | OpenRouter, image endpoint | Image generation |
| `TAVILY_API_KEY` | Tavily tests | Web search |
| `SUPABASE_URL` | Endpoint tests | Local: `http://127.0.0.1:54321` |
| `SUPABASE_ANON_KEY` | Endpoint tests | Auth for Edge Functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Rate limiting tests | RPC access for rate limit testing |

#### Prerequisites for Endpoint Tests

```bash
# 1. Start local Supabase
supabase start

# 2. Serve Edge Functions locally
supabase functions serve

# 3. Run endpoint tests against local instance
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=<your-local-anon-key> \
  deno test --allow-net --allow-env _shared/__tests__/chat-endpoint-integration.test.ts
```

#### Test Philosophy

These integration tests follow strict principles:

1. **Fail Loudly**: Tests should fail on errors, not silently pass. No swallowing exceptions.

2. **Strict Contract Enforcement**: When `toolChoice` specifies a tool, the model MUST call that tool:
   ```typescript
   // If toolChoice='generate_artifact', we MUST get a tool call
   if (toolCallStartEvents.length === 0) {
     throw new Error(
       "Tool calling requested via toolChoice='generate_artifact' but model responded directly."
     );
   }
   ```

3. **AI Output Variability**: Use soft assertions for AI-generated content where appropriate:
   ```typescript
   // Soft assertion - log warning but don't fail on keyword mismatch
   if (!hasRelevantKeywords) {
     console.log(`⚠️ Title may not contain expected keywords: "${data.title}"`);
   }
   ```

4. **Cost Awareness**: Each test file documents its approximate cost per run.

#### Rate Limiting Note

Rate limit tests are **commented out** in `chat-endpoint-integration.test.ts`:
```typescript
// These tests are commented out because this is a demo site using an API
// that doesn't enforce rate limiting. Re-enable if rate limiting is added.
```

If your deployment enforces rate limits, uncomment the rate limit tests in the test file.

---

## Tier 3: E2E Tests

E2E tests use **Playwright** to test the full application in a real browser.

| Task | Command |
|------|---------|
| Run locally (headed) | `npm run test:e2e:headed` |
| Run locally (headless) | `npm run test:e2e` |
| View last report | `npm run test:e2e:report` |
| Debug mode | `npm run test:e2e:debug` |

## Triggering E2E Tests

### Option 1: GitHub UI

1. Navigate to **Actions** tab in the repository
2. Select **"E2E Tests (Manual)"** from the left sidebar
3. Click **"Run workflow"** dropdown
4. (Optional) Enter a test filter:
   - `@critical` - Critical paths only (~3-5 min)
   - `chat` - Chat-related tests
   - `artifact` - Artifact-related tests
   - Leave empty for all tests
5. Click **"Run workflow"**

### Option 2: GitHub CLI

```bash
# Install GitHub CLI if needed
brew install gh

# Authenticate
gh auth login

# Run all E2E tests
gh workflow run e2e-manual.yml

# Run with filter
gh workflow run e2e-manual.yml -f test_filter="@critical"
gh workflow run e2e-manual.yml -f test_filter="chat"
gh workflow run e2e-manual.yml -f test_filter="artifact"

# Check run status
gh run list --workflow=e2e-manual.yml

# Watch a run in progress
gh run watch
```

### Option 3: Local Execution (Free)

```bash
# Full E2E suite with browser visible
npm run test:e2e:headed

# Headless (faster)
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui

# Debug mode (step through tests)
npm run test:e2e:debug
```

## When to Run E2E

### ✅ DO Run E2E

| Scenario | Recommended Filter |
|----------|-------------------|
| Before merging to main | `@critical` or full suite |
| After changing chat components | `chat` |
| After changing artifact system | `artifact` |
| After changing auth flow | `auth` |
| After Edge Function changes | Full suite |
| Before a release | Full suite |

### ❌ DON'T Waste E2E On

- Documentation-only changes
- README updates
- Comment/formatting changes
- Config file tweaks (unless CI-related)
- Test file additions (run them locally)

## Test Tags

Tests are tagged for selective execution:

| Tag | Description | Typical Duration |
|-----|-------------|------------------|
| `@critical` | Must-pass tests for core functionality | ~3-5 min |
| `@chat` | Chat input, streaming, message display | ~5 min |
| `@artifact` | Artifact generation, rendering, export | ~5 min |
| `@auth` | Authentication, session management | ~3 min |

### Tagging Tests

```typescript
// tests/e2e/chat.spec.ts
test('send message and receive response @critical @chat', async ({ page }) => {
  // This test runs with @critical OR @chat filter
});

test('message history persists @chat', async ({ page }) => {
  // This only runs with @chat filter or full suite
});
```

## CI/CD Integration

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `e2e-manual.yml` | Manual dispatch | On-demand E2E testing |
| `e2e-tests.yml` | Push to main | Safety net for merged code |
| `frontend-quality.yml` | Every PR | Lint, types, unit tests, build |

### Minutes Budget

With 3,000 GitHub Actions minutes/month:

| Strategy | Runs/Month | Minutes | Budget % |
|----------|------------|---------|----------|
| Manual trigger (~2/day) | 60 | 900 | 30% |
| Main merges (~1/day) | 30 | 450 | 15% |
| **Total E2E** | 90 | 1,350 | **45%** |
| Remaining for other CI | - | 1,650 | 55% |

## Viewing Results

### GitHub Actions

1. Go to **Actions** → Select the run
2. Click on the **e2e** job
3. Expand **Run E2E tests** step for logs
4. Download **playwright-report** artifact for HTML report

### Local

```bash
# After running tests, view the HTML report
npm run test:e2e:report

# This opens a browser with:
# - Test results summary
# - Screenshots of failures
# - Trace viewer for debugging
```

## Debugging Failures

### 1. Check the Screenshot

Failed tests automatically capture screenshots. Download the `test-failures-*` artifact from the GitHub Actions run.

### 2. Run Locally with Debug Mode

```bash
# Step through the failing test
npm run test:e2e:debug

# Or use UI mode for better visualization
npm run test:e2e:ui
```

### 3. Use Trace Viewer

Playwright records traces on retry. Download and view:

```bash
npx playwright show-trace path/to/trace.zip
```

### 4. Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Timeout waiting for element | Slow render or missing element | Increase timeout or check selector |
| Element not visible | Covered by modal/overlay | Add `await page.waitForSelector()` |
| Flaky test | Race condition | Add explicit waits, avoid `waitForTimeout` |
| Mock not working | Route not matched | Check route pattern in `api-mocks.ts` |

## Test Files Structure

```
tests/
├── e2e/
│   ├── auth.spec.ts       # Authentication flows
│   ├── chat.spec.ts       # Chat functionality
│   ├── artifacts.spec.ts  # Artifact generation/rendering
│   └── global-setup.ts    # Pre-test setup
├── fixtures/
│   ├── api-mocks.ts       # API route mocking
│   ├── base-test.ts       # Extended test fixture
│   ├── test-helpers.ts    # Reusable helpers
│   └── test-data.ts       # Test constants
└── mocks/
    ├── browser.ts         # MSW browser setup (legacy)
    └── handlers.ts        # MSW request handlers (legacy)
```

## Best Practices

### 1. Run Critical Tests Often

```bash
# Quick sanity check before any merge
gh workflow run e2e-manual.yml -f test_filter="@critical"
```

### 2. Run Full Suite Before Major Releases

```bash
# Full E2E before deploying significant changes
gh workflow run e2e-manual.yml
```

### 3. Use Local for Development

```bash
# Free and instant feedback
npm run test:e2e:headed
```

### 4. Tag New Tests Appropriately

Always add relevant tags when creating tests:

```typescript
test('new feature works @critical @featureName', async ({ page }) => {
  // ...
});
```

### 5. Keep Tests Independent

Each test should:
- Start from a clean state
- Not depend on other tests
- Clean up after itself

## Maintenance

### Adding New E2E Tests

1. Create test file in `tests/e2e/`
2. Add appropriate tags (`@critical`, `@chat`, etc.)
3. Run locally first: `npm run test:e2e:headed`
4. Ensure mocks are set up in `tests/fixtures/api-mocks.ts`

### Updating Mocks

When API responses change:

1. Update `tests/fixtures/api-mocks.ts`
2. Update `tests/fixtures/test-data.ts` if constants changed
3. Run full E2E suite to verify

## Related Documentation

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [GitHub Actions Workflows](../.github/workflows/)
- [Test Fixtures](../tests/fixtures/)
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - General debugging guide
