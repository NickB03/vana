# Web Search Agent - Executive Summary

**Date:** 2025-10-24
**Decision:** Enhance Existing Agent (Architecture B)
**Status:** Ready for Implementation
**Estimated Time:** 8-10 hours

---

## TL;DR - What to Do

1. **Create** `quick_search_agent` as a sub-agent (NOT dispatcher-level)
2. **Enhance** `interactive_planner_agent` with mode detection
3. **Reuse** existing `/run_sse` endpoint (NO new endpoint)
4. **Keep** dispatcher unchanged (NO routing modifications)
5. **Test** with existing infrastructure

**Result:** Fast web search + AI summaries + credibility scoring, seamlessly integrated into existing chat interface.

---

## Critical Issues Resolved

### ✅ Issue 1: Nested Tool Call Violation
**Problem:** Original plan suggested `tools=[brave_search]` on agent invoked via AgentTool
**Resolution:** Already fixed - plan_generator has NO tools (line 269 app/agent.py)

### ✅ Issue 2: Dispatcher Routing Conflicts
**Problem:** "search" keyword ambiguity (search vs research)
**Resolution:** NO dispatcher changes - planner handles both modes internally

### ✅ Issue 3: Agent Execution Model Confusion
**Problem:** Unclear where tools can/can't go
**Resolution:**
- ✅ Sub-agents CAN have tools (quick_search_agent)
- ❌ AgentTool wrappers CANNOT have tools (plan_generator)

### ✅ Issue 4: SSE Endpoint Pattern Mismatch
**Problem:** New endpoint contradicts existing proxy pattern
**Resolution:** Reuse `/run_sse` - NO new endpoint needed

---

## Architecture Decision

### ❌ Original Plan (Architecture A)
```
dispatcher_agent
├── generalist_agent
├── web_search_agent (NEW - causes routing conflicts)
└── interactive_planner_agent
```

**Problems:**
- Dispatcher routing ambiguity
- Duplicate SSE infrastructure
- User confusion (search vs research)
- More code to maintain

---

### ✅ Recommended (Architecture B)
```
dispatcher_agent
├── generalist_agent
└── interactive_planner_agent (ENHANCED)
    ├── quick_search_agent (NEW - sub-agent)
    └── research_pipeline (UNCHANGED)
```

**Benefits:**
- ✅ No dispatcher changes (reuse existing routing)
- ✅ No new endpoints (reuse `/run_sse`)
- ✅ Intelligent mode detection (no user choice needed)
- ✅ 100% backward compatible
- ✅ 45% less code (400 LOC vs 730)
- ✅ 43% fewer test files (4 vs 7)
- ✅ Follows official ADK pattern

---

## How It Works

### User Flow
```
User: "search for Python testing libraries"
    ↓
Dispatcher: Routes to interactive_planner_agent (keyword: "search")
    ↓
Planner: Detects quick search mode (keywords: "search", "for")
    ↓
Delegates to: quick_search_agent (NEW sub-agent)
    ↓
Agent:
    1. Generate 3-4 search queries
    2. Execute ALL in PARALLEL (3x faster)
    3. Generate AI summaries per result
    4. Calculate credibility scores (callback)
    5. Calculate relevance scores (callback)
    6. Return SearchResponse (structured JSON)
    ↓
Result: Fast search with AI enhancements
```

### Mode Detection Examples

| User Query | Mode Detected | Agent Used |
|------------|---------------|------------|
| "search for React libraries" | Quick Search | quick_search_agent |
| "find best Python tools" | Quick Search | quick_search_agent |
| "compare X vs Y" | Quick Search | quick_search_agent |
| "research quantum computing" | Deep Research | research_pipeline |
| "investigate market trends" | Deep Research | research_pipeline |
| "analyze AI developments" | Deep Research | research_pipeline |

---

## Implementation Checklist

### Phase 1: Core (4-6 hours)

**Step 1: Data Models** (30 min)
- [ ] Create `app/models/search_models.py`
- [ ] Define: SearchResult, RelatedSearch, SearchResponse
- [ ] Test: Import and validate schema

**Step 2: Scoring Engine** (2 hours)
- [ ] Create `app/tools/credibility_scorer.py`
- [ ] Implement: CredibilityScorer (40% domain + 15% HTTPS + 25% freshness + 20% quality)
- [ ] Implement: RelevanceScorer (50% title + 30% snippet + 20% density)
- [ ] Write: Unit tests for scoring algorithms

**Step 3: Quick Search Agent** (2 hours)
- [ ] Create `app/agents/quick_search_agent.py`
- [ ] Define agent with `tools=[brave_search]`
- [ ] Set `output_schema=SearchResponse`
- [ ] Add `search_scoring_callback`
- [ ] Test in ADK web UI: `adk web agents/ --port 8080`

**Step 4: Enhance Planner** (1 hour)
- [ ] Modify `app/agent.py`
- [ ] Import `quick_search_agent`
- [ ] Add to `sub_agents=[quick_search_agent, research_pipeline]`
- [ ] Update instruction with mode detection logic
- [ ] Test: Existing research still works

---

### Phase 2: Testing (3-4 hours)

**Unit Tests** (2 hours)
- [ ] `tests/unit/test_quick_search_agent.py`
- [ ] `tests/unit/test_credibility_scorer.py`
- [ ] Target: 80%+ coverage

**Integration Tests** (1 hour)
- [ ] Test via existing `/run_sse` endpoint
- [ ] Verify SearchResponse structure
- [ ] Check parallel execution (timing < 8s)

**E2E Tests** (1 hour)
- [ ] Use Chrome DevTools MCP
- [ ] Test: "search for Python libraries"
- [ ] Verify: Results display correctly
- [ ] Check: No console errors

---

## Code Examples

### Quick Search Agent (NEW)
```python
# File: app/agents/quick_search_agent.py

quick_search_agent = LlmAgent(
    model=config.worker_model,
    name="quick_search_agent",
    description="Fast web search with AI summaries and scoring",
    instruction="""
    You are a web search specialist.

    1. Generate 3-4 diverse search queries
    2. Execute ALL in ONE TURN (parallel)
    3. Generate AI summaries per result
    4. Return SearchResponse (JSON)
    """,
    tools=[brave_search],  # ✅ SAFE (sub-agent, NOT AgentTool)
    output_schema=SearchResponse,
    output_key="search_results",
    before_agent_callback=before_agent_callback,
    after_agent_callback=search_scoring_callback,
)
```

### Enhanced Planner (MODIFY)
```python
# File: app/agent.py

interactive_planner_agent = LlmAgent(
    name="interactive_planner_agent",
    model=config.worker_model,
    description="Research assistant with quick search and deep research",
    instruction=f"""
    **MODE DETECTION:**

    1. Quick Search → quick_search_agent
       Keywords: "search", "find", "best", "compare"

    2. Deep Research → plan_generator + research_pipeline
       Keywords: "research", "investigate", "analyze"
    """,
    sub_agents=[
        quick_search_agent,      # NEW
        research_pipeline,       # EXISTING
    ],
    tools=[
        AgentTool(plan_generator),  # EXISTING
        store_memory_tool,
        retrieve_memories_tool,
        delete_memory_tool,
    ],
    # ... callbacks ...
)
```

---

## Performance Metrics

### Parallel Search Execution
- **Sequential:** 3 searches × 5s = 15 seconds
- **Parallel:** max(5, 5, 5) = 5 seconds
- **Speedup:** 3x faster ✅

### Search Completion Time
- **Target:** < 8 seconds (3-4 parallel queries)
- **Expected:** 5-7 seconds
- **Status:** ✅ Achievable

### SSE Latency
- **Target:** < 500ms
- **Current:** ~200ms (existing proxy)
- **Status:** ✅ Already optimized

---

## What You DON'T Need

### ❌ NO New SSE Endpoint
```python
# ❌ DON'T CREATE THIS:
# app/routes/search.py

@router.post("/api/search/stream")
async def search_stream(...):
    # Custom SSE implementation
```

**Why:** Existing `/run_sse` already works perfectly

---

### ❌ NO Dispatcher Changes
```python
# ❌ DON'T MODIFY THIS:
dispatcher_agent = LlmAgent(
    instruction="""
    ROUTING RULES:
    4. WEB SEARCH → web_search_agent  # DON'T ADD THIS
    """,
)
```

**Why:** Existing routing to `interactive_planner_agent` handles it

---

### ❌ NO New Frontend Page
```tsx
// ❌ DON'T CREATE THIS:
// frontend/src/app/search/page.tsx

export default function SearchPage() {
  // Dedicated search UI
}
```

**Why:** Existing chat interface works (optional enhancement for later)

---

## Success Criteria

### Functional ✅
- [ ] User can search via chat: "search for Python libraries"
- [ ] Results include AI summaries (2-3 sentences)
- [ ] Credibility scores displayed (0.0-1.0)
- [ ] Relevance scores displayed (0.0-1.0)
- [ ] Related searches suggested (3-4 queries)
- [ ] Real-time SSE streaming works
- [ ] Error handling graceful

### Performance ✅
- [ ] Search completes in < 8 seconds
- [ ] Parallel execution verified (3x speedup)
- [ ] SSE latency < 500ms
- [ ] UI responsive during search

### Quality ✅
- [ ] 80%+ test coverage (backend)
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] No console errors (Chrome DevTools MCP)
- [ ] Backward compatible (existing research works)

---

## Common Pitfalls to Avoid

### ❌ DON'T: Add tools to plan_generator
```python
# ❌ WRONG (causes 400 error)
plan_generator = LlmAgent(
    tools=[brave_search],  # Nested function calls
)
tools=[AgentTool(plan_generator)]
```

### ✅ DO: Keep plan_generator tool-free
```python
# ✅ CORRECT (already done)
plan_generator = LlmAgent(
    # No tools parameter
)
```

---

### ❌ DON'T: Create new SSE endpoint
```python
# ❌ WRONG (duplicates infrastructure)
@router.post("/api/search/stream")
async def custom_sse(...):
    # New SSE logic
```

### ✅ DO: Reuse existing endpoint
```python
# ✅ CORRECT (no new code)
# Frontend: POST /api/sse/run_sse
# Backend: Existing proxy works
```

---

### ❌ DON'T: Modify dispatcher routing
```python
# ❌ WRONG (creates conflicts)
ROUTING RULES:
4. WEB SEARCH → web_search_agent
5. RESEARCH → interactive_planner_agent
   (Both use "search" keyword)
```

### ✅ DO: Let planner handle routing
```python
# ✅ CORRECT (intelligent delegation)
ROUTING RULES:
4. RESEARCH/SEARCH → interactive_planner_agent
   (Planner decides: quick vs deep)
```

---

## Files Summary

### Create (3 files)
1. `app/models/search_models.py` (80 lines)
2. `app/tools/credibility_scorer.py` (200 lines)
3. `app/agents/quick_search_agent.py` (120 lines)

### Modify (1 file)
1. `app/agent.py` (add import, enhance planner)

### Total: 400 lines of new code

---

## Testing Summary

### Unit Tests (2 files)
1. `tests/unit/test_quick_search_agent.py`
2. `tests/unit/test_credibility_scorer.py`

### Integration Tests (existing file)
- Enhance: `tests/integration/test_adk_sse.py`

### E2E Tests (Chrome DevTools MCP)
- Manual: Navigate, search, verify

### Total: 4 test scenarios

---

## Timeline

| Phase | Tasks | Time | Total |
|-------|-------|------|-------|
| **Phase 1** | Data models + Scoring + Agent + Planner | 4-6 hours | 4-6h |
| **Phase 2** | Unit + Integration + E2E tests | 3-4 hours | 3-4h |
| **Phase 3** | Polish + Documentation (optional) | 2-3 hours | 2-3h |
| **TOTAL** | **Core Implementation** | **8-10 hours** | **8-10h** |

**Recommended:** Complete Phases 1-2 first (8-10 hours), then optionally add Phase 3 polish.

---

## Risk Assessment

### Low Risk ✅
- ✅ No breaking changes (100% backward compatible)
- ✅ Reuses existing infrastructure
- ✅ Additive changes only
- ✅ Easy rollback (remove sub-agent)

### Medium Risk ⚠️
- ⚠️ Mode detection logic complexity (mitigated by clear keywords)
- ⚠️ Scoring algorithm accuracy (mitigated by iterative tuning)

### High Risk ❌
- None identified

**Overall Risk:** LOW ✅

---

## Comparison with Original Plan

| Factor | Original Plan | Recommended | Winner |
|--------|--------------|-------------|--------|
| Implementation Time | 10-12 hours | 8-10 hours | ✅ Recommended |
| Code Changes | 5 files | 3 files | ✅ Recommended |
| Breaking Changes | Yes | No | ✅ Recommended |
| User Experience | Manual choice | Intelligent | ✅ Recommended |
| Maintenance | High | Low | ✅ Recommended |
| ADK Compliance | Good | Excellent | ✅ Recommended |

**Verdict:** Recommended architecture is superior in 6/6 categories.

---

## References

### Key Documents
- **Full Architecture:** `/docs/architecture/web-search-agent-architecture-final.md`
- **Comparison Matrix:** `/docs/architecture/web-search-comparison-matrix.md`
- **Original Plan:** `/docs/plans/agent-web-search-implementation-plan.md`
- **Handoff Doc:** `/docs/handoff/agent-web-search-handoff.md`

### ADK Patterns
- **Orchestrator Pattern:** `/docs/adk/refs/brandon-hancock-agent-bakeoff/agents/chat/chat/agent.py`
- **Current Implementation:** `/app/agent.py`
- **Brave Search Tool:** `/app/tools/brave_search.py`

---

## Quick Start

```bash
# 1. Create data models
touch app/models/search_models.py
# Copy from: docs/architecture/web-search-agent-architecture-final.md Section III.1

# 2. Create scoring engine
touch app/tools/credibility_scorer.py
# Copy from: docs/plans/agent-web-search-implementation-plan.md lines 182-361

# 3. Create quick search agent
touch app/agents/quick_search_agent.py
# Copy from: docs/architecture/web-search-agent-architecture-final.md Section III.1

# 4. Enhance planner
vim app/agent.py
# Copy from: docs/architecture/web-search-agent-architecture-final.md Section III.2

# 5. Test
make test

# 6. Verify in ADK web UI
adk web agents/ --port 8080
# Query: "search for Python testing libraries"
```

---

## FAQ

**Q: Can users still do deep research?**
A: Yes! Mode detection is automatic. "research X" triggers deep research, "search for X" triggers quick search.

**Q: Do we need a new frontend page?**
A: No. Existing chat interface works. Optional enhancement for later.

**Q: Does this break existing functionality?**
A: No. 100% backward compatible. All existing queries work unchanged.

**Q: How fast is parallel search?**
A: 3x faster than sequential. 3 searches in 5s vs 15s.

**Q: Can I still use the original plan?**
A: Yes, but recommended architecture is better (see comparison matrix).

---

## Next Step

**READ:** `/docs/architecture/web-search-agent-architecture-final.md`

Then follow **Section X: Implementation Roadmap**

Estimated completion: **8-10 hours** (1-2 days)

---

**Status:** READY FOR IMPLEMENTATION ✅
**Confidence:** 95%
**Last Updated:** 2025-10-24
**Author:** Google ADK Super Agent
