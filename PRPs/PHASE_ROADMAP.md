# VANA Phase Roadmap - Vision Lock Document

> **Purpose**: Prevent scope drift by documenting the planned phases and their core objectives.
> This is our "North Star" document - update with learnings but don't lose the vision.

## 🎯 Overall Vision
VANA - Multi-Domain AI Agent System built on Google's ADK, extending beyond coding to personal assistance, creative content, and research aggregation.

## 📋 Phase Overview

### ✅ Phase 1: Validate Orchestrator Pattern
**Status**: PRP Created - Ready to Execute  
**Goal**: Fix and validate existing orchestrator implementation  
**Key Outcomes**:
- Import errors resolved
- Basic tool delegation working
- Sub-agents pattern validated
- Routing logic functional
- Metrics and caching operational

**Chunks**: 5 (Fix imports → Tools → Sub-agents → Routing → Metrics)

---

### 🔄 Phase 2: MCP-ADK Integration Bridge
**Status**: Planned  
**Goal**: Enable MCP tools in ADK agents via wrapper pattern  
**Key Outcomes**:
- MCPToolWrapper class converting MCP tools to ADK-compatible
- MCPEnabledAgent base class for MCP-aware agents
- Dynamic tool discovery from MCP servers
- Test with GitHub and Brave Search MCP servers

**Planned Chunks** (from INITIAL.md):
- 2.1: MCPToolWrapper class only (test with mock)
- 2.2: Basic MCPEnabledAgent without discovery
- 2.3: Add single MCP server integration (GitHub)
- 2.4: Add tool discovery for single server
- 2.5: Test with real GitHub API calls
- 2.6: Add second MCP server (Brave Search)

**Key Design** (from mcp_integration_design.md):
```python
class MCPToolWrapper:
    """Wrapper to convert MCP tools into ADK-compatible tools"""
    async def __call__(self, **kwargs) -> Dict[str, Any]:
        result = await self.mcp_manager.execute_tool(
            self.server_name,
            self.tool_name,
            kwargs
        )
```

---

### 🔄 Phase 3: Model Flexibility with ADK's LiteLLM
**Status**: Planned  
**Goal**: Cost-optimized agent routing with OpenRouter  
**Key Outcomes**:
- ADK's native LiteLLM integration tested
- Model selection utility for task complexity
- Cost-optimized routing (cheap models for simple tasks)
- OpenRouter integration with 100+ models

**Planned Chunks**:
- 3.1: Test ADK's native LiteLLM with OpenRouter
- 3.2: Create model selection utility using `google.adk.models.lite_llm`
- 3.3: Implement cost-optimized agent example
- 3.4: Add model routing based on task complexity

**Key Pattern**:
```python
from google.adk.models.lite_llm import LiteLlm

agent = LlmAgent(
    model=LiteLlm(
        model="openrouter/meta-llama/llama-3-8b-instruct",
        api_base="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY")
    ),
    name="cost_optimized_agent"
)
```

---

### 📅 Phase 4: Personal Assistant Agents
**Status**: Planned  
**Goal**: Email and calendar management agents  
**Key Outcomes**:
- Gmail integration via API
- Calendar scheduling agent
- Task management basics
- Proper auth handling

**Planned Chunks**:
- 4.1: Email assistant with single tool (read_inbox)
- 4.2: Add send_email capability
- 4.3: Calendar agent with list_events only
- 4.4: Add create_event capability

---

### 🎨 Phase 5: Creative Content Pipeline
**Status**: Planned  
**Goal**: Content creation workflow agents  
**Key Outcomes**:
- Content drafter agent
- Refinement loop implementation
- Quality scoring system
- Multi-stage pipeline

**Planned Chunks**:
- 5.1: Basic content drafter agent
- 5.2: Add single refinement loop
- 5.3: Integrate quality scoring

---

### 🔍 Phase 6: Research Aggregation
**Status**: Planned  
**Goal**: Multi-source research synthesis  
**Key Outcomes**:
- Web search integration
- Parallel search capability
- Result synthesis agent
- Source credibility scoring

**Planned Chunks**:
- 6.1: Single source web search
- 6.2: Add parallel search capability
- 6.3: Implement result synthesis

---

## 🚦 Phase Gates

Each phase must meet these criteria before proceeding:
1. All chunks tested locally ✓
2. All chunks deployed to vana-dev ✓
3. Integration tests passing ✓
4. No critical bugs ✓
5. Learnings documented in ChromaDB ✓

## 📝 Drift Prevention Rules

1. **Vision Checkpoint**: Before each phase, re-read this document
2. **Scope Guard**: New features go in FUTURE_FEATURES.md, not current phase
3. **Learning Integration**: Update this doc with learnings, don't change core goals
4. **Chunk Discipline**: Never implement more than planned chunks
5. **Review Gate**: After each phase, review against INITIAL.md

## 🔄 Update Log

- **2025-01-19**: Initial roadmap created from INITIAL.md
- *[Future updates with learnings go here]*

---

**Remember**: This document is our compass. Refer to it before starting each phase to prevent drift!