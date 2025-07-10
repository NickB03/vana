# MCP Documentation - VS Code Development Tools

**⚠️ CRITICAL: These MCP integrations are VS Code development tools ONLY. They are NOT part of the VANA runtime application.**

## What is MCP?

MCP (Model Context Protocol) is a protocol for integrating external tools with AI assistants like Claude. In this project, MCP servers are used exclusively for enhancing the VS Code development experience with Claude.

## Available Guides

### 🚨 Must Read First
- [**CRITICAL_MCP_VS_VANA_MEMORY.md**](./CRITICAL_MCP_VS_VANA_MEMORY.md) - Essential distinction between MCP tools and VANA's memory

### VS Code Development Tools
- [**CHROMA_MCP_GUIDE.md**](./CHROMA_MCP_GUIDE.md) - Semantic search for development sessions
- [**MEMORY_MCP_GUIDE.md**](./MEMORY_MCP_GUIDE.md) - Context management for development sessions

## Quick Summary

| What | Where | Purpose |
|------|-------|---------|
| **MCP Tools** | VS Code only | Help Claude during development |
| **VANA Memory** | `lib/_shared_libraries/adk_memory_service.py` | Production agent memory |

## Remember

- MCP tools = VS Code development aids
- VANA has its own separate memory system for agents
- Never confuse the two!