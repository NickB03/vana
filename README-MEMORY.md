# Vana Memory System - Phase 1

## Overview

This branch implements the Phase 1 memory integration for Project Vana using Ragie.ai as the external vector database. This provides agents with the ability to ground their responses in project knowledge and maintain context across sessions.

## Quick Start

1. **Set up Ragie.ai**
   - Create a free account at [ragie.ai](https://ragie.ai)
   - Create a new project called "vana-memory"
   - Upload key project files: README.md, README-RAG.md, vana-adk-architecture.md, etc.
   - Copy your API key from the dashboard

2. **Install dependencies**
   ```bash
   pip install requests python-dotenv google-adk
   ```

3. **Configure API key**
   ```bash
   cp .env.example .env
   # Edit .env and add your Ragie API key
   ```

4. **Test the memory system**
   ```bash
   python test_memory.py
   ```

5. **Run an agent with memory**
   ```bash
   python run_memory_agent.py
   ```

## Implementation Details

See the full documentation in [docs/memory-integration.md](docs/memory-integration.md).

## Testing

Test the memory system using various queries to ensure it retrieves relevant information:

- "What is Project Vana?"
- "How does the agent architecture work?"
- "What is the status of Phase 1?"
- "How do we use Ragie for memory?"

## Next Steps

### Phase 2: n8n and MCP Integration (In Progress)
1. Deploy n8n on Railway.app for workflow orchestration
   - Set up manual memory save workflow
   - Set up daily memory sync workflow
   - Configure webhooks for MCP integration
2. Implement MCP-based memory protocol
   - Add memory commands (`!memory_on`, `!memory_off`, `!rag`)
   - Create memory buffer management system
   - Connect MCP interface to n8n workflows

### Phase 3: Advanced Features (Planned)
1. Integrate memory tools with all agents
2. Transition to Vertex AI Vector Search for long-term scalability
3. Implement multi-agent shared memory pools
4. Add advanced memory operations and analytics

## Architecture

### Current Architecture (Phase 1)

```
[ADK Agent] --> [Memory Tool] --> [Ragie API] --> [Vector Knowledge Base]
```

This simple architecture provides a clean, fast path to agent memory without excessive engineering.

### Planned Architecture (Phase 2)

```
[ADK Agent] <--> [MCP Interface] <--> [n8n Workflows] <--> [Ragie API] <--> [Vector Knowledge Base]
```

The Phase 2 architecture adds n8n for workflow orchestration and MCP for standardized command handling, providing more sophisticated memory management capabilities.