# GLM Migration - System Architecture

**Last Updated**: 2025-12-01
**Migration Status**: Phase 4 Complete (SSE Streaming Implementation)

## Overview

The GLM migration introduces a dual-provider architecture with intelligent routing between GLM (primary) and OpenRouter (fallback) for chat requests.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│                    ChatInterface Component                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    POST /chat (streaming)
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Supabase Edge Function: chat/                  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              GLM Chat Router (NEW)                       │  │
│  │         supabase/functions/_shared/glm-chat-router.ts   │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────┐     │  │
│  │  │        Circuit Breaker State                   │     │  │
│  │  │  - consecutiveFailures: number                │     │  │
│  │  │  - circuitOpenUntil: timestamp                │     │  │
│  │  │  - THRESHOLD: 3 failures                      │     │  │
│  │  │  - RESET: 60 seconds                          │     │  │
│  │  └────────────────────────────────────────────────┘     │  │
│  │                                                          │  │
│  │  Routing Logic:                                          │  │
│  │  1. Check circuit breaker status                         │  │
│  │  2. If OPEN → route to OpenRouter                        │  │
│  │  3. If CLOSED → try GLM first                            │  │
│  │  4. On GLM failure → fallback to OpenRouter              │  │
│  │  5. Track failures for circuit management                │  │
│  └──────────────────┬───────────────────┬───────────────────┘  │
│                     │                   │                      │
│              GLM Success          GLM Failure                  │
│                     │                   │                      │
│                     ▼                   ▼                      │
│          ┌──────────────────┐  ┌──────────────────┐           │
│          │ GLM Client       │  │ OpenRouter Client│           │
│          │ (glm-client.ts)  │  │ (openrouter-     │           │
│          │                  │  │  client.ts)      │           │
│          │ - Retry logic    │  │                  │           │
│          │ - Token tracking │  │ - Gemini Flash   │           │
│          │ - Cost logging   │  │ - Retry logic    │           │
│          └────────┬─────────┘  └────────┬─────────┘           │
│                   │                     │                      │
└───────────────────┼─────────────────────┼──────────────────────┘
                    │                     │
                    ▼                     ▼
        ┌───────────────────┐  ┌────────────────────┐
        │   Z.ai GLM API    │  │  OpenRouter API    │
        │   (GLM-4.6)       │  │  (Gemini Flash)    │
        │                   │  │                    │
        │ - Coding Plan     │  │ - Unlimited key    │
        │ - Thinking mode   │  │ - Fast responses   │
        │ - Streaming       │  │ - Streaming        │
        └───────────────────┘  └────────────────────┘
```

## Request Flow Diagrams

### Normal Operation (Circuit CLOSED)

```
User Message
    │
    ▼
Chat Edge Function
    │
    ▼
GLM Chat Router
    │
    ├─ Check circuit: CLOSED ✓
    │
    ▼
Try GLM API
    │
    ├─ Success? YES ✓
    │
    ├─ Reset failure counter
    │
    ▼
Stream response to user
```

### Fallback Scenario (GLM Failure)

```
User Message
    │
    ▼
Chat Edge Function
    │
    ▼
GLM Chat Router
    │
    ├─ Check circuit: CLOSED ✓
    │
    ▼
Try GLM API
    │
    ├─ Success? NO ✗
    │
    ├─ Status: 429 (Rate Limited)
    │
    ├─ Retries: 0/2, 1/2, 2/2 → All fail
    │
    ├─ Classify error: RETRYABLE ✓
    │
    ├─ Increment failure counter (1 → 2 → 3)
    │
    ▼
Fallback to OpenRouter
    │
    ├─ Call Gemini Flash API
    │
    ├─ Success? YES ✓
    │
    ▼
Stream response to user
```

### Circuit Breaker Opens

```
User Message (after 3 failures)
    │
    ▼
Chat Edge Function
    │
    ▼
GLM Chat Router
    │
    ├─ Check circuit: OPEN ⚠️
    │
    ├─ Skip GLM entirely
    │
    ▼
Route directly to OpenRouter
    │
    ├─ Call Gemini Flash API
    │
    ├─ Success? YES ✓
    │
    ▼
Stream response to user
    │
    └─ After 60s: Circuit auto-resets to CLOSED
```

## SSE Streaming Architecture (Phase 4)

### Artifact Generation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React)                              │
│                                                                  │
│  useChatMessages.tsx                   ReasoningDisplay.tsx      │
│  ├─ EventSource connection             ├─ Claude-style ticker    │
│  ├─ reasoning_chunk handler    ───►    ├─ Live status updates    │
│  ├─ content_chunk handler              ├─ Timer display          │
│  └─ artifact_complete handler          └─ Expandable reasoning   │
│                                                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
              GET /generate-artifact?stream=true
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│           Edge Function: generate-artifact/                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              SSE Stream Controller                        │   │
│  │                                                           │   │
│  │  GLM API Response       SSE Events                        │   │
│  │  ┌────────────┐        ┌────────────────────────────┐    │   │
│  │  │ reasoning_ │ ───►   │ event: reasoning_chunk      │    │   │
│  │  │ content    │        │ data: "Let me analyze..."   │    │   │
│  │  └────────────┘        └────────────────────────────┘    │   │
│  │  ┌────────────┐        ┌────────────────────────────┐    │   │
│  │  │ content    │ ───►   │ event: content_chunk        │    │   │
│  │  │            │        │ data: "export default..."   │    │   │
│  │  └────────────┘        └────────────────────────────┘    │   │
│  │                        ┌────────────────────────────┐    │   │
│  │  On Complete ─────────►│ event: artifact_complete    │    │   │
│  │                        │ data: {artifact JSON}       │    │   │
│  │                        └────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### SSE Event Types

| Event Type | Data Format | Description |
|------------|-------------|-------------|
| `reasoning_chunk` | string | Incremental GLM thinking text |
| `reasoning_complete` | string | Full reasoning text (end marker) |
| `content_chunk` | string | Incremental artifact code |
| `artifact_complete` | JSON | Full artifact with metadata |
| `error` | JSON | Error details on failure |

### Key Implementation Files

| File | Purpose |
|------|---------|
| `generate-artifact/index.ts` | SSE stream controller, GLM integration |
| `useChatMessages.tsx` | EventSource setup, event handlers |
| `ReasoningDisplay.tsx` | Claude-style ticker pill component |
| `glm-reasoning-parser.ts` | Incremental parsing for live updates |

---

## Component Responsibilities

### `glm-chat-router.ts` (NEW)

**Responsibilities**:
- Provider selection (GLM vs OpenRouter)
- Circuit breaker management
- Error classification
- Fallback orchestration
- Message format conversion

**Exports**:
- `routeChatRequest(messages, options)` - Main routing function
- `getCircuitBreakerStatus()` - Status monitoring
- `resetCircuitBreaker()` - Manual reset

**State**:
- `consecutiveFailures: number` - Failure counter
- `circuitOpenUntil: timestamp` - Circuit timeout

### `glm-client.ts` (Existing)

**Responsibilities**:
- GLM API communication
- Retry logic (exponential backoff)
- Token usage tracking
- Cost calculation
- Streaming support

**Key Functions**:
- `callGLMWithRetry()` - Main GLM call with retries
- `extractTextAndReasoningFromGLM()` - Parse responses
- `processGLMStream()` - Handle SSE streaming

### `openrouter-client.ts` (Existing)

**Responsibilities**:
- OpenRouter API communication
- Gemini Flash model access
- Retry logic
- Token tracking

**Key Functions**:
- `callGeminiFlashWithRetry()` - Main Gemini Flash call
- `extractTextFromGeminiFlash()` - Parse responses

## Error Handling Strategy

### Error Classification

```
API Error Response
    │
    ▼
Check Status Code
    │
    ├─────────────────────────────────┐
    │                                 │
    ▼                                 ▼
RETRYABLE                      NON-RETRYABLE
- 429 Rate Limited             - 400 Bad Request
- 503 Service Unavailable      - 401 Unauthorized
    │                                 │
    ▼                                 ▼
Retry with backoff             Return error immediately
    │                          (no fallback)
    ├─ Success? YES → Done
    │
    ├─ Max retries? NO → Retry again
    │
    ├─ Max retries? YES
    │
    ▼
Fallback to OpenRouter
```

### Circuit Breaker Thresholds

| Metric | Value | Rationale |
|--------|-------|-----------|
| Failure Threshold | 3 | Quick detection without false positives |
| Reset Timeout | 60s | Balance between recovery and availability |
| Retry Attempts | 2 | Exponential backoff (1s, 2s, 4s) |

## Migration Phases

### ✅ Phase 1: GLM Client (Complete)
- [x] Create `glm-client.ts`
- [x] Implement retry logic
- [x] Add streaming support
- [x] Token tracking & cost calculation

### ✅ Phase 2: Testing Infrastructure (Complete)
- [x] Unit tests for GLM client
- [x] Mock API responses
- [x] Streaming tests
- [x] Error handling tests

### ✅ Phase 3: Router Implementation (Complete)
- [x] Create `glm-chat-router.ts`
- [x] Circuit breaker pattern
- [x] Error classification
- [x] Message format conversion
- [x] Comprehensive documentation

### ✅ Phase 4: SSE Streaming Implementation (Complete - 2025-12-01)
- [x] Replace parallel dual-endpoint approach with single SSE stream
- [x] Implement `reasoning_chunk`, `content_chunk` SSE event types
- [x] Add Claude-style ticker pill UI (`ReasoningDisplay.tsx`)
- [x] Fix artifact code appearing in chat during generation
- [x] Add incremental reasoning parser (`glm-reasoning-parser.ts`)
- [x] Implement stop button for stream cancellation
- [x] Add JSON fallback for backward compatibility

### 🚧 Phase 5: Production Optimization (Next)
- [ ] Add provider/fallback metrics
- [ ] Update admin dashboard with streaming analytics
- [ ] Add circuit breaker monitoring
- [ ] Performance benchmarking

### 📋 Phase 6: Production Rollout (Future)
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Monitor error rates
- [ ] Track cost savings
- [ ] User feedback collection

## Monitoring & Observability

### Metrics to Track

1. **Provider Distribution**
   - GLM requests: count
   - OpenRouter requests: count
   - Fallback ratio: %

2. **Circuit Breaker Activity**
   - Opens per day: count
   - Average duration: seconds
   - Failure patterns: timeline

3. **Performance**
   - GLM latency: p50, p95, p99
   - OpenRouter latency: p50, p95, p99
   - Fallback overhead: milliseconds

4. **Cost**
   - GLM cost per request: $
   - OpenRouter cost per request: $
   - Total savings: $ vs all-OpenRouter

### Dashboard Queries

```sql
-- Provider health over time
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  provider,
  COUNT(*) as requests,
  AVG(latency_ms) as avg_latency,
  SUM(CASE WHEN status_code = 200 THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as success_rate
FROM ai_usage_logs
WHERE function_name = 'chat'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour, provider
ORDER BY hour DESC;
```

```sql
-- Circuit breaker events
SELECT
  created_at,
  circuit_state,
  consecutive_failures,
  provider_used
FROM circuit_breaker_logs
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

## Configuration

### Environment Variables

```bash
# GLM API Key (Z.ai Coding Plan)
GLM_API_KEY=sk-...

# OpenRouter Keys
OPENROUTER_GEMINI_FLASH_KEY=sk-or-v1-...

# Router Configuration (optional overrides)
CIRCUIT_BREAKER_THRESHOLD=3        # Failures before opening
CIRCUIT_BREAKER_RESET_MS=60000     # Time before auto-close
RETRY_MAX_ATTEMPTS=2               # Max retries per request
```

### Code Constants

Located in `glm-chat-router.ts`:

```typescript
const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_RESET_MS = 60000;
```

Located in `config.ts`:

```typescript
export const RETRY_CONFIG = {
  MAX_RETRIES: 2,
  BACKOFF_MULTIPLIER: 2,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 10000
};
```

## Cost Analysis

### Model Pricing (per 1M tokens)

| Provider | Model | Input | Output |
|----------|-------|-------|--------|
| Z.ai | GLM-4.6 | $0.10 | $0.30 |
| OpenRouter | Gemini Flash | $0.075 | $0.30 |

### Estimated Savings

Assuming:
- 80% of requests succeed with GLM
- 20% fallback to OpenRouter
- Average: 100 input tokens, 500 output tokens per request

**Cost per 1000 requests**:
- All GLM: $0.16
- All OpenRouter: $0.16
- Mixed (80/20): ~$0.16 (similar cost, better reliability)

**Key Benefit**: Not cost savings, but **improved reliability** through redundancy.

## Testing Strategy

### Unit Tests
- [x] Circuit breaker state management
- [x] Error classification logic
- [ ] Message format conversion
- [ ] Provider selection logic

### Integration Tests
- [ ] GLM → OpenRouter fallback flow
- [ ] Circuit breaker open/close cycle
- [ ] Streaming response handling
- [ ] Concurrent request handling

### Load Tests
- [ ] Circuit breaker under high failure rate
- [ ] Fallback performance at scale
- [ ] Memory usage under load
- [ ] State consistency across instances

## Related Documentation

- [GLM Chat Router Guide](./GLM-CHAT-ROUTER.md) - Detailed router documentation
- [GLM-4.6 Capabilities](./GLM-4.6-CAPABILITIES.md) - Model capabilities and API
- [Migration Plan](./GLM-MIGRATION-PLAN.md) - Overall migration strategy

## See Also

- **Code**: `supabase/functions/_shared/glm-chat-router.ts`
- **Tests**: `supabase/functions/_shared/__tests__/glm-chat-router.test.ts`
- **Dependencies**: `glm-client.ts`, `openrouter-client.ts`, `config.ts`
