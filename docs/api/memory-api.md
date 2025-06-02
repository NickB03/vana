# ADK Memory API Reference

This document provides a comprehensive API reference for VANA's ADK memory system, including all available classes, methods, and tools.

## Overview

VANA's ADK memory system provides native Google Cloud integration for knowledge storage, retrieval, and session management. The API is built on Google ADK patterns and provides both high-level agent tools and low-level programmatic access.

## Core Classes

### VertexAiRagMemoryService

The primary memory service class for managing knowledge storage and retrieval.

```python
from google.adk.memory import VertexAiRagMemoryService

class VertexAiRagMemoryService:
    def __init__(
        self,
        rag_corpus: str,
        similarity_top_k: int = 5,
        vector_distance_threshold: float = 0.7
    ):
        """Initialize the ADK memory service.

        Args:
            rag_corpus: RAG Corpus resource name
            similarity_top_k: Number of similar results to return
            vector_distance_threshold: Similarity threshold for results
        """
```

#### Methods

##### add_session_to_memory()

```python
def add_session_to_memory(self, session: Session) -> None:
    """Add a session to memory for future retrieval.

    Args:
        session: The session object to add to memory

    Raises:
        MemoryServiceError: If session cannot be added to memory
    """
```

##### search_memory()

```python
def search_memory(
    self,
    query: str,
    top_k: Optional[int] = None,
    threshold: Optional[float] = None
) -> List[MemoryResult]:
    """Search memory for relevant information.

    Args:
        query: Search query string
        top_k: Number of results to return (overrides default)
        threshold: Similarity threshold (overrides default)

    Returns:
        List of MemoryResult objects containing relevant information
    """
```

### Session State Management

ADK provides native session state management through the `session.state` dictionary.

```python
# Access session state
session.state["key"] = "value"
value = session.state.get("key")

# Scoped state access
session.state["user:preference"] = "dark_mode"
session.state["app:version"] = "1.0.0"
session.state["temp:cache"] = temporary_data
```

#### State Scopes

| Scope | Prefix | Persistence | Description |
|-------|--------|-------------|-------------|
| Session | (none) | Session lifetime | Data persists for the session duration |
| User | `user:` | Cross-session | Data persists across sessions for the user |
| App | `app:` | Application-wide | Data shared across all users and sessions |
| Temporary | `temp:` | Request-only | Data cleared after each request |

## Memory Tools

### load_memory Tool

Built-in ADK tool for querying stored conversations and knowledge.

```python
from google.adk.tools import load_memory

# Use in agent configuration
agent = LlmAgent(
    model="gemini-2.0-flash",
    tools=[load_memory],
    instruction="Use load_memory tool to access previous conversations"
)
```

#### Tool Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `query` | string | Search query for memory retrieval | Required |
| `max_results` | integer | Maximum number of results to return | 5 |
| `similarity_threshold` | float | Minimum similarity score for results | 0.7 |

#### Tool Response

```json
{
  "results": [
    {
      "content": "Retrieved memory content",
      "similarity_score": 0.85,
      "timestamp": "2025-01-27T10:30:00Z",
      "source": "session_12345"
    }
  ],
  "total_results": 1,
  "query": "original search query"
}
```

### ToolContext.search_memory()

Tool-level memory access for custom tool implementations.

```python
from google.adk.core import ToolContext

def my_custom_tool(query: str, tool_context: ToolContext) -> str:
    """Custom tool with memory access."""
    # Search memory using tool context
    memory_results = tool_context.search_memory(query)

    # Process results
    if memory_results:
        return f"Found: {memory_results[0].content}"
    else:
        return "No relevant information found"
```

#### Method Signature

```python
def search_memory(
    self,
    query: str,
    max_results: int = 5,
    similarity_threshold: float = 0.7
) -> List[MemoryResult]:
    """Search memory from within a tool.

    Args:
        query: Search query string
        max_results: Maximum number of results to return
        similarity_threshold: Minimum similarity score

    Returns:
        List of MemoryResult objects
    """
```

## Agent Integration

### Agent Data Sharing

Use the `output_key` pattern for seamless data flow between agents.

```python
# Agent A stores data
agent_A = LlmAgent(
    instruction="Extract key information",
    output_key="extracted_info"
)

# Agent B reads data
agent_B = LlmAgent(
    instruction="Use information from state['extracted_info']"
)
```

### Sequential Agent Workflows

```python
from google.adk.agents import SequentialAgent

workflow = SequentialAgent(
    sub_agents=[agent_A, agent_B, agent_C]
)

# Run workflow with automatic state sharing
result = workflow.run("Process this information")
```

## Data Models

### MemoryResult

```python
@dataclass
class MemoryResult:
    """Result from memory search operation."""
    content: str
    similarity_score: float
    timestamp: datetime
    source: str
    metadata: Dict[str, Any] = field(default_factory=dict)
```

### Session

```python
@dataclass
class Session:
    """Session object for memory operations."""
    id: str
    user_id: Optional[str]
    messages: List[Message]
    state: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
```

### Message

```python
@dataclass
class Message:
    """Message within a session."""
    id: str
    role: str  # 'user', 'assistant', 'system'
    content: str
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
```

## Configuration API

### Environment Configuration

```python
import os

# Required configuration
os.environ["GOOGLE_CLOUD_PROJECT"] = "analystai-454200"
os.environ["GOOGLE_CLOUD_LOCATION"] = "us-central1"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/path/to/credentials.json"

# ADK Memory configuration
os.environ["ADK_RAG_CORPUS"] = "projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus"
os.environ["ADK_SIMILARITY_TOP_K"] = "5"
os.environ["ADK_VECTOR_DISTANCE_THRESHOLD"] = "0.7"
```

### Programmatic Configuration

```python
from google.adk.memory import VertexAiRagMemoryService

# Initialize with custom configuration
memory_service = VertexAiRagMemoryService(
    rag_corpus="projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus",
    similarity_top_k=10,
    vector_distance_threshold=0.8
)
```

## Error Handling

### Exception Classes

```python
class MemoryServiceError(Exception):
    """Base exception for memory service errors."""
    pass

class RAGCorpusNotFoundError(MemoryServiceError):
    """Raised when RAG Corpus cannot be found."""
    pass

class AuthenticationError(MemoryServiceError):
    """Raised when authentication fails."""
    pass

class SearchError(MemoryServiceError):
    """Raised when memory search fails."""
    pass
```

### Error Handling Examples

```python
try:
    memory_service = VertexAiRagMemoryService(
        rag_corpus="invalid-corpus"
    )
except RAGCorpusNotFoundError as e:
    print(f"RAG Corpus not found: {e}")
except AuthenticationError as e:
    print(f"Authentication failed: {e}")

try:
    results = memory_service.search_memory("query")
except SearchError as e:
    print(f"Search failed: {e}")
    results = []
```

## Performance Considerations

### Optimization Tips

1. **Batch Operations**: Group multiple memory operations when possible
2. **Similarity Thresholds**: Adjust thresholds based on use case requirements
3. **Result Limits**: Use appropriate `top_k` values to balance relevance and performance
4. **Caching**: Leverage session state for frequently accessed data

### Performance Monitoring

```python
import time
from google.adk.memory import VertexAiRagMemoryService

# Monitor search performance
start_time = time.time()
results = memory_service.search_memory("query")
search_time = time.time() - start_time

print(f"Search completed in {search_time:.2f} seconds")
print(f"Found {len(results)} results")
```

## Migration from Custom Knowledge Graph

### API Mapping

| Legacy API | ADK Memory API | Notes |
|------------|----------------|-------|
| `KnowledgeGraphManager.query()` | `VertexAiRagMemoryService.search_memory()` | Semantic search instead of graph queries |
| `KnowledgeGraphManager.store()` | `VertexAiRagMemoryService.add_session_to_memory()` | Automatic session-to-memory conversion |
| `custom_memory_commands` | `load_memory` tool | Built-in ADK tool |
| `MCP.search()` | `ToolContext.search_memory()` | Tool-level memory access |

### Migration Example

```python
# Legacy approach (REMOVED)
# from tools.knowledge_graph import KnowledgeGraphManager
# kg_manager = KnowledgeGraphManager()
# results = kg_manager.query("search query")

# ADK approach (CURRENT)
from google.adk.memory import VertexAiRagMemoryService
memory_service = VertexAiRagMemoryService(
    rag_corpus="projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus"
)
results = memory_service.search_memory("search query")
```

## Examples

### Basic Memory Usage

```python
from google.adk.memory import VertexAiRagMemoryService
from google.adk.agents import LlmAgent
from google.adk.tools import load_memory

# Initialize memory service
memory_service = VertexAiRagMemoryService(
    rag_corpus="projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus"
)

# Create agent with memory
agent = LlmAgent(
    model="gemini-2.0-flash",
    tools=[load_memory],
    instruction="You have access to memory. Use load_memory to search for relevant information."
)

# Run agent
response = agent.run("What did we discuss about project timelines?")
```

### Advanced Memory Integration

```python
from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.tools import load_memory, FunctionTool
from google.adk.core import ToolContext

def analyze_with_memory(topic: str, tool_context: ToolContext) -> str:
    """Analyze a topic using memory context."""
    # Search for relevant background information
    memory_results = tool_context.search_memory(f"background information about {topic}")

    # Combine with current analysis
    background = "\n".join([r.content for r in memory_results[:3]])
    return f"Analysis of {topic} with background: {background}"

# Create custom tool
analysis_tool = FunctionTool(analyze_with_memory)

# Create workflow
research_agent = LlmAgent(
    instruction="Research the topic thoroughly",
    tools=[load_memory],
    output_key="research"
)

analysis_agent = LlmAgent(
    instruction="Analyze using research from state['research']",
    tools=[analysis_tool],
    output_key="analysis"
)

workflow = SequentialAgent(sub_agents=[research_agent, analysis_agent])
```

## Best Practices

### Memory Management

1. **Regular Memory Updates**: Add important sessions to memory regularly
2. **Relevant Queries**: Use specific, relevant queries for better search results
3. **State Management**: Use appropriate state scopes for different data types
4. **Error Handling**: Always handle potential memory service errors

### Performance Optimization

1. **Similarity Tuning**: Adjust similarity thresholds based on use case
2. **Result Limiting**: Use appropriate result limits to balance performance and completeness
3. **Caching**: Cache frequently accessed memory results in session state
4. **Batch Processing**: Group related memory operations when possible

### Security Considerations

1. **Authentication**: Ensure proper Google Cloud authentication
2. **Access Control**: Use appropriate IAM roles for memory access
3. **Data Privacy**: Be mindful of sensitive information in memory
4. **Audit Logging**: Monitor memory access patterns for security

## Troubleshooting

### Common Issues

1. **RAG Corpus Not Found**: Verify corpus resource name and permissions
2. **Authentication Errors**: Check service account credentials and permissions
3. **No Search Results**: Adjust similarity thresholds or query specificity
4. **Performance Issues**: Monitor query complexity and result set sizes

### Debugging Tools

```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Test memory service connectivity
try:
    memory_service = VertexAiRagMemoryService(
        rag_corpus="projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus"
    )
    print("Memory service initialized successfully")
except Exception as e:
    print(f"Memory service initialization failed: {e}")
```

## Conclusion

The ADK Memory API provides a comprehensive, Google-managed solution for knowledge storage and retrieval in VANA. By leveraging native ADK patterns and Google Cloud infrastructure, the system delivers superior reliability, performance, and maintainability compared to custom implementations.
