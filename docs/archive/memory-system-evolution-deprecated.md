# Vana Memory System

## Overview

The VANA memory system provides agents with the ability to ground their responses in project knowledge and maintain context across sessions. The system has evolved through multiple phases:

1. **Phase 1**: Initial implementation using Ragie.ai as the external vector database
2. **Phase 2**: Integration with n8n and MCP for workflow orchestration and standardized command handling
3. **Phase 3**: Enhanced memory operations with filtering, tagging, and analytics
4. **Phase 4 (Current)**: Transition to Vertex AI Vector Search and integration with MCP Knowledge Graph

This document provides an overview of the memory system and its components.

## Quick Start

### Option 1: Vertex AI Vector Search (Recommended)

1. **Set up Vertex AI Vector Search**
   - Follow the instructions in [Vector Search Integration](README.md#vector-search-integration)
   - Ensure your service account has the necessary permissions
   - Verify that the Vector Search index is properly configured

2. **Install dependencies**
   ```bash
   pip install google-cloud-aiplatform==1.38.0 python-dotenv google-adk
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your Google Cloud credentials
   ```

4. **Test the Vector Search system**
   ```bash
   python test_vector_search.py
   ```

5. **Run an agent with Vector Search memory**
   ```bash
   python run_vector_search_agent.py
   ```

### Option 2: MCP Knowledge Graph

1. **Set up MCP Knowledge Graph**
   - Obtain an API key from the MCP community server
   - Configure the augment-config.json file with your API key
   - See [Knowledge Graph Setup](docs/knowledge-graph-setup.md) for details

2. **Install dependencies**
   ```bash
   pip install requests python-dotenv google-adk
   ```

3. **Test the Knowledge Graph connection**
   ```bash
   python scripts/test_mcp_connection.py --api-key YOUR_API_KEY
   ```

4. **Import Claude chat history (optional)**
   ```bash
   python scripts/import_claude_history.py --input claude_history.json --api-key YOUR_API_KEY
   ```

5. **Use Knowledge Graph commands in conversations**
   - `!kg_query [entity_type] [query]` - Search for entities
   - `!kg_store [entity_name] [entity_type] [observation]` - Store new information
   - `!kg_context` - Show current Knowledge Graph context

### Option 3: Ragie.ai (Legacy)

1. **Set up Ragie.ai**
   - Create a free account at [ragie.ai](https://ragie.ai)
   - Create a new project called "vana-memory"
   - Upload key project files: README.md, README-RAG.md, vana-adk-architecture.md, etc.
   - Copy your API key from the dashboard

2. **Configure API key**
   ```bash
   cp .env.example .env
   # Edit .env and add your Ragie API key
   ```

3. **Test the memory system**
   ```bash
   python test_memory.py
   ```

## Implementation Details

See the full documentation in [docs/memory-integration.md](docs/memory-integration.md).

## Testing

Test the memory system using various queries to ensure it retrieves relevant information:

- "What is Project Vana?"
- "How does the agent architecture work?"
- "What is the status of Phase 1?"
- "How do we use Ragie for memory?"

## Current Status

### Phase 2: n8n and MCP Integration (Completed)
1. ✅ Deploy n8n on Railway.app for workflow orchestration
   - ✅ Set up manual memory save workflow
   - ✅ Set up daily memory sync workflow
   - ✅ Configure webhooks for MCP integration
2. ✅ Implement MCP-based memory protocol
   - ✅ Add memory commands (`!memory_on`, `!memory_off`, `!rag`)
   - ✅ Create memory buffer management system
   - ✅ Connect MCP interface to n8n workflows

### Phase 3: Advanced Features (Completed)
1. ✅ Enhanced memory operations
   - ✅ Memory filtering by date, tags, and relevance
   - ✅ Memory tagging for better organization
   - ✅ Memory prioritization based on query and context
   - ✅ Memory analytics for insights
2. ✅ Integrate memory tools with all agents
3. ✅ Set up infrastructure for Vertex AI Vector Search transition
4. ✅ Implement multi-agent shared memory pools

### Phase 4: Knowledge Graph and Vertex AI Transition (In Progress)
1. ✅ Set up MCP Knowledge Graph configuration
2. ✅ Create scripts for importing Claude chat history
3. ✅ Implement entity and relationship extraction
4. ✅ Create Knowledge Graph documentation
5. 🔲 Obtain API key from MCP community server
6. 🔲 Test connection to hosted MCP Knowledge Graph
7. 🔲 Import Claude chat history into Knowledge Graph
8. 🔲 Integrate Knowledge Graph commands with agents
9. 🔲 Update memory tools to use Vertex AI instead of Ragie.ai
10. 🔲 Test memory operations with the new backend

See [docs/enhanced-memory-operations.md](docs/enhanced-memory-operations.md) for details on the enhanced memory operations and [docs/knowledge-graph-setup.md](docs/knowledge-graph-setup.md) for Knowledge Graph setup.

## Architecture

### Phase 1: Initial Implementation

```
[ADK Agent] --> [Memory Tool] --> [Ragie API] --> [Vector Knowledge Base]
```

This simple architecture provided a clean, fast path to agent memory without excessive engineering.

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

This architecture included:
- n8n for workflow orchestration
- MCP for standardized command handling
- Enhanced memory operations for advanced memory capabilities
- Ragie.ai as the vector knowledge base

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

The current architecture includes:
- n8n for workflow orchestration
- MCP for standardized command handling
- Enhanced memory operations for advanced memory capabilities
- Vertex AI Vector Search for semantic search and memory storage
- MCP Knowledge Graph for persistent memory across sessions
- Hybrid approach combining Vector Search and Knowledge Graph

This provides a comprehensive knowledge management system with both semantic search capabilities and structured knowledge representation.
