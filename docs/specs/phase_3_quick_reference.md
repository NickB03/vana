# Phase 3 Quick Reference Card

**Full Specification**: `docs/specs/phase_3_frontend_sse_specification.md`
**Memory Key**: `sparc/phase3/specification` (namespace: `vana-project`)
**Created**: 2025-10-18

---

## 📋 Executive Summary

Replace frontend's flattened event parsing with canonical ADK `Event` model consumption. Enable multi-agent transcript rendering with proper author attribution and function call/response handling.

**Source**: Lines 112-136 of `docs/plans/multi_agent_adk_alignment_plan.md`

---

## 🎯 Key Objectives

1. Parse full ADK events with `content.parts[]`, `author`, `functionCall`, `functionResponse`
2. Distinguish agent messages via `event.author` field
3. Extract status from function responses
4. Detect agent transfers via `event.actions.transfer_to_agent`
5. Store canonical events + derive UI messages

---

## 📁 Files to Create (7 new)

```
frontend/src/lib/streaming/
├── adk-event-parser.ts          (200-300 LOC)
├── adk-event-types.ts           (100-150 LOC)
└── adk-event-normalizer.ts      (150-200 LOC)

frontend/src/hooks/chat/
├── adk-event-selectors.ts       (150-200 LOC)
└── __tests__/
    ├── adk-event-parser.test.ts (300-400 LOC)
    └── adk-event-normalizer.test.ts (200-300 LOC)

frontend/tests/e2e/
└── multi-agent-chat.spec.ts     (200-300 LOC)
```

**Total New Code**: ~1,300-1,850 LOC

---

## 🔧 Files to Modify (6 existing)

| File | Lines | Changes |
|------|-------|---------|
| `useSSE.ts` | 180-233 | Replace `parseEventData` with ADK parser |
| `sse-event-handlers.ts` | 216-416 | Switch from event type to author-based routing |
| `store.ts` | Multiple | Add `rawEvents[]` storage + selectors |
| `types.ts` | Multiple | Add `AdkEvent`, `ParsedAdkEvent`, `AgentTransition` |
| `useChatStream.ts` | Multiple | Integrate ADK event selectors |
| `lib/env.ts` | Add | Feature flag `NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM` |

---

## 🔑 Core Interfaces (from ADK References)

```typescript
// Source: docs/adk/refs/official-adk-python/src/google/adk/events/event.py
interface AdkEvent {
  id: string;
  author: string;              // 'user' or agent name
  invocationId: string;
  timestamp: number;
  content?: {
    parts?: Array<
      | { text: string; thought?: boolean }
      | { functionCall: AdkFunctionCall }
      | { functionResponse: AdkFunctionResponse }
    >
  };
  actions?: {
    transfer_to_agent?: string;
    skip_summarization?: boolean;
  };
  partial?: boolean;
}

interface ParsedAdkEvent {
  rawEvent: AdkEvent;
  messageId: string;
  author: string;
  textParts: string[];           // Non-thought text
  thoughtParts: string[];        // Thought-flagged text
  functionCalls: AdkFunctionCall[];
  functionResponses: AdkFunctionResponse[];
  isAgentTransfer: boolean;
  transferTargetAgent?: string;
  isFinalResponse: boolean;
}
```

---

## 🔄 Key Integration Points

### 1. useSSE.ts Refactor

```typescript
// BEFORE (current)
const parsed = JSON.parse(data);
return { type: fallbackType, data: { ...parsed } };

// AFTER (Phase 3)
const rawEvent: AdkEvent = JSON.parse(data);
return normalizeAdkEvent(rawEvent, eventType);
```

### 2. Event Handler Pattern

```typescript
// BEFORE: Switch on event type
switch (type) {
  case 'research_started': { /* ... */ }
  case 'research_update': { /* ... */ }
}

// AFTER: Switch on author + inspect content
switch (event.author) {
  case 'plan_generator':
  case 'section_researcher': {
    processAgentEvent(event);
    break;
  }
}

// NEW: Handle function responses
event.content?.parts?.forEach(part => {
  if (part.functionResponse) {
    handleFunctionResponse(part.functionResponse);
  }
});
```

### 3. Store Pattern

```typescript
// NEW: Store canonical events
interface ChatSession {
  rawEvents: AdkEvent[];              // Source of truth
  messages: DerivedMessage[];         // Computed from rawEvents
  agentTransitionHistory: AgentTransition[];
}

// NEW: Derive messages via selectors
const selectDerivedMessages = (session: ChatSession) => {
  return session.rawEvents.flatMap(event => {
    // Extract text parts as messages
    return event.content?.parts
      ?.filter(p => 'text' in p && !p.thought)
      .map(p => createMessage(p.text, event.author));
  });
};
```

---

## ✅ Success Criteria

### Quantitative
- **Test Coverage**: >90% for parser modules
- **Performance**: <50ms message derivation (1000 events)
- **Memory**: <10MB for 1000 canonical events
- **E2E Pass Rate**: 100% (5 scenarios minimum)

### Qualitative
- Multi-agent messages show correct author labels
- Function responses render as status updates
- Agent transitions tracked in session history
- No console errors during SSE streaming

---

## 🧪 Validation Steps

### 1. Unit Tests
```bash
npm run test frontend/src/hooks/chat/__tests__/adk-event-parser.test.ts
npm run test frontend/src/hooks/chat/__tests__/adk-event-normalizer.test.ts
```

### 2. E2E Tests
```bash
npm run test:e2e frontend/tests/e2e/multi-agent-chat.spec.ts
```

### 3. Chrome DevTools MCP Verification
```bash
# Start services
pm2 start ecosystem.config.js

# Browser verification
mcp__chrome-devtools__navigate_page { url: "http://localhost:3000" }
mcp__chrome-devtools__list_console_messages  # Check for errors
mcp__chrome-devtools__fill { uid: "chat-input", value: "Research quantum computing" }
mcp__chrome-devtools__click { uid: "send-button" }
mcp__chrome-devtools__take_snapshot  # Verify multi-agent rendering
mcp__chrome-devtools__list_network_requests { resourceTypes: ["eventsource"] }
```

---

## 🚀 Deployment Checklist

### Pre-Deploy
- [ ] All unit tests pass (>90% coverage)
- [ ] E2E tests pass (5 scenarios)
- [ ] Chrome DevTools MCP verification complete
- [ ] Performance profiling: <50ms derivation
- [ ] Memory leak testing: 24hr session
- [ ] Feature flag added to `.env.example`

### Deploy
- [ ] Staging with `NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=true`
- [ ] Monitor error rates for 48 hours
- [ ] Production with flag enabled
- [ ] Post-deployment verification

### Post-Deploy (2 weeks)
- [ ] Remove `parseLegacyEvent` function
- [ ] Remove feature flag checks
- [ ] Update CHANGELOG.md
- [ ] Archive old tests

---

## ⏱️ Timeline

**Estimated Effort**: 84 developer hours (~2 weeks for 1 developer)

| Task | Hours |
|------|-------|
| Type definitions | 4h |
| Parser implementation | 8h |
| Normalizer implementation | 6h |
| useSSE integration | 4h |
| Store refactoring | 8h |
| Event handlers update | 10h |
| Selectors | 6h |
| Unit tests | 12h |
| E2E tests | 8h |
| Chrome DevTools verification | 4h |
| Documentation | 6h |
| Code review | 8h |

---

## 🔗 Reference Materials

### ADK Sources
- **Event Model**: `docs/adk/refs/official-adk-python/src/google/adk/events/event.py`
- **SSE Parser**: `docs/adk/refs/frontend-nextjs-fullstack/nextjs/src/lib/streaming/sse-parser.ts`
- **Handlers**: `docs/adk/refs/frontend-nextjs-fullstack/nextjs/src/lib/handlers/run-sse-common.ts`

### Implementation Plan
- **Full Spec**: `docs/specs/phase_3_frontend_sse_specification.md`
- **Master Plan**: `docs/plans/multi_agent_adk_alignment_plan.md` (lines 112-136)

---

## 🎯 Next Phase

**Phase 4**: Backend agent dispatcher + conversation orchestration (after Phase 3 complete)

---

**Memory Retrieval**:
```bash
# Retrieve full specification from Claude Flow memory
npx claude-flow@latest mcp start
# Then use MCP tool: mcp__claude-flow__memory_usage
# action: "retrieve", key: "sparc/phase3/specification", namespace: "vana-project"
```
