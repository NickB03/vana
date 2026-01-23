# Status Ticker System - Quick Reference Card

**1-Page Developer Cheat Sheet**

---

## Core Principle

> **Status NEVER shows static "Thinking..." for more than 3 seconds**

---

## 5-Level Priority System

| Level | Source | When Active | Example |
|-------|--------|-------------|---------|
| **P1** | Semantic | LLM sends reasoning_status | "Analyzing the question" |
| **P2** | Tool | Tool executing/complete | "Searching the web..." |
| **P3** | Reasoning | Parse streaming text | "Planning the approach..." |
| **P4** | Phase | Token count/artifact state | "Generating response..." |
| **P5** | Time | After 3+ seconds | "Still working..." |

**Flow**: Check P1 → P2 → P3 → P4 → (if ≥3s) P5 → Return first valid status

---

## Key Files

```
src/
├── utils/streamingStatus.ts          # Helper functions
├── hooks/useStreamingStatus.ts       # Main hook
└── hooks/__tests__/
    └── useStreamingStatus.test.ts    # Tests

components/
└── ReasoningDisplay.tsx              # Integration point

docs/
├── STATUS_TICKER_DESIGN.md           # Full design doc
├── STATUS_TICKER_SUMMARY.md          # Implementation guide
├── STATUS_TICKER_FLOW.md             # Visual diagrams
└── STATUS_TICKER_QUICKREF.md         # This file
```

---

## Hook Usage

```typescript
import { useStreamingStatus, parseElapsedTime } from '@/hooks/useStreamingStatus';

// In component:
const elapsedSeconds = parseElapsedTime(elapsedTime); // "45s" → 45

const statusData = useStreamingStatus({
  reasoningStatus,          // P1: From LLM
  toolExecution,            // P2: Tool state
  streamingReasoningText,   // P3: Raw text
  tokenCount,               // P4: For phase
  artifactDetected,         // P4: For phase
  artifactClosed,           // P4: For phase
  elapsedSeconds,           // P5: For fallback
  isStreaming,
});

// Returns:
// {
//   status: string,        // Display this
//   source: StatusSource,  // For debugging
//   isFallback: boolean    // If P4/P5 used
// }
```

---

## Helper Functions

```typescript
// Parse time string to seconds
parseElapsedTime("2m 15s") → 135

// Get time-based fallback
getTimeBasedStatus(5) → "Still working on your request..."

// Determine stream phase
determinePhase({ tokenCount: 25, ... }) → 'reasoning'

// Parse reasoning text
parseReasoningTextForStatus("**Analyzing**") → "Analyzing..."

// Get tool status
getToolExecutionStatus(toolExecution) → "Searching the web..."
```

---

## Time-Based Progression

| Elapsed | Status Message |
|---------|----------------|
| 0-3s | Use phase status |
| 3s+ | "Still working on your request..." |
| 10s+ | "Building a detailed response..." |
| 20s+ | "Crafting a thorough answer..." |
| 30s+ | "This is taking longer than usual..." |
| 45s+ | "Still processing... Almost there..." |

---

## Phase Detection

```typescript
// Token-based phases
tokenCount < 50              → 'reasoning'
tokenCount 50-150 (no art)   → 'generating'
artifactDetected && !closed  → 'generating'
artifactClosed || count>500  → 'finalizing'

// Tool-based phases (override token)
toolExecution.success === undefined  → 'tool_executing'
toolExecution.success !== undefined  → 'tool_complete'
```

---

## Reasoning Text Parsing

**Strategies** (in order):

1. **Markdown Header**: `**Analyzing**` → "Analyzing..."
2. **Keyword Detection**: "search" → "Searching for information..."
3. **First Sentence**: Extract up to 40 chars from first line

**Keywords**:
- search → "Searching for information..."
- build → "Building implementation..."
- analyze → "Analyzing requirements..."
- create → "Creating solution..."
- design → "Designing approach..."

---

## Integration Checklist

### 1. Update StreamProgress Interface
```typescript
// In useChatMessages.tsx
export interface StreamProgress {
  // ... existing ...
  tokenCount: number;          // ADD THIS
  artifactClosed: boolean;     // ADD THIS (already tracked)
}
```

### 2. Update ReasoningDisplayProps
```typescript
// In ReasoningDisplay.tsx
interface ReasoningDisplayProps {
  // ... existing ...
  tokenCount?: number;         // ADD THIS
  artifactDetected?: boolean;  // ADD THIS
  artifactClosed?: boolean;    // ADD THIS
}
```

### 3. Use Hook in Component
```typescript
// In ReasoningDisplay.tsx
import { parseElapsedTime } from '@/utils/streamingStatus';
import { useStreamingStatus } from '@/hooks/useStreamingStatus';

const elapsedSeconds = useMemo(() => {
  const timeStr = parentElapsedTime || (isStreaming ? elapsedTime : finalElapsedTime);
  return parseElapsedTime(timeStr);
}, [parentElapsedTime, elapsedTime, finalElapsedTime, isStreaming]);

const statusData = useStreamingStatus({
  reasoningStatus,
  toolExecution,
  streamingReasoningText,
  tokenCount,
  artifactDetected,
  artifactClosed,
  elapsedSeconds,
  isStreaming: isStreaming ?? false,
});

// Use statusData.status instead of getStreamingStatus()
```

### 4. Update Parent Components
```typescript
// In ChatMessage.tsx
<ReasoningDisplay
  // ... existing props ...
  tokenCount={streamProgress?.tokenCount}
  artifactDetected={streamProgress?.artifactDetected}
  artifactClosed={streamProgress?.artifactClosed}
/>
```

---

## Testing

### Run Tests
```bash
npm run test -- useStreamingStatus.test.ts
```

### Expected Results
- 20+ tests pass
- 100% coverage of priority chain
- Critical test: No "Thinking..." for > 3s

### Manual Test Scenarios
1. **Fast response** (< 3s) → Phase status only
2. **Web search** (5-10s) → Tool status + semantic
3. **Complex artifact** (15-30s) → Progressive time-based
4. **Very slow** (30s+) → All time thresholds

---

## Common Patterns

### Pattern 1: No High-Priority Status
```typescript
// All of these are null/empty:
// - reasoningStatus
// - toolExecution
// - streamingReasoningText

// Result:
// 0-3s: P4 (phase) → "Analyzing your request..."
// 3s+:  P5 (time)  → "Still working..."
```

### Pattern 2: Tool Execution
```typescript
// Tool starts:
// toolExecution = { toolName: "browser.search" }
// → P2: "Searching the web..."

// Tool completes:
// toolExecution = { toolName: "browser.search", success: true, sourceCount: 5 }
// → P2: "Found 5 sources"
```

### Pattern 3: Semantic Override
```typescript
// Even if tool/reasoning/phase are active,
// reasoningStatus takes precedence:
// reasoningStatus = "Designing the solution"
// → P1: "Designing the solution"
```

---

## Debugging

### Check Status Source
```typescript
console.log('Status:', statusData.status);
console.log('Source:', statusData.source);  // "semantic" | "tool" | "reasoning" | "phase" | "time"
console.log('Fallback:', statusData.isFallback);  // true if P4/P5
```

### Common Issues

**Issue**: Status not updating
- **Check**: Is `isStreaming` true?
- **Check**: Are props changing (use React DevTools)?

**Issue**: Shows "Thinking..." too long
- **Check**: Is `elapsedSeconds` incrementing?
- **Check**: Is time-based fallback firing at 3s?

**Issue**: Wrong priority used
- **Check**: Is `reasoningStatus` meaningful (not "Thinking...")?
- **Check**: Is `toolExecution` active during streaming?

---

## Performance Notes

- Hook uses `useMemo` → Only recomputes when inputs change
- Parsing functions are pure → Safe to call frequently
- No network calls → All computation is local

---

## Accessibility

- Status changes announced to screen readers (`aria-live="polite"`)
- Timer shows elapsed time for all users
- Visual spinner indicates active processing

---

## Future Enhancements

1. **Animated Transitions**: Fade between status changes
2. **Contextual Icons**: Different icon per status source
3. **Progress Estimation**: Confidence-based percentage
4. **User Preferences**: Toggle ticker verbosity

---

## Quick Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Static "Thinking..." > 3s | Time-based not firing | Check `elapsedSeconds` prop |
| Status never changes | Not streaming | Check `isStreaming` prop |
| Generic phase status only | No semantic/tool/reasoning | Expected if LLM slow |
| Tests failing | Missing prop | Check all required props |

---

## Migration Steps (TL;DR)

1. **Add files**: `streamingStatus.ts`, `useStreamingStatus.ts`, tests
2. **Update interfaces**: `StreamProgress`, `ReasoningDisplayProps`
3. **Replace logic**: Use hook instead of `getStreamingStatus()`
4. **Update parents**: Pass new props to `ReasoningDisplay`
5. **Test**: Run unit tests + manual QA
6. **Deploy**: Create PR → merge → auto-deploy

**Estimated Time**: 2-3 hours

---

## Success Metrics

**Before**: Static "Thinking..." can persist indefinitely

**After**:
- ✓ Status changes every 3-5 seconds minimum
- ✓ No static text > 3 seconds
- ✓ 95%+ semantic/tool/reasoning coverage
- ✓ Users see meaningful, changing status

---

**Need More Details?**
- Design: `/docs/STATUS_TICKER_DESIGN.md`
- Implementation: `/docs/STATUS_TICKER_SUMMARY.md`
- Diagrams: `/docs/STATUS_TICKER_FLOW.md`

**Questions?** Check test file for examples:
`/src/hooks/__tests__/useStreamingStatus.test.ts`

---

**Last Updated**: 2026-01-23
