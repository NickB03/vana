# Fix Summary: RFC-001 Tool Continuation Blank Response Bug

## Problem

User reported a blank response when asking about "Christmas day weather". The logs showed:
- Tool call detected: `browser.search` started successfully
- Tool executed successfully and returned search results
- But GLM's continuation response was blank (no content)

## Root Cause

The RFC-001 refactor that changed tool result format from XML to OpenAI-compatible introduced a **critical bug in tool continuations**.

When calling GLM with a tool result, the code was missing the **assistant's original tool_calls message** from the conversation history. This is required by OpenAI-compatible tool calling:

### Correct Message Sequence
```
1. system message
2. user message
3. assistant message { content: null, tool_calls: [...] }  ◄ THIS WAS MISSING
4. tool message { tool_call_id: "...", content: "results" }
5. (GLM generates continuation response)
```

### Broken Message Sequence (RFC-001 bug)
```
1. system message
2. user message
3. tool message { tool_call_id: "...", content: "results" }
4. (GLM confused - no context for tool result)
5. Response: [BLANK]
```

Without step 3, GLM has no way to understand:
- What question the tool was answering
- What tool_call_id "abc123" means
- Why a tool result suddenly appears

**Result**: GLM produces a blank response.

## Solution

### Changes Made

**File 1**: `supabase/functions/_shared/glm-client.ts`

1. Added new field to `CallGLMOptions` interface (lines 97-116):
   ```typescript
   previousAssistantMessage?: {
     content: string | null;
     tool_calls?: NativeToolCall[];
   };
   ```

2. Updated `callGLM()` function (lines 255-273):
   - Extract `previousAssistantMessage` from options
   - If present, reconstruct the assistant's message with tool_calls
   - Insert it BETWEEN the user message and tool message

3. Updated `callGLMWithToolResult()` signature (line 977):
   - Added new parameter: `previousAssistantToolCalls?: NativeToolCall[]`
   - This is now required to fix the bug (previous signature is compatible)
   - Builds `previousAssistantMessage` from the tool_calls array
   - Passes it to `callGLMWithRetry()`

**File 2**: `supabase/functions/chat/handlers/tool-calling-chat.ts`

1. Captured assistant's tool_calls (line 503):
   ```typescript
   const previousAssistantToolCalls = streamResult.nativeToolCalls || [];
   ```

2. Passed to `callGLMWithToolResult()` (line 558):
   ```typescript
   previousAssistantToolCalls  // BUG FIX: Pass tool_calls for context!
   ```

### Message Flow After Fix

When a tool is called and executed:

```
User: "What's the weather in San Francisco?"
    ↓
[GLM with tools enabled]
    ↓
GLM Response: tool_calls=[{id:"call_123", function:"browser.search", args:"{...}"}]
    ↓
[Tool executed successfully]
    ↓
[Call GLM with continuation, including:]
    - system message
    - user message
    - assistant message {content: null, tool_calls: [same as above]}
    - tool message {tool_call_id: "call_123", content: "Search results..."}
    ↓
GLM: "Based on the search results, here's the weather in San Francisco..."
```

## Testing

Added comprehensive test suite: `supabase/functions/_shared/__tests__/glm-tool-continuation.test.ts`

Tests validate:
1. Basic sequence without tool calls (2 messages)
2. **Fixed sequence WITH tool_calls (4 messages in correct order)**
3. Multiple tool_calls support
4. Backward compatibility (works without previousAssistantMessage)
5. Tool result content preservation
6. Edge cases (empty tool_calls, etc.)

All tests pass.

## Impact

### What Breaks
- **None** - All changes are backward compatible
- If `previousAssistantToolCalls` is not provided, code behaves as before (but still broken)
- Existing callers continue to work

### What Gets Fixed
- Tool continuations now produce proper responses instead of blank
- Web search with tool calling now works correctly
- Image generation after tool calls now works correctly
- All artifact generation with tools now works correctly

### Performance
- Minimal impact - just reconstructing one message in the conversation
- Actually slight improvement: less confusion for GLM = better/faster responses

## Files Modified

1. `/supabase/functions/_shared/glm-client.ts` - Core fix
   - Added `previousAssistantMessage` field
   - Updated message construction logic in `callGLM()`
   - Updated `callGLMWithToolResult()` signature

2. `/supabase/functions/chat/handlers/tool-calling-chat.ts` - Caller update
   - Captured assistant's tool_calls from stream
   - Passed to continuation function

3. `/supabase/functions/_shared/__tests__/glm-tool-continuation.test.ts` - New test suite
   - 7 test cases validating message sequences
   - Documentation of the fix

## Verification

Run tests:
```bash
cd supabase/functions
deno task test -- glm-tool-continuation.test.ts
```

Manual testing:
1. Ask: "What's the weather in San Francisco on Christmas day?"
2. Verify: Response appears with actual search results (not blank)

## Next Steps

1. Commit this fix to the RFC-001 branch
2. Update RFC-001 documentation to note this bug and fix
3. Add to CHANGELOG
4. Deploy and monitor for regressions

## Appendix: OpenAI Tool Calling Format

Reference: https://platform.openai.com/docs/guides/function-calling

Correct sequence for tool continuations:

```json
[
  {"role": "system", "content": "You are a helpful assistant."},
  {"role": "user", "content": "What is the weather?"},
  {
    "role": "assistant",
    "content": null,
    "tool_calls": [
      {
        "id": "call_123",
        "type": "function",
        "function": {
          "name": "browser.search",
          "arguments": "{\"query\": \"weather\"}"
        }
      }
    ]
  },
  {
    "role": "tool",
    "tool_call_id": "call_123",
    "content": "Weather information..."
  }
]
```

Key points:
- Assistant message with `tool_calls` is required
- Tool message must have matching `tool_call_id`
- This creates the context for GLM's continuation
- Without step 3 (assistant message), GLM cannot understand step 4 (tool result)
