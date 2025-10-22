# Manual Chat Testing Guide

## Quick Test (2 minutes)

### Prerequisites
All services should be running (already done ✅):
- Backend: http://localhost:8000
- ADK: http://localhost:8080
- Frontend: http://localhost:3000

### Test Steps

1. **Open Chat Interface**
   - Navigate to: http://localhost:3000
   - You should see the Vana chat interface

2. **Send a Test Message**
   - Type: "Hello, can you help me with a simple task?"
   - Click Send or press Enter

3. **✅ What to Look For (GOOD)**
   - Streaming text appears gradually
   - Text is properly formatted (markdown if applicable)
   - No raw JSON like `{"content": "text"}` or `{"parts": [...]}`
   - Progress indicators show (e.g., "Thinking...", "Processing...")

4. **❌ What to Avoid (BAD - JSON Display Issue)**
   - Raw JSON objects displayed in chat bubbles
   - Text like: `{"role": "assistant", "content": "..."}`
   - Stringified objects: `[object Object]`
   - Parts arrays: `[{"text": "..."}]`

5. **Check Browser Console** (Optional)
   - Press F12 or Cmd+Option+I
   - Look at Console tab
   - Check for errors (red text)
   - Check Network tab for failed requests

### Expected Behavior

**Good Response Example:**
```
User: Hello, can you help me?
Assistant: Hello! I'd be happy to help you. What task would you like assistance with?
```

**Bad Response Example (JSON Issue):**
```
User: Hello, can you help me?
Assistant: {"content": "Hello! I'd be happy to help.", "role": "assistant"}
```

### Advanced Testing (Optional)

1. **Test SSE Streaming**
   - Send: "Generate a research plan about renewable energy"
   - Watch for real-time streaming updates
   - Check that partial responses appear smoothly

2. **Test Progress Messages**
   - Send a complex query
   - Look for progress indicators
   - Verify they update in real-time

3. **Test Error Handling**
   - Send: "Test error handling"
   - Check that errors display user-friendly messages
   - No raw error objects/stack traces

### Debugging (If Issues Found)

**If you see JSON in chat:**
1. Check browser console for extraction errors
2. Look for messages starting with `[ADK]`
3. Note which event type triggered the JSON display
4. Report the event type and JSON structure

**If SSE not working:**
1. Open Network tab (F12 → Network)
2. Filter by "eventsource" or "SSE"
3. Check if connection is established
4. Look for "run_sse" endpoint

**Common Issues:**
- ❌ `Error: Failed to fetch` - Backend not running (check port 8000)
- ❌ `EventSource failed` - SSE endpoint issue (check `/api/sse/`)
- ❌ JSON displayed - Content extraction issue (report to devs)
- ❌ No streaming - Check `ENABLE_ADK_CANONICAL_STREAM=true` in backend

### After Testing

**If everything works:**
- No action needed! Chat is working correctly ✅

**If JSON appears:**
- Take a screenshot
- Copy the console logs
- Share with development team
- We'll improve the content extraction logic

---

## Chrome DevTools MCP Setup (For Automated Testing)

The Chrome DevTools MCP is configured but requires Claude Code restart:

```bash
# After restart, Chrome DevTools will be available
# Configuration is at: ~/.claude.json
# Command: npx chrome-devtools-mcp@latest --isolated
```

**To restart Claude Code:**
1. Exit Claude Code completely
2. Reopen Claude Code
3. The `mcp__chrome-devtools__*` tools will be available