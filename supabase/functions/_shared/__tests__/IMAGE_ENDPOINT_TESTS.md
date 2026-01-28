# Image Endpoint Integration Tests

Comprehensive integration tests for the `/generate-image` Edge Function endpoint.

## Overview

File: `image-endpoint-integration.test.ts`

**Test Count**: 10 comprehensive tests
**Cost per run**: ~$0.05 (minimal to keep costs low)
**Execution Time**: ~10-15 seconds (when API keys are set)

## Prerequisites

### Required Environment Variables

```bash
# OpenRouter API key for image generation
export OPENROUTER_GEMINI_IMAGE_KEY="sk-or-v1-..."

# Supabase local development instance
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Starting Local Supabase

```bash
# Start local Supabase stack
supabase start

# Get anon key from output
# Example output:
#   API URL: http://127.0.0.1:54321
#   anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Running Tests

### Run All Tests

```bash
cd supabase/functions

# With environment variables set
OPENROUTER_GEMINI_IMAGE_KEY=your_key \
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_ANON_KEY=your_anon_key \
deno test --allow-net --allow-env _shared/__tests__/image-endpoint-integration.test.ts
```

### Run Specific Test

```bash
# Run only the "Valid Prompt" test
deno test --allow-net --allow-env --filter "Valid Prompt" _shared/__tests__/image-endpoint-integration.test.ts
```

### Without API Keys

Tests will **automatically skip** if `OPENROUTER_GEMINI_IMAGE_KEY` is not set:

```bash
# All tests will be ignored
deno test --allow-net --allow-env _shared/__tests__/image-endpoint-integration.test.ts

# Output:
# ok | 0 passed | 0 failed | 10 ignored (1ms)
```

## Test Coverage

### 1. Valid Prompt Generation ✅

**Test**: `Generate Image - Valid Prompt`
**Purpose**: Verify image generation with valid input
**Cost**: ~$0.05

**Validates**:
- 200 OK or 206 Partial Content response
- `success: true` in response body
- Image data present (URL or base64)
- Request ID header present
- Degraded mode handling (storage failures)

**Example Request**:
```json
{
  "prompt": "Generate a simple solid blue square, 100x100 pixels",
  "mode": "generate"
}
```

**Example Response (Success)**:
```json
{
  "success": true,
  "imageUrl": "https://storage.supabase.co/...",
  "imageData": "data:image/png;base64,...",
  "prompt": "Generate a simple solid blue square, 100x100 pixels"
}
```

**Example Response (Degraded Mode)**:
```json
{
  "success": true,
  "imageUrl": "data:image/png;base64,...",
  "imageData": "data:image/png;base64,...",
  "prompt": "Generate a simple solid blue square, 100x100 pixels",
  "degradedMode": true,
  "storageWarning": "Storage system error (Connection timeout). Using temporary base64 - image may not persist long-term."
}
```

### 2. Missing Prompt Error ❌

**Test**: `Generate Image - Missing Prompt`
**Purpose**: Validate error handling for missing required field
**Cost**: Free (no API call)

**Validates**:
- 400 Bad Request response
- Error response structure (error, code, requestId)
- Error message mentions "prompt"

**Example Request**:
```json
{
  "mode": "generate"
}
```

**Example Response**:
```json
{
  "error": "Prompt is required and must be non-empty",
  "code": "INVALID_INPUT",
  "requestId": "abc123-...",
  "timestamp": "2025-12-31T18:00:00.000Z"
}
```

### 3. Empty Prompt Error ❌

**Test**: `Generate Image - Empty Prompt`
**Purpose**: Validate whitespace-only prompt rejection
**Cost**: Free (no API call)

**Validates**:
- 400 Bad Request response
- Error mentions "non-empty" or "required"

**Example Request**:
```json
{
  "prompt": "   ",
  "mode": "generate"
}
```

### 4. Prompt Too Long Error ❌

**Test**: `Generate Image - Prompt Too Long`
**Purpose**: Validate max length enforcement (2000 characters)
**Cost**: Free (no API call)

**Validates**:
- 400 Bad Request response
- Error mentions "too long" or "max" or "2000"

**Example Request**:
```json
{
  "prompt": "A...A" (2001 characters),
  "mode": "generate"
}
```

### 5. Invalid Mode Error ❌

**Test**: `Generate Image - Invalid Mode`
**Purpose**: Validate mode field accepts only "generate" or "edit"
**Cost**: Free (no API call)

**Validates**:
- 400 Bad Request response
- Error mentions valid modes ("generate", "edit")

**Example Request**:
```json
{
  "prompt": "Test image",
  "mode": "invalid-mode"
}
```

### 6. Edit Mode Missing Base Image ❌

**Test**: `Generate Image - Edit Mode Missing Base Image`
**Purpose**: Validate edit mode requires baseImage field
**Cost**: Free (no API call)

**Validates**:
- 400 Bad Request response
- Error mentions "base" or "image" or "edit"

**Example Request**:
```json
{
  "prompt": "Make it blue",
  "mode": "edit"
}
```

### 7. CORS Preflight ✅

**Test**: `Generate Image - CORS Preflight`
**Purpose**: Verify CORS configuration for browser requests
**Cost**: Free (no API call)

**Validates**:
- 204 No Content response
- Access-Control-Allow-Origin header
- Access-Control-Allow-Methods header
- Access-Control-Allow-Headers header

**Example Request**:
```http
OPTIONS /functions/v1/generate-image HTTP/1.1
Origin: http://localhost:8080
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type
```

**Example Response Headers**:
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:8080
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
Access-Control-Max-Age: 86400
```

### 8. Response Headers ✅

**Test**: `Generate Image - Response Headers`
**Purpose**: Verify required response headers
**Cost**: ~$0.05

**Validates**:
- X-Request-ID header present
- Content-Type: application/json
- Access-Control-Allow-Origin matches request origin
- Warning header present for 206 responses

### 9. Invalid JSON Error ❌

**Test**: `Generate Image - Invalid JSON`
**Purpose**: Validate JSON parsing error handling
**Cost**: Free (no API call)

**Validates**:
- 400 Bad Request response
- Error response structure includes requestId

**Example Request**:
```
{ invalid json }
```

### 10. Guest User Access ✅

**Test**: `Generate Image - Guest User (No Auth)`
**Purpose**: Verify unauthenticated users can generate images
**Cost**: ~$0.05

**Validates**:
- 200 OK or 206 Partial Content (no 401 Unauthorized)
- Success response with image data
- No Authorization header required

**Example Request**:
```bash
curl -X POST http://127.0.0.1:54321/functions/v1/generate-image \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:8080" \
  -d '{
    "prompt": "Simple blue circle",
    "mode": "generate"
  }'
```

## Test Results Summary

### Success Criteria

All tests should pass with the following distribution:

| Test Type | Count | Pass Criteria |
|-----------|-------|---------------|
| Valid Requests | 3 | 200 or 206 status, valid response structure |
| Error Handling | 6 | 400 status, proper error response |
| Infrastructure | 1 | 204 status, CORS headers present |

### Expected Output (All Tests Pass)

```
running 10 tests from _shared/__tests__/image-endpoint-integration.test.ts

🎨 Testing image generation with valid prompt...
  Response status: 200
  ✓ Image URL present (HTTP URL)
  ✓ Image data present (base64)
  ✓ Request ID: abc123-def456-...
  ✓ Image generation successful
Generate Image - Valid Prompt ... ok (3s)

❌ Testing error handling - missing prompt...
  Response status: 400
  ✓ Error message: "Prompt is required and must be non-empty"
  ✓ Error code: INVALID_INPUT
  ✓ Error handling correct
Generate Image - Missing Prompt ... ok (50ms)

... (8 more tests)

ok | 10 passed | 0 failed | 0 ignored (15s)
```

### Expected Output (No API Keys)

```
running 10 tests from _shared/__tests__/image-endpoint-integration.test.ts
Generate Image - Valid Prompt ... ignored (0ms)
Generate Image - Missing Prompt ... ignored (0ms)
... (8 more tests)

ok | 0 passed | 0 failed | 10 ignored (1ms)
```

## Integration with CI/CD

### GitHub Actions

Tests are **not run automatically** in CI/CD by default (to avoid costs and missing API keys).

To enable in CI/CD, add secrets to GitHub repository:

```yaml
# .github/workflows/edge-functions-tests.yml
env:
  OPENROUTER_GEMINI_IMAGE_KEY: ${{ secrets.OPENROUTER_GEMINI_IMAGE_KEY }}
  SUPABASE_URL: http://127.0.0.1:54321
  SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

**Warning**: This will incur API costs (~$0.05 per CI run).

## Troubleshooting

### Issue: All tests ignored

**Cause**: `OPENROUTER_GEMINI_IMAGE_KEY` not set
**Solution**: Export the environment variable before running tests

```bash
export OPENROUTER_GEMINI_IMAGE_KEY="your_key"
```

### Issue: Tests fail with connection error

**Cause**: Local Supabase not running
**Solution**: Start local Supabase

```bash
supabase start
```

### Issue: Tests fail with 401 Unauthorized

**Cause**: Invalid `SUPABASE_ANON_KEY`
**Solution**: Get fresh anon key from `supabase start` output

```bash
supabase start | grep "anon key"
```

### Issue: Tests timeout

**Cause**: Image generation can take 5-10 seconds
**Solution**: Increase timeout in test runner

```bash
deno test --allow-net --allow-env --timeout=30000 _shared/__tests__/image-endpoint-integration.test.ts
```

### Issue: 206 Partial Content responses

**Cause**: Storage upload failed (normal in local development)
**Solution**: This is expected behavior. Tests should still pass. Check logs for storage errors.

## Cost Optimization

### Minimize Test Runs

Only 3 tests make actual API calls (~$0.05 each):
1. Valid Prompt Generation
2. Response Headers
3. Guest User Access

To reduce costs during development:

```bash
# Run only error handling tests (free)
deno test --allow-net --allow-env --filter "Error|Invalid|Missing|Empty|Long|Mode" \
  _shared/__tests__/image-endpoint-integration.test.ts

# Run only one API test
deno test --allow-net --allow-env --filter "Valid Prompt" \
  _shared/__tests__/image-endpoint-integration.test.ts
```

### API Call Budget

| Scenario | Cost |
|----------|------|
| Single test run (all tests) | ~$0.15 |
| Daily development (10 runs) | ~$1.50 |
| CI/CD per commit | ~$0.15 |

## Related Files

- **Implementation**: `/Users/nick/Projects/llm-chat-site/supabase/functions/generate-image/index.ts`
- **Config**: `/Users/nick/Projects/llm-chat-site/supabase/functions/_shared/config.ts`
- **Error Handler**: `/Users/nick/Projects/llm-chat-site/supabase/functions/_shared/error-handler.ts`
- **CORS Config**: `/Users/nick/Projects/llm-chat-site/supabase/functions/_shared/cors-config.ts`

## Maintenance

### Updating Tests

When modifying the `/generate-image` endpoint:

1. Update tests to match new behavior
2. Run tests locally to verify
3. Update this documentation
4. Update test count in README.md

### Adding New Tests

1. Add test to `image-endpoint-integration.test.ts`
2. Update test count in this file
3. Update test count in README.md
4. Document test in this file

---

**Last Updated**: 2025-12-31
**Test Count**: 10
**Total Coverage**: Request validation, error handling, CORS, headers, guest access
