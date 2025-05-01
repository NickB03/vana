# VANA Memory Architecture

This document describes the memory architecture for the VANA agent system, including the implementation details, components, and how they interact.

## Overview

VANA's memory system is designed to provide persistent, reliable storage and retrieval of information across sessions. It implements a hybrid approach combining:

1. **Knowledge Graph**: Structured entity-relationship storage via MCP (Model Context Protocol)
2. **Vector Search**: Semantic search capabilities via Vertex AI Vector Search
3. **Local Fallback**: SQLite-based local storage for offline operation and reliability

The system is designed to be resilient to failures, with graceful degradation when external services are unavailable.

## Components

### 1. MCP Memory Client

The `MCPMemoryClient` is responsible for communicating with the MCP server to store and retrieve entities and relationships.

Key features:
- Connection verification and error handling
- Automatic fallback to local storage when MCP server is unavailable
- Support for entity operations (store, retrieve, search, delete)
- Delta-based synchronization for efficient updates

### 2. Memory Manager

The `MemoryManager` orchestrates memory operations and manages the interaction between different storage mechanisms.

Key features:
- Initialization and synchronization of memory data
- Local SQLite database for fallback storage
- Automatic switching between MCP server and local storage
- Entity management (store, retrieve, search)

### 3. Memory Cache

The `MemoryCache` provides a fast, in-memory cache for frequently accessed entities.

Key features:
- Time-based expiration (TTL)
- Least-recently-used (LRU) eviction policy
- Indexing by entity type and name for fast lookups
- Search capabilities for cached entities
- Performance statistics tracking

## Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    VANA Agent   │     │  Agent Engine   │     │   Web Server    │
│                 │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────┬───────┴───────────────┬───────┘
                         │                       │
                 ┌───────▼───────┐       ┌───────▼───────┐
                 │               │       │               │
                 │ Memory Manager│◄──────┤ Memory Cache  │
                 │               │       │               │
                 └───────┬───────┘       └───────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
┌────────▼────────┐     │     ┌─────────▼──────────┐
│                 │     │     │                    │
│  MCP Memory     │     │     │  SQLite Local      │
│  Client         │     │     │  Storage           │
│                 │     │     │                    │
└────────┬────────┘     │     └────────────────────┘
         │              │
         │     ┌────────▼────────┐
         │     │                 │
         │     │  Hybrid Search  │
         │     │  Delta          │
         │     │                 │
         │     └────────┬────────┘
         │              │
┌────────▼────────┐     │     ┌────────▼────────┐
│                 │     │     │                 │
│  MCP Server     │     │     │  Vector Search  │
│  (Knowledge     │     │     │  (Semantic      │
│   Graph)        │     │     │   Search)       │
│                 │     │     │                 │
└─────────────────┘     │     └─────────────────┘
                        │
                ┌───────▼───────┐
                │               │
                │  Web Search   │
                │               │
                └───────────────┘
```

## Configuration

The memory system can be configured using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `VANA_ENV` | Environment (development, test, production) | development |
| `USE_LOCAL_MCP` | Whether to use local MCP server in development | true |
| `MCP_ENDPOINT` | MCP server endpoint | https://mcp.community.augment.co |
| `MCP_NAMESPACE` | MCP namespace | vana-project |
| `MCP_API_KEY` | MCP API key | - |
| `MEMORY_SYNC_INTERVAL` | Interval in seconds between syncs | 300 |
| `MEMORY_CACHE_SIZE` | Maximum number of items in cache | 1000 |
| `MEMORY_CACHE_TTL` | Time-to-live in seconds for cache items | 3600 |
| `ENTITY_HALF_LIFE_DAYS` | Half-life in days for entity importance | 30 |
| `VANA_DATA_DIR` | Directory for local data storage | . |

## Development Setup

For local development, a Docker-based MCP server is provided:

```bash
cd docker/mcp-server
docker-compose up -d
```

This will start a local MCP server on port 5000 with the following configuration:
- Endpoint: http://localhost:5000
- Namespace: vana-dev
- API Key: local_dev_key

## Testing

The memory system includes comprehensive tests:

```bash
python tests/test_memory_system.py
```

For diagnostic purposes, a memory diagnostic tool is also provided:

```bash
python scripts/memory_diagnostic.py
```

## Comparison with Google ADK

While Google's Agent Development Kit (ADK) provides its own memory system through `VertexAiRagMemoryService`, VANA's implementation differs in several ways:

1. **Hybrid Storage**: VANA combines Knowledge Graph (MCP) with Vector Search, while ADK primarily uses Vertex AI RAG Corpus.
2. **Local Fallback**: VANA includes SQLite-based local storage for offline operation, which ADK does not provide.
3. **Delta-based Updates**: VANA implements efficient delta-based synchronization to minimize data transfer.
4. **Entity Relationships**: VANA's Knowledge Graph allows explicit modeling of relationships between entities.
5. **Customizable Caching**: VANA provides a sophisticated caching layer with configurable TTL and eviction policies.

## Future Improvements

Planned improvements to the memory system include:

1. **Memory Compression**: Implementing techniques to compress and summarize memory content for more efficient storage.
2. **Importance-based Retention**: Using ML to determine which memories to retain based on importance and relevance.
3. **Cross-agent Memory Sharing**: Enabling memory sharing between different agent instances.
4. **Memory Visualization**: Tools for visualizing the knowledge graph and entity relationships.
5. **Automated Testing**: Expanding test coverage and implementing automated memory system verification.
