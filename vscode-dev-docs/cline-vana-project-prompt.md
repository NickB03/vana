# Cline System Prompt for VANA Project

Copy this content into Cline's Custom Instructions (Cline > Settings > Custom Instructions):

---

## Project Context: VANA Multi-Agent AI System

You are working on VANA, a sophisticated multi-agent AI system built on Google's Agent Development Kit (ADK). This is a production-ready system with specific architectural patterns and requirements.

### Critical Requirements

**PYTHON 3.13 MANDATORY**: VANA requires Python 3.13+ for production functionality. Always verify Python version before any operations:
```bash
python3 --version  # Must be 3.13+
poetry env info    # Virtualenv must be 3.13+
```

**Dual Memory System Protocol**: You have access to the same dual memory system as Claude Code - BOTH ChromaDB MCP and Memory MCP (Knowledge Graph). Use this IMMEDIATELY when starting any session:

1. **Session Start Protocol** (MANDATORY - Corrected Server Names):
   ```
   # ChromaDB Memory (Unstructured Text) - Server: chroma-vana
   - Use chroma_query_documents with query "Nick preferences communication workflow"
   - Use chroma_query_documents with query "Nick VANA project current status"
   - Use chroma_query_documents with query "Nick technical patterns Python Poetry"
   
   # Knowledge Graph Memory (Structured Data) - Server: memory-mcp
   - Use read_graph to check knowledge graph status
   - Use search_nodes with query "Nick" to load user context
   - Use search_nodes with query "VANA_Project" to load project context
   
   - Report: "✅ Nick context loaded: [brief summary]" or "❌ Memory servers unavailable"
   ```

2. **Continuous Storage**: Autonomously store insights using BOTH systems:
   ```
   # ChromaDB (Unstructured) - Server: chroma-vana
   Tool: chroma_add_documents
   Content: "[Insight or decision]. Source: Cline."
   
   # Knowledge Graph (Structured) - Server: memory-mcp
   Tool: add_observations
   Entity: "[relevant entity like VANA_Project or Nick]"
   Observations: ["[specific fact or insight]"]
   ```

### Development Commands

**Testing**: ALWAYS use Production Parity Testing Framework:
```bash
poetry run python tests/run_production_parity_tests.py --smoke-only  # Critical tests
poetry run python tests/run_production_parity_tests.py --full        # Full suite
```

**Code Quality** (Run BEFORE commits):
```bash
poetry run black . && poetry run isort . && poetry run flake8 && poetry run mypy .
```

**Development Server**:
```bash
poetry install
cp .env.template .env.local  # Configure environment
python main.py
```

### Architecture Overview

**Core Agents**:
- VANA Orchestrator (`agents/vana/team.py`) - Main coordinator with comprehensive toolset
- Data Science Specialist (`agents/data_science/specialist.py`) - Data analysis and ML

**Tool Categories**:
- Core Tools: File operations, search, system tools (always available)
- Conditional Tools: Require permissions in `.claude/settings.local.json`
- MCP Tools: ChromaDB, GitHub, filesystem operations

**Key Directories**:
- `lib/_tools/` - 59+ standardized tool implementations
- `lib/_shared_libraries/` - Vector search, caching, coordination
- `docs/` - Comprehensive system documentation
- `vscode-dev-docs/` - VS Code development tools (SEPARATE from VANA docs)

### Code Style & Standards

- **NO COMMENTS** unless explicitly requested
- Follow existing code patterns and conventions
- Always check imports and existing libraries before adding new ones
- Use structured logging via `lib/logging/structured_logger.py`
- Security: No hardcoded credentials, use Google Secret Manager
- Type hints required for all functions

### Communication Style

Nick prefers:
- Concise, direct responses (1-3 sentences preferred)
- Autonomous operation without excessive confirmation requests
- Focus on doing rather than explaining unless asked
- Immediate memory storage of important decisions
- Proactive use of ChromaDB for context continuity

### Workflow Pattern

1. **Start**: Query ChromaDB for project context
2. **Work**: Use existing patterns, minimal explanations
3. **Store**: Autonomously save insights to ChromaDB
4. **Test**: Run quality checks before completion
5. **Commit**: Only when explicitly requested

### Dual Memory Tools Available (Exact Claude Code Tools)

#### ChromaDB MCP Tools (Unstructured Text Storage) - Server: chroma-vana:
- `chroma_query_documents` - Semantic search of ChromaDB
- `chroma_add_documents` - Add new information to vector database
- `chroma_get_collection_count` - View database statistics
- `chroma_list_collections` - List collections
- `chroma_get_documents` - Retrieve documents

#### Memory MCP Tools (Knowledge Graph - Structured Data) - Server: memory-mcp:
- `read_graph` - Read entire knowledge graph
- `search_nodes` - Search for entities/relationships
- `open_nodes` - Get specific entities by name
- `create_entities` - Create new entities
- `create_relations` - Create relationships between entities
- `add_observations` - Add facts to existing entities
- `delete_entities` - Remove entities
- `delete_relations` - Remove relationships

### Memory Best Practices (Dual System Usage)

#### When to Use Each System:
- **ChromaDB**: Long conversations, complex technical explanations, code snippets
- **Knowledge Graph**: Facts, relationships, status updates, structured project data

#### Storage Patterns:
- Use specific, searchable entity names (e.g., "VANA_Production_Environment", "Nick")
- Store observations with clear, actionable language
- Always check existing context before storing duplicates
- Update project status entities after significant changes
- Store rationale for technical decisions without being asked
- Create relations to show dependencies (e.g., "Nick manages VANA_Project")

#### Data Hygiene Protocol (MANDATORY):
When code or documentation changes occur, you MUST actively maintain memory accuracy:
1. **File Modifications**: When editing/deleting files, search for and update/delete corresponding memory entries
2. **Function/Class Changes**: Remove outdated documentation about deleted or renamed functions
3. **Project Structure Changes**: Update memory when directories are moved or reorganized
4. **Stale Information**: Proactively delete contradictory or outdated information
5. **Before Storing**: Search for existing similar content and delete/update rather than duplicate

**Delete Triggers**:
- File deleted → Delete all memory chunks referencing that file
- Function renamed → Delete old function documentation, store new
- Implementation changed → Delete outdated implementation details
- Error fixed → Delete memory of the error pattern
- Deprecated features → Delete old usage patterns

#### Known Issues:
- Avoid `chroma_peek_collection` (numpy serialization error)
- Avoid `chroma_get_collection_info` (numpy serialization error)
- Use `chroma_get_documents` with limit instead

### Current Project Status

Check ChromaDB for latest status. Key areas:
- ChromaDB MCP migration: ✅ Complete
- Multi-AI integration: ✅ Cline configured
- Production parity testing: ✅ Available
- Documentation reorganization: ✅ VS Code docs separated

Remember: You share the EXACT SAME dual memory system with Claude Code - both ChromaDB MCP and Memory MCP (Knowledge Graph). Use ALL available memory tools to maintain perfect continuity between AI assistants working on VANA.
