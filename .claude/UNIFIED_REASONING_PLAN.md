# Unified Reasoning Architecture Plan (GLM-Based)

**Goal**: Migrate all chat and reasoning to GLM-4.6 via Z.ai API for unified, high-quality experience.

**Scope**: Chat + Artifact + Summaries/Titles (Image reasoning deferred)

**Status**: Plan Only - Not Implemented

**Project Context**: This is a **demo project** — concurrency limits are not a primary concern.

---

## Design Decisions

### Decision 1: GLM-4.6 for ALL Chat
**Rationale**: Quality over throughput. GLM-4.6 provides the best reasoning quality.

| Option | Model | Concurrency | Quality | Decision |
|--------|-------|-------------|---------|----------|
| ~~GLM-4.5~~ | glm-4.5 | 10 | Good | ❌ Rejected |
| **GLM-4.6** | glm-4.6 | 5 | Best | ✅ Selected |
| ~~GLM-4-Plus~~ | glm-4-plus | 20 | Medium | ❌ Rejected |

**Note on Concurrency**: This is a demo project with low traffic. The 5 concurrent limit is acceptable.

### Decision 2: No Complex vs Basic Routing
**Rationale**: Adds unnecessary complexity. ALL chat uses GLM-4.6.

~~Old approach~~:
```
if (isComplex(message)) → GLM-4.6
else → GLM-4.5
```

**New approach**:
```
ALL chat → GLM-4.6
```

### Decision 3: Simple Gemini Fallback (Without Reasoning)
**Rationale**: If GLM fails, gracefully fall back to Gemini for basic responses.

**GLM streaming format**:
```javascript
delta.reasoning_content  // Native thinking (GLM-specific)
delta.content            // Response content
```

**OpenRouter/Gemini streaming format**:
```javascript
delta.content            // Only this - no native reasoning
```

**Fallback Strategy** (Keep it simple):
- **Primary**: GLM-4.6 → Full reasoning experience
- **Fallback**: Gemini Flash → Response only, NO reasoning displayed
- **No complex hybrid logic** — just try GLM first, if it fails, use Gemini without reasoning

---

## Final Model Assignments

| Use Case | Model | API | Native Thinking | Concurrency |
|----------|-------|-----|-----------------|-------------|
| **Chat** | GLM-4.6 | Z.ai | ✅ Yes | 5 |
| **Artifact Generation** | GLM-4.6 | Z.ai | ✅ Yes | 5 |
| **Artifact Fixing** | GLM-4.6 | Z.ai | ✅ Yes | 5 |
| **Summaries** | GLM-4.5 | Z.ai | ❌ No (fast mode) | 10 |
| **Titles** | GLM-4.5 | Z.ai | ❌ No (fast mode) | 10 |
| **Image Generation** | Gemini Flash Image | Google AI Studio | N/A | N/A |

**Note**: Summaries and Titles use GLM-4.5 (no thinking needed, faster, higher concurrency).

---

## Architecture Overview

### Current Architecture (Mixed)
```
Chat Request → Gemini Flash (OpenRouter)
                ↓
         generateStructuredReasoning() → Gemini (pre-generates reasoning)
                ↓
         Stream response + fake 800ms reasoning delays

Artifact Request → GLM-4.6 (Z.ai)
                ↓
         Native thinking mode (reasoning_content)
                ↓
         Real-time SSE streaming
```

### Target Architecture (Unified GLM)
```
Chat Request → GLM-4.6 (Z.ai)
                ↓
         Native thinking mode (reasoning_content)
                ↓
         Real-time SSE streaming (identical to artifact)

Artifact Request → GLM-4.6 (Z.ai)
                ↓
         Native thinking mode (reasoning_content)
                ↓
         Real-time SSE streaming

Summaries/Titles → GLM-4.5 (Z.ai)
                ↓
         No thinking (fast mode)
                ↓
         Direct response
```

---

## Implementation Plan

### Phase 1: Update Config

**File**: `supabase/functions/_shared/config.ts`

**Changes**:
```typescript
export const MODELS = {
  /** GLM-4.6 for chat and artifact generation (concurrency: 5) - native thinking */
  GLM_4_6: 'zhipu/glm-4.6',

  /** GLM-4.5 for summaries/titles (concurrency: 10) - fast, no thinking needed */
  GLM_4_5: 'zhipu/glm-4.5',

  /** @deprecated - Removing for chat, keeping only for image generation reference */
  GEMINI_FLASH: 'google/gemini-2.5-flash-lite',

  /** Gemini Flash Image for image generation (unchanged) */
  GEMINI_FLASH_IMAGE: 'google/gemini-2.5-flash-image',

  /** @deprecated Use GLM_4_6 instead */
  KIMI_K2: 'moonshotai/kimi-k2-thinking',
} as const;

/** Model capabilities for documentation */
export const MODEL_INFO = {
  GLM_4_6: {
    description: 'High-quality reasoning model for chat and artifacts',
    concurrency: 5,
    supportsThinking: true,
    useCases: ['chat', 'artifacts', 'artifact-fix']
  },
  GLM_4_5: {
    description: 'Fast model for simple tasks',
    concurrency: 10,
    supportsThinking: true, // Available but not used
    useCases: ['summaries', 'titles']
  }
} as const;
```

---

### Phase 2: Extend GLM Client

**File**: `supabase/functions/_shared/glm-client.ts`

**Add model parameter**:
```typescript
export interface CallGLMOptions {
  model?: string; // NEW: Allow model selection (default: GLM_4_6)
  temperature?: number;
  max_tokens?: number;
  requestId?: string;
  enableThinking?: boolean;
  stream?: boolean;
  // ... existing options
}

export async function callGLM(
  systemPrompt: string,
  userPrompt: string,
  options?: CallGLMOptions
): Promise<Response> {
  const {
    model = MODELS.GLM_4_6, // Default to GLM-4.6
    temperature = 1.0,
    max_tokens = 8000,
    requestId = crypto.randomUUID(),
    enableThinking = true,
    stream = false
  } = options || {};

  // Extract model name (e.g., "zhipu/glm-4.6" → "glm-4.6")
  const modelName = model.includes('/') ? model.split('/').pop() : model;

  console.log(`[${requestId}] 🤖 Calling ${modelName} via Z.ai (thinking: ${enableThinking}, stream: ${stream})`);

  return fetch(`${GLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GLM_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature,
      max_tokens,
      stream,
      thinking: enableThinking ? { type: "enabled" } : { type: "disabled" }
    })
  });
}

/** Convenience wrapper for GLM-4.5 (fast tasks without thinking) */
export function callGLM45(
  systemPrompt: string,
  userPrompt: string,
  options?: Omit<CallGLMOptions, 'model' | 'enableThinking'>
): Promise<Response> {
  return callGLM(systemPrompt, userPrompt, {
    ...options,
    model: MODELS.GLM_4_5,
    enableThinking: false // Fast mode
  });
}
```

---

### Phase 3: Migrate Chat to GLM-4.6 (with Gemini Fallback)

**File**: `supabase/functions/chat/index.ts`

**Key Changes**:
1. Try GLM-4.6 first with native thinking
2. If GLM fails → fallback to Gemini (no reasoning)
3. Keep both OpenRouter and GLM clients

**Before** (OpenRouter + fake reasoning):
```typescript
import { callOpenRouter } from '../_shared/openrouter-client.ts';
import { generateStructuredReasoning } from '../_shared/reasoning-generator.ts';

// Pre-generate reasoning (separate API call)
const reasoning = await generateStructuredReasoning(userMessage, history);

// Call OpenRouter for response
const response = await callOpenRouter(messages);

// Stream with fake delays
return createStreamingResponse(response, reasoning, ...);
```

**After** (GLM-4.6 primary + Gemini fallback):
```typescript
import { callGLM, processGLMStream } from '../_shared/glm-client.ts';
import { callOpenRouter } from '../_shared/openrouter-client.ts';  // Keep for fallback
import { parseReasoningIncrementally, createIncrementalParseState } from '../_shared/glm-reasoning-parser.ts';

async function handleStreamingChat(
  systemPrompt: string,
  userPrompt: string,
  requestId: string,
  corsHeaders: Record<string, string>,
  rateLimitHeaders: Record<string, string>
): Promise<Response> {

  try {
    // PRIMARY: Try GLM-4.6 with native thinking
    const glmResponse = await callGLM(systemPrompt, userPrompt, {
      model: MODELS.GLM_4_6,
      enableThinking: true,
      stream: true,
      requestId
    });

    if (!glmResponse.ok) {
      const errorText = await glmResponse.text();
      throw new Error(`GLM ${glmResponse.status}: ${errorText}`);
    }

    console.log(`[${requestId}] ✅ GLM-4.6 responded, streaming with reasoning`);
    return processGLMChatStream(glmResponse, requestId, corsHeaders, rateLimitHeaders);

  } catch (glmError) {
    // FALLBACK: Use Gemini without reasoning
    console.warn(`[${requestId}] ⚠️ GLM failed, falling back to Gemini:`, glmError);

    const geminiResponse = await callOpenRouter(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { model: MODELS.GEMINI_FLASH, stream: true }
    );

    console.log(`[${requestId}] 🔄 Using Gemini fallback (no reasoning)`);

    // Pass through Gemini stream without reasoning events
    return new Response(geminiResponse.body, {
      headers: {
        ...corsHeaders,
        ...rateLimitHeaders,
        "Content-Type": "text/event-stream",
        "X-Request-ID": requestId,
        "X-Fallback": "gemini"  // Header indicates fallback was used
      }
    });
  }
}
```

**File**: `supabase/functions/chat/handlers/streaming.ts`

**New function** (replaces `createStreamTransformer`):
```typescript
export async function processGLMChatStream(
  glmResponse: Response,
  requestId: string,
  corsHeaders: Record<string, string>,
  rateLimitHeaders: Record<string, string>
): Promise<Response> {
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const sendEvent = async (event: string, data: unknown) => {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  };

  // Process GLM stream in background
  (async () => {
    try {
      let incrementalState = createIncrementalParseState();
      let fullReasoning = "";
      const accumulatedSteps: ReasoningStep[] = [];

      await processGLMStream(glmResponse, {
        onReasoningChunk: async (chunk) => {
          fullReasoning += chunk;

          // Incrementally detect reasoning steps (same as artifact mode)
          const result = parseReasoningIncrementally(fullReasoning, incrementalState);
          incrementalState = result.state;

          if (result.newStep) {
            accumulatedSteps.push(result.newStep);
            await sendEvent("reasoning_step", {
              step: result.newStep,
              stepIndex: accumulatedSteps.length - 1,
              currentThinking: result.currentThinking,
              timestamp: Date.now()
            });
          } else if (fullReasoning.length % 200 < chunk.length) {
            await sendEvent("thinking_update", {
              currentThinking: result.currentThinking,
              progress: Math.min(45, 5 + (fullReasoning.length / 100))
            });
          }
        },

        onContentChunk: async (chunk) => {
          // Send as OpenRouter-compatible format for frontend compatibility
          await writer.write(encoder.encode(`data: ${JSON.stringify({
            choices: [{ delta: { content: chunk } }]
          })}\n\n`));
        },

        onComplete: async (reasoning, _content) => {
          if (reasoning) {
            const finalSteps = parseGLMReasoningToStructured(reasoning);
            await sendEvent("reasoning_complete", {
              reasoning,
              reasoningSteps: finalSteps,
              stepCount: accumulatedSteps.length,
              timestamp: Date.now()
            });
          }
          await writer.write(encoder.encode("data: [DONE]\n\n"));
          await writer.close();
        },

        onError: async (error) => {
          await sendEvent("error", { error: error.message, requestId });
          await writer.close();
        }
      }, requestId);
    } catch (error) {
      console.error(`[${requestId}] GLM stream error:`, error);
      try { await writer.close(); } catch {}
    }
  })();

  return new Response(readable, {
    headers: {
      ...corsHeaders,
      ...rateLimitHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Request-ID": requestId
    }
  });
}
```

---

### Phase 4: Migrate Summary/Title to GLM-4.5

**File**: `supabase/functions/generate-title/index.ts`

**Before**:
```typescript
import { callOpenRouter } from '../_shared/openrouter-client.ts';

const response = await callOpenRouter([
  { role: 'user', content: titlePrompt }
], { model: MODELS.GEMINI_FLASH });
```

**After**:
```typescript
import { callGLM45, extractTextFromGLM } from '../_shared/glm-client.ts';

const response = await callGLM45(
  'Generate a brief, descriptive title for this conversation (max 50 chars).',
  titlePrompt,
  { temperature: 0.5, max_tokens: 50, requestId }
);

const data = await response.json();
const title = extractTextFromGLM(data, requestId);
```

**File**: `supabase/functions/summarize-conversation/index.ts`

**Same pattern**: Replace OpenRouter with `callGLM45()`.

---

### Phase 5: Deprecate Reasoning Generator (Keep for Reference)

**File**: `supabase/functions/_shared/reasoning-generator.ts`

**Action**: Mark as deprecated but **keep the file** for:
1. Reference during migration
2. Potential future edge cases
3. Fallback Gemini mode doesn't need it (no reasoning shown)

**Changes**:
```typescript
/**
 * @deprecated GLM-4.6 provides native reasoning via `reasoning_content`.
 * This file is kept for reference only. Do not use for new code.
 * Will be deleted after migration is stable (2+ weeks).
 */

// Add deprecation warning at runtime
export function generateStructuredReasoning(...) {
  console.warn('[DEPRECATED] generateStructuredReasoning called - use GLM native thinking instead');
  // ... existing code
}
```

**Recommendation**: Keep file, add deprecation warnings. Delete after migration is proven stable.

---

### Phase 6: Update Rate Limiting

**File**: `supabase/functions/_shared/config.ts`

**Update throttle for unified GLM usage**:
```typescript
export const RATE_LIMITS = {
  // ... existing guest/auth limits ...

  /** GLM model-specific throttling */
  GLM: {
    /** GLM-4.6 throttle (concurrency: 5) - for chat AND artifacts */
    GLM_4_6: {
      MAX_REQUESTS: getEnvInt('RATE_LIMIT_GLM_46_MAX', 5, 1),
      WINDOW_SECONDS: getEnvInt('RATE_LIMIT_GLM_46_WINDOW', 60, 1)
    },
    /** GLM-4.5 throttle (concurrency: 10) - for summaries/titles */
    GLM_4_5: {
      MAX_REQUESTS: getEnvInt('RATE_LIMIT_GLM_45_MAX', 10, 1),
      WINDOW_SECONDS: getEnvInt('RATE_LIMIT_GLM_45_WINDOW', 60, 1)
    }
  }
} as const;
```

**Note**: Chat + Artifact now share GLM-4.6 quota (5 concurrent). May need monitoring.

---

### Phase 7: Keep OpenRouter for Fallback

**Files to modify**:

| File | Action |
|------|--------|
| `supabase/functions/chat/index.ts` | Keep OpenRouter for fallback |
| `supabase/functions/chat/handlers/streaming.ts` | Keep `createStreamTransformer` for fallback |
| `supabase/functions/generate-title/index.ts` | Use GLM-4.5 (no fallback needed - titles aren't critical) |
| `supabase/functions/summarize-conversation/index.ts` | Use GLM-4.5 (no fallback needed) |
| `supabase/functions/_shared/reasoning-generator.ts` | Mark deprecated, keep for reference |
| `supabase/functions/_shared/openrouter-client.ts` | **Keep** for chat fallback + image gen |

**Environment variables**:
- `OPENROUTER_GEMINI_FLASH_KEY` - Keep for chat fallback + image generation
- `GLM_API_KEY` - Primary key for all text generation

---

### Phase 8: Frontend - No Changes Needed

The frontend already handles both event formats:

```typescript
// Both chat and artifact emit these events:
{ type: "reasoning_step", step, stepIndex, currentThinking, timestamp }
{ type: "thinking_update", currentThinking, progress }
{ type: "reasoning_complete", reasoning, reasoningSteps, stepCount, timestamp }

// Content in OpenRouter-compatible format:
data: {"choices":[{"delta":{"content":"..."}}]}
```

**Files**: `src/hooks/useChatMessages.tsx`, `src/components/ReasoningDisplay.tsx`

**Status**: No changes required - already supports unified format.

---

## Testing Strategy

### Unit Tests
- [ ] `callGLM()` with model parameter works
- [ ] `callGLM45()` disables thinking
- [ ] `processGLMChatStream()` emits correct events
- [ ] Rate limiting respects new GLM limits

### Integration Tests
- [ ] Chat flow end-to-end with GLM-4.6
- [ ] Artifact flow unchanged
- [ ] Title generation with GLM-4.5
- [ ] Summary generation with GLM-4.5

### Manual Testing
- [ ] Reasoning display identical for chat and artifact
- [ ] No visible difference in UX
- [ ] Performance acceptable (latency, concurrency)

---

## Files Summary

### Deprecate (Keep for Now)
| File | Reason |
|------|--------|
| `_shared/reasoning-generator.ts` | Keep for reference, delete after 2 weeks stable |

### Modify
| File | Changes |
|------|---------|
| `_shared/config.ts` | Add GLM-4.5, update rate limits |
| `_shared/glm-client.ts` | Add model param, `callGLM45()` |
| `chat/index.ts` | Add GLM-4.6 primary + Gemini fallback |
| `chat/handlers/streaming.ts` | Add `processGLMChatStream()`, keep `createStreamTransformer` |
| `generate-title/index.ts` | Use GLM-4.5 |
| `summarize-conversation/index.ts` | Use GLM-4.5 |

### Keep (Active Use)
| File | Reason |
|------|--------|
| `_shared/openrouter-client.ts` | Gemini fallback for chat + image generation |

---

## Rate Limiter Architecture (Detailed)

### Current Rate Limiter Layers

The system has **3 layers** of rate limiting:

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 1: Guest Rate Limits               │
│  Per-IP tracking for unauthenticated users                  │
│  Table: guest_rate_limits                                   │
│  Window: 5 hours, Default: 20 requests (chat)               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 LAYER 2: Authenticated Rate Limits          │
│  Per-user tracking for logged-in users                      │
│  Enforced via JWT + user_id                                 │
│  Window: 5 hours, Default: 100 requests (chat)              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   LAYER 3: API Throttle                     │
│  Per-model global throttle to protect provider limits       │
│  Table: api_throttle_state                                  │
│  Window: 60 seconds                                         │
└─────────────────────────────────────────────────────────────┘
```

### Rate Limiter Configuration (`config.ts`)

```typescript
export const RATE_LIMITS = {
  // Layer 1: Guest limits
  GUEST: {
    MAX_REQUESTS: 20,    // Per 5-hour window
    WINDOW_HOURS: 5
  },

  // Layer 2: Authenticated limits
  AUTHENTICATED: {
    MAX_REQUESTS: 100,   // Per 5-hour window
    WINDOW_HOURS: 5
  },

  // Layer 3: API throttle (per-model)
  API_THROTTLE: {
    GEMINI_RPM: 15,      // Requests per minute
    WINDOW_SECONDS: 60
  },

  // Artifact-specific (shares guest_rate_limits table but different max)
  ARTIFACT: {
    GUEST: { MAX_REQUESTS: 5, WINDOW_HOURS: 5 },
    AUTHENTICATED: { MAX_REQUESTS: 50, WINDOW_HOURS: 5 }
  }
};
```

### Rate Limiter Implementation (`rate-limiter.ts`)

```typescript
// Key functions:

// 1. checkGuestRateLimit(ip: string, endpoint: string)
//    - Queries guest_rate_limits table by IP + endpoint
//    - Returns { allowed: boolean, remaining: number, resetAt: Date }

// 2. checkAuthenticatedRateLimit(userId: string, endpoint: string)
//    - Uses userId from JWT token
//    - Higher limits than guest

// 3. checkApiThrottle(model: string)
//    - Global throttle across all users
//    - Protects upstream API from exceeding their limits
```

### Changes Needed for GLM Migration

**Before** (separate throttles):
```typescript
RATE_LIMITS = {
  API_THROTTLE: { GEMINI_RPM: 15 },           // Chat uses this
  ARTIFACT: { API_THROTTLE: { MAX_REQUESTS: 10 } }  // Artifacts use this
}
```

**After** (unified GLM throttle):
```typescript
RATE_LIMITS = {
  GLM: {
    // Combined chat + artifact throttle
    GLM_4_6: { MAX_REQUESTS: 5, WINDOW_SECONDS: 60 },  // Matches Z.ai limit
    GLM_4_5: { MAX_REQUESTS: 10, WINDOW_SECONDS: 60 }  // Summaries/titles
  }
}
```

**Key Point**: Chat and artifacts now share the same GLM-4.6 throttle bucket. For a demo project, this is acceptable.

---

## SSE Reasoning Compatibility (Detailed)

### What is SSE?

**Server-Sent Events (SSE)** is a one-way streaming protocol where the server pushes events to the client over a persistent HTTP connection.

```
Client ──────────────────> Server (HTTP Request)
Client <══════════════════ Server (SSE Events stream back)
         event: reasoning_step
         data: {"step":{"phase":"analysis"...}}

         event: content
         data: {"choices":[{"delta":{"content":"Hello"}}]}

         data: [DONE]
```

### Current SSE Event Types

**Artifact mode** (`generate-artifact/index.ts`) emits:
```typescript
// 1. Reasoning step detected (incremental)
{ type: "reasoning_step", step: ReasoningStep, stepIndex: number, currentThinking: string }

// 2. Thinking progress update
{ type: "thinking_update", currentThinking: string, progress: number }

// 3. Reasoning complete (final summary)
{ type: "reasoning_complete", reasoning: string, reasoningSteps: StructuredReasoning }

// 4. Content chunks (OpenRouter-compatible format)
data: {"choices":[{"delta":{"content":"..."}}]}

// 5. Stream end
data: [DONE]
```

**Chat mode** (current - `streaming.ts`) emits:
```typescript
// Pre-generated reasoning with fake delays
{ type: "reasoning_step", step, stepIndex, currentThinking, timestamp }
{ type: "reasoning_complete", reasoning, reasoningSteps, stepCount, timestamp }

// Then OpenRouter content
data: {"choices":[{"delta":{"content":"..."}}]}
data: [DONE]
```

### SSE Compatibility Matrix

| Event Type | GLM Source | Gemini Source | Frontend Handler |
|------------|------------|---------------|------------------|
| `reasoning_step` | `delta.reasoning_content` parsed | ❌ Not available | `ReasoningDisplay.tsx` |
| `thinking_update` | Periodic updates from reasoning | ❌ Not available | `ReasoningDisplay.tsx` |
| `reasoning_complete` | Final `reasoning_content` | ❌ Not available | Saves to DB |
| Content chunks | `delta.content` | `delta.content` | `ChatMessage.tsx` |

### Why GLM and Gemini Are NOT Directly Compatible

**GLM-4.6 streaming** has TWO phases:
```
Phase 1: reasoning_content chunks (multiple)
Phase 2: content chunks (multiple)
[DONE]
```

**Gemini/OpenRouter streaming** has ONE phase:
```
Phase 1: content chunks only
[DONE]
```

**The frontend expects the same event structure from both chat and artifact**. If we fall back to Gemini:
- No `reasoning_step` events → ticker stays empty
- No `thinking_update` events → no progress shown
- No `reasoning_complete` event → nothing saved to DB for reasoning

### Fallback Implementation (Simple Approach)

```typescript
async function handleChatRequest(request: Request): Promise<Response> {
  try {
    // Try GLM-4.6 first (with reasoning)
    const glmResponse = await callGLM(systemPrompt, userMessage, {
      enableThinking: true,
      stream: true
    });

    if (!glmResponse.ok) {
      throw new Error(`GLM failed: ${glmResponse.status}`);
    }

    // Success: stream GLM response with reasoning
    return streamGLMWithReasoning(glmResponse);

  } catch (error) {
    console.warn('[chat] GLM failed, falling back to Gemini:', error);

    // Fallback: use Gemini WITHOUT reasoning
    const geminiResponse = await callOpenRouter(messages, {
      model: MODELS.GEMINI_FLASH
    });

    // Stream content only (no reasoning events)
    return streamGeminiContentOnly(geminiResponse);
  }
}

function streamGeminiContentOnly(response: Response): Response {
  // Just pass through the OpenRouter SSE stream
  // No reasoning_step, thinking_update, or reasoning_complete events
  // Frontend handles this gracefully (ticker simply doesn't appear)
  return new Response(response.body, {
    headers: { "Content-Type": "text/event-stream" }
  });
}
```

### Frontend Handling (Already Implemented)

The frontend in `useChatMessages.tsx` already handles missing reasoning gracefully:

```typescript
// If no reasoning events arrive, ticker simply doesn't show
const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);

// In SSE handler:
if (data.type === 'reasoning_step') {
  setReasoningSteps(prev => [...prev, data.step]);
}

// ReasoningDisplay only renders if steps exist:
{reasoningSteps.length > 0 && <ReasoningDisplay steps={reasoningSteps} />}
```

**No code changes needed** — the UI degrades gracefully when reasoning is unavailable.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Z.ai API downtime | Low | Medium | Gemini fallback (no reasoning) |
| GLM-4.6 slower than Gemini | Low | Low | Acceptable for demo project |
| Quality regression | Low | Medium | Test thoroughly before deploy |

**Note**: Concurrency limits removed from risk table — not a concern for demo project.

---

## Rollback Plan

**Simple Gemini fallback** is built into the implementation:

1. If GLM returns non-2xx → immediate Gemini fallback
2. If GLM times out (30s) → Gemini fallback
3. User gets response (just without reasoning ticker)

**Full rollback** (if needed):
1. Revert PR
2. Redeploy previous version

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Chat reasoning quality | Same or better than current |
| Reasoning UX consistency | Chat identical to artifact |
| Chat latency P95 | < 5s (first token) |
| Error rate | < 1% |
| Concurrency issues | < 0.5% of requests |

---

## Timeline

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Config | 30 min | None |
| Phase 2: GLM Client | 1 hour | Phase 1 |
| Phase 3: Chat Migration | 3 hours | Phase 2 |
| Phase 4: Summary/Title | 1 hour | Phase 2 |
| Phase 5: Remove Reasoning Gen | 30 min | Phase 3 |
| Phase 6: Rate Limits | 30 min | Phase 1 |
| Phase 7: Remove OpenRouter | 1 hour | Phase 3-5 |
| Phase 8: Frontend Verify | 30 min | Phase 3 |
| Testing | 2 hours | All |
| **Total** | **~10 hours** | |

---

## Appendix: Z.ai API Reference

### Chat Completions Endpoint
```
POST https://api.z.ai/api/coding/paas/v4/chat/completions

Headers:
  Authorization: Bearer {GLM_API_KEY}
  Content-Type: application/json

Body:
{
  "model": "glm-4.6" | "glm-4.5",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "temperature": 0.0-1.0,
  "max_tokens": number,
  "stream": boolean,
  "thinking": { "type": "enabled" | "disabled" }
}
```

### Streaming Response Format
```
// Reasoning chunks (when thinking enabled)
data: {"choices":[{"delta":{"reasoning_content":"thinking..."}}]}
data: {"choices":[{"delta":{"reasoning_content":"more thinking..."}}]}

// Content chunks (after reasoning)
data: {"choices":[{"delta":{"content":"response text..."}}]}
data: {"choices":[{"delta":{"content":"more response..."}}]}

// End marker
data: [DONE]
```

### Non-Streaming Response
```json
{
  "choices": [{
    "message": {
      "content": "Full response text...",
      "reasoning_content": "Full thinking process..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 500,
    "total_tokens": 600
  }
}
```

---

**Plan Created**: 2025-12-01
**Updated**: 2025-12-01 (v2: Simple Gemini fallback, detailed rate limiter + SSE docs)
**Author**: Claude Code
**Status**: Ready for Implementation

## Key Changes in v2

1. **Gemini Fallback Added**: If GLM fails → use Gemini WITHOUT reasoning (simple, no complexity)
2. **Rate Limiter Details**: Added full 3-layer architecture documentation
3. **SSE Compatibility**: Detailed event types, compatibility matrix, and why fallback works
4. **Concurrency De-emphasized**: Demo project context - limits aren't a primary concern
5. **Files Preserved**: OpenRouter client + reasoning generator kept for fallback/reference
