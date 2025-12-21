# DEBUG: Blank Response After Tool Call (RFC-001 Bug)

## Summary

**Status**: Root cause identified
**Severity**: Critical - Affects all tool continuations
**Date**: 2025-12-20
**Affected Code**: `supabase/functions/_shared/glm-client.ts:callGLMWithToolResult()`

The RFC-001 refactor introduced a critical bug where GLM's continuation response after a tool call is blank. The issue is a **missing assistant message with tool_calls in the conversation history**.

---

## Root Cause Analysis

### OpenAI-Compatible Tool Calling Sequence

The correct OpenAI format for tool calling requires this exact message sequence:

```
1. system: "You are a helpful assistant with tools..."
2. user: "User's question"
3. assistant: {
     content: null,
     tool_calls: [{ id: "call_123", function: { name: "browser.search", arguments: "{...}" } }]
   }
4. tool: {
     role: "tool",
     tool_call_id: "call_123",
     content: "Search results here..."
   }
5. assistant: "Based on the search results, here's my response..."
```

**Key requirement**: Steps 2-4 form an indivisible block. If you skip step 3 (the assistant's tool_calls message), GLM cannot properly understand the context.

### What the Current Code Does (BROKEN)

In `callGLMWithToolResult()` (line 944-953), when continuing after a tool call:

```typescript
const response = await callGLMWithRetry(
  originalSystemPrompt,    // system message
  originalUserPrompt,      // user message (PROBLEM: re-sending original user input!)
  {
    ...options,
    requestId,
    stream: true,
    toolResultContext      // tool message (missing assistant message!)
  }
);
```

The `callGLM()` function then builds messages as:

```typescript
const messages: GLMMessage[] = [
  { role: "system", content: systemPrompt },
  { role: "user", content: userPrompt }  // ◄── Re-sending original user input!
];

if (toolResultContext) {
  messages.push({
    role: "tool",           // ◄── Missing step 3: assistant's tool_calls
    tool_call_id: "call_123",
    content: "..."
  });
}
```

### The Missing Piece

There is **no assistant message** being injected with the original tool_calls that triggered the tool execution. GLM doesn't understand:
- Why there's a tool result
- What question it was trying to answer
- What the tool_call_id "call_123" was supposed to do

### Why This Breaks GLM's Continuation

GLM expects the conversation flow to be:

```
User: "What's the weather?"
[GLM realizes it needs to search]
Assistant: [generates tool call]
Tool: [returns search results]
[Now GLM continues based on search results]
```

But the current code sends:

```
User: "What's the weather?"
Tool: [search results appear out of nowhere with no context]
[GLM confused - why is there a tool result? What triggered it?]
→ Response is blank because GLM doesn't understand the context
```

---

## Evidence

### Console Logs Show the Bug

From the user's report, the logs show:

```
Tool call started: browser.search
Tool result received: browser.search - success
Web search results received                      ◄── Tool executed successfully
[But final assistant message is blank]
```

The tool executed correctly and returned results, but GLM produced a blank response.

### Message Construction Missing Assistant's Tool Call

**File**: `supabase/functions/_shared/glm-client.ts`
**Function**: `callGLM()`
**Lines**: 229-247

```typescript
const messages: GLMMessage[] = [
  { role: "system", content: systemPrompt },
  { role: "user", content: userPrompt }
  // ^^^ STOP HERE - where's the assistant's tool_call message?
];

if (toolResultContext) {
  messages.push({
    role: "tool",  // ◄── This appears with no preceding assistant message!
    tool_call_id: toolResultContext.toolCallId,
    content: toolResultContext.content
  });
}
```

**The problem**: The code needs to inject the original assistant's `tool_calls` message between the user message and the tool result message.

---

## Data Flow Diagram: Current (Broken)

```
User message: "What's the weather?"
        │
        ▼
[GLM called with tools enabled]
        │
        ▼
GLM Response: tool_calls=[{id: "call_123", function: "browser.search", ...}]
        │
        ├─────────────────────────────────────────────────────────┐
        │                                                         │
        ▼                                                         ▼
    Stream detected tool call              Tool executed successfully
        │                                          │
        └──────────────────┬───────────────────────┘
                           │
                           ▼
        callGLMWithToolResult(
          systemPrompt: "...",
          userPrompt: "What's the weather?",  ◄── ORIGINAL user input
          toolCall: { id: "call_123", name: "browser.search", args: {...} },
          toolResult: "Search results: ..."
        )
                           │
                           ▼
        callGLM() builds messages:
        [
          { role: "system", content: "..." },
          { role: "user", content: "What's the weather?" },  ◄── Why re-send this?
          { role: "tool", tool_call_id: "call_123", content: "..." }
        ]

        PROBLEM: No assistant message with tool_calls!
                           │
                           ▼
        GLM sees tool result but no context for why it was called
                           │
                           ▼
        Response: [BLANK] ◄── GLM confused, returns empty
```

---

## Root Cause (Technical Details)

### Why GLM Returns Blank

GLM's native function calling expects a specific protocol:

1. **First call**: User requests something → GLM analyzes and outputs `tool_calls`
2. **Tool execution**: System executes tool, gets results
3. **Second call**: System re-sends the **full conversation** including:
   - The original user message
   - GLM's assistant response with `tool_calls`
   - The tool message with results
   - GLM continues from there

The current code violates step 3 by:
- ❌ Not including GLM's original `tool_calls` response
- ❌ Not preserving conversation state
- ❌ Causing GLM to see orphaned tool results

### Why Search Results Aren't Appearing

The tool executed successfully, but because GLM doesn't have the context of:
- What question it was answering
- What tool it decided to call
- What the tool_call_id means

...it can't synthesize a response, so it returns blank.

---

## The Fix

### Option A: Pass Full Conversation History (RECOMMENDED)

Instead of re-building from scratch, pass the full conversation including the assistant's tool_calls:

```typescript
// In tool-calling-chat.ts, capture the assistant's response with tool_calls:
const streamResult = await processGLMStream(
  glmResponse,
  {...callbacks},
  requestId
);

// Now streamResult contains the full response, including tool_calls
// When continuing, pass this state to the continuation:
await callGLMWithToolResult(
  systemPrompt,
  userPrompt,
  toolCall,
  toolResult,
  callbacks,
  {
    ...options,
    // ADD: The assistant's original response with tool_calls
    previousAssistantResponse: {
      content: streamResult.content,
      tool_calls: streamResult.nativeToolCalls  // This is already captured!
    }
  }
);
```

Then in `callGLMWithToolResult()`:

```typescript
const messages: GLMMessage[] = [
  { role: "system", content: originalSystemPrompt },
  { role: "user", content: originalUserPrompt },
  // ADD: The assistant's tool call response
  {
    role: "assistant",
    content: null,  // No content when calling tools
    tool_calls: previousAssistantResponse.tool_calls  // Re-inject the tool_calls
  },
  // Now the tool result makes sense
  {
    role: "tool",
    tool_call_id: toolCall.id,
    content: toolResult
  }
];
```

### Option B: Store Conversation State in Handler

Modify `tool-calling-chat.ts` to maintain full conversation history:

```typescript
// At start of tool call handling:
const conversationHistory = [...messages];  // Full message history

// After detecting tool call and executing:
const toolResultMessages = [
  ...conversationHistory,
  {
    role: "assistant",
    content: null,
    tool_calls: [detectedNativeToolCall]  // The tool call that was made
  },
  {
    role: "tool",
    tool_call_id: toolCall.id,
    content: toolResult
  }
];

// When calling GLM with continuation, use full history
// (requires signature change to accept messages array instead of building inline)
```

---

## Files That Need Changes

1. **`supabase/functions/_shared/glm-client.ts`**
   - `CallGLMOptions` interface: Add field for previous assistant response or full conversation
   - `callGLM()`: Update message building to handle full conversation
   - `callGLMWithToolResult()`: Inject assistant's tool_calls message

2. **`supabase/functions/chat/handlers/tool-calling-chat.ts`**
   - Capture the assistant's response with tool_calls from stream
   - Pass full conversation state to `callGLMWithToolResult()`

3. **`supabase/functions/_shared/glm-client.ts`**
   - Add new type for conversation history with tool_calls
   - Update `callGLMWithRetry()` signature if needed

---

## Testing the Fix

### Manual Test Case

1. User sends: "What's the weather in San Francisco on Christmas day"
2. System detects tool call for `browser.search`
3. Tool executes and returns search results
4. GLM continuation is called with:
   - User message
   - **Assistant message with tool_calls** ← NEW
   - Tool message with results
5. GLM should respond: "Based on the search results, here's what I found about..."

### Expected Logs After Fix

```
[request-id] 🔧 Starting unified tool-calling chat
[request-id] 🔧 Native tool call detected: browser.search
[request-id] ✅ browser.search completed: 5 results in 1523ms
[request-id] 🔧 Continuing GLM with tool result (245 chars)
[request-id] 📊 Stream finish_reason: stop
[request-id] ✅ GLM continuation complete: content=450chars
[request-id] ✅ Tool-calling chat stream complete
```

The key difference: `content=450chars` instead of `content=0chars` or blank.

---

## Prevention: Testing Recommendations

Add integration tests to validate the message sequence:

```typescript
Deno.test({
  name: "Tool continuation includes assistant's tool_calls message",
  fn: async () => {
    // Mock: intercept the actual API call
    // Verify messages array contains:
    // 1. system message
    // 2. user message
    // 3. assistant message with tool_calls ← CRITICAL
    // 4. tool message with tool_call_id ← CRITICAL
    // 5. (no more messages - GLM will generate response)
  }
});
```

---

## References

- [OpenAI Function Calling Format](https://platform.openai.com/docs/guides/function-calling)
- [Z.ai GLM-4.6 API Docs](https://docs.z.ai/api-reference/llm/chat-completion)
- RFC-001: Tool Result Format Refactor (in codebase)
- Related Issue: Tool result continuations producing blank responses

---

## Next Steps

1. Review this analysis with team
2. Choose Option A (recommended) or Option B
3. Implement the fix in glm-client.ts and tool-calling-chat.ts
4. Add integration test to prevent regression
5. Deploy and verify with manual testing
6. Update RFC-001 documentation with lessons learned
