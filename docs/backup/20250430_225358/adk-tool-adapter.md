# ADK Tool Adapter

The ADK Tool Adapter provides a bridge between VANA specialist agents and ADK tools, allowing specialists to be exposed as tools to the ADK framework.

## Features

- **Standardized Input/Output Formats**: Support for text, JSON, and structured formats
- **Capability Advertisement**: Advertise agent capabilities for discovery
- **Specialized Context Parsers**: Parse context based on agent type
- **Fallback Mechanisms**: Graceful degradation when ADK is not available

## Usage

### Registering a Specialist Agent as a Tool

```python
from vana.adk_integration import ADKToolAdapter

# Create tool adapter
tool_adapter = ADKToolAdapter()

# Register specialist agent
tool_adapter.register_specialist_as_tool(
    specialist_name="architect_agent",
    specialist_obj=architect_agent,
    agent_type=ADKToolAdapter.AGENT_TYPE_ARCHITECT,
    input_format=ADKToolAdapter.INPUT_FORMAT_JSON,
    output_format=ADKToolAdapter.OUTPUT_FORMAT_STRUCTURED,
    capabilities={
        "design_patterns": ["singleton", "factory", "observer"],
        "languages": ["python", "javascript", "java"]
    }
)
```

### Registering a Function as a Tool

```python
# Register function
def search_knowledge(query: str) -> str:
    """Search the knowledge base."""
    # Implementation...
    return f"Results for: {query}"

tool_adapter.register_function_as_tool(
    func=search_knowledge,
    input_format=ADKToolAdapter.INPUT_FORMAT_TEXT,
    output_format=ADKToolAdapter.OUTPUT_FORMAT_JSON,
    capabilities={
        "search_types": ["vector", "keyword", "hybrid"]
    }
)
```

### Using the Tool Decorator

```python
@tool_adapter.tool_decorator(
    name="design_architecture",
    description="Design a system architecture",
    input_format=ADKToolAdapter.INPUT_FORMAT_STRUCTURED,
    output_format=ADKToolAdapter.OUTPUT_FORMAT_STRUCTURED,
    capabilities={
        "architecture_types": ["microservices", "monolith", "serverless"]
    }
)
def design_architecture(requirements: str) -> dict:
    """Design a system architecture based on requirements."""
    # Implementation...
    return {
        "architecture": "microservices",
        "components": ["api_gateway", "auth_service", "data_service"],
        "diagram": "..."
    }
```

### Executing a Tool

```python
# Execute tool
result = tool_adapter.execute_tool("design_architecture", "Build a scalable e-commerce system")
```

### Getting Agent Capabilities

```python
# Get capabilities for a specific agent
capabilities = tool_adapter.get_agent_capabilities("architect_agent")

# Get all capabilities
all_capabilities = tool_adapter.get_all_capabilities()

# Get capabilities by type
architect_capabilities = tool_adapter.get_capabilities_by_type(
    ADKToolAdapter.AGENT_TYPE_ARCHITECT
)

# Get capabilities by format
json_capabilities = tool_adapter.get_capabilities_by_format(
    input_format=ADKToolAdapter.INPUT_FORMAT_JSON,
    output_format=ADKToolAdapter.OUTPUT_FORMAT_JSON
)

# Get human-readable advertisement of capabilities
advertisement = tool_adapter.advertise_capabilities()
print(advertisement)
```

## Input/Output Formats

### Input Formats

- **TEXT**: Plain text input
- **JSON**: JSON-formatted input
- **STRUCTURED**: Python dictionary input

### Output Formats

- **TEXT**: Plain text output
- **JSON**: JSON-formatted output
- **STRUCTURED**: Python dictionary output

## Agent Types

- **GENERAL**: General-purpose agent
- **ARCHITECT**: Architecture design agent
- **INTERACTION**: User interaction agent
- **PLATFORM**: Platform automation agent
- **TESTING**: Testing and validation agent
- **DOCUMENTATION**: Documentation and knowledge agent

## Context Parsing

The tool adapter automatically parses context based on agent type:

### Architect Agent Context

```python
{
    "query": "Design a microservices architecture",
    "agent_type": "architect",
    "design_patterns": ["singleton", "factory"],
    "system_components": ["api_gateway", "auth_service"],
    "requirements": ["scalability", "security"]
}
```

### Interaction Agent Context

```python
{
    "query": "Show user dashboard",
    "agent_type": "interaction",
    "user_interface": {"theme": "dark"},
    "user_preferences": {"language": "en"},
    "interaction_history": [...]
}
```

### Platform Agent Context

```python
{
    "query": "Deploy to production",
    "agent_type": "platform",
    "infrastructure": {"provider": "aws"},
    "deployment_targets": ["production", "staging"],
    "system_metrics": {"cpu": 0.5, "memory": 0.7}
}
```

### Testing Agent Context

```python
{
    "query": "Run integration tests",
    "agent_type": "testing",
    "test_cases": ["test_auth", "test_api"],
    "test_results": {"passed": 10, "failed": 2},
    "coverage_metrics": {"lines": 0.85, "branches": 0.75}
}
```

### Documentation Agent Context

```python
{
    "query": "Generate API documentation",
    "agent_type": "documentation",
    "documentation_type": "api",
    "target_audience": "developers",
    "existing_documentation": {...}
}
```

## Capability Advertisement

The tool adapter can advertise capabilities in a human-readable format:

```
Available capabilities:

- architect_agent (architect):
  Description: Architecture design agent
  Input format: json
  Output format: structured
  Parameters:
    - design_patterns: ["singleton", "factory", "observer"]
    - languages: ["python", "javascript", "java"]

- search_knowledge (function):
  Description: Search the knowledge base
  Input format: text
  Output format: json
  Parameters:
    - search_types: ["vector", "keyword", "hybrid"]
```

## Fallback Mechanisms

The tool adapter includes fallback mechanisms for when ADK is not available:

```python
# Check if ADK is available
if not tool_adapter.is_adk_available():
    # Use fallback mechanism
    # ...
```
