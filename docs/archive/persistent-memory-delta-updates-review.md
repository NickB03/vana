# Persistent Memory with Delta-Based Updates

This document describes the implementation of persistent memory with delta-based updates for Project VANA.

## Overview

The persistent memory system allows VANA to maintain context across sessions and devices by storing and retrieving knowledge from a centralized memory server. The implementation uses delta-based updates to efficiently synchronize memory between the agent and the server.

## Architecture

The persistent memory system consists of the following components:

1. **MCP Knowledge Graph Memory Server**: A public hosted solution that stores entities and relationships
2. **Vertex AI Vector Search**: For semantic knowledge retrieval (already implemented)
3. **Agent Engine Sessions**: For cross-device state persistence

## Components

### MCP Memory Client

The `MCPMemoryClient` class in `tools/mcp_memory_client.py` provides an interface to the MCP Knowledge Graph Memory Server. It handles:

- Storing entities in the knowledge graph
- Retrieving entities from the knowledge graph
- Creating relationships between entities
- Performing delta-based synchronization

```python
from tools.mcp_memory_client import MCPMemoryClient

# Initialize client
client = MCPMemoryClient(
    endpoint="https://mcp.community.augment.co",
    namespace="vana-project",
    api_key="your_mcp_api_key"
)

# Store an entity
client.store_entity(
    entity_name="Project VANA",
    entity_type="Project",
    observations=["VANA is a versatile agent network architecture"]
)

# Retrieve an entity
entity = client.retrieve_entity("Project VANA")

# Create a relationship
client.create_relationship(
    from_entity="Project VANA",
    relationship="has_component",
    to_entity="Vector Search"
)

# Perform delta sync
changes = client.sync_delta()
```

### Memory Manager

The `MemoryManager` class in `tools/memory_manager.py` manages the synchronization between the local cache and the MCP server. It handles:

- Initializing the local cache with data from the server
- Performing delta-based synchronization at regular intervals
- Processing added, modified, and deleted entities

```python
from tools.memory_manager import MemoryManager
from tools.mcp_memory_client import MCPMemoryClient

# Initialize client and manager
client = MCPMemoryClient(...)
manager = MemoryManager(client, sync_interval=300)  # 5 minutes

# Initialize with data from server
manager.initialize()

# Sync if needed (based on interval)
manager.sync_if_needed()

# Force sync
manager.sync()
```

### Memory Cache

The `MemoryCache` class in `tools/memory_cache.py` provides a caching layer for memory operations to improve performance. It handles:

- Caching frequently accessed entities
- Time-based expiration of cached items
- Eviction of least recently used items when the cache is full

```python
from tools.memory_cache import MemoryCache

# Initialize cache
cache = MemoryCache(max_size=1000, ttl=3600)  # 1 hour TTL

# Set an item
cache.set("entity_id", entity_data)

# Get an item
entity = cache.get("entity_id")
```

### Entity Scorer

The `EntityScorer` class in `tools/entity_scorer.py` scores entities based on importance and recency. It handles:

- Assigning base scores based on entity type
- Applying time decay to older entities
- Adjusting scores based on access frequency

```python
from tools.entity_scorer import EntityScorer

# Initialize scorer
scorer = EntityScorer()

# Score an entity
score = scorer.score_entity(entity)
```

### Hybrid Search with Delta Updates

The `HybridSearchDelta` class in `tools/hybrid_search_delta.py` combines Vector Search and Knowledge Graph search results. It handles:

- Syncing memory before performing searches
- Querying both Vector Search and Knowledge Graph
- Merging and ranking results from both sources

```python
from tools.hybrid_search_delta import HybridSearchDelta
from tools.memory_manager import MemoryManager

# Initialize components
manager = MemoryManager(...)
hybrid_search = HybridSearchDelta(manager)

# Perform search
results = await hybrid_search.search("What is VANA?")

# Format results
formatted = hybrid_search.format_results(results)
```

### Agent Engine Integration

The `AgentEngineIntegration` class in `agent/agent_engine_integration.py` integrates with Vertex AI Agent Engine for session management. It handles:

- Creating and managing user sessions
- Processing messages with persistent context
- Extracting and storing entities from conversations

```python
from agent.agent_engine_integration import AgentEngineIntegration
from google.adk.agents import Agent

# Initialize agent and integration
agent = Agent(...)
integration = AgentEngineIntegration(agent)

# Process a message
response = integration.process_message(
    user_id="user123",
    message="Tell me about VANA"
)
```

## Configuration

The persistent memory system is configured through environment variables:

```
# MCP Memory Configuration
MCP_API_KEY=your_mcp_api_key
MCP_ENDPOINT=https://mcp.community.augment.co
MCP_NAMESPACE=vana-project

# Memory Manager Configuration
MEMORY_SYNC_INTERVAL=300  # 5 minutes
MEMORY_CACHE_SIZE=1000
MEMORY_CACHE_TTL=3600  # 1 hour

# Entity Scorer Configuration
ENTITY_HALF_LIFE_DAYS=30

# Hybrid Search Configuration
VECTOR_SEARCH_WEIGHT=0.7
KNOWLEDGE_GRAPH_WEIGHT=0.3
DEFAULT_TOP_K=5
```

## Testing

The implementation includes comprehensive tests for each component:

- `tests/test_mcp_client.py`: Tests for the MCP Memory Client
- `tests/test_memory_manager.py`: Tests for the Memory Manager
- `tests/test_hybrid_search_delta.py`: Tests for the Hybrid Search with Delta Updates

To run the tests:

```bash
python -m unittest tests/test_mcp_client.py
python -m unittest tests/test_memory_manager.py
python -m unittest tests/test_hybrid_search_delta.py
```

To verify the MCP Memory integration:

```bash
python scripts/verify_mcp_memory.py
```

## Integration with VANA

The persistent memory system is integrated with VANA through the Agent Engine Integration. This allows VANA to:

1. Maintain context across sessions and devices
2. Store and retrieve knowledge from the centralized memory server
3. Perform efficient delta-based synchronization
4. Combine Vector Search and Knowledge Graph for comprehensive knowledge retrieval

## Benefits

The persistent memory system with delta-based updates provides several benefits:

1. **Efficiency**: Only changes are synchronized, reducing bandwidth and processing requirements
2. **Persistence**: Memory is maintained across sessions and devices
3. **Comprehensive Knowledge**: Combines Vector Search and Knowledge Graph for better results
4. **Performance**: Uses caching and scoring to optimize memory operations

## Future Enhancements

Potential future enhancements to the persistent memory system include:

1. **Multi-modal Memory**: Support for storing and retrieving images, audio, and other media
2. **Personalized Memory**: User-specific memory profiles and preferences
3. **Collaborative Memory**: Shared memory spaces for team collaboration
4. **Memory Analytics**: Insights and analytics based on memory usage patterns
5. **Advanced Entity Extraction**: Improved NLP for extracting entities from conversations
