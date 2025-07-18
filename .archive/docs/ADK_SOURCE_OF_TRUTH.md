# ADK Source of Truth
*A comprehensive guide to Google Agent Development Kit (ADK) patterns and best practices*

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Agent Creation](#agent-creation)
3. [Tool Development](#tool-development)
4. [Multi-Agent Systems](#multi-agent-systems)
5. [State Management](#state-management)
6. [Workflow Patterns](#workflow-patterns)
7. [Advanced Features](#advanced-features)
8. [Best Practices](#best-practices)
9. [Integration with VANA](#integration-with-vana)

## Core Concepts

### Agent Structure Requirements
- Every agent module MUST have a `root_agent` variable
- Agent packages need `__init__.py` that imports the agent module
- ADK commands run from parent directory: `adk run agent_folder`
- Maximum 6 tools per agent (ADK limitation)

### Model Selection
```python
# Recommended models (from fastest/cheapest to most capable)
"gemini-2.0-flash"      # Default choice - fast, cost-effective
"gemini-2.0-flash-exp"  # Experimental features
"gemini-1.5-flash"      # Legacy flash model
"gemini-1.5-pro"        # More capable, slower
"gemini-2.0-pro-exp"    # Most capable, experimental
```

## Agent Creation

### Basic Agent Pattern
```python
from google.adk.agents import Agent

root_agent = Agent(
    name="agent_name",
    model="gemini-2.0-flash",
    description="Brief agent purpose",  # Used for routing
    instruction="""
    Detailed instructions for the agent.
    Can include:
    - Specific behaviors
    - Response formats
    - Tool usage guidelines
    - State variable references: {variable_name}
    """,
    tools=[],  # Optional - list of functions
    sub_agents=[],  # Optional - for hierarchical systems
)
```

### Agent with Structured Output
```python
from pydantic import BaseModel, Field
from google.adk.agents import Agent

class OutputSchema(BaseModel):
    field1: str = Field(description="Field description")
    field2: list[str] = Field(description="List of items")
    field3: int = Field(description="Numeric value")

root_agent = Agent(
    name="structured_agent",
    model="gemini-2.0-flash",
    output_schema=OutputSchema,
    output_key="result",  # Where to store in state
    instruction="Generate structured data..."
)
```

## Tool Development

### Basic Tool Pattern
```python
def tool_name(param1: str, param2: int = 10) -> dict:
    """
    Tool description used by the agent.
    
    Args:
        param1: Description of param1
        param2: Description of param2 (default: 10)
    
    Returns:
        Dictionary with results
    """
    # Implementation
    return {
        "success": True,
        "data": "processed_result",
        "metadata": {"param1": param1, "param2": param2}
    }
```

### Stateful Tool Pattern
```python
from google.adk.tools.tool_context import ToolContext

def stateful_tool(data: str, tool_context: ToolContext) -> dict:
    """Tool that accesses and modifies state."""
    
    # Access state
    current_value = tool_context.state.get("counter", 0)
    user_name = tool_context.state.get("user_name", "Guest")
    
    # Modify state
    tool_context.state["counter"] = current_value + 1
    tool_context.state["last_action"] = f"Processed {data}"
    
    return {
        "message": f"Hello {user_name}, count is now {current_value + 1}",
        "data_processed": data
    }
```

### Tool with Actions
```python
def control_tool(command: str, tool_context: ToolContext) -> dict:
    """Tool that can control agent flow."""
    
    if command == "exit":
        # Exit from a loop
        tool_context.actions.escalate = True
        return {"message": "Exiting loop"}
    
    # Normal processing
    return {"result": f"Executed {command}"}
```

### AgentTool Pattern
```python
from google.adk.tools.agent_tool import AgentTool
from my_agents import specialist_agent

# Use sub-agent as a tool
root_agent = Agent(
    name="manager",
    tools=[
        AgentTool(specialist_agent),
        regular_function_tool
    ]
)
```

## Multi-Agent Systems

### Hierarchical Agent Pattern
```python
from google.adk.agents import Agent

# Define specialist agents
data_agent = Agent(
    name="data_specialist",
    model="gemini-2.0-flash",
    description="Handles data analysis tasks",
    tools=[analyze_data, clean_data]
)

viz_agent = Agent(
    name="viz_specialist", 
    model="gemini-2.0-flash",
    description="Creates visualizations",
    tools=[create_chart, export_image]
)

# Manager agent with sub-agents
root_agent = Agent(
    name="manager",
    model="gemini-2.0-flash",
    instruction="""You are a manager that delegates tasks.
    - Use data_specialist for analysis
    - Use viz_specialist for visualizations
    """,
    sub_agents=[data_agent, viz_agent]
)
```

### Mixed Delegation Pattern
```python
from google.adk.tools.agent_tool import AgentTool

# Some agents as sub_agents, others as tools
root_agent = Agent(
    name="coordinator",
    sub_agents=[primary_agent],  # Direct delegation
    tools=[
        AgentTool(secondary_agent),  # Tool-based delegation
        regular_tool_function
    ]
)
```

## State Management

### Session-Based State
```python
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
import uuid

# Create session service
session_service = InMemorySessionService()

# Create session with initial state
session = session_service.create_session(
    app_name="MyApp",
    user_id="user123",
    session_id=str(uuid.uuid4()),
    state={
        "user_name": "Alice",
        "preferences": {"theme": "dark"},
        "conversation_history": []
    }
)

# Run agent with session
runner = Runner(agent=root_agent, session_service=session_service)
result = runner.run(query="Hello", session=session)
```

### State in Agent Instructions
```python
root_agent = Agent(
    name="personalized_agent",
    instruction="""
    You are assisting {user_name}.
    Their preferences are: {preferences}
    Previous context: {conversation_history}
    
    Respond personally and remember their preferences.
    """
)
```

### Persistent State Storage
```python
class PersistentSessionService:
    """Custom session service with database backing."""
    
    def create_session(self, app_name, user_id, session_id, state=None):
        # Save to database
        db.save_session(session_id, state or {})
        return Session(app_name, user_id, session_id, state)
    
    def get_session(self, session_id):
        state = db.load_session(session_id)
        return Session("MyApp", state["user_id"], session_id, state)
    
    def update_session(self, session_id, state):
        db.update_session(session_id, state)
```

## Workflow Patterns

### Sequential Workflow
```python
from google.adk.agents import SequentialAgent, Agent

# Define step agents
validator = Agent(
    name="validator",
    output_key="validation_result",
    instruction="Validate the input data..."
)

processor = Agent(
    name="processor",
    output_key="processed_data",
    instruction="Process the validated data from {validation_result}..."
)

formatter = Agent(
    name="formatter",
    instruction="Format {processed_data} for output..."
)

# Create pipeline
root_agent = SequentialAgent(
    name="data_pipeline",
    model="gemini-2.0-flash",
    sub_agents=[validator, processor, formatter]
)
```

### Parallel Workflow
```python
from google.adk.agents import ParallelAgent, Agent

# Define parallel agents
cpu_monitor = Agent(
    name="cpu_monitor",
    output_key="cpu_data",
    tools=[get_cpu_info]
)

memory_monitor = Agent(
    name="memory_monitor", 
    output_key="memory_data",
    tools=[get_memory_info]
)

disk_monitor = Agent(
    name="disk_monitor",
    output_key="disk_data",
    tools=[get_disk_info]
)

# Synthesizer to combine results
synthesizer = Agent(
    name="synthesizer",
    instruction="""
    Combine the monitoring data:
    - CPU: {cpu_data}
    - Memory: {memory_data}
    - Disk: {disk_data}
    
    Create a comprehensive system report.
    """
)

# Create parallel workflow with synthesis
root_agent = SequentialAgent(
    name="system_monitor",
    sub_agents=[
        ParallelAgent(
            name="collectors",
            sub_agents=[cpu_monitor, memory_monitor, disk_monitor]
        ),
        synthesizer
    ]
)
```

### Loop Workflow
```python
from google.adk.agents import LoopAgent, Agent

# Define loop agents
reviewer = Agent(
    name="reviewer",
    output_key="review_result",
    tools=[exit_loop],  # Can exit when satisfied
    instruction="""
    Review the content: {draft}
    If acceptable, use exit_loop tool.
    Otherwise, provide feedback in review_result.
    """
)

refiner = Agent(
    name="refiner",
    output_key="draft",
    instruction="""
    Refine the draft based on: {review_result}
    Produce improved version.
    """
)

# Create iterative refinement loop
root_agent = LoopAgent(
    name="content_refiner",
    model="gemini-2.0-flash",
    max_iterations=5,
    sub_agents=[reviewer, refiner]
)

# Exit loop tool
def exit_loop(tool_context: ToolContext) -> dict:
    tool_context.actions.escalate = True
    return {"status": "Content approved"}
```

### Hybrid Workflow
```python
# Complex workflow combining all patterns
root_agent = SequentialAgent(
    name="complex_pipeline",
    sub_agents=[
        # Step 1: Validate input
        validator_agent,
        
        # Step 2: Parallel data collection
        ParallelAgent(
            name="data_collectors",
            sub_agents=[source1_agent, source2_agent, source3_agent]
        ),
        
        # Step 3: Iterative refinement
        LoopAgent(
            name="optimizer",
            max_iterations=3,
            sub_agents=[analyzer_agent, optimizer_agent]
        ),
        
        # Step 4: Final formatting
        formatter_agent
    ]
)
```

## Advanced Features

### Callback Patterns

#### Before/After Tool Callbacks
```python
def before_tool_callback(tool, args, tool_context):
    """Called before tool execution."""
    print(f"About to execute {tool.__name__} with {args}")
    
    # Can modify args
    modified_args = args.copy()
    modified_args["timestamp"] = datetime.now()
    
    # Can skip tool execution
    if should_skip_tool(tool, args):
        return {"cached": "result"}  # Skip tool, return this instead
    
    return None  # Proceed normally

def after_tool_callback(tool, args, tool_context, tool_response):
    """Called after tool execution."""
    print(f"Tool {tool.__name__} returned: {tool_response}")
    
    # Can modify response
    enhanced_response = tool_response.copy()
    enhanced_response["processed_at"] = datetime.now()
    enhanced_response["agent"] = tool_context.state.get("agent_name")
    
    return enhanced_response

root_agent = Agent(
    name="monitored_agent",
    tools=[my_tool],
    before_tool_callback=before_tool_callback,
    after_tool_callback=after_tool_callback
)
```

#### Model Callbacks
```python
def before_model_callback(messages, tools, tool_context):
    """Called before LLM invocation."""
    print(f"Sending {len(messages)} messages to model")
    # Can modify messages or tools
    return None

def after_model_callback(messages, tools, tool_context, response):
    """Called after LLM response."""
    print(f"Model responded: {response}")
    # Can modify response
    return response

root_agent = Agent(
    name="logged_agent",
    before_model_callback=before_model_callback,
    after_model_callback=after_model_callback
)
```

### Dynamic Tool Selection
```python
def get_available_tools(context):
    """Dynamically determine available tools."""
    base_tools = [search_tool, calculate_tool]
    
    if context.get("user_role") == "admin":
        base_tools.extend([admin_tool1, admin_tool2])
    
    if context.get("feature_flags", {}).get("beta_tools"):
        base_tools.append(beta_tool)
    
    return base_tools

# Create agent with dynamic tools
context = {"user_role": "admin", "feature_flags": {"beta_tools": True}}
root_agent = Agent(
    name="dynamic_agent",
    tools=get_available_tools(context)
)
```

## Best Practices

### 1. Agent Design
- Keep agents focused on a single responsibility
- Use descriptive names and descriptions for routing
- Limit tools to 6 per agent (ADK constraint)
- Use sub-agents for complex orchestration

### 2. Tool Development
- Always return dictionaries from tools
- Include success/failure indicators
- Provide detailed docstrings for agent understanding
- Use ToolContext for stateful operations

### 3. State Management
- Initialize state with sensible defaults
- Use consistent key naming conventions
- Store outputs using output_key for downstream access
- Clean up large state values when no longer needed

### 4. Error Handling
```python
def robust_tool(data: str) -> dict:
    """Tool with comprehensive error handling."""
    try:
        # Validation
        if not data:
            return {
                "success": False,
                "error": "No data provided",
                "error_type": "validation"
            }
        
        # Processing
        result = process_data(data)
        
        return {
            "success": True,
            "result": result,
            "metadata": {"processed_at": datetime.now()}
        }
        
    except ProcessingError as e:
        return {
            "success": False,
            "error": str(e),
            "error_type": "processing",
            "partial_result": e.partial_result
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "error_type": "unknown"
        }
```

### 5. Performance Optimization
- Use `gemini-2.0-flash` for speed/cost balance
- Implement caching in frequently-used tools
- Batch operations in parallel workflows
- Set appropriate max_iterations for loops

### 6. Testing Agents
```python
# Test agent without deployment
from google.adk.runners import Runner

def test_agent():
    runner = Runner(agent=root_agent)
    
    # Test basic functionality
    result = runner.run("Test query")
    assert result.answer
    
    # Test with state
    session = create_test_session({"user": "test"})
    result = runner.run("Stateful query", session=session)
    assert session.state["processed"] == True
```

## Integration with VANA

### Recommended Enhancements for VANA

1. **Adopt Workflow Agents**
```python
# Replace custom orchestration with ADK workflows
from google.adk.agents import SequentialAgent, ParallelAgent

vana_orchestrator = SequentialAgent(
    name="vana_orchestrator",
    sub_agents=[
        security_check_agent,  # First, always check security
        ParallelAgent(
            name="specialist_pool",
            sub_agents=[
                data_science_specialist,
                architecture_specialist,
                devops_specialist
            ]
        ),
        synthesis_agent  # Combine results
    ]
)
```

2. **Implement Structured Outputs**
```python
class SpecialistResponse(BaseModel):
    specialist: str
    confidence: float
    analysis: str
    recommendations: list[str]
    tools_used: list[str]

specialist_agent = Agent(
    name="specialist",
    output_schema=SpecialistResponse,
    output_key="specialist_result"
)
```

3. **Use State for Agent Coordination**
```python
def route_to_specialist(query: str, tool_context: ToolContext) -> dict:
    """Enhanced routing with state tracking."""
    
    # Track routing history
    history = tool_context.state.get("routing_history", [])
    
    # Determine specialist
    specialist = analyze_query(query)
    
    # Update state
    tool_context.state["routing_history"] = history + [{
        "timestamp": datetime.now(),
        "query": query,
        "routed_to": specialist,
        "confidence": confidence
    }]
    
    tool_context.state["last_specialist"] = specialist
    
    return {"specialist": specialist, "confidence": confidence}
```

4. **Implement Loop Patterns for Refinement**
```python
# Add iterative improvement capability
refinement_loop = LoopAgent(
    name="quality_improver",
    max_iterations=3,
    sub_agents=[
        quality_checker,  # Reviews output
        output_refiner    # Improves based on feedback
    ]
)
```

5. **Add Callback Monitoring**
```python
def vana_monitoring_callback(tool, args, tool_context, response=None):
    """Universal monitoring for VANA."""
    metrics = tool_context.state.get("metrics", {})
    
    # Update metrics
    tool_name = tool.__name__
    metrics[tool_name] = metrics.get(tool_name, 0) + 1
    
    # Log to orchestrator metrics
    if hasattr(tool_context, "orchestrator_metrics"):
        tool_context.orchestrator_metrics.record_tool_use(tool_name)
    
    tool_context.state["metrics"] = metrics
    return response
```

### Migration Path

1. **Phase 1**: Replace custom workflow management with ADK workflow agents
2. **Phase 2**: Implement structured outputs for all specialists
3. **Phase 3**: Migrate state management to ADK session system
4. **Phase 4**: Add callback-based monitoring and metrics
5. **Phase 5**: Optimize with parallel execution where applicable

This ADK Source of Truth provides the foundational patterns and best practices needed to enhance VANA's architecture while maintaining ADK compliance and leveraging its full capabilities.