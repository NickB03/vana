# ReasoningProvider Activation Plan

> **Status**: Ready for Implementation
> **Created**: 2025-12-21
> **Estimated Time**: ~2 hours
> **Approach**: Direct replacement of marker-based system

## Overview

Replace the current `[STATUS:]` marker-based reasoning status system with the pre-built `ReasoningProvider` class that uses GLM-4.5-Air as a semantic summarization model.

### Current System (To Be Replaced)
- GLM-4.6 emits `[STATUS: action]` markers in reasoning text
- `parseStatusMarker()` extracts markers via regex
- Client-side `detectPhase()` uses regex to classify phases
- **Problems**: Relies on model following prompt instructions, fragile regex patterns

### New System (ReasoningProvider)
- GLM-4.6 streams raw reasoning content
- `ReasoningProvider` buffers chunks and calls GLM-4.5-Air for semantic summarization
- Server generates human-friendly status messages
- **Benefits**: Model-agnostic, semantic understanding, built-in fallback

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CURRENT SYSTEM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  GLM-4.6 Reasoning Stream                                           │
│  "[STATUS: analyzing] I need to understand..."                      │
│           │                                                          │
│           ▼                                                          │
│  parseStatusMarker() ──► regex extraction                           │
│           │                                                          │
│           ▼                                                          │
│  SSE: { type: 'reasoning_status', content: 'analyzing' }            │
│           │                                                          │
│           ▼                                                          │
│  Frontend detectPhase() ──► regex classification                    │
│           │                                                          │
│           ▼                                                          │
│  PHASE_MESSAGES['analyzing'] ──► "Analyzing the request..."         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

                              ▼ REPLACE WITH ▼

┌─────────────────────────────────────────────────────────────────────┐
│                          NEW SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  GLM-4.6 Reasoning Stream                                           │
│  "I need to understand what the user wants..."                      │
│           │                                                          │
│           ▼                                                          │
│  ReasoningProvider.processReasoningChunk()                          │
│           │                                                          │
│           ▼ (every 200-800 chars or 4s)                             │
│  GLM-4.5-Air ──► "Analyzing user requirements..."                   │
│           │                                                          │
│           ▼                                                          │
│  SSE: { type: 'reasoning_status', content: '...', source: 'llm' }   │
│           │                                                          │
│           ▼                                                          │
│  Frontend displays directly (no regex)                              │
│                                                                      │
│  Fallback: Phase templates if LLM fails (circuit breaker)           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

### Task 1: Security Fix - Prompt Injection Sanitization
**File**: `supabase/functions/_shared/reasoning-provider.ts`
**Priority**: P0 (Blocking)
**Effort**: 15 minutes

#### What to Change

Add import at top of file (after line 1):
```typescript
import { PromptInjectionDefense } from './prompt-injection-defense.ts';
```

Modify `GLMClient.generateStatus()` method (around line 498-516):

**BEFORE:**
```typescript
async generateStatus(
  reasoningText: string,
  phase: ThinkingPhase,
  requestId: string
): Promise<string> {
  const startTime = Date.now();

  const prompt = `You are a UI status generator. Given this AI reasoning text, write a SHORT status message (5-10 words) describing what the AI is currently doing.

Phase: ${phase}
Reasoning: ${reasoningText.slice(0, 500)}
```

**AFTER:**
```typescript
async generateStatus(
  reasoningText: string,
  phase: ThinkingPhase,
  requestId: string
): Promise<string> {
  const startTime = Date.now();

  // SECURITY: Sanitize reasoning text to prevent prompt injection
  const sanitizedReasoning = PromptInjectionDefense.sanitizeArtifactContext(
    reasoningText.slice(0, 500)
  );

  const prompt = `You are a UI status generator. Given this AI reasoning text, write a SHORT status message (5-10 words) describing what the AI is currently doing.

Phase: ${phase}
Reasoning: ${sanitizedReasoning}
```

Add output validation after getting response (around line 550-565):

**BEFORE:**
```typescript
const message = data.choices?.[0]?.message?.content?.trim();

if (!message) {
  // Debug: log the actual response structure to understand the format
  console.warn(`[ReasoningProvider:${requestId}] Unexpected GLM response:`, JSON.stringify(data).substring(0, 500));
  const error = new Error('Empty response from GLM') as LLMError;
```

**AFTER:**
```typescript
const message = data.choices?.[0]?.message?.content?.trim();

if (!message) {
  console.warn(`[ReasoningProvider:${requestId}] Unexpected GLM response:`, JSON.stringify(data).substring(0, 500));
  const error = new Error('Empty response from GLM') as LLMError;
  error.code = 'INVALID_RESPONSE';
  error.provider = 'z.ai';
  throw error;
}

// SECURITY: Validate output for suspicious patterns
const { suspicious } = PromptInjectionDefense.detectSuspiciousPatterns(message);
if (suspicious) {
  console.warn(`[ReasoningProvider:${requestId}] Suspicious status output detected: "${message}"`);
  const error = new Error('Invalid status output - using fallback') as LLMError;
  error.code = 'INVALID_RESPONSE';
  error.provider = 'z.ai';
  throw error;
}
```

Apply same sanitization to `generateFinalSummary()` method (around line 594):
```typescript
// SECURITY: Sanitize context before injection
const sanitizedHistory = PromptInjectionDefense.sanitizeArtifactContext(
  reasoningHistory.slice(-1000)
);

const prompt = `You are a UI status generator. Write a brief completion message (8-15 words) summarizing what was created.

Artifact: ${artifactDescription}
Context: ${sanitizedHistory}
```

---

### Task 2: Configuration Tuning
**File**: `supabase/functions/_shared/reasoning-provider.ts`
**Priority**: P2
**Effort**: 5 minutes

#### What to Change

Modify `DEFAULT_REASONING_CONFIG` (around line 171-181):

**BEFORE:**
```typescript
export const DEFAULT_REASONING_CONFIG: ReasoningConfig = {
  minBufferChars: 150,
  maxBufferChars: 500,
  maxWaitMs: 3000,
  minUpdateIntervalMs: 1500,
  maxPendingCalls: 3,
  timeoutMs: 2000,
  idleHeartbeatMs: 8000,
  circuitBreakerThreshold: 3,
  circuitBreakerResetMs: 30000,
};
```

**AFTER:**
```typescript
export const DEFAULT_REASONING_CONFIG: ReasoningConfig = {
  minBufferChars: 200,        // Reduced API call frequency (was 150)
  maxBufferChars: 800,        // Fewer flushes during long reasoning (was 500)
  maxWaitMs: 4000,            // More patient before forcing flush (was 3000)
  minUpdateIntervalMs: 1200,  // Faster UI updates (was 1500)
  maxPendingCalls: 5,         // More headroom for concurrent calls (was 3)
  timeoutMs: 5000,            // Less aggressive timeout (was 2000)
  idleHeartbeatMs: 8000,      // Keep as-is
  circuitBreakerThreshold: 3, // Keep as-is
  circuitBreakerResetMs: 30000, // Keep as-is
};
```

---

### Task 3: Fix Heartbeat Race Condition
**File**: `supabase/functions/_shared/reasoning-provider.ts`
**Priority**: P2
**Effort**: 5 minutes

#### What to Change

Modify heartbeat check logic (around line 1085-1101):

**BEFORE:**
```typescript
const checkIdle = async () => {
  if (this.state.destroyed) return;

  const idleTime = Date.now() - this.state.lastChunkTime;
  if (idleTime >= this.config.idleHeartbeatMs) {
    // Emit heartbeat
    await this.emitEvent({
      type: 'reasoning_heartbeat',
```

**AFTER:**
```typescript
const checkIdle = async () => {
  if (this.state.destroyed) return;

  const idleTime = Date.now() - this.state.lastChunkTime;
  // FIX: Don't emit heartbeat while LLM calls are pending (prevents flicker)
  if (idleTime >= this.config.idleHeartbeatMs && this.state.pendingCalls === 0) {
    // Emit heartbeat
    await this.emitEvent({
      type: 'reasoning_heartbeat',
```

---

### Task 4: Add Feature Flag
**File**: `supabase/functions/_shared/config.ts`
**Priority**: P1
**Effort**: 5 minutes

#### What to Add

Add after other feature flags (find appropriate section, likely near other env-based configs):

```typescript
// =============================================================================
// ReasoningProvider Feature Flag
// =============================================================================

/**
 * Enable ReasoningProvider for semantic status generation during artifact creation.
 * When enabled, uses GLM-4.5-Air to summarize reasoning into human-friendly status messages.
 * When disabled, falls back to [STATUS:] marker parsing (legacy system).
 *
 * Set via environment variable: USE_REASONING_PROVIDER=true
 * Default: true (enabled)
 */
export const USE_REASONING_PROVIDER = Deno.env.get('USE_REASONING_PROVIDER') !== 'false';
```

---

### Task 5: Integrate ReasoningProvider into streaming.ts
**File**: `supabase/functions/chat/handlers/streaming.ts`
**Priority**: P1
**Effort**: 30 minutes

#### Imports to Add (at top of file)

```typescript
import {
  createReasoningProvider,
  type IReasoningProvider
} from '../../_shared/reasoning-provider.ts';
import { USE_REASONING_PROVIDER } from '../../_shared/config.ts';
```

#### Remove Old Import
```typescript
// REMOVE this line:
import { parseStatusMarker } from "../../_shared/glm-client.ts";
```

#### Add Provider Initialization

Find where the streaming handler sets up (after request validation, before stream processing):

```typescript
// Initialize ReasoningProvider for semantic status generation
let reasoningProvider: IReasoningProvider | null = null;

if (USE_REASONING_PROVIDER) {
  reasoningProvider = createReasoningProvider(requestId, async (event) => {
    // Emit reasoning status via SSE
    const sseEvent = {
      type: event.type,
      content: event.message,
      phase: event.phase,
      source: event.metadata.source,
      timestamp: event.metadata.timestamp,
    };
    await writer.write(encoder.encode(`data: ${JSON.stringify(sseEvent)}\n\n`));
  });

  await reasoningProvider.start();
  console.log(`[${requestId}] ReasoningProvider started`);
}
```

#### Modify Reasoning Chunk Handling

Find the section that currently uses `parseStatusMarker()` (around line 175-190):

**REMOVE:**
```typescript
// Extract [STATUS: ...] marker from accumulated reasoning
const statusMarker = parseStatusMarker(fullReasoningContent);
if (statusMarker && statusMarker !== lastStatusMarker) {
  const statusEvent = {
    type: "reasoning_status",
    content: statusMarker,
    source: 'glm_marker',
  };
  await writer.write(encoder.encode(`data: ${JSON.stringify(statusEvent)}\n\n`));
  lastStatusMarker = statusMarker;
}
```

**REPLACE WITH:**
```typescript
// Process reasoning chunk through ReasoningProvider
if (reasoningProvider && delta.reasoning_content) {
  await reasoningProvider.processReasoningChunk(delta.reasoning_content);
}
```

#### Add Cleanup on Completion

Find where stream completes successfully:

```typescript
// After stream completes successfully
if (reasoningProvider) {
  // Generate final summary (optional - can pass artifact description if available)
  await reasoningProvider.finalize('artifact');
  reasoningProvider.destroy();
  console.log(`[${requestId}] ReasoningProvider finalized`);
}
```

#### Add Cleanup on Error

Find error handling paths:

```typescript
// In catch blocks / error paths
if (reasoningProvider) {
  reasoningProvider.destroy();
  console.log(`[${requestId}] ReasoningProvider destroyed (error path)`);
}
```

---

### Task 6: Integrate ReasoningProvider into tool-calling-chat.ts
**File**: `supabase/functions/chat/handlers/tool-calling-chat.ts`
**Priority**: P1
**Effort**: 30 minutes

Same pattern as Task 5. Key locations:

#### Imports to Add
```typescript
import {
  createReasoningProvider,
  type IReasoningProvider
} from '../../_shared/reasoning-provider.ts';
import { USE_REASONING_PROVIDER } from '../../_shared/config.ts';
```

#### Remove Old Import (line 30)
```typescript
// REMOVE:
import { parseStatusMarker } from "../../_shared/glm-client.ts";
```

#### Remove Old Logic

**Location 1** - Around line 322-336:
```typescript
// REMOVE entire block:
const statusMarker = parseStatusMarker(fullReasoningAccumulated);
if (statusMarker && statusMarker !== lastStatusMarker) {
  const statusEvent = {
    type: 'reasoning_status',
    content: statusMarker,
    source: 'glm_marker',
  };
  // ... emit logic
}
```

**Location 2** - Around line 534-545 (continuation reasoning):
```typescript
// REMOVE entire block:
const statusMarker = parseStatusMarker(continuationReasoningText);
if (statusMarker && statusMarker !== lastStatusMarker) {
  // ...
}
```

#### Add Provider (same pattern as streaming.ts)

Initialize at handler start, process chunks in reasoning callback, cleanup on completion/error.

---

### Task 7: Remove Client-Side Phase Detection
**File**: `src/hooks/useChatMessages.tsx`
**Priority**: P2
**Effort**: 15 minutes

#### Lines to Remove (21-72)

```typescript
// DELETE ALL OF THIS:

// ============================================================================
// PHASE-BASED TICKER SYSTEM (Client-side)
// ============================================================================
// Overrides raw backend text with stable phase-based messages (3-6 updates)
// to prevent the "flashing ticker" issue.
// UPDATE: Now uses lastSemanticStatus from AI Commentator (GLM-4.5-Air) for semantic ticker updates

// ============================================================================
// PHASE-BASED TICKER: More granular phases for better progress indication
// ============================================================================
type ThinkingPhase =
  | 'starting'
  | 'analyzing'
  | 'planning'
  | 'structuring'
  | 'implementing'
  | 'adding_logic'
  | 'styling'
  | 'polishing'
  | 'finalizing';

const PHASE_MESSAGES: Record<ThinkingPhase, string> = {
  starting: 'Thinking...',
  analyzing: 'Analyzing the request...',
  planning: 'Planning the approach...',
  structuring: 'Designing component structure...',
  implementing: 'Writing core logic...',
  adding_logic: 'Adding game mechanics...',
  styling: 'Applying styles...',
  polishing: 'Adding final touches...',
  finalizing: 'Wrapping up...',
};

// More granular phase detection with lower thresholds
// Uses word boundary regex patterns to avoid matching partial words
const PHASE_CONFIG: { phase: ThinkingPhase; keywords: RegExp[]; minChars: number }[] = [
  { phase: 'analyzing', keywords: [/\b(understand|request|user wants|looking for|asking|need to|requires|let me)\b/i], minChars: 30 },
  { phase: 'planning', keywords: [/\b(plan|approach|will need|going to|should|first)\b/i], minChars: 100 },
  { phase: 'structuring', keywords: [/\b(structure|component|layout|organize|architecture|design)\b/i], minChars: 200 },
  { phase: 'implementing', keywords: [/\b(implement|create|build|code|function|usestate|const)\b/i], minChars: 350 },
  { phase: 'adding_logic', keywords: [/\b(logic|algorithm|minimax|check|calculate|handle|detect)\b/i], minChars: 500 },
  { phase: 'styling', keywords: [/\b(style|css|tailwind|color|flex|grid|padding|classname)\b/i], minChars: 700 },
  { phase: 'polishing', keywords: [/\b(animation|transition|effect|motion|framer|polish)\b/i], minChars: 900 },
  { phase: 'finalizing', keywords: [/\b(wrapping up|winding down|putting it all together|final review|outputting|wrapping|finishing touches)\b/i], minChars: 1500 },
];

function detectPhase(text: string, currentPhase: ThinkingPhase): ThinkingPhase {
  const textLength = text.length;

  const currentIndex = PHASE_CONFIG.findIndex(p => p.phase === currentPhase);

  // Only check phases AFTER current (forward progression only)
  // CRITICAL: Start from currentIndex + 1, not currentIndex, otherwise we re-match the same phase forever
  for (let i = currentIndex + 1; i < PHASE_CONFIG.length; i++) {
    const config = PHASE_CONFIG[i];
    if (textLength >= config.minChars && config.keywords.some(pattern => pattern.test(text))) {
      return config.phase;
    }
  }

  return currentPhase;
}
```

#### Update SSE Handler

Find where `reasoning_status` events are processed and ensure it uses the message directly:

```typescript
// The backend now sends semantic status directly - just display it
if (event.type === 'reasoning_status') {
  setStreamProgress(prev => ({
    ...prev,
    reasoningStatus: event.content,  // Display directly, no phase detection needed
  }));
}
```

---

### Task 8: Update ReasoningDisplay Component (Optional Enhancement)
**File**: `src/components/ReasoningDisplay.tsx`
**Priority**: P3 (Nice-to-have)
**Effort**: 15 minutes

#### Add Duration Formatting

```typescript
// Add helper function
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}
```

#### Add Auto-Scroll for Expanded Content

```typescript
const expandedContentRef = useRef<HTMLDivElement>(null);

// Auto-scroll to bottom when streaming
useEffect(() => {
  if (isStreaming && isExpanded && expandedContentRef.current) {
    expandedContentRef.current.scrollTop = expandedContentRef.current.scrollHeight;
  }
}, [sanitizedStreamingText, isStreaming, isExpanded]);

// Add ref to the scrollable container
<div
  ref={expandedContentRef}
  className="max-h-[50vh] overflow-y-auto"
>
```

---

## Files Changed Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| `supabase/functions/_shared/reasoning-provider.ts` | Modify | ~30 lines |
| `supabase/functions/_shared/config.ts` | Add | ~15 lines |
| `supabase/functions/chat/handlers/streaming.ts` | Modify | ~40 lines |
| `supabase/functions/chat/handlers/tool-calling-chat.ts` | Modify | ~50 lines |
| `src/hooks/useChatMessages.tsx` | Remove | ~52 lines |
| `src/components/ReasoningDisplay.tsx` | Modify (optional) | ~20 lines |

---

## Testing Checklist

### Backend Testing
- [ ] ReasoningProvider starts without errors
- [ ] Status updates appear in SSE stream
- [ ] Circuit breaker triggers after 3 failures
- [ ] Fallback to phase templates works
- [ ] Provider cleanup happens on completion
- [ ] Provider cleanup happens on error

### Frontend Testing
- [ ] Status ticker displays LLM-generated messages
- [ ] No more regex-based phase detection
- [ ] Timer continues to work correctly
- [ ] Expanded reasoning panel shows content
- [ ] No console errors related to old system

### Integration Testing
- [ ] Full artifact generation with status updates
- [ ] Tool-calling flow with status updates
- [ ] Error scenarios show fallback messages
- [ ] Long reasoning streams don't cause issues

---

## Rollback Plan

**The ONLY rollback option is `git revert`.**

This implementation completely removes the marker-based system (`parseStatusMarker()` and client-side `detectPhase()`). The feature flag `USE_REASONING_PROVIDER` controls whether ReasoningProvider initializes, but setting it to `false` will result in **no status updates at all** — not a return to the old system.

```bash
# To rollback: revert the commits from this implementation
git revert <commit-hash>

# Or revert multiple commits
git revert <first-commit>..<last-commit>
```

**Do NOT rely on the feature flag for rollback.** It exists only for testing during development, not as a production fallback mechanism.

---

## Environment Variables

```bash
# Required (already configured)
GLM_API_KEY=your-z-ai-api-key

# Optional (defaults to true)
USE_REASONING_PROVIDER=true
```

---

## Success Criteria

1. ✅ Status messages are semantically meaningful (not just phase names)
2. ✅ No client-side regex pattern matching
3. ✅ Circuit breaker protects against API failures
4. ✅ Fallback messages appear when LLM unavailable
5. ✅ No duplicate/conflicting status events
6. ✅ Clean provider lifecycle (start → process → finalize → destroy)
