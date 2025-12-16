# Reasoning Display Verification Checklist

## Quick Reference: What Should Be Fixed

**Before Recent Commits**:
- Tool-calling path showed "No reasoning" because it emitted wrong event types
- Reasoning disappeared after streaming if tool had no new reasoning
- Tool execution failures lost all reasoning context
- Parser failures resulted in blank reasoning sections

**After Recent Commits**:
- Tool-calling path emits structured steps with fallback to raw text
- Reasoning persists through tool execution lifecycle
- Tool failures preserve initial reasoning
- Parser failures show raw thinking text as fallback

---

## Verification Tests

### Test 1: Basic Chat with Reasoning (No Tools)

**Setup**: Standard chat mode, no tool calls

**Steps**:
```bash
1. Clear browser cache
2. Start dev server: npm run dev
3. Open http://localhost:8080
4. Type: "Create a React counter component with Tailwind"
5. Wait for streaming to complete
```

**Expected Results**:
```
✓ "Show thought process" pill appears during streaming
✓ Spinner shows with "Thinking..." or semantic status
✓ Timer counts up while streaming
✓ Dropdown shows structured reasoning steps
✓ Each step has title and bullet points
✓ Message saved with reasoning_steps in database
```

**Verification**:
```typescript
// Check browser console for:
[StreamProgress] Received reasoning step 1: "Analyzing requirements"
[StreamProgress] Received reasoning step 2: "Planning structure"
[StreamProgress] Reasoning complete: 2 steps, 1234 chars raw text

// Check database:
SELECT reasoning_steps FROM chat_messages WHERE id = '...';
-- Should see: {"steps": [{"title": "...", "items": [...]}, ...], "summary": "..."}
```

---

### Test 2: Tool-Calling with Reasoning (Web Search)

**Setup**: Enable tool calling, trigger web search

**Steps**:
```bash
1. Type: "Search for React hooks best practices and explain"
2. Wait for search execution
3. Wait for final response
```

**Expected Results**:
```
✓ Initial reasoning shown while searching
✓ Pill shows "Searching web..." during tool execution
✓ Found N sources message appears
✓ Final reasoning shown after search completes
✓ Dropdown contains both initial + continuation reasoning
✓ All reasoning visible even with tool in between
```

**Verification**:
```typescript
// Check logs for complete event sequence:
[...] 🧠 Sent reasoning step 1: "..." (initial phase)
[...] ✅ GLM stream complete: reasoning=..., steps=1
[...] 🔧 Tool-calling chat: Detected native tool_call
[...] 🧠 Tool result context (from tool execution)
[...] 🔧 Continuing GLM with tool result
[...] 🧠 Sent reasoning step 2: "..." (continuation phase)
[...] ✅ GLM continuation complete: ..., steps=1
[...] 🧠 Sent reasoning_complete for 2 steps (total)

// Check database:
SELECT reasoning_steps FROM chat_messages WHERE id = '...';
-- Should have 2 steps in array
```

---

### Test 3: Continuation with No New Reasoning (Commit 1068e15 Fix)

**Setup**: Tool execution returns results but GLM produces no new reasoning

**Steps**:
```bash
1. Type: "Search for 'simple greeting' and reply briefly"
2. Wait for search and completion
```

**Expected Behavior** (Commit 1068e15 Fix):
```
✓ Initial reasoning visible before tool execution
✓ Tool executes and completes
✓ Response generated from tool results (no new reasoning text)
✓ Dropdown still shows initial reasoning (NOT blank)
✓ No "No reasoning data available" message
```

**Verification**:
```typescript
// Check logs:
[...] 🧠 Sent reasoning step 1: "..." (initial)
[...] ✅ GLM continuation complete: content=..., steps=0  ← No new steps
[...] 🧠 Sent reasoning_complete for 1 steps (total)  ← Still sent!
       └─ This is the fix: "|| accumulatedSteps.length > 0" condition

// NOT seeing:
// [StreamProgress] Reasoning complete: 0 steps  ← Would indicate loss
```

---

### Test 4: Tool Failure Path (Commit 1068e15 Fix)

**Setup**: Trigger web search that fails or times out

**Steps**:
```bash
1. Type something that would fail search (or simulate timeout)
2. Watch error handling
```

**Expected Behavior** (Commit 1068e15 Fix):
```
✓ Initial reasoning shown during search attempt
✓ Search fails with error message
✓ Initial reasoning NOT lost (dropdown still has content)
✓ Error message displayed to user
✓ Message saved with initial reasoning intact
```

**Verification**:
```typescript
// Check logs for:
[...] 🧠 Sent reasoning step 1: "..." (initial)
[...] ✅ GLM stream complete: ..., steps=1
[...] 🔧 Tool execution failed: ...
[...] 🧠 Sent reasoning_complete for 1 steps (tool failure path)
       └─ This line should appear even on failure!

// NOT seeing:
// [StreamProgress] Reasoning complete: 0 steps  ← Would indicate loss
```

---

### Test 5: Parser Failure - Raw Text Fallback (Commit c496e18 Fix)

**Setup**: GLM produces reasoning that doesn't parse into structured steps

**Steps**:
```bash
1. Type: "Think step by step about a complex problem but without explicit markers"
2. Wait for streaming
3. Click "Show thought process" dropdown
```

**Expected Results** (Commit c496e18 Fix):
```
✓ Pill shows "Show thought process" (no steps extracted)
✓ Dropdown shows raw thinking text (NOT blank)
✓ Text formatted with preserved line breaks
✓ Text is sanitized (no XSS risk)
✓ Message saved with reasoning field populated
```

**Verification**:
```typescript
// Check logs:
[StreamProgress] Reasoning complete: 0 steps, 2456 chars raw text
                                     ^ 0 steps (parser didn't extract)
                                               ^ but raw text captured!

// Check database:
SELECT reasoning, reasoning_steps FROM chat_messages WHERE id = '...';
-- reasoning: "actual thinking text here..." (populated!)
-- reasoning_steps: null or {"steps": [], "summary": "..."}

// Check UI rendering:
// <div className="whitespace-pre-wrap">  ← Line 511 in ReasoningDisplay.tsx
//   {sanitizedStreamingText}              ← Raw text displayed as fallback
// </div>
```

---

### Test 6: Streaming Text via Progress Updates (Commit c496e18 Fix)

**Setup**: Monitor progress updates during reasoning

**Steps**:
```bash
1. Open DevTools Console
2. Type: "Create a component"
3. Monitor logs in real-time
```

**Expected Output**:
```typescript
[StreamProgress] Received reasoning step 1: "Analyzing requirements"
[StreamProgress] Received reasoning step 2: "Planning implementation"
[StreamProgress] Reasoning complete: 2 steps, 1500 chars raw text
                                           ^ captured here (Commit c496e18)
```

**Verification**:
```typescript
// Check that streamingReasoningText is included in progress:
// From line 1241 in useChatMessages.tsx:
progress.streamingReasoningText = reasoningText;  // ← Should be set

// Then in ReasoningDisplay.tsx rendering logic (line 511):
{hasStreamingText && sanitizedStreamingText && !hasStructuredContent && (
  <div className="whitespace-pre-wrap text-sm text-muted-foreground">
    {sanitizedStreamingText}  ← Should render raw text here
  </div>
)}
```

---

### Test 7: Database Persistence

**Setup**: Send a message with reasoning, then reload the page

**Steps**:
```bash
1. Send: "Create a React component"
2. Wait for completion
3. Open DevTools → Application → Storage → View database
4. Reload page (F5)
5. View the saved message
```

**Expected Results**:
```
✓ Message appears in chat history
✓ "Show thought process" pill visible
✓ Dropdown shows reasoning (from database)
✓ Works both for structured steps AND raw text
```

**Verification**:
```sql
-- Check the database directly:
SELECT
  id,
  content,
  reasoning,
  reasoning_steps,
  created_at
FROM chat_messages
ORDER BY created_at DESC
LIMIT 1;

-- Expected columns populated:
-- id: UUID
-- content: Full response text
-- reasoning: Raw text (500 chars) or null
-- reasoning_steps: {"steps": [...], "summary": "..."} or null
-- created_at: Timestamp
```

---

### Test 8: Reasoning During Artifact Generation

**Setup**: Generate an artifact and watch reasoning

**Steps**:
```bash
1. Type: "Create a todo app"
2. Watch streaming while artifact generates
3. Wait for artifact to render
4. Click "Show thought process"
```

**Expected Results**:
```
✓ Reasoning shown while artifact generating
✓ Pill changes from "Rendering the generated artifact..." to final status
✓ Timer persists
✓ Dropdown shows full reasoning after render
✓ Steps include artifact-related planning
```

**Verification**:
```typescript
// From line 310-312 in ReasoningDisplay.tsx:
if (!isStreaming && !artifactRendered) {
  return "Rendering the generated artifact...";  // Shown during render phase
}

// After render completes:
// artif.tsx prop: artifactRendered = true
// Pill updates to show final reasoning
// Dropdown accessible with full content
```

---

### Test 9: Edge Case - Multiple Rapid Messages

**Setup**: Send multiple messages in succession

**Steps**:
```bash
1. Type message 1 (don't wait for completion)
2. Type message 2
3. Wait for both to complete
```

**Expected Results**:
```
✓ Each message has independent reasoning
✓ No reasoning confusion between messages
✓ Both messages saved with correct reasoning
✓ Dropdowns show correct reasoning per message
```

**Verification**:
```sql
-- Check that each message has distinct reasoning:
SELECT
  session_id,
  role,
  SUBSTR(content, 1, 50) as content_preview,
  SUBSTR(reasoning, 1, 50) as reasoning_preview
FROM chat_messages
ORDER BY created_at DESC
LIMIT 5;

-- Each should have unique reasoning_preview
```

---

### Test 10: Guest vs Authenticated User Reasoning

**Setup**: Test both guest and authenticated flows

**Steps - Guest**:
```bash
1. Incognito window
2. Type: "Create a component"
3. Wait for completion
4. Reload page
```

**Steps - Authenticated**:
```bash
1. Login with test account
2. Type: "Create a component"
3. Wait for completion
4. Reload page
```

**Expected Results**:
```
✓ Guest: Reasoning shown, lost on reload (local state only)
✓ Authenticated: Reasoning shown AND persists on reload (database)
✓ Both show full reasoning experience while streaming
```

**Verification**:
```typescript
// Check saveMessage function (line 255-334):
if (isGuest || !sessionId) {
  // Local state only - reasoning in guestMessage
  const guestMessage: ChatMessage = {
    reasoning: reasoning || null,  // Set from passed reasoningText
    reasoning_steps: validatedReasoningSteps,
  };
  setMessages((prev) => [...prev, guestMessage]);
} else {
  // Database save
  const { data } = await supabase
    .from("chat_messages")
    .insert({
      reasoning,              // ← reasoningText passed here
      reasoning_steps: validatedReasoningSteps,
    });
}
```

---

## Console Log Verification

### Expected Log Sequence

**Normal chat (no tools)**:
```
[StreamProgress] Received reasoning step 1: "..."
[StreamProgress] Received reasoning step 2: "..."
...
[StreamProgress] Reasoning complete: N steps, X chars raw text
[StreamProgress] Reasoning status: "..."
[content_chunk] ...
[artifact_complete] streamingReasoningText length: X
[useChatMessages] message saved
```

**Tool-calling flow**:
```
[...] 🧠 Sent reasoning step 1: "..." (tool-calling-chat.ts)
[...] ✅ GLM stream complete: reasoning=..., content=..., steps=1
[...] 🔧 Detected native tool_call
[...] [Tool execution logs]
[...] 🔧 Continuing GLM with tool result
[...] 🧠 Sent reasoning step 2: "..." (continuation)
[...] ✅ GLM continuation complete: content=..., steps=1
[...] 🧠 Sent reasoning_complete for 2 steps (total)
[StreamProgress] Reasoning complete: 2 steps, X chars raw text
```

### Key Indicators of Regression

❌ **Would indicate problems**:
```
- [StreamProgress] Reasoning complete: 0 steps, 0 chars raw text
  → Both structured AND raw text empty (shouldn't happen)

- Missing: "🧠 Sent reasoning_step" logs
  → No reasoning being parsed (tool-calling-chat issue)

- Missing: "reasoning_complete" log
  → Event never sent to frontend

- [content_chunk] only, no reasoning logs
  → Tool-calling path not emitting reasoning events

- Dropdown shows "No reasoning data available"
  → Fallback rendering failed (UI issue)
```

---

## Chrome DevTools Verification

### Network Tab
```
1. Open DevTools → Network tab
2. Filter: Fetch/XHR
3. Send message
4. Click on /chat request
5. Switch to Response tab
6. Look for event stream lines:

data: {"type":"reasoning_step",...}
data: {"type":"reasoning_status",...}
data: {"type":"content_chunk",...}
data: {"type":"reasoning_complete",...}

✓ All event types should appear
✓ reasoning_complete should have both:
  - reasoning: string
  - reasoningSteps: { steps: [], summary: "" }
```

### Application Tab (Storage)
```
1. Open DevTools → Application → Storage
2. Expand: Supabase project → chat_messages table
3. Send message and wait for save
4. Refresh the local database view
5. Click latest message
6. Inspect columns:

✓ reasoning: text (500 chars max)
✓ reasoning_steps: JSON object
✓ content: full response
✓ created_at: timestamp
```

### Console Tab
```
1. Open DevTools → Console
2. Filter for: "[StreamProgress]", "[useChatMessages]", "🧠"
3. Send message
4. Monitor logs in real-time

✓ Should see step detection logs
✓ Should see reasoning_complete log
✓ Should see reasoning text length logged
✓ No warnings about "Invalid reasoning steps"
```

---

## Regression Test Suite

```bash
# Run these to detect regressions:

npm run test -- ReasoningDisplay.test.tsx         # UI rendering
npm run test -- useChatMessages.test.tsx          # Hook logic
npm run test -- ReasoningDisplayFiltering.test.tsx # Fallback logic
npm run test -- ReasoningDisplayGLM.test.tsx      # GLM-specific rendering

# Check coverage:
npm run test:coverage

# Key coverage areas:
- ReasoningDisplay.tsx: Must cover fallback rendering (line 511-523)
- useChatMessages.tsx: Must cover reasoning_complete handler (line 1228-1245)
- saveMessage: Must cover reasoning parameter (line 282, 302)
```

---

## Performance Checklist

```
✓ No memory leaks when streaming (timeouts cleared)
✓ Reasoning status throttled to 800ms (not overwhelming UI)
✓ Database queries complete within 2-5 seconds
✓ UI doesn't freeze during reasoning parsing
✓ Chat remains responsive during tool execution
✓ Multiple rapid messages don't cause conflicts
✓ Page reload doesn't lose authenticated reasoning
```

---

## Accessibility Verification

```
✓ Reasoning pill has proper ARIA labels
  - aria-label="AI is thinking" (streaming)
  - aria-expanded (when expandable)
  - aria-controls="reasoning-expanded-content"

✓ Keyboard navigation works
  - Tab to pill, Enter/Space to expand
  - Expand/collapse with keyboard

✓ Screen reader announces
  - "AI is thinking" during streaming
  - Reasoning content when expanded
  - "Thought process" when complete

✓ Timer is accessible
  - Visible to screen readers
  - Semantic HTML structure
```

---

## Final Checklist: All Commits Working Together

- [x] Commit 8d3a4cb: Native tool calling enabled
- [x] Commit 7b79f8d: Reasoning parsing in tool path working
- [x] Commit 1068e15: Edge cases (no new reasoning, tool failure) handled
- [x] Commit c496e18: Raw text fallback functional
- [x] Fallback chain complete: steps → raw text → old format → empty
- [x] Database persistence working
- [x] UI rendering all fallback scenarios
- [x] No regressions detected in existing functionality
- [x] All edge cases covered
- [x] Accessibility maintained
