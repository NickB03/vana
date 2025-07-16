# VANA ADK Native Migration - Master Plan

## Overview

This document coordinates the migration of VANA to native Google ADK patterns. The migration is structured as 12 concurrent phases that can be implemented by multiple Claude Code AI agents working in parallel GitHub branches.

## Migration Strategy

- **Approach**: Complete rewrite using ADK native patterns
- **Timeline**: 2-3 days with concurrent execution
- **Agents Required**: Up to 12 (one per phase)
- **Coordination**: GitHub branches with structured merging

## Dependency Graph

```
┌─────────────────┐     ┌─────────────────┐
│  Phase 1: Models│     │  Phase 2: Tools │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐    ┌──────────▼────────┐
│ Phases 3-10:   │    │ (8 Specialists    │
│ Specialists    │    │  in parallel)     │
└───────┬────────┘    └──────────┬────────┘
        │                         │
        └────────────┬────────────┘
                     │
              ┌──────▼──────┐
              │  Phase 11:  │
              │Orchestration│
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │  Phase 12:  │
              │ Integration │
              └─────────────┘
```

## Phase Assignments

| Phase | Component | Branch Name | Dependencies | Est. Time |
|-------|-----------|-------------|--------------|-----------|
| 1 | Pydantic Models | `adk-models` | None | 4 hours |
| 2 | Tool Consolidation | `adk-tools` | None | 6 hours |
| 3 | Security Specialist | `adk-security` | Phase 1, 2 | 4 hours |
| 4 | Architecture Specialist | `adk-architecture` | Phase 1, 2 | 4 hours |
| 5 | Data Science Specialist | `adk-datascience` | Phase 1, 2 | 4 hours |
| 6 | DevOps Specialist | `adk-devops` | Phase 1, 2 | 4 hours |
| 7 | QA Specialist | `adk-qa` | Phase 1, 2 | 4 hours |
| 8 | UI/UX Specialist | `adk-uiux` | Phase 1, 2 | 4 hours |
| 9 | Content Creation Specialist | `adk-content` | Phase 1, 2 | 4 hours |
| 10 | Research Specialist | `adk-research` | Phase 1, 2 | 4 hours |
| 11 | Orchestration & Workflows | `adk-orchestration` | Phase 3-10 (≥2) | 6 hours |
| 12 | API & Session Integration | `adk-integration` | Phase 11 | 4 hours |

## Coordination Protocol

### 1. Branch Creation
```bash
# Each agent creates their branch from main
git checkout -b adk-[component]
```

### 2. Progress Tracking
- Create PR immediately with checklist
- Update PR description with progress
- Mark PR ready when phase complete

### 3. Integration Points
- Models: Export all from `lib/models/__init__.py`
- Tools: Register in `lib/tools/registry.py`
- Specialists: Export from `agents/specialists/__init__.py`
- Tests: Add to `tests/[component]/`

### 4. Merge Strategy
```bash
# Phases 1-2 merge to main first
# Phases 3-10 merge after 1-2 complete
# Phase 11 merges after at least 2 specialists
# Phase 12 merges last
```

## Phase Specifications

### Phase 1: Pydantic Models
**Deliverables**:
- `lib/models/base.py` - Core models (ToolResult, RoutingDecision, SpecialistResponse)
- `lib/models/[specialist].py` - Specialist-specific models
- `lib/models/__init__.py` - Unified exports
- `tests/models/` - Model validation tests

**Acceptance Criteria**:
- All models validate correctly
- JSON serialization works
- Type hints complete
- 100% test coverage

### Phase 2: Tool Consolidation
**Deliverables**:
- `lib/tools/consolidated/` - Merged tools (6 per specialist max)
- `lib/tools/registry.py` - Tool registration system
- `docs/TOOL_MIGRATION_MAP.md` - Old→New mappings
- `tests/tools/` - Tool tests

**Acceptance Criteria**:
- No specialist has >6 tools
- All tools return dict
- Tool docstrings complete
- Migration map documented

### Phases 3-10: Specialists
**Each Specialist Deliverable**:
- `agents/specialists/[name].py` - ADK-compliant agent
- `lib/tools/[specialist]/` - 6 tools maximum
- `tests/specialists/test_[name].py` - Agent tests
- Integration with models from Phase 1

**Acceptance Criteria**:
- Has `root_agent` variable
- Uses Pydantic output_schema
- Exactly ≤6 tools
- All tests pass
- Follows ADK patterns

### Phase 11: Orchestration
**Deliverables**:
- `agents/vana/orchestrator.py` - Main orchestrator
- `agents/workflows/` - Workflow patterns
- `lib/routing/dynamic.py` - Dynamic routing
- `tests/orchestration/` - Integration tests

**Acceptance Criteria**:
- Uses SequentialAgent for main flow
- Dynamic routing via callbacks
- Supports parallel/loop workflows
- Works with ≥2 specialists

### Phase 12: Integration
**Deliverables**:
- `main.py` - Updated FastAPI app
- `lib/sessions/` - ADK session management
- `lib/api/` - Request/response handling
- `tests/integration/` - E2E tests

**Acceptance Criteria**:
- API endpoints working
- Session state persists
- Streaming responses work
- All E2E tests pass

## Validation Scripts

### ADK Compliance Checker
Create `scripts/validate_adk_compliance.py`:

```python
#!/usr/bin/env python3
import ast
import sys
from pathlib import Path
from typing import List, Tuple

def check_agent_file(filepath: Path) -> List[str]:
    """Validate an agent file meets ADK requirements."""
    errors = []
    
    with open(filepath, 'r') as f:
        content = f.read()
        tree = ast.parse(content)
    
    # Check for root_agent
    has_root_agent = any(
        isinstance(node, ast.Assign) and 
        any(target.id == 'root_agent' for target in node.targets 
            if isinstance(target, ast.Name))
        for node in ast.walk(tree)
    )
    
    if not has_root_agent:
        errors.append(f"{filepath}: Missing 'root_agent' variable")
    
    # Check tool count (basic check via Agent() calls)
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            if (isinstance(node.func, ast.Name) and node.func.id == 'Agent'):
                for keyword in node.keywords:
                    if keyword.arg == 'tools' and isinstance(keyword.value, ast.List):
                        tool_count = len(keyword.value.elts)
                        if tool_count > 6:
                            errors.append(f"{filepath}: Agent has {tool_count} tools (max 6)")
    
    return errors

def validate_project():
    """Validate entire project for ADK compliance."""
    errors = []
    
    # Check all agent files
    agent_files = Path('agents').rglob('*.py')
    for agent_file in agent_files:
        if agent_file.name not in ['__init__.py', 'test_*.py']:
            errors.extend(check_agent_file(agent_file))
    
    if errors:
        print("❌ ADK Compliance Errors Found:")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)
    else:
        print("✅ All agents are ADK compliant!")

if __name__ == "__main__":
    validate_project()
```

## Common Patterns

### Agent Structure Template
```python
from google.adk.agents import Agent
from lib.models import SpecialistResponse
from lib.tools.[specialist] import tool1, tool2, tool3, tool4, tool5, tool6

root_agent = Agent(
    name="[specialist]_specialist",
    model="gemini-2.0-flash",
    output_schema=SpecialistResponse,
    output_key="[specialist]_result",
    tools=[tool1, tool2, tool3, tool4, tool5, tool6],  # Max 6
    instruction="""You are a [specialist] specialist.
    [Specific instructions for this specialist]
    Always provide structured output with your analysis."""
)
```

### Tool Pattern Template
```python
from typing import Dict, Any
from datetime import datetime

def tool_name(param1: str, param2: int = 10) -> Dict[str, Any]:
    """
    Brief description of tool purpose.
    
    Args:
        param1: Description of param1
        param2: Description of param2
        
    Returns:
        Dictionary containing tool results
    """
    start_time = datetime.now()
    
    try:
        # Tool implementation
        result = process_something(param1, param2)
        
        execution_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return {
            "success": True,
            "result": result,
            "execution_time_ms": execution_time,
            "metadata": {
                "param1": param1,
                "param2": param2
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "execution_time_ms": (datetime.now() - start_time).total_seconds() * 1000
        }
```

## Testing Strategy

### Unit Tests (Each Phase)
```python
# tests/[component]/test_[name].py
import pytest
from agents.specialists.[name] import root_agent

def test_agent_has_root():
    assert root_agent is not None

def test_agent_tool_limit():
    assert len(root_agent.tools) <= 6

def test_agent_has_output_schema():
    assert root_agent.output_schema is not None
```

### Integration Tests (Phase 11)
```python
# tests/integration/test_orchestration.py
from google.adk.runners import Runner
from agents.vana.orchestrator import vana_orchestrator

def test_single_specialist_routing():
    runner = Runner(agent=vana_orchestrator)
    result = runner.run("Analyze code security")
    
    assert result.state["routing"]["target_specialist"] == "security"
    assert "security_result" in result.state
```

## Success Metrics

1. **All phases complete** - Each PR merged
2. **ADK compliance** - Validation script passes
3. **Test coverage** - >90% for all components
4. **Integration tests** - All passing
5. **Performance** - <1s average response time

## Getting Started

1. **Assign phases** to available agents
2. **Create branches** following naming convention
3. **Implement phase** using specifications
4. **Run validation** before marking complete
5. **Create PR** with checklist
6. **Merge** in dependency order

## Resources

- [ADK Source of Truth](./ADK_SOURCE_OF_TRUTH.md)
- [Original VANA Architecture](../VANA_AGENT_INVENTORY.md)
- [Tool Migration Mappings](./TOOL_MIGRATION_MAP.md)

---

*This master plan enables concurrent development by multiple agents while maintaining ADK compliance and integration integrity.*