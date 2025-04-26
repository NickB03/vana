# Vana Memory Integration with Ragie

## Overview

This document describes how Project Vana integrates with Ragie.ai to provide memory capabilities to its agents. The implementation follows the Phase 1 plan of providing a simple, effective memory solution before moving to more complex architectures.

## Architecture

### Current Architecture (Phase 1)

```
[ADK Agent] --> [Memory Tool] --> [Ragie API] --> [Vector Knowledge Base]
```

The current memory system consists of:

1. **ADK Agent** - Uses the memory tool to retrieve relevant information
2. **Memory Tool** - Wraps the Ragie API in a simple interface
3. **Ragie Client** - Handles API communication with Ragie.ai
4. **Vector Knowledge Base** - Stores and retrieves embeddings (managed by Ragie)

### Planned Architecture (Phase 2)

```
[ADK Agent] <--> [MCP Interface] <--> [n8n Workflows] <--> [Ragie API] <--> [Vector Knowledge Base]
```

The planned memory system will consist of:

1. **ADK Agent** - Uses MCP commands to interact with memory system
2. **MCP Interface** - Handles memory commands and routes to appropriate workflows
3. **n8n Workflows** - Orchestrates memory operations (save, retrieve, sync)
4. **Ragie Client** - Handles API communication with Ragie.ai
5. **Vector Knowledge Base** - Stores and retrieves embeddings (managed by Ragie)

## Setup Requirements

### Phase 1 (Current)
1. A Ragie.ai account (free tier is sufficient for Phase 1)
2. Project documents uploaded to Ragie
3. Ragie API key stored in `.env` file

### Phase 2 (Planned)
1. All Phase 1 requirements
2. n8n server deployed on Railway.app
3. MCP server configured for agent communication
4. Environment variables configured for n8n and MCP

## Implementation Details

### Memory Module

The `tools/memory` module provides:

- `ragie_client.py` - Core functions for interacting with Ragie API
- `agent_tools.py` - ADK integration for memory tools

### Key Functions

- `query_memory(prompt, top_k=5)` - Queries Ragie for relevant information
- `format_memory_results(results)` - Formats results for agent consumption
- `add_memory_tools_to_agent(agent_class)` - Adds memory tools to an agent

### Usage in Agents

```python
from google.adk import LlmAgent
from tools.memory.agent_tools import add_memory_tools_to_agent

class BenAgent(LlmAgent):
    name = "ben"
    model = "gemini-1.5-pro"
    tools = []

# Add memory tools to the agent
BenAgent = add_memory_tools_to_agent(BenAgent)
```

## Testing

Use the `test_memory.py` script to validate the Ragie integration:

```bash
python test_memory.py
```

## Future Enhancements

### Phase 2 Enhancements (In Progress)
- **n8n Integration**: Deploy n8n on Railway.app for workflow orchestration
  - Manual memory save workflow triggered by `!rag` command
  - Daily memory sync workflow for automatic backups
  - MCP-based memory command protocol
- **MCP Integration**: Implement Message Control Protocol for memory operations
  - Memory commands: `!memory_on`, `!memory_off`, `!rag`
  - Memory buffer management for chat sessions
  - Webhook integration with n8n workflows

### Phase 3 Enhancements (Planned)
- Transition to Vertex AI Vector Search for improved scalability
- Multi-agent shared memory pools
- Advanced memory operations (filtering, tagging, prioritization)
- Memory analytics and insights dashboard

## n8n and MCP Implementation (Phase 2)

### n8n Workflows

The n8n integration will include the following workflows:

1. **Manual Memory Save Workflow (`manual_chat_save.n8n.json`)**
   - Triggered by the `!rag` command
   - Gets the current chat buffer
   - Formats it for Ragie
   - Uploads to Ragie API
   - Clears the buffer after successful upload

2. **Daily Memory Sync Workflow (`daily_memory_sync.n8n.json`)**
   - Runs on a schedule (e.g., daily)
   - Pulls recent chat logs
   - Chunks and uploads them to Ragie

### MCP Commands

The MCP integration will support the following commands:

- `!memory_on` - Start buffering new chat turns
- `!memory_off` - Stop buffering, discard uncommitted memory
- `!rag` - Save buffered memory permanently into vector store

### Memory Buffer Management

A memory buffer manager will be implemented to:

- Store messages during active memory sessions
- Format messages for storage in the vector database
- Clear the buffer after successful saves or when commanded

### n8n Deployment on Railway

The n8n server will be deployed on Railway.app with the following configuration:

- Basic authentication enabled
- Webhook endpoints for MCP integration
- Environment variables for API keys and configuration
- Persistent storage for workflow state

## Operational Guidelines

### Phase 1 Guidelines
- Monitor usage to stay within free tier limits (1000 queries/month)
- Keep API keys secure (never commit to repo)
- Update memory by uploading new documents to Ragie as needed

### Phase 2 Guidelines
- Monitor n8n workflow executions (Railway.app dashboard)
- Set up alerts for failed workflows
- Implement regular backups of n8n workflows
- Monitor Railway.app resource usage to stay within free tier limits
