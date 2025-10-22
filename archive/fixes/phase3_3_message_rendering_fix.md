# Phase 3.3: Message Rendering Fix

**Status**: Root Cause Identified ✅
**Severity**: P0 - Blocks all chat functionality
**Date**: 2025-10-19

## Problem Summary

Chat messages aren't rendering in the UI despite successful SSE streaming. The UI shows "Thinking..." instead of displaying the actual assistant response.

## Root Cause Analysis

### Issue Location
`/frontend/src/hooks/chat/sse-event-handlers.ts` - Missing handler for ADK canonical `'message'` event type

### Evidence from Browser Testing

**Console Logs Show**:
```
[useSSE] Event block missing event type - raw block: data: {"content":{"parts":[{"text":"Hello there! It's nice to chat with you. How can I help you today?"}],"role":"model"}...
[useSSE] Received event: NO_EVENT_TYPE, payload length: 521 id: undefined
[useSSE] Detected ADK event structure - parsing as canonical
[useSSE] Parsed event type: message
```

**What's Working** ✅:
1. SSE connection established successfully
2. Backend sends response: "Hello there! It's nice to chat with you. How can I help you today?"
3. Events parsed correctly by `parseEventData()` in `useSSE.ts`
4. ADK event detection working (identifies canonical structure)
5. Events added to `researchSSE.lastEvent` with type `'message'`
6. Stream completes cleanly with completion marker

**What's Broken** ❌:
1. **Backend sends events WITHOUT `event:` field** - only `data:` field present
2. **Events default to type `'message'`** (fallback when no event type specified)
3. **`useSSEEventHandlers` switch statement doesn't handle `'message'` type**
4. Message content never extracted from event payload
5. Assistant message stuck at "Thinking..." placeholder

### Data Flow Pipeline

```
Backend SSE Stream
    ↓
data: {"content":{"parts":[{"text":"Hello there!..."}],"role":"model"}}
    ↓
useSSE.parseEventData() → Detects ADK structure
    ↓
parseAdkEventSSE() → Converts to AgentNetworkEvent
    ↓
type: 'message' (fallback, no event: field in SSE)
data: { textParts: ["Hello there!..."], ... }
    ↓
researchSSE.lastEvent updated
    ↓
useSSEEventHandlers.stableResearchEvent → Memoized
    ↓
useEffect in useSSEEventHandlers → switch(type)
    ↓
NO CASE FOR 'message' ❌
    ↓
No message update
    ↓
UI shows "Thinking..." forever
```

### Missing Handler

**Current Code** (`sse-event-handlers.ts` line 224-334):
```typescript
switch (type) {
  case 'research_started': { /* ... */ }
  case 'research_update':
  case 'research_progress': { /* ... */ }
  case 'research_complete': { /* ... */ }
  case 'error': { /* ... */ }
  case 'connection': { /* ... */ }
  case 'message_edited': { /* ... */ }
  case 'message_deleted': { /* ... */ }
  case 'feedback_received': { /* ... */ }
  case 'regeneration_progress': { /* ... */ }
  default:
    break; // ❌ 'message' events fall through here!
}
```

**Missing Case**:
```typescript
case 'message': {
  // Extract content from ADK event
  // Update streaming message with actual response
  // Complete message when final event received
}
```

## Solution

### Option 1: Add 'message' Event Handler (Recommended)

Add a new case to handle ADK canonical `'message'` events:

```typescript
case 'message': {
  if (!mountedRef.current) return;

  const messageId = ensureProgressMessage();

  // Extract content from ADK event using proper extraction
  const extractionResult = extractContentFromADKEvent(
    payload,
    currentSession?.messages.find(msg => msg.id === messageId)?.content || 'Processing...'
  );

  const content = extractionResult.content;

  if (messageId && mountedRef.current && content && content !== 'Processing...') {
    // Update message with extracted content
    updateStreamingMessageInStore(currentSessionId, messageId, content);

    // Check if this is the final response (has usageMetadata, not partial)
    const isFinalResponse =
      payload.usageMetadata &&
      !payload.partial &&
      payload.content?.role === 'model';

    if (isFinalResponse) {
      completeStreamingMessageInStore(currentSessionId, messageId);
      setSessionStreamingInStore(currentSessionId, false);
      setIsStreaming(false);
    }
  }
  break;
}
```

### Option 2: Backend Fix - Add event: Field

Modify backend to send proper SSE event types:

```python
# Backend: Add event type to SSE events
event: message
data: {"content":{"parts":[{"text":"..."}],"role":"model"}}
```

Then events would be parsed with correct type instead of falling back to 'message'.

## Recommended Fix

**Use Option 1** (Add 'message' handler) because:
1. ✅ Frontend-only change (faster to deploy)
2. ✅ Works with current backend implementation
3. ✅ Backward compatible with legacy events
4. ✅ Handles ADK canonical streaming correctly
5. ✅ Can be tested immediately in browser

## Testing Plan

1. **Browser Verification** (Chrome DevTools MCP):
   - Send chat message
   - Verify console shows message content extraction
   - Confirm UI updates from "Thinking..." to actual response
   - Check message state in localStorage

2. **Edge Cases**:
   - Multiple rapid messages
   - Long responses (streaming updates)
   - Error responses
   - Network interruptions

## Implementation Steps

1. Edit `/frontend/src/hooks/chat/sse-event-handlers.ts`
2. Add `case 'message':` to switch statement (after line 334)
3. Implement content extraction using `extractContentFromADKEvent`
4. Handle partial vs final responses
5. Test in browser with Chrome DevTools MCP
6. Verify localStorage updates
7. Check console for extraction logs

## Related Files

- `/frontend/src/hooks/chat/sse-event-handlers.ts` - Event handler (FIX HERE)
- `/frontend/src/hooks/useSSE.ts` - Event parsing (working correctly)
- `/frontend/src/hooks/chat/adk-content-extraction.ts` - Content extraction utility
- `/frontend/src/lib/streaming/adk/index.ts` - ADK event parser

## Success Criteria

- ✅ Assistant messages display actual response text
- ✅ "Thinking..." placeholder replaced with content
- ✅ Streaming updates show incremental content (if implemented)
- ✅ Final message marked as completed
- ✅ No console errors
- ✅ SSE stream completes cleanly
