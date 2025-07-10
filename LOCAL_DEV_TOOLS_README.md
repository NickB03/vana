# 🛠️ Local Development Tools Notice

## ⚠️ IMPORTANT: Chroma DB and Memory MCP are NOT part of VANA

The following tools and documentation have been excluded from the repository as they are **strictly for local VSCode development** to BUILD VANA, not components of VANA itself:

### 🚫 Excluded Local Development Tools:

1. **Chroma DB Scripts** (in `scripts/`)
   - `chroma_visual_tools.py`
   - `cleanup_chromadb_duplicates.py`
   - `use_visual_chroma.py`
   - `visual_chroma_wrapper.py`

2. **Memory MCP Client**
   - `tools/mcp_memory_client.py`

3. **VSCode Development Documentation** (`vscode-dev-docs/`)
   - Chroma MCP setup guides
   - Memory system documentation
   - Cline integration guides

4. **Local Memory Database**
   - `.memory_db/` directory
   - `chroma.sqlite3` files

### ✅ What IS Part of VANA:

- **Google ADK** - Core framework
- **VANA Orchestrator** - Main agent system
- **Specialist Agents** - Code execution, data science agents
- **ADK Tools** - File operations, search, task analysis
- **Vector Search** - Production memory system (Google Cloud)

### 📌 For Developers:

If you need the local development tools for building/testing VANA:
1. These tools are for VSCode/Claude Code development only
2. They help with local memory and context management
3. They are NOT deployed or used in production VANA

The production VANA system uses Google Cloud services for memory and vector search, not local Chroma DB.

---
*This clarification added: July 10, 2025*
