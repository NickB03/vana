# Implementation Plan: Intent Confirmation Events

**Goal**: Provide immediate user feedback when the AI decides to use a tool, without modifying the system prompt or risking hallucinations.

**Approach**: Add a deterministic `intent_confirmation` SSE event that fires immediately after tool call detection, providing natural-language confirmation without LLM generation latency.

---

## Why This Approach?

### Problems with Modifying System Prompt (Original Plan)

1. **Architectural Incompatibility**: Gemini's native function calling doesn't naturally support "text then tool call" in a single turn
2. **Hallucination Risk**: Removing "TOOL MUST BE CALLED FIRST" rule could let the model claim creation without actually calling tools
3. **Latency**: LLM-generated confirmation adds 500ms-2s delay
4. **Redundancy**: System already sends `status_update` events

### Benefits of Deterministic Confirmation Events

1. **Zero Latency**: Event fires immediately when tool call is detected (no LLM generation)
2. **No Risk**: Safety rule stays intact; confirmation only sent AFTER tool call is confirmed
3. **Consistent**: Same message format every time, predictable UX
4. **Extensible**: Easy to add more context (estimated time, tool-specific details)
5. **Frontend Control**: UI can style/animate confirmations independently from status updates

---

## Architecture Overview

```
User Message → Gemini processes → Tool call detected
                                        ↓
                              intent_confirmation event ← NEW
                                        ↓
                              tool_call_start event (existing)
                                        ↓
                              Tool executes...
                                        ↓
                              tool_result event (existing)
```

---

## Proposed Changes

### Backend: `supabase/functions/chat/handlers/tool-calling-chat.ts`

**Location**: After tool call detection (around line 660-690)

**Change**: Add `intent_confirmation` event immediately after detecting a tool call, before sending `tool_call_start`.

```typescript
// After detecting tool call (line ~660)
if (toolCalls && toolCalls.length > 0) {
  nativeToolCallDetected = true;
  detectedNativeToolCall = { /* ... existing code ... */ };

  // NEW: Send intent confirmation immediately
  const intentMessage = getIntentConfirmationMessage(
    toolCalls[0].name,
    toolCalls[0].arguments
  );
  sendEvent({
    type: 'intent_confirmation',
    message: intentMessage,
    toolName: toolCalls[0].name,
    timestamp: Date.now(),
  });

  // Existing: status update and tool_call_start events follow...
}
```

**New Helper Function** (add to same file or extract to utility):

```typescript
/**
 * Generate natural-language intent confirmation based on tool and arguments.
 * Deterministic - no LLM call required.
 */
function getIntentConfirmationMessage(
  toolName: string,
  args: Record<string, unknown>
): string {
  switch (toolName) {
    case 'generate_artifact': {
      const artifactType = (args.artifactType as string) || 'component';
      const prompt = (args.prompt as string) || '';

      // Extract key noun from prompt for natural confirmation
      const keyNoun = extractKeyNoun(prompt) || artifactType;

      return `I'll build ${addArticle(keyNoun)} for you...`;
    }

    case 'generate_image': {
      const prompt = (args.prompt as string) || 'image';
      const mode = (args.mode as string) || 'generate';

      if (mode === 'edit') {
        return `I'll edit that image for you...`;
      }

      const subject = extractImageSubject(prompt) || 'that';
      return `I'll create an image of ${subject} for you...`;
    }

    case 'browser.search': {
      const query = (args.query as string) || '';
      const topic = extractSearchTopic(query) || 'that';

      return `I'll search for information about ${topic}...`;
    }

    default:
      return `I'll help you with that...`;
  }
}

/**
 * Extract the main noun/subject from a prompt for natural confirmation.
 * Simple heuristic - can be enhanced over time.
 */
function extractKeyNoun(prompt: string): string | null {
  // Common patterns: "a todo app", "an interactive dashboard", "the calculator"
  const patterns = [
    /(?:build|create|make|design)\s+(?:me\s+)?(?:a|an|the)\s+([a-z]+(?:\s+[a-z]+)?)/i,
    /(?:a|an|the)\s+([a-z]+(?:\s+[a-z]+)?)\s+(?:app|component|dashboard|page|chart)/i,
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) {
      return match[1].toLowerCase();
    }
  }

  return null;
}

/**
 * Add appropriate article (a/an) to a noun.
 */
function addArticle(noun: string): string {
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const article = vowels.includes(noun[0]?.toLowerCase()) ? 'an' : 'a';
  return `${article} ${noun}`;
}

/**
 * Extract subject from image generation prompt.
 */
function extractImageSubject(prompt: string): string | null {
  // Simple extraction - first few meaningful words
  const cleaned = prompt
    .replace(/^(generate|create|draw|make|paint)\s+/i, '')
    .replace(/^(a|an|the)\s+/i, '')
    .split(/[,.]/)0]
    .trim()
    .slice(0, 40); // Limit length

  return cleaned || null;
}

/**
 * Extract topic from search query.
 */
function extractSearchTopic(query: string): string | null {
  // Remove common prefixes
  const cleaned = query
    .replace(/^(what is|how to|why|when|where|who)\s+/i, '')
    .replace(/\?$/, '')
    .trim()
    .slice(0, 50); // Limit length

  return cleaned || null;
}
```

### Frontend: Handle New Event Type

**Location**: `src/hooks/useChat.ts` or wherever SSE events are processed

**Change**: Add handler for `intent_confirmation` event type.

```typescript
case 'intent_confirmation':
  // Display the confirmation message in chat UI
  // This appears BEFORE the artifact/image starts generating
  setIntentConfirmation({
    message: event.message,
    toolName: event.toolName,
    timestamp: event.timestamp,
  });
  break;
```

**UI Rendering**: The confirmation message can be displayed as:
- A subtle chat bubble from the assistant
- An inline status message above the generating artifact
- A toast/notification (less recommended - interrupts flow)

### SSE Event Type Definition

**Location**: Add to shared types (e.g., `src/types/sse.ts` or similar)

```typescript
interface IntentConfirmationEvent {
  type: 'intent_confirmation';
  message: string;      // "I'll build a todo app for you..."
  toolName: string;     // "generate_artifact"
  timestamp: number;
}
```

---

## Event Sequence (After Implementation)

```
1. User: "Build me a todo app"
2. → Gemini processes (reasoning streaming)
3. → Tool call detected: generate_artifact
4. → SSE: { type: 'intent_confirmation', message: "I'll build a todo app for you..." }
5. → SSE: { type: 'status_update', status: 'Planning your interactive component...' }
6. → SSE: { type: 'tool_call_start', toolName: 'generate_artifact', ... }
7. → Tool executes (artifact generation)
8. → SSE: { type: 'status_update', status: 'Building your react...' }
9. → SSE: { type: 'artifact_complete', ... }
10. → SSE: { type: 'tool_result', ... }
11. → Gemini continuation (post-tool explanation)
12. → SSE: { type: 'done' }
```

---

## Verification Plan

### Manual Testing

1. **Artifact Generation**:
   - Request: "Build me a todo app"
   - Expected: See "I'll build a todo app for you..." immediately before artifact generation starts

2. **Image Generation**:
   - Request: "Generate an image of a sunset over mountains"
   - Expected: See "I'll create an image of a sunset over mountains for you..."

3. **Web Search**:
   - Request: "Search for the latest React 19 features"
   - Expected: See "I'll search for information about latest React 19 features..."

4. **Timing Verification**:
   - Confirm intent_confirmation appears BEFORE tool_call_start
   - Confirm no noticeable delay (should be <10ms between detection and event)

### Automated Testing

**New Integration Test**: `supabase/functions/_shared/__tests__/intent-confirmation.test.ts`

```typescript
import { getIntentConfirmationMessage } from '../intent-confirmation.ts';

describe('getIntentConfirmationMessage', () => {
  it('generates artifact confirmation with extracted noun', () => {
    const message = getIntentConfirmationMessage('generate_artifact', {
      artifactType: 'react',
      prompt: 'Build me a todo app with drag and drop',
    });
    expect(message).toBe("I'll build a todo app for you...");
  });

  it('generates image confirmation with subject', () => {
    const message = getIntentConfirmationMessage('generate_image', {
      prompt: 'A sunset over mountains with purple sky',
    });
    expect(message).toContain('sunset over mountains');
  });

  it('generates search confirmation with topic', () => {
    const message = getIntentConfirmationMessage('browser.search', {
      query: 'What are the latest Next.js features?',
    });
    expect(message).toBe("I'll search for information about latest Next.js features...");
  });

  it('handles missing arguments gracefully', () => {
    const message = getIntentConfirmationMessage('generate_artifact', {});
    expect(message).toBe("I'll build a component for you...");
  });
});
```

---

## Future Enhancements (Out of Scope)

Once this foundation is in place, future iterations could add:

1. **Estimated Time**: "I'll build a todo app for you... (usually takes 5-10 seconds)"
2. **Complexity Indicator**: "I'll build a complex dashboard for you... (this may take a moment)"
3. **Personalization**: Use conversation context for more natural phrasing
4. **Cancellation**: "I'll build a todo app for you... [Cancel]" button
5. **Confidence Indication**: Different phrasing based on model confidence in tool selection

---

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/chat/handlers/tool-calling-chat.ts` | Add intent_confirmation event + helper functions |
| `src/hooks/useChat.ts` (or SSE handler) | Handle new event type |
| `src/types/sse.ts` (or similar) | Add IntentConfirmationEvent type |
| `supabase/functions/_shared/__tests__/intent-confirmation.test.ts` | New test file |

---

## Rollback Plan

If issues arise:
1. Remove the `sendEvent({ type: 'intent_confirmation', ... })` call
2. Frontend gracefully ignores unknown event types (no change needed)
3. No system prompt changes to revert

---

## Success Criteria

- [ ] Intent confirmation appears within 50ms of tool call detection
- [ ] Message accurately reflects the tool being called
- [ ] No impact on tool execution latency
- [ ] No hallucination risk (safety rule unchanged)
- [ ] Frontend displays confirmation naturally in chat flow
- [ ] All existing tests pass
- [ ] New unit tests for confirmation message generation
