# Agent Web Search Integration - Handoff Document

**Date:** 2025-10-24
**Branch:** `feature/agent-web-search-integration`
**Status:** Planning Complete, Ready for Implementation
**Next Agent:** Implementation Specialist

---

## 🎯 Mission Brief

Integrate the **Agent Web Search** component from agents-ui-kit with a new specialized Google ADK search agent to create a production-quality web search experience with:
- AI-enhanced search results
- Credibility scoring (domain authority, HTTPS, freshness)
- Relevance scoring (query match, keyword density)
- Real-time SSE streaming
- Related search suggestions

---

## 📊 Current State Summary

### Git Status ✅
```
Repository: NickB03/vana
Main Branch: ✅ Clean, pushed to remote (commit: 84b9884b)
Feature Branch: feature/agent-web-search-integration ✅ Created
Current Branch: feature/agent-web-search-integration
Working Tree: Clean
```

### Recent Commits
```
506051f7 (feature/agent-web-search-integration)
         docs: Add comprehensive Agent Web Search implementation plan

84b9884b (origin/main, main)
         refactor: Update frontend components and add integration plan
         [6 files changed: frontend updates]

eef8990d refactor: Update imports and remove duplicate prompt-input component
```

### What Has Been Completed ✅
1. ✅ All uncommitted changes staged and committed to main
2. ✅ Main branch pushed to remote (origin/main)
3. ✅ Feature branch created: `feature/agent-web-search-integration`
4. ✅ Comprehensive implementation plan created (1,242 lines)
5. ✅ Architecture designed (three-layer: Frontend → API → ADK Agent)
6. ✅ All code examples written (Backend, API, Frontend)
7. ✅ Testing strategy defined
8. ✅ Timeline and checklist created

### What Needs to Be Done ⏳
- [ ] Phase 1: Backend implementation (ADK agent + scoring)
- [ ] Phase 2: API layer (SSE streaming endpoint)
- [ ] Phase 3: Frontend implementation (UI components)
- [ ] Phase 4: Testing (unit, integration, E2E)
- [ ] Phase 5: Documentation
- [ ] Phase 6: Deployment

---

## 📚 Critical Documents to Read (Priority Order)

### 1. Implementation Plan (MUST READ FIRST) 🔥
**Location:** `docs/plans/agent-web-search-implementation-plan.md`

**What it contains:**
- Complete architecture diagrams
- Phase-by-phase implementation breakdown
- Full code examples for all layers
- Data models (Pydantic schemas)
- Credibility and relevance scoring algorithms
- SSE streaming implementation
- Testing strategies
- Success criteria
- Risk mitigation
- Timeline (25 hours / 2 weeks)

**Why read it:**
- Contains ALL implementation details
- Has complete code you can copy/adapt
- Defines the architecture you must follow
- Explains scoring algorithms in detail
- Shows SSE event flow

### 2. Project Instructions (Context)
**Location:** `CLAUDE.md` (project root)

**What it contains:**
- Project architecture (FastAPI + ADK + Next.js)
- Service ports (Backend 8000, ADK 8080, Frontend 3000)
- Existing agent architecture (dispatcher pattern)
- Code style guidelines
- Testing requirements
- Git workflow

**Why read it:**
- Understand existing codebase structure
- Know where to put files
- Follow established patterns
- Use correct tools (brave_search)

### 3. Current Agent Architecture
**Location:** `app/agent.py`

**What it contains:**
- Existing `dispatcher_agent` (routes to sub-agents)
- Existing `interactive_planner_agent` (research pipeline)
- Existing `generalist_agent` (simple Q&A)
- Agent callback patterns
- Tool integration examples

**Why read it:**
- See how to integrate new `web_search_agent`
- Understand dispatcher routing logic
- Follow existing agent patterns
- Use same callbacks and tools

### 4. Existing Search Tool
**Location:** `app/tools/brave_search.py`

**What it contains:**
- Brave Search API integration
- Async search function
- Connection pooling
- Error handling

**Why read it:**
- Understand available search capabilities
- See how to call `brave_search` tool
- Learn parallel execution pattern
- Check API response format

### 5. Frontend Component Examples
**Location:** `frontend/src/components/vana/VanaHomePage.tsx`

**What it contains:**
- Existing React component patterns
- shadcn/ui + prompt-kit usage
- Performance optimization (memoization)
- State management

**Why read it:**
- Follow existing frontend patterns
- Use same styling approach
- Maintain consistency

---

## 🏗️ Architecture Overview (Quick Reference)

```
┌──────────────────────────────────────────┐
│  Frontend: /search page                  │
│  Component: AgentWebSearch               │
│  • Search input + filters                │
│  • Result cards with AI summaries        │
│  • Credibility badges                    │
│  • Related searches                      │
└──────────────┬───────────────────────────┘
               │ SSE: POST /api/search/stream
               ↓
┌──────────────────────────────────────────┐
│  API: FastAPI (app/routes/search.py)     │
│  • Receives query                        │
│  • Invokes web_search_agent              │
│  • Streams events (SSE)                  │
└──────────────┬───────────────────────────┘
               │ Agent invocation
               ↓
┌──────────────────────────────────────────┐
│  Agent: web_search_agent (NEW)           │
│  1. Parse query                          │
│  2. Generate 4-5 search queries          │
│  3. Execute brave_search (PARALLEL)      │
│  4. Generate AI summaries                │
│  5. Calculate credibility scores         │
│  6. Calculate relevance scores           │
│  7. Generate related searches            │
│  8. Return SearchResponse (Pydantic)     │
└──────────────────────────────────────────┘
```

---

## 🚀 Recommended Next Steps (Priority Order)

### Option A: Backend-First Approach (Recommended) ⭐

**Why:** Build foundation, test in isolation, then add UI

**Steps:**
1. **Create Data Models** (30 min)
   - File: `app/models/search_models.py`
   - Copy from implementation plan (lines 60-110)
   - Models: `SearchResult`, `RelatedSearch`, `SearchResponse`

2. **Create Scoring Engine** (2 hours)
   - File: `app/tools/credibility_scorer.py`
   - Copy from implementation plan (lines 120-280)
   - Classes: `CredibilityScorer`, `RelevanceScorer`
   - Test with sample data

3. **Create Search Agent** (3 hours)
   - File: `app/agents/web_search_agent.py`
   - Copy from implementation plan (lines 290-420)
   - Agent: `web_search_agent`
   - Test in ADK web UI (`adk web agents/ --port 8080`)

4. **Update Dispatcher** (30 min)
   - File: `app/agent.py` (modify existing)
   - Add routing rule for web searches
   - Add `web_search_agent` to sub_agents list

5. **Write Unit Tests** (2 hours)
   - File: `tests/unit/test_web_search_agent.py`
   - Test scoring algorithms
   - Test agent invocation

6. **Test Backend** (1 hour)
   - Start ADK web UI
   - Test search agent with sample queries
   - Verify structured output matches schema

**Total Time:** ~8-9 hours (1-2 days)

### Option B: Frontend-First Approach

**Why:** See the UI early, mock backend later

**Steps:**
1. **Install Agent Web Search Component** (1 hour)
   ```bash
   cd frontend
   npx shadcn add "https://agents-ui-kit.com/c/agent-web-search.json"
   ```

2. **Create Search Page** (2 hours)
   - File: `frontend/src/app/search/page.tsx`
   - Copy from implementation plan (lines 500-620)
   - Use mock data initially

3. **Customize Styling** (1 hour)
   - Match Vana theme (Prompt-Kit)
   - Responsive design

4. **Test UI** (1 hour)
   - Chrome DevTools MCP
   - Verify all interactions work
   - Check mobile responsiveness

**Total Time:** ~5 hours (1 day)

### Option C: Full Sequential

Follow the implementation plan phases in order:
1. Phase 1: Backend (6-8 hours)
2. Phase 2: API (3-4 hours)
3. Phase 3: Frontend (8-10 hours)
4. Phase 4: Testing (4-5 hours)
5. Phase 5: Documentation (2-3 hours)
6. Phase 6: Deployment (1-2 hours)

**Total Time:** ~24-32 hours (2 weeks)

---

## 🎯 Quick Start Commands

### Start Development Environment
```bash
# From project root
pm2 start ecosystem.config.js
# This starts:
# - Backend (FastAPI) on port 8000
# - ADK on port 8080
# - Frontend (Next.js) on port 3000
```

### Verify Services Running
```bash
lsof -i :8000  # Backend
lsof -i :8080  # ADK
lsof -i :3000  # Frontend
```

### Run Tests
```bash
# Backend tests
make test                    # All tests
make test-unit              # Unit tests only
uv run pytest tests/unit/test_web_search_agent.py -v  # Specific test

# Frontend tests
npm --prefix frontend test
```

### Test in ADK Web UI
```bash
adk web agents/ --port 8080
# Open http://localhost:8080 in browser
# Test web_search_agent with sample queries
```

### Git Workflow
```bash
# You're already on the feature branch
git branch --show-current
# Output: feature/agent-web-search-integration

# Make changes, commit
git add .
git commit -m "feat: implement search agent scoring"

# Push to remote (when ready)
git push origin feature/agent-web-search-integration
```

---

## ⚠️ Critical Implementation Details

### 1. Parallel Search Execution (CRITICAL)
```python
# ✅ CORRECT: All searches in ONE turn
brave_search(query1)
brave_search(query2)
brave_search(query3)
brave_search(query4)
# ADK executes these in parallel → 3-5x faster

# ❌ WRONG: Sequential searches
brave_search(query1)
# Wait for result
brave_search(query2)
# Wait for result
# etc... → MUCH SLOWER
```

### 2. Pydantic Schema Validation
```python
# Agent MUST use output_schema for structured output
web_search_agent = LlmAgent(
    ...,
    output_schema=SearchResponse,  # CRITICAL
    ...
)
```

### 3. SSE Event Format
```python
# Correct SSE format
yield f"event: search_started\n"
yield f"data: {json.dumps({'query': query})}\n\n"
# Note: Double newline after data
```

### 4. Credibility Scoring Weights
```python
# 40% Domain authority
# 15% HTTPS
# 25% Freshness
# 20% Content quality
# Total = 100%
```

### 5. Frontend SSE Connection
```typescript
// Use POST with JSON body, NOT GET with query params
const response = await fetch('/api/search/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query })
})
```

---

## 🔧 File Creation Checklist

### Backend Files to Create
- [ ] `app/models/search_models.py` (NEW)
- [ ] `app/tools/credibility_scorer.py` (NEW)
- [ ] `app/agents/web_search_agent.py` (NEW)
- [ ] `app/routes/search.py` (NEW)

### Backend Files to Modify
- [ ] `app/agent.py` (add web_search_agent to dispatcher)
- [ ] `app/server.py` (register search router)

### Frontend Files to Create
- [ ] `frontend/src/app/search/page.tsx` (NEW)
- [ ] `frontend/src/components/agents-ui/agent-web-search.tsx` (NEW - from shadcn)
- [ ] `frontend/src/components/agents-ui/search-result-card.tsx` (NEW)
- [ ] `frontend/src/components/agents-ui/credibility-badge.tsx` (NEW)

### Test Files to Create
- [ ] `tests/unit/test_web_search_agent.py` (NEW)
- [ ] `tests/integration/test_search_api.py` (NEW)

### Documentation Files to Create
- [ ] `docs/api/search-api.md` (NEW)
- [ ] `docs/components/agent-web-search.md` (NEW)
- [ ] `docs/guides/web-search-guide.md` (NEW)

---

## 🎓 Key Patterns to Follow

### Backend Pattern: ADK Agent with Structured Output
```python
from pydantic import BaseModel

class MyResponse(BaseModel):
    field1: str
    field2: int

my_agent = LlmAgent(
    name="my_agent",
    model=config.worker_model,
    instruction="...",
    tools=[my_tool],
    output_schema=MyResponse,  # Enforces structure
    before_agent_callback=before_agent_callback,
    after_agent_callback=after_agent_callback,
)
```

### Frontend Pattern: SSE Streaming
```typescript
const eventSource = new EventSource('/api/endpoint')

eventSource.addEventListener('event_type', (e) => {
  const data = JSON.parse(e.data)
  // Handle event
})

eventSource.addEventListener('error', (e) => {
  console.error('SSE error:', e)
  eventSource.close()
})
```

### Testing Pattern: ADK Agent Testing
```python
@pytest.mark.asyncio
async def test_my_agent():
    context = create_invocation_context(
        app_name="vana",
        user_id="test-user",
        session_id="test-session",
        user_message="test query"
    )

    async for event in my_agent.run_async(context):
        # Assert on events
        pass

    result = context.session.state.get("output_key")
    assert result is not None
```

---

## 🚨 Common Pitfalls to Avoid

### 1. Don't Nest Agents with Tools
```python
# ❌ WRONG: plan_generator has tools and is called via AgentTool
plan_generator = LlmAgent(
    tools=[brave_search],  # This causes 400 error
)
AgentTool(plan_generator)  # Nested tools = error

# ✅ CORRECT: Remove tools from nested agents
plan_generator = LlmAgent(
    # No tools parameter
)
```

### 2. Don't Modify package.json/pyproject.toml Directly
```bash
# ❌ WRONG: Manual edit
vim package.json

# ✅ CORRECT: Use package manager
npm --prefix frontend install <package>
uv add <package>
```

### 3. Don't Skip Browser Verification
```bash
# ❌ WRONG: Assume tests passing = working UI
npm test  # Pass ✅
# Deploy without checking browser

# ✅ CORRECT: Always verify in browser
npm test  # Pass ✅
# Use Chrome DevTools MCP to verify
mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000" })
mcp__chrome-devtools__list_console_messages()
```

### 4. Don't Use Theme Accent Colors for Body Text
```tsx
// ❌ WRONG: Accent colors for text
<p className="text-primary">Body text</p>

// ✅ CORRECT: Neutral colors for text
<p className="text-foreground">Body text</p>
// Use text-primary only for emphasis
```

---

## 📈 Success Criteria (How to Know You're Done)

### Functional ✅
- [ ] User can search web via `/search` page
- [ ] Results display with AI summaries
- [ ] Credibility scores visible (0.0-1.0)
- [ ] Relevance scores visible (0.0-1.0)
- [ ] Related searches displayed
- [ ] Real-time streaming works
- [ ] Error handling works

### Performance ✅
- [ ] Search completes in < 5 seconds
- [ ] Parallel search execution confirmed
- [ ] SSE streaming has minimal latency
- [ ] UI stays responsive during search

### Quality ✅
- [ ] 80%+ test coverage (backend)
- [ ] All E2E tests pass
- [ ] No console errors
- [ ] Lighthouse accessibility score 95+
- [ ] Mobile responsive

---

## 💡 Pro Tips

1. **Start Small:** Implement basic version first (no scoring), then add enhancements
2. **Test Early:** Test agent in ADK web UI before integrating with frontend
3. **Use Mocks:** Mock backend in frontend initially to iterate on UI quickly
4. **Check Browser:** Always verify frontend changes in Chrome DevTools MCP
5. **Parallel Search:** Remember to call all brave_search functions in ONE turn
6. **Copy Code:** The implementation plan has complete code - copy/adapt it
7. **Follow Patterns:** Match existing agent patterns in `app/agent.py`
8. **Read Errors:** ADK errors are descriptive - read them carefully

---

## 🆘 If You Get Stuck

### Scoring Algorithm Issues
- Read: `docs/plans/agent-web-search-implementation-plan.md` (lines 120-280)
- The credibility/relevance algorithms are fully implemented
- Copy the code directly

### ADK Agent Not Working
- Check ADK web UI: `adk web agents/ --port 8080`
- Verify `output_schema` is set correctly
- Check agent instruction formatting
- Look at existing agents in `app/agent.py`

### SSE Streaming Issues
- Verify event format: `event: type\ndata: json\n\n`
- Check CORS headers in FastAPI
- Test with curl first before frontend
- Look at existing SSE in `app/routes/adk.py`

### Frontend Component Issues
- Check shadcn/ui installation
- Verify Prompt-Kit theme compatibility
- Use Chrome DevTools MCP to debug
- Check `frontend/src/components/vana/VanaHomePage.tsx` for patterns

### Import Errors
- Backend: Use `from app.X import Y` (not relative imports)
- Frontend: Use `@/components/...` (configured in tsconfig.json)

---

## 📞 Resources & References

### Documentation
- Implementation Plan: `docs/plans/agent-web-search-implementation-plan.md`
- Project Instructions: `CLAUDE.md`
- ADK Docs: `docs/adk/refs/official-adk-python/`

### Key Files
- Existing Agents: `app/agent.py`
- Brave Search Tool: `app/tools/brave_search.py`
- Frontend Example: `frontend/src/components/vana/VanaHomePage.tsx`
- ADK Integration: `app/integration/adk_integration.py`

### External Resources
- agents-ui-kit docs: https://agents-ui.github.io/agents-kit/
- Google ADK docs: https://google.github.io/adk-docs/
- shadcn/ui: https://ui.shadcn.com/

---

## ✅ Handoff Checklist

Before you start implementing, verify:
- [ ] Read implementation plan (`docs/plans/agent-web-search-implementation-plan.md`)
- [ ] Understand architecture (three layers)
- [ ] Know which files to create/modify
- [ ] Services are running (pm2 start ecosystem.config.js)
- [ ] On correct branch (`feature/agent-web-search-integration`)
- [ ] Git working tree is clean
- [ ] Chosen implementation approach (Backend-first recommended)

---

## 🎬 Start Here

**Option 1: Backend-First (Recommended)**
```bash
# 1. Create data models
touch app/models/search_models.py
# Copy from implementation plan lines 60-110

# 2. Test services are running
pm2 status

# 3. Begin implementation
# Read: docs/plans/agent-web-search-implementation-plan.md
```

**Option 2: Frontend-First**
```bash
# 1. Install component
cd frontend
npx shadcn add "https://agents-ui-kit.com/c/agent-web-search.json"

# 2. Create search page
touch src/app/search/page.tsx
# Copy from implementation plan lines 500-620
```

---

**Good luck! The plan is comprehensive - you have everything you need.** 🚀

**Questions? Re-read the implementation plan - it answers 90% of questions.**

**Last updated:** 2025-10-24
**Estimated completion:** 2 weeks (25 hours)
**Branch:** `feature/agent-web-search-integration`
