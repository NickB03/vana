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

1. Integrate memory tools with all agents
2. Set up n8n for more sophisticated memory orchestration
3. Transition to Vertex AI Vector Search for long-term scalability
4. Implement MCP-based memory protocol

## Architecture

```
[ADK Agent] --> [Memory Tool] --> [Ragie API] --> [Vector Knowledge Base]
```

This simple architecture provides a clean, fast path to agent memory without excessive engineering.