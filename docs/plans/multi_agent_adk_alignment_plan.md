# Vana Multi-Agent ADK Alignment Plan

This document guides AI coding agents through the end-to-end enhancements required to align Vana with Google ADK’s multi-agent streaming expectations while preserving rich chat UX. Follow the phases sequentially; each phase ends with concrete validation steps.

---

## 0. References & Baseline Materials

- **Current Implementation**
  - Backend SSE proxy & broadcaster: `app/routes/adk_routes.py`, `app/utils/sse_broadcaster.py`
  - Chat orchestration: `frontend/src/hooks/useChatStream.ts`, `frontend/src/hooks/useSSE.ts`
  - SSE parsing & storage helpers: `frontend/src/hooks/chat/*`, `app/utils/session_store.py`
- **Google ADK Source Material** (docs live under `docs/adk/refs`, keep them read-only)
  - Canonical streaming implementation: `official-adk-python/src/google/adk/cli/adk_web_server.py#L1368-L1409`
  - Event data model: `official-adk-python/src/google/adk/events/event.py`
  - Frontend parsing patterns: `frontend-nextjs-fullstack/nextjs/src/lib/streaming/sse-parser.ts`
  - Payload schemas: `frontend-nextjs-fullstack/nextjs/src/lib/handlers/run-sse-common.ts`
- **Existing Plans**
  - `docs/plans/sse_adk_alignment_plan.md` (earlier high-level alignment notes)

> ⚠️ **Do not modify** the `docs/adk/refs` directory—use it only as reference.

---

## 1. Goals & Deliverables

1. **ADK-Compliant Streaming** – Expose canonical `POST /run_sse` that streams raw ADK `Event` payloads and mirror it to the ADK path `/apps/{app}/users/{user}/sessions/{session}/run`.
2. **Frontend Event Normalization** – Update SSE parsing and chat rendering to consume ADK `Event` models (with `content.parts`, `author`, `functionCall`, `functionResponse`, etc.).
3. **Conversation Orchestration** – Introduce a conversational “generalist” agent, intent routing, and scaffolding for future specialized agent flows.
4. **Session Persistence** – Store unmodified ADK events to enable replay, analytics, and agent transfers.
5. **Regression Coverage** – Expand tests for streaming flows, UI processing, and intent routing.

Each milestone should land behind feature flags whenever possible to enable incremental rollout.

---

## 2. High-Level Architecture Changes

| Area | Current State | Target State |
| --- | --- | --- |
| **Streaming Endpoint** | Background task emits custom `research_*` events (`app/routes/adk_routes.py:390-753`) | Inline streaming of raw ADK `Event` objects with canonical payloads |
| **Frontend SSE** | Parses flattened `{type, data}` events (`useSSE`, `sse-event-handlers`) | Parses full ADK events with helper utilities aligned to ADK references |
| **Agent Routing** | Single research workflow triggered for every message | Dispatcher evaluates user intent and routes to generalist LLM or specialized agent (starting with research) |
| **Persistence** | Session store ingests simplified event snapshots | Persist full ADK events, augment with derived summaries when needed |
| **UX Signals** | Progress derived from custom events | Progress derived from agent authorship, function responses, and explicit status entries |

---

## 3. Implementation Phases

### Phase 0 – Environment Preparation

1. Create feature flags (e.g. `ENABLE_ADK_CANONICAL_STREAM`, `ENABLE_AGENT_DISPATCHER`) in configuration modules.
2. Add helper to detect flag state (backend: `app/config.py`, frontend: `frontend/src/lib/env.ts`).
3. Ensure existing SSE regression suite passes before changes:  
   ```bash
   # Backend
   poetry run pytest tests/integration/test_sse_* tests/performance/test_sse_performance.py
   # Frontend
   npm run test -- frontend/tests/e2e/sse-connection.spec.ts
   ```

### Phase 1 – Backend Streaming Alignment

#### 1.1 Restructure `POST /run_sse`
- **Files:** `app/routes/adk_routes.py`, `app/server.py`
- Replace `run_session_sse` background task with inline generator:
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
- Use `RunAgentRequest` from ADK references (`docs/adk/refs/official-adk-python/.../adk_web_server.py:168-177`).
- Ensure ADK route `/apps/{app}/users/{user}/sessions/{session}/run` proxies to `run_sse` and streams the same payload (no rebroadcast).
- Emit only standard SSE fields (`event`, `data`, optionally `id`, `retry`). Do not mutate event payloads.

#### 1.2 Event Multicasting for Legacy Consumers
- Introduce an async listener (e.g. `app/services/event_bus.py`) that takes raw `Event` JSON and forwards to:
  - Existing `EnhancedSSEBroadcaster` (maintains `research_*` derived events during transition).
  - Session persistence layer (Phase 3).
- Keep derived events optional: guard with feature flag so we can disable once frontend is migrated.

#### 1.3 Error Handling & Timeouts
- Preserve 300s timeout but emit ADK-compliant error events (`data: {"error": "...", "timestamp": ...}`).
- On upstream failure, propagate HTTP status and reason phrase down the stream, then close connection.

**Validation**
- Manual: `curl -N -H "Authorization: Bearer <token>" http://localhost:8000/run_sse -d '{"appName":...}'` should yield raw ADK `Event` JSON lines.
- Automated: create integration test mirroring ADK sample (e.g. `tests/integration/test_adk_run_sse_passthrough.py`).

### Phase 2 – Session Persistence Enhancements

#### 2.1 Store Raw Events
- Update `session_store.ingest_event` to accept full ADK event dict:
  - Maintain original schema; store under `events` list for each session.
  - Augment with derived summaries (final report, agent snapshots) in separate fields.

#### 2.2 Migration Script (Optional)
- If existing data must be backfilled, create management command under `app/scripts/migrate_sessions.py` to wrap legacy events into canonical structure.

**Validation**
- Extend unit tests in `tests/unit/test_session_store.py` for new schema.
- Confirm `/agent_network_history` and similar endpoints still function (update to read from canonical data if necessary).

### Phase 3 – Frontend SSE Overhaul

#### 3.1 Shared Event Parser
- Implement utilities similar to ADK reference:
  - Create `frontend/src/lib/streaming/adk-event-parser.ts` inspired by `docs/adk/refs/frontend-nextjs-fullstack/nextjs/src/lib/streaming/sse-parser.ts`.
  - Functions: `parseSseStream`, `normaliseEvent`, `extractAgentMessages`, `extractStatusUpdates`.
- Replace logic in `useSSE` (`frontend/src/hooks/useSSE.ts:200-330`) to:
  - Capture raw SSE blocks (`event`, `id`, `data`).
  - Parse JSON; convert to `AdkEvent` TypeScript interface (mirroring `Event` model).
  - Expose `lastEvent` as canonical event.

#### 3.2 Chat Event Handling
- Update `useSSEEventHandlers` to:
  - Distinguish conversational agent messages (`event.author`).
  - Emit status updates from `functionResponse`/`actions`.
  - Detect new agent assignments via `event.actions.transfer_to_agent`.
- Remove reliance on `research_update`, `agent_status`, etc. Provide adapter layer if feature flag disabled.

#### 3.3 Store Adjustments
- Modify `useChatStore` to store arrays of canonical events and derived message artifacts.
- Create selectors to map events → UI messages (cached/memoized for performance).

**Validation**
- Unit tests: add `frontend/src/hooks/chat/__tests__/adk-event-parser.test.ts`.
- Cypress/Playwright: update streaming scenarios to check multi-agent transcript rendering.

### Phase 4 – Conversation Orchestration & Generalist Agent

#### 4.1 Backend Dispatcher
- Add module `app/services/agent_dispatcher.py`:
  - Accept `user_message`, session context.
  - Run intent classifier (initial version: rule-based with pattern matching; plan upgrade to LLM).
  - Return route descriptor (`"general_chat"`, `"research"`, future ones).
- Create new FastAPI route `POST /apps/{app}/users/{user}/sessions/{session}/messages`:
  - If route is `"general_chat"`, run local LLM (e.g. existing `LlmAgent`) via ADK-runner and stream events.
  - If `"research"`, forward to existing research flow.
  - For future flows, map to relevant pipelines.

#### 4.2 Frontend Integration
- Extend `ResearchRequest` to `AgentRequest` with `intent`, `message`, optional metadata.
- Update `useMessageHandlers` to call new API and interpret dispatcher directives (e.g. set session mode fields).
- Persist route decisions in session state to inform UI (badge showing “Research mode”, etc.).

#### 4.3 Generalist Agent Definition
- Add ADK agent definition (e.g. `app/agents/general_chat_agent.py`) that handles everyday Q&A.
- Ensure agent emits ADK events following the same schema.

**Validation**
- Backend: add tests for dispatcher logic (`tests/unit/test_agent_dispatcher.py`).
- Frontend: create tests covering intent switching and correct event rendering.
- End-to-end: scenario where user chats casually, then requests research, verifying streaming transitions.

### Phase 5 – Clean-Up & Documentation

1. Remove deprecated endpoints or gate them behind feature flags with sunset notice.
2. Update docs:
   - `README.md` SSE section.
   - `docs/sse/SSE-Overview.md` to describe canonical event handling.
   - New developer doc `docs/sse/ADK-Event-Consumption.md`.
3. Ensure logging & metrics capture new event types (update `app/utils/metrics.py` if present).

**Validation**
- Smoke test entire workflow: local end-to-end run via `npm run dev` + `uvicorn app.server:app --reload`.
- Regression suite:
  ```bash
  poetry run pytest
  npm run test
  npm run lint
  ```

---

## 4. Suggested Work Breakdown (Task Queue Friendly)

1. **Backend Streaming Refactor** (Phase 1)  
   - Task A: Feature flag scaffolding  
   - Task B: New `/run_sse` implementation  
   - Task C: Legacy broadcaster integration

2. **Persistence Update** (Phase 2)  
   - Task D: Session store schema update + tests  
   - Task E: Migration/backfill utilities (optional)

3. **Frontend Parser & Store** (Phase 3)  
   - Task F: Implement ADK parser utilities (unit tests)  
   - Task G: Refactor `useSSE` & chat handlers  
   - Task H: UI adjustments & regression tests

4. **Agent Dispatcher & Generalist Flow** (Phase 4)  
   - Task I: Backend dispatcher + new route  
   - Task J: Frontend request flow & UI state  
   - Task K: Define generalist agent & tests

5. **Docs & Cleanup** (Phase 5)  
   - Task L: Documentation updates  
   - Task M: Remove deprecated SSE paths / finalize flags

Each task should land with unit/integration tests and documentation snippets.

---

## 5. Testing & Verification Matrix

| Scenario | Test Location | Trigger |
| --- | --- | --- |
| Canonical `/run_sse` streaming success | `tests/integration/test_adk_run_sse_passthrough.py` | `pytest` |
| Upstream timeout → streamed error event | New integration test (same module) | `pytest` |
| Session store persists ADK events | `tests/unit/test_session_store.py` | `pytest` |
| Frontend parser handles `functionResponse` | `frontend/src/hooks/chat/__tests__/adk-event-parser.test.ts` | `npm run test` |
| Chat UI renders multi-agent transcript | `frontend/tests/e2e/multi-agent-chat.spec.ts` | `npm run test:e2e` |
| Dispatcher routes general chat vs research | `tests/unit/test_agent_dispatcher.py` & frontend unit tests | `pytest`, `npm run test` |

---

## 6. Rollout Checklist

1. Deploy behind feature flags; enable in staging for targeted testing.
2. Confirm observability dashboards capture new event shapes (update log filters if needed).
3. Educate stakeholders (docs, release notes) on message format changes.
4. After stable period, remove legacy broadcaster translation layer.

---

## 7. Appendix – Code Snippets

### Streaming Proxy Template
```python
async def stream_adk_events(req: RunAgentRequest) -> AsyncGenerator[str, None]:
    async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, read=None)) as client:
        async with client.stream("POST", f"{ADK_BASE_URL}/run_sse", json=req.model_dump(by_alias=True, exclude_none=True)) as upstream:
            upstream.raise_for_status()
            async for line in upstream.aiter_lines():
                if not line:
                    continue
                yield f"{line}\n"
```

### Frontend Event Normalization Skeleton
```ts
export interface AdkEvent {
  id?: string;
  author: string;
  invocationId: string;
  timestamp: number;
  content?: { parts?: Array<AdkPart> };
  actions?: Record<string, unknown>;
}

export function normaliseSseEvent(event: MessageEvent<string>): AdkEvent | null {
  try {
    const payload = JSON.parse(event.data);
    return {
      ...payload,
      timestamp: payload.timestamp ?? Date.now() / 1000,
    };
  } catch (err) {
    console.warn('Malformed ADK event', err, event.data);
    return null;
  }
}
```

### Dispatcher Pseudo-Code
```python
class AgentRoute(str, Enum):
    GENERAL = "general_chat"
    RESEARCH = "research"

def choose_route(message: str, session_state: dict) -> AgentRoute:
    research_triggers = ("research", "investigate", "report on", "analyze")
    if any(trigger in message.lower() for trigger in research_triggers):
        return AgentRoute.RESEARCH
    return AgentRoute.GENERAL
```

---

## 8. Support & Escalation

If blockers arise (e.g., ADK upstream behavior changes), note them in `docs/plans/sse_adk_alignment_plan.md` and sync with maintainers. Keep logs of feature flag toggles and backfill scripts for reproducibility.

---

**End of Plan.** Follow phases in order, maintain tests as you go, and keep the feature flags off until each component is production-ready.
