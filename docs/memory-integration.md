# Vana Memory Integration

## Overview

This document describes the memory integration for Project Vana. The system has evolved through multiple phases:

1. **Phase 1**: Initial implementation using Ragie.ai as the external vector database
2. **Phase 2**: Integration with n8n and MCP for workflow orchestration and standardized command handling
3. **Phase 3**: Enhanced memory operations with filtering, tagging, and analytics
4. **Phase 4 (Current)**: Transition to Vertex AI Vector Search and integration with MCP Knowledge Graph

The implementation follows a phased approach, starting with a simple, effective memory solution before moving to more complex architectures.

## Architecture

### Phase 1: Initial Implementation

```
[ADK Agent] --> [Memory Tool] --> [Ragie API] --> [Vector Knowledge Base]
```

The Phase 1 memory system consisted of:

1. **ADK Agent** - Uses the memory tool to retrieve relevant information
2. **Memory Tool** - Wraps the Ragie API in a simple interface
3. **Ragie Client** - Handles API communication with Ragie.ai
4. **Vector Knowledge Base** - Stores and retrieves embeddings (managed by Ragie)

### Phase 2-3: n8n and MCP Integration

```
                                                                 ┌─────────────────────┐
                                                                 │  Enhanced Memory    │
                                                                 │    Operations       │
                                                                 └─────────┬───────────┘
                                                                           │
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────▼─────────┐     ┌─────────────────────┐
│ ADK Agent   │<--->│  MCP Interface  │<--->│  n8n Workflows  │<--->│  Ragie API    │<--->│ Vector Knowledge    │
└─────────────┘     └─────────────────┘     └─────────────────┘     └───────────────┘     │ Base                │
                                                                                          └─────────────────────┘
```

The Phase 2-3 memory system consisted of:

1. **ADK Agent** - Uses MCP commands to interact with memory system
2. **MCP Interface** - Handles memory commands and routes to appropriate workflows
3. **n8n Workflows** - Orchestrates memory operations (save, retrieve, sync)
4. **Enhanced Memory Operations** - Provides advanced memory capabilities
5. **Ragie Client** - Handles API communication with Ragie.ai
6. **Vector Knowledge Base** - Stores and retrieves embeddings (managed by Ragie)

### Phase 4: Knowledge Graph and Vertex AI Transition (Current)

```
                                                                 ┌─────────────────────┐
                                                                 │  Enhanced Memory    │
                                                                 │    Operations       │
                                                                 └─────────┬───────────┘
                                                                           │
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────▼─────────┐     ┌─────────────────────┐
│ ADK Agent   │<--->│  MCP Interface  │<--->│  n8n Workflows  │<--->│  Vertex AI    │<--->│ Vector Search       │
└─────────────┘     └─────────────────┘     └─────────────────┘     └───────────────┘     │ Index               │
                            │                                                             └─────────────────────┘
                            │
                            ▼
                    ┌───────────────────┐
                    │  MCP Knowledge    │
                    │  Graph            │
                    └───────────────────┘
```

The current memory system consists of:

1. **ADK Agent** - Uses MCP commands and Knowledge Graph commands
2. **MCP Interface** - Handles memory commands and routes to appropriate workflows
3. **n8n Workflows** - Orchestrates memory operations (save, retrieve, sync)
4. **Enhanced Memory Operations** - Provides advanced memory capabilities
5. **Vertex AI** - Handles vector embeddings and semantic search
6. **Vector Search Index** - Stores and retrieves embeddings (managed by Vertex AI)
7. **MCP Knowledge Graph** - Provides persistent memory across sessions with structured knowledge

## Setup Requirements

### Phase 1 (Legacy)
1. A Ragie.ai account (free tier is sufficient for Phase 1)
2. Project documents uploaded to Ragie
3. Ragie API key stored in `.env` file

### Phase 2-3 (Legacy)
1. All Phase 1 requirements
2. n8n server deployed on Railway.app
3. MCP server configured for agent communication
4. Environment variables configured for n8n and MCP

### Phase 4 (Current)
1. Google Cloud account with Vertex AI enabled
2. Vector Search index created and deployed
3. Service account with appropriate permissions
4. n8n server deployed on Railway.app
5. MCP server configured for agent communication
6. Environment variables configured for all services
7. MCP Knowledge Graph API key from community server
8. Augment configuration for Knowledge Graph integration

## Implementation Details

### Memory Module

The `tools/memory` module provides:

- `ragie_client.py` - Core functions for interacting with Ragie API (Legacy)
- `agent_tools.py` - ADK integration for memory tools
- `buffer_manager.py` - Memory buffer management for conversation recording
- `mcp_interface.py` - MCP interface for memory commands
- `enhanced_operations.py` - Advanced memory operations

### Vector Search Module

The `tools/vector_search` module provides:

- `vector_search_client.py` - Core functions for interacting with Vertex AI Vector Search
- `search_knowledge_tool.py` - ADK integration for Vector Search tools
- `batch_update.py` - Batch update functionality for Vector Search index

### Knowledge Graph Module

The `tools/knowledge_graph` module provides:

- `mcp_knowledge_graph.py` - Core functions for interacting with MCP Knowledge Graph
- `entity_extraction.py` - Entity and relationship extraction from conversations
- `kg_commands.py` - Knowledge Graph commands for agents

### Key Functions

- `query_memory(prompt, top_k=5)` - Queries for relevant information
- `format_memory_results(results)` - Formats results for agent consumption
- `add_memory_tools_to_agent(agent_class)` - Adds memory tools to an agent
- `search_knowledge(query, top_k=5)` - Searches Vector Search index
- `filter_memories_by_date(query, start_date, end_date)` - Filters memories by date
- `filter_memories_by_tags(query, tags)` - Filters memories by tags
- `kg_query(entity_type, query)` - Queries Knowledge Graph for entities
- `kg_store(entity_name, entity_type, observation)` - Stores information in Knowledge Graph

### Usage in Agents

```python
from google.adk import Agent
from tools.memory.agent_tools import add_memory_tools_to_agent
from tools.vector_search.search_knowledge_tool import add_search_knowledge_tool
from tools.knowledge_graph.kg_commands import add_knowledge_graph_tools

class BenAgent(Agent):
    name = "ben"
    model = "gemini-2.0-flash"
    tools = []

# Add memory tools to the agent
BenAgent = add_memory_tools_to_agent(BenAgent)

# Add Vector Search tools to the agent
BenAgent = add_search_knowledge_tool(BenAgent)

# Add Knowledge Graph tools to the agent
BenAgent = add_knowledge_graph_tools(BenAgent)
```

## Testing

### Testing Ragie Integration (Legacy)

Use the `test_memory.py` script to validate the Ragie integration:

```bash
python test_memory.py
```

### Testing Vector Search Integration

Use the `test_vector_search.py` script to validate the Vector Search integration:

```bash
python test_vector_search.py
```

### Testing Knowledge Graph Integration

Use the `test_mcp_connection.py` script to validate the Knowledge Graph connection:

```bash
python scripts/test_mcp_connection.py --api-key YOUR_API_KEY
```

### Testing Enhanced Memory Operations

Use the `test_error_handling.py` script to validate the enhanced memory operations:

```bash
python scripts/test_error_handling.py --verbose
```

## Current Status and Future Enhancements

### Phase 2 Enhancements (Completed)
- ✅ **n8n Integration**: Deploy n8n on Railway.app for workflow orchestration
  - ✅ Manual memory save workflow triggered by `!rag` command
  - ✅ Daily memory sync workflow for automatic backups
  - ✅ MCP-based memory command protocol
- ✅ **MCP Integration**: Implement Message Control Protocol for memory operations
  - ✅ Memory commands: `!memory_on`, `!memory_off`, `!rag`
  - ✅ Memory buffer management for chat sessions
  - ✅ Webhook integration with n8n workflows

### Phase 3 Enhancements (Completed)
- ✅ Enhanced memory operations with filtering, tagging, and analytics
- ✅ Multi-agent shared memory pools
- ✅ Memory analytics and insights dashboard

### Phase 4 Enhancements (In Progress)
- ✅ Set up MCP Knowledge Graph configuration
- ✅ Create scripts for importing Claude chat history
- ✅ Implement entity and relationship extraction
- ✅ Create Knowledge Graph documentation
- 🔲 Obtain API key from MCP community server
- 🔲 Test connection to hosted MCP Knowledge Graph
- 🔲 Import Claude chat history into Knowledge Graph
- 🔲 Integrate Knowledge Graph commands with agents
- 🔲 Update memory tools to use Vertex AI instead of Ragie.ai
- 🔲 Test memory operations with the new backend

### Future Enhancements (Planned)
- Memory summarization for large memory sets
- Visual representation of memory connections
- Automatic memory pruning for redundant or outdated memories
- Cross-agent memory sharing with fine-grained permissions
- Memory-based agent specialization and learning

## n8n and MCP Implementation (Completed)

### n8n Workflows

The n8n integration includes the following workflows:

1. **Manual Memory Save Workflow (`manual_memory_save.json`)**
   - Triggered by the `!rag` command
   - Gets the current chat buffer
   - Formats it for storage
   - Uploads to the vector database
   - Supports tagging of memories
   - Clears the buffer after successful upload

2. **Daily Memory Sync Workflow (`daily_memory_sync.json`)**
   - Runs on a schedule (e.g., daily)
   - Pulls recent chat logs
   - Chunks and uploads them to the vector database
   - Adds metadata for tracking and filtering

### MCP Commands

The MCP integration supports the following commands:

#### Basic Memory Commands
- `!memory_on` - Start buffering new chat turns
- `!memory_off` - Stop buffering, discard uncommitted memory
- `!rag` - Save buffered memory permanently into vector store
- `!rag tag <tag1> <tag2> ...` - Save with tags

#### Enhanced Memory Commands
- `!memory_filter date <query> <start_date> <end_date>` - Filter memories by date
- `!memory_filter tags <query> <tag1> <tag2> ...` - Filter memories by tags
- `!memory_analytics` - Get analytics about stored memories
- `!memory_help` - Show help text for memory commands

#### Knowledge Graph Commands
- `!kg_query [entity_type] [query]` - Search for entities in the Knowledge Graph
- `!kg_store [entity_name] [entity_type] [observation]` - Store new information
- `!kg_context` - Show the current Knowledge Graph context

### Memory Buffer Management

The memory buffer manager:

- Stores messages during active memory sessions
- Formats messages for storage in the vector database
- Supports tagging and metadata
- Handles buffer overflow gracefully
- Clears the buffer after successful saves or when commanded

### n8n Deployment on Railway

The n8n server is deployed on Railway.app with the following configuration:

- Basic authentication enabled
- Webhook endpoints for MCP integration
- Environment variables for API keys and configuration
- Persistent storage for workflow state
- Automatic restarts on failure

## Operational Guidelines

### Phase 1 Guidelines (Legacy)
- Monitor usage to stay within free tier limits (1000 queries/month)
- Keep API keys secure (never commit to repo)
- Update memory by uploading new documents to Ragie as needed

### Phase 2-3 Guidelines (Legacy)
- Monitor n8n workflow executions (Railway.app dashboard)
- Set up alerts for failed workflows
- Implement regular backups of n8n workflows
- Monitor Railway.app resource usage to stay within free tier limits

### Phase 4 Guidelines (Current)
- Store all API keys and credentials in the `secrets/.env` file
- Monitor Vertex AI Vector Search usage and costs
- Set up regular backups of the Vector Search index
- Monitor n8n workflow executions (Railway.app dashboard)
- Test Knowledge Graph connection regularly
- Import new Claude chat history periodically
- Monitor Railway.app resource usage
- Implement regular health checks for all components
- Keep documentation up to date with any changes

### Security Guidelines
- Never commit API keys or credentials to the repository
- Use environment variables for all sensitive information
- Implement proper authentication for all services
- Regularly rotate API keys and credentials
- Limit service account permissions to only what is needed
- Monitor for unauthorized access attempts
