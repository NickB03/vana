# Phase 3 - Frontend SSE Overhaul Specification

**Document Version**: 1.0
**Created**: 2025-10-18
**Status**: Ready for Implementation
**Memory Key**: `sparc/phase3/specification`

---

## Executive Summary

This specification defines **Phase 3** of the multi-agent ADK alignment plan: complete frontend refactoring to consume canonical ADK `Event` payloads instead of custom flattened events. This phase aligns the frontend with Google ADK's event model, enabling multi-agent transcript rendering, proper agent authorship tracking, and function call/response handling.

**Source**: `docs/plans/multi_agent_adk_alignment_plan.md` (lines 112-136)

---

## 1. Objectives

1. **ADK Event Normalization**: Parse full ADK `Event` objects with `content.parts[]`, `author`, `functionCall`, `functionResponse`
2. **Multi-Agent Support**: Distinguish conversational agent messages via `event.author`
3. **Function Call Handling**: Emit status updates from `functionResponse`/`actions`
4. **Agent Transfer Detection**: Detect new agent assignments via `event.actions.transfer_to_agent`
5. **Store Refactoring**: Store canonical events and derive UI messages via selectors
6. **Backward Compatibility**: Provide adapter layer during feature flag rollout

---

## 2. Files to Create/Modify

### 2.1 New Files to Create

| File Path | Purpose | LOC Est. |
|-----------|---------|----------|
| `frontend/src/lib/streaming/adk-event-parser.ts` | Core ADK event parsing utilities | 200-300 |
| `frontend/src/lib/streaming/adk-event-types.ts` | TypeScript interfaces for ADK events | 100-150 |
| `frontend/src/lib/streaming/adk-event-normalizer.ts` | Event normalization logic | 150-200 |
| `frontend/src/hooks/chat/adk-event-selectors.ts` | Zustand selectors for event-to-message mapping | 150-200 |
| `frontend/src/hooks/chat/__tests__/adk-event-parser.test.ts` | Unit tests for parser | 300-400 |
| `frontend/src/hooks/chat/__tests__/adk-event-normalizer.test.ts` | Unit tests for normalizer | 200-300 |
| `frontend/tests/e2e/multi-agent-chat.spec.ts` | E2E tests for multi-agent rendering | 200-300 |

**Total New Code**: ~1,300-1,850 LOC

### 2.2 Files to Modify

| File Path | Changes Required | Complexity |
|-----------|------------------|------------|
| `frontend/src/hooks/useSSE.ts` | Replace `parseEventData` with ADK parser; expose `lastEvent` as canonical event | Medium |
| `frontend/src/hooks/chat/sse-event-handlers.ts` | Update handlers to process ADK events; remove `research_update` reliance | High |
| `frontend/src/hooks/chat/store.ts` | Add event storage; create message derivation selectors | High |
| `frontend/src/hooks/chat/types.ts` | Add `AdkEvent` interface; extend `ChatSession` | Low |
| `frontend/src/hooks/chat/useChatStream.ts` | Integrate ADK event selectors | Medium |
| `frontend/src/lib/env.ts` | Add `NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM` flag | Low |

**Total Modified Files**: 6 core files

---

## 3. Exact Interfaces and Types (from ADK References)

### 3.1 Core ADK Event Model

**Source**: `docs/adk/refs/official-adk-python/src/google/adk/events/event.py`

```typescript
// frontend/src/lib/streaming/adk-event-types.ts

/**
 * ADK Part types - matches google.genai.types.Part
 */
export interface AdkTextPart {
  text: string;
  thought?: boolean;
}

export interface AdkFunctionCall {
  name: string;
  args: Record<string, unknown>;
  id: string;
}

export interface AdkFunctionResponse {
  name: string;
  response: Record<string, unknown>;
  id: string;
}

export interface AdkCodeExecutionResult {
  outcome: string;
  output?: string;
}

export type AdkPart =
  | { text: string; thought?: boolean }
  | { functionCall: AdkFunctionCall }
  | { functionResponse: AdkFunctionResponse }
  | { codeExecutionResult: AdkCodeExecutionResult };

/**
 * ADK Content - matches google.genai.types.Content
 */
export interface AdkContent {
  parts?: AdkPart[];
  role?: 'user' | 'model';
}

/**
 * ADK Event Actions - matches EventActions from ADK
 */
export interface AdkEventActions {
  skip_summarization?: boolean;
  transfer_to_agent?: string;
  [key: string]: unknown;
}

/**
 * Canonical ADK Event - matches Event from official-adk-python
 * Source: docs/adk/refs/official-adk-python/src/google/adk/events/event.py
 */
export interface AdkEvent {
  id: string;
  author: string;
  invocationId: string;
  timestamp: number;
  content?: AdkContent;
  actions?: AdkEventActions;
  longRunningToolIds?: string[];
  branch?: string;
  partial?: boolean;
}

/**
 * Parsed SSE Event with raw data and extracted information
 */
export interface ParsedAdkEvent {
  rawEvent: AdkEvent;
  messageId: string;
  author: string;
  textParts: string[];
  thoughtParts: string[];
  functionCalls: AdkFunctionCall[];
  functionResponses: AdkFunctionResponse[];
  isAgentTransfer: boolean;
  transferTargetAgent?: string;
  isFinalResponse: boolean;
}
```

### 3.2 Event Normalization Interface

**Source**: `docs/adk/refs/frontend-nextjs-fullstack/nextjs/src/lib/streaming/sse-parser.ts`

```typescript
/**
 * SSE Event Normalization
 */
export interface SseEventBlock {
  event?: string;
  id?: string;
  data: string;
  retry?: number;
}

export interface NormalizeResult {
  success: boolean;
  event?: ParsedAdkEvent;
  error?: string;
}
```

### 3.3 Store Extensions

```typescript
// frontend/src/hooks/chat/types.ts additions

export interface ChatSession {
  // ... existing fields ...

  // NEW: Canonical event storage
  rawEvents: AdkEvent[];

  // NEW: Event processing metadata
  lastProcessedEventId?: string;
  agentTransitionHistory: AgentTransition[];
}

export interface AgentTransition {
  fromAgent: string;
  toAgent: string;
  eventId: string;
  timestamp: string;
}

// NEW: Message derivation metadata
export interface DerivedMessage extends ChatMessage {
  sourceEventIds: string[];
  derivedFrom: 'text' | 'functionResponse' | 'agentStatus';
}
```

---

## 4. Integration Points with Existing Code

### 4.1 `useSSE.ts` Integration

**Current State**: Lines 180-233 parse flattened `{type, data}` events
**Target State**: Parse full ADK events with structured content

```typescript
// BEFORE (current)
const parseEventData = useCallback((data: string, fallbackType?: string): AgentNetworkEvent | null => {
  const parsed = JSON.parse(trimmedData);
  return {
    type: (fallbackType as AgentNetworkEvent['type']) || 'connection',
    data: { timestamp: new Date().toISOString(), ...parsed }
  };
}, []);

// AFTER (Phase 3)
import { parseAdkEvent, normalizeAdkEvent } from '@/lib/streaming/adk-event-parser';

const parseEventData = useCallback((data: string, eventType?: string): ParsedAdkEvent | null => {
  try {
    const rawEvent: AdkEvent = JSON.parse(data);
    return normalizeAdkEvent(rawEvent, eventType);
  } catch (error) {
    console.warn('Failed to parse ADK event:', error);
    return null;
  }
}, []);
```

**Modified Lines**: 180-233
**New Dependencies**: `adk-event-parser`, `adk-event-types`

### 4.2 `sse-event-handlers.ts` Integration

**Current State**: Lines 224-416 handle custom event types (`research_started`, `research_update`, etc.)
**Target State**: Process ADK events via author + content inspection

```typescript
// BEFORE (current)
switch (type) {
  case 'research_started': { /* ... */ }
  case 'research_update': { /* ... */ }
  case 'research_complete': { /* ... */ }
}

// AFTER (Phase 3)
switch (event.author) {
  case 'user': {
    // User message - already in store
    break;
  }
  case 'plan_generator':
  case 'section_researcher':
  case 'enhanced_search_executor': {
    // Agent working - extract text/function responses
    processAgentEvent(event, currentSessionId);
    break;
  }
  default: {
    // Unknown agent - log and skip
    console.warn('Unknown agent author:', event.author);
  }
}

// NEW: Process function responses for status updates
if (event.content?.parts) {
  event.content.parts.forEach(part => {
    if (part.functionResponse) {
      handleFunctionResponse(part.functionResponse, currentSessionId);
    }
  });
}

// NEW: Detect agent transfers
if (event.actions?.transfer_to_agent) {
  handleAgentTransfer(
    event.author,
    event.actions.transfer_to_agent,
    currentSessionId
  );
}
```

**Modified Lines**: 216-416
**New Functions**: `processAgentEvent`, `handleFunctionResponse`, `handleAgentTransfer`

### 4.3 Store Integration

**Current State**: `store.ts` stores messages directly
**Target State**: Store canonical events + derive messages via selectors

```typescript
// NEW store actions
export interface ChatStreamState {
  // ... existing ...

  // NEW: Event storage
  addRawEvent: (sessionId: string, event: AdkEvent) => void;
  getRawEvents: (sessionId: string) => AdkEvent[];

  // NEW: Message derivation (computed)
  getDerivedMessages: (sessionId: string) => DerivedMessage[];
}

// NEW selectors (frontend/src/hooks/chat/adk-event-selectors.ts)
export const selectDerivedMessages = (session: ChatSession): DerivedMessage[] => {
  return session.rawEvents.flatMap(event => {
    // Extract text parts as user/assistant messages
    if (event.content?.parts) {
      return event.content.parts
        .filter(part => 'text' in part && !part.thought)
        .map(part => ({
          id: `msg_${event.id}_${part.text?.slice(0, 10)}`,
          content: part.text!,
          role: event.author === 'user' ? 'user' : 'assistant',
          timestamp: new Date(event.timestamp * 1000).toISOString(),
          sessionId: session.id,
          sourceEventIds: [event.id],
          derivedFrom: 'text' as const,
          metadata: {
            author: event.author,
            invocationId: event.invocationId,
          }
        }));
    }
    return [];
  });
};

export const selectThoughtProcesses = (session: ChatSession): Record<string, string> => {
  const thoughts: Record<string, string> = {};
  session.rawEvents.forEach(event => {
    if (event.content?.parts) {
      const thoughtText = event.content.parts
        .filter(part => 'text' in part && part.thought)
        .map(part => part.text)
        .join('\n');
      if (thoughtText) {
        thoughts[event.id] = thoughtText;
      }
    }
  });
  return thoughts;
};
```

**New Files**: `adk-event-selectors.ts`
**Modified Store Actions**: 6 new actions

---

## 5. Success Criteria and Validation Steps

### 5.1 Unit Test Coverage

**File**: `frontend/src/hooks/chat/__tests__/adk-event-parser.test.ts`

```typescript
describe('ADK Event Parser', () => {
  it('should parse text content from content.parts[]', () => {
    const event: AdkEvent = {
      id: 'evt_123',
      author: 'plan_generator',
      invocationId: 'inv_456',
      timestamp: Date.now() / 1000,
      content: {
        parts: [
          { text: 'Hello from agent' },
          { text: 'This is a thought', thought: true }
        ]
      }
    };

    const parsed = normalizeAdkEvent(event);
    expect(parsed.textParts).toEqual(['Hello from agent']);
    expect(parsed.thoughtParts).toEqual(['This is a thought']);
  });

  it('should extract function responses', () => {
    const event: AdkEvent = {
      id: 'evt_789',
      author: 'section_researcher',
      invocationId: 'inv_456',
      timestamp: Date.now() / 1000,
      content: {
        parts: [
          {
            functionResponse: {
              name: 'web_search',
              response: { results: ['result1', 'result2'] },
              id: 'fn_123'
            }
          }
        ]
      }
    };

    const parsed = normalizeAdkEvent(event);
    expect(parsed.functionResponses).toHaveLength(1);
    expect(parsed.functionResponses[0].name).toBe('web_search');
  });

  it('should detect agent transfers', () => {
    const event: AdkEvent = {
      id: 'evt_transfer',
      author: 'dispatcher',
      invocationId: 'inv_789',
      timestamp: Date.now() / 1000,
      actions: {
        transfer_to_agent: 'section_researcher'
      }
    };

    const parsed = normalizeAdkEvent(event);
    expect(parsed.isAgentTransfer).toBe(true);
    expect(parsed.transferTargetAgent).toBe('section_researcher');
  });
});
```

**Coverage Target**: >90% for all parser/normalizer modules

### 5.2 Integration Test

**File**: `frontend/tests/e2e/multi-agent-chat.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Multi-Agent Chat Rendering', () => {
  test('should render multi-agent transcript with author labels', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Send message that triggers multi-agent flow
    await page.fill('[data-testid="chat-input"]', 'Research quantum computing');
    await page.click('[data-testid="send-button"]');

    // Wait for streaming to complete
    await page.waitForSelector('[data-testid="message-complete"]', { timeout: 30000 });

    // Verify messages from different agents are displayed
    const messages = await page.$$('[data-testid^="message-"]');
    expect(messages.length).toBeGreaterThan(2);

    // Verify author labels
    const authorLabels = await page.$$('[data-testid="message-author"]');
    const authors = await Promise.all(authorLabels.map(el => el.textContent()));

    expect(authors).toContain('plan_generator');
    expect(authors).toContain('section_researcher');
  });

  test('should display function responses as status updates', async ({ page }) => {
    await page.goto('http://localhost:3000');

    await page.fill('[data-testid="chat-input"]', 'Find latest AI research papers');
    await page.click('[data-testid="send-button"]');

    // Wait for function call status
    await page.waitForSelector('[data-testid="status-function-call"]', { timeout: 10000 });

    const statusText = await page.textContent('[data-testid="status-function-call"]');
    expect(statusText).toContain('web_search');
  });
});
```

**E2E Tests Required**: 5 scenarios minimum

### 5.3 Manual Verification Checklist

Using Chrome DevTools MCP (as per CLAUDE.md requirements):

```bash
# 1. Start all services
pm2 start ecosystem.config.js

# 2. Open browser with Chrome DevTools MCP
mcp__chrome-devtools__navigate_page { url: "http://localhost:3000" }

# 3. Verify console has no errors
mcp__chrome-devtools__list_console_messages

# 4. Send test message
mcp__chrome-devtools__fill { uid: "chat-input", value: "Research quantum computing" }
mcp__chrome-devtools__click { uid: "send-button" }

# 5. Monitor SSE stream
mcp__chrome-devtools__list_network_requests { resourceTypes: ["eventsource", "fetch"] }

# 6. Verify message rendering
mcp__chrome-devtools__take_snapshot
# Check for:
# - Message author labels (plan_generator, section_researcher)
# - Function call status updates
# - Thought process rendering (if enabled)
# - Agent transition indicators

# 7. Check for SSE parsing errors in console
mcp__chrome-devtools__list_console_messages
```

**Validation Pass Criteria**:
- ✅ No console errors related to SSE parsing
- ✅ All agent messages display correct author labels
- ✅ Function responses render as status updates
- ✅ Thought processes (if enabled) show in separate UI element
- ✅ No duplicate message content
- ✅ Network request shows correct SSE endpoint

---

## 6. Backward Compatibility Strategy

### 6.1 Feature Flag Implementation

**File**: `frontend/src/lib/env.ts`

```typescript
export const config = {
  // ... existing ...

  adk: {
    // NEW: Enable canonical ADK event parsing
    enableCanonicalStream: process.env.NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM === 'true',

    // Existing configs
    appName: process.env.NEXT_PUBLIC_ADK_APP_NAME || 'vana',
    defaultUser: process.env.NEXT_PUBLIC_ADK_DEFAULT_USER || 'default',
  }
};
```

### 6.2 Adapter Layer Pattern

**File**: `frontend/src/hooks/useSSE.ts` (modified)

```typescript
const parseEventData = useCallback((data: string, eventType?: string) => {
  if (config.adk.enableCanonicalStream) {
    // NEW: Parse ADK events
    return parseAdkEvent(data, eventType);
  } else {
    // LEGACY: Parse flattened events
    return parseLegacyEvent(data, eventType);
  }
}, []);
```

**Migration Path**:
1. Deploy with `NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=false` (default)
2. Test canonical parsing in dev/staging with flag enabled
3. Monitor error rates for 48 hours
4. Enable in production after validation
5. Remove legacy code after 2 weeks of stable operation

---

## 7. Dependencies and External References

### 7.1 ADK Reference Materials

| Reference | Location | Usage |
|-----------|----------|-------|
| **Event Model** | `docs/adk/refs/official-adk-python/src/google/adk/events/event.py` | Core data structure |
| **SSE Parser** | `docs/adk/refs/frontend-nextjs-fullstack/nextjs/src/lib/streaming/sse-parser.ts` | Parsing patterns |
| **Event Handlers** | `docs/adk/refs/frontend-nextjs-fullstack/nextjs/src/lib/handlers/run-sse-common.ts` | Payload schemas |

### 7.2 Implementation Dependencies

```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "vitest": "^1.0.0"
  }
}
```

**No new runtime dependencies required** - pure TypeScript refactoring

---

## 8. Performance Considerations

### 8.1 Memory Optimization

**Current Issue**: `MAX_EVENTS = 1000` buffer in `useSSE.ts` (line 71)

```typescript
// MAINTAIN: Circular buffer for rawEvents
const MAX_RAW_EVENTS = 1000;

export const addRawEvent = (sessionId: string, event: AdkEvent) => {
  set(state => {
    const session = state.sessions[sessionId];
    if (!session) return state;

    const newEvents = [...session.rawEvents, event];
    if (newEvents.length > MAX_RAW_EVENTS) {
      // Keep most recent events
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            rawEvents: newEvents.slice(-MAX_RAW_EVENTS)
          }
        }
      };
    }
    return state;
  });
};
```

### 8.2 Selector Memoization

```typescript
// Use Zustand's built-in shallow equality
import { useShallow } from 'zustand/react/shallow';

export function useDerivedMessages(sessionId: string) {
  return useChatStore(
    useShallow(state => {
      const session = state.sessions[sessionId];
      return session ? selectDerivedMessages(session) : [];
    })
  );
}
```

**Performance Target**: <50ms for message derivation (1000 events)

---

## 9. Risk Mitigation

### 9.1 Known Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Breaking UI rendering** | Medium | High | Feature flag + adapter layer |
| **Event parsing errors** | Medium | Medium | Comprehensive unit tests |
| **Performance regression** | Low | Medium | Memoized selectors + profiling |
| **Multi-agent confusion** | Low | High | Clear author labels + E2E tests |

### 9.2 Rollback Plan

1. **Immediate Rollback**: Set `NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=false`
2. **Code Rollback**: Revert PRs via Git (tag pre-Phase-3 commits)
3. **Database Rollback**: Not applicable (no schema changes)
4. **Communication**: Update status page + notify users

---

## 10. Implementation Checklist

### 10.1 Development Phase

- [ ] Create `adk-event-types.ts` with all interfaces
- [ ] Implement `adk-event-parser.ts` core logic
- [ ] Implement `adk-event-normalizer.ts`
- [ ] Write unit tests (>90% coverage)
- [ ] Update `useSSE.ts` with feature flag
- [ ] Refactor `sse-event-handlers.ts` for ADK events
- [ ] Create `adk-event-selectors.ts`
- [ ] Update `store.ts` with event storage
- [ ] Update `types.ts` with new interfaces

### 10.2 Testing Phase

- [ ] Unit tests pass (npm run test)
- [ ] E2E tests pass (npm run test:e2e)
- [ ] Chrome DevTools MCP verification complete
- [ ] Performance profiling complete (<50ms derivation)
- [ ] Memory leak testing (24hr session)

### 10.3 Deployment Phase

- [ ] Feature flag added to `.env.example`
- [ ] Documentation updated (README.md)
- [ ] Staging deployment with flag enabled
- [ ] 48hr monitoring period
- [ ] Production deployment
- [ ] Post-deployment verification

### 10.4 Cleanup Phase (2 weeks post-deploy)

- [ ] Remove legacy `parseLegacyEvent` function
- [ ] Remove feature flag checks
- [ ] Archive old event handler tests
- [ ] Update CHANGELOG.md

---

## 11. Documentation Updates Required

### 11.1 Files to Update

1. **README.md**: Section "SSE Streaming" (add ADK event model description)
2. **docs/sse/SSE-Overview.md**: Complete rewrite for canonical events
3. **NEW**: `docs/sse/ADK-Event-Consumption.md` (developer guide)
4. **CHANGELOG.md**: Phase 3 completion entry

### 11.2 Developer Guide Outline

**File**: `docs/sse/ADK-Event-Consumption.md`

```markdown
# ADK Event Consumption Guide

## Overview
Frontend consumes canonical ADK Event objects from `/run_sse` endpoint.

## Event Structure
[Show AdkEvent interface with examples]

## Processing Pipeline
1. SSE connection → parseAdkEvent
2. normalizeAdkEvent → ParsedAdkEvent
3. addRawEvent (store)
4. selectDerivedMessages (compute messages)
5. Render in UI

## Handling Multi-Agent Flows
[Examples of author detection, function responses]

## Testing
[How to test ADK event parsing]
```

---

## 12. Timeline and Effort Estimates

| Task | Developer Hours | Dependencies |
|------|----------------|--------------|
| **Type Definitions** | 4h | None |
| **Parser Implementation** | 8h | Type definitions |
| **Normalizer Implementation** | 6h | Parser |
| **useSSE Integration** | 4h | Parser, normalizer |
| **Store Refactoring** | 8h | Type definitions |
| **Event Handlers Update** | 10h | Parser, store |
| **Selectors Implementation** | 6h | Store |
| **Unit Tests** | 12h | All implementations |
| **E2E Tests** | 8h | All implementations |
| **Chrome DevTools Verification** | 4h | E2E tests |
| **Documentation** | 6h | All complete |
| **Code Review & Iteration** | 8h | All complete |

**Total Effort**: ~84 developer hours (~2 weeks for 1 developer)

---

## 13. Success Metrics

### 13.1 Quantitative Metrics

- **Test Coverage**: >90% for new parser modules
- **Performance**: Message derivation <50ms (1000 events)
- **Memory**: <10MB for 1000 canonical events
- **Error Rate**: <0.1% SSE parsing errors (production)
- **E2E Pass Rate**: 100% (all 5 scenarios)

### 13.2 Qualitative Metrics

- **Developer Experience**: Clear type inference in IDE
- **User Experience**: Correct multi-agent authorship display
- **Maintainability**: ADK reference alignment documented
- **Backward Compatibility**: Zero breaking changes during rollout

---

## 14. Appendix: Code Snippets

### A. Complete Parser Implementation (Pseudocode)

```typescript
// frontend/src/lib/streaming/adk-event-parser.ts

export function parseAdkEvent(
  data: string,
  eventType?: string
): ParsedAdkEvent | null {
  try {
    const rawEvent: AdkEvent = JSON.parse(data);

    // Validate required fields
    if (!rawEvent.id || !rawEvent.author || !rawEvent.invocationId) {
      console.warn('Invalid ADK event - missing required fields');
      return null;
    }

    return normalizeAdkEvent(rawEvent, eventType);
  } catch (error) {
    console.error('Failed to parse ADK event:', error);
    return null;
  }
}

export function normalizeAdkEvent(
  rawEvent: AdkEvent,
  eventType?: string
): ParsedAdkEvent {
  const textParts: string[] = [];
  const thoughtParts: string[] = [];
  const functionCalls: AdkFunctionCall[] = [];
  const functionResponses: AdkFunctionResponse[] = [];

  // Process content.parts[]
  if (rawEvent.content?.parts) {
    rawEvent.content.parts.forEach(part => {
      if ('text' in part) {
        if (part.thought) {
          thoughtParts.push(part.text);
        } else {
          textParts.push(part.text);
        }
      } else if ('functionCall' in part) {
        functionCalls.push(part.functionCall);
      } else if ('functionResponse' in part) {
        functionResponses.push(part.functionResponse);
      }
    });
  }

  // Detect agent transfers
  const isAgentTransfer = !!rawEvent.actions?.transfer_to_agent;
  const transferTargetAgent = rawEvent.actions?.transfer_to_agent;

  // Determine if final response
  const isFinalResponse = !rawEvent.partial &&
                          functionCalls.length === 0 &&
                          !rawEvent.longRunningToolIds;

  return {
    rawEvent,
    messageId: rawEvent.id,
    author: rawEvent.author,
    textParts,
    thoughtParts,
    functionCalls,
    functionResponses,
    isAgentTransfer,
    transferTargetAgent,
    isFinalResponse,
  };
}
```

### B. Store Selector Example

```typescript
// frontend/src/hooks/chat/adk-event-selectors.ts

export const selectAgentTransitions = (
  session: ChatSession
): AgentTransition[] => {
  return session.rawEvents
    .filter(event => event.actions?.transfer_to_agent)
    .map(event => ({
      fromAgent: event.author,
      toAgent: event.actions!.transfer_to_agent!,
      eventId: event.id,
      timestamp: new Date(event.timestamp * 1000).toISOString(),
    }));
};

export const selectLatestAgentStatus = (
  session: ChatSession
): Record<string, 'active' | 'idle'> => {
  const statusMap: Record<string, 'active' | 'idle'> = {};

  // Find last event from each agent
  const agentLastEvent = new Map<string, AdkEvent>();
  session.rawEvents.forEach(event => {
    if (!agentLastEvent.has(event.author) ||
        event.timestamp > agentLastEvent.get(event.author)!.timestamp) {
      agentLastEvent.set(event.author, event);
    }
  });

  // Determine status based on final response flag
  agentLastEvent.forEach((event, agent) => {
    const isFinal = !event.partial &&
                    event.content?.parts?.every(p => !('functionCall' in p));
    statusMap[agent] = isFinal ? 'idle' : 'active';
  });

  return statusMap;
};
```

---

## 15. Next Steps (Post-Phase 3)

After Phase 3 completion, proceed to:

1. **Phase 4**: Backend agent dispatcher implementation (conversation orchestration)
2. **Phase 5**: Clean-up and documentation (remove deprecated endpoints)

**Dependency**: Phase 3 must be complete and stable before starting Phase 4.

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-18 | SPARC Specification Agent | Initial specification document |

---

**END OF SPECIFICATION**
