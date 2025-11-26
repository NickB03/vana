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
│ 5. Intent Detection (handlers/intent.ts)                         │
│    • Check force modes (forceArtifactMode, forceImageMode)       │
│    • Detect intent (chat, artifact, image, web_search)           │
│    • Determine if web search is needed                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Reasoning Generation (optional)                               │
│    • Generate structured reasoning (max 3 steps, 8s timeout)     │
│    • Use fallback on error                                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Web Search (handlers/search.ts, if needed)                    │
│    • Execute Tavily search with retry                            │
│    • Format results for context injection                        │
│    • Log usage (fire-and-forget)                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. Route by Intent                                               │
│                                                                   │
│  ┌───────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │ IMAGE         │  │ ARTIFACT       │  │ CHAT               │  │
│  │ (handlers/    │  │ (handlers/     │  │ (Regular           │  │
│  │  image.ts)    │  │  artifact.ts)  │  │  Streaming)        │  │
│  │               │  │                │  │                    │  │
│  │ ↓             │  │ ↓              │  │ ↓                  │  │
│  │ generate-     │  │ generate-      │  │ Cache Manager      │  │
│  │ image         │  │ artifact       │  │ ↓                  │  │
│  │ function      │  │ function       │  │ Build Context      │  │
│  │               │  │                │  │ ↓                  │  │
│  │               │  │                │  │ OpenRouter         │  │
│  │               │  │                │  │ (Gemini Flash)     │  │
│  │               │  │                │  │ ↓                  │  │
│  │               │  │                │  │ Transform Stream   │  │
│  │               │  │                │  │ (handlers/         │  │
│  │               │  │                │  │  streaming.ts)     │  │
│  └───────────────┘  └────────────────┘  └────────────────────┘  │
│                                                                   │
│  All paths inject reasoning and search results via SSE           │
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
│ handlers/intent.ts                                               │
│ • Detects user intent (chat, artifact, image, search)           │
│ • Respects force modes (user override)                           │
│ • Returns IntentResult                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ handlers/search.ts                                               │
│ • Performs Tavily web search                                     │
│ • Formats results for context injection                          │
│ • Logs usage for analytics                                       │
│ • Returns SearchResult                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ handlers/image.ts                                                │
│ • Delegates to generate-image function                           │
│ • Formats SSE response                                           │
│ • Injects reasoning                                              │
│ • Returns ImageResponse                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ handlers/artifact.ts                                             │
│ • Delegates to generate-artifact function                        │
│ • Formats SSE response                                           │
│ • Injects reasoning                                              │
│ • Returns ArtifactResponse                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ handlers/streaming.ts                                            │
│ • Creates SSE transform stream                                   │
│ • Injects reasoning as first event                               │
│ • Injects search results as second event                         │
│ • Transforms artifact code (fixes imports)                       │
│ • Returns Response with transformed stream                       │
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

5. Intent Detection
   → Intent: chat
   → shouldSearch: true (temporal keywords detected)

6. Reasoning Generation
   → 3 steps generated
   → Cached for SSE injection

7. Web Search
   → Tavily search executed
   → 5 results returned
   → Context formatted

8. Chat Streaming
   → Cache fetched
   → System instruction built
   → Search context injected
   → OpenRouter called

9. Stream Transformation
   → Event 1: Reasoning (type: reasoning)
   → Event 2: Search Results (type: web_search)
   → Events 3-N: Chat content (OpenAI format)
   → Event N+1: [DONE]

10. Background Tasks
    → Cache updated (fire-and-forget)
    → Summarization triggered (fire-and-forget)
```

## Performance Characteristics

### Latency Breakdown (Typical Request)
- Validation: <1ms
- Rate Limiting: 5-10ms (database query)
- Authentication: 10-20ms (JWT verification + database query)
- Intent Detection: 50-100ms (embedding similarity search)
- Reasoning Generation: 1000-2000ms (LLM call, optional)
- Web Search: 500-1500ms (Tavily API, conditional)
- Chat Streaming: 2000-5000ms (OpenRouter, streaming)

### Critical Path (No Reasoning, No Search)
Validation → Rate Limit → Auth → Intent → Streaming
= ~50ms + streaming time

### Parallelization Opportunities
- API throttle + Guest/User rate limit (already parallel)
- Intent detection + Reasoning generation (could be parallel)
- Cache fetch + Context building (could be parallel)
