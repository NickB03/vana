# Development Memory Systems vs VANA Memory

## Overview

This document clarifies the distinction between VS Code development memory systems and VANA's application memory.

## VS Code Development Memory (Local Development Only)

### 1. ChromaDB MCP Server
- **Purpose**: Semantic search for Claude Code during development
- **Location**: External at `/Users/nick/Development/chromadb`
- **Tools**: `mcp__chroma-official__*`
- **Usage**: Stores conversation history, code snippets, decisions
- **NOT part of VANA application**

### 2. Knowledge Graph (memory-mcp)
- **Purpose**: Structured facts and relationships for development
- **Server**: `@modelcontextprotocol/server-memory`
- **Tools**: `mcp__memory__create_entities`, `mcp__memory__create_relations`
- **Usage**: Tracks project status, user preferences, relationships
- **NOT part of VANA application**

## VANA Application Memory (Production System)

### Google ADK Memory Service
- **Location**: `lib/_shared_libraries/adk_memory_service.py`
- **Technology**: Google Vertex AI Vector Search
- **Integration**: Built into VANA orchestrator and agents
- **Purpose**: Production multi-agent coordination and memory
- **This is the ACTUAL VANA memory system**

## Key Differences

| Aspect | VS Code Dev Memory | VANA App Memory |
|--------|-------------------|-----------------|
| Purpose | Claude Code context | Multi-agent coordination |
| Technology | ChromaDB + Knowledge Graph | Google ADK + Vertex AI |
| Location | External `/Users/nick/Development/chromadb` | Within VANA codebase |
| Persistence | Local development | Cloud production |
| Users | Claude Code only | VANA agents |

## Important Reminders

1. **Never confuse** development memory with production VANA memory
2. **ChromaDB migration** affects ONLY Claude Code, not VANA
3. **VANA agents** use Google ADK memory service exclusively
4. **Documentation** for each system should remain separate