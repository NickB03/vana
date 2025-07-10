# VANA Agentic AI Developer Guide

**Version**: 1.0  
**Phase**: 1 Complete  
**Updated**: July 10, 2025

## Overview

This guide provides comprehensive information for developers working with VANA's agentic AI system. Learn how to understand the hierarchical architecture, add new agents, implement tools, and contribute to the system's evolution.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Understanding Agent Hierarchy](#understanding-agent-hierarchy)
3. [Working with Agents](#working-with-agents)
4. [Tool Development](#tool-development)
5. [Testing Agents](#testing-agents)
6. [Phase Roadmap](#phase-roadmap)

## Architecture Overview

VANA implements a 5-level hierarchical agent system following Google ADK best practices:

```
User → VANA Chat → Master Orchestrator → Specialists → Tools
                                      ↓
                           Project Managers (Phase 3)
                                      ↓
                           Maintenance Agents (Phase 4)
```

### Key Principles

1. **Separation of Concerns**: Each agent has a specific role and limited tools
2. **Tool Distribution**: Maximum 6 tools per agent (ADK best practice)
3. **Hierarchical Routing**: Tasks flow down based on complexity
4. **Fault Tolerance**: Circuit breakers prevent cascading failures

## Understanding Agent Hierarchy

### Level 1: VANA Chat Agent

**File**: `agents/vana/team_agentic.py`

```python
vana_chat_agent = LlmAgent(
    name="VANA_Chat",
    model="gemini-2.0-flash",
    tools=[
        adk_transfer_to_agent,  # Delegate to orchestrator
        adk_analyze_task,       # Basic task understanding
    ],
    sub_agents=[master_orchestrator]
)
```

**Purpose**: User interface, conversation management  
**Key Responsibility**: Determine if task needs technical expertise

### Level 2: Master Orchestrator

**File**: `agents/orchestration/hierarchical_task_manager.py`

```python
task_orchestrator = LlmAgent(
    name="HierarchicalTaskManager",
    tools=[
        FunctionTool(analyze_task_complexity),
        FunctionTool(route_to_specialist),
        FunctionTool(coordinate_workflow),
        FunctionTool(decompose_enterprise_task),
        adk_transfer_to_agent,
    ]
)
```

**Complexity Analysis**:
- **SIMPLE**: Single specialist can handle
- **MODERATE**: Multiple specialists needed
- **COMPLEX**: Full workflow required
- **ENTERPRISE**: Hierarchical decomposition

### Level 4: Specialist Agents

Each specialist has domain-specific tools:

```python
# Example: Architecture Specialist
architecture_specialist = LlmAgent(
    name="architecture_specialist",
    model="gemini-2.0-flash",
    tools=[
        FunctionTool(analyze_system_architecture),
        FunctionTool(evaluate_design_patterns),
        adk_vector_search,
        adk_search_knowledge,
        adk_read_file,
        adk_list_directory,
    ]  # 6 tools max
)
```

## Working with Agents

### Adding a New Specialist Agent

1. **Create Agent File**:
```python
# agents/specialists/new_specialist.py
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

def specialist_tool(context: str) -> str:
    """Domain-specific functionality."""
    return f"Processed: {context}"

new_specialist = LlmAgent(
    name="new_specialist",
    model="gemini-2.0-flash",
    description="Expert in [domain]",
    instruction="You are an expert...",
    tools=[
        FunctionTool(specialist_tool),
        # Add up to 6 tools
    ]
)
```

2. **Register with Orchestrator**:
```python
# In agents/vana/team_agentic.py
from agents.specialists.new_specialist import new_specialist

master_orchestrator.sub_agents.append(new_specialist)
```

3. **Update Routing Logic**:
```python
# In agents/orchestration/hierarchical_task_manager.py
specialist_functions["new_domain"] = analyze_new_domain
```

### Agent Communication Patterns

#### Pattern 1: LLM Transfer (Preferred)
```python
# Agent decides to delegate
transfer_to_agent(agent_name="specialist_name")
```

#### Pattern 2: Direct Tool Call
```python
# Wrap agent as tool
from google.adk.tools import agent_tool
tools=[agent_tool.AgentTool(agent=specialist)]
```

#### Pattern 3: State Propagation
```python
# Use output_key for automatic state saving
agent = LlmAgent(
    name="agent",
    output_key="result_key",  # Saves to session.state
)
```

## Tool Development

### Creating ADK-Compatible Tools

1. **Basic Function Tool**:
```python
from google.adk.tools import FunctionTool

def my_tool(param1: str, param2: int = 10) -> str:
    """Tool description for LLM."""
    return f"Processed {param1} with {param2}"

adk_my_tool = FunctionTool(my_tool)
```

2. **Async Tool**:
```python
async def async_tool(query: str) -> str:
    """Async tool for I/O operations."""
    result = await external_api_call(query)
    return result

adk_async_tool = FunctionTool(async_tool)
```

3. **Tool with Context**:
```python
def context_aware_tool(data: str, tool_context=None) -> str:
    """Access session state via tool_context."""
    if tool_context:
        session_data = tool_context.session.state.get("key")
    return process_with_context(data, session_data)
```

### Tool Best Practices

1. **Clear Descriptions**: Help LLM understand when to use
2. **Type Hints**: Enable proper parameter inference
3. **Error Handling**: Return helpful error messages
4. **Idempotency**: Tools should be safe to retry

## Testing Agents

### Unit Testing Agents

```python
# tests/agents/test_specialist.py
import pytest
from agents.specialists.my_specialist import my_specialist

@pytest.mark.asyncio
async def test_specialist_routing():
    """Test specialist handles appropriate tasks."""
    context = create_test_context()
    result = await my_specialist.run_async(context)
    assert result.success
    assert "expected_output" in result.content
```

### Integration Testing

```python
# tests/integration/test_routing.py
def test_orchestrator_routing():
    """Test task routing to correct specialist."""
    task = "Design a microservices architecture"
    routing_decision = orchestrator.analyze_task(task)
    assert routing_decision.specialist == "architecture_specialist"
    assert routing_decision.complexity == "SIMPLE"
```

### Testing Checklist

- [ ] Agent responds to appropriate queries
- [ ] Tools execute correctly
- [ ] Error handling works
- [ ] Circuit breakers activate on failure
- [ ] State propagation functions

## Phase Roadmap

### Phase 1: Foundation ✅
- Activate dormant specialists
- Implement hierarchical routing
- Basic task complexity analysis

### Phase 2: Tool Redistribution (Next)
- Move tools from VANA to specialists
- Create tool registry
- Implement tool versioning

### Phase 3: Workflow Management
- Add Sequential/Parallel/Loop agents
- Complex task orchestration
- Multi-agent collaboration

### Phase 4: Maintenance Agents
- Memory Agent for context persistence
- Planning Agent for task breakdown
- Learning Agent for optimization

### Phase 5: Advanced Features
- A/B testing framework
- Performance optimization
- Real-time collaboration view

## Development Workflow

### 1. Run Agentic Backend
```bash
python main_agentic.py
```

### 2. Test Your Changes
```bash
# Test routing
python test_routing.py

# Run agent tests
poetry run pytest -m agent
```

### 3. Monitor Logs
```bash
tail -f logs/vana.log | grep -E "(VANA_Chat|HierarchicalTaskManager|specialist)"
```

### 4. Debug Agent Communication
Look for these log patterns:
- `transfer_to_agent` calls
- `Task routed to [specialist]`
- `Circuit breaker state`

## Common Issues

### Issue: Agent Not Responding
**Solution**: Check agent registration in orchestrator

### Issue: Tool Not Found
**Solution**: Ensure tool is in agent's tool list (max 6)

### Issue: Routing Fails
**Solution**: Verify complexity analysis patterns match

### Issue: Circuit Breaker Open
**Solution**: Check failure threshold, wait for timeout

## Best Practices

1. **Keep Agents Focused**: Single responsibility principle
2. **Limit Tools**: 4-6 tools per agent maximum
3. **Clear Instructions**: Help LLM understand agent's role
4. **Test Routing**: Ensure tasks go to correct specialist
5. **Monitor Performance**: Track response times and success rates

## Contributing

1. Follow ADK patterns strictly
2. Add tests for new agents/tools
3. Update routing logic in orchestrator
4. Document in this guide
5. Submit PR with clear description

## Resources

- [Google ADK Documentation](https://github.com/google/adk)
- [VANA Architecture](./ARCHITECTURE.md)
- [Development Plan](.development/analysis/VANA_AGENTIC_AI_DEVELOPMENT_PLAN.md)
- [Phase 1 Report](.development/analysis/PHASE_1_IMPLEMENTATION_REPORT.md)

---

*Building the future of agentic AI, one specialist at a time.*