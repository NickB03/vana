# VANA-Specific ADK Patterns

This directory contains patterns and conventions specific to the VANA project that build upon the ADK examples.

## Pattern Categories

### 1. Agent Architecture
- Hierarchical orchestration pattern
- Specialist agent structure
- Tool organization

### 2. State Management
- Session initialization
- Cross-agent state sharing
- Metrics collection

### 3. Integration Patterns
- FastAPI integration
- Streaming responses
- Error handling

## Files in This Directory

### orchestrator_pattern.py
Shows VANA's enhanced orchestrator pattern with:
- Task analysis and routing
- Specialist delegation
- Caching and metrics
- Parallel execution support

### specialist_pattern.py
Template for creating VANA specialist agents:
- Focused responsibility
- Tool integration
- State access patterns
- Result formatting

### state_management.py
VANA's state management approach:
- Session service integration
- State initialization
- Callback patterns
- Persistence strategies

### streaming_pattern.py
Real-time response streaming:
- SSE implementation
- Event formatting
- Progress tracking
- Error handling

## Usage Guidelines

### Creating New Specialists

1. Start with `specialist_pattern.py` as template
2. Define clear, focused responsibility
3. Implement required tools
4. Follow VANA naming conventions

### Implementing Workflows

1. Use ADK workflow agents (Sequential, Loop, Parallel)
2. Implement state passing with `output_key`
3. Add proper error handling
4. Include validation loops

### State Management

1. Initialize state in session creation
2. Use callbacks for state updates
3. Share state across agents via context
4. Implement cleanup on session end

## Integration with ADK Examples

These patterns build upon the ADK examples:

- **Base**: 8-stateful-multi-agent for session patterns
- **Enhance**: 10-sequential-agent for workflow management
- **Extend**: 11-parallel-agent for concurrent execution
- **Refine**: 12-loop-agent for quality control

## Best Practices

1. **Separation of Concerns**: Each agent has one clear purpose
2. **State Immutability**: Don't modify state directly in agents
3. **Error Recovery**: Always have fallback responses
4. **Performance**: Use caching for repeated operations
5. **Observability**: Add metrics and logging

## Example Integration

```python
from google.adk.agents import LlmAgent
from vana_patterns import orchestrator_pattern, specialist_pattern

# Create orchestrator
orchestrator = orchestrator_pattern.create_orchestrator(
    specialists=[
        specialist_pattern.create_specialist("security"),
        specialist_pattern.create_specialist("architecture"),
        specialist_pattern.create_specialist("data_science"),
    ]
)

# Run with state management
result = orchestrator.run_with_state(
    request="Analyze this codebase for vulnerabilities",
    session_id="session_123"
)
```