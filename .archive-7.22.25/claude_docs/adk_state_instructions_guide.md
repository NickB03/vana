# ADK Agent State Instructions - Complete Guide

## Overview

ADK provides powerful templating capabilities in agent instructions that allow agents to dynamically access state variables. This enables context-aware behavior without requiring tools or callbacks.

## State Variable Syntax

### Basic Syntax
- `{var}` - Insert the value of state variable named `var`
- `{var?}` - Optional variable (won't error if missing)
- `{artifact.var}` - Access text content of artifact named `var`

### Key Rules
1. Variables are replaced at runtime with actual state values
2. Missing required variables cause errors
3. Optional variables (`{var?}`) return empty string if missing
4. Works with any state key including prefixed ones

## State Variable Examples

### 1. Simple State Access
```python
agent = LlmAgent(
    name="greeting_agent",
    model="gemini-2.0-flash",
    instruction="""You are a personalized assistant.
    
    User's name: {user:name?}
    User's preferences: {user:preferences?}
    Current task: {current_task?}
    
    Greet the user by name if known, otherwise ask for their name."""
)
```

### 2. Dynamic Context Injection
```python
context_aware_agent = LlmAgent(
    name="context_agent",
    model="gemini-2.0-flash",
    instruction="""You are helping with: {task_type}
    
    Previous context: {conversation_context?}
    User goals: {user:goals?}
    
    Provide assistance based on the task type and user's goals."""
)
```

### 3. Workflow State Passing
```python
# First agent sets output_key
analyzer = LlmAgent(
    name="analyzer",
    instruction="Analyze this data and summarize findings...",
    output_key="analysis_results"  # Saves to state['analysis_results']
)

# Second agent reads from state
reviewer = LlmAgent(
    name="reviewer",
    instruction="""Review the following analysis:
    
    {analysis_results}
    
    Provide your assessment and recommendations."""
)
```

### 4. Multi-Variable Templates
```python
search_agent = LlmAgent(
    name="search_agent",
    instruction="""You are searching for: {search_query}
    
    Search constraints:
    - Category: {search_category?}
    - Max results: {max_results?}
    - User location: {user:location?}
    
    Previous searches: {user:search_history?}
    
    Use these constraints to refine your search."""
)
```

## Implementation in VANA

### Current Memory-Aware Simple Search Agent
```python
# Better approach using state variables
def create_memory_aware_simple_search_agent() -> LlmAgent:
    return LlmAgent(
        name="simple_search_agent",
        model="gemini-2.0-flash",
        description="Simple search agent with memory awareness",
        instruction="""You are a simple search assistant with memory awareness.

KNOWN USER INFORMATION:
- Name: {user:name?}
- Preferences: {user:preferences?}
- Goals: {user:goals?}
- Location: {user:location?}
- Context: {temp:user_context?}

When someone asks about information you might know (like their name), 
check the above information first. If the information is present, 
use it in your response.

Your tools:
1. google_search - For web searches and current information
2. check_user_context - For detailed memory checking if needed

Keep responses brief and factual.""",
        tools=[google_search, check_user_context],
        before_agent_callback=memory_context_injection_callback,
        after_agent_callback=memory_detection_callback
    )
```

### Enhanced Orchestrator with Context
```python
def create_memory_orchestrator() -> LlmAgent:
    return LlmAgent(
        name="vana_memory_orchestrator",
        model="gemini-2.5-flash",
        description="Main orchestrator with full memory awareness",
        instruction="""You are VANA's intelligent orchestrator.

USER CONTEXT:
- Name: {user:name?}
- Previous queries: {user:query_history?}
- Preferences: {user:preferences?}
- Current session: {session_id?}

TASK CONTEXT:
- Current task: {current_task?}
- Previous result: {last_agent_result?}

Route queries to the appropriate specialist based on context and history.""",
        sub_agents=[...],
        before_agent_callback=memory_context_injection_callback,
        after_agent_callback=memory_detection_callback
    )
```

## Best Practices

### 1. Use Optional Variables for User Data
```python
# Good - Won't crash if user data missing
instruction = "Hello {user:name?}, how can I help you today?"

# Bad - Will error if name not set
instruction = "Hello {user:name}, how can I help you today?"
```

### 2. Combine with Tools for Flexibility
```python
# State variables for immediate context
instruction = """Current user: {user:name?}
Last query: {last_query?}

Use check_user_context tool for detailed memory if needed."""
```

### 3. Document Expected State
```python
# Clear documentation of required state
instruction = """Process the document: {document_id}
Analysis type: {analysis_type}

Required state:
- document_id: ID of document to process
- analysis_type: One of 'summary', 'sentiment', 'extract'"""
```

### 4. Use Prefixes Consistently
```python
# User-specific (persists across sessions)
"{user:name?}", "{user:preferences?}"

# Session-specific
"{current_task?}", "{conversation_id?}"

# Temporary (never persisted)
"{temp:scratch_data?}", "{temp:last_result?}"

# App-wide
"{app:api_endpoint?}", "{app:model_version?}"
```

## Advanced Patterns

### 1. Conditional Instructions
```python
instruction = """You are a helpful assistant.

{user:vip_status?}

Provide detailed responses with examples and citations."""
# If user:vip_status exists, it appears in instruction
```

### 2. Dynamic Personality
```python
instruction = """You are a {user:preferred_tone?} assistant.
Communication style: {user:communication_style?}

Adjust your responses accordingly."""
```

### 3. Multi-Step Context
```python
# Step 1 agent
step1 = LlmAgent(
    instruction="Analyze the input...",
    output_key="step1_result"
)

# Step 2 agent sees step 1 result
step2 = LlmAgent(
    instruction="""Previous analysis: {step1_result}
    
    Build upon this analysis..."""
)
```

## Implementation Recommendations for VANA

1. **Update All Agents**: Add state variable templates to all agent instructions
2. **Document State Schema**: Create a clear schema of expected state keys
3. **Gradual Migration**: Start with simple agents, test thoroughly
4. **Combine Approaches**: Use state variables + tools + callbacks for maximum flexibility

## State Variable vs Tool Access

| Approach | Pros | Cons | Use When |
|----------|------|------|----------|
| State Variables `{var}` | Immediate access, no tool calls, efficient | Read-only, must exist in state | Known state keys, display purposes |
| Memory Tools | Can compute/search, flexible logic | Requires tool call, slower | Complex queries, conditional logic |
| Callbacks | Full read/write, lifecycle hooks | Invisible to user, complex setup | Automatic detection/injection |

## Summary

ADK's state variable templating in instructions provides:
- ✅ Direct state access without tools
- ✅ Dynamic instruction customization
- ✅ Clean syntax with `{var}` and `{var?}`
- ✅ Support for all state prefixes (user:, app:, temp:)
- ✅ Error handling with optional variables

This is the most efficient way for agents to access known state values and should be used alongside tools and callbacks for a complete memory system.