# Vana Multi-Agent ADK Alignment Plan

This document guides AI coding agents through the end-to-end enhancements required to align Vana with Google ADK's multi-agent streaming expectations while preserving rich chat UX. Follow the phases sequentially; each phase ends with concrete validation steps.

---

## 📊 Implementation Progress & Status

**Last Updated:** 2025-10-18 19:50:00
**Overall Completion:** 67% (Phase 0-2 Complete, Phase 3 In Progress)

### Phase Completion Status

```
✅ Phase 0: Environment Preparation       [████████████████] 100% COMPLETE
✅ Phase 1: Backend Streaming Alignment   [████████████████] 100% COMPLETE
✅ Phase 2: Session Persistence           [████████████████] 100% COMPLETE ⚡ NEW
🔄 Phase 3: Frontend SSE Overhaul         [████████████░░░░]  75% IN PROGRESS
🔄 Phase 4: Agent Orchestration           [██░░░░░░░░░░░░░░]  10% PLANNING
🔄 Phase 5: Documentation & Cleanup       [███░░░░░░░░░░░░░]  20% PLANNING
```

### Critical Fixes & Enhancements (2025-10-18)

#### ✅ Completed Recent Work
1. **P0-004: SSE Race Condition Fix** ⚡
   - **Issue:** Connection timeout errors blocking all chat functionality
   - **Solution:** Added connection state guard using `connectionStateRef` for synchronous state access
   - **File:** `frontend/src/hooks/chat/message-handlers.ts:144-156`
   - **Status:** ✅ Fixed, browser-verified, code-reviewed (9/10), production-ready
   - **Report:** `/docs/validation/p0_004_fix_completion_report.md`

2. **P0-002 & P0-003: Content Deduplication** ⚡
   - **Frontend:** Set-based deduplication in `adk-content-extraction.ts:285`
   - **Backend:** Hash-based deduplication in `adk_routes.py:651-742`
   - **Status:** ✅ Complete, prevents tripled/duplicated responses

3. **Browser Verification (CLAUDE.md Compliance)** 🔍
   - **Tool:** Chrome DevTools MCP
   - **Status:** ✅ Complete
   - **Report:** `/docs/validation/browser_verification_report.md`
   - **Findings:** Identified and resolved critical SSE race condition

---

### Detailed Phase Progress

#### Phase 0: Environment Preparation ✅ [100%]
**Status:** COMPLETE
**Completed:** 2025-10-18

| Task | Status | Notes |
|------|--------|-------|
| Create feature flags | ✅ DONE | `ENABLE_ADK_CANONICAL_STREAM`, `ENABLE_AGENT_DISPATCHER` in config |
| Backend flag helpers | ✅ DONE | `app/config.py` with environment variable detection |
| Frontend flag helpers | ✅ DONE | `frontend/src/lib/env.ts` with Next.js public vars |
| SSE regression suite baseline | ✅ DONE | Tests passing before changes |

**Evidence:** Configuration files, test suite green status

---

#### Phase 1: Backend Streaming Alignment ✅ [100%]
**Status:** COMPLETE
**Completed:** 2025-10-18

| Task | Status | File | Notes |
|------|--------|------|-------|
| 1.1 Restructure `/run_sse` | ✅ DONE | `app/routes/adk_routes.py` | Inline generator streaming raw ADK events |
| 1.2 Event multicasting | ✅ DONE | `app/routes/adk_routes.py:651-742` | Backward compat with legacy `research_*` events |
| 1.3 Error handling & timeouts | ✅ DONE | `app/routes/adk_routes.py` | 300s timeout, ADK-compliant error events |
| 1.4 Security hardening | ✅ DONE | `app/middleware/*` | JWT tokens, CSRF validation, production cookies |
| Validation | ✅ DONE | Browser testing | Chrome DevTools MCP verification complete |

**Key Achievements:**
- ✅ Canonical ADK streaming via `POST /run_sse`
- ✅ Feature flag gating (`ENABLE_ADK_CANONICAL_STREAM=true`)
- ✅ Zero breaking changes (legacy endpoints still work)
- ✅ Content deduplication (P0-003) prevents duplicate events

**Evidence:** `/docs/validation/phase_1_completion_summary.md`

---

#### Phase 2: Session Persistence ✅ [100%]
**Status:** COMPLETE
**Completed:** 2025-10-18
**Priority:** HIGH (Data loss risk without raw event storage)

| Task | Status | File | Notes |
|------|--------|------|-------|
| 2.1 Store raw ADK events | ✅ DONE | `app/utils/session_store.py:120` | `events` field added, full ADK events persisted |
| 2.2 Schema migration | ✅ N/A | No migration needed | Additive schema with `default_factory=list` |
| 2.3 Event retrieval methods | ✅ DONE | `app/utils/session_store.py:1176-1289` | `get_events()`, `get_event_summary()` |
| Validation | ✅ DONE | `tests/unit/test_session_store.py` | 56 tests, 100% pass rate |
| Peer review | ✅ DONE | Code review agent | 9.5/10 rating, production-ready |

**Key Achievements:**
- ✅ Zero breaking changes (100% backward compatible)
- ✅ Dual storage architecture (raw events + derived messages)
- ✅ Advanced querying (filter by type, author, limit)
- ✅ Analytics support (`get_event_summary()`)
- ✅ Comprehensive testing (22 Phase 2-specific tests)

**Unlocked Capabilities:**
- Event replay for debugging
- Agent performance analytics
- Audit trail of tool invocations
- Foundation for agent transfer workflows

**Evidence:**
- Implementation: `app/utils/session_store.py`
- Architecture review: `/docs/validation/phase2_session_store_architecture_review.md`
- Peer review: Code-reviewer agent approval (9.5/10)

**Agent Assignment:** ✅ Backend-dev + code-analyzer agents (completed)

---

#### Phase 3: Frontend SSE Overhaul 🔄 [75%]
**Status:** IN PROGRESS
**Recent Progress:** +15% (P0-004 fix completed)

| Task | Status | File | Notes |
|------|--------|------|-------|
| 3.1 Shared event parser | ✅ DONE | `frontend/src/lib/streaming/adk-event-parser.ts` | Parsing ADK events with `parts`, `functionResponse` |
| 3.1 Content extraction | ✅ DONE | `frontend/src/hooks/chat/adk-content-extraction.ts` | Multi-source extraction (P0-002 fix) |
| 3.2 Chat event handling | 🔄 PARTIAL | `frontend/src/hooks/chat/sse-event-handlers.ts` | Dual maintenance (legacy + ADK) |
| 3.2 Race condition fix (P0-004) | ✅ DONE | `frontend/src/hooks/chat/message-handlers.ts:144-156` | Connection state guard implemented |
| 3.3 Store adjustments | 🔄 PARTIAL | `frontend/src/hooks/chat/store.ts` | Need canonical event storage + selectors |
| 3.3 UI message mapping | ❌ TODO | TBD | Cached/memoized selectors for performance |
| Validation | ✅ PARTIAL | Chrome DevTools MCP | Browser verification complete, E2E tests pending |

**Key Achievements:**
- ✅ P0-004 race condition fix (production-ready)
- ✅ P0-002 deduplication fix (Set-based unique parts)
- ✅ Browser verification with Chrome DevTools MCP
- ✅ Code review approval (9/10 rating)

**Remaining Work:**
- ❌ Migrate event handlers fully to ADK events (remove dual maintenance)
- ❌ Update store to use canonical event arrays
- ❌ Create UI message mapping selectors
- ❌ Add E2E tests for multi-agent streaming

**Estimated Time:** 3-5 days
**Blocking:** Full ADK event support in UI, performance optimization

**Agent Assignment:** Frontend developer + TypeScript specialist agents needed

---

#### Phase 4: Agent Orchestration 🔄 [10%]
**Status:** PLANNING ONLY
**Feature Flag:** `ENABLE_AGENT_DISPATCHER=false` (not yet implemented)

| Task | Status | File | Notes |
|------|--------|------|-------|
| 4.1 Backend dispatcher | ❌ TODO | `app/services/agent_dispatcher.py` | Intent classifier + routing logic |
| 4.1 New `/messages` endpoint | ❌ TODO | `app/routes/adk_routes.py` | Dispatcher-driven agent selection |
| 4.2 Frontend integration | ❌ TODO | `frontend/src/hooks/chat/message-handlers.ts` | `AgentRequest` with intent field |
| 4.3 Generalist agent | ❌ TODO | `app/agents/general_chat_agent.py` | Everyday Q&A agent definition |
| Validation | ❌ TODO | `tests/unit/test_agent_dispatcher.py` | Dispatcher logic tests |

**Estimated Time:** 5-7 days
**Blocking:** Multi-agent workflows, intent-based routing

**Agent Assignment:** Backend architect + AI engineer agents needed

---

#### Phase 5: Documentation & Cleanup 🔄 [20%]
**Status:** PLANNING & PARTIAL

| Task | Status | File | Notes |
|------|--------|------|-------|
| 5.1 Remove deprecated endpoints | ❌ TODO | `app/routes/*` | Feature flag with sunset notice |
| 5.2 Update README.md | 🔄 PARTIAL | `/README.md` | SSE section needs update |
| 5.2 Update CLAUDE.md | ✅ DONE | `/CLAUDE.md` | Browser verification requirements |
| 5.3 ADK event consumption guide | ❌ TODO | `/docs/sse/ADK-Event-Consumption.md` | Developer documentation |
| 5.4 Logging & metrics | ❌ TODO | `app/utils/metrics.py` | Capture new event types |
| Validation | 🔄 PARTIAL | Smoke tests | Manual testing done, automation pending |

**Estimated Time:** 1-2 days
**Blocking:** Team onboarding, production readiness

**Agent Assignment:** Documentation architect + Code cleanup agents needed

---

### Next Steps & Agent Assignments

#### Immediate Priority (This Week)

**1. Complete Phase 2: Session Persistence** ⚡ HIGH PRIORITY
- **Agent:** Backend developer + Database architect
- **Tasks:**
  - Update `session_store.ingest_event()` to accept ADK events
  - Add `events` field to session schema
  - Write unit tests for new schema
- **Estimated Time:** 2-3 days
- **Rationale:** Data loss risk without raw event storage

**2. Complete Phase 3: Frontend Event Handlers** 🔄 MEDIUM PRIORITY
- **Agent:** Frontend developer + TypeScript specialist
- **Tasks:**
  - Migrate `useSSEEventHandlers` to canonical ADK events
  - Update `useChatStore` to use event arrays + selectors
  - Remove dual maintenance burden (legacy + ADK)
  - Add E2E tests for streaming workflows
- **Estimated Time:** 3-5 days
- **Rationale:** Reduce technical debt, enable full ADK features

**3. Browser E2E Testing** 🧪 MEDIUM PRIORITY
- **Agent:** Test automation specialist
- **Tasks:**
  - Create Playwright/Cypress tests for SSE streaming
  - Test feature flag toggling
  - Verify backward compatibility
  - Add visual regression tests
- **Estimated Time:** 1-2 days
- **Rationale:** CLAUDE.md compliance, prevent regressions

#### Short-term (Next 2 Weeks)

**4. Implement Phase 4: Agent Dispatcher** 🤖 LOW PRIORITY
- **Agent:** Backend architect + AI engineer
- **Tasks:**
  - Create `agent_dispatcher.py` with intent classifier
  - Define generalist agent for Q&A
  - Add `POST /messages` endpoint
  - Frontend integration
- **Estimated Time:** 5-7 days
- **Rationale:** Enable multi-agent workflows, intent routing

**5. Complete Phase 5: Documentation** 📚 LOW PRIORITY
- **Agent:** Documentation architect
- **Tasks:**
  - Developer guides for ADK events
  - Migration guides for team
  - Update README and SSE docs
  - Code cleanup (remove deprecated endpoints)
- **Estimated Time:** 1-2 days
- **Rationale:** Team onboarding, production readiness

---

### Risk Assessment

| Risk | Severity | Mitigation | Status |
|------|----------|------------|--------|
| **Data loss without Phase 2** | 🔴 HIGH | Implement session persistence ASAP | ⏳ PENDING |
| **SSE race conditions** | 🟢 LOW | P0-004 fix complete & verified | ✅ RESOLVED |
| **Content duplication** | 🟢 LOW | P0-002 & P0-003 fixes complete | ✅ RESOLVED |
| **Browser verification gap** | 🟢 LOW | CLAUDE.md compliance achieved | ✅ RESOLVED |
| **Phase 3 technical debt** | 🟡 MEDIUM | Dual maintenance increasing complexity | 🔄 IN PROGRESS |
| **E2E test coverage** | 🟡 MEDIUM | Manual testing only, automation needed | ❌ TODO |

---

### Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Overall Completion** | 100% | 67% | 🔄 IN PROGRESS |
| **Phase 0-1** | 100% | 100% | ✅ COMPLETE |
| **Phase 2** | 100% | 100% | ✅ COMPLETE |
| **Phase 3** | 100% | 75% | 🔄 IN PROGRESS |
| **Phase 4** | 100% | 10% | 🔄 PLANNING |
| **Phase 5** | 100% | 20% | 🔄 PLANNING |
| **Production Readiness** | ✅ Ready | ⚠️ Core working | 🔄 PARTIAL |
| **Test Coverage** | 90%+ | ~60% | 🔄 IMPROVING |
| **Zero Breaking Changes** | ✅ Maintained | ✅ Maintained | ✅ SUCCESS |

---

### Agent Deployment Plan

The following agents should be deployed to continue development:

```javascript
// 1. IMMEDIATE: Phase 2 - Session Persistence (2-3 days)
Task({
  subagent_type: "backend-dev",
  description: "Implement Phase 2 session persistence",
  prompt: "Update session_store.py to persist raw ADK events. Add 'events' field to schema, maintain derived summaries. Write unit tests."
})

Task({
  subagent_type: "code-analyzer",
  description: "Review session store schema design",
  prompt: "Analyze current session_store.py schema. Recommend optimal structure for storing raw ADK events + derived summaries. Consider performance."
})

// 2. SHORT-TERM: Phase 3 - Frontend Migration (3-5 days)
Task({
  subagent_type: "frontend-developer",
  description: "Complete Phase 3 event handler migration",
  prompt: "Migrate useSSEEventHandlers to canonical ADK events. Update useChatStore for event arrays. Create UI message selectors. Remove legacy event handling."
})

Task({
  subagent_type: "typescript-pro",
  description: "TypeScript optimization for event handling",
  prompt: "Optimize TypeScript types for ADK event handling. Create type-safe selectors. Ensure strict type safety throughout."
})

// 3. SHORT-TERM: E2E Testing (1-2 days)
Task({
  subagent_type: "test-automator",
  description: "Create E2E tests for SSE streaming",
  prompt: "Build Playwright tests for SSE streaming workflows. Test feature flag toggling, backward compatibility, multi-agent scenarios."
})

// 4. MEDIUM-TERM: Phase 4 - Agent Dispatcher (5-7 days)
Task({
  subagent_type: "backend-architect",
  description: "Design and implement agent dispatcher",
  prompt: "Create agent_dispatcher.py with intent classification. Design routing logic for general_chat vs research. Add POST /messages endpoint."
})

Task({
  subagent_type: "ai-engineer",
  description: "Define generalist agent",
  prompt: "Create generalist chat agent for everyday Q&A. Ensure ADK event compliance. Integrate with dispatcher routing."
})

// 5. MEDIUM-TERM: Phase 5 - Documentation (1-2 days)
Task({
  subagent_type: "docs-architect",
  description: "Complete ADK alignment documentation",
  prompt: "Write developer guides for ADK event consumption. Create migration guides. Update README and SSE docs. Document all phases."
})
```

---

### Related Documentation

- **Validation Reports:** `/docs/validation/`
  - `architectural_compliance_report.md` - Phase 0-1 compliance audit
  - `browser_verification_report.md` - Chrome DevTools MCP testing
  - `p0_004_fix_completion_report.md` - SSE race condition fix
  - `session_summary_2025_10_18.md` - Recent session summary
- **Phase Summaries:** `/docs/plans/`
  - `phase_1_completion_summary.md` - Backend streaming alignment
  - `security_hardening_tasks.md` - Security roadmap
- **ADK References:** `/docs/adk/refs/` - 14+ production-ready examples

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
