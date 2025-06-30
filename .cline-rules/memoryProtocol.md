# Cline Memory Protocol for VANA

## Dual Memory System Integration (Matching Claude Code Exactly)

### Session Start Protocol (MANDATORY)

Every Cline session MUST begin with these memory queries matching Claude Code's exact pattern:

```bash
# ChromaDB Memory System (Unstructured Text)
# 1. Check ChromaDB memory status
Tool: mcp__memory__memory_stats
Purpose: View database statistics and health

# 2. Search for Nick's preferences and communication style
Tool: mcp__memory__search_memory
Query: "Nick preferences communication workflow"
Purpose: Load communication style and autonomous expectations

# 3. Search for current project status
Tool: mcp__memory__search_memory
Query: "Nick VANA project current status"
Purpose: Load project state, recent work, priorities

# 4. Search for technical patterns
Tool: mcp__memory__search_memory
Query: "Nick technical patterns Python Poetry"
Purpose: Load Python 3.13+ requirements and documentation standards

# Knowledge Graph Memory System (Structured Data)
# 5. Check knowledge graph status
Tool: mcp__memory__read_graph
Purpose: Check knowledge graph health and entity count

# 6. Load user context
Tool: mcp__memory__search_nodes
Query: "Nick"
Purpose: Load structured user preferences and relationships

# 7. Load project context
Tool: mcp__memory__search_nodes
Query: "VANA_Project"
Purpose: Load structured project status and relationships

# 8. Report status
SUCCESS: "✅ Nick context loaded: [brief summary from both systems]"
FAILURE: "❌ Memory servers unavailable - operating without persistent context"
```

### Continuous Storage Protocol

Autonomously store important information using BOTH memory systems:

```bash
# ChromaDB Storage (Unstructured)
Tool: mcp__memory__store_memory
Content: "Important insight or decision content. Source: Cline."
Purpose: Add to ChromaDB vector database

# Knowledge Graph Storage (Structured)
Tool: mcp__memory__add_observations
Entity: "Nick" or "VANA_Project" or "[relevant entity]"
Observations: ["Specific fact or insight"]
Purpose: Add structured facts to knowledge graph
```

### What to Store

#### Always Store
- **Technical Decisions**: Architecture choices, tool selections, pattern changes
- **Progress Updates**: Completed tasks, current status, blockers encountered
- **Code Insights**: Important discoveries about the codebase
- **User Corrections**: When Nick provides feedback or corrections
- **Problem Solutions**: How issues were resolved

#### Storage Categories (use in metadata.type)
- `code` - Code changes, implementations, refactoring
- `conversation` - Important discussion points with Nick
- `decision` - Technical or architectural decisions made
- `insight` - Discoveries about the system or codebase
- `progress` - Status updates, completed tasks

### Query Patterns

#### Before Starting Work
```bash
# Check for existing context using Claude Code's pattern
Tool: mcp__memory__search_memory
Query: "[your current task] VANA recent work"
```

#### During Development
```bash
# Check for related previous work
Tool: mcp__memory__search_memory
Query: "[component/feature] implementation patterns"
```

#### After Completing Tasks
```bash
# Store completion and lessons learned
Tool: mcp__memory__store_memory
Content: "Task completed: [description]. Key insights: [lessons]. Source: Cline."
```

### Shared Memory with Claude Code

#### Coordination Protocol
- Both Claude Code and Cline use the same custom ChromaDB memory system
- Both use identical tool names: `mcp__memory__search_memory` and `mcp__memory__store_memory`
- Always check existing context before adding duplicate information
- Store complementary information, not duplicates

#### Cross-Tool Verification
```bash
# Before storing content, check if similar exists
Tool: mcp__memory__search_memory
Query: "[your insight content]"

# Only store if no similar content found
```

### Available Memory Tools (Dual System - Exact Claude Code Match)

#### ChromaDB MCP Tools (Unstructured Text):
- `mcp__memory__search_memory` - Semantic search of ChromaDB
- `mcp__memory__store_memory` - Add new information to vector database
- `mcp__memory__memory_stats` - View database statistics
- `mcp__memory__operation_status` - Real-time operation dashboard
- `mcp__memory__index_files` - Index directory contents

#### Memory MCP Tools (Knowledge Graph - Structured Data):
- `mcp__memory__read_graph` - Read entire knowledge graph
- `mcp__memory__search_nodes` - Search for entities/relationships
- `mcp__memory__open_nodes` - Get specific entities by name
- `mcp__memory__create_entities` - Create new entities
- `mcp__memory__create_relations` - Create relationships between entities
- `mcp__memory__add_observations` - Add facts to existing entities
- `mcp__memory__delete_entities` - Remove entities
- `mcp__memory__delete_relations` - Remove relationships

#### ChromaDB Direct Access Tools (Alternative):
- `mcp__chroma-official__chroma_query_documents` - Query documents
- `mcp__chroma-official__chroma_add_documents` - Add documents
- `mcp__chroma-official__chroma_get_collection_count` - Collection stats
- `mcp__chroma-official__chroma_list_collections` - List collections
- `mcp__chroma-official__chroma_get_documents` - Retrieve documents

### Memory Categories Tracking (Matching Claude Code)

#### Essential Categories
- **Project Status**: Current state, priorities, blockers, next steps
- **Technical Decisions**: Architecture choices, tool preferences, patterns
- **User Preferences**: Communication style, workflow preferences, pain points
- **System Knowledge**: Deployment URLs, testing patterns, known issues
- **Relationships**: Team connections, tool dependencies, service relationships

#### Memory Entities Structure
- **Entities**: People, organizations, events, concepts (e.g., "Nick", "VANA_Project", "Python_3.13_Requirement")
- **Relations**: Directed connections between entities (e.g., "Nick manages VANA_Project")
- **Observations**: Discrete facts about entities (e.g., "Prefers concise responses", "Requires Python 3.13+")

### Connection Issues
```bash
# If memory system connection fails
1. Report "❌ Memory server unavailable - operating without persistent context"
2. Continue work but note lack of context
3. Read .claude/ files for current project state
```

### Data Hygiene Protocol (MANDATORY)

#### Active Memory Maintenance
When code or documentation changes occur, you MUST actively maintain memory accuracy:

1. **File Operations**:
   ```bash
   # Before deleting a file
   Tool: mcp__memory__search_memory
   Query: "[filename]"
   # Then delete all related chunks
   Tool: mcp__chroma-official__chroma_delete_documents
   ```

2. **Code Changes**:
   - Function deleted → Remove function documentation from memory
   - Class renamed → Update all references in memory
   - Implementation changed → Replace old implementation details

3. **Delete Triggers**:
   - File deleted → Delete all memory chunks about that file
   - Directory moved → Update all path references
   - Feature deprecated → Remove old usage patterns
   - Bug fixed → Delete error documentation
   - API changed → Update interface documentation

4. **Before Storing New Content**:
   ```bash
   # Always search first
   Tool: mcp__memory__search_memory
   Query: "[your new content keywords]"
   # If similar exists, delete old before adding new
   ```

### Success Patterns

#### Effective Session Start
```
✅ Memory loaded: Found 8 documents in vana_memory
✅ Recent context: ChromaDB migration complete, Cline integration active
✅ Current focus: [specific project area based on memory query]
```

#### Effective Context Storage  
```
✅ Stored decision: Selected approach X for feature Y because [reasoning]
✅ Stored progress: Completed task Z, next step is [action]
✅ Stored insight: Discovered pattern A improves performance by B%
```

#### Effective Cross-Tool Coordination
```
✅ Found Claude Code's prior work on [feature]
✅ Building on existing implementation in [file]
✅ Complementing previous approach with [addition]
```

#### Effective Data Hygiene
```
✅ Detected file deletion: Removed 3 memory chunks about deleted_file.py
✅ Function renamed: Updated memory from old_name() to new_name()
✅ Stale data cleaned: Removed outdated implementation details
```

Remember: The memory system is your persistent project brain. Use it actively and autonomously to maintain context across sessions and enable seamless collaboration with other AI tools working on VANA.