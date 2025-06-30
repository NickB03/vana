# VS Code Development Documentation

This folder contains documentation specific to VS Code development environment and Claude Code setup. These documents are **separate from VANA application documentation** to avoid confusion.

## Contents

### Development Environment Setup
- **[ChromaDB Migration](./chroma-official-mcp.md)** - Migration from custom ChromaDB to official Chroma MCP server
- **[MCP Server Configuration](./mcp-server-setup.md)** - How to configure MCP servers for Claude Code (TODO)
- **[Development Memory Systems](./memory-systems.md)** - Understanding VS Code memory vs VANA memory (TODO)

### Key Distinctions

**VS Code Development Memory (This Folder):**
- ChromaDB MCP server for Claude Code context
- Knowledge Graph (memory-mcp) for development facts
- External storage at `/Users/nick/Development/chromadb`
- Used ONLY during development sessions

**VANA Application Memory (Not This Folder):**
- Google ADK memory service (`lib/_shared_libraries/adk_memory_service.py`)
- Vertex AI vector search integration
- Part of the VANA multi-agent system
- Production application functionality

## Important Notes

1. **Do NOT confuse** VS Code development tools with VANA application components
2. **ChromaDB here** is for Claude Code's memory during development
3. **VANA's memory** uses Google ADK and is completely separate
4. All documentation in this folder relates to **development environment only**