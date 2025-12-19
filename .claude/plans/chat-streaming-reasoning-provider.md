# Implementation Plan: ReasoningProvider Integration into chat/streaming.ts

## Overview
Integrate the ReasoningProvider hybrid LLM+fallback system into `chat/handlers/streaming.ts` to provide semantic status updates during chat streaming, with feature flag control for safe rollout.

## Target File
`supabase/functions/chat/handlers/streaming.ts`

## Prerequisites
- ReasoningProvider implementation exists at `supabase/functions/_shared/reasoning-provider.ts`
- Feature flag `USE_REASONING_PROVIDER` and `shouldUseReasoningProvider()` in `_shared/config.ts`
- PR #339 merged or branch `feat/reasoning-provider` active

## Architecture Constraints

### TransformStream + Async Challenge
The `createStreamTransformer` returns a `TransformStream` where:
- `start(controller)` - can be async
- `transform(chunk, controller)` - should be fast, avoid blocking
- `flush(controller)` - can be async

ReasoningProvider is async (makes LLM calls). Solution:
1. Store controller reference from `start()` in closure
2. ReasoningProvider callbacks enqueue directly to stored controller
3. `transform()` calls `processReasoningChunk()` without awaiting
4. `flush()` awaits `finalize()` for final summary

## Implementation Steps

### Step 1: Add Imports
Add to top of file after existing imports:
```typescript
import {
  createReasoningProvider,
  createNoOpReasoningProvider,
  type IReasoningProvider,
  type ReasoningEvent,
} from "../../_shared/reasoning-provider.ts";
import { shouldUseReasoningProvider } from "../../_shared/config.ts";
```

### Step 2: Add Provider State Variables
In `createStreamTransformer` function, add after existing closure variables:
```typescript
// ReasoningProvider state (hybrid LLM+fallback for status generation)
let reasoningProvider: IReasoningProvider | null = null;
let storedController: TransformStreamDefaultController<string> | null = null;
const useReasoningProvider = shouldUseReasoningProvider(requestId);
```

### Step 3: Initialize Provider in start()
In the `start(controller)` method, add BEFORE the existing reasoning/search logic:
```typescript
// Store controller for async ReasoningProvider callbacks
storedController = controller;

// Initialize ReasoningProvider if enabled
if (useReasoningProvider) {
  const reasoningEventCallback = async (event: ReasoningEvent) => {
    if (!storedController) return;

    if (event.type === 'reasoning_status' || event.type === 'reasoning_heartbeat') {
      const statusEvent = {
        type: "reasoning_status",
        content: event.message,
        source: event.type === 'reasoning_heartbeat' ? 'heartbeat' : 'reasoning_provider',
        phase: event.phase,
        timestamp: Date.now(),
      };
      storedController.enqueue(`data: ${JSON.stringify(statusEvent)}\n\n`);
    } else if (event.type === 'reasoning_final') {
      // Final summary can be sent as a special status
      const finalEvent = {
        type: "reasoning_status",
        content: event.message,
        source: 'completion',
        isFinal: true,
        timestamp: Date.now(),
      };
      storedController.enqueue(`data: ${JSON.stringify(finalEvent)}\n\n`);
    } else if (event.type === 'reasoning_error') {
      console.warn(`[${requestId}] ⚠️ ReasoningProvider error: ${event.message}`);
    }
  };

  reasoningProvider = createReasoningProvider(requestId, reasoningEventCallback);
  await reasoningProvider.start();
  console.log(`[${requestId}] 🎛️ Chat status provider: ReasoningProvider`);
} else {
  console.log(`[${requestId}] 🎛️ Chat status provider: Direct parsing (legacy)`);
}
```

### Step 4: Modify transform() to Use Provider
In the `transform()` method, find the section handling `delta.reasoning_content` (around line 233-267).

Replace the existing status emission logic with conditional provider usage:

```typescript
// Handle reasoning_content from GLM thinking mode
if (delta.reasoning_content) {
  fullReasoningContent += delta.reasoning_content;

  if (reasoningProvider) {
    // Use ReasoningProvider for status generation (fire-and-forget)
    // Provider will emit events via callback → storedController
    reasoningProvider.processReasoningChunk(delta.reasoning_content);

    // Still parse incrementally for reasoning_step events
    const parseResult = parseReasoningIncrementally(fullReasoningContent, parseState);
    parseState = parseResult.state;

    // Emit reasoning_step if detected (this is different from status)
    if (parseResult.newStep) {
      const stepEvent = {
        type: "reasoning_step",
        step: parseResult.newStep,
        stepIndex: reasoningStepsSent,
        currentThinking: parseResult.currentThinking,
        timestamp: Date.now(),
      };
      controller.enqueue(`data: ${JSON.stringify(stepEvent)}\n\n`);
      reasoningStepsSent++;
    }
  } else {
    // Legacy path: direct parsing for status updates
    const parseResult = parseReasoningIncrementally(fullReasoningContent, parseState);
    parseState = parseResult.state;

    // Emit new step if detected
    if (parseResult.newStep) {
      const stepEvent = {
        type: "reasoning_step",
        step: parseResult.newStep,
        stepIndex: reasoningStepsSent,
        currentThinking: parseResult.currentThinking,
        timestamp: Date.now(),
      };
      controller.enqueue(`data: ${JSON.stringify(stepEvent)}\n\n`);
      reasoningStepsSent++;
    }

    // Emit status update if enough time has passed (legacy behavior)
    const now = Date.now();
    if (now - lastStatusUpdate > STATUS_UPDATE_INTERVAL_MS) {
      const statusEvent = {
        type: "reasoning_status",
        content: parseResult.currentThinking,
        timestamp: now,
      };
      controller.enqueue(`data: ${JSON.stringify(statusEvent)}\n\n`);
      lastStatusUpdate = now;
    }
  }

  // Don't forward reasoning_content - it's been processed
  continue;
}
```

### Step 5: Add Cleanup in flush()
In the `flush(controller)` method, add provider finalization BEFORE the existing reasoning_complete logic:

```typescript
async flush(controller) {
  // Send any remaining buffered content (with tool call stripping)
  if (buffer) {
    const sanitizedBuffer = stripToolCallXml(buffer);
    if (sanitizedBuffer) {
      controller.enqueue(sanitizedBuffer);
    }
  }

  // Finalize ReasoningProvider if active
  if (reasoningProvider) {
    try {
      await reasoningProvider.finalize("chat response");
    } catch (err) {
      console.warn(`[${requestId}] ⚠️ ReasoningProvider finalize error:`, err);
    } finally {
      reasoningProvider.destroy();
      reasoningProvider = null;
    }
  }

  // Emit final reasoning_complete if not already done (legacy path or fallback)
  if (fullReasoningContent.length > 0 && !reasoningComplete) {
    const completeEvent = {
      type: "reasoning_complete",
      reasoning: fullReasoningContent.substring(0, 500),
      stepCount: reasoningStepsSent,
      timestamp: Date.now(),
    };
    controller.enqueue(`data: ${JSON.stringify(completeEvent)}\n\n`);
    console.log(`[${requestId}] 🧠 GLM reasoning finalized: ${fullReasoningContent.length} chars`);
  }

  // Clear stored controller reference
  storedController = null;
}
```

### Step 6: Handle Stream End [DONE] Cleanup
In the `[DONE]` handling block (around line 203-225), add provider cleanup:

```typescript
// Check for stream end marker
if (jsonStr === "[DONE]") {
  // Finalize ReasoningProvider before completing
  if (reasoningProvider) {
    try {
      await reasoningProvider.finalize("chat response");
    } catch (err) {
      console.warn(`[${requestId}] ⚠️ ReasoningProvider finalize error at [DONE]:`, err);
    } finally {
      reasoningProvider.destroy();
      reasoningProvider = null;
    }
  }

  // Send reasoning_complete if we had reasoning content (existing logic)
  if (fullReasoningContent.length > 0 && !reasoningComplete) {
    // ... existing logic unchanged
  }

  // ... rest of existing [DONE] handling
}
```

**NOTE**: The [DONE] handler is inside transform() which is sync. We need to make transform return a Promise or restructure. Actually, looking at the code, transform() doesn't return anything - it just calls controller methods. We can use fire-and-forget for finalize here, or move all finalization to flush().

**DECISION**: Move ALL provider finalization to flush() only. This is cleaner and avoids async issues in transform().

Revised Step 6: In [DONE] handling, just mark a flag:
```typescript
// Check for stream end marker
if (jsonStr === "[DONE]") {
  // Note: Provider finalization happens in flush()
  // Just proceed with existing logic

  // Send reasoning_complete if we had reasoning content
  // ... existing logic unchanged
}
```

## Verification Checklist

- [ ] Imports compile without errors
- [ ] Feature flag controls provider creation correctly
- [ ] ReasoningProvider callbacks enqueue events properly
- [ ] Legacy path still works when flag is off
- [ ] Provider is destroyed in both success and error paths
- [ ] No memory leaks from stored controller reference
- [ ] reasoning_step events still emitted correctly
- [ ] reasoning_status events have consistent format

## Testing

1. Set `USE_REASONING_PROVIDER=false` → verify legacy behavior unchanged
2. Set `USE_REASONING_PROVIDER=true` → verify ReasoningProvider generates status
3. Test with Chrome DevTools MCP:
   - Navigate to localhost:8080
   - Send a chat message that triggers reasoning (complex question)
   - Verify reasoning_status events in Network tab
   - Verify no console errors

## Rollback

If issues arise:
1. Set `USE_REASONING_PROVIDER=false` in environment
2. Legacy direct-parsing path will be used
3. No code changes needed for rollback
