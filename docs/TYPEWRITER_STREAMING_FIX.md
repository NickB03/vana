# Typewriter Effect Streaming Fix

## Problem Statement

**Symptom**: When the LLM completes its response during streaming, the typewriter effect would instantly reveal all remaining text instead of smoothly completing the character-by-character animation.

**User Experience**:
- Ask for "list of 1-100 favorite things"
- Streaming starts correctly with typewriter effect
- Around item 20-25, the stream ends
- **BUG**: All remaining items (26-100) instantly appear

## Root Cause Analysis

### The Race Condition

The issue stemmed from a **state transition race condition** between three components:

1. **ChatInterface.tsx**: Sets `isStreaming = false` when stream ends
2. **ChatMessage.tsx**: Receives `isStreaming` prop change
3. **MessageWithArtifacts.tsx**: Receives `isStreaming` prop and passes to `useTypewriter`
4. **useTypewriter.ts**: Hook stops animation when `enabled = false`

```typescript
// Timeline of the bug:
// T=0: Stream starts, isStreaming=true, typewriter animating
// T=1000ms: Revealed "Items 1-25..." (animation at 40% progress)
// T=1001ms: Stream ends, setIsStreaming(false) called
// T=1002ms: isStreaming prop propagates to ChatMessage
// T=1003ms: isStreaming=false propagates to MessageWithArtifacts
// T=1004ms: useTypewriter receives enabled=false
// T=1005ms: 🐛 BUG - Animation stops, text jumps to 100% completion
```

### Why Previous Fixes Didn't Work

#### Attempt 1: Non-Virtualized Path During Streaming
- **Goal**: Keep component mounted to preserve animation state
- **Result**: Helped with stability but didn't solve the animation cutoff
- **Why**: Component staying mounted doesn't prevent `isStreaming=false` from stopping the animation

#### Attempt 2: Stable React Keys
- **Goal**: Prevent component remounting during streaming→saved transition
- **Result**: Component identity preserved, but animation still jumped
- **Why**: The issue wasn't remounting—it was the animation logic responding to `enabled=false`

#### Attempt 3: Interval-Based Scrolling (100ms)
- **Goal**: Reduce RAF collision with typewriter animation
- **Result**: Better scroll performance but didn't fix typewriter
- **Why**: Separate concern from the typewriter completion issue

## The True Fix

### Core Principle

**Once a typewriter animation starts, it MUST complete to full text, regardless of the `enabled` flag changing.**

The `enabled` prop should only control:
- ✅ Whether to START new animations
- ❌ NOT whether to STOP ongoing animations

### Implementation

#### 1. useTypewriter.ts - Animation Continuation Logic

```typescript
// Track if animation was ever enabled (to differentiate new from in-progress)
const wasEverEnabledRef = useRef(enabled);

// Update wasEverEnabled if currently enabled
if (enabled) {
  wasEverEnabledRef.current = true;
}

useEffect(() => {
  // CRITICAL: Animation continues UNTIL fully revealed, regardless of enabled flag
  // If we're fully caught up, no animation needed
  if (revealedCount >= targetText.length) {
    return;
  }

  // Only start NEW animations if enabled OR if we're finishing an existing animation
  const shouldAnimate = enabled || wasEverEnabledRef.current;
  if (!shouldAnimate) return;

  // Animation loop - continues REGARDLESS of enabled flag
  const animate = () => {
    setRevealedCount(current => {
      const next = Math.min(current + charsPerFrame, targetText.length);

      // Continue animating if still behind, REGARDLESS of enabled flag
      if (next < targetText.length) {
        rafRef.current = requestAnimationFrame(animate);
      }

      return next;
    });
  };

  rafRef.current = requestAnimationFrame(animate);

  return () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  };
}, [targetText, revealedCount, charsPerFrame, enabled]);
```

**Key Changes:**
- `wasEverEnabledRef` tracks if animation ever started
- Animation loop continues as long as `revealedCount < targetText.length`
- `enabled` flag only controls starting NEW animations, not stopping ongoing ones

#### 2. ChatMessage.tsx - Effective Streaming State

```typescript
// Track whether the typewriter animation has completed for this message
const [typewriterComplete, setTypewriterComplete] = React.useState(false);

// Reset typewriter state when a new streaming message starts
React.useEffect(() => {
  if (message.id === 'streaming-temp' && isStreaming) {
    setTypewriterComplete(false);
  }
}, [message.id, isStreaming]);

// Determine effective streaming state for typewriter
// Continue treating as "streaming" until typewriter animation completes
const effectiveIsStreaming = isStreaming || (isLastMessage && isAssistant && !typewriterComplete);

// Callback when typewriter completes
const handleTypewriterComplete = React.useCallback(() => {
  setTypewriterComplete(true);
}, []);
```

**Key Changes:**
- Track typewriter completion state locally in ChatMessage
- Calculate `effectiveIsStreaming` that stays true until animation completes
- Pass `effectiveIsStreaming` to MessageWithArtifacts (not raw `isStreaming`)

#### 3. MessageWithArtifacts.tsx - Completion Callback

```typescript
const { displayText: typewriterContent, isComplete: typewriterComplete } = useTypewriterWithStatus(content, {
  charsPerFrame: 1,
  enabled: isStreaming, // Receives effectiveIsStreaming from parent
});

// Notify parent when typewriter animation completes
useEffect(() => {
  if (typewriterComplete && onTypewriterComplete) {
    onTypewriterComplete();
  }
}, [typewriterComplete, onTypewriterComplete]);
```

**Key Changes:**
- Use `useTypewriterWithStatus` to track completion
- Call parent callback when animation completes
- Parent (ChatMessage) can then update `effectiveIsStreaming`

#### 4. VirtualizedMessageList.tsx - Stable Component Identity

```typescript
// Check for streaming-temp message to determine non-virtualized path
const hasStreamingTempMessage = messages.some(m => m.id === 'streaming-temp');
const useNonVirtualizedPath = hasArtifactMessages || isStreaming || hasStreamingTempMessage;

// Use stable key for last assistant message during streaming→saved transition
const isLastAssistant = isLastMessage && message.role === 'assistant';
const needsStableKey = isLastAssistant && (isStreaming || hasStreamingTempMessage);
const stableKey = needsStableKey ? 'streaming-assistant-message' : message.id;

return (
  <div key={stableKey}>
    <ChatMessage
      message={message}
      isStreaming={effectiveIsStreaming}
      onTypewriterComplete={handleTypewriterComplete}
    />
  </div>
);
```

**Key Changes:**
- Use stable key `'streaming-assistant-message'` during transition
- Prevents React from unmounting/remounting component
- Preserves typewriter animation state across streaming→saved transition

## Testing

### Test Coverage

Created comprehensive test suite in `src/hooks/__tests__/useTypewriter.test.ts`:

```typescript
it('should continue animation after enabled becomes false (CRITICAL FIX)', async () => {
  const { result, rerender } = renderHook(
    ({ text, enabled }) => useTypewriter(text, { enabled, charsPerFrame: 1 }),
    { initialProps: { text: 'Long text...', enabled: true } }
  );

  // Wait for partial reveal
  await waitFor(() => {
    expect(result.current.length).toBeGreaterThan(0);
    expect(result.current.length).toBeLessThan(60);
  });

  const partialLength = result.current.length;

  // Simulate streaming ending (enabled becomes false)
  rerender({ text: 'Long text...', enabled: false });

  // CRITICAL: Text should NOT jump to completion
  // Allow 1-2 chars variance due to RAF timing
  expect(result.current.length).toBeGreaterThanOrEqual(partialLength);
  expect(result.current.length).toBeLessThanOrEqual(partialLength + 2);

  // Animation should continue
  await waitFor(() => {
    expect(result.current.length).toBeGreaterThan(partialLength);
  });

  // Eventually completes
  await waitFor(() => {
    expect(result.current).toBe('Long text...');
  });
});
```

### Manual Testing

1. **Start dev server**: `npm run dev`
2. **Test case**: Ask "List your 100 favorite things, each on a separate line, no artifacts"
3. **Expected behavior**:
   - Streaming starts with smooth typewriter effect
   - Items appear character-by-character: "1. Coffee\n2. Books\n..."
   - Stream ends around item 20-25
   - **Items 26-100 continue animating smoothly** (not instant jump)
   - Animation completes naturally over 2-3 seconds

## Performance Considerations

### RAF (requestAnimationFrame) Usage

- **Frequency**: 60fps (~16.67ms per frame)
- **Chars per frame**: 1 character (configurable via `charsPerFrame`)
- **Effective speed**: ~60 characters/second
- **CPU impact**: Minimal - RAF is GPU-optimized and pauses when tab inactive

### Scroll Performance

- Changed from RAF-based scrolling to interval-based (100ms)
- Reduces RAF collision between typewriter and scroll
- 10fps scroll updates are smooth enough for following content
- Significantly lower CPU usage than dual RAF loops

## Comparison to prompt-kit

### prompt-kit Approach

From [prompt-kit docs](https://www.prompt-kit.com/docs/response-stream):

> "We don't recommend to use it for LLM output"

Their `ResponseStream` component is designed for **client-side simulated streaming**, not real LLM streaming. Key differences:

1. **Data Source**:
   - prompt-kit: Static string or async iterable (client-controlled)
   - Our implementation: Server-sent events (external control)

2. **Animation Control**:
   - prompt-kit: Animation driven by internal loop
   - Our implementation: Animation must survive external state changes

3. **Use Case**:
   - prompt-kit: Demos, UI prototypes, fake responses
   - Our implementation: Production LLM streaming with unpredictable timing

### Our Unique Requirements

1. **Streaming transition**: Must handle `isStreaming=true` → `false` mid-animation
2. **Component persistence**: Message transitions from `streaming-temp` to saved UUID
3. **Virtualization**: Must work with VirtualizedMessageList and scroll management
4. **Performance**: Must handle 100+ message histories without lag

## Architecture Insights

### Why This Pattern Works

```
┌─────────────────────────────────────────────────────────────┐
│ Stream Control Layer (ChatInterface.tsx)                    │
│  - Manages SSE connection                                   │
│  - Sets isStreaming flag                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Message Layer (ChatMessage.tsx)                             │
│  - Tracks typewriter completion state                       │
│  - Calculates effectiveIsStreaming                          │
│  - Prevents premature state transition                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Content Layer (MessageWithArtifacts.tsx)                    │
│  - Applies typewriter effect                                │
│  - Notifies parent on completion                            │
│  - Strips artifact tags from display                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Animation Layer (useTypewriter.ts)                          │
│  - RAF-based character reveal                               │
│  - Continues until text fully revealed                      │
│  - Ignores enabled=false mid-animation                      │
└─────────────────────────────────────────────────────────────┘
```

### State Flow

```typescript
// Stream starts
isStreaming = true
  → effectiveIsStreaming = true
    → useTypewriter(enabled: true)
      → Animation starts, revealedCount: 0 → N

// Stream ends (mid-animation)
isStreaming = false  // Changed by ChatInterface
  → effectiveIsStreaming = true  // Kept true by ChatMessage
    → useTypewriter(enabled: true)  // Still enabled!
      → Animation continues, revealedCount: N → M

// Animation completes
onTypewriterComplete() called
  → typewriterComplete = true  // Set by ChatMessage
    → effectiveIsStreaming = false  // Now becomes false
      → useTypewriter(enabled: false)  // Safe to disable
        → revealedCount === targetText.length  // Already complete!
```

## Related Files

- `src/hooks/useTypewriter.ts` - Core animation logic
- `src/components/chat/ChatMessage.tsx` - Streaming state management
- `src/components/MessageWithArtifacts.tsx` - Content rendering with typewriter
- `src/components/chat/VirtualizedMessageList.tsx` - Component stability during streaming
- `src/hooks/__tests__/useTypewriter.test.ts` - Test coverage

## Future Improvements

1. **Adaptive Speed**: Adjust `charsPerFrame` based on content length
   - Short messages: 1 char/frame (slower, more dramatic)
   - Long messages: 3-5 chars/frame (faster, less tedious)

2. **Word-by-Word Mode**: Alternative to character-by-character
   - Better for code blocks and technical content
   - Inspired by prompt-kit's fade mode

3. **Pause/Resume**: User control over typewriter animation
   - Click to skip/complete instantly
   - Accessibility preference to disable entirely

4. **Performance Monitoring**: Track animation performance
   - Measure actual chars/second achieved
   - Detect RAF throttling in background tabs
   - Adjust speed dynamically

## Sources

- [prompt-kit Response Stream Documentation](https://www.prompt-kit.com/docs/response-stream)
- [prompt-kit GitHub Repository](https://github.com/ibelick/prompt-kit)
- [prompt-kit Markdown Component](https://www.prompt-kit.com/docs/markdown)
