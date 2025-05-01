# Agent Orchestration Model

This document provides an overview of the agent orchestration model implemented in the VANA project.

## Table of Contents

1. [Overview](#overview)
2. [Components](#components)
3. [Task Routing](#task-routing)
4. [Context Passing](#context-passing)
5. [Result Synthesis](#result-synthesis)
6. [Integration](#integration)
7. [Testing](#testing)

## Overview

The VANA project implements a lead agent architecture with Vana as the orchestrator for all operations. This architecture provides several benefits:

- **Centralized Control**: Vana acts as the central point of control for all operations
- **Specialized Capabilities**: Specialist agents provide specialized capabilities
- **Efficient Task Delegation**: Tasks are automatically routed to the most appropriate agent
- **Context Sharing**: Context is shared between agents for consistent conversation state
- **Result Synthesis**: Results from multiple agents are combined for comprehensive responses

## Components

The agent orchestration model consists of the following components:

### Task Router

The `TaskRouter` class is responsible for routing tasks to the appropriate agent based on the task description. It uses a keyword-based approach to determine which agent is best suited for a task.

```python
from vana.orchestration.task_router import TaskRouter

# Create a task router
task_router = TaskRouter()

# Route a task
agent_id, confidence = task_router.route_task("Design a new agent architecture")
```

### Context Manager

The `ContextManager` class is responsible for managing context objects that are passed between agents. It provides methods for creating, serializing, deserializing, and persisting context objects.

```python
from vana.context.context_manager import ContextManager

# Create a context manager
context_manager = ContextManager()

# Create a context
context = context_manager.create_context("user123", "session456")

# Add data to the context
context.add_data("key", "value")

# Serialize the context
serialized = context.serialize()

# Deserialize the context
deserialized = context_manager.deserialize(serialized)

# Save the context
context_manager.save_context(context)

# Load the context
loaded = context_manager.load_context(context.id)
```

### Result Synthesizer

The `ResultSynthesizer` class is responsible for combining outputs from multiple agents into a single, coherent response. It provides methods for ranking, formatting, and synthesizing results.

```python
from vana.orchestration.result_synthesizer import ResultSynthesizer

# Create a result synthesizer
result_synthesizer = ResultSynthesizer()

# Synthesize results
results = [
    {"agent": "rhea", "content": "Architecture design...", "confidence": 0.9},
    {"agent": "max", "content": "UI considerations...", "confidence": 0.8}
]

synthesized = result_synthesizer.synthesize(results)
formatted = result_synthesizer.format(synthesized)
```

## Task Routing

The task routing system uses a keyword-based approach to determine which agent is best suited for a task. Each agent has a list of keywords that are associated with its specialty, and the task router calculates a score for each agent based on the presence of these keywords in the task description.

### Agent Specialties

- **Rhea (Meta-Architect)**: Architecture, design, structure, framework, pattern, etc.
- **Max (Interaction Engineer)**: Interface, UI, UX, user experience, user interface, etc.
- **Sage (Platform Automator)**: Automation, CI, CD, pipeline, workflow, build, deploy, etc.
- **Kai (Edge Case Hunter)**: Edge case, error, exception, bug, issue, problem, etc.
- **Juno (Test Specialist)**: Test, testing, unit test, integration test, system test, etc.

### Routing Algorithm

1. Normalize the task description (convert to lowercase)
2. Calculate a score for each agent based on keyword matches
3. Return the agent with the highest score

### Example

```
Task: "Design a new agent architecture for the VANA project"

Scores:
- Rhea: 0.85 (matches: architecture, design)
- Max: 0.20 (matches: design)
- Sage: 0.10 (no direct matches)
- Kai: 0.05 (no direct matches)
- Juno: 0.05 (no direct matches)

Result: Task routed to Rhea with confidence 0.85
```

## Context Passing

The context passing framework provides a way to share information between agents during a conversation. It consists of the following components:

### Context Object

The `Context` class represents a context object that can be passed between agents. It contains the following information:

- **ID**: Unique identifier for the context
- **User ID**: Identifier for the user
- **Session ID**: Identifier for the session
- **Created At**: Timestamp when the context was created
- **Updated At**: Timestamp when the context was last updated
- **Data**: Dictionary of key-value pairs

### Context Manager

The `ContextManager` class is responsible for managing context objects. It provides the following functionality:

- **Create Context**: Create a new context object
- **Get Context**: Get a context object by ID
- **Save Context**: Save a context object to the database
- **Load Context**: Load a context object from the database
- **Delete Context**: Delete a context object from the database
- **List Contexts**: List context objects from the database
- **Clear Cache**: Clear the context cache
- **Deserialize**: Deserialize a context object from a dictionary

### Context Persistence

Context objects are persisted in an SQLite database to ensure they are available across sessions. The database schema includes the following fields:

- **id**: Unique identifier for the context
- **user_id**: Identifier for the user
- **session_id**: Identifier for the session
- **created_at**: Timestamp when the context was created
- **updated_at**: Timestamp when the context was last updated
- **data**: JSON-encoded data

## Result Synthesis

The result synthesis system combines outputs from multiple agents into a single, coherent response. It consists of the following components:

### Result Ranking

The `rank` method ranks results by confidence, with higher confidence results appearing first.

### Result Combining

The `_combine_content` method combines content from ranked results, with higher confidence results having more influence on the final output.

### Source Extraction

The `_extract_sources` method extracts sources from ranked results, ensuring that sources are properly attributed in the final output.

### Result Formatting

The `format` method formats the synthesized result for presentation, including adding source attributions.

## Integration

The agent orchestration model is integrated with the VANA project in the following ways:

### VanaAgent Integration

The `VanaAgent` class has been updated to use the orchestration components:

```python
class VanaAgent(agent_lib.LlmAgent):
    def __init__(self):
        super().__init__()
        
        # Initialize orchestration components
        self.task_router = TaskRouter()
        self.result_synthesizer = ResultSynthesizer()
        self.context_manager = ContextManager()
        
        # Initialize agent state
        self.current_context = None
    
    def determine_agent(self, task: str) -> str:
        agent_id, confidence = self.task_router.route_task(task)
        return agent_id
    
    def create_context(self, user_id: str, session_id: str) -> Dict[str, Any]:
        self.current_context = self.context_manager.create_context(user_id, session_id)
        return self.current_context.serialize()
    
    def synthesize_results(self, results: List[Dict[str, Any]]) -> str:
        synthesized = self.result_synthesizer.synthesize(results)
        return self.result_synthesizer.format(synthesized)
```

### AgentTeam Integration

The `AgentTeam` class has been updated to use the orchestration components:

```python
class AgentTeam:
    def __init__(self):
        # Initialize orchestration components
        self.task_router = TaskRouter()
        self.result_synthesizer = ResultSynthesizer()
        self.context_manager = ContextManager()
        
        # Initialize agents
        self._initialize_agents()
        
        # Initialize agent state
        self.current_context = None
    
    def route_task(self, task: str) -> str:
        agent_id, confidence = self.task_router.route_task(task)
        return agent_id
    
    def get_agent(self, agent_id: str) -> Optional[Agent]:
        return self.agents.get(agent_id)
    
    def create_context(self, user_id: str, session_id: str) -> Dict[str, Any]:
        self.current_context = self.context_manager.create_context(user_id, session_id)
        return self.current_context.serialize()
    
    def synthesize_results(self, results: List[Dict[str, Any]]) -> str:
        synthesized = self.result_synthesizer.synthesize(results)
        return self.result_synthesizer.format(synthesized)
    
    def delegate_task(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        # Route task to appropriate agent
        agent_id = self.route_task(task)
        agent = self.get_agent(agent_id)
        
        # Execute task
        response = agent.generate_content(task)
        
        # Format result
        result = {
            "agent": agent_id,
            "content": response.text,
            "confidence": 0.9
        }
        
        return result
```

## Testing

The agent orchestration model can be tested using the provided scripts:

### Test Agent Orchestration

The `test_agent_orchestration.py` script tests the agent orchestration model:

```bash
python scripts/test_agent_orchestration.py
```

This script tests:

- Task routing to the appropriate agent
- Context passing between agents
- Result synthesis from multiple agents

### Test Tasks

The script tests the following tasks:

1. "What is the architecture of the VANA project?" (should be routed to Rhea)
2. "How should we design the user interface?" (should be routed to Max)
3. "How can we automate the deployment process?" (should be routed to Sage)
4. "What edge cases should we consider for error handling?" (should be routed to Kai)
5. "Can you test the memory system?" (should be routed to Juno)

### Test Results

The script outputs the test results, including:

- Number of tests passed, failed, and with errors
- For each test, the expected agent, actual agent, and result
- The test results are also saved to a JSON file for further analysis
