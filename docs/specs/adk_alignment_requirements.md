# ADK Alignment Requirements Specification

This document provides a comprehensive, testable requirements checklist extracted from the Multi-Agent ADK Alignment Plan. Each requirement includes specific implementation details, target files, and expected outcomes.

---

## Phase 0 – Environment Preparation

### Requirement 0.1: Feature Flag Infrastructure
**Description:** Create configuration system for incremental feature rollout
**Priority:** High
**Files:**
- `app/config.py` (backend)
- `frontend/src/lib/env.ts` (frontend)

**Expected Behavior:**
- Backend exposes `ENABLE_ADK_CANONICAL_STREAM` flag (boolean)
- Backend exposes `ENABLE_AGENT_DISPATCHER` flag (boolean)
- Frontend exposes `NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM` flag (boolean)
- Flags default to `false` for safe rollout
- Helper functions to query flag state at runtime

**Acceptance Criteria:**
- [ ] Backend config module has feature flag getters
- [ ] Frontend env module has feature flag getters
- [ ] Default values are `false`
- [ ] Environment variables can override defaults
- [ ] Type-safe access (no magic strings)

**Test Coverage:**
- [ ] Unit test for backend config flag access
- [ ] Unit test for frontend env flag access
- [ ] Test environment variable override behavior

---

### Requirement 0.2: Baseline Test Suite Validation
**Description:** Ensure all existing SSE tests pass before making changes
**Priority:** Critical
**Files:**
- `tests/integration/test_sse_*` (backend)
- `tests/performance/test_sse_performance.py` (backend)
- `frontend/tests/e2e/sse-connection.spec.ts` (frontend)

**Expected Behavior:**
- All backend SSE integration tests pass
- All backend SSE performance tests pass
- All frontend SSE E2E tests pass
- No regressions in existing functionality

**Acceptance Criteria:**
- [ ] `poetry run pytest tests/integration/test_sse_*` passes
- [ ] `poetry run pytest tests/performance/test_sse_performance.py` passes
- [ ] `npm run test -- frontend/tests/e2e/sse-connection.spec.ts` passes
- [ ] Zero test failures in SSE-related suites

**Test Commands:**
```bash
# Backend
poetry run pytest tests/integration/test_sse_* tests/performance/test_sse_performance.py

# Frontend
npm run test -- frontend/tests/e2e/sse-connection.spec.ts
```

---

## Phase 1 – Backend Streaming Alignment

### Requirement 1.1: Canonical POST /run_sse Endpoint
**Description:** Implement ADK-compliant streaming endpoint with inline generator
**Priority:** Critical
**Files:**
- `app/routes/adk_routes.py`
- `app/server.py`

**API Pattern:**
```python
@app.post("/run_sse")
async def run_agent_sse(req: RunAgentRequest) -> StreamingResponse:
    async def stream():
        async with httpx.AsyncClient(...) as client:
            async with client.stream("POST", "http://127.0.0.1:8080/run_sse", json=req.model_dump(...)) as upstream:
                async for line in upstream.aiter_lines():
                    if line.startswith("data:"):
                        yield f"{line}\n"
    return StreamingResponse(stream(), media_type="text/event-stream")
```

**Expected Behavior:**
- Replace `run_session_sse` background task with inline streaming generator
- Use `RunAgentRequest` model from ADK references (`docs/adk/refs/official-adk-python/.../adk_web_server.py:168-177`)
- Stream raw ADK `Event` payloads without mutation
- Emit only standard SSE fields (`event`, `data`, optionally `id`, `retry`)
- No rebroadcasting or custom event transformation

**Acceptance Criteria:**
- [ ] Endpoint accepts `RunAgentRequest` payload
- [ ] Returns `StreamingResponse` with `media_type="text/event-stream"`
- [ ] Uses inline async generator (not background task)
- [ ] Proxies to ADK service at `http://127.0.0.1:8080/run_sse`
- [ ] Streams lines prefixed with `data:` unchanged
- [ ] Does not mutate event payloads
- [ ] Timeout set to 300s (configurable)

**Test Coverage:**
- [ ] Integration test: successful streaming with valid request
- [ ] Integration test: handles upstream errors gracefully
- [ ] Integration test: respects timeout configuration
- [ ] Manual curl test passes (see validation section)

---

### Requirement 1.2: Mirror ADK Path Routing
**Description:** Proxy ADK path format to canonical endpoint
**Priority:** High
**Files:**
- `app/routes/adk_routes.py`
- `app/server.py`

**API Pattern:**
```python
@app.post("/apps/{app}/users/{user}/sessions/{session}/run")
async def run_agent_adk_path(...) -> StreamingResponse:
    # Construct RunAgentRequest from path params
    # Forward to run_agent_sse
```

**Expected Behavior:**
- Route `/apps/{app}/users/{user}/sessions/{session}/run` proxies to `POST /run_sse`
- Path parameters map to `RunAgentRequest` fields
- Streams identical payload (no rebroadcast)
- Maintains ADK compatibility for clients expecting this path structure

**Acceptance Criteria:**
- [ ] ADK path route registered in FastAPI app
- [ ] Path parameters extracted and validated
- [ ] Proxies to canonical `run_agent_sse` internally
- [ ] Returns same streaming response format
- [ ] No additional processing or event mutation

**Test Coverage:**
- [ ] Integration test: ADK path returns same events as `/run_sse`
- [ ] Test parameter extraction from path
- [ ] Test error handling for invalid path params

---

### Requirement 1.3: RunAgentRequest Model
**Description:** Define request schema matching ADK specifications
**Priority:** High
**Files:**
- `app/models/adk_models.py` (new file)
- `app/routes/adk_routes.py`

**Model Pattern:**
```python
from pydantic import BaseModel, Field

class RunAgentRequest(BaseModel):
    app_name: str = Field(alias="appName")
    user_id: str = Field(alias="userId")
    session_id: str = Field(alias="sessionId")
    message: str
    # Additional fields per ADK spec

    class Config:
        populate_by_name = True
```

**Expected Behavior:**
- Model matches ADK `RunAgentRequest` schema (reference: `docs/adk/refs/official-adk-python/.../adk_web_server.py:168-177`)
- Uses camelCase aliases for JSON serialization
- Validates required fields
- Supports `model_dump(by_alias=True, exclude_none=True)`

**Acceptance Criteria:**
- [ ] Model defined with all required fields
- [ ] Field aliases match ADK naming conventions
- [ ] Validation rules implemented
- [ ] Serialization preserves camelCase
- [ ] Documentation includes field descriptions

**Test Coverage:**
- [ ] Unit test: valid request serialization
- [ ] Unit test: invalid request raises validation error
- [ ] Unit test: alias mapping works correctly

---

### Requirement 1.4: Event Multicasting Infrastructure
**Description:** Broadcast raw events to legacy consumers during transition
**Priority:** Medium
**Files:**
- `app/services/event_bus.py` (new file)
- `app/routes/adk_routes.py`
- `app/utils/sse_broadcaster.py`

**Implementation Pattern:**
```python
class EventBus:
    async def publish_event(self, event_json: dict):
        # Forward to EnhancedSSEBroadcaster (legacy)
        # Forward to session persistence layer
        # Guard with feature flags
```

**Expected Behavior:**
- Async listener accepts raw ADK `Event` JSON
- Forwards to existing `EnhancedSSEBroadcaster` (maintains `research_*` derived events)
- Forwards to session persistence layer (Phase 2)
- Feature flag guards legacy broadcaster integration
- Can be disabled once frontend migration complete

**Acceptance Criteria:**
- [ ] EventBus service created with publish method
- [ ] Integrates with existing SSEBroadcaster
- [ ] Feature flag controls legacy event forwarding
- [ ] Non-blocking async operation
- [ ] Error handling prevents broadcast failures from breaking stream

**Test Coverage:**
- [ ] Unit test: event publishing to multiple listeners
- [ ] Unit test: feature flag disables legacy broadcast
- [ ] Integration test: end-to-end event flow

---

### Requirement 1.5: Error Handling & Timeouts
**Description:** Propagate ADK errors as compliant event payloads
**Priority:** High
**Files:**
- `app/routes/adk_routes.py`

**Error Event Pattern:**
```python
error_event = {
    "error": "Upstream service unavailable",
    "timestamp": time.time(),
    "status_code": 503
}
yield f"data: {json.dumps(error_event)}\n\n"
```

**Expected Behavior:**
- Preserve 300s timeout (configurable)
- Emit ADK-compliant error events on failure
- Include timestamp and error description
- Propagate HTTP status from upstream
- Close connection after error event
- Log errors for debugging

**Acceptance Criteria:**
- [ ] Timeout configurable via environment variable
- [ ] Error events follow ADK schema
- [ ] HTTP status codes propagated correctly
- [ ] Connection closes gracefully after error
- [ ] Errors logged with context (session ID, user ID, etc.)

**Test Coverage:**
- [ ] Integration test: timeout triggers error event
- [ ] Integration test: upstream 500 error handling
- [ ] Integration test: network failure handling
- [ ] Unit test: error event formatting

---

### Requirement 1.6: Manual Validation
**Description:** Verify streaming endpoint with curl
**Priority:** High
**Test Command:**
```bash
curl -N -H "Authorization: Bearer <token>" \
  http://localhost:8000/run_sse \
  -d '{"appName":"vana", "userId":"test", "sessionId":"123", "message":"Hello"}'
```

**Expected Output:**
- SSE-formatted lines (`data: {...}`)
- Raw ADK `Event` JSON payloads
- No custom event transformation
- Clean connection termination

**Acceptance Criteria:**
- [ ] Curl command returns SSE stream
- [ ] Events match ADK `Event` schema
- [ ] No parse errors in JSON payloads
- [ ] Stream terminates cleanly

---

### Requirement 1.7: Automated Integration Tests
**Description:** Create comprehensive test suite for ADK passthrough
**Priority:** High
**Files:**
- `tests/integration/test_adk_run_sse_passthrough.py` (new file)

**Test Scenarios:**
```python
async def test_run_sse_success():
    # Valid request returns streaming response

async def test_run_sse_timeout():
    # Timeout emits error event

async def test_run_sse_upstream_error():
    # Upstream failure propagates error

async def test_adk_path_routing():
    # ADK path mirrors canonical endpoint
```

**Acceptance Criteria:**
- [ ] Test successful streaming with valid request
- [ ] Test timeout behavior
- [ ] Test upstream error handling
- [ ] Test ADK path routing
- [ ] Tests use mocked ADK service
- [ ] Tests verify event payload structure

---

## Phase 2 – Session Persistence Enhancements

### Requirement 2.1: Raw Event Storage Schema
**Description:** Update session store to persist unmodified ADK events
**Priority:** High
**Files:**
- `app/utils/session_store.py`
- `app/models/session_models.py`

**Schema Pattern:**
```python
class SessionData:
    session_id: str
    user_id: str
    app_name: str
    events: list[dict]  # Raw ADK Event objects
    summaries: dict     # Derived summaries (final report, agent snapshots)
    metadata: dict
```

**Expected Behavior:**
- `ingest_event` accepts full ADK event dict
- Store original event structure unchanged
- Maintain `events` list chronologically
- Separate derived summaries in `summaries` field
- Backward compatible with existing session queries

**Acceptance Criteria:**
- [ ] Session store accepts ADK event dicts
- [ ] Events stored in original form
- [ ] Summaries stored separately
- [ ] Schema versioning for backward compatibility
- [ ] Query methods return canonical events

**Test Coverage:**
- [ ] Unit test: ingest ADK event
- [ ] Unit test: retrieve events for session
- [ ] Unit test: derived summaries persist correctly
- [ ] Integration test: end-to-end event storage and retrieval

---

### Requirement 2.2: Backward Compatibility
**Description:** Ensure existing endpoints continue to function
**Priority:** High
**Files:**
- `app/routes/session_routes.py`
- `app/utils/session_store.py`

**Expected Behavior:**
- `/agent_network_history` endpoint still works
- Other session query endpoints unaffected
- Legacy event format supported in read operations
- Graceful handling of old vs new event schemas

**Acceptance Criteria:**
- [ ] All existing session endpoints return 200 OK
- [ ] Legacy event format still readable
- [ ] No breaking changes to API contracts
- [ ] Migration path documented

**Test Coverage:**
- [ ] Integration test: `/agent_network_history` with new schema
- [ ] Integration test: mixed old/new events in session
- [ ] Regression test suite passes

---

### Requirement 2.3: Migration Script (Optional)
**Description:** Backfill existing sessions with canonical structure
**Priority:** Low (optional)
**Files:**
- `app/scripts/migrate_sessions.py` (new file)

**Script Pattern:**
```python
async def migrate_session(session_id: str):
    # Load existing session
    # Wrap legacy events in canonical structure
    # Preserve original data
    # Update session store
```

**Expected Behavior:**
- Read existing session data
- Transform to canonical ADK event format
- Preserve original information
- Update session store atomically
- Log migration progress

**Acceptance Criteria:**
- [ ] Script can process individual sessions
- [ ] Batch processing supported
- [ ] Dry-run mode available
- [ ] Migration idempotent (safe to re-run)
- [ ] Rollback mechanism documented

**Test Coverage:**
- [ ] Unit test: single session migration
- [ ] Integration test: batch migration
- [ ] Test rollback procedure

---

### Requirement 2.4: Session Store Tests
**Description:** Expand test coverage for new schema
**Priority:** High
**Files:**
- `tests/unit/test_session_store.py`

**Test Scenarios:**
```python
def test_ingest_adk_event():
    # Store raw ADK event

def test_retrieve_events():
    # Query events for session

def test_derived_summaries():
    # Store and retrieve summaries

def test_backward_compatibility():
    # Handle legacy event format
```

**Acceptance Criteria:**
- [ ] Test ingesting ADK events
- [ ] Test event retrieval
- [ ] Test summary persistence
- [ ] Test backward compatibility
- [ ] Test concurrent session updates

---

## Phase 3 – Frontend SSE Overhaul

### Requirement 3.1: ADK Event Parser Utilities
**Description:** Implement TypeScript utilities for parsing ADK events
**Priority:** Critical
**Files:**
- `frontend/src/lib/streaming/adk-event-parser.ts` (new file)

**Reference Implementation:**
- `docs/adk/refs/frontend-nextjs-fullstack/nextjs/src/lib/streaming/sse-parser.ts`

**Utilities Required:**
```typescript
export function parseSseStream(stream: ReadableStream): AsyncIterable<AdkEvent>

export function normaliseEvent(event: MessageEvent<string>): AdkEvent | null

export function extractAgentMessages(event: AdkEvent): Message[]

export function extractStatusUpdates(event: AdkEvent): StatusUpdate[]
```

**Expected Behavior:**
- Parse SSE stream into structured events
- Normalize event payloads to TypeScript interface
- Extract conversational messages from events
- Extract status/progress updates from events
- Handle malformed events gracefully

**Acceptance Criteria:**
- [ ] `parseSseStream` yields `AdkEvent` objects
- [ ] `normaliseEvent` handles JSON parsing errors
- [ ] `extractAgentMessages` identifies author and content
- [ ] `extractStatusUpdates` parses function responses
- [ ] TypeScript interfaces match ADK `Event` model
- [ ] Error handling with fallback values

**Test Coverage:**
- [ ] Unit test: parse valid SSE stream
- [ ] Unit test: handle malformed JSON
- [ ] Unit test: extract messages from various event types
- [ ] Unit test: extract status updates
- [ ] Test file: `frontend/src/hooks/chat/__tests__/adk-event-parser.test.ts`

---

### Requirement 3.2: AdkEvent TypeScript Interface
**Description:** Define TypeScript types matching ADK Event model
**Priority:** High
**Files:**
- `frontend/src/lib/streaming/adk-event-parser.ts`
- `frontend/src/lib/api/types.ts`

**Type Definition:**
```typescript
export interface AdkEvent {
  id?: string;
  author: string;
  invocationId: string;
  timestamp: number;
  content?: { parts?: Array<AdkPart> };
  actions?: Record<string, unknown>;
  functionCall?: FunctionCall;
  functionResponse?: FunctionResponse;
}

export interface AdkPart {
  text?: string;
  thought?: string;
  // Other part types per ADK spec
}
```

**Reference:**
- `docs/adk/refs/official-adk-python/src/google/adk/events/event.py`
- `docs/adk/refs/frontend-nextjs-fullstack/nextjs/src/lib/handlers/run-sse-common.ts`

**Expected Behavior:**
- Types match ADK Event model structure
- Optional fields properly marked
- Discriminated unions for part types
- Type-safe access to event properties

**Acceptance Criteria:**
- [ ] Interface includes all ADK Event fields
- [ ] Optional fields marked with `?`
- [ ] Nested types defined (AdkPart, FunctionCall, etc.)
- [ ] JSDoc comments documenting field purposes
- [ ] Exported from central types module

---

### Requirement 3.3: Update useSSE Hook
**Description:** Refactor SSE hook to use ADK event parser
**Priority:** Critical
**Files:**
- `frontend/src/hooks/useSSE.ts`

**Current Logic:**
- Lines 200-330: Custom event parsing

**Target Logic:**
```typescript
import { parseSseStream, normaliseEvent } from '@/lib/streaming/adk-event-parser';

export function useSSE(url: string) {
  const [lastEvent, setLastEvent] = useState<AdkEvent | null>(null);

  // Replace custom parsing with:
  // 1. Capture raw SSE blocks (event, id, data)
  // 2. Parse JSON with normaliseEvent
  // 3. Update lastEvent as canonical AdkEvent
}
```

**Expected Behavior:**
- Remove custom event parsing logic
- Use `normaliseEvent` from parser utilities
- Expose `lastEvent` as canonical `AdkEvent`
- Maintain backward compatibility via feature flag
- Handle parse errors gracefully

**Acceptance Criteria:**
- [ ] Hook uses `normaliseEvent` utility
- [ ] `lastEvent` typed as `AdkEvent | null`
- [ ] Feature flag controls parser version
- [ ] Error handling prevents hook crashes
- [ ] No breaking changes to hook API

**Test Coverage:**
- [ ] Unit test: hook parses ADK events correctly
- [ ] Unit test: feature flag toggles parser
- [ ] Unit test: error handling for bad events

---

### Requirement 3.4: Update SSE Event Handlers
**Description:** Process ADK events instead of custom event types
**Priority:** High
**Files:**
- `frontend/src/hooks/useSSEEventHandlers.ts`
- `frontend/src/hooks/chat/sse-event-handlers.ts`

**Current Dependencies:**
- `research_update`, `agent_status`, `research_complete` events

**Target Logic:**
```typescript
export function useSSEEventHandlers(event: AdkEvent | null) {
  // Distinguish conversational agent messages via event.author
  // Emit status updates from event.functionResponse/actions
  // Detect agent transfers via event.actions.transfer_to_agent

  // Adapter layer for legacy events (feature flag controlled)
}
```

**Expected Behavior:**
- Read `event.author` to identify agent messages
- Parse `event.functionResponse` for status updates
- Detect agent transfers from `event.actions.transfer_to_agent`
- Remove reliance on custom event types
- Provide adapter layer when feature flag disabled

**Acceptance Criteria:**
- [ ] Handler processes ADK events
- [ ] Identifies agent messages by author
- [ ] Extracts status from function responses
- [ ] Detects agent transfers
- [ ] Adapter maintains legacy event support
- [ ] Feature flag controls event processing mode

**Test Coverage:**
- [ ] Unit test: handle conversational message events
- [ ] Unit test: extract status from function response
- [ ] Unit test: detect agent transfer
- [ ] Unit test: legacy adapter works correctly

---

### Requirement 3.5: Chat Store Modifications
**Description:** Store canonical events with derived UI messages
**Priority:** High
**Files:**
- `frontend/src/hooks/store.ts`
- `frontend/src/hooks/useChatStore.ts`

**Current State:**
- Store flattened message objects

**Target State:**
```typescript
interface ChatState {
  events: AdkEvent[];           // Raw canonical events
  messages: Message[];          // Derived UI messages
  // Selectors to map events → messages (memoized)
}
```

**Expected Behavior:**
- Store arrays of canonical `AdkEvent` objects
- Derive UI messages from events via selectors
- Memoize selectors for performance
- Support time-travel debugging (event replay)

**Acceptance Criteria:**
- [ ] State includes `events` array
- [ ] State includes derived `messages` array
- [ ] Selectors map events to messages
- [ ] Selectors memoized with useMemo/reselect
- [ ] Event sourcing enables replay

**Test Coverage:**
- [ ] Unit test: add event updates state
- [ ] Unit test: selectors derive correct messages
- [ ] Unit test: memoization prevents re-computation

---

### Requirement 3.6: Frontend Parser Tests
**Description:** Comprehensive test suite for ADK event parsing
**Priority:** High
**Files:**
- `frontend/src/hooks/chat/__tests__/adk-event-parser.test.ts` (new file)

**Test Scenarios:**
```typescript
describe('ADK Event Parser', () => {
  it('parses valid SSE stream', ...)
  it('handles malformed JSON', ...)
  it('extracts agent messages', ...)
  it('extracts status updates', ...)
  it('detects function calls', ...)
  it('detects function responses', ...)
  it('handles missing optional fields', ...)
});
```

**Acceptance Criteria:**
- [ ] Test valid event parsing
- [ ] Test error handling
- [ ] Test message extraction
- [ ] Test status extraction
- [ ] Test all utility functions
- [ ] 100% code coverage for parser module

---

### Requirement 3.7: Multi-Agent Transcript E2E Tests
**Description:** Verify UI renders multi-agent conversations correctly
**Priority:** Medium
**Files:**
- `frontend/tests/e2e/multi-agent-chat.spec.ts` (new file)

**Test Scenarios:**
```typescript
test('displays messages from multiple agents', ...)
test('shows agent transfer notifications', ...)
test('renders function call progress', ...)
test('updates status indicators', ...)
```

**Expected Behavior:**
- Cypress/Playwright tests verify UI rendering
- Test multi-agent message threading
- Test status update display
- Test agent transfer UI feedback

**Acceptance Criteria:**
- [ ] Test messages from different agents display correctly
- [ ] Test agent badges/avatars shown
- [ ] Test status indicators update
- [ ] Test function call progress UI
- [ ] Tests run in CI/CD pipeline

---

## Phase 4 – Conversation Orchestration & Generalist Agent

### Requirement 4.1: Agent Dispatcher Service
**Description:** Route messages to appropriate agents based on intent
**Priority:** High
**Files:**
- `app/services/agent_dispatcher.py` (new file)

**Implementation Pattern:**
```python
class AgentRoute(str, Enum):
    GENERAL = "general_chat"
    RESEARCH = "research"
    # Future routes...

class AgentDispatcher:
    async def dispatch(self, message: str, session: dict) -> AgentRoute:
        # Initial: rule-based pattern matching
        # Future: LLM-based intent classification
        research_triggers = ("research", "investigate", "report on", "analyze")
        if any(trigger in message.lower() for trigger in research_triggers):
            return AgentRoute.RESEARCH
        return AgentRoute.GENERAL
```

**Expected Behavior:**
- Accept user message and session context
- Classify intent using rules (upgrade to LLM later)
- Return route descriptor (`"general_chat"`, `"research"`, future ones)
- Log routing decisions for debugging
- Support custom routing rules

**Acceptance Criteria:**
- [ ] Dispatcher accepts message and session context
- [ ] Returns `AgentRoute` enum value
- [ ] Rule-based classification works correctly
- [ ] Extensible for LLM-based classification
- [ ] Routing decisions logged

**Test Coverage:**
- [ ] Unit test: general chat classification
- [ ] Unit test: research classification
- [ ] Unit test: edge cases (empty message, etc.)
- [ ] Test file: `tests/unit/test_agent_dispatcher.py`

---

### Requirement 4.2: POST /messages Route
**Description:** New endpoint for intent-based message routing
**Priority:** High
**Files:**
- `app/routes/agent_routes.py` (new file)
- `app/server.py`

**API Pattern:**
```python
@app.post("/apps/{app}/users/{user}/sessions/{session}/messages")
async def send_message(message: AgentRequest) -> StreamingResponse:
    route = await dispatcher.dispatch(message.message, session_context)

    if route == AgentRoute.GENERAL:
        # Run local LLM (generalist agent) via ADK runner
        return stream_generalist_agent(message)

    elif route == AgentRoute.RESEARCH:
        # Forward to existing research flow
        return stream_research_agent(message)

    # Future: additional agent routes
```

**Expected Behavior:**
- Accept `AgentRequest` with intent, message, metadata
- Use dispatcher to determine routing
- Route to generalist agent for general chat
- Route to research agent for research intents
- Stream ADK events from selected agent
- Support future agent additions

**Acceptance Criteria:**
- [ ] Endpoint registered in FastAPI app
- [ ] Uses dispatcher for routing decisions
- [ ] Streams events from appropriate agent
- [ ] Routing logged for observability
- [ ] Error handling for unknown routes

**Test Coverage:**
- [ ] Integration test: general chat routing
- [ ] Integration test: research routing
- [ ] Integration test: invalid request handling

---

### Requirement 4.3: AgentRequest Model
**Description:** Define request schema for message routing
**Priority:** High
**Files:**
- `app/models/agent_models.py` (new file)

**Model Pattern:**
```python
class AgentRequest(BaseModel):
    message: str
    intent: Optional[str] = None  # Override automatic classification
    metadata: Optional[dict] = None
    session_id: str
    user_id: str
    app_name: str
```

**Expected Behavior:**
- Extends concept of `ResearchRequest`
- Supports explicit intent override
- Includes session/user context
- Optional metadata for extensibility

**Acceptance Criteria:**
- [ ] Model includes all required fields
- [ ] Intent field optional with override semantics
- [ ] Metadata field supports arbitrary data
- [ ] Validation rules enforced

---

### Requirement 4.4: Frontend Message Handler
**Description:** Update frontend to use new routing endpoint
**Priority:** High
**Files:**
- `frontend/src/hooks/useMessageHandlers.ts`
- `frontend/src/lib/api/client.ts`

**Implementation Pattern:**
```typescript
export function useMessageHandlers() {
  const sendMessage = async (message: string, intent?: string) => {
    const request: AgentRequest = {
      message,
      intent,
      sessionId: session.id,
      userId: user.id,
      appName: 'vana',
    };

    // Call POST /apps/{app}/users/{user}/sessions/{session}/messages
    // Stream events via SSE
  };
}
```

**Expected Behavior:**
- Construct `AgentRequest` payload
- Call new `/messages` endpoint
- Stream ADK events
- Update UI based on routing decisions
- Handle routing errors

**Acceptance Criteria:**
- [ ] Handler constructs correct request
- [ ] Calls new routing endpoint
- [ ] Processes streaming response
- [ ] Updates session state with route info
- [ ] Error handling for routing failures

**Test Coverage:**
- [ ] Unit test: request construction
- [ ] Unit test: intent override
- [ ] Integration test: end-to-end message flow

---

### Requirement 4.5: Session Mode UI State
**Description:** Display current agent routing mode in UI
**Priority:** Medium
**Files:**
- `frontend/src/components/chat/ChatHeader.tsx`
- `frontend/src/hooks/useChatStore.ts`

**UI Pattern:**
```typescript
interface SessionState {
  mode: 'general' | 'research' | 'specialist';
  currentAgent: string;
  // ...
}

// Display badge: "Research Mode" or "Chat Mode"
```

**Expected Behavior:**
- Store routing mode in session state
- Display mode badge in chat header
- Update mode when agent changes
- Visual indicator for agent transfers

**Acceptance Criteria:**
- [ ] Session state includes mode field
- [ ] UI displays current mode badge
- [ ] Badge updates on agent transfer
- [ ] Accessible design (ARIA labels)

---

### Requirement 4.6: Generalist Agent Definition
**Description:** Create ADK agent for everyday Q&A
**Priority:** High
**Files:**
- `app/agents/general_chat_agent.py` (new file)
- `app/agent.py`

**Agent Pattern:**
```python
from google.adk.agents import LlmAgent

generalist_agent = LlmAgent(
    name="generalist",
    model="gemini-2.0-flash",
    instruction="You are a helpful assistant. Answer user questions conversationally.",
    description="Handles general chat and Q&A",
    tools=[],  # Add relevant tools
)
```

**Expected Behavior:**
- Handles everyday conversational queries
- Emits ADK events matching canonical schema
- Can transfer to specialized agents when needed
- Logs interactions for debugging

**Acceptance Criteria:**
- [ ] Agent defined with clear instructions
- [ ] Events follow ADK schema
- [ ] Agent registered in ADK runner
- [ ] Transfer actions documented

**Test Coverage:**
- [ ] Unit test: agent initialization
- [ ] Integration test: simple Q&A flow
- [ ] Test agent transfer capability

---

### Requirement 4.7: Dispatcher Tests
**Description:** Comprehensive test suite for routing logic
**Priority:** High
**Files:**
- `tests/unit/test_agent_dispatcher.py` (new file)

**Test Scenarios:**
```python
def test_general_chat_classification():
    # "Hello" → GENERAL

def test_research_classification():
    # "Research Python frameworks" → RESEARCH

def test_intent_override():
    # Explicit intent bypasses classification

def test_session_context():
    # Session state influences routing
```

**Acceptance Criteria:**
- [ ] Test all classification rules
- [ ] Test intent overrides
- [ ] Test session context handling
- [ ] Test edge cases
- [ ] 100% code coverage for dispatcher

---

### Requirement 4.8: Frontend Intent Switching Tests
**Description:** Verify UI handles intent changes correctly
**Priority:** Medium
**Files:**
- `frontend/src/hooks/__tests__/useMessageHandlers.test.ts`

**Test Scenarios:**
```typescript
it('switches from general to research mode', ...)
it('displays mode badge correctly', ...)
it('handles agent transfer events', ...)
```

**Acceptance Criteria:**
- [ ] Test mode switching
- [ ] Test UI state updates
- [ ] Test event rendering during transitions

---

### Requirement 4.9: End-to-End Intent Flow Test
**Description:** Verify complete intent routing workflow
**Priority:** High
**Files:**
- `tests/integration/test_intent_routing.py`
- `frontend/tests/e2e/intent-routing.spec.ts`

**Test Scenario:**
```
1. User sends general chat message
2. System routes to generalist agent
3. User requests research
4. System routes to research agent
5. UI updates to show research mode
6. Research completes and streams events
7. User returns to general chat
```

**Expected Behavior:**
- Seamless transitions between agents
- Correct event streaming throughout
- UI reflects current mode accurately
- No data loss during transitions

**Acceptance Criteria:**
- [ ] Test backend routing decisions
- [ ] Test frontend mode updates
- [ ] Test event stream continuity
- [ ] Test session state persistence

---

## Phase 5 – Clean-Up & Documentation

### Requirement 5.1: Deprecation Plan
**Description:** Sunset legacy endpoints with migration path
**Priority:** Medium
**Files:**
- `app/routes/adk_routes.py`
- `docs/api/deprecation-notices.md` (new file)

**Deprecation Strategy:**
```python
@app.get("/agent_network_sse/{sessionId}")
@deprecated(version="2.0.0", removal="3.0.0")
async def legacy_agent_network_sse(...):
    # Log deprecation warning
    # Redirect to canonical endpoint
```

**Expected Behavior:**
- Mark legacy endpoints as deprecated
- Log warnings when accessed
- Provide migration guide
- Set sunset timeline (e.g., 6 months)
- Feature flags control availability

**Acceptance Criteria:**
- [ ] Deprecation decorators applied
- [ ] Warnings logged on access
- [ ] Migration guide published
- [ ] Sunset date announced
- [ ] Alternative endpoints documented

---

### Requirement 5.2: Documentation Updates
**Description:** Update all documentation to reflect new architecture
**Priority:** High
**Files:**
- `README.md`
- `docs/sse/SSE-Overview.md`
- `docs/sse/ADK-Event-Consumption.md` (new file)
- `docs/api/endpoints.md`

**Content Requirements:**

**README.md:**
- [ ] Update SSE section with canonical endpoint
- [ ] Document feature flags
- [ ] Link to ADK event guide

**SSE-Overview.md:**
- [ ] Describe canonical event handling
- [ ] Remove references to legacy events
- [ ] Add event flow diagrams

**ADK-Event-Consumption.md (new):**
- [ ] Document AdkEvent schema
- [ ] Parser utility usage examples
- [ ] Frontend integration guide
- [ ] Migration guide from legacy events

**endpoints.md:**
- [ ] Document POST /run_sse
- [ ] Document POST /messages
- [ ] Mark deprecated endpoints
- [ ] Include request/response examples

**Acceptance Criteria:**
- [ ] All files updated with accurate information
- [ ] Code examples tested and working
- [ ] Migration guides complete
- [ ] API reference accurate

---

### Requirement 5.3: Logging & Metrics
**Description:** Capture new event types in observability systems
**Priority:** Medium
**Files:**
- `app/utils/metrics.py`
- `app/middleware/logging_middleware.py`

**Metrics to Track:**
```python
# Event processing
event_processed_total (counter)
event_processing_duration_seconds (histogram)

# Routing
agent_route_decisions_total (counter, labels: route, intent)
agent_transfer_total (counter, labels: from_agent, to_agent)

# Errors
adk_event_parse_errors_total (counter)
upstream_stream_errors_total (counter)
```

**Expected Behavior:**
- Log all ADK events at DEBUG level
- Capture routing decisions at INFO level
- Track event processing metrics
- Monitor error rates by type

**Acceptance Criteria:**
- [ ] Metrics defined and exported
- [ ] Logging captures event flow
- [ ] Dashboards updated (if applicable)
- [ ] Alert thresholds configured

---

### Requirement 5.4: Smoke Test Suite
**Description:** End-to-end validation of complete workflow
**Priority:** High
**Files:**
- `tests/smoke/test_full_workflow.py` (new file)

**Test Scenario:**
```python
async def test_complete_workflow():
    # 1. Start services (backend, ADK, frontend)
    # 2. Create session
    # 3. Send general chat message
    # 4. Verify generalist agent response
    # 5. Request research
    # 6. Verify research agent activation
    # 7. Stream events and check formatting
    # 8. Verify session persistence
    # 9. Check UI rendering (via E2E test)
```

**Expected Behavior:**
- All services start successfully
- Messages route correctly
- Events stream properly
- UI updates correctly
- No errors or warnings

**Acceptance Criteria:**
- [ ] Smoke test covers full user journey
- [ ] Test passes on fresh environment
- [ ] Test runs in CI/CD
- [ ] Test execution time < 5 minutes

---

### Requirement 5.5: Regression Test Suite
**Description:** Ensure no functionality breaks during migration
**Priority:** Critical
**Test Commands:**
```bash
# Backend
poetry run pytest

# Frontend
npm run test
npm run lint

# E2E
npm run test:e2e
```

**Expected Behavior:**
- All existing tests pass
- No new linting errors
- Performance benchmarks maintained
- No accessibility regressions

**Acceptance Criteria:**
- [ ] Backend test suite passes 100%
- [ ] Frontend test suite passes 100%
- [ ] E2E tests pass 100%
- [ ] Linting clean
- [ ] Type checking clean

---

## Testing & Verification Matrix

| Test ID | Scenario | Location | Trigger | Phase | Priority |
|---------|----------|----------|---------|-------|----------|
| T0.1 | Feature flag access (backend) | `tests/unit/test_config.py` | `pytest` | 0 | High |
| T0.2 | Feature flag access (frontend) | `frontend/src/lib/__tests__/env.test.ts` | `npm test` | 0 | High |
| T0.3 | Baseline SSE tests pass | `tests/integration/test_sse_*` | `pytest` | 0 | Critical |
| T1.1 | Canonical /run_sse success | `tests/integration/test_adk_run_sse_passthrough.py` | `pytest` | 1 | Critical |
| T1.2 | Upstream timeout → error event | Same as T1.1 | `pytest` | 1 | High |
| T1.3 | ADK path routing | Same as T1.1 | `pytest` | 1 | High |
| T1.4 | Event multicasting | `tests/unit/test_event_bus.py` | `pytest` | 1 | Medium |
| T1.5 | Manual curl validation | N/A (manual) | Manual | 1 | High |
| T2.1 | Session store persists ADK events | `tests/unit/test_session_store.py` | `pytest` | 2 | High |
| T2.2 | Backward compatibility | `tests/integration/test_session_routes.py` | `pytest` | 2 | High |
| T2.3 | Migration script | `tests/unit/test_migrate_sessions.py` | `pytest` | 2 | Low |
| T3.1 | Frontend parser handles events | `frontend/src/hooks/chat/__tests__/adk-event-parser.test.ts` | `npm test` | 3 | Critical |
| T3.2 | Function response parsing | Same as T3.1 | `npm test` | 3 | High |
| T3.3 | useSSE hook integration | `frontend/src/hooks/__tests__/useSSE.test.ts` | `npm test` | 3 | High |
| T3.4 | Chat UI renders multi-agent | `frontend/tests/e2e/multi-agent-chat.spec.ts` | `npm run test:e2e` | 3 | Medium |
| T4.1 | Dispatcher routes general chat | `tests/unit/test_agent_dispatcher.py` | `pytest` | 4 | High |
| T4.2 | Dispatcher routes research | Same as T4.1 | `pytest` | 4 | High |
| T4.3 | Frontend intent switching | `frontend/src/hooks/__tests__/useMessageHandlers.test.ts` | `npm test` | 4 | Medium |
| T4.4 | End-to-end intent flow | `tests/integration/test_intent_routing.py` | `pytest` | 4 | Critical |
| T4.5 | Generalist agent Q&A | `tests/integration/test_generalist_agent.py` | `pytest` | 4 | High |
| T5.1 | Smoke test full workflow | `tests/smoke/test_full_workflow.py` | `pytest` | 5 | Critical |
| T5.2 | Regression suite (backend) | All `tests/**` | `pytest` | 5 | Critical |
| T5.3 | Regression suite (frontend) | All `frontend/tests/**` | `npm test` | 5 | Critical |
| T5.4 | E2E regression | `frontend/tests/e2e/**` | `npm run test:e2e` | 5 | Critical |

---

## Implementation Checklist Summary

### Phase 0 (4 items)
- [ ] 0.1: Feature flag infrastructure
- [ ] 0.2: Baseline test validation
- [ ] 0.3: Backend config module
- [ ] 0.4: Frontend env module

### Phase 1 (10 items)
- [ ] 1.1: POST /run_sse endpoint
- [ ] 1.2: ADK path routing
- [ ] 1.3: RunAgentRequest model
- [ ] 1.4: Event multicasting
- [ ] 1.5: Error handling
- [ ] 1.6: Manual curl validation
- [ ] 1.7: Integration test suite
- [ ] 1.8: Background task removal
- [ ] 1.9: SSE field compliance
- [ ] 1.10: Timeout configuration

### Phase 2 (6 items)
- [ ] 2.1: Raw event storage schema
- [ ] 2.2: Backward compatibility
- [ ] 2.3: Migration script (optional)
- [ ] 2.4: Session store tests
- [ ] 2.5: Query method updates
- [ ] 2.6: Summary persistence

### Phase 3 (12 items)
- [ ] 3.1: ADK event parser utilities
- [ ] 3.2: AdkEvent TypeScript interface
- [ ] 3.3: useSSE hook refactor
- [ ] 3.4: SSE event handlers update
- [ ] 3.5: Chat store modifications
- [ ] 3.6: Parser unit tests
- [ ] 3.7: Multi-agent E2E tests
- [ ] 3.8: Feature flag adapter
- [ ] 3.9: Status extraction
- [ ] 3.10: Agent transfer detection
- [ ] 3.11: Message selectors
- [ ] 3.12: Error handling

### Phase 4 (11 items)
- [ ] 4.1: Agent dispatcher service
- [ ] 4.2: POST /messages route
- [ ] 4.3: AgentRequest model
- [ ] 4.4: Frontend message handler
- [ ] 4.5: Session mode UI state
- [ ] 4.6: Generalist agent definition
- [ ] 4.7: Dispatcher tests
- [ ] 4.8: Frontend intent tests
- [ ] 4.9: E2E intent flow test
- [ ] 4.10: Routing logging
- [ ] 4.11: Agent transfer implementation

### Phase 5 (8 items)
- [ ] 5.1: Deprecation plan
- [ ] 5.2: Documentation updates
- [ ] 5.3: Logging & metrics
- [ ] 5.4: Smoke test suite
- [ ] 5.5: Regression test suite
- [ ] 5.6: API reference
- [ ] 5.7: Migration guides
- [ ] 5.8: Dashboard updates

---

## Total Requirements: 51

**Critical**: 12
**High**: 28
**Medium**: 9
**Low**: 2

---

## Validation Commands

### Phase 0
```bash
pytest tests/unit/test_config.py
npm --prefix frontend test -- src/lib/__tests__/env.test.ts
pytest tests/integration/test_sse_* tests/performance/test_sse_performance.py
```

### Phase 1
```bash
curl -N -H "Authorization: Bearer <token>" http://localhost:8000/run_sse -d '{"appName":"vana","userId":"test","sessionId":"123","message":"Hello"}'
pytest tests/integration/test_adk_run_sse_passthrough.py
```

### Phase 2
```bash
pytest tests/unit/test_session_store.py
pytest tests/integration/test_session_routes.py
```

### Phase 3
```bash
npm --prefix frontend test -- src/hooks/chat/__tests__/adk-event-parser.test.ts
npm --prefix frontend run test:e2e -- tests/e2e/multi-agent-chat.spec.ts
```

### Phase 4
```bash
pytest tests/unit/test_agent_dispatcher.py
pytest tests/integration/test_intent_routing.py
npm --prefix frontend test -- src/hooks/__tests__/useMessageHandlers.test.ts
```

### Phase 5
```bash
pytest tests/smoke/test_full_workflow.py
make test
npm --prefix frontend run test
npm --prefix frontend run lint
```

---

## Success Criteria

**Phase 0 Complete When:**
- All feature flags accessible
- Baseline tests pass 100%

**Phase 1 Complete When:**
- POST /run_sse streams raw ADK events
- ADK path routing works
- Manual curl test passes
- Integration tests pass

**Phase 2 Complete When:**
- Session store persists canonical events
- Legacy endpoints still functional
- All session tests pass

**Phase 3 Complete When:**
- Frontend parses ADK events correctly
- Chat UI renders multi-agent conversations
- All parser tests pass

**Phase 4 Complete When:**
- Dispatcher routes messages correctly
- Generalist agent handles general chat
- Intent switching works end-to-end
- All orchestration tests pass

**Phase 5 Complete When:**
- Documentation complete and accurate
- All regression tests pass
- Smoke test validates full workflow
- Deprecation plan published

---

## Notes

- Each requirement should have at least one test
- Feature flags enable gradual rollout
- Backward compatibility maintained throughout
- Documentation updated incrementally
- Performance benchmarks maintained
- Security reviews conducted per phase
