# Phase 3: Frontend ADK Event Parser - Implementation Checklist

**Date**: 2025-10-18
**Architecture Document**: `docs/plans/phase3_frontend_architecture.md`
**Status**: Ready for Implementation

---

## Quick Start

### Prerequisites

```bash
# Ensure Phase 0 & Phase 1 complete
cat docs/plans/phase_1_completion_summary.md

# Verify feature flags exist
grep "ENABLE_ADK_CANONICAL_STREAM" app/config.py
grep "NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM" frontend/src/lib/env.ts

# Baseline tests passing
make test  # Should show 266 passed
```

### Feature Flag Configuration

**Backend** (`.env.local`):
```bash
ENABLE_ADK_CANONICAL_STREAM=true
```

**Frontend** (`.env.local`):
```bash
NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=true
```

---

## Phase 3.1: Parser Infrastructure (Week 1)

### File Creation

- [ ] Create `frontend/src/lib/streaming/adk/` directory
- [ ] Create `frontend/src/lib/streaming/adk/types.ts`
- [ ] Create `frontend/src/lib/streaming/adk/parser.ts`
- [ ] Create `frontend/src/lib/streaming/adk/content-extractor.ts`
- [ ] Create `frontend/src/lib/streaming/adk/validator.ts`
- [ ] Create `frontend/src/lib/streaming/adk/index.ts`

### Implementation: types.ts

```typescript
// Copy interface definitions from architecture document
export interface AdkEvent { /* ... */ }
export interface AdkContent { /* ... */ }
export interface AdkPart { /* ... */ }
export interface AdkEventActions { /* ... */ }
export interface ParsedAdkEvent { /* ... */ }
export interface AdkParserOptions { /* ... */ }
export type AdkParserErrorType = /* ... */
export interface AdkParserError { /* ... */ }
```

**Acceptance Criteria**:
- [ ] All interfaces match ADK Python Event model
- [ ] 100% TypeScript type coverage
- [ ] JSDoc comments on all exported types
- [ ] No `any` types used

### Implementation: parser.ts

**Core Function**:
```typescript
export function parseAdkEventSSE(
  data: string,
  options?: AdkParserOptions
): ParsedAdkEvent | null
```

**Features**:
- [ ] Handles empty data, SSE comments, `[DONE]` marker
- [ ] JSON parsing with error handling
- [ ] Optional schema validation (dev mode)
- [ ] Content extraction (text, thoughts, sources)
- [ ] Function call/response extraction
- [ ] Final response detection
- [ ] Agent transfer extraction

**Acceptance Criteria**:
- [ ] Parser handles 100% of ADK Event structures
- [ ] Graceful error handling (returns null, never throws)
- [ ] Verbose logging mode for debugging
- [ ] Performance: < 5ms per event

### Implementation: content-extractor.ts

**Functions**:
```typescript
export function extractTextContent(parts: AdkPart[]): string
export function extractThoughtContent(parts: AdkPart[]): string
export function extractSources(event: AdkEvent): Array<{url: string; title?: string}>
export function extractFunctionResponseContent(response: FunctionResponse): string
```

**Acceptance Criteria**:
- [ ] Text extraction excludes thoughts (thought=false or undefined)
- [ ] Thought extraction includes only thought=true parts
- [ ] Sources extracted from groundingMetadata
- [ ] Function response content properly formatted
- [ ] Single-pass O(n) complexity

### Implementation: validator.ts (Optional)

**Function**:
```typescript
export function validateAdkEvent(event: unknown): {
  valid: boolean;
  errors: string[];
}
```

**Acceptance Criteria**:
- [ ] Validates required fields (id, author, invocationId, timestamp)
- [ ] Validates content structure (parts array)
- [ ] Performance: < 2ms per validation
- [ ] Only enabled in development mode

### Unit Tests

**File**: `frontend/src/lib/streaming/adk/__tests__/parser.test.ts`

**Test Cases** (100+ tests):
- [ ] Valid ADK event with text parts
- [ ] Event with thought parts
- [ ] Event with function calls
- [ ] Event with function responses (P0-002 fix)
- [ ] Event with grounding metadata
- [ ] Event with agent transfer action
- [ ] Empty data handling
- [ ] SSE comment handling
- [ ] `[DONE]` marker handling
- [ ] Invalid JSON handling
- [ ] Missing required fields
- [ ] Partial content events
- [ ] Error events (errorCode, errorMessage)
- [ ] Performance benchmarks

**Run Tests**:
```bash
cd frontend
npm test -- --testPathPattern=adk
```

**Acceptance Criteria**:
- [ ] 100+ test cases implemented
- [ ] 100% code coverage
- [ ] All tests passing
- [ ] Performance benchmarks < 5ms

---

## Phase 3.2: Integration (Week 2)

### File Creation

- [ ] Create `frontend/src/hooks/chat/event-handlers/` directory
- [ ] Create `frontend/src/hooks/chat/event-handlers/index.ts`
- [ ] Create `frontend/src/hooks/chat/event-handlers/adk-event-handler.ts`
- [ ] Create `frontend/src/hooks/chat/event-handlers/legacy-event-handler.ts`

### Update: useSSE.ts

**Location**: `frontend/src/hooks/useSSE.ts` (line ~181)

**Changes**:
```typescript
import { parseAdkEventSSE } from '@/lib/streaming/adk';
import { isAdkCanonicalStreamEnabled } from '@/lib/env';

const parseEventData = useCallback((data: string, fallbackType?: string): AgentNetworkEvent | null => {
  const isCanonicalMode = isAdkCanonicalStreamEnabled();

  if (isCanonicalMode) {
    // CANONICAL MODE: Use ADK parser
    const parsed = parseAdkEventSSE(data);
    if (!parsed) return null;

    // Convert to AgentNetworkEvent
    return {
      type: mapAdkEventToLegacyType(parsed),
      data: {
        timestamp: new Date(parsed.event.timestamp * 1000).toISOString(),
        id: parsed.event.id,
        author: parsed.event.author,
        invocationId: parsed.event.invocationId,
        textContent: parsed.textContent,
        thoughtContent: parsed.thoughtContent,
        functionCalls: parsed.functionCalls,
        functionResponses: parsed.functionResponses,
        sources: parsed.sources,
        isFinalResponse: parsed.isFinalResponse,
        transferToAgent: parsed.transferToAgent,
        _rawAdkEvent: parsed.event, // Raw event for advanced handlers
      }
    };
  } else {
    // LEGACY MODE: Existing parsing logic
    // ... keep existing implementation ...
  }
}, []);
```

**Acceptance Criteria**:
- [ ] Feature flag check at runtime
- [ ] Canonical mode uses `parseAdkEventSSE`
- [ ] Legacy mode unchanged
- [ ] Type-safe conversion to AgentNetworkEvent
- [ ] No breaking changes to existing code

### Implementation: Event Handler Factory

**File**: `frontend/src/hooks/chat/event-handlers/index.ts`

```typescript
export interface EventHandler {
  handleEvent(event: any): void;
  cleanup(): void;
}

export function createEventHandler(sessionId: string): EventHandler {
  const isCanonical = isAdkCanonicalStreamEnabled();

  if (isCanonical) {
    console.log('[Event Handler Factory] Using CANONICAL ADK handler');
    return new AdkEventHandler(sessionId);
  } else {
    console.log('[Event Handler Factory] Using LEGACY handler');
    return new LegacyEventHandler(sessionId);
  }
}
```

**Acceptance Criteria**:
- [ ] Factory pattern implemented
- [ ] Feature flag switching
- [ ] Clear logging of mode selection
- [ ] EventHandler interface defined

### Implementation: AdkEventHandler

**File**: `frontend/src/hooks/chat/event-handlers/adk-event-handler.ts`

**Class Structure**:
```typescript
export class AdkEventHandler implements EventHandler {
  constructor(private sessionId: string) {}

  handleEvent(event: AgentNetworkEvent): void {
    const rawEvent = event.data._rawAdkEvent as AdkEvent;

    // Handle different event types
    if (rawEvent.errorCode) {
      this.handleError(rawEvent);
    } else if (event.data.isFinalResponse) {
      this.handleFinalResponse(event);
    } else if (event.data.transferToAgent) {
      this.handleAgentTransfer(event);
    } else {
      this.handleProgress(event);
    }
  }

  private handleError(event: AdkEvent): void { /* ... */ }
  private handleFinalResponse(event: AgentNetworkEvent): void { /* ... */ }
  private handleAgentTransfer(event: AgentNetworkEvent): void { /* ... */ }
  private handleProgress(event: AgentNetworkEvent): void { /* ... */ }

  cleanup(): void {
    // Cleanup subscriptions, timers, etc.
  }
}
```

**Acceptance Criteria**:
- [ ] Handles all ADK event types
- [ ] Updates Zustand store correctly
- [ ] Stores raw ADK events
- [ ] No memory leaks
- [ ] Proper cleanup on unmount

### Update: Store Schema

**File**: `frontend/src/hooks/chat/types.ts`

**Changes**:
```typescript
export interface ChatSession {
  // ... existing fields ...

  /** Raw ADK events (canonical mode only) */
  rawAdkEvents?: AdkEvent[];

  /** Event metadata for debugging */
  eventMetadata?: {
    totalEvents: number;
    lastEventId: string;
    lastInvocationId: string;
  };
}

export interface ChatMessage {
  // ... existing fields ...

  metadata?: {
    kind?: 'user-input' | 'assistant-progress' | 'assistant-final';
    completed?: boolean;

    // ADD: ADK event tracking
    adkEventId?: string;
    adkInvocationId?: string;
    adkAuthor?: string;

    // ADD: Content extraction fields (used by ChatMessage component)
    thoughtContent?: string;
    sources?: Array<{ title: string; url: string }>;
  };
}
```

**File**: `frontend/src/hooks/chat/store.ts`

**Changes**:
```typescript
// ADD to useChatStore actions
storeAdkEvent: (sessionId: string, event: AdkEvent) => {
  set(state => {
    const session = state.sessions[sessionId];
    if (!session) return state;

    const rawAdkEvents = session.rawAdkEvents ?? [];
    const newEvents = [...rawAdkEvents, event];

    // Circular buffer: keep last 1000 events
    if (newEvents.length > 1000) {
      newEvents.splice(0, newEvents.length - 1000);
    }

    return {
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...session,
          rawAdkEvents: newEvents,
          eventMetadata: {
            totalEvents: newEvents.length,
            lastEventId: event.id,
            lastInvocationId: event.invocationId,
          },
          updated_at: new Date().toISOString(),
        },
      },
    };
  });
}
```

**Acceptance Criteria**:
- [ ] Store extended with ADK fields
- [ ] Circular buffer implementation (max 1000 events)
- [ ] Exclude `rawAdkEvents` from localStorage
- [ ] Backward compatible with legacy sessions
- [ ] No breaking changes to existing code

### Integration Tests

**File**: `frontend/src/__tests__/integration/adk-streaming.test.tsx`

**Test Cases**:
- [ ] Feature flag enables canonical parser
- [ ] Feature flag disabled uses legacy parser
- [ ] ADK events update UI correctly
- [ ] Messages rendered with correct content
- [ ] Thought process displayed
- [ ] Sources displayed
- [ ] Agent transfers tracked
- [ ] Error events handled gracefully

**Run Tests**:
```bash
cd frontend
npm test -- --testPathPattern=integration/adk
```

**Acceptance Criteria**:
- [ ] All integration tests passing
- [ ] Both canonical and legacy modes tested
- [ ] Mock SSE streams used
- [ ] UI updates verified

---

## Phase 3.3: UI Updates (Week 3)

### Component Updates

- [ ] Update `ChatMessage` component to display ADK metadata
- [ ] Create `ThoughtProcess` component for thought visualization
- [ ] Create `FunctionCall` component for function call display
- [ ] Create `Sources` component for grounding sources
- [ ] Update `Timeline` component for agent transfers

### Implementation: ThoughtProcess Component

**File**: `frontend/src/components/chat/ThoughtProcess.tsx`

```typescript
export function ThoughtProcess({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="thought-process">
      <button onClick={() => setExpanded(!expanded)}>
        {expanded ? '🧠 Hide Thoughts' : '🧠 Show Thoughts'}
      </button>
      {expanded && (
        <div className="thought-content">
          {content}
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Thought content displayed correctly
- [ ] Expandable/collapsible UI
- [ ] Proper styling
- [ ] Performance optimized (React.memo)

### Implementation: Sources Component

**File**: `frontend/src/components/chat/Sources.tsx`

```typescript
export function Sources({ sources }: { sources: Array<{url: string; title?: string}> }) {
  if (!sources.length) return null;

  return (
    <div className="sources">
      <h4>Sources</h4>
      <ul>
        {sources.map((source, idx) => (
          <li key={idx}>
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.title || source.url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Sources displayed with links
- [ ] Title fallback to URL
- [ ] Proper styling
- [ ] Security: `rel="noopener noreferrer"`

### Update: ChatMessage Component

**Changes**:
```typescript
export function ChatMessage({ message }: { message: ChatMessage }) {
  const thoughtContent = message.metadata?.thoughtContent;
  const sources = message.metadata?.sources;

  return (
    <div className="chat-message">
      <div className="message-content">
        {message.content}
      </div>

      {thoughtContent && <ThoughtProcess content={thoughtContent} />}
      {sources && <Sources sources={sources} />}

      {/* ... existing UI ... */}
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Thought process rendered when available
- [ ] Sources rendered when available
- [ ] No breaking changes to existing messages
- [ ] Backward compatible with legacy messages

---

## Phase 3.4: Testing & Rollout (Week 4)

### E2E Tests (Playwright)

**File**: `frontend/tests/e2e/adk-streaming.spec.ts`

**Test Scenarios**:
- [ ] Full research flow with canonical streaming
- [ ] Thought process displayed correctly
- [ ] Sources displayed correctly
- [ ] Function calls visualized
- [ ] Agent transfers tracked
- [ ] Error handling graceful
- [ ] Feature flag switching works

**Run Tests**:
```bash
cd frontend
npm run test:e2e -- adk-streaming
```

### Chrome DevTools MCP Verification

**Script**:
```bash
# Start all services
pm2 start ecosystem.config.js

# Enable feature flags
export ENABLE_ADK_CANONICAL_STREAM=true
export NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=true

# Restart services
pm2 restart all

# Use Chrome DevTools MCP for verification
# See CLAUDE.md: "Chrome DevTools MCP - Browser Verification Tool"
```

**Verification Steps**:
1. [ ] Navigate to `http://localhost:3000/chat`
2. [ ] Take snapshot to verify UI loaded
3. [ ] Fill message input: "research quantum computing"
4. [ ] Click send button
5. [ ] Wait for SSE stream to complete
6. [ ] List console messages (check for errors)
7. [ ] List network requests (verify `/run_sse` used)
8. [ ] Take screenshot of final result
9. [ ] Verify thought process UI rendered
10. [ ] Verify sources displayed
11. [ ] Check for memory leaks (Chrome DevTools Memory tab)

### Performance Benchmarks

**Metrics to Measure**:
- [ ] Parser overhead: < 5ms per event
- [ ] UI update latency: < 50ms
- [ ] Memory usage: < 10MB for 1000 events
- [ ] No memory leaks after 1000+ events
- [ ] Smooth streaming with 100+ events/sec

**Tools**:
- Chrome DevTools Performance tab
- React DevTools Profiler
- Custom benchmarking script

### Documentation

- [ ] Update `README.md` with feature flags
- [ ] Update `CLAUDE.md` with Phase 3 completion
- [ ] Create `docs/frontend/ADK-Event-Parser.md` (API reference)
- [ ] Create `docs/frontend/ADK-Migration-Guide.md` (migration guide)
- [ ] Update `docs/sse/SSE-Overview.md` with canonical mode

### Rollout Plan

**Week 1: Internal Testing**
- [ ] Enable feature flags on development environment
- [ ] Test with real ADK backend
- [ ] Collect feedback from team

**Week 2: Beta Rollout**
- [ ] Enable for 10% of users (feature flag percentage)
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Collect user feedback

**Week 3: Gradual Rollout**
- [ ] Enable for 50% of users
- [ ] Continue monitoring
- [ ] Fix any critical issues

**Week 4: Full Rollout**
- [ ] Enable for 100% of users
- [ ] Update documentation
- [ ] Mark Phase 3 complete

---

## Success Criteria

### Functional Requirements
- ✅ Parser handles 100% of ADK Event structures
- ✅ Feature flag enables seamless switching
- ✅ Zero UI breakage in legacy mode
- ✅ All existing tests pass

### Performance Requirements
- ✅ Parser overhead < 5ms per event
- ✅ No memory leaks (verified with Chrome DevTools)
- ✅ Smooth streaming with 100+ events/sec

### Quality Requirements
- ✅ 100% TypeScript type coverage
- ✅ 90%+ test coverage
- ✅ Zero console errors in production
- ✅ Documentation complete

---

## Troubleshooting

### Parser Returns Null

**Symptoms**: Events not rendering, console shows "Null result"

**Debug Steps**:
1. Check raw SSE data format
2. Verify JSON structure matches ADK Event schema
3. Enable verbose logging: `parseAdkEventSSE(data, { verbose: true })`
4. Check for missing required fields

### Feature Flag Not Working

**Symptoms**: Canonical mode not activating

**Debug Steps**:
1. Verify `.env.local` has `NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=true`
2. Restart frontend: `pm2 restart frontend`
3. Check browser localStorage: `localStorage.getItem('NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM')`
4. Verify `isAdkCanonicalStreamEnabled()` returns true

### Memory Leaks

**Symptoms**: Memory usage grows unbounded

**Debug Steps**:
1. Check circular buffer implementation in store
2. Verify `rawAdkEvents` limited to 1000
3. Verify `rawAdkEvents` excluded from localStorage
4. Use Chrome DevTools Memory tab to find leaks

### Performance Degradation

**Symptoms**: Parser taking > 5ms per event

**Debug Steps**:
1. Disable schema validation (production default)
2. Check for unnecessary re-renders
3. Use React DevTools Profiler
4. Consider lazy parsing strategy

---

## References

- **Architecture Document**: `docs/plans/phase3_frontend_architecture.md`
- **Planning Document**: `docs/plans/multi_agent_adk_alignment_plan.md`
- **Phase 1 Summary**: `docs/plans/phase_1_completion_summary.md`
- **ADK Python Reference**: `docs/adk/refs/official-adk-python/src/google/adk/events/event.py`
- **Frontend Reference**: `docs/adk/refs/frontend-nextjs-fullstack/nextjs/src/lib/streaming/`
- **Project Instructions**: `CLAUDE.md`

---

**Checklist Version**: 1.0.0
**Author**: Claude Code (Anthropic)
**Date**: 2025-10-18
**Status**: Ready for Implementation
**Next Action**: Start Phase 3.1 - Parser Infrastructure
