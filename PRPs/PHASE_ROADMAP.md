# VANA Phase Roadmap - Vision Lock Document

> **Purpose**: Prevent scope drift by documenting the planned phases and their core objectives.
> This is our "North Star" document - update with learnings but don't lose the vision.

## 🎯 Overall Vision
VANA - Multi-Domain AI Agent System built on Google's ADK, extending beyond coding to personal assistance, creative content, and research aggregation.

## 📋 Phase Overview

### ✅ Phase 1: Validate Orchestrator Pattern  
**Status**: ~95% Complete - Finishing End-to-End Test  
**Goal**: Fix and validate existing orchestrator implementation locally  
**Key Outcomes**:
- ✅ Import errors resolved (Redis dependencies removed)
- ✅ Basic tool delegation working  
- ✅ Sub-agents pattern validated (6 specialists loading)
- ✅ Routing logic functional through enhanced_orchestrator
- ✅ All specialist network tests passing
- ⏳ Simple end-to-end workflow test 
- 📝 Phase 1 completion documentation

**Chunks Complete**: Network validation, Redis cleanup, specialist loading

---

### 🚀 Phase 2A: Cloud Deployment Validation  
**Status**: Ready to Start (Next Priority)  
**Goal**: Validate system works in production-like Cloud Run environment  
**Key Outcomes**:
- Deploy to Cloud Run vana-dev successfully
- Real API integration validated in cloud
- Environment configuration working
- Basic health checks and workflow testing
- Stakeholder-accessible demo environment

**Planned Chunks**:
- 2A.1: Cloud Run deployment with current functionality
- 2A.2: Real API key integration and testing
- 2A.3: Environment configuration validation
- 2A.4: Basic workflow demonstration in cloud

---

### 📊 Phase 2B: ADK Evaluation & Performance  
**Status**: Planned (After 2A Complete)  
**Goal**: Validate and optimize agent performance with realistic metrics  
**Key Outcomes**:
- ADK evaluation with realistic scores (>0.0)
- Performance baselines established
- Optimization recommendations identified
- Quality and reliability metrics

**Planned Chunks**:
- 2B.1: ADK evaluation scenarios in cloud environment
- 2B.2: Performance baseline measurement  
- 2B.3: Optimization based on evaluation data
- 2B.4: Comprehensive system testing

---

### 🔄 Phase 2C: MCP-ADK Integration Bridge  
**Status**: Planned (After Performance Validated)  
**Goal**: Enable MCP tools in ADK agents via wrapper pattern  
**Key Outcomes**:
- MCPToolWrapper class converting MCP tools to ADK-compatible
- MCPEnabledAgent base class for MCP-aware agents  
- Dynamic tool discovery from MCP servers
- Test with GitHub and Brave Search MCP servers

**Planned Chunks** (from INITIAL.md):
- 2C.1: MCPToolWrapper class only (test with mock)
- 2C.2: Basic MCPEnabledAgent without discovery
- 2C.3: Add single MCP server integration (GitHub)
- 2C.4: Add tool discovery for single server
- 2C.5: Test with real GitHub API calls
- 2C.6: Add second MCP server (Brave Search)

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
- **2025-01-19**: Updated Phase 1 status to ~95% complete, restructured Phase 2 into 2A (Cloud Deployment), 2B (ADK Evaluation), 2C (MCP Integration) based on dependency analysis and risk management strategy
- *[Future updates with learnings go here]*

---

**Remember**: This document is our compass. Refer to it before starting each phase to prevent drift!