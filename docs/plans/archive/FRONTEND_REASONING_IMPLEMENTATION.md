# Frontend Reasoning UI Implementation Plan

**Date:** 2025-12-21
**Goal:** Update the frontend to handle new SSE events and display Claude-style reasoning UI with auto-expand/auto-scroll behavior.

## Reference Implementation

Location: `/Users/nick/Projects/llm-chat-site/.claude/plans/claude_style_reasoning_guide/`
- `useGLMChat-hook.ts` - Event handling reference
- `ThinkingPanel-component.tsx` - UI component reference

---

## 1. Gap Analysis

### 1.1 Event Handling Comparison

#### Reference Hook Events (useGLMChat-hook.ts)
- ✅ `thinking_start` - Triggers auto-expand
- ✅ `status` - Updates semantic status for ticker
- ✅ `thinking_delta` - Accumulates reasoning content
- ✅ `thinking_end` - Stops duration timer
- ✅ `thinking_complete` - Final reasoning data
- ✅ `text_delta` - Response content streaming

#### Current Hook Events (useChatMessages.tsx)
- ✅ `status_update` (line 716) - Semantic status from GLM-4.5-Air
- ✅ `reasoning_step` (line 750) - Structured reasoning steps
- ✅ `thinking_update` (line 810) - Generic thinking updates
- ✅ `reasoning_chunk` (line 844) - Raw reasoning chunks
- ✅ `reasoning_complete` (line 870) - Final reasoning
- ✅ `content_chunk` (line 915) - Content streaming
- ✅ `artifact_complete` (line 954) - Final artifact data

**Verdict:** ⚠️ **EVENT NAMING MISMATCH** - Current implementation has equivalent *concepts* but different *event names*. Backend Plan introduces new event names (`thinking_start`, `thinking_delta`, `status`, `thinking_end`, `thinking_complete`, `text_start`) that require NEW handlers in `useChatMessages.tsx`. See Section 2.0 for required changes.

### 1.2 State Structure Comparison

#### Reference State (useGLMChat-hook.ts, lines 79-84)
```typescript
const [thinking, setThinking] = useState<ThinkingState>({
  isThinking: boolean;
  content: string;
  status: string;
  duration: number;
});
```

#### Current State (useChatMessages.tsx, lines 98-102)
```typescript
export interface StreamProgress {
  stage: GenerationStage;
  message: string;
  artifactDetected: boolean;
  percentage: number;
  reasoningSteps?: StructuredReasoning; // Structured steps
  streamingReasoningText?: string; // Raw text
  reasoningStatus?: string; // Semantic status
  searchResults?: WebSearchResults;
  toolExecution?: ToolExecution;
}
```

**Verdict:** Current state is richer (has structured steps, tool execution, search results). Mapping needed:
- `isThinking` → `isLoading` (already exists)
- `content` → `streamingReasoningText` (already exists)
- `status` → `reasoningStatus` (already exists)
- `duration` → Calculated by `useReasoningTimer` hook (already exists)

### 1.3 UI Behavior Comparison

#### Reference Behavior (ThinkingPanel-component.tsx)
- ✅ **Auto-expand** (lines 74-85): Expands when `isThinking` becomes `true`
- ✅ **Auto-scroll** (lines 87-92): Scrolls to bottom while streaming content
- ✅ **Duration timer** (useGLMChat-hook.ts, lines 129-136): `setInterval` updating every 1s
- ✅ **Ticker displays status** (line 187): Shows `status` prop in collapsed state
- ✅ **Expanded shows content** (line 259): Shows `content` prop in expanded panel

#### Current Behavior (ReasoningDisplay.tsx)
- ❌ **No auto-expand**: User must manually click to expand
- ❌ **No auto-scroll**: Content doesn't scroll while streaming
- ✅ **Duration timer** (line 62): Uses `useReasoningTimer` hook
- ✅ **Ticker displays status** (lines 108-158): Shows `reasoningStatus` or phase-based message
- ⚠️ **Expanded shows structured steps**: Shows `StructuredReasoning` steps, not raw `content`

**Verdict:** Missing auto-expand and auto-scroll behaviors.

---

## 2. Changes Required

### ⚠️ CRITICAL: New SSE Event Handlers Required

**The Backend Plan introduces NEW event names that the frontend must handle:**

| Backend Event (New) | Frontend Handler Needed | Maps To |
|---------------------|------------------------|---------|
| `thinking_start` | ❌ **ADD HANDLER** | Set `isStreaming=true`, trigger auto-expand |
| `thinking_delta` | ❌ **ADD HANDLER** | Append to `streamingReasoningText` |
| `status` | ❌ **ADD HANDLER** | Set `reasoningStatus` (replaces legacy `reasoning_status`) |
| `thinking_end` | ❌ **ADD HANDLER** | Mark thinking phase complete |
| `thinking_complete` | ❌ **ADD HANDLER** | Final reasoning data (replaces `reasoning_complete`) |
| `text_start` | ❌ **ADD HANDLER** | Mark content phase started |
| `text_end` | ❌ **ADD HANDLER** | Mark content phase complete |

**Note**: Deploy frontend BEFORE backend to avoid event mismatch. No backward compatibility layer needed since we control both ends.

---

### 2.0 useChatMessages.tsx - Add New Event Handlers

#### File: `/Users/nick/Projects/llm-chat-site/src/hooks/useChatMessages.tsx`

**Location:** After line ~870 (inside the event handler switch statement)

**Add these new case handlers:**

```typescript
// ==========================================
// Claude-style Lifecycle Events (NEW)
// ==========================================

case 'thinking_start':
  // Thinking phase has begun
  console.log('[useChatMessages] 🧠 Thinking started');
  setProgress(prev => ({
    ...prev,
    stage: 'reasoning' as GenerationStage,
    message: 'Thinking...',
  }));
  break;

case 'thinking_delta':
  // Raw reasoning content streaming
  if (data.content) {
    setProgress(prev => ({
      ...prev,
      streamingReasoningText: (prev.streamingReasoningText || '') + data.content,
    }));
  }
  break;

case 'status':
  // Semantic status update from reasoning extraction
  // NOTE: Deploy frontend BEFORE backend to avoid event mismatch
  // Backend will emit 'status' (new) instead of 'reasoning_status' (old)
  if (data.description) {
    setProgress(prev => ({
      ...prev,
      reasoningStatus: data.description,
      message: data.description,
    }));
  }
  break;

case 'thinking_end':
  // Thinking phase complete, content phase starting
  console.log('[useChatMessages] 🧠 Thinking ended, duration:', data.duration);
  // Duration can be used for final display
  break;

case 'thinking_complete':
  // Final reasoning data (replaces reasoning_complete)
  // This marks the definitive end of the thinking phase
  console.log('[useChatMessages] 🧠 Thinking complete:', data.duration, 's');
  setProgress(prev => ({
    ...prev,
    // Update with final thinking content if provided
    streamingReasoningText: data.thinking || prev.streamingReasoningText,
    // Clear the "thinking" stage indicator (equivalent to isThinking: false)
    stage: prev.stage === 'reasoning' ? 'streaming' : prev.stage,
    message: prev.stage === 'reasoning' ? 'Generating response...' : prev.message,
  }));
  // Note: Duration is available as data.duration for final display
  break;

case 'text_start':
  // Content streaming phase has begun
  setProgress(prev => ({
    ...prev,
    stage: 'streaming' as GenerationStage,
    message: 'Generating response...',
  }));
  break;

case 'text_end':
  // Content streaming phase has ended
  console.log('[useChatMessages] 💬 Content phase ended, finish_reason:', data.finish_reason);
  // No state change needed - stream completion handled by [DONE] event
  break;
```

**Deployment Order:** Deploy frontend FIRST, then backend. This ensures frontend is ready for new events before backend starts emitting them. Remove old handlers (`reasoning_status`, `reasoning_chunk`, `reasoning_complete`) after backend is deployed.

---

### 2.1 ReasoningDisplay.tsx Modifications

#### File: `/Users/nick/Projects/llm-chat-site/src/components/ReasoningDisplay.tsx`

**Change 1: Auto-expand on streaming start (BEHAVIOR CHANGE)**

> ⚠️ **BEHAVIOR CHANGE**: The current code collapses the panel to reset state at stream start.
> We're changing this to EXPAND instead, matching Claude.ai's UX pattern.

**Location:** After line 102 (after existing useEffects)

**Add/Fix:**
```typescript
// Auto-expand when streaming starts (Claude-style behavior)
// BEHAVIOR CHANGE: Previous code collapsed to reset state; now we expand instead
useEffect(() => {
  if (isStreaming && !wasStreamingRef.current) {
    // Just started streaming - auto-expand
    setIsExpanded(true);
    wasStreamingRef.current = true;  // Mark that we've handled this transition
  } else if (!isStreaming && wasStreamingRef.current) {
    // Streaming ended - reset ref for next session
    wasStreamingRef.current = false;
  }
}, [isStreaming]);
```

**Change 2: Add contentRef for auto-scroll**

> ⚠️ **IMPORTANT**: React hooks must be declared at the top level, before any conditional returns.
> In ReasoningDisplay.tsx, there's a conditional return at lines 162-164. The `contentRef` must be declared BEFORE this.

**Location:** Near line 59 (alongside other refs like `wasStreamingRef`)

**Add:**
```typescript
// Add alongside other refs (around line 59)
const contentRef = useRef<HTMLDivElement>(null);
```

**Change 3: Add auto-scroll effect**

**Location:** After the auto-expand useEffect (around line 102)

**Add:**
```typescript
// Auto-scroll content to bottom while streaming (Claude-style)
useEffect(() => {
  if (isStreaming && isExpanded && contentRef.current) {
    // Scroll to bottom as new content arrives
    contentRef.current.scrollTop = contentRef.current.scrollHeight;
  }
}, [streamingReasoningText, isStreaming, isExpanded]);
```

**Change 4: Wire contentRef to expanded panel**

**Location:** Line 292 (expanded content container)

**Replace:**
```typescript
// BEFORE (line 292):
<div className={cn(
  "pt-3 px-4 pb-4",
  "rounded-2xl",
  "bg-muted/30",
  "border border-border/40",
  "max-h-[50vh] overflow-y-auto"
)}>

// AFTER:
<div
  ref={contentRef}  // Add ref for auto-scroll
  className={cn(
    "pt-3 px-4 pb-4",
    "rounded-2xl",
    "bg-muted/30",
    "border border-border/40",
    "max-h-[50vh] overflow-y-auto"
  )}
>
```

**Change 5: Add streaming cursor for raw text**

**Location:** After line 311 (inside `sanitizedStreamingText` block)

**Add:**
```typescript
{sanitizedStreamingText ? (
  <div className={cn(
    "whitespace-pre-wrap text-sm text-muted-foreground",
    "leading-relaxed"
  )}>
    {sanitizedStreamingText}
    {/* Streaming cursor while active */}
    {isStreaming && (
      <span className="inline-block w-1.5 h-4 ml-0.5 bg-orange-500/60 animate-pulse" />
    )}
  </div>
) : /* ... rest of conditionals ... */}
```

**Note:** This cursor already exists at line 308-310, so verify it's properly positioned.

### 2.2 useChatMessages.tsx State Structure

#### File: `/Users/nick/Projects/llm-chat-site/src/hooks/useChatMessages.tsx`

> **CLARIFICATION**: This section describes STATE STRUCTURE (no changes needed).
> Section 2.0 above describes EVENT HANDLERS (changes required - add new handlers).

**State structure is already compatible** - no changes needed:
- `isStreaming` → Maps to reference `isThinking`
- `streamingReasoningText` → Maps to reference `content`
- `reasoningStatus` → Maps to reference `status`
- Duration is calculated by `useReasoningTimer` hook

**Existing event handlers (lines 656-1006)** - these will be REPLACED by new handlers from Section 2.0:
- `status_update` (line 716) → **REPLACED BY** `status` handler
- `reasoning_step` (line 750) → Keep (structured steps)
- `thinking_update` (line 810) → **REPLACED BY** `thinking_start`/`thinking_end`
- `reasoning_chunk` (line 844) → **REPLACED BY** `thinking_delta`
- `reasoning_complete` (line 870) → **REPLACED BY** `thinking_complete`

---

## 3. Implementation Code Snippets

### 3.1 Auto-Expand Logic (BEHAVIOR CHANGE)

```typescript
// Add to ReasoningDisplay.tsx after line 102
// BEHAVIOR CHANGE: Previous code collapsed; now we expand (Claude-style)
useEffect(() => {
  if (isStreaming && !wasStreamingRef.current) {
    // Just started streaming - auto-expand
    setIsExpanded(true);
    wasStreamingRef.current = true;  // Mark transition handled
  } else if (!isStreaming && wasStreamingRef.current) {
    // Streaming ended - reset ref for next session
    wasStreamingRef.current = false;
  }
}, [isStreaming]);
```

### 3.2 Auto-Scroll with contentRef

```typescript
// STEP 1: Declare ref at top level (near line 59, BEFORE conditional returns)
const contentRef = useRef<HTMLDivElement>(null);

// STEP 2: Add effect after auto-expand effect (around line 102)
// Auto-scroll to bottom while streaming
useEffect(() => {
  if (isStreaming && isExpanded && contentRef.current) {
    contentRef.current.scrollTop = contentRef.current.scrollHeight;
  }
}, [streamingReasoningText, isStreaming, isExpanded]);
```

### 3.3 Wire contentRef to DOM

```typescript
// Modify line 292 in ReasoningDisplay.tsx
<div
  ref={contentRef}  // <-- Add this ref
  className={cn(
    "pt-3 px-4 pb-4",
    "rounded-2xl",
    "bg-muted/30",
    "border border-border/40",
    "max-h-[50vh] overflow-y-auto"
  )}
>
  {/* existing content rendering */}
</div>
```

### 3.4 Streaming Cursor (verify existing)

```typescript
// Verify line 308-310 has streaming cursor
{isStreaming && (
  <span className="inline-block w-1.5 h-4 ml-0.5 bg-orange-500/60 animate-pulse" />
)}
```

---

## 4. Testing Checklist

### 4.1 Auto-Expand Behavior

- [ ] **Test:** Start artifact generation with explicit artifact button
- [ ] **Expected:** Reasoning panel expands automatically when `isStreaming` becomes `true`
- [ ] **Verify:** Panel is expanded BEFORE reasoning text appears
- [ ] **Edge case:** Verify panel doesn't collapse/re-expand on rapid re-renders

### 4.2 Auto-Scroll Behavior

- [ ] **Test:** Generate artifact with long reasoning text (>500 chars)
- [ ] **Expected:** Content scrolls to bottom as new chunks arrive
- [ ] **Verify:** User sees latest reasoning without manual scrolling
- [ ] **Edge case:** User can manually scroll up, but auto-scroll resumes when new content arrives

### 4.3 Ticker Status Updates

- [ ] **Test:** Watch ticker pill during artifact generation
- [ ] **Expected:** Shows semantic status from `status_update` events (priority)
- [ ] **Fallback:** Shows phase-based messages when no semantic status available
- [ ] **Verify:** Status doesn't flash/flicker (stable phase detection)

### 4.4 Duration Timer

- [ ] **Test:** Watch timer badge during generation
- [ ] **Expected:** Timer increments every 1s while `isStreaming` is true
- [ ] **Verify:** Timer freezes when streaming ends
- [ ] **Verify:** Clock icon appears when streaming ends (line 264)

### 4.5 Expand/Collapse Interaction

- [ ] **Test:** Click chevron to collapse during streaming
- [ ] **Expected:** Panel collapses but streaming continues
- [ ] **Verify:** Ticker still updates with status
- [ ] **Edge case:** Manually collapse, then start new generation → auto-expands again

### 4.6 Streaming Cursor

- [ ] **Test:** Watch expanded panel during streaming
- [ ] **Expected:** Orange pulsing cursor appears after reasoning text
- [ ] **Verify:** Cursor disappears when streaming ends
- [ ] **Edge case:** Cursor doesn't appear in ticker (only expanded view)

### 4.7 Content Rendering

- [ ] **Test:** Generate artifact, expand reasoning panel
- [ ] **Expected:** Shows raw reasoning text in monospace font
- [ ] **Verify:** Text wraps properly, no horizontal scroll
- [ ] **Verify:** Structured steps (if available) render without Zod validation errors

### 4.8 Race Condition Prevention

- [ ] **Test:** Rapidly start/stop multiple generations
- [ ] **Expected:** Panel state stays consistent (no stuck expanded/collapsed)
- [ ] **Verify:** `wasStreamingRef` prevents state desync
- [ ] **Edge case:** Abort generation mid-stream → panel stays in correct state

---

## 5. Performance Considerations

### 5.1 Auto-Scroll Throttling

**Current implementation:** Auto-scroll runs on EVERY `streamingReasoningText` change (line dependency).

**Optimization (if needed):**
```typescript
// Throttle auto-scroll to max 60fps
const lastScrollTimeRef = useRef<number>(0);

useEffect(() => {
  const now = Date.now();
  if (isStreaming && isExpanded && contentRef.current && now - lastScrollTimeRef.current > 16) {
    contentRef.current.scrollTop = contentRef.current.scrollHeight;
    lastScrollTimeRef.current = now;
  }
}, [streamingReasoningText, isStreaming, isExpanded]);
```

**Note:** Only add if profiling shows scroll jank.

### 5.2 Content Sanitization

**Current implementation:** `useMemo` for sanitized content (lines 67-74).

**Good:** Already optimized, no changes needed.

### 5.3 Auto-Expand Effect Dependencies

**Current implementation:** Uses `wasStreamingRef` to track state transitions.

**Good:** Prevents re-expanding on every render, only on `isStreaming` transition.

---

## 6. Accessibility Notes

### 6.1 ARIA Attributes (Already Present)

- ✅ `aria-expanded` (line 203) - Screen reader support for expand/collapse
- ✅ `aria-controls` (line 204) - Links button to expanded content
- ✅ `aria-label` (line 205) - Descriptive label for screen readers
- ✅ `aria-live="polite"` (line 206) - Announces streaming updates
- ✅ `aria-busy` (line 207) - Indicates loading state

### 6.2 Keyboard Navigation (Already Present)

- ✅ `tabIndex={0}` (line 196) - Keyboard focusable when expandable
- ✅ `onKeyDown` handler (lines 197-202) - Enter/Space to toggle
- ✅ `role="button"` (line 195) - Semantic button role

**No accessibility changes needed.**

---

## 7. Edge Cases & Gotchas

### 7.1 Auto-Expand Race Condition

**Issue:** If `isStreaming` flips `true` → `false` → `true` rapidly, panel may not expand.

**Solution:** Use `wasStreamingRef` to track transitions (already implemented at line 59).

### 7.2 Auto-Scroll User Override

**Issue:** User manually scrolls up, but auto-scroll yanks them back to bottom.

**Solution (future enhancement):**
```typescript
// Detect user scroll vs auto-scroll
const userScrolledUpRef = useRef(false);

const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
  const target = e.currentTarget;
  const isAtBottom = target.scrollHeight - target.scrollTop === target.clientHeight;
  userScrolledUpRef.current = !isAtBottom;
};

useEffect(() => {
  if (isStreaming && isExpanded && contentRef.current && !userScrolledUpRef.current) {
    contentRef.current.scrollTop = contentRef.current.scrollHeight;
  }
}, [streamingReasoningText, isStreaming, isExpanded]);
```

**Note:** Only add if users complain about forced scrolling.

### 7.3 Content Overflow Height

**Current:** `max-h-[50vh]` (line 297) limits panel to 50% viewport height.

**Good:** Prevents panel from covering entire screen on short reasoning.

### 7.4 Streaming Cursor Position

**Current:** Cursor appears at line 308-310 inside `sanitizedStreamingText` block.

**Verify:** Cursor should be AFTER text, not before. Check DOM structure during testing.

---

## 8. Rollout Plan

### Phase 1: Core Implementation (Day 1)
1. Add auto-expand effect to `ReasoningDisplay.tsx`
2. Add `contentRef` and auto-scroll effect
3. Wire `contentRef` to expanded panel DOM
4. Run basic functional tests (checklist 4.1, 4.2, 4.5)

### Phase 2: Polish & Verification (Day 1-2)
1. Verify streaming cursor placement (checklist 4.6)
2. Test ticker status updates (checklist 4.3)
3. Test duration timer behavior (checklist 4.4)
4. Run edge case tests (checklist 4.5, 4.8)

### Phase 3: Performance Testing (Day 2-3)
1. Profile auto-scroll performance with long reasoning text
2. Add throttling if scroll jank detected (section 5.1)
3. Test with slow network (simulate with DevTools)

### Phase 4: Production Deploy (Day 3)
1. Deploy to staging environment
2. Run full test suite (all checklists)
3. Monitor Sentry for errors
4. Deploy to production if no regressions

---

## 9. Success Criteria

- [x] Reasoning panel auto-expands when streaming starts
- [x] Content auto-scrolls to bottom while streaming
- [x] Ticker shows semantic status from AI Commentator
- [x] Duration timer updates every 1s during streaming
- [x] Streaming cursor appears in expanded view
- [x] No race conditions during rapid start/stop
- [x] No accessibility regressions
- [x] No performance degradation (scroll jank)

---

## 10. Files Modified Summary

| File | Changes | Lines Modified |
|------|---------|----------------|
| `/Users/nick/Projects/llm-chat-site/src/components/ReasoningDisplay.tsx` | Add auto-expand effect | After line 102 |
| `/Users/nick/Projects/llm-chat-site/src/components/ReasoningDisplay.tsx` | Add contentRef + auto-scroll effect | After auto-expand effect |
| `/Users/nick/Projects/llm-chat-site/src/components/ReasoningDisplay.tsx` | Wire contentRef to DOM | Line 292 |
| `/Users/nick/Projects/llm-chat-site/src/components/ReasoningDisplay.tsx` | Verify streaming cursor | Line 308-310 |
| `/Users/nick/Projects/llm-chat-site/src/hooks/useChatMessages.tsx` | **Add 6 new event handlers** (Section 2.0) | After line ~870 |

---

## 11. Dependencies & Compatibility

### Existing Hooks
- ✅ `useReasoningTimer` (line 62) - Already provides duration
- ✅ `useEffect` (React 18.3.1) - Standard hooks
- ✅ `useRef` (React 18.3.1) - Standard hooks
- ✅ `useMemo` (React 18.3.1) - Already used for sanitization

### No New Dependencies Required
- ✅ All functionality uses existing React primitives
- ✅ No new npm packages needed
- ✅ No breaking changes to parent components

---

## 12. Rollback Plan

If implementation causes regressions:

1. **Immediate rollback:**
   ```bash
   git revert <commit-hash>
   npm run build
   ./scripts/deploy-simple.sh prod
   ```

2. **Partial rollback (disable auto-expand only):**
   ```typescript
   // Comment out auto-expand effect in ReasoningDisplay.tsx
   // useEffect(() => {
   //   if (isStreaming && !wasStreamingRef.current) {
   //     setIsExpanded(true);
   //   }
   // }, [isStreaming]);
   ```

3. **Feature flag (future enhancement):**
   ```typescript
   // Add to featureFlags.ts
   REASONING_AUTO_EXPAND: false,
   REASONING_AUTO_SCROLL: false,
   ```

---

## 13. Future Enhancements

### 13.1 User Scroll Override
Detect when user manually scrolls up and disable auto-scroll until they scroll to bottom again (see section 7.2).

### 13.2 Auto-Collapse After Completion
Reference implementation has commented-out auto-collapse (ThinkingPanel line 83):
```typescript
// Optionally auto-collapse after thinking ends
// setTimeout(() => setIsExpanded(false), 2000);
```

**Recommendation:** Leave collapsed by default (matches current UX).

### 13.3 Smooth Scroll Animation
Replace instant scroll with smooth animation:
```typescript
contentRef.current.scrollTo({
  top: contentRef.current.scrollHeight,
  behavior: 'smooth'
});
```

**Note:** May cause performance issues with rapid updates.

---

## 14. Questions & Answers

**Q: Why add new SSE events like `thinking_start`?**
A: The Backend Plan introduces Claude-style lifecycle events (`thinking_start`, `thinking_delta`, `status`, `thinking_end`, `thinking_complete`, `text_start`). These MUST be handled by the frontend for the UI to work correctly. See Section 2.0 for the required handlers.

**Q: Should we switch from structured steps to raw text display?**
A: No. Current implementation shows structured steps (Claude-like) in expanded view, which is superior to raw text. Keep it.

**Q: What if auto-expand disrupts users who prefer manual control?**
A: Reference implementation (Claude) uses auto-expand as expected behavior. Users can manually collapse if desired.

**Q: Should auto-scroll be optional?**
A: No. It's standard behavior for streaming content (chat apps, terminals). Users can scroll up if needed.

---

## 15. Implementation Checklist

- [ ] Read through entire plan and understand all changes
- [ ] Create feature branch: `git checkout -b feat/reasoning-ui-claude-style`
- [ ] **⚠️ CRITICAL: Add 7 new event handlers to `useChatMessages.tsx`** (Section 2.0)
  - [ ] `thinking_start` handler
  - [ ] `thinking_delta` handler
  - [ ] `status` handler
  - [ ] `thinking_end` handler
  - [ ] `thinking_complete` handler
  - [ ] `text_start` handler
  - [ ] `text_end` handler
- [ ] Implement auto-expand effect in `ReasoningDisplay.tsx`
- [ ] Implement auto-scroll with `contentRef`
- [ ] Wire `contentRef` to expanded panel DOM
- [ ] Verify streaming cursor placement
- [ ] Run all functional tests (section 4)
- [ ] Run performance tests (section 5)
- [ ] **Coordinate with Backend deployment** - deploy simultaneously to avoid event mismatch
- [ ] Update tests if needed (verify no regressions)
- [ ] Create PR with before/after screenshots
- [ ] Deploy to staging and verify
- [ ] Deploy to production
- [ ] Monitor Sentry for 24h post-deploy

---

**End of Implementation Plan**
