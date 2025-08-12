# ADK Expert Agent for Claude Flow

A specialized Google ADK (Agent Development Kit) expert agent that provides authoritative guidance by querying indexed ADK documentation stored in ChromaDB collections.

## Overview

The ADK Expert Agent is designed to:
- Query ChromaDB collections containing indexed Google ADK documentation
- Provide authoritative guidance on ADK patterns and best practices
- Validate code implementations against ADK standards
- Integrate seamlessly with Claude Flow for multi-agent orchestration

## Features

### 1. **ChromaDB Integration**
- Queries `adk_documentation` and `adk_knowledge_base_v2` collections
- Semantic search with query type optimization
- Caches results for improved performance

### 2. **Query Types**
- **Pattern**: ADK design patterns and architectural guidance
- **Implementation**: How-to guides for specific features
- **Best Practice**: Recommended approaches and guidelines
- **Troubleshooting**: Solutions for common issues
- **Example**: Code samples and demonstrations
- **Validation**: Compliance checking against ADK standards

### 3. **Response Synthesis**
- Extracts guidance from multiple documentation sources
- Identifies code examples and best practices
- Highlights warnings and anti-patterns
- Provides references to documentation sections

## Installation

1. Ensure ChromaDB collections are populated with ADK documentation:
```bash
# Collections should be in /Users/nick/Development/vana_vscode/.chroma_db/
# - adk_documentation
# - adk_knowledge_base_v2
```

2. Import the agent in your code:
```python
from app.agents.adk_expert_agent import (
    ADKExpertAgent,
    create_adk_expert_llm_agent,
    query_adk_expert
)
```

## Usage

### As a Standalone Agent

```python
import asyncio
from app.agents.adk_expert_agent import ADKExpertAgent, ADKQueryType

async def main():
    # Create expert agent
    expert = ADKExpertAgent()
    
    # Query for ADK guidance
    results = await expert.query_adk_knowledge(
        "How to implement two-phase workflow",
        query_type=ADKQueryType.IMPLEMENTATION
    )
    
    # Synthesize guidance
    guidance = await expert.synthesize_guidance(results, "two-phase workflow")
    
    print(guidance.guidance)
    if guidance.examples:
        for example in guidance.examples:
            print(f"Example: {example}")

asyncio.run(main())
```

### As an LLM Agent Tool

```python
from google.adk.agents import LlmAgent
from app.agents.adk_expert_agent import query_adk_expert

# Create an agent that uses the ADK expert tool
research_agent = LlmAgent(
    name="research_agent",
    model="gemini-2.5-flash",
    instruction="Use the ADK expert tool to answer questions about Google ADK.",
    tools=[query_adk_expert]
)
```

### With Claude Flow Integration

```python
from app.agents.adk_expert_claude_flow import ADKExpertClaudeFlow

async def use_with_claude_flow():
    # Create Claude Flow orchestrator
    flow = ADKExpertClaudeFlow()
    
    # Process an ADK query
    result = await flow.process_adk_query(
        "What is the correct pattern for agent delegation?"
    )
    
    print(result["guidance"])
```

### For Code Validation

```python
async def validate_agent_code():
    expert = ADKExpertAgent()
    
    code = '''
    agent = LlmAgent(
        name="my_agent",
        model="gemini-2.5-flash",
        instruction="Process tasks"
    )
    '''
    
    validation = await expert.validate_implementation(
        code,
        "LlmAgent configuration"
    )
    
    print(f"Compliance Score: {validation['score']}")
    for issue in validation['issues']:
        print(f"Issue: {issue}")
```

## Claude Flow Registration

To register the ADK Expert with Claude Flow:

```python
from app.agents.adk_expert_claude_flow import register_with_claude_flow

# Register during Claude Flow initialization
config = register_with_claude_flow()

# The agent is now available for orchestration with these capabilities:
# - adk-patterns
# - adk-implementation
# - adk-validation
# - adk-troubleshooting
# - chromadb-query
```

## MCP Tool Integration

The agent can be invoked through MCP tools:

```python
from app.agents.adk_expert_claude_flow import adk_expert_mcp_tool

# Query through MCP interface
result = await adk_expert_mcp_tool(
    action="query",
    parameters={
        "query": "How to use SequentialAgent",
        "context": {"project": "research_assistant"}
    }
)
```

## Query Examples

### Basic Pattern Query
```python
"What is the hierarchical planner-executor pattern?"
# Returns: Pattern explanation, examples, best practices
```

### Implementation Guide
```python
"How do I implement a LoopAgent with escalation?"
# Returns: Step-by-step implementation guide with code
```

### Troubleshooting
```python
"My agent is not receiving tool responses"
# Returns: Common causes and solutions
```

### Validation
```python
"Is this the correct way to use callbacks?"
# Returns: Validation results with compliance score
```

## Configuration

### ChromaDB Collections
The agent expects these collections in ChromaDB:
- `adk_documentation`: Core ADK documentation
- `adk_knowledge_base_v2`: Extended knowledge base

### Environment Variables
```bash
# Optional: Custom ChromaDB host
CHROMADB_HOST=localhost
CHROMADB_PORT=8000

# Model configuration
ADK_EXPERT_MODEL=gemini-2.5-flash
```

### Custom Configuration
```python
from app.agents.adk_expert_agent import ADKExpertAgent, ChromaDBConfig

# Custom ChromaDB configuration
config = ChromaDBConfig(
    collection_names=["my_adk_docs"],
    host="custom-host",
    port=8001
)

expert = ADKExpertAgent(
    name="custom_expert",
    chroma_config=config,
    model="gemini-2.5-pro"
)
```

## Best Practices

1. **Always Query First**: Before providing guidance, query ChromaDB for the latest documentation
2. **Use Appropriate Query Types**: Select the right query type for better results
3. **Cache Results**: The agent caches results to improve performance
4. **Validate Implementations**: Use the validation feature to check code compliance
5. **Combine with Other Agents**: Use in multi-agent systems for comprehensive solutions

## API Reference

### Classes

#### `ADKExpertAgent`
Main agent class for ADK expertise.

**Methods:**
- `query_adk_knowledge(query, query_type, max_results)`: Query ChromaDB
- `synthesize_guidance(results, query, include_examples)`: Create guidance
- `validate_implementation(code, pattern_name)`: Validate code

#### `ADKExpertClaudeFlow`
Claude Flow integration orchestrator.

**Methods:**
- `process_adk_query(user_query, context)`: Process queries through Claude Flow

### Models

#### `ADKQueryRequest`
- `query`: The ADK question
- `query_type`: Type of query
- `context`: Additional context
- `include_examples`: Include code examples

#### `ADKGuidance`
- `topic`: The ADK topic
- `guidance`: Detailed guidance
- `examples`: Code examples
- `best_practices`: Best practices
- `references`: Documentation references
- `warnings`: Anti-patterns to avoid

### Enums

#### `ADKQueryType`
- `PATTERN`: Design patterns
- `IMPLEMENTATION`: How-to guides
- `BEST_PRACTICE`: Guidelines
- `TROUBLESHOOTING`: Issue resolution
- `EXAMPLE`: Code samples
- `VALIDATION`: Compliance checking

## Troubleshooting

### ChromaDB Connection Issues
```python
# Check if collections exist
from app.agents.adk_expert_claude_flow import query_adk_chromadb

result = await query_adk_chromadb(
    "test query",
    collection_name="adk_documentation"
)
print(result["status"])  # Should be "ready_for_execution"
```

### Empty Results
- Ensure ChromaDB collections are populated
- Check collection names match exactly
- Verify ChromaDB service is running

### Performance Issues
- Reduce `max_results` parameter
- Enable result caching
- Use specific query types

## Contributing

To extend the ADK Expert Agent:

1. Add new query types in `ADKQueryType` enum
2. Extend `_build_semantic_queries()` for new patterns
3. Add extraction methods for new content types
4. Update Claude Flow integration as needed

## License

Copyright 2025 Google LLC - Apache License 2.0