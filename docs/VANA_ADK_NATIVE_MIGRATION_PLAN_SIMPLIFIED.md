# VANA ADK Native Migration Plan (Simplified)

## Overview

Direct migration to ADK native patterns without backward compatibility concerns. This is a complete rewrite leveraging all ADK best practices.

## Implementation Plan

### Phase 1: Core Models (Day 1-2)

Create all Pydantic models in `lib/models/`:

```python
# lib/models/__init__.py
from .base import ToolResult, RoutingDecision, SpecialistResponse
from .security import SecurityScanResult
from .architecture import ArchitectureAnalysis
from .data_science import DataAnalysisResult
from .devops import DevOpsResult
from .qa import QATestResult
from .ui_ux import UIUXAnalysis
from .content import ContentResult
from .research import ResearchResult

# lib/models/base.py
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ToolResult(BaseModel):
    tool_name: str
    success: bool
    result: Any
    error: Optional[str] = None
    execution_time_ms: float

class RoutingDecision(BaseModel):
    target: str  # "specialist" or "workflow"
    specialist_name: Optional[str] = None
    workflow_type: Optional[str] = None  # "parallel", "sequential", "loop"
    specialists_needed: List[str] = []
    confidence: float = Field(ge=0, le=1)
    reasoning: str
    is_security_critical: bool = False

class SpecialistResponse(BaseModel):
    specialist_name: str
    success: bool
    summary: str
    details: Dict[str, Any]
    tools_used: List[ToolResult]
    confidence: float = Field(ge=0, le=1)
    next_steps: List[str] = []
    requires_human_review: bool = False
```

### Phase 2: New Agent Architecture (Day 3-5)

Replace entire `agents/` directory structure:

```python
# agents/vana/orchestrator.py
from google.adk.agents import SequentialAgent, ParallelAgent, Agent
from lib.models import RoutingDecision

# Simple entry point - just transfers
entry_agent = Agent(
    name="vana_entry",
    model="gemini-2.0-flash",
    instruction="You are VANA. Immediately transfer ALL requests to the orchestrator.",
    tools=[],  # No tools needed
)

# Router agent - determines workflow
router_agent = Agent(
    name="router",
    model="gemini-2.0-flash",
    output_schema=RoutingDecision,
    output_key="routing",
    instruction="""Analyze the user request and determine:
    1. If it needs a single specialist, multiple specialists, or iterative refinement
    2. Which specialist(s) are needed
    3. Security criticality
    
    Output a routing decision with your reasoning."""
)

# Main orchestrator
vana_orchestrator = SequentialAgent(
    name="vana_orchestrator",
    sub_agents=[
        router_agent,
        # Dynamic routing handled by callbacks
    ]
)
```

### Phase 3: Specialist Conversion (Day 6-10)

Convert each specialist to ADK native with exactly 6 tools:

```python
# agents/specialists/security.py
from google.adk.agents import Agent
from lib.models import SecurityScanResult
from lib.tools.security import (
    comprehensive_scan,
    check_vulnerabilities, 
    analyze_authentication,
    scan_dependencies,
    check_encryption,
    generate_report
)

security_specialist = Agent(
    name="security_specialist",
    model="gemini-2.0-flash",
    output_schema=SecurityScanResult,
    output_key="security_result",
    tools=[
        comprehensive_scan,
        check_vulnerabilities,
        analyze_authentication,
        scan_dependencies,
        check_encryption,
        generate_report
    ],
    instruction="""You are a security specialist. Analyze code and systems for vulnerabilities.
    Always use comprehensive_scan first, then specific tools as needed.
    Provide clear risk assessments and remediation steps."""
)
```

### Phase 4: Workflow Agents (Day 11-12)

Create workflow patterns:

```python
# agents/workflows/patterns.py
from google.adk.agents import ParallelAgent, LoopAgent

def create_parallel_specialists(specialists: List[str]):
    """Create parallel execution for multiple specialists"""
    agents = [get_specialist(name) for name in specialists]
    return ParallelAgent(
        name="parallel_execution",
        sub_agents=agents
    )

def create_refinement_loop(specialist_name: str):
    """Create iterative refinement loop"""
    specialist = get_specialist(specialist_name)
    reviewer = Agent(
        name="reviewer",
        model="gemini-2.0-flash",
        tools=[exit_loop_tool],
        instruction="Review the output and decide if it needs improvement."
    )
    
    return LoopAgent(
        name="refinement_loop",
        max_iterations=3,
        sub_agents=[specialist, reviewer]
    )
```

### Phase 5: Tool Consolidation (Day 13-15)

Merge tools to respect 6-tool limit:

```python
# lib/tools/consolidated.py
def comprehensive_file_operation(
    operation: str,
    path: str,
    content: Optional[str] = None,
    pattern: Optional[str] = None
) -> dict:
    """Consolidated file operations: read, write, search, list"""
    operations = {
        "read": lambda: read_file(path),
        "write": lambda: write_file(path, content),
        "search": lambda: search_files(path, pattern),
        "list": lambda: list_directory(path)
    }
    
    if operation not in operations:
        return {"error": f"Unknown operation: {operation}"}
    
    return operations[operation]()
```

### Phase 6: Session Management (Day 16-17)

Simple ADK session implementation:

```python
# lib/sessions/vana_sessions.py
from google.adk.sessions import InMemorySessionService
import json
import os

class VanaSessionService(InMemorySessionService):
    """Extended session service with persistence"""
    
    def __init__(self, persist_dir="./sessions"):
        super().__init__()
        self.persist_dir = persist_dir
        os.makedirs(persist_dir, exist_ok=True)
    
    def save_session(self, session_id: str):
        """Persist session to disk"""
        session = self.get_session(session_id)
        if session:
            path = os.path.join(self.persist_dir, f"{session_id}.json")
            with open(path, 'w') as f:
                json.dump(session.state, f)
```

### Phase 7: Dynamic Routing (Day 18-19)

Implement dynamic agent selection:

```python
# lib/routing/dynamic.py
from google.adk.agents import Agent
from google.adk.tools.agent_tool import AgentTool

class DynamicRouter:
    def __init__(self):
        self.specialists = {
            "security": security_specialist,
            "architecture": architecture_specialist,
            "data_science": data_science_specialist,
            # ... all specialists
        }
    
    def create_orchestrator_with_routing(self):
        """Create orchestrator with dynamic routing callback"""
        
        def after_router_callback(agent, messages, tool_context, response):
            # Get routing decision from state
            routing = tool_context.state.get("routing")
            
            if routing["target"] == "specialist":
                # Single specialist
                specialist = self.specialists[routing["specialist_name"]]
                tool_context.next_agent = specialist
                
            elif routing["workflow_type"] == "parallel":
                # Multiple specialists in parallel
                parallel = create_parallel_specialists(routing["specialists_needed"])
                tool_context.next_agent = parallel
                
            return response
        
        router_agent.after_model_callback = after_router_callback
        return router_agent
```

### Phase 8: Simplified API (Day 20)

New FastAPI integration:

```python
# main.py
from fastapi import FastAPI
from google.adk.runners import Runner
from lib.models import VanaRequest, VanaResponse

app = FastAPI()

# Initialize
runner = Runner(
    agent=vana_orchestrator,
    session_service=VanaSessionService()
)

@app.post("/chat")
async def chat(request: VanaRequest) -> VanaResponse:
    # Get or create session
    session_id = request.session_id or str(uuid.uuid4())
    session = runner.session_service.get_session(session_id)
    
    if not session:
        session = runner.session_service.create_session(
            app_name="VANA",
            user_id=request.user_id,
            session_id=session_id,
            state={}
        )
    
    # Run query
    result = await runner.run_async(
        query=request.query,
        session=session
    )
    
    # Extract response
    routing = result.state.get("routing", {})
    specialist_results = {
        k: v for k, v in result.state.items() 
        if k.endswith("_result")
    }
    
    return VanaResponse(
        answer=result.answer,
        session_id=session_id,
        routing=routing,
        specialist_results=specialist_results
    )
```

### Phase 9: Delete Old Code (Day 21)

Remove all legacy code:
- Delete `enhanced_orchestrator.py` and `enhanced_orchestrator_v2.py`
- Delete custom routing logic
- Delete `OrchestratorMetrics` class
- Delete complex state management
- Delete workflow managers (replaced by ADK native)
- Clean up unused imports and dependencies

### Phase 10: Testing & Documentation (Day 22-25)

Write fresh tests for new architecture:

```python
# tests/test_adk_native.py
def test_single_specialist():
    result = runner.run("Analyze my code architecture")
    assert result.state["routing"]["specialist_name"] == "architecture"
    assert "architecture_result" in result.state

def test_parallel_execution():
    result = runner.run("Check security and write tests")
    assert result.state["routing"]["workflow_type"] == "parallel"
    assert "security_result" in result.state
    assert "qa_result" in result.state

def test_tool_limits():
    for name, agent in all_specialists.items():
        assert len(agent.tools) <= 6, f"{name} has too many tools"
```

## File Structure (Final)

```
agents/
  vana/
    __init__.py
    orchestrator.py (new ADK native)
  specialists/
    __init__.py
    security.py (6 tools max)
    architecture.py (6 tools max)
    data_science.py (6 tools max)
    devops.py (6 tools max)
    qa.py (6 tools max)
    ui_ux.py (6 tools max)
    content.py (6 tools max)
    research.py (6 tools max)
  workflows/
    __init__.py
    patterns.py (workflow creators)

lib/
  models/
    __init__.py
    base.py (core models)
    [specialist models]
  tools/
    __init__.py
    consolidated.py (merged tools)
    [specialist tools - max 6 each]
  routing/
    __init__.py
    dynamic.py
  sessions/
    __init__.py
    vana_sessions.py

main.py (simplified API)
```

## Benefits of Direct Migration

1. **Cleaner Codebase**: No legacy compatibility code
2. **Better Performance**: Native ADK optimizations
3. **Simpler Testing**: One system to test
4. **Faster Development**: No feature flags or gradual rollout
5. **Full ADK Features**: Leverage all capabilities immediately

## Quick Implementation Checklist

- [ ] Day 1-2: Create all Pydantic models
- [ ] Day 3-5: Build new orchestrator with router
- [ ] Day 6-10: Convert all specialists (one per day)
- [ ] Day 11-12: Implement workflow patterns
- [ ] Day 13-15: Consolidate tools to 6 per specialist
- [ ] Day 16-17: Set up session management
- [ ] Day 18-19: Dynamic routing system
- [ ] Day 20: New API endpoints
- [ ] Day 21: Delete all old code
- [ ] Day 22-25: Testing and documentation

Total time: ~25 days for complete migration