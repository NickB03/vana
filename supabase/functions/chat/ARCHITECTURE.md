# Chat Function Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT REQUEST                           │
│                      (HTTP POST /chat)                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      index.ts (Orchestrator)                     │
│                         ~525 lines                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
┌────────────────┐ ┌────────────┐ ┌────────────────┐
│  MIDDLEWARE    │ │  HANDLERS  │ │  SHARED UTILS  │
└────────────────┘ └────────────┘ └────────────────┘
```

## Detailed Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CORS Handling                                                 │
│    • Validate origin                                             │
│    • Handle OPTIONS preflight                                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Validation (middleware/validation.ts)                         │
│    • Parse JSON body                                             │
│    • Validate messages array (max 100)                           │
│    • Check message format (role, content)                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Rate Limiting (middleware/rateLimit.ts)                       │
│    ┌───────────────────────┬───────────────────────┐            │
│    │ API Throttle          │ User Rate Limit       │            │
│    │ 15 RPM (Gemini)       │ Guest: 20/5h (IP)     │            │
│    │                       │ Auth: 100/5h (user)   │            │
│    └───────────────────────┴───────────────────────┘            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Authentication (middleware/auth.ts)                           │
│    • Create Supabase client (anon or authenticated)              │
│    • Verify JWT token (if authenticated)                         │
│    • Verify session ownership                                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. URL Content Extraction (handlers/url-extract.ts)              │
│    • Extract linked page content (if URLs detected)              │
│    • Provide context to tool-calling                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Tool-Calling Chat (handlers/tool-calling-chat.ts)             │
│    • Apply toolChoice override (generate_artifact/image)         │
│    • GLM decides tool calls (artifact/image/search)              │
│    • Tool executor runs + returns results                        │
│    • Stream SSE content + tool events to client                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. Background Tasks (fire-and-forget)                            │
│    • Update cache (cache-manager)                                │
│    • Trigger summarization (summarize-conversation)              │
└─────────────────────────────────────────────────────────────────┘
```

## Module Responsibilities

### Middleware Layer
Handles cross-cutting concerns that apply to all requests:

```
┌─────────────────────────────────────────────────────────────────┐
│ middleware/validation.ts                                         │
│ • Validates request structure                                    │
│ • Checks message format                                          │
│ • Returns ValidationResult                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ middleware/auth.ts                                               │
│ • Creates Supabase client                                        │
│ • Authenticates user                                             │
│ • Verifies session ownership                                     │
│ • Returns AuthResult                                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ middleware/rateLimit.ts                                          │
│ • Checks API throttle (15 RPM)                                   │
│ • Checks guest rate limit (20/5h)                                │
│ • Checks user rate limit (100/5h)                                │
│ • Returns RateLimitResult with headers                           │
└─────────────────────────────────────────────────────────────────┘
```

### Handler Layer
Implements business logic for specific features:

```
┌─────────────────────────────────────────────────────────────────┐
│ handlers/tool-calling-chat.ts                                    │
│ • GLM native tool-calling orchestration                          │
│ • Executes tools + handles continuations                         │
│ • Streams SSE content + tool lifecycle events                    │
│ • Returns Response with streamed tool output                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ handlers/url-extract.ts                                          │
│ • Extracts content from URLs in user messages                    │
│ • Returns extracted context + metadata                           │
└─────────────────────────────────────────────────────────────────┘
```

## Error Handling

Each module returns structured results with error information:

```typescript
// Middleware pattern
interface MiddlewareResult {
  ok: boolean;
  data?: T;
  error?: {
    error: string;
    requestId: string;
    status?: number;
  };
}

// Handler pattern
interface HandlerResponse {
  sseResponse: string;
  error?: string;
}
```

Errors are caught at each layer and returned with appropriate status codes:
- 400: Validation errors
- 401: Authentication errors
- 403: Authorization errors (session ownership)
- 429: Rate limit exceeded
- 500: Internal errors
- 503: Service unavailable (transient)

## Data Flow Example

### Regular Chat Request

```
1. Client POST /chat
   {
     "messages": [...],
     "sessionId": "abc123",
     "isGuest": false,
     "includeReasoning": true
   }

2. Validation ✓
   → Valid messages array

3. Rate Limiting ✓
   → API throttle: OK (12/15)
   → User rate limit: OK (45/100)
   → Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

4. Authentication ✓
   → JWT valid
   → Session ownership verified

5. Tool-Calling Orchestration
   → toolChoice: auto
   → GLM decides tool calls

6. URL Extraction (if URLs detected)
   → Extracted content appended to context

7. Tool Execution
   → browser.search executed
   → 5 results returned

8. Streaming Response
   → Event 1: tool_call_start
   → Event 2: tool_result
   → Events 3-N: reasoning_status (from ReasoningProvider, when enabled)
   → Events 3-N: reasoning_step (progressive step detection)
   → Events 3-N: Chat content (OpenAI format)
   → Event N+1: reasoning_complete
   → Event N+2: [DONE]

10. Background Tasks
    → Cache updated (fire-and-forget)
    → Summarization triggered (fire-and-forget)
```

## Performance Characteristics

### Latency Breakdown (Typical Request)
- Validation: <1ms
- Rate Limiting: 5-10ms (database query)
- Authentication: 10-20ms (JWT verification + database query)
- Tool-Calling Inference: 2000-5000ms (GLM streaming)
- Tool Execution: variable (search/image/artifact)

### Critical Path (No Reasoning, No Search)
Validation → Rate Limit → Auth → Tool-Calling Stream
= ~50ms + streaming time

### Parallelization Opportunities
- API throttle + Guest/User rate limit (already parallel)
- Cache fetch + Context building (could be parallel)

## Feature Flags

### ReasoningProvider (Status Generation)
The `USE_REASONING_PROVIDER` flag controls whether tool-calling uses the hybrid ReasoningProvider for semantic status updates:

- **Enabled**: GLM-4.5-Air generates semantic status messages from reasoning chunks
- **Disabled**: Direct text extraction from parsed reasoning (legacy behavior)
- **Rollout**: `REASONING_PROVIDER_ROLLOUT_PERCENT` controls gradual rollout

```bash
# Enable in environment
USE_REASONING_PROVIDER=true
REASONING_PROVIDER_ROLLOUT_PERCENT=100
```
