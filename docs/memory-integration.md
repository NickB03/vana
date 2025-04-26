# Vana Memory Integration with Ragie

## Overview

This document describes how Project Vana integrates with Ragie.ai to provide memory capabilities to its agents. The implementation follows the Phase 1 plan of providing a simple, effective memory solution before moving to more complex architectures.

## Architecture

```
[ADK Agent] --> [Memory Tool] --> [Ragie API] --> [Vector Knowledge Base]
```

The memory system consists of:

1. **ADK Agent** - Uses the memory tool to retrieve relevant information
2. **Memory Tool** - Wraps the Ragie API in a simple interface
3. **Ragie Client** - Handles API communication with Ragie.ai
4. **Vector Knowledge Base** - Stores and retrieves embeddings (managed by Ragie)

## Setup Requirements

1. A Ragie.ai account (free tier is sufficient for Phase 1)
2. Project documents uploaded to Ragie
3. Ragie API key stored in `.env` file

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

- Integration with n8n for orchestration
- Transition to Vertex AI Vector Search
- MCP-based memory query protocol
- Multi-agent shared memory pools

## Operational Guidelines

- Monitor usage to stay within free tier limits (1000 queries/month)
- Keep API keys secure (never commit to repo)
- Update memory by uploading new documents to Ragie as needed
