# Reasoning Display Flow Diagrams

## Complete Data Flow: Tool-Calling Path

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND: tool-calling-chat.ts                   │
└─────────────────────────────────────────────────────────────────────────┘

1. INITIAL GLM CALL (with tools enabled)
   ├─ GLM generates reasoning chunks
   ├─ parseReasoningIncrementally() → detects structured steps
   ├─ fullReasoningAccumulated += chunk
   └─ accumulatedSteps: ReasoningStep[] populated

2. EVENT EMISSIONS (streaming phase)
   ├─ reasoning_step events
   │  ├─ type: 'reasoning_step'
   │  ├─ step: { title, items }
   │  ├─ stepIndex: number
   │  └─ currentThinking: string
   │
   ├─ reasoning_status events (throttled 800ms)
   │  ├─ type: 'reasoning_status'
   │  └─ content: extracted status text
   │
   └─ content_chunk events
      └─ Regular response content

3. TOOL CALL DETECTION
   ├─ Native tool_calls in response detected
   └─ nativeToolCallDetected = true

4. INITIAL COMPLETION (if tool detected)
   └─ Skip reasoning_complete (prevent duplicates)
      Commit 7b79f8d CodeReview fix

5. TOOL EXECUTION
   ├─ Format tool arguments
   ├─ Execute tool (e.g., web search)
   ├─ Get results
   │
   └─ [IF TOOL FAILS]
      ├─ Send reasoning_complete with initial accumulated steps
      │  Commit 1068e15 fix
      ├─ Send error message to user
      └─ Return early

6. CONTINUATION GLM CALL (with tool results)
   ├─ Reset continuation parsing state
   ├─ GLM continues generation
   ├─ Parse new reasoning chunks
   ├─ Emit reasoning_step (continuation phase)
   ├─ Emit reasoning_status (throttled)
   └─ Accumulate: continuationSteps

7. COMPLETION (continuation)
   ├─ Combine steps: [...accumulatedSteps, ...continuationSteps]
   ├─ Build structuredReasoning:
   │  └─ { steps: allSteps, summary: firstN(500) }
   │
   └─ Send reasoning_complete:
      ├─ type: 'reasoning_complete'
      ├─ reasoning: fullReasoning.substring(0, 500)
      ├─ reasoningSteps: structuredReasoning
      ├─ stepCount: total step count
      └─ timestamp: Date.now()

┌─────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND: useChatMessages.tsx                        │
└─────────────────────────────────────────────────────────────────────────┘

STREAM EVENT HANDLER (lines 1107-1425)
├─ for each event from server:
│
├─ [IF reasoning_step]
│  ├─ reasoningSteps = { ...reasoningSteps, steps: [...steps, newStep] }
│  ├─ progress.reasoningSteps = reasoningSteps
│  └─ onDelta('', progress)
│
├─ [IF reasoning_status]
│  ├─ progress.reasoningStatus = status
│  └─ onDelta('', progress)
│
├─ [IF reasoning_complete]  ← LINE 1228
│  ├─ IF parsed.reasoningSteps:
│  │  └─ reasoningSteps = parsed.reasoningSteps
│  │
│  ├─ IF parsed.reasoning:
│  │  └─ reasoningText = parsed.reasoning  ← LINE 1234 (Commit c496e18)
│  │
│  ├─ progress.reasoningSteps = reasoningSteps
│  ├─ progress.streamingReasoningText = reasoningText  ← LINE 1241
│  ├─ onDelta('', progress)
│  └─ continue (skip to next event)
│
├─ [IF content_chunk]
│  ├─ fullResponse += chunk
│  └─ emit text chunk
│
└─ [STREAM COMPLETE]
   ├─ Call saveMessage():
   │  ├─ role: "assistant"
   │  ├─ content: fullResponse
   │  ├─ reasoning: reasoningText  ← LINE 1424 (Commit c496e18)
   │  ├─ reasoningSteps: reasoningSteps
   │  └─ searchResults: searchResults
   │
   └─ setIsLoading(false)

SAVE MESSAGE FUNCTION (lines 255-334)
├─ Validate reasoning steps (parseReasoningSteps)
│
├─ [IF guest user]
│  └─ Add to local state only (guestMessage)
│
├─ [IF authenticated]
│  └─ INSERT into chat_messages:
│     ├─ session_id
│     ├─ role: "assistant"
│     ├─ content: fullResponse
│     ├─ reasoning: reasoningText  ← RAW TEXT SAVED
│     ├─ reasoning_steps: validatedReasoningSteps  ← STRUCTURED SAVED
│     └─ search_results
│
└─ setMessages([...prev, message])

PROGRESS REPORTING (lines 1118-1162)
├─ Called frequently during streaming
├─ Returns basic progress:
│  ├─ stage: "analyzing" | "planning" | "generating" | "finalizing"
│  ├─ message: string (human-readable stage)
│  ├─ artifactDetected: boolean
│  ├─ percentage: 0-100
│  └─ reasoningSteps: only when set in events
│
└─ BUT streamingReasoningText is set ONLY in reasoning_complete handler
   (dynamic property assignment after progress object created)
   ← CORRECT: Only final text included

┌─────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND: ChatInterface.tsx                          │
└─────────────────────────────────────────────────────────────────────────┘

STREAM DELTA HANDLER
├─ Receive: { chunk: string, progress: StreamProgress }
│
├─ [IF progress.reasoningSteps updated]
│  └─ Update streamProgress with new steps
│
├─ [IF progress.streamingReasoningText set]
│  └─ Update streamProgress with raw text
│
├─ [IF progress.reasoningStatus set]
│  └─ Update streamProgress with status
│
└─ Pass streamProgress to ReasoningDisplay:
   ├─ reasoningSteps
   ├─ streamingReasoningText
   ├─ reasoningStatus
   ├─ isStreaming: boolean
   └─ toolExecution: { toolName, success, sourceCount }

┌─────────────────────────────────────────────────────────────────────────┐
│                  FRONTEND: ReasoningDisplay.tsx (lines 73-542)          │
└─────────────────────────────────────────────────────────────────────────┘

RENDERING LOGIC - COLLAPSED STATE (pill)
├─ getStreamingStatus() [lines 256-295]
│  ├─ Priority 1: Tool execution status (if actively searching)
│  ├─ Priority 2: reasoningStatus from GLM-4.5-Air
│  ├─ Priority 3: Last structured step title
│  ├─ Priority 4: Extract status from streamingReasoningText
│  └─ Priority 5: Last known extracted text
│
├─ getPillLabel() [lines 304-336]
│  ├─ if expanded && !streaming: "Thought process"
│  ├─ if !streaming && !artifactRendered: "Rendering..."
│  ├─ if streaming: getStreamingStatus()
│  ├─ if after streaming with steps: lastStep.title
│  └─ if after streaming no steps: "View reasoning"
│
└─ Display:
   ├─ Spinner (if streaming) or Search icon (if tool running)
   ├─ Pill text (status or title)
   ├─ Timer (elapsed seconds)
   └─ Chevron (expand/collapse)

RENDERING LOGIC - EXPANDED STATE (dropdown)
├─ hasStreamingText = Boolean(streamingReasoningText?.length > 0)
├─ hasStructuredContent = validatedSteps?.steps?.length > 0
│
├─ Priority rendering [lines 482-537]:
│  │
│  ├─ [IF hasStructuredContent]
│  │  └─ Show full step layout:
│  │     ├─ Each step as heading + bullet points
│  │     ├─ items: step.items.map(item => <li>...)
│  │     └─ Sanitized via DOMPurify
│  │
│  ├─ [ELSE IF hasStreamingText]  ← LINE 511 (Commit c496e18)
│  │  └─ Show raw text:
│  │     ├─ whitespace-pre-wrap (preserve formatting)
│  │     ├─ Sanitized: sanitizeContent(streamingReasoningText)
│  │     └─ Animated cursor if still streaming
│  │
│  ├─ [ELSE IF sanitizedReasoning]
│  │  └─ Show old format: whitespace-pre-wrap
│  │
│  └─ [ELSE]
│     └─ "No reasoning data available."
│
└─ Close dropdown
   └─ setIsExpanded(false)

SANITIZATION (line 47-53)
├─ DOMPurify.sanitize()
├─ Allowed tags: b, i, em, strong, code, pre, span, p, ul, ol, li, blockquote, h1-h6
└─ ALLOWED_ATTR: ['class']
```

---

## State Machine: Reasoning Availability

```
START
  ↓
┌─────────────────────────────────────────┐
│ GLM generates reasoning chunks           │
│ Parse incrementally                      │
└─────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────┐
│ Emit reasoning_step events?              │
├─────────────────────────────────────────┤
│ YES → Steps detected and sent            │
│ NO  → No structured steps (free text)    │
└─────────────────────────────────────────┘
  ↙                                     ↖
[Steps Available]              [No Steps Available]
  │                                    │
  ├─► Store in accumulatedSteps        ├─► Accumulate fullReasoningAccumulated
  │    reasoningStepsSent++             │
  │    ...continue...                   │
  │                                     │
  ├─────────────────────────────────────┤
  │ Tool call detected?                 │
  ├─────────────────────────────────────┤
  │ NO: Send reasoning_complete         │
  │     (all steps + summary)           │
  │     ↓                               │
  │     DONE (non-tool path)            │
  │                                     │
  │ YES: Continue with tool execution   │
  └─────────────────────────────────────┘
  │
  ├─ Execute tool (e.g., web search)
  │
  └─ Tool execution outcome:
     ├─ [SUCCESS]
     │  └─ Continue GLM with results
     │     ├─ Parse new reasoning chunks (optional)
     │     ├─ Emit continuation reasoning_step events
     │     ├─ Combine: [...accumulatedSteps, ...continuationSteps]
     │     └─ Send reasoning_complete
     │         (all steps + summary)
     │
     └─ [FAILURE]
        ├─ Send reasoning_complete FIRST
        │  (with initial accumulated steps)  ← LINE 542-559 (Commit 1068e15)
        ├─ Then send error message
        └─ Return early
```

---

## Fallback Chain: Display Priority

```
DATA ARRIVAL PHASE
═══════════════════════════════════════════════════════════════════

reasoning_complete event arrives
  ├─ reasoning: "raw text of thinking" (500 chars max)  ← reasoningText
  ├─ reasoningSteps: { steps: [...], summary: "..." }  ← reasoningSteps
  ├─ stepCount: number
  └─ timestamp: Date.now()

FRONTEND CAPTURES
══════════════════════════════════════════════════════════════════

reasoningSteps = structuredReasoning     [Has steps?]
reasoningText = reasoning field          [Has raw text?]


DISPLAY RESOLUTION PHASE
═════════════════════════════════════════════════════════════════

IF  reasoningSteps?.steps?.length > 0
    ├─ hasStructuredContent = true
    └─ RENDER: Full step layout
        ├─ Each step: <h4>{step.title}</h4>
        └─ Items: <ul><li>...</li></ul>

ELSE IF streamingReasoningText?.length > 0  ← LINE 511 (Commit c496e18)
    ├─ hasStreamingText = true
    └─ RENDER: Raw text fallback
        ├─ <div className="whitespace-pre-wrap">
        └─ {sanitizedStreamingText}

ELSE IF reasoning?.length > 0
    ├─ sanitizedReasoning exists
    └─ RENDER: Old format fallback
        ├─ <div className="whitespace-pre-wrap">
        └─ {sanitizedReasoning}

ELSE
    └─ RENDER: Empty fallback
        └─ "No reasoning data available."
```

---

## Bug Fix Timeline: Before → After

```
BEFORE COMMIT 8d3a4cb (Native Function Calling)
═════════════════════════════════════════════════════════════════
Tool-calling handler:
├─ Single streaming handler for all events
├─ Emits raw reasoning_chunk events only
├─ No structured step parsing
└─ Frontend receives nothing → "No reasoning"
PROBLEM: Blank reasoning in dropdown

─────────────────────────────────────────────────────────────────

AFTER COMMIT 7b79f8d (Reasoning Parsing in Tool Path)
═════════════════════════════════════════════════════════════════
Tool-calling handler:
├─ Callback-based architecture (onReasoningChunk, etc.)
├─ Parse reasoning incrementally in tool handler
├─ Emit reasoning_step events (structured)
├─ Emit reasoning_status events (ticker)
├─ Emit reasoning_complete event (final)
└─ Frontend receives structured data → displays in dropdown
IMPROVEMENT: Structured reasoning now visible

─────────────────────────────────────────────────────────────────

BEFORE COMMIT 1068e15 (Edge Case Handling)
═════════════════════════════════════════════════════════════════
Tool-calling handler:
├─ Continuation with no new reasoning
│  ├─ Condition: fullReasoning.length > 0 || continuationStepsSent > 0
│  └─ FALSE → reasoning_complete never sent
│      → Initial reasoning lost after stream ends
│
└─ Tool fails
   ├─ No reasoning_complete sent
   └─ Initial reasoning lost
PROBLEM: Reasoning disappears in edge cases

─────────────────────────────────────────────────────────────────

AFTER COMMIT 1068e15 (Edge Case Fixes)
═════════════════════════════════════════════════════════════════
Tool-calling handler:
├─ Continuation with no new reasoning
│  ├─ Condition: ... || accumulatedSteps.length > 0
│  └─ TRUE → reasoning_complete sent with initial steps
│      → Initial reasoning preserved
│
└─ Tool fails
   ├─ Send reasoning_complete for initial reasoning FIRST
   └─ Initial reasoning preserved
IMPROVEMENT: Edge cases handled

─────────────────────────────────────────────────────────────────

BEFORE COMMIT c496e18 (Raw Reasoning Fallback)
═════════════════════════════════════════════════════════════════
Chat streaming handler:
├─ reasoning_complete event arrives
├─ Extract structured steps only
├─ If parser fails: steps = []
├─ Save: reasoningSteps (empty), reasoning (null)
└─ Frontend: dropdown shows empty
PROBLEM: No fallback when parser fails

─────────────────────────────────────────────────────────────────

AFTER COMMIT c496e18 (Raw Text Fallback)
═════════════════════════════════════════════════════════════════
Chat streaming handler:
├─ reasoning_complete event arrives
├─ Extract structured steps
├─ ALSO capture raw reasoning text
├─ Save: reasoningSteps (empty), reasoning (raw text)
└─ Frontend: dropdown shows raw text as fallback
IMPROVEMENT: Fallback rendering chain complete

RENDERING CASCADE:
  Structured steps (if available)
    ├─ Full step layout ✓
    ↓
  Raw reasoning text (if steps fail to parse)
    ├─ Pre-wrapped text ✓
    ↓
  Old format reasoning field (if above missing)
    ├─ Pre-wrapped text ✓
    ↓
  Empty fallback
    └─ "No reasoning data available."
```

---

## Edge Case Coverage

```
CASE 1: Normal stream (no tools)
════════════════════════════════════════════════════════════════
Flow:
├─ GLM generates reasoning
├─ Parse into structured steps
├─ Emit reasoning_step events (progressive)
├─ Emit reasoning_complete with all steps
└─ Save structured reasoning to database

Result: ✅ Full structured reasoning shown

─────────────────────────────────────────────────────────────────

CASE 2: Tool-calling with reasoning then results
════════════════════════════════════════════════════════════════
Flow:
├─ GLM generates reasoning (accumulatedSteps built)
├─ Skip initial reasoning_complete (tool detected)
├─ Execute tool
├─ GLM continues with tool results
├─ Parse continuation reasoning (continuationSteps)
├─ Combine steps: [...accumulatedSteps, ...continuationSteps]
├─ Emit reasoning_complete with all steps
└─ Save combined reasoning to database

Result: ✅ All reasoning (before + after tool) shown

─────────────────────────────────────────────────────────────────

CASE 3: Tool execution fails
════════════════════════════════════════════════════════════════
Flow:
├─ GLM generates reasoning (accumulatedSteps built)
├─ Skip initial reasoning_complete (tool detected)
├─ Execute tool → FAILS
├─ Check if accumulatedSteps.length > 0
├─ YES: Send reasoning_complete with initial steps FIRST
│       (Commit 1068e15 fix)
├─ Send error message to user
└─ Return early (no save, error state)

Result: ✅ Initial reasoning preserved and shown

─────────────────────────────────────────────────────────────────

CASE 4: Continuation produces NO new reasoning
════════════════════════════════════════════════════════════════
Flow:
├─ GLM generates reasoning (accumulatedSteps built)
├─ Skip initial reasoning_complete
├─ Execute tool → SUCCESS
├─ Continue GLM with results
├─ Continuation generates NO reasoning chunks
├─ continuationStepsSent = 0
├─ Condition check:
│  ├─ fullReasoning.length = 0 (continuation has nothing)
│  ├─ continuationStepsSent = 0 (no new steps)
│  ├─ accumulatedSteps.length > 0 (from initial)  ← Commit 1068e15 fix
│  └─ Send reasoning_complete with initial steps
└─ Save initial reasoning to database

Result: ✅ Initial reasoning not lost

─────────────────────────────────────────────────────────────────

CASE 5: Parser can't extract structured steps
════════════════════════════════════════════════════════════════
Flow:
├─ GLM generates free-form reasoning (no structured markers)
├─ Parser: accumulatedSteps = [] (no pattern matches)
├─ BUT fullReasoningAccumulated has raw text
├─ Emit reasoning_complete with:
│  ├─ reasoningSteps: { steps: [], summary: "" }
│  └─ reasoning: raw text (captured in reasoningText)
├─ Frontend receives both:
│  ├─ reasoningSteps = empty
│  └─ streamingReasoningText = raw text
└─ Display fallback: render raw text as fallback

Result: ✅ Raw text shown via fallback (Commit c496e18 fix)

─────────────────────────────────────────────────────────────────

CASE 6: User stops streaming mid-generation
════════════════════════════════════════════════════════════════
Flow:
├─ GLM generating reasoning
├─ User presses "Stop"
├─ AbortSignal aborts stream
├─ partial accumulatedSteps in memory
├─ No reasoning_complete event sent (stream cut)
├─ Error handler catches AbortError
├─ Message not saved (incomplete)
└─ User sees "Stream cancelled" message

Result: ✅ No blank reasoning in database

─────────────────────────────────────────────────────────────────
```

---

## Performance Characteristics

```
THROTTLING
═══════════════════════════════════════════════════════════════

reasoning_status events: 800ms throttle
├─ Prevents 100+ updates/second to ticker
├─ Final status always sent at completion
└─ Trade-off: Smooth ticker vs slight delay

reasoning_step events: No throttle
├─ Each new step emitted immediately
├─ Visual progression of structured steps
└─ Limited by parser (step detection rate)

reasoning_complete event: Single event
├─ Sent once per phase (initial or continuation)
└─ Contains all accumulated data


MEMORY MANAGEMENT
═════════════════════════════════════════════════════════════════

Backend state during streaming:
├─ accumulatedSteps: Array of ReasoningStep objects (50-100 typical)
├─ fullReasoningAccumulated: String (1-10KB typical)
├─ reasoningParseState: IncrementalParseState (small state machine)
└─ Cleaned up after reasoning_complete sent

Frontend state during streaming:
├─ reasoningSteps: { steps: [...], summary: "" } (mirrors backend)
├─ reasoningText: String (500 chars max at save)
├─ streamingReasoningSteps: Array (accumulates on receive)
└─ Cleared when new stream starts or message saved


DATABASE STORAGE
═════════════════════════════════════════════════════════════════

Per message:
├─ reasoning: text (500 char preview of raw reasoning)
├─ reasoning_steps: jsonb
│  ├─ steps: Array<{ title, items, ... }>
│  └─ summary: String (500 chars)
└─ Total: ~2-5KB per message typical
```
