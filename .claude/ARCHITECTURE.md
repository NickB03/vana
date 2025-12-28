# System Architecture

## Overview

**Vana** is an AI chat application built with a modern, scalable architecture that combines:
- **Frontend**: React 18.3.1 + TypeScript + Vite + Tailwind + shadcn/ui
- **Backend**: Supabase Edge Functions (Deno runtime)
- **AI Models**: Multi-provider strategy via OpenRouter and Z.ai
- **Real-time**: Server-Sent Events (SSE) for streaming responses

## Model Configuration

All AI operations use the multi-model orchestration system for optimal cost/performance balance:

| Function | Model | Provider | Rationale |
|----------|-------|----------|-----------|
| Chat/Summaries/Titles | Gemini 2.5 Flash Lite | OpenRouter | Fast, unlimited, cost-effective |
| Artifact Generation | GLM-4.6 | Z.ai API | Thinking mode, structured output |
| Artifact Error Fixing | GLM-4.6 | Z.ai API | Deep reasoning for debugging |
| Image Generation | Gemini 2.5 Flash Image | OpenRouter | High-quality image synthesis |

**Model Constants**: All model names are defined in `supabase/functions/_shared/config.ts` as `MODELS.*` constants. **Never hardcode model names** — this causes CI/CD failures.

## Edge Function Decision Tree

Route requests to the appropriate Edge Function based on the scenario:

| Scenario | Function | Model Used |
|----------|----------|------------|
| User sends chat message | `chat/` | Gemini Flash Lite |
| User requests artifact | Tool-calling via `chat/` → `generate_artifact` | GLM-4.6 |
| Artifact has errors | Tool-calling via `chat/` → `generate_artifact_fix` | GLM-4.6 |
| First message in session | `generate-title/` | Gemini Flash Lite |
| User requests image | Tool-calling via `chat/` → `generate_image` | Gemini Flash Image |
| Conversation exceeds context | `summarize-conversation/` | Gemini Flash Lite |
| Artifact needs npm packages | `bundle-artifact/` | N/A (esbuild bundler) |
| Health/uptime monitoring | `health/` | N/A (status check) |

## Status Update System

The system provides real-time progress updates during artifact generation using **ReasoningProvider**:

### ReasoningProvider Architecture

**Purpose**: Generate semantic, contextual status messages during artifact creation by analyzing GLM-4.6 reasoning output.

**Model**: GLM-4.5-Air (via Z.ai Coding API)
- Ultra-fast semantic status generation (200-500ms response time)
- Configuration: `max_tokens: 50`, `temperature: 0.3`, thinking mode disabled
- Security: Input sanitized via `PromptInjectionDefense.sanitizeArtifactContext()`

**Location**: `supabase/functions/_shared/reasoning-provider.ts`

### Flow Diagram

```
GLM-4.6 Reasoning Stream
    ↓
Buffer Chunks (200-800 chars)
    ↓
Phase Detection (keyword matching)
    ↓
Circuit Breaker Check
    ├─ OPEN → Fallback Templates
    └─ CLOSED → GLM-4.5-Air Call
        ├─ Success → Semantic Status (SSE: reasoning_status)
        └─ Failure → Fallback Templates + Record Failure
```

### Core Components

**Classes**:
- `ReasoningProvider` — Main provider implementation
- `GLMClient` — LLM client for status generation
- `createReasoningProvider()` — Factory function with sensible defaults
- `createNoOpReasoningProvider()` — No-op provider for testing/disabled scenarios

**SSE Events**:
- `reasoning_status` — Regular status update (LLM or template)
- `reasoning_final` — Final summary on artifact completion
- `reasoning_heartbeat` — Idle keepalive during long operations
- `reasoning_error` — Error notification (currently unused)

### Phase Detection Algorithm

**Phases**: `analyzing` → `planning` → `implementing` → `styling` → `finalizing`

**Detection Logic**:
1. Scan buffered text for phase keywords (case-insensitive)
2. Score each phase based on keyword matches
3. Select highest-scoring phase if score ≥ 2 (strong signal required)
4. Otherwise, retain current phase (prevents flicker)

**Keywords**:
```typescript
analyzing: ['understand', 'analyze', 'consider', 'examine', 'requirement', ...]
planning: ['plan', 'design', 'architect', 'structure', 'component', ...]
implementing: ['implement', 'build', 'create', 'code', 'function', ...]
styling: ['style', 'css', 'tailwind', 'color', 'responsive', ...]
finalizing: ['final', 'finish', 'complete', 'polish', 'optimize', ...]
```

### Circuit Breaker Pattern

**Purpose**: Prevent cascading failures when LLM becomes unreliable

**States**: `CLOSED` (normal) → `OPEN` (tripped) → `HALF_OPEN` (testing) → `CLOSED`

**Thresholds**:
- **Failure Threshold**: 3 consecutive failures
- **Cooldown Duration**: 30 seconds
- **Reset Condition**: Single successful LLM call closes circuit

**Failure Criteria**:
- LLM request timeout (5s default)
- API errors (non-200 status codes)
- Invalid/empty responses
- Suspicious output patterns (SQL injection, XSS attempts)

**Behavior**:
- **CLOSED**: Normal operation, calls LLM for status generation
- **OPEN**: All requests bypass LLM, use fallback templates immediately
- **HALF_OPEN**: After cooldown, attempt single LLM call to test recovery
- **Auto-Reset**: Successful call resets failure counter and closes circuit

### Buffering Strategy

**Purpose**: Balance API cost vs. update freshness

**Thresholds**:
- **minBufferChars**: 200 characters (triggers flush when reached)
- **maxBufferChars**: 800 characters (forces flush regardless of time)
- **maxWaitMs**: 4,000ms (forces flush if no new chunks received)

**Flush Logic**:
1. Check anti-flicker cooldown (1,200ms minimum between updates)
2. Verify pending call limit (max 5 concurrent LLM requests)
3. Check circuit breaker state
4. Call LLM or fallback to templates
5. Clear buffer after processing

### Anti-Flicker Cooldown

**Purpose**: Prevent rapid status changes that create poor UX

**Mechanism**:
- Minimum 1,200ms between status emissions
- If flush requested during cooldown, schedule for end of cooldown period
- Cooldown timer resets on every successful emission

**Example**:
```
Time 0ms:   Emit status "Analyzing requirements..."
Time 500ms: Flush requested → scheduled for 1200ms
Time 1200ms: Emit next status "Planning architecture..."
```

### Idle Heartbeat

**Purpose**: Show progress during long operations without new reasoning chunks

**Mechanism**:
- **Interval**: 8,000ms (8 seconds)
- **Trigger**: No new chunks received AND no pending LLM calls
- **Event Type**: `reasoning_heartbeat` (distinct from `reasoning_status`)
- **Message**: First template message from current phase

### Template Fallback System

**Trigger Conditions**:
- Circuit breaker is OPEN
- LLM call fails or times out
- Max pending calls reached
- No GLM_API_KEY configured

**Template Structure**:
```typescript
const phaseTemplates = {
  analyzing: ["Analyzing requirements...", "Understanding the context...", "Evaluating approach..."],
  planning: ["Designing the architecture...", "Planning component structure...", "Outlining implementation strategy..."],
  implementing: ["Building core functionality...", "Implementing features...", "Writing application logic..."],
  styling: ["Adding visual polish...", "Styling components...", "Refining the interface..."],
  finalizing: ["Finalizing implementation...", "Adding final touches...", "Completing the artifact..."],
};
```

**Message Rotation**: Cycles through templates sequentially (prevents repetition within same phase)

### Configuration

**Default Config**:
```typescript
{
  minBufferChars: 200,
  maxBufferChars: 800,
  maxWaitMs: 4000,
  minUpdateIntervalMs: 1200,
  maxPendingCalls: 5,
  timeoutMs: 5000,
  idleHeartbeatMs: 8000,
  circuitBreakerThreshold: 3,
  circuitBreakerResetMs: 30000,
}
```

**Environment Variables**:
- `USE_REASONING_PROVIDER`: Enable/disable provider (default: `true`)
- `GLM_API_KEY`: Z.ai API key (required for LLM-powered status)

### Lifecycle Management

**1. Initialization**:
```typescript
const provider = createReasoningProvider(requestId, async (event) => {
  writer.write(`data: ${JSON.stringify(event)}\n\n`);
});
```

**2. Start**:
```typescript
await provider.start();
// Emits initial "Analyzing your request..." status
// Starts idle heartbeat timer
```

**3. Process Chunks**:
```typescript
provider.processReasoningChunk('Analyzing user requirements...');
// Buffers text, detects phase, flushes when threshold reached
```

**4. Manual Phase Change**:
```typescript
await provider.setPhase('implementing');
// Emits immediate status update with new phase context
```

**5. Finalize**:
```typescript
await provider.finalize('a calculator app');
// Generates final summary via LLM (or fallback)
// Emits reasoning_final event
// Automatically calls destroy()
```

**6. Destroy**:
```typescript
provider.destroy();
// Clears all timers (flush, heartbeat)
// Marks provider as destroyed (ignores subsequent calls)
```

### Integration Points

**Used By**:
- `supabase/functions/chat/handlers/tool-calling-chat.ts`
  - Initializes provider when `USE_REASONING_PROVIDER=true`
  - Processes reasoning chunks during streaming to generate semantic status updates
  - Finalizes on artifact completion

**Dependencies**:
- `GLMClient` → Z.ai Coding API (GLM-4.5-Air model)
- `PromptInjectionDefense` → Input sanitization and output validation
- `MODELS.GLM_4_5_AIR` → Model name constant from `config.ts`

### Code Examples

**Basic Usage**:
```typescript
import { createReasoningProvider } from './_shared/reasoning-provider.ts';

const provider = createReasoningProvider('req_123', async (event) => {
  // Emit SSE event to client
  writer.write(`data: ${JSON.stringify(event)}\n\n`);
});

await provider.start();

// Process streaming reasoning
for await (const chunk of reasoningStream) {
  await provider.processReasoningChunk(chunk);
}

// Finalize with artifact description
await provider.finalize('a todo list app with dark mode');
// Automatically calls destroy()
```

**Custom Configuration**:
```typescript
const provider = createReasoningProvider('req_123', eventCallback, {
  config: {
    minBufferChars: 300,        // More patient before flushing
    circuitBreakerThreshold: 5, // More tolerant of failures
  },
  phaseConfig: {
    implementing: {
      name: 'Building',
      messages: ['Coding the app...', 'Writing features...'],
    },
  },
});
```

**Circuit Breaker State Monitoring**:
```typescript
const state = provider.getState();
if (state.circuitBreaker.isOpen) {
  console.warn('Circuit breaker tripped, using fallback templates');
}
```

### Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| No status updates | `USE_REASONING_PROVIDER=false` | Set to `true` or omit (defaults to `true`) |
| Circuit breaker stuck OPEN | Repeated LLM failures | Check GLM_API_KEY, network connectivity, Z.ai API status |
| Rapid status flicker | Anti-flicker cooldown too short | Increase `minUpdateIntervalMs` (default 1200ms) |
| Stale status messages | Buffer thresholds too high | Decrease `maxWaitMs` or `minBufferChars` |
| "Empty response from GLM" | Invalid API response format | Check Z.ai API changes, validate response structure |
| Memory leak | Provider not destroyed | Always call `destroy()` or use `finalize()` (auto-destroys) |

### Migration Guide (December 2025)

**Breaking Change**: Removed legacy `[STATUS:]` marker system.

**If you previously set `USE_REASONING_PROVIDER=false`:**
- **Before**: System fell back to regex-based status markers
- **After**: No status updates shown (displays "Thinking..." only)
- **Action**: Remove `USE_REASONING_PROVIDER=false` environment variable to re-enable status updates

**Why this change**: ReasoningProvider is now the sole status update system with built-in template fallback via circuit breaker.

## Smart Context Management

Token-aware context windowing system that optimizes conversation history for AI models:

**Components** (`_shared/`):
- `context-selector.ts` — Main orchestrator for context selection
- `context-ranker.ts` — Scores messages by importance/recency
- `token-counter.ts` — Accurate token counting for context budgets

**Features**:
- Dynamic context window sizing based on model limits
- Message importance ranking (recent > artifact-related > conversational)
- Graceful degradation when context exceeds budget
- Guest session support for artifact bundling

## Prebuilt Bundle System

Optimizes artifact loading by using pre-bundled common dependencies instead of runtime fetching:

**Location**: `supabase/functions/_shared/prebuilt-bundles.ts`, `scripts/build-prebuilt-bundles.ts`

**Features**:
- **O(1) Package Lookup**: Hash map provides instant package access
- **Version Compatibility**: Supports exact matches, caret ranges (^2.0.0), tilde ranges (~2.5.0), and latest
- **Phased Rollout**: 70+ packages across four phases
  - Phase 1: State management, forms, UI essentials, animation
  - Phase 2: Data visualization - flowcharts, Nivo charts, Chart.js
  - Phase 3: Games & interactive - Konva, physics, GSAP, audio, drag-drop
  - Phase 4: 3D & WebGL - Three.js, React Three Fiber, Drei, React Three Postprocessing
- **5-10x Faster Loading**: Eliminates CDN round-trips for common packages
- **Smart Bundling**: Pure packages use `?bundle` for single-file optimization, React packages use standard URLs

**Usage**:
```typescript
import { getPrebuiltBundles } from './prebuilt-bundles.ts';
const { prebuilt, remaining, stats } = getPrebuiltBundles(dependencies);
```

## CDN Fallback Strategy

**Location**: `supabase/functions/_shared/cdn-fallback.ts`

Provides resilient multi-CDN strategy for ESM package loading with automatic failover:

**Features**:
- **Multi-Provider Fallback**: esm.sh → esm.run → jsdelivr (3-second timeout per provider)
- **Parallel Verification**: Checks all CDNs simultaneously, returns fastest successful
- **Health Monitoring**: Tracks CDN availability with detailed logging
- **React Externalization**: Proper `?external=react,react-dom` handling where supported

**Usage**:
```typescript
import { getWorkingCdnUrl } from './cdn-fallback.ts';

const result = await getWorkingCdnUrl('lodash', '4.17.21', requestId);
if (result) {
  console.log(`Using ${result.provider}: ${result.url}`);
}
```
