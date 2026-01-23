# Status Ticker System - Implementation Summary

**Created**: 2026-01-23
**Status**: Design Complete - Ready for Implementation

---

## Overview

This document summarizes the robust status ticker system design that eliminates static "Thinking..." fallbacks and ensures users always see meaningful, changing status during AI chat streaming.

**Core Principle**: Status NEVER shows static "Thinking..." for more than 3 seconds.

---

## Problem Analysis

### Current System Issues

**File**: `/Users/nick/Projects/llm-chat-site/src/components/ReasoningDisplay.tsx`

**Current Fallback Chain** (lines 140-193):
```typescript
getStreamingStatus(): string {
  // P1: Semantic status
  if (reasoningStatus && reasoningStatus !== "Thinking...") {
    return reasoningStatus;
  }

  // P2: Tool execution status
  if (toolExecution && isStreaming) {
    // ... tool-specific messages
  }

  // P3: Parse streaming reasoning text
  if (streamingReasoningText && isStreaming) {
    // ... extract headers/first sentence
  }

  // P4: PROBLEM - Generic fallback with no time-based enhancement
  return "Thinking...";
}
```

**Race Condition Window**:
- `reasoning_status` events depend on backend processing
- `tool_execution` events have variable latency
- `streamingReasoningText` may not start immediately
- No time-based progression if all sources fail

**Result**: Users can see static "Thinking..." indefinitely during slow LLM responses or network delays.

---

## Solution Architecture

### 5-Level Priority System

```
P1: Semantic Status     → From LLM reasoning (best UX)
    ↓ (if null/generic)
P2: Tool Execution      → Always available during tool use
    ↓ (if null)
P3: Reasoning Parsing   → Extract from raw text
    ↓ (if unparseable)
P4: Phase-Based Status  → State machine (analyzing → generating → finalizing)
    ↓ (if < 3 seconds)
P5: Time-Based Fallback → Progressive messages (3s, 10s, 20s, 30s, 45s)
```

**Guarantee**: Every stream has at least P4 (phase) status, enhanced by P5 (time) after 3 seconds.

---

## Implementation Files

### 1. Utility Functions

**File**: `/Users/nick/Projects/llm-chat-site/src/utils/streamingStatus.ts`

**Key Functions**:
```typescript
// Parse elapsed time string to seconds
parseElapsedTime("2m 15s") → 135

// Get time-based fallback status
getTimeBasedStatus(5) → "Still working on your request..."

// Determine current stream phase
determinePhase({ tokenCount: 25, ... }) → 'reasoning'

// Parse reasoning text for meaningful status
parseReasoningTextForStatus("**Analyzing**") → "Analyzing..."

// Get tool execution status
getToolExecutionStatus(toolExecution) → "Searching the web..."
```

**Features**:
- Markdown header extraction (`**Header**` → "Header...")
- Keyword detection ("search" → "Searching for information...")
- First sentence extraction with truncation
- Tool-specific message mapping
- Phase-to-status mapping

### 2. React Hook

**File**: `/Users/nick/Projects/llm-chat-site/src/hooks/useStreamingStatus.ts`

**Usage**:
```typescript
const statusData = useStreamingStatus({
  reasoningStatus: "Analyzing the question",  // P1
  toolExecution: null,                         // P2
  streamingReasoningText: null,                // P3
  tokenCount: 25,                              // P4 (phase detection)
  artifactDetected: false,                     // P4
  artifactClosed: false,                       // P4
  elapsedSeconds: 5,                           // P5 (time-based)
  isStreaming: true,
});

// Returns:
// {
//   status: "Analyzing the question",
//   source: "semantic",
//   isFallback: false
// }
```

**Benefits**:
- Memoized for performance
- Returns source for debugging/analytics
- Convenience variant `useStreamingStatusText()` for simple cases

### 3. Comprehensive Tests

**File**: `/Users/nick/Projects/llm-chat-site/src/hooks/__tests__/useStreamingStatus.test.ts`

**Coverage**:
- Priority chain validation (P1 → P2 → P3 → P4 → P5)
- Each priority level tested independently
- Critical requirement: No "Thinking..." for > 3 seconds
- Edge cases (zero elapsed time, negative values, missing fields)
- Integration tests (priority fallthrough)
- Memoization verification

**Key Test**:
```typescript
it('never shows "Thinking..." after 3 seconds', () => {
  // Worst case: no semantic, no tool, no reasoning text
  const { result } = renderHook(() =>
    useStreamingStatus({
      reasoningStatus: null,
      toolExecution: null,
      streamingReasoningText: null,
      tokenCount: 5,
      elapsedSeconds: 4,
    })
  );

  // Should show time-based fallback, not "Thinking..."
  expect(result.current.status).not.toBe('Thinking...');
  expect(result.current.status).toBe('Still working on your request...');
  expect(result.current.source).toBe('time');
});
```

---

## Integration Plan

### Phase 1: Add New Files (Non-Breaking)

**Files to Create**:
1. `/Users/nick/Projects/llm-chat-site/src/utils/streamingStatus.ts`
2. `/Users/nick/Projects/llm-chat-site/src/hooks/useStreamingStatus.ts`
3. `/Users/nick/Projects/llm-chat-site/src/hooks/__tests__/useStreamingStatus.test.ts`

**Command**:
```bash
npm run test -- useStreamingStatus.test.ts
```

**Expected**: All tests pass (20+ tests)

### Phase 2: Update Data Flow (Breaking Changes)

**File**: `/Users/nick/Projects/llm-chat-site/src/hooks/useChatMessages.tsx`

**Changes**:
```typescript
// Line 34: Add to StreamProgress interface
export interface StreamProgress {
  // ... existing fields ...
  tokenCount: number;          // NEW: For phase detection
  artifactClosed: boolean;     // NEW: Already tracked, now exposed
}

// Line 512: Update updateProgress() function
const updateProgress = (): StreamProgress => {
  // ... existing detection logic ...

  return {
    stage,
    message,
    artifactDetected,
    artifactClosed,           // NEW: Expose existing variable
    percentage: Math.min(99, Math.round(percentage)),
    tokenCount,               // NEW: Expose existing variable
    artifactInProgress: artifactInProgress || (artifactDetected && !artifactClosed),
    imageInProgress,
    reasoningSteps,
    searchResults,
    reasoningStatus: lastReasoningStatus,
    streamingReasoningText: reasoningText,
    toolExecution: currentToolExecution,
    streamingArtifacts: collectedArtifacts.length > 0 ? collectedArtifacts : undefined,
  };
};
```

**File**: `/Users/nick/Projects/llm-chat-site/src/components/ReasoningDisplay.tsx`

**Changes**:
```typescript
// Line 9: Add to ReasoningDisplayProps
interface ReasoningDisplayProps {
  // ... existing props ...
  tokenCount?: number;         // NEW
  artifactDetected?: boolean;  // NEW
  artifactClosed?: boolean;    // NEW
}

// Line 68: Update component function
export const ReasoningDisplay = memo(function ReasoningDisplay({
  reasoning,
  streamingReasoningText,
  reasoningStatus,
  isStreaming,
  artifactRendered = true,
  parentElapsedTime,
  toolExecution,
  tokenCount = 0,              // NEW
  artifactDetected = false,    // NEW
  artifactClosed = false,      // NEW
}: ReasoningDisplayProps) {
  // ... existing state ...
```

### Phase 3: Replace getStreamingStatus (Core Change)

**File**: `/Users/nick/Projects/llm-chat-site/src/components/ReasoningDisplay.tsx`

**Before** (lines 136-193):
```typescript
const getStreamingStatus = (): string => {
  // ... current implementation ...
  return "Thinking..."; // Generic fallback
};
```

**After**:
```typescript
import { parseElapsedTime } from '@/utils/streamingStatus';
import { useStreamingStatus } from '@/hooks/useStreamingStatus';

// Inside component:
const elapsedSeconds = useMemo(() => {
  const timeStr = parentElapsedTime || (isStreaming ? elapsedTime : finalElapsedTime);
  return parseElapsedTime(timeStr);
}, [parentElapsedTime, elapsedTime, finalElapsedTime, isStreaming]);

const streamingStatusData = useStreamingStatus({
  reasoningStatus,
  toolExecution,
  streamingReasoningText,
  tokenCount,
  artifactDetected,
  artifactClosed,
  elapsedSeconds,
  isStreaming: isStreaming ?? false,
});

const getPillLabel = (): string => {
  // Expanded after streaming: show "Thought process"
  if (isExpanded && !isStreaming && artifactRendered) {
    return "Thought process";
  }

  // Streaming done but artifact not rendered
  if (!isStreaming && !artifactRendered) {
    return "Rendering the generated artifact...";
  }

  // During streaming: show enhanced status
  if (isStreaming) {
    return streamingStatusData.status;  // CHANGED: Use hook instead of getStreamingStatus()
  }

  // After streaming (collapsed): show "Thought process"
  return "Thought process";
};

// REMOVE: getStreamingStatus() function (no longer needed)
```

### Phase 4: Update Parent Components

**File**: `/Users/nick/Projects/llm-chat-site/src/components/chat/ChatMessage.tsx`

**Change**: Pass new props to ReasoningDisplay
```typescript
<ReasoningDisplay
  reasoning={message.reasoning}
  streamingReasoningText={streamProgress?.streamingReasoningText}
  reasoningStatus={streamProgress?.reasoningStatus}
  isStreaming={isLastMessage && isStreaming}
  toolExecution={streamProgress?.toolExecution}
  tokenCount={streamProgress?.tokenCount}             // NEW
  artifactDetected={streamProgress?.artifactDetected}  // NEW
  artifactClosed={streamProgress?.artifactClosed}      // NEW
  parentElapsedTime={lastMessageElapsedTime}
/>
```

---

## Testing Strategy

### Unit Tests

**File**: `/Users/nick/Projects/llm-chat-site/src/hooks/__tests__/useStreamingStatus.test.ts`

**Run**:
```bash
npm run test -- useStreamingStatus.test.ts
```

**Expected**: 20+ tests pass, 100% coverage of priority chain

### Component Tests

**File**: `/Users/nick/Projects/llm-chat-site/src/components/__tests__/ReasoningDisplay.test.tsx`

**Add Test**:
```typescript
describe('Enhanced Status Resolution', () => {
  it('shows progressive status updates over time', async () => {
    jest.useFakeTimers();

    const { rerender, getByText } = render(
      <ReasoningDisplay
        isStreaming={true}
        reasoningStatus={null}
        toolExecution={null}
        streamingReasoningText={null}
        tokenCount={5}
        artifactDetected={false}
        artifactClosed={false}
      />
    );

    // Initial state (0-3s): phase status
    expect(getByText(/analyzing/i)).toBeInTheDocument();

    // Advance 3 seconds
    act(() => jest.advanceTimersByTime(3000));
    rerender(<ReasoningDisplay {...props} />);
    expect(getByText(/still working/i)).toBeInTheDocument();

    // Advance to 10 seconds
    act(() => jest.advanceTimersByTime(7000));
    rerender(<ReasoningDisplay {...props} />);
    expect(getByText(/building a detailed/i)).toBeInTheDocument();

    jest.useRealTimers();
  });
});
```

### Integration Tests

**Manual Testing Scenarios**:

1. **Fast Response (< 3s)**:
   - Prompt: "What is 2+2?"
   - Expected: Shows phase status → completes before time-based kicks in

2. **Web Search (5-10s)**:
   - Prompt: "Search for latest AI news"
   - Expected: "Analyzing..." → "Searching the web..." → "Found N sources" → "Synthesizing..."

3. **Complex Artifact (15-30s)**:
   - Prompt: "Create a full e-commerce dashboard with charts"
   - Expected: Progressive status every 3-5 seconds, never static > 3s

4. **Very Slow Response (30s+)**:
   - Prompt: Large code generation with reasoning
   - Expected: Time-based messages at 3s, 10s, 20s, 30s, 45s

### E2E Tests

**File**: `/Users/nick/Projects/llm-chat-site/e2e/reasoning-display.spec.ts`

**Test**:
```typescript
test('status ticker never shows static text for more than 3 seconds', async ({ page }) => {
  await page.goto('/');

  // Start a chat that takes a while
  await page.fill('[data-testid="chat-input"]', 'Write a complex React component with multiple features');
  await page.click('[data-testid="send-button"]');

  // Collect status text over 15 seconds
  const statuses: string[] = [];
  const startTime = Date.now();

  while (Date.now() - startTime < 15000) {
    const statusText = await page.textContent('[aria-label="AI is thinking"]');
    if (statusText && !statuses.includes(statusText)) {
      statuses.push(statusText);
      console.log(`${Math.floor((Date.now() - startTime) / 1000)}s: ${statusText}`);
    }
    await page.waitForTimeout(500);
  }

  // Verify status changed at least 3 times
  expect(statuses.length).toBeGreaterThan(3);

  // Verify no static "Thinking..." for entire duration
  const thinkingDuration = statuses.filter(s => s === 'Thinking...').length * 500;
  expect(thinkingDuration).toBeLessThan(3000);
});
```

---

## Performance Considerations

### Memoization

**Hook**: `useStreamingStatus` uses `useMemo` to avoid re-computation on every render

**Dependencies**:
- Only re-computes when actual status sources change
- Prevents unnecessary parsing of reasoning text
- Stable for same input combinations

### Throttling (Optional Enhancement)

**Current**: Status can change rapidly (every 500ms during stream chunks)

**Enhancement**: Add throttle to prevent visual jitter
```typescript
import { useThrottle } from '@/hooks/useThrottle';

const throttledStatus = useThrottle(streamingStatusData.status, 1000); // 1s throttle
```

**Trade-off**: Smoother visuals vs. slightly delayed updates

### Accessibility

**Current**: `aria-live="polite"` on reasoning pill

**Enhancement**: Throttle screen reader announcements
```typescript
const prevStatus = useRef<string>('');

useEffect(() => {
  if (isStreaming && streamingStatusData.status !== prevStatus.current) {
    // Debounce to avoid spamming announcements
    const announcement = setTimeout(() => {
      // Screen reader announcement API
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.textContent = streamingStatusData.status;
      document.body.appendChild(liveRegion);
      setTimeout(() => document.body.removeChild(liveRegion), 1000);
    }, 2000); // Only announce if status stable for 2 seconds

    prevStatus.current = streamingStatusData.status;
    return () => clearTimeout(announcement);
  }
}, [streamingStatusData.status, isStreaming]);
```

---

## Success Metrics

### Quantitative Targets

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Static "Thinking..." Duration | Unbounded | < 3s | E2E test |
| Status Update Frequency | Sporadic | 3-5s | Manual QA |
| Status Source Coverage | ~60% | > 95% | Analytics |
| User Perceivable Changes | 0-2 per 30s | 3+ per 30s | E2E test |

### Qualitative Goals

- Users never see "stuck" status for > 5 seconds
- Status text accurately reflects current processing stage
- Users can gauge progress without percentage bar
- Status changes provide reassurance during long operations

### Analytics Tracking (Future)

**Add to hook**:
```typescript
export function useStreamingStatus(props) {
  const result = useMemo(() => {
    // ... existing logic ...

    // Log status source distribution for analytics
    if (process.env.NODE_ENV === 'production') {
      analytics.track('streaming_status_resolved', {
        source: result.source,
        isFallback: result.isFallback,
        elapsedSeconds,
      });
    }

    return result;
  }, [...deps]);

  return result;
}
```

**Dashboard Metrics**:
- % of streams using each priority level
- Average time to first non-phase status
- Frequency of time-based fallbacks (indicates slow LLM/network)

---

## Example Status Progressions

### Simple Chat (No Tools)
```
0s:   "Analyzing your request..."           (phase)
3s:   "Still working on your request..."    (time)
5s:   "Planning the implementation"         (semantic)
8s:   "Generating response..."              (phase)
12s:  "Finalizing response..."              (phase)
Done: "Thought process" (collapsed)
```

### Web Search
```
0s:   "Analyzing your request..."           (phase)
2s:   "Searching the web..."                (tool)
5s:   "Found 8 sources"                     (tool)
7s:   "Analyzing search results"            (semantic)
10s:  "Synthesizing information"            (semantic)
15s:  "Finalizing response..."              (phase)
Done: "Thought process" (collapsed)
```

### Complex Artifact (Long-Running)
```
0s:   "Analyzing your request..."                    (phase)
3s:   "Still working on your request..."             (time)
5s:   "Designing system architecture"                (semantic)
10s:  "Building a detailed response..."              (time)
15s:  "Implementing component structure"             (semantic)
20s:  "Crafting a thorough answer..."                (time)
25s:  "Adding error handling"                        (semantic)
30s:  "This is taking longer than usual..."          (time)
35s:  "Finalizing implementation details"            (semantic)
40s:  "Finalizing response..."                       (phase)
Done: "Rendering the generated artifact..."          (artifact render wait)
```

---

## Future Enhancements

### 1. Animated Transitions

**Current**: Instant text swap
**Enhancement**: Smooth fade between status changes

```typescript
import { motion, AnimatePresence } from 'framer-motion';

<AnimatePresence mode="wait">
  <motion.span
    key={streamingStatusData.status}
    initial={{ opacity: 0, y: -5 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 5 }}
    transition={{ duration: 0.2 }}
  >
    {streamingStatusData.status}
  </motion.span>
</AnimatePresence>
```

### 2. Contextual Icons

**Current**: Generic spinner or tool icon
**Enhancement**: Icon changes based on status source

```typescript
import { Brain, Wrench, Lightbulb, Loader, Clock } from 'lucide-react';

const STATUS_ICONS: Record<StatusSource, LucideIcon> = {
  semantic: Brain,
  tool: Wrench,
  reasoning: Lightbulb,
  phase: Loader,
  time: Clock,
};

const Icon = STATUS_ICONS[streamingStatusData.source];
<Icon className="w-4 h-4 animate-pulse" />
```

### 3. Progress Estimation

**Current**: Fixed percentage based on stage
**Enhancement**: Adjust confidence based on status source

```typescript
function estimateProgress(source: StatusSource, elapsedSeconds: number): number {
  if (source === 'time') {
    // Longer time = higher uncertainty, cap at 85%
    return Math.min(85, 20 + elapsedSeconds * 2);
  }

  if (source === 'semantic' || source === 'tool') {
    // High-confidence sources = more accurate percentage
    return calculateStageProgress(); // Existing logic
  }

  // Phase/reasoning = medium confidence
  return Math.min(75, calculateStageProgress());
}
```

### 4. User Preferences

**Feature**: Allow users to toggle ticker verbosity

```typescript
const preferences = useUserPreferences();

// Minimal mode: Only show tool/semantic status
// Standard mode: All 5 levels (default)
// Detailed mode: Show source indicator and percentage

if (preferences.tickerMode === 'minimal') {
  return streamingStatusData.source === 'tool' || streamingStatusData.source === 'semantic'
    ? streamingStatusData.status
    : ''; // Hide fallbacks
}
```

---

## Migration Checklist

### Pre-Implementation

- [ ] Review design doc: `/Users/nick/Projects/llm-chat-site/docs/STATUS_TICKER_DESIGN.md`
- [ ] Understand current system: `ReasoningDisplay.tsx` lines 136-193
- [ ] Identify integration points: `useChatMessages.tsx`, `ChatMessage.tsx`

### Phase 1: Create Utilities

- [ ] Create `/Users/nick/Projects/llm-chat-site/src/utils/streamingStatus.ts`
- [ ] Create `/Users/nick/Projects/llm-chat-site/src/hooks/useStreamingStatus.ts`
- [ ] Create `/Users/nick/Projects/llm-chat-site/src/hooks/__tests__/useStreamingStatus.test.ts`
- [ ] Run tests: `npm run test -- useStreamingStatus.test.ts`
- [ ] Verify all tests pass

### Phase 2: Update Data Flow

- [ ] Update `StreamProgress` interface in `useChatMessages.tsx`
- [ ] Expose `tokenCount` and `artifactClosed` in `updateProgress()`
- [ ] Update `ReasoningDisplayProps` interface
- [ ] Add new props to `ReasoningDisplay` component signature
- [ ] Run tests: `npm run test` (ensure no regressions)

### Phase 3: Integrate Hook

- [ ] Import utilities and hook in `ReasoningDisplay.tsx`
- [ ] Add `elapsedSeconds` calculation (parse elapsed time)
- [ ] Call `useStreamingStatus` hook
- [ ] Update `getPillLabel()` to use hook results
- [ ] Remove old `getStreamingStatus()` function
- [ ] Run tests: `npm run test -- ReasoningDisplay.test.tsx`

### Phase 4: Update Parents

- [ ] Update `ChatMessage.tsx` to pass new props
- [ ] Update `ChatInterface.tsx` if needed
- [ ] Test in browser: `npm run dev`
- [ ] Verify status changes in real-time

### Phase 5: Manual QA

- [ ] Test fast response (< 3s)
- [ ] Test web search (5-10s)
- [ ] Test complex artifact (15-30s)
- [ ] Test very slow response (30s+)
- [ ] Verify no static "Thinking..." for > 3s
- [ ] Verify smooth transitions between statuses
- [ ] Test accessibility (screen reader announcements)

### Phase 6: E2E Tests

- [ ] Add E2E test for status progression
- [ ] Run: `npm run test:e2e:headed`
- [ ] Verify status changes tracked correctly

### Deployment

- [ ] Create PR with all changes
- [ ] Include before/after video in PR description
- [ ] Request review from team
- [ ] Merge to main (auto-deploys)
- [ ] Monitor analytics for status source distribution
- [ ] Gather user feedback

---

## Documentation

### Files Created

1. **Design Doc**: `/Users/nick/Projects/llm-chat-site/docs/STATUS_TICKER_DESIGN.md`
   - Full architecture, examples, migration plan

2. **Summary Doc**: `/Users/nick/Projects/llm-chat-site/docs/STATUS_TICKER_SUMMARY.md`
   - This file - quick reference guide

3. **Utilities**: `/Users/nick/Projects/llm-chat-site/src/utils/streamingStatus.ts`
   - Helper functions for status resolution

4. **Hook**: `/Users/nick/Projects/llm-chat-site/src/hooks/useStreamingStatus.ts`
   - React hook for 5-level priority system

5. **Tests**: `/Users/nick/Projects/llm-chat-site/src/hooks/__tests__/useStreamingStatus.test.ts`
   - Comprehensive unit tests (20+ tests)

### Key Concepts

**5-Level Priority System**:
- P1: Semantic (best)
- P2: Tool (reliable)
- P3: Reasoning (parsed)
- P4: Phase (guaranteed)
- P5: Time (fallback)

**Critical Requirement**:
- Status NEVER static for > 3 seconds

**Time-Based Progression**:
- 3s: "Still working..."
- 10s: "Building detailed response..."
- 20s: "Crafting thorough answer..."
- 30s: "Taking longer than usual..."
- 45s: "Almost there..."

---

## Support

**Questions?** Reference:
- `/Users/nick/Projects/llm-chat-site/docs/STATUS_TICKER_DESIGN.md` - Full design
- `/Users/nick/Projects/llm-chat-site/src/hooks/__tests__/useStreamingStatus.test.ts` - Test examples
- `/Users/nick/Projects/llm-chat-site/src/components/ReasoningDisplay.tsx` - Current implementation

**Issues?** Check:
- Unit tests pass: `npm run test -- useStreamingStatus.test.ts`
- No TypeScript errors: `npm run build`
- Browser console for errors: `npm run dev`

---

**End of Summary**
