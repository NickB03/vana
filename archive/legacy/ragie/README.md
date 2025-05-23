# Legacy Ragie.ai Implementation

This directory contains the legacy implementation of the VANA memory system using Ragie.ai as the vector database. These files are preserved for historical reference but are no longer actively used in the project.

## Transition to Vertex AI Vector Search and MCP Knowledge Graph

The project has transitioned from Ragie.ai to Vertex AI Vector Search for memory storage and retrieval, and has integrated with MCP Knowledge Graph for structured knowledge representation. This transition provides several benefits:

1. **Scalability**: Better handling of large knowledge bases
2. **Performance**: Faster query response times
3. **Integration**: Seamless integration with other Google Cloud services
4. **Cost-effectiveness**: More predictable pricing for production use
5. **Control**: Greater control over the vector search infrastructure
6. **Structured Knowledge**: Addition of Knowledge Graph capabilities for structured knowledge representation

## Files in this Directory

- **ragie_client.py**: Core client for interacting with Ragie.ai API
- **agent_tools.py**: ADK integration for memory tools using Ragie.ai
- **memory_enabled_ben.py**: Memory-enabled Ben agent using Ragie.ai
- **direct_ragie_test.py**: Test script for directly querying Ragie.ai
- **test_memory.py**: Test script for Ragie.ai memory integration
- **run_memory_agent.py**: Script to run a memory-enabled agent using Ragie.ai
- **n8n-workflows/**: n8n workflows for Ragie.ai integration
  - **manual_memory_save.json**: Workflow for manual memory saving to Ragie.ai
  - **daily_memory_sync.json**: Workflow for daily memory syncing to Ragie.ai

## Current Implementation

The current implementation uses:

1. **Vertex AI Vector Search**: For semantic search and memory storage
2. **MCP Knowledge Graph**: For structured knowledge representation
3. **n8n Workflows**: Updated to work with Vertex AI and Knowledge Graph
4. **Hybrid Search**: Combining Vector Search and Knowledge Graph for comprehensive results

For details on the current implementation, see:
- [docs/vertex-ai-transition.md](../../docs/vertex-ai-transition.md)
- [docs/knowledge-graph-setup.md](../../docs/knowledge-graph-setup.md)
- [docs/knowledge-graph-commands.md](../../docs/knowledge-graph-commands.md)
