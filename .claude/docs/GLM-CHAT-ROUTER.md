# GLM Chat Router - Provider Fallback & Circuit Breaker

**Created**: 2025-11-29
**Status**: Ready for Integration
**Location**: `supabase/functions/_shared/glm-chat-router.ts`

## Overview

The GLM Chat Router intelligently routes chat requests between GLM (primary) and OpenRouter (fallback) with a circuit breaker pattern to prevent cascading failures.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Chat Request                        │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │ routeChatRequest│
         └────────┬────────┘
                  │
                  ▼
         ┌────────────────┐
         │Circuit Breaker │
         │  Check Status  │
         └────┬───────────┘
              │
       ┌──────┴──────┐
       │             │
    CLOSED        OPEN
       │             │
       ▼             ▼
  ┌────────┐   ┌──────────┐
  │  GLM   │   │OpenRouter│
  │Primary │   │ Direct   │
  └───┬────┘   └──────────┘
      │
   Success?
      │
  ┌───┴────┐
  │        │
 YES      NO
  │        │
  ▼        ▼
Reset   Classify
Circuit   Error
  │        │
  │    ┌───┴────┐
  │    │        │
  │  Retryable Non-Retryable
  │    │        │
  │    ▼        ▼
  │ Fallback  Return
  │   to       Error
  │OpenRouter   │
  │    │        │
  └────┴────────┘
       │
       ▼
    Response
```

## Key Features

### 1. Circuit Breaker Pattern

**Purpose**: Prevent cascading failures by detecting GLM outages and routing traffic to OpenRouter

**Configuration**:
- **Threshold**: 3 consecutive failures
- **Timeout**: 60 seconds
- **Reset**: On successful GLM response

**States**:
- **CLOSED** (normal): Try GLM first
- **OPEN** (failure mode): Route directly to OpenRouter
- **Automatic Reset**: After timeout or successful response

### 2. Error Classification

**Retryable Errors** (trigger fallback):
- `429` - Rate Limited
- `503` - Service Unavailable

**Non-Retryable Errors** (return immediately):
- `400` - Bad Request
- `401` - Unauthorized

### 3. Provider Selection

**Auto Mode** (default):
1. Check circuit breaker status
2. If closed → Try GLM first
3. If open → Route to OpenRouter
4. On GLM retryable error → Fallback to OpenRouter
5. On GLM non-retryable error → Return error

**Explicit Mode**:
- `preferredProvider: 'glm'` - Force GLM (no fallback)
- `preferredProvider: 'openrouter'` - Force OpenRouter

## API Reference

### `routeChatRequest()`

Routes chat request to appropriate provider with fallback logic.

```typescript
interface RouterOptions {
  requestId: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  preferredProvider?: 'glm' | 'openrouter' | 'auto'; // default: 'auto'
}

interface RouterResult {
  response: Response;
  provider: 'glm' | 'openrouter';
  fallbackUsed: boolean;
  circuitBreakerOpen: boolean;
}

async function routeChatRequest(
  messages: OpenRouterMessage[],
  options: RouterOptions
): Promise<RouterResult>
```

**Example Usage**:

```typescript
import { routeChatRequest } from './_shared/glm-chat-router.ts';

// Auto mode (recommended)
const result = await routeChatRequest(
  [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is the capital of France?' }
  ],
  {
    requestId: crypto.randomUUID(),
    temperature: 0.7,
    max_tokens: 8000,
    stream: true,
    preferredProvider: 'auto' // Try GLM first, fallback to OpenRouter
  }
);

console.log(`Provider: ${result.provider}`); // 'glm' or 'openrouter'
console.log(`Fallback used: ${result.fallbackUsed}`); // true if OpenRouter was fallback
console.log(`Circuit open: ${result.circuitBreakerOpen}`); // true if circuit breaker is active

// Return streaming response
return result.response;
```

### `getCircuitBreakerStatus()`

Get current circuit breaker status for monitoring.

```typescript
function getCircuitBreakerStatus(): {
  isOpen: boolean;
  consecutiveFailures: number;
  opensAt: number;
  resetsAt: number;
}
```

**Example**:

```typescript
const status = getCircuitBreakerStatus();

if (status.isOpen) {
  console.log(`Circuit breaker OPEN - resets at ${new Date(status.resetsAt)}`);
} else {
  console.log(`Circuit breaker CLOSED - ${status.consecutiveFailures}/${status.opensAt} failures`);
}
```

### `resetCircuitBreaker()`

Manually reset circuit breaker (for testing/debugging).

```typescript
function resetCircuitBreaker(): void
```

## Integration Guide

### Step 1: Update Chat Function

Replace direct GLM/OpenRouter calls with router:

**Before**:
```typescript
const response = await callGeminiFlashWithRetry(messages, {
  temperature: 0.7,
  max_tokens: 8000,
  requestId,
  stream: true
});
```

**After**:
```typescript
import { routeChatRequest } from '../_shared/glm-chat-router.ts';

const { response, provider, fallbackUsed } = await routeChatRequest(messages, {
  requestId,
  temperature: 0.7,
  max_tokens: 8000,
  stream: true,
  preferredProvider: 'auto' // Enable smart routing
});

// Log which provider was used
console.log(`[${requestId}] Used provider: ${provider} (fallback: ${fallbackUsed})`);
```

### Step 2: Add Monitoring

Log router metrics for observability:

```typescript
const result = await routeChatRequest(messages, options);

// Log to database or analytics
await logMetric({
  provider: result.provider,
  fallbackUsed: result.fallbackUsed,
  circuitBreakerOpen: result.circuitBreakerOpen,
  timestamp: new Date()
});
```

### Step 3: Health Check Endpoint

Add circuit breaker status to health checks:

```typescript
import { getCircuitBreakerStatus } from '../_shared/glm-chat-router.ts';

const healthData = {
  ...otherHealthMetrics,
  circuitBreaker: getCircuitBreakerStatus()
};
```

## Message Format Conversion

The router automatically converts OpenAI-style message arrays to GLM's system/user format:

**Input** (OpenAI format):
```typescript
[
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hi there!' },
  { role: 'user', content: 'How are you?' }
]
```

**Converted for GLM**:
```typescript
systemPrompt: "You are a helpful assistant."
userPrompt: "User: Hello\n\nAssistant: Hi there!\n\nUser: How are you?"
```

## Error Handling

### Scenario 1: GLM Rate Limited

```
Request → GLM (429 Rate Limited)
  ↓
Retries (max 2 attempts)
  ↓
Max retries exceeded
  ↓
Fallback to OpenRouter ✓
  ↓
Record failure (1/3)
  ↓
Return OpenRouter response
```

### Scenario 2: Circuit Breaker Opens

```
Request 1 → GLM fails → Fallback → Count: 1/3
Request 2 → GLM fails → Fallback → Count: 2/3
Request 3 → GLM fails → Fallback → Count: 3/3 → CIRCUIT OPEN
Request 4 → Direct to OpenRouter (circuit open) ✓
...
After 60s → Circuit resets
Request N → Try GLM again
```

### Scenario 3: Non-Retryable Error

```
Request → GLM (400 Bad Request)
  ↓
Non-retryable error detected
  ↓
Record failure (1/3)
  ↓
Return error immediately (no fallback)
```

## Logging Output

The router provides comprehensive logging:

```
[req-123] 🎯 Routing decision: preferredProvider=auto, circuitOpen=false, consecutiveFailures=0
[req-123] 🚀 Attempting GLM chat request
[req-123] ✅ GLM chat succeeded
```

```
[req-456] 🎯 Routing decision: preferredProvider=auto, circuitOpen=false, consecutiveFailures=2
[req-456] 🚀 Attempting GLM chat request
[req-456] ⚠️  GLM chat failed with status: 429
[req-456] 🔄 Retryable error (429) - falling back to OpenRouter
[req-456] ⚠️  GLM failure count: 3/3
[req-456] 🔴 Circuit breaker OPENED after 3 failures. Routing to OpenRouter for 60s
```

```
[req-789] 🎯 Routing decision: preferredProvider=auto, circuitOpen=true, consecutiveFailures=3
[req-789] ⚡ Circuit breaker OPEN - routing directly to OpenRouter (bypassing GLM)
```

## Performance Considerations

### Latency Impact

- **GLM Success**: No additional latency (single provider call)
- **GLM Failure → OpenRouter**: +200-500ms for retry detection + fallback
- **Circuit Open**: No additional latency (direct OpenRouter routing)

### Resource Usage

- **Memory**: ~1KB per request (router state)
- **Module State**: Circuit breaker state is module-level (resets on cold start)
- **Cold Starts**: Circuit resets on Edge Function cold start (~every 5-10 minutes)

## Testing

Run tests with:

```bash
cd supabase/functions
deno test _shared/__tests__/glm-chat-router.test.ts
```

## Monitoring Queries

### Circuit Breaker Activity

```sql
-- Count fallback usage over time
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  provider,
  COUNT(*) as requests,
  SUM(CASE WHEN fallback_used THEN 1 ELSE 0 END) as fallbacks
FROM chat_router_logs
GROUP BY hour, provider
ORDER BY hour DESC;
```

### Provider Health

```sql
-- GLM vs OpenRouter success rates
SELECT
  provider,
  COUNT(*) as total_requests,
  SUM(CASE WHEN status_code = 200 THEN 1 ELSE 0 END) as successes,
  ROUND(100.0 * SUM(CASE WHEN status_code = 200 THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM ai_usage_logs
WHERE function_name = 'chat'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY provider;
```

## Configuration

All constants are configurable at the top of `glm-chat-router.ts`:

```typescript
const CIRCUIT_THRESHOLD = 3;        // Failures before opening circuit
const CIRCUIT_RESET_MS = 60000;     // Time before circuit auto-closes (ms)
```

## Migration Checklist

- [ ] Deploy `glm-chat-router.ts` to Edge Functions
- [ ] Update `chat/` function to use router
- [ ] Add monitoring for `provider` and `fallbackUsed` metrics
- [ ] Configure alerts for circuit breaker opens
- [ ] Test fallback behavior in staging
- [ ] Monitor GLM API quota usage
- [ ] Document provider selection in user-facing docs

## Related Files

- **Implementation**: `supabase/functions/_shared/glm-chat-router.ts`
- **Tests**: `supabase/functions/_shared/__tests__/glm-chat-router.test.ts`
- **Dependencies**:
  - `glm-client.ts` - GLM API client
  - `openrouter-client.ts` - OpenRouter API client
  - `config.ts` - Retry configuration

## See Also

- [GLM-4.6 Capabilities](./GLM-4.6-CAPABILITIES.md)
- [GLM Client Documentation](../../supabase/functions/_shared/glm-client.ts)
- [OpenRouter Client Documentation](../../supabase/functions/_shared/openrouter-client.ts)
