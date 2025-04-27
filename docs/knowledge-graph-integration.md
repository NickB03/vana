# Knowledge Graph Integration

This document provides a comprehensive guide to integrating the MCP Knowledge Graph with the VANA project. The Knowledge Graph provides a structured representation of knowledge that complements the Vector Search capabilities, enabling more sophisticated knowledge retrieval and reasoning.

## Table of Contents

- [Overview](#overview)
- [Setup and Configuration](#setup-and-configuration)
- [Usage with Augment](#usage-with-augment)
- [Integration with Vector Search](#integration-with-vector-search)
- [Command Reference](#command-reference)
- [Implementation Details](#implementation-details)
- [Troubleshooting](#troubleshooting)

## Overview

The Knowledge Graph integration enhances the VANA memory system by providing a structured representation of knowledge. While Vector Search excels at semantic similarity search, the Knowledge Graph excels at representing relationships between entities, enabling more sophisticated reasoning and knowledge retrieval.

Key benefits of the Knowledge Graph integration:

- **Structured Knowledge Representation**: Entities and relationships are explicitly represented, enabling more precise knowledge retrieval.
- **Relationship-Based Reasoning**: The Knowledge Graph can answer questions about relationships between entities that would be difficult to answer with Vector Search alone.
- **Hybrid Search**: Combining Vector Search and Knowledge Graph enables more comprehensive knowledge retrieval.
- **Entity Extraction**: The Knowledge Graph can automatically extract entities from text, making it easier to build and maintain the knowledge base.

## Setup and Configuration

### Prerequisites

- MCP server running (see [n8n-mcp-server-setup.md](n8n-mcp-server-setup.md))
- MCP API key with Knowledge Graph access
- Augment configured to use the Knowledge Graph

### Environment Variables

The following environment variables are used for Knowledge Graph integration:

- `MCP_API_KEY`: API key for the MCP server
- `MCP_SERVER_URL`: URL of the MCP server (default: https://mcp.community.augment.co)
- `MCP_NAMESPACE`: Namespace for the Knowledge Graph (default: vana-project)

These can be set in a `.env` file in the project root directory:

```bash
MCP_API_KEY=your_api_key_here
MCP_SERVER_URL=https://mcp.community.augment.co
MCP_NAMESPACE=vana-project
```

### Augment Configuration

The `augment-config.json` file in the project root directory configures Augment to use the Knowledge Graph:

```json
{
  "version": "1.0",
  "knowledgeGraph": {
    "provider": "mcp",
    "config": {
      "serverUrl": "https://mcp.community.augment.co",
      "namespace": "vana-project",
      "apiKey": "${MCP_API_KEY}"
    }
  },
  "memory": {
    "enabled": true,
    "autoSave": true,
    "autoLoad": true,
    "providers": {
      "knowledge_graph": {
        "enabled": true,
        "config": {
          "server_url": "${MCP_SERVER_URL}",
          "namespace": "${MCP_NAMESPACE}",
          "api_key": "${MCP_API_KEY}"
        }
      },
      "vector_search": {
        "enabled": true,
        "config": {
          "project": "${GOOGLE_CLOUD_PROJECT}",
          "location": "${GOOGLE_CLOUD_LOCATION}",
          "endpoint_id": "${VECTOR_SEARCH_ENDPOINT_ID}",
          "deployed_index_id": "${DEPLOYED_INDEX_ID}"
        }
      }
    },
    "settings": {
      "default_provider": "hybrid",
      "sync_interval": 3600
    }
  },
  "chatHistory": {
    "import": {
      "enabled": true,
      "sources": ["claude"]
    }
  }
}
```

### Testing the Connection

You can test the connection to the Knowledge Graph using the `test_mcp_connection.py` script:

```bash
python scripts/test_mcp_connection.py --api-key your_api_key_here
```

This script tests the connection to the Knowledge Graph server and performs basic operations to verify that the Knowledge Graph is working correctly.

## Usage with Augment

### Importing Chat History

You can import Claude chat history to the Knowledge Graph using the `import_claude_history.py` script:

```bash
python scripts/import_claude_history.py --input path/to/chat_history.json --api-key your_api_key_here
```

This script parses Claude chat history from a JSON file, extracts entities and relationships, and stores them in the Knowledge Graph.

### Knowledge Graph Commands

The following commands can be used to interact with the Knowledge Graph:

- `!kg_on`: Enable Knowledge Graph integration
- `!kg_off`: Disable Knowledge Graph integration
- `!kg_query <entity_type> <query>`: Query the Knowledge Graph for entities of a specific type
- `!kg_store <entity_name> <entity_type> <observation>`: Store an entity in the Knowledge Graph
- `!kg_relationship <entity1> <relationship> <entity2>`: Store a relationship between two entities
- `!kg_context`: Get the current Knowledge Graph context

For more details, see the [Command Reference](#command-reference) section.

## Integration with Vector Search

The Knowledge Graph integration complements the Vector Search capabilities, enabling more sophisticated knowledge retrieval and reasoning. The `hybrid_search.py` module provides a unified interface for searching both the Knowledge Graph and Vector Search.

### Hybrid Search

The Hybrid Search approach combines the strengths of both Vector Search and Knowledge Graph:

1. **Vector Search**: Finds semantically similar documents based on embeddings.
2. **Knowledge Graph**: Finds entities and relationships based on structured knowledge.
3. **Hybrid Search**: Combines the results from both approaches, providing a more comprehensive answer.

Example usage:

```python
from tools.hybrid_search import HybridSearch

# Initialize the hybrid search
hybrid_search = HybridSearch(
    api_key="your_api_key_here",
    server_url="https://mcp.community.augment.co",
    namespace="vana-project",
    project="your_gcp_project",
    location="us-central1",
    endpoint_id="your_endpoint_id",
    deployed_index_id="your_deployed_index_id"
)

# Perform a hybrid search
results = hybrid_search.search("What is the VANA project?")

# Print the results
for result in results:
    print(f"Source: {result['source']}")
    print(f"Content: {result['content']}")
    print(f"Score: {result['score']}")
    print()
```

## Command Reference

### Knowledge Graph Commands

| Command | Description | Example |
|---------|-------------|---------|
| `!kg_on` | Enable Knowledge Graph integration | `!kg_on` |
| `!kg_off` | Disable Knowledge Graph integration | `!kg_off` |
| `!kg_query <entity_type> <query>` | Query the Knowledge Graph for entities of a specific type | `!kg_query project VANA` |
| `!kg_store <entity_name> <entity_type> <observation>` | Store an entity in the Knowledge Graph | `!kg_store VANA project "VANA is a multi-agent system"` |
| `!kg_relationship <entity1> <relationship> <entity2>` | Store a relationship between two entities | `!kg_relationship VANA uses ADK` |
| `!kg_context` | Get the current Knowledge Graph context | `!kg_context` |

### Hybrid Search Commands

| Command | Description | Example |
|---------|-------------|---------|
| `!hybrid_search <query>` | Perform a hybrid search | `!hybrid_search What is the VANA project?` |
| `!vector_search <query>` | Perform a Vector Search | `!vector_search What is the VANA project?` |
| `!kg_search <query>` | Perform a Knowledge Graph search | `!kg_search What is the VANA project?` |

## Implementation Details

### Knowledge Graph Client

The `KnowledgeGraphClient` class in `tools/knowledge_graph/knowledge_graph_manager.py` provides a client for interacting with the MCP Knowledge Graph. It includes methods for storing entities, querying the Knowledge Graph, storing relationships, and getting the current context.

### Vector Search Client

The `VectorSearchClient` class in `tools/vector_search/vector_search_client.py` provides a client for interacting with Vertex AI Vector Search. It includes methods for embedding text, searching the Vector Search index, and retrieving documents.

### Hybrid Search

The `HybridSearch` class in `tools/hybrid_search.py` provides a unified interface for searching both the Knowledge Graph and Vector Search. It includes methods for performing hybrid searches, Vector Search, and Knowledge Graph searches.

### MCP Integration

The MCP integration is implemented in the `n8n-mcp-server` repository. The server provides a REST API for interacting with the Knowledge Graph, as well as a WebSocket API for real-time communication with the agent.

## Troubleshooting

### Knowledge Graph Issues

- **Connection Issues**: If you're having trouble connecting to the Knowledge Graph server, check that the MCP server is running and that you have the correct API key.
- **Entity Storage Issues**: If you're having trouble storing entities, check that you have the correct namespace and that the entity name is unique.
- **Query Issues**: If you're having trouble querying the Knowledge Graph, check that you're using the correct entity type and query.

### Vector Search Issues

- **Connection Issues**: If you're having trouble connecting to Vector Search, check that you have the correct GCP project, location, endpoint ID, and deployed index ID.
- **Embedding Issues**: If you're having trouble embedding text, check that you have the correct API key and that the text is not too long.
- **Search Issues**: If you're having trouble searching Vector Search, check that you have the correct query and that the index is not empty.

### Hybrid Search Issues

- **Integration Issues**: If you're having trouble with hybrid search, check that both the Knowledge Graph and Vector Search are working correctly.
- **Performance Issues**: If hybrid search is slow, consider optimizing the search parameters or using a more efficient search strategy.
- **Result Quality Issues**: If the search results are not as expected, consider adjusting the search parameters or using a different search strategy.

## Further Reading

- [n8n-mcp-server-setup.md](n8n-mcp-server-setup.md): Guide to setting up the MCP server
- [n8n-mcp-integration.md](n8n-mcp-integration.md): Guide to integrating the MCP server with n8n
- [enhanced-memory-operations.md](enhanced-memory-operations.md): Guide to enhanced memory operations
- [vertex-ai-transition.md](vertex-ai-transition.md): Guide to transitioning from Ragie.ai to Vertex AI Vector Search
- [knowledge-graph-commands.md](knowledge-graph-commands.md): Detailed reference for Knowledge Graph commands
