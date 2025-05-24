# VANA Memory System

This document provides a quick start guide for working with the VANA memory system.

## Overview

The VANA memory system provides persistent storage and retrieval of information across sessions. It implements a hybrid approach combining Knowledge Graph (via MCP), Vector Search (via Vertex AI), and local fallback storage.

## Getting Started

### Prerequisites

1. Set up environment variables in `.env` file:

```
# Memory System Configuration
MCP_ENDPOINT=https://mcp.community.augment.co
MCP_NAMESPACE=vana-project
MCP_API_KEY=your_api_key_here
MEMORY_SYNC_INTERVAL=300
MEMORY_CACHE_SIZE=1000
MEMORY_CACHE_TTL=3600
ENTITY_HALF_LIFE_DAYS=30
VANA_DATA_DIR=./data

# For local development
USE_LOCAL_MCP=true
```

2. For local development, start the local MCP server:

```bash
cd docker/mcp-server
docker-compose up -d
```

### Initialization

Initialize the memory system:

```bash
python scripts/initialize_memory.py
```

To reset and seed with initial data:

```bash
python scripts/initialize_memory.py --reset --seed
```

### Testing

Run the memory system tests:

```bash
python tests/test_memory_system.py
```

Run the memory diagnostic tool:

```bash
python scripts/memory_diagnostic.py
```

## Usage

### Basic Usage

```python
from tools.mcp_memory_client import MCPMemoryClient
from tools.memory_manager import MemoryManager

# Initialize components
mcp_client = MCPMemoryClient()
memory_manager = MemoryManager(mcp_client)

# Initialize memory system
memory_manager.initialize()

# Store an entity
result = memory_manager.store_entity(
    "Entity Name",
    "Entity Type",
    ["Observation 1", "Observation 2"]
)

# Retrieve an entity
entity = memory_manager.retrieve_entity("Entity Name")

# Search for entities
results = memory_manager.search_entities("search query", entity_type="Entity Type")

# Synchronize with memory server
memory_manager.sync()
```

### Advanced Usage

For more advanced usage, refer to the [Memory Architecture](memory-architecture.md) documentation.

## Troubleshooting

### MCP Server Connection Issues

If you're having trouble connecting to the MCP server:

1. Run the diagnostic tool:

```bash
python scripts/memory_diagnostic.py
```

2. Check if the MCP server is running:

```bash
curl http://localhost:5000/vana-dev/status  # For local server
```

3. Verify your API key and namespace in the `.env` file.

### Local Storage Issues

If you're experiencing issues with local storage:

1. Check the data directory permissions.
2. Reset the local database:

```bash
python scripts/initialize_memory.py --reset
```

3. Check the logs for SQLite errors.

## Architecture

For detailed information about the memory system architecture, refer to the [Memory Architecture](memory-architecture.md) documentation.
