# Agent Coordination Tools

Multi-agent task delegation and coordination capabilities.

## Available Tools

### `coordinate_task`
**Status**: ✅ Fully Functional  
**Description**: Coordinate complex tasks across multiple agents

```python
# Example usage
result = await coordinate_task({
    "task": "analyze codebase",
    "agents": ["code_analysis", "documentation"],
    "priority": "high"
})
# Returns: task coordination results and status
```

**Parameters**:
- `task` (object, required): Task definition and requirements
- `agents` (array, optional): Specific agents to coordinate
- `priority` (string, optional): Task priority level

### `delegate_to_agent`
**Status**: ✅ Fully Functional  
**Description**: Delegate specific tasks to specialist agents

```python
# Example usage
result = await delegate_to_agent("code_execution", {
    "code": "print('Hello World')",
    "language": "python"
})
# Returns: agent execution results
```

**Parameters**:
- `agent_type` (string, required): Target agent identifier
- `task_data` (object, required): Task parameters and data
- `timeout` (number, optional): Maximum execution time

### `get_agent_status`
**Status**: ✅ Fully Functional  
**Description**: Monitor agent health and availability

```python
# Example usage
result = await get_agent_status("data_science")
# Returns: agent status, capabilities, and load metrics
```

**Parameters**:
- `agent_id` (string, optional): Specific agent to check
- `include_metrics` (boolean, optional): Include performance data

### `transfer_to_agent`
**Status**: ✅ Fully Functional  
**Description**: Transfer active session to another agent

```python
# Example usage
result = await transfer_to_agent("vana_orchestrator", {
    "context": "current_session_data",
    "preserve_state": true
})
# Returns: transfer confirmation and new agent details
```

**Parameters**:
- `target_agent` (string, required): Destination agent
- `transfer_data` (object, required): Context and state information
- `preserve_state` (boolean, optional): Maintain session continuity

## Agent Architecture

### Orchestration Pattern
- **VANA Orchestrator**: Central coordination hub
- **Specialist Agents**: Domain-specific capabilities
- **Proxy Agents**: Discovery and delegation pattern

### Communication Protocol
- **ADK-Compliant**: Google Agent Development Kit standards
- **Async Coordination**: Non-blocking agent communication
- **State Management**: Session continuity across transfers

## Implementation Details

**Source Location**: `lib/_tools/agent_tools.py`  
**Coordination Manager**: `lib/_shared_libraries/coordination_manager.py`  
**Task Router**: `lib/_shared_libraries/task_router.py`

## Use Cases

1. **Complex Workflows**: Multi-step tasks requiring different expertise
2. **Load Balancing**: Distribute work across available agents
3. **Specialist Consultation**: Access domain-specific knowledge
4. **Session Management**: Maintain context across agent transfers

## Best Practices

- Define clear task boundaries for delegation
- Monitor agent status before assignment
- Preserve context during transfers
- Use appropriate timeouts for long-running tasks