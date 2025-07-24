# VANA Examples - Context Engineering Patterns

This directory follows the Context Engineering methodology to provide comprehensive patterns for AI-assisted development with VANA.

## What to Include in Examples

### Code Structure Patterns
- How agents are organized into modules
- Import conventions for ADK components
- Agent/tool/provider patterns
- State management approaches

### Testing Patterns
- Test file structure for agents
- Mocking ADK components
- Assertion styles for agent responses
- Integration test approaches

### Integration Patterns
- Multi-agent communication
- Session and state management
- Tool implementation patterns
- Provider configurations

## Example Structure

```
examples/
├── README.md                      # This file - explains all patterns
├── cli.py                         # CLI implementation patterns
├── agent/                         # Agent architecture patterns
│   ├── agent.py                   # Agent creation patterns
│   ├── tools.py                   # Tool implementation patterns
│   └── providers.py               # Multi-provider patterns
├── tests/                         # Testing patterns
│   ├── test_agent.py              # Unit test patterns
│   └── conftest.py                # Pytest configuration
├── vana-patterns/                 # VANA-specific patterns
│   ├── README.md                  # VANA patterns guide
│   ├── orchestrator_pattern.py    # Orchestrator implementation
│   └── specialist_pattern.py      # Specialist templates
└── [adk-examples]/                # Original ADK examples for reference
    ├── 2-tool-agent/              # Basic tool usage
    ├── 5-sessions-and-state/      # Session management
    ├── 6-persistent-storage/      # Persistent state
    ├── 7-multi-agent/             # Multi-agent orchestration
    ├── 8-stateful-multi-agent/    # Stateful systems
    ├── 10-sequential-agent/       # Sequential workflows
    ├── 11-parallel-agent/         # Parallel execution
    ├── 12-loop-agent/             # Iterative refinement
    └── gemini-fullstack/          # Complete application
```

## Examples Overview

### 1. Tool Agent (2-tool-agent)
**Pattern**: Basic tool implementation and usage
- Creating custom tools with FunctionTool
- Tool error handling
- Tool return types and formatting

### 2. Sessions and State (5-sessions-and-state)
**Pattern**: Session management fundamentals
- Creating and managing sessions
- State initialization
- State updates across interactions
- Session retrieval patterns

### 3. Persistent Storage (6-persistent-storage)
**Pattern**: Persistent state storage
- Database session service
- State persistence across restarts
- Memory management patterns

### 4. Multi-Agent (7-multi-agent)
**Pattern**: Basic multi-agent orchestration
- Sub-agent delegation
- Agent communication
- Result aggregation

### 5. Stateful Multi-Agent (8-stateful-multi-agent) ⭐
**Pattern**: Advanced stateful multi-agent system
- Session state sharing across agents
- Conditional routing based on state
- Interaction history tracking
- Dynamic access control

### 6. Sequential Agent (10-sequential-agent)
**Pattern**: Sequential workflow execution
- Ordered agent execution
- State passing with output_key
- Pipeline processing patterns

### 7. Parallel Agent (11-parallel-agent)
**Pattern**: Concurrent agent execution
- Parallel sub-agent invocation
- Result synthesis
- Performance optimization

### 8. Loop Agent (12-loop-agent)
**Pattern**: Iterative refinement
- Loop control with exit conditions
- Feedback-driven improvement
- Quality validation loops

### 9. Gemini Fullstack
**Pattern**: Complete research application
- Hierarchical agent structure
- Complex workflow orchestration
- Production-ready patterns

## Using These Examples

### For VANA Migration

1. **Start with**: 8-stateful-multi-agent
   - Most similar to VANA's architecture
   - Shows session management patterns
   - Demonstrates specialist routing

2. **Study workflows**: 10-sequential-agent, 12-loop-agent
   - Understand ADK workflow patterns
   - Learn state passing mechanisms
   - See quality control approaches

3. **Implement features**: Use patterns from gemini-fullstack
   - Research pipeline implementation
   - Callback-based state collection
   - Structured agent communication

### Running Examples

Each example includes its own README with:
- Setup instructions
- Required dependencies
- Example interactions
- Key concepts explained

### Integration Tips

1. **Import Patterns**:
   ```python
   from google.adk.agents import LlmAgent, SequentialAgent, LoopAgent
   from google.adk.tools import FunctionTool, google_search
   from google.adk.sessions import InMemorySessionService
   ```

2. **Agent Structure**:
   ```python
   agent = LlmAgent(
       name="agent_name",
       model="gemini-2.5-flash",
       description="Clear purpose",
       instruction="Detailed instructions",
       tools=[...],
       sub_agents=[...]
   )
   ```

3. **State Management**:
   ```python
   session_service.create_session(
       app_name="vana",
       user_id=user_id,
       session_id=session_id,
       state=initial_state
   )
   ```

## Key Patterns for VANA

### 1. Orchestrator Pattern (from 8-stateful-multi-agent)
- Root agent receives all requests
- Routes to specialists based on intent
- Maintains conversation context
- Never transfers back to caller

### 2. State Sharing (from 5-sessions-and-state)
- Initialize state with defaults
- Update state in callbacks
- Access state across agents
- Persist for continuity

### 3. Quality Loops (from 12-loop-agent)
- Generate initial response
- Validate against criteria
- Refine if needed
- Exit when quality met

### 4. Parallel Specialists (from 11-parallel-agent)
- Identify independent tasks
- Execute specialists concurrently
- Synthesize results
- Handle partial failures

## Best Practices

1. **Keep Examples Intact**: These are reference implementations
2. **Study Before Implementing**: Understand patterns first
3. **Follow ADK Conventions**: Use established patterns
4. **Test Incrementally**: Build up from simple examples

---

**Note**: All examples are original ADK implementations provided for reference and learning.