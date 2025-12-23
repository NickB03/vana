# Backend Reasoning Streaming Implementation Plan

## Executive Summary

This plan outlines the changes needed to upgrade the backend GLM reasoning streaming system to match the reference Claude-style implementation. The reference provides superior UX with explicit lifecycle events (`thinking_start`, `thinking_end`, `thinking_complete`) and better status extraction patterns.

**Current Status**: Partial implementation with `reasoning_status` events but missing lifecycle events.

**Target**: Full Claude-style reasoning UI with proper thinking phases and completion tracking.

---

## 1. Gap Analysis

### 1.1 Event Lifecycle Comparison

| Reference Events | Current Implementation | Status |
|------------------|------------------------|--------|
| `thinking_start` | ❌ Missing | Need to add |
| `status` | ✅ `reasoning_status` (similar) | Rename for consistency |
| `thinking_delta` | ❌ Missing (reasoning chunks not forwarded) | Need to add |
| `thinking_end` | ❌ Missing | Need to add |
| `thinking_complete` | ✅ `reasoning_complete` (similar) | Keep as-is |
| `text_start` | ❌ Missing | Need to add |
| `text_delta` | ✅ Forwarded as content chunks | Keep as-is |
| `text_end` | ❌ Missing | Need to add |

**Key Finding**: We're only emitting `reasoning_status` (status updates) and `reasoning_complete` (final summary). Missing all the lifecycle boundaries that help the frontend show "thinking..." states.

### 1.2 Status Extraction Comparison

**Reference Implementation** (`extractStatus` function, lines 20-37):
```typescript
function extractStatus(text: string): string | null {
  const patterns = [
    /(?:let me|I'll|I will|I'm going to|going to)\s+([^.!?\n]{10,60})/i,
    /(?:analyzing|examining|considering|thinking about|looking at|reviewing|checking)\s+([^.!?\n]{5,50})/i,
    /(?:first|next|then|now|finally)\s*,?\s*([^.!?\n]{10,50})/i,
    /(?:the\s+)?(?:key|main|important|critical)\s+(?:point|thing|aspect|issue)\s+(?:is|here)\s+([^.!?\n]{10,50})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const status = match[1].trim();
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/\s+/g, ' ');
    }
  }
  return null;
}
```

**Current Implementation** (`parseStatusMarker`, glm-client.ts:754-766):
```typescript
export function parseStatusMarker(text: string): string | null {
  const statusPattern = /\[STATUS:\s*([^\]]+)\]/g;
  const matches = Array.from(text.matchAll(statusPattern));

  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    return lastMatch[1].trim();
  }
  return null;
}
```

**Key Differences**:
- **Reference**: Natural language extraction from ANY reasoning text using multiple regex patterns
- **Current**: Depends on GLM explicitly emitting `[STATUS: ...]` markers
- **Reference**: Extracts meaningful phrases like "analyzing code structure"
- **Current**: Only works if GLM uses our specific marker syntax
- **Reference**: Length constraints (10-60 chars) to ensure quality
- **Current**: No length validation

**Recommendation**: Keep `parseStatusMarker` for GLM-specific markers, but ADD `extractStatus` as a fallback for natural language extraction.

### 1.3 State Tracking Comparison

**Reference Implementation** (lines 10-17, 115-122):
```typescript
interface StreamState {
  thinkingStarted: boolean;
  contentStarted: boolean;
  thinkingContent: string;
  responseContent: string;
  startTime: number;
  toolCalls: Map<number, { name: string; arguments: string }>;
}

const state: StreamState = {
  thinkingStarted: false,
  contentStarted: false,
  thinkingContent: '',
  responseContent: '',
  startTime: Date.now(),
  toolCalls: new Map(),
};
```

**Current Implementation** (tool-calling-chat.ts:313-314):
```typescript
// Accumulate reasoning text for status marker parsing
let fullReasoningAccumulated = '';
```

**Gap**: No explicit lifecycle flags. We accumulate reasoning content but don't track when phases start/end.

---

## 2. Required Changes

### 2.1 Add `extractStatus()` Function to `glm-client.ts`

**Location**: `/Users/nick/Projects/llm-chat-site/supabase/functions/_shared/glm-client.ts`

**Insert After Line 766** (after `parseStatusMarker`):

```typescript
/**
 * Extract meaningful status phrases from natural reasoning text
 *
 * This is a fallback extraction method that works when the AI doesn't use
 * explicit [STATUS: ...] markers. It uses regex patterns to extract action
 * phrases from natural language reasoning.
 *
 * Patterns matched:
 * - "let me analyze..." → "analyze..."
 * - "analyzing the code" → "analyzing the code"
 * - "first, I'll check..." → "I'll check..."
 * - "the key point is..." → "the key point is..."
 *
 * @param text - The reasoning text to parse (can be partial/accumulated)
 * @returns The extracted status phrase (capitalized, 10-60 chars) or null
 *
 * @example
 * extractStatus("let me analyze the requirements") // "Analyze the requirements"
 * extractStatus("analyzing code structure") // "Analyzing code structure"
 * extractStatus("short") // null (too short)
 */
export function extractStatus(text: string): string | null {
  const patterns = [
    /(?:let me|I'll|I will|I'm going to|going to)\s+([^.!?\n]{10,60})/i,
    /(?:analyzing|examining|considering|thinking about|looking at|reviewing|checking)\s+([^.!?\n]{5,50})/i,
    /(?:first|next|then|now|finally)\s*,?\s*([^.!?\n]{10,50})/i,
    /(?:the\s+)?(?:key|main|important|critical)\s+(?:point|thing|aspect|issue)\s+(?:is|here)\s+([^.!?\n]{10,50})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const status = match[1].trim();
      // Capitalize first letter and clean up whitespace
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/\s+/g, ' ');
    }
  }
  return null;
}
```

**Rationale**: This gives us a robust fallback when `[STATUS: ...]` markers aren't present. GLM may not always emit markers, but it produces natural reasoning text we can parse.

---

### 2.2 Modify `streaming.ts` to Emit Lifecycle Events

**File**: `/Users/nick/Projects/llm-chat-site/supabase/functions/chat/handlers/streaming.ts`

#### Change 2.2.1: Import `extractStatus`

**Line 20**: Add import for the new function:

```typescript
import { parseStatusMarker, extractStatus } from "../../_shared/glm-client.ts";
```

#### Change 2.2.2: Add State Tracking Variables

**After line 51** (after `let lastStatusMarker: string | null = null;`):

```typescript
// Lifecycle state tracking (Claude-style reasoning UI)
let thinkingStarted = false;
let contentStarted = false;
let thinkingStartTime = 0;
let storedThinkingDuration = 0;  // Store duration once at thinking_end, reuse in thinking_complete
let lastFinishReason: string | null = null;  // Track finish_reason from GLM response
```

#### Change 2.2.3: Emit `thinking_start` on First Reasoning Chunk

**Find lines 174-189** (inside `if (delta.reasoning_content)` block):

**REPLACE**:
```typescript
if (delta.reasoning_content) {
  fullReasoningContent += delta.reasoning_content;

  // Extract [STATUS: ...] marker from accumulated reasoning
  const statusMarker = parseStatusMarker(fullReasoningContent);
  if (statusMarker && statusMarker !== lastStatusMarker) {
    const statusEvent = {
      type: "reasoning_status",
      content: statusMarker,
      source: 'glm_marker',
      timestamp: Date.now(),
    };
    controller.enqueue(`data: ${JSON.stringify(statusEvent)}\n\n`);
    lastStatusMarker = statusMarker;
  }

  // Don't forward reasoning_content - it's been processed
  continue;
}
```

**WITH**:
```typescript
if (delta.reasoning_content) {
  // Emit thinking_start on first reasoning chunk
  if (!thinkingStarted) {
    thinkingStarted = true;
    thinkingStartTime = Date.now();
    const startEvent = {
      type: "thinking_start",
      timestamp: Date.now(),
    };
    controller.enqueue(`data: ${JSON.stringify(startEvent)}\n\n`);
    console.log(`[${requestId}] 🧠 Thinking phase started`);
  }

  fullReasoningContent += delta.reasoning_content;

  // Emit thinking_delta (raw reasoning content for Claude-style UI)
  const deltaEvent = {
    type: "thinking_delta",
    content: delta.reasoning_content,
    timestamp: Date.now(),
  };
  controller.enqueue(`data: ${JSON.stringify(deltaEvent)}\n\n`);

  // Extract status from reasoning (try marker first, then natural language)
  // IMPORTANT: Use accumulated text (fullReasoningContent) for BOTH methods
  // - parseStatusMarker needs full text to find markers anywhere in stream
  // - extractStatus needs full text to match multi-chunk phrases like "let me analyze..."
  const statusMarker = parseStatusMarker(fullReasoningContent);
  const extractedStatus = statusMarker || extractStatus(fullReasoningContent);  // Use accumulated, NOT chunk

  // Only emit status if it's meaningful (>15 chars) and not a duplicate
  if (extractedStatus && extractedStatus !== lastStatusMarker && extractedStatus.length > 15) {
    const statusEvent = {
      type: "status",  // Match reference implementation
      description: extractedStatus,
      source: statusMarker ? 'glm_marker' : 'natural_language',
      timestamp: Date.now(),
    };
    controller.enqueue(`data: ${JSON.stringify(statusEvent)}\n\n`);
    lastStatusMarker = extractedStatus;
  }

  // Don't forward reasoning_content to regular buffer - it's processed above
  continue;
}
```

**Rationale**:
1. **`thinking_start`**: Signals to frontend when thinking phase begins
2. **`thinking_delta`**: Gives frontend raw reasoning chunks for streaming display
3. **Hybrid status extraction**: Uses `[STATUS: ...]` markers if present, falls back to `extractStatus()` for natural language
4. **Event type rename**: `reasoning_status` → `status` (matches reference)

#### Change 2.2.4: Emit `thinking_end` and `text_start` on First Content Chunk

**Find lines 196-199** (inside `if (delta.content)` block):

**REPLACE**:
```typescript
if (delta.content) {
  contentBuffer += delta.content;
  // Forward content directly (will be artifact-transformed below)
}
```

**WITH**:
```typescript
if (delta.content) {
  // Emit thinking_end and text_start on transition from reasoning to content
  if (!contentStarted) {
    contentStarted = true;

    // Emit thinking_end if we had a thinking phase
    if (thinkingStarted) {
      // Calculate duration ONCE here and store it for reuse in thinking_complete
      storedThinkingDuration = Math.floor((Date.now() - thinkingStartTime) / 1000);
      const endEvent = {
        type: "thinking_end",
        duration: storedThinkingDuration,  // Use stored value
        timestamp: Date.now(),
      };
      controller.enqueue(`data: ${JSON.stringify(endEvent)}\n\n`);
      console.log(`[${requestId}] 🧠 Thinking phase ended (${storedThinkingDuration}s)`);
    }

    // Emit text_start to signal content phase has begun
    const textStartEvent = {
      type: "text_start",
      timestamp: Date.now(),
    };
    controller.enqueue(`data: ${JSON.stringify(textStartEvent)}\n\n`);
    console.log(`[${requestId}] 💬 Content phase started`);
  }

  contentBuffer += delta.content;
  // Forward content directly (will be artifact-transformed below)
}

// Track finish_reason when it appears (for text_end event)
if (choice.finish_reason) {
  lastFinishReason = choice.finish_reason;
}
```

**Rationale**: Marks the phase transition from thinking → content generation.

#### Change 2.2.5: Emit `thinking_complete` on Stream End

**Find lines 148-158** (inside `if (jsonStr === "[DONE]")` block):

**REPLACE**:
```typescript
if (jsonStr === "[DONE]") {
  // Send reasoning_complete if we had reasoning content
  if (fullReasoningContent.length > 0 && !reasoningComplete) {
    const completeEvent = {
      type: "reasoning_complete",
      reasoning: fullReasoningContent.substring(0, 500),
      timestamp: Date.now(),
    };
    controller.enqueue(`data: ${JSON.stringify(completeEvent)}\n\n`);
    reasoningComplete = true;
    console.log(`[${requestId}] 🧠 GLM reasoning complete: ${fullReasoningContent.length} chars`);
  }

  // Clean up buffers to prevent memory leaks
  fullReasoningContent = "";
  contentBuffer = "";

  // Forward the [DONE] marker
  controller.enqueue(`${line}\n\n`);
  continue;
}
```

**WITH**:
```typescript
if (jsonStr === "[DONE]") {
  // Emit text_end if we had content (matches text_start from earlier)
  if (contentStarted) {
    const textEndEvent = {
      type: "text_end",
      finish_reason: lastFinishReason || "stop",  // Use tracked reason, fallback to "stop"
      timestamp: Date.now(),
    };
    controller.enqueue(`data: ${JSON.stringify(textEndEvent)}\n\n`);
    console.log(`[${requestId}] 💬 Content phase ended (reason: ${lastFinishReason || 'stop'})`);
  }

  // Emit thinking_complete if we had reasoning content
  if (fullReasoningContent.length > 0 && !reasoningComplete) {
    // Reuse stored duration from thinking_end to avoid drift
    // (If thinking_end wasn't emitted, calculate now as fallback)
    const finalDuration = storedThinkingDuration > 0
      ? storedThinkingDuration
      : (thinkingStartTime > 0 ? Math.floor((Date.now() - thinkingStartTime) / 1000) : 0);

    const completeEvent = {
      type: "thinking_complete",
      duration: finalDuration,  // Use stored duration (prevents drift)
      thinking: fullReasoningContent.substring(0, 500),  // Match reference field name
      timestamp: Date.now(),
    };
    controller.enqueue(`data: ${JSON.stringify(completeEvent)}\n\n`);
    reasoningComplete = true;
    console.log(`[${requestId}] 🧠 Thinking complete: ${fullReasoningContent.length} chars, ${finalDuration}s`);
  }

  // Clean up buffers to prevent memory leaks
  fullReasoningContent = "";
  contentBuffer = "";

  // Forward the [DONE] marker
  controller.enqueue(`${line}\n\n`);
  continue;
}
```

**Rationale**:
- Renames `reasoning` → `thinking` for reference consistency
- Adds `duration` field for total thinking time
- Keeps 500-char truncation for efficiency

---

### 2.3 Modify `tool-calling-chat.ts` to Emit Lifecycle Events

**File**: `/Users/nick/Projects/llm-chat-site/supabase/functions/chat/handlers/tool-calling-chat.ts`

#### Change 2.3.1: Import `extractStatus`

**Line 30**: Update import:

```typescript
import {
  callGLMWithRetry,
  processGLMStream,
  callGLMWithToolResult,
  parseStatusMarker,
  extractStatus,  // Add this import
  type ToolCall,
  type NativeToolCall,
} from '../../_shared/glm-client.ts';
```

#### Change 2.3.2: Add State Tracking Variables

**After line 257** (after `let lastStatusMarker: string | null = null;`):

```typescript
// Lifecycle state tracking (Claude-style reasoning UI)
let thinkingStarted = false;
let contentStarted = false;
let thinkingStartTime = 0;
let storedThinkingDuration = 0;  // Store duration once at thinking_end, reuse in thinking_complete
let lastFinishReason: string | null = null;  // Track finish_reason from GLM response
```

#### Change 2.3.3: Emit Lifecycle Events in First GLM Call

**Find lines 321-337** (inside `onReasoningChunk` callback):

**REPLACE**:
```typescript
onReasoningChunk: async (chunk: string) => {
  // Accumulate reasoning text for status marker parsing
  fullReasoningAccumulated += chunk;

  // Parse status markers from accumulated reasoning content
  const statusMarker = parseStatusMarker(fullReasoningAccumulated);
  if (statusMarker && statusMarker !== lastStatusMarker) {
    const statusEvent = {
      type: 'reasoning_status',
      content: statusMarker,
      source: 'glm_marker',
      timestamp: Date.now(),
    };
    sendEvent(statusEvent);
    lastStatusMarker = statusMarker;
  }
},
```

**WITH**:
```typescript
onReasoningChunk: async (chunk: string) => {
  // Emit thinking_start on first reasoning chunk
  if (!thinkingStarted) {
    thinkingStarted = true;
    thinkingStartTime = Date.now();
    sendEvent({
      type: 'thinking_start',
      timestamp: Date.now(),
    });
    console.log(`${logPrefix} 🧠 Thinking phase started`);
  }

  // Accumulate reasoning text for status marker parsing
  fullReasoningAccumulated += chunk;

  // Emit thinking_delta (raw reasoning chunks for streaming)
  sendEvent({
    type: 'thinking_delta',
    content: chunk,
    timestamp: Date.now(),
  });

  // Extract status (try marker first, then natural language)
  // IMPORTANT: Use accumulated text for BOTH methods (not just the chunk)
  // This ensures multi-chunk phrases like "let me analyze..." are captured
  const statusMarker = parseStatusMarker(fullReasoningAccumulated);
  const extractedStatus = statusMarker || extractStatus(fullReasoningAccumulated);  // Use accumulated, NOT chunk

  // Only emit status if meaningful (>15 chars) and not a duplicate
  if (extractedStatus && extractedStatus !== lastStatusMarker && extractedStatus.length > 15) {
    sendEvent({
      type: 'status',  // Match reference implementation
      description: extractedStatus,
      source: statusMarker ? 'glm_marker' : 'natural_language',
      timestamp: Date.now(),
    });
    lastStatusMarker = extractedStatus;
  }
},
```

#### Change 2.3.4: Emit `thinking_end` and `text_start` on Content Chunk

**Find lines 339-343** (inside `onContentChunk` callback):

**REPLACE**:
```typescript
onContentChunk: async (chunk: string) => {
  // With native tool calling, content is clean (no XML to strip)
  // Forward directly to client
  sendContentChunk(chunk);
},
```

**WITH**:
```typescript
onContentChunk: async (chunk: string) => {
  // Emit thinking_end and text_start on transition from reasoning to content
  if (!contentStarted) {
    contentStarted = true;

    // Emit thinking_end if we had a thinking phase
    if (thinkingStarted) {
      // Calculate duration ONCE and store it for reuse in thinking_complete
      storedThinkingDuration = Math.floor((Date.now() - thinkingStartTime) / 1000);
      sendEvent({
        type: 'thinking_end',
        duration: storedThinkingDuration,  // Use stored value
        timestamp: Date.now(),
      });
      console.log(`${logPrefix} 🧠 Thinking phase ended (${storedThinkingDuration}s)`);
    }

    // Emit text_start to signal content phase has begun
    sendEvent({
      type: 'text_start',
      timestamp: Date.now(),
    });
    console.log(`${logPrefix} 💬 Content phase started`);
  }

  // With native tool calling, content is clean (no XML to strip)
  // Forward directly to client
  sendContentChunk(chunk);
},
```

#### Change 2.3.5: Emit `thinking_complete` in Final Step

**Find lines 609-614** (final stream completion):

**INSERT BEFORE** `console.log(\`${logPrefix} ✅ Tool-calling chat stream complete\`);`:

```typescript
// Emit thinking_complete before finalizing stream
if (thinkingStarted) {
  // Reuse stored duration from thinking_end to avoid drift
  // (If thinking_end wasn't emitted, calculate now as fallback)
  const finalDuration = storedThinkingDuration > 0
    ? storedThinkingDuration
    : (thinkingStartTime > 0 ? Math.floor((Date.now() - thinkingStartTime) / 1000) : 0);

  sendEvent({
    type: 'thinking_complete',
    duration: finalDuration,  // Use stored duration (prevents drift)
    thinking: fullReasoningAccumulated.substring(0, 500),
    timestamp: Date.now(),
  });
  console.log(`${logPrefix} 🧠 Thinking complete: ${fullReasoningAccumulated.length} chars, ${finalDuration}s`);
}
```

#### Change 2.3.6: Reset State Flags for Tool Continuation

**Find line 513** (before `callGLMWithToolResult`):

**INSERT BEFORE** `let continuationReasoningText = '';`:

```typescript
// Reset state flags for continuation stream
thinkingStarted = false;
contentStarted = false;
thinkingStartTime = 0;
storedThinkingDuration = 0;  // Reset stored duration for fresh calculation
lastFinishReason = null;  // Reset finish reason for new stream
lastStatusMarker = null;  // Allow duplicate statuses in continuation
```

**Rationale**: Tool continuation is a new stream phase, so we reset lifecycle tracking.

#### Change 2.3.7: Apply Same Lifecycle Events to Tool Continuation Stream

**Find lines 531-547** (inside `callGLMWithToolResult` callbacks):

**APPLY THE SAME PATTERN** as Change 2.3.3 and 2.3.4:

```typescript
onReasoningChunk: async (chunk: string) => {
  // Emit thinking_start on first reasoning chunk (continuation)
  if (!thinkingStarted) {
    thinkingStarted = true;
    thinkingStartTime = Date.now();
    sendEvent({
      type: 'thinking_start',
      timestamp: Date.now(),
    });
  }

  continuationReasoningText += chunk;

  // Emit thinking_delta
  sendEvent({
    type: 'thinking_delta',
    content: chunk,
    timestamp: Date.now(),
  });

  // Extract status (use accumulated text for complete phrase matching)
  const statusMarker = parseStatusMarker(continuationReasoningText);
  const extractedStatus = statusMarker || extractStatus(continuationReasoningText);  // Use accumulated, NOT chunk

  // Only emit status if meaningful (>15 chars) and not a duplicate
  if (extractedStatus && extractedStatus !== lastStatusMarker && extractedStatus.length > 15) {
    sendEvent({
      type: 'status',
      description: extractedStatus,
      source: statusMarker ? 'glm_marker' : 'natural_language',
      timestamp: Date.now(),
    });
    lastStatusMarker = extractedStatus;
  }
},

onContentChunk: async (chunk: string) => {
  // Emit thinking_end and text_start on transition
  if (!contentStarted) {
    contentStarted = true;

    if (thinkingStarted) {
      // Calculate and store duration for reuse in thinking_complete
      storedThinkingDuration = Math.floor((Date.now() - thinkingStartTime) / 1000);
      sendEvent({
        type: 'thinking_end',
        duration: storedThinkingDuration,  // Use stored value
        timestamp: Date.now(),
      });
    }

    sendEvent({
      type: 'text_start',
      timestamp: Date.now(),
    });
  }

  sendContentChunk(chunk);
},
```

---

## 3. Complete Code Snippets

### 3.1 New `extractStatus()` Function (glm-client.ts)

**Location**: Insert after line 766 in `/Users/nick/Projects/llm-chat-site/supabase/functions/_shared/glm-client.ts`

```typescript
/**
 * Extract meaningful status phrases from natural reasoning text
 *
 * This is a fallback extraction method that works when the AI doesn't use
 * explicit [STATUS: ...] markers. It uses regex patterns to extract action
 * phrases from natural language reasoning.
 *
 * Patterns matched:
 * - "let me analyze..." → "analyze..."
 * - "analyzing the code" → "analyzing the code"
 * - "first, I'll check..." → "I'll check..."
 * - "the key point is..." → "the key point is..."
 *
 * @param text - The reasoning text to parse (can be partial/accumulated)
 * @returns The extracted status phrase (capitalized, 10-60 chars) or null
 *
 * @example
 * extractStatus("let me analyze the requirements") // "Analyze the requirements"
 * extractStatus("analyzing code structure") // "Analyzing code structure"
 * extractStatus("short") // null (too short)
 */
export function extractStatus(text: string): string | null {
  const patterns = [
    /(?:let me|I'll|I will|I'm going to|going to)\s+([^.!?\n]{10,60})/i,
    /(?:analyzing|examining|considering|thinking about|looking at|reviewing|checking)\s+([^.!?\n]{5,50})/i,
    /(?:first|next|then|now|finally)\s*,?\s*([^.!?\n]{10,50})/i,
    /(?:the\s+)?(?:key|main|important|critical)\s+(?:point|thing|aspect|issue)\s+(?:is|here)\s+([^.!?\n]{10,50})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const status = match[1].trim();
      // Capitalize first letter and clean up whitespace
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/\s+/g, ' ');
    }
  }
  return null;
}
```

### 3.2 Event Type Reference

**All SSE Events After Implementation**:

```typescript
// Lifecycle events (Claude-style)
{ type: 'thinking_start', timestamp: number }
{ type: 'thinking_delta', content: string, timestamp: number }
{ type: 'status', description: string, source: 'glm_marker' | 'natural_language', timestamp: number }
{ type: 'thinking_end', duration: number, timestamp: number }
{ type: 'thinking_complete', duration: number, thinking: string, timestamp: number }
{ type: 'text_start', timestamp: number }
{ type: 'text_delta', content: string }  // OpenAI-compatible content chunks
{ type: 'text_end', finish_reason: string, timestamp: number }

// Tool-specific events (existing)
{ type: 'tool_call_start', toolName: string, arguments: Record<string, unknown>, timestamp: number }
{ type: 'tool_result', toolName: string, success: boolean, ... }
{ type: 'web_search', data: { ... } }
{ type: 'artifact_complete', ... }
{ type: 'image_complete', ... }
```

---

## 4. Testing Checklist

### 4.1 Lifecycle Event Verification

**Test Case 1: Simple Chat Message (No Tools)**
```bash
# Expected SSE sequence:
thinking_start
thinking_delta (multiple chunks)
status (one or more status updates)
thinking_end { duration: X }
text_start
text_delta (OpenAI format chunks)
thinking_complete { duration: X, thinking: "..." }
[DONE]
```

**Verification**:
- [ ] `thinking_start` emitted before any reasoning chunks
- [ ] `thinking_delta` contains raw reasoning text
- [ ] `status` events show meaningful action phrases
- [ ] `thinking_end` emitted before first content chunk
- [ ] `text_start` emitted before content streaming
- [ ] `thinking_complete` includes duration and truncated reasoning

**Test Case 2: Tool-Calling Chat (Web Search)**
```bash
# Expected SSE sequence:
thinking_start (initial reasoning)
thinking_delta (chunks)
status (updates)
thinking_end
text_start
tool_call_start { toolName: "browser.search", ... }
tool_result { success: true, ... }
web_search { data: { ... } }
thinking_start (continuation reasoning after tool result)
thinking_delta (continuation chunks)
status (continuation status updates)
thinking_end (continuation)
text_start (continuation)
text_delta (final response)
thinking_complete
[DONE]
```

**Verification**:
- [ ] Two separate thinking phases (initial + continuation)
- [ ] State flags reset before tool continuation
- [ ] Both phases emit complete lifecycle events
- [ ] Duration tracking accurate for both phases

**Test Case 3: Artifact Generation**
```bash
# Expected SSE sequence:
thinking_start
thinking_delta (artifact reasoning)
status (e.g., "analyzing requirements")
thinking_end
text_start
tool_call_start { toolName: "generate_artifact" }
artifact_complete { artifactCode: "...", ... }
thinking_start (continuation)
status ("generating explanation")
thinking_end
text_start
text_delta (explanation of artifact)
thinking_complete
[DONE]
```

**Verification**:
- [ ] Artifact generation includes reasoning phase
- [ ] Continuation stream after artifact provides explanation
- [ ] Both phases tracked independently

### 4.2 Status Extraction Verification

**Test Case 4: GLM Marker Extraction**
```typescript
// GLM emits: "[STATUS: analyzing code structure]"
// Expected: status event with description="analyzing code structure", source="glm_marker"
```

**Test Case 5: Natural Language Fallback**
```typescript
// GLM emits: "let me analyze the requirements carefully"
// Expected: status event with description="Analyze the requirements carefully", source="natural_language"
```

**Test Case 6: No Valid Status**
```typescript
// GLM emits: "hi" (too short)
// Expected: No status event emitted
```

**Verification**:
- [ ] Marker extraction takes priority over natural language
- [ ] Natural language extraction works when markers absent
- [ ] Status deduplication prevents duplicate events
- [ ] Length constraints enforced (10-60 chars for intent patterns)

### 4.3 Error Handling Verification

**Test Case 7: Stream Timeout**
```bash
# Simulate: GLM stops sending data mid-stream
# Expected: thinking_complete emitted with partial reasoning before error
```

**Test Case 8: Empty Reasoning**
```bash
# Simulate: GLM returns content without reasoning (thinking: disabled)
# Expected: No thinking_start/end events, only text_start and content
```

**Verification**:
- [ ] Graceful degradation when reasoning disabled
- [ ] Partial reasoning captured before timeout
- [ ] No lifecycle events if thinking phase never started

---

## 5. Deployment Strategy

### Phase 1: Add `extractStatus()` Function
1. Add `extractStatus()` to `glm-client.ts` (Section 2.1)
2. Run Deno tests: `cd supabase/functions && deno task test`
3. Verify no regressions
4. Deploy: `supabase functions deploy chat --project-ref <ref>`

### Phase 2: Update `streaming.ts`
1. Apply changes from Section 2.2
2. Test locally with `supabase functions serve`
3. Verify event sequence with browser DevTools Network tab
4. Deploy: `supabase functions deploy chat`

### Phase 3: Update `tool-calling-chat.ts`
1. Apply changes from Section 2.3
2. Test tool-calling flows (search, artifact, image)
3. Verify dual thinking phases (initial + continuation)
4. Deploy: `supabase functions deploy chat`

### Phase 4: Frontend Compatibility Check
1. Verify frontend handles new event types gracefully
2. Check for `reasoning_status` → `status` event rename
3. Update frontend to use `thinking_delta` for streaming (if needed)
4. Verify `thinking_complete` field rename (`reasoning` → `thinking`)

---

## 6. Deployment Strategy (No Backward Compat Needed)

Since we control both frontend and backend in a single codebase, we deploy atomically:

### Deployment Order
1. **Deploy frontend FIRST** - Adds new event handlers (`thinking_start`, `status`, etc.)
2. **Deploy backend SECOND** - Starts emitting new events
3. **Cleanup (optional)** - Remove old event handlers from frontend after verification

### Breaking Changes (Handled by Deploy Order)
- **Event type rename**: `reasoning_status` → `status`
- **Field rename**: `reasoning_complete.reasoning` → `thinking_complete.thinking`

### New Events (Additive)
- `thinking_start`, `thinking_delta`, `thinking_end`, `text_start`, `text_end`
- New function: `extractStatus()` (internal utility)
- New state tracking variables (scoped to handler functions)

**No backward compatibility layer needed** - coordinated deployment handles the transition.

---

## 7. Performance Considerations

### Regex Efficiency
- `extractStatus()` uses 4 regex patterns per chunk
- **Impact**: Minimal (<1ms per chunk) due to short text lengths
- **Optimization**: Could cache last N chars to avoid re-parsing full text

### Event Emission Overhead
- New lifecycle events add ~5-10 SSE events per response
- **Impact**: Negligible (~500 bytes total for event metadata)
- **Benefit**: Improved UX justifies minimal bandwidth cost

### State Tracking Memory
- New boolean flags and timestamp variables per request
- **Impact**: <100 bytes per request
- **Cleanup**: Variables scoped to handler functions (auto-GC'd)

---

## 8. Future Enhancements

### 8.1 Advanced Status Extraction
- Machine learning model for extracting key phrases
- Context-aware status summarization (e.g., "Step 3 of 5: analyzing...")

### 8.2 Reasoning Quality Metrics
- Track thinking duration vs response quality correlation
- Identify optimal reasoning phase lengths for different tasks

### 8.3 Multi-Turn Reasoning
- Accumulate reasoning across multiple tool calls
- Show aggregate reasoning summary for complex workflows

---

## 9. Success Metrics

**After implementation, we should observe**:

1. **Event Coverage**: 100% of reasoning streams emit lifecycle events
2. **Status Extraction Rate**: >80% of reasoning chunks produce status updates
3. **Duration Accuracy**: `thinking_end.duration` matches `thinking_complete.duration`
4. **No Regressions**: Existing tool-calling and artifact flows still work
5. **Frontend Integration**: Claude-style reasoning UI renders correctly

---

## 10. File Summary

**Files Modified**:
1. `/Users/nick/Projects/llm-chat-site/supabase/functions/_shared/glm-client.ts`
   - Add `extractStatus()` function (Section 2.1)

2. `/Users/nick/Projects/llm-chat-site/supabase/functions/chat/handlers/streaming.ts`
   - Import `extractStatus` (Section 2.2.1)
   - Add state tracking (Section 2.2.2)
   - Emit lifecycle events (Sections 2.2.3-2.2.5)

3. `/Users/nick/Projects/llm-chat-site/supabase/functions/chat/handlers/tool-calling-chat.ts`
   - Import `extractStatus` (Section 2.3.1)
   - Add state tracking (Section 2.3.2)
   - Emit lifecycle events in initial call (Sections 2.3.3-2.3.5)
   - Reset state for continuation (Section 2.3.6)
   - Emit lifecycle events in continuation (Section 2.3.7)

**Files Created**: None (all modifications to existing files)

**Lines of Code**: ~150 LOC added (mostly event emission logic)

---

## End of Plan

**Next Steps**:
1. Review this plan with team
2. Create feature branch: `feature/claude-style-reasoning-events`
3. Implement Phase 1 (add `extractStatus()`)
4. Test and iterate
5. Deploy incrementally per Phase 2-4
