# CLAUDE.md Enhancements for Proactive Memory Usage

## Enhancement 1: Add Mandatory Memory Workflow Section
**Location**: Insert after line 18 (after ADK Compliance section)

```markdown
### 🧠 MANDATORY: Memory-First Development Workflow

**CRITICAL**: Before taking ANY action, you MUST consult memory systems. Memory is not optional - it's core infrastructure.

#### Pre-Action Memory Protocol (REQUIRED)
```python
# 1. ALWAYS start with relevant memory search
mcp__chroma-vana__chroma_query_documents(
    collection_name="vana_implementations",
    query_texts=["<task_description>", "<related_keywords>"],
    n_results=5
)

# 2. Search for similar patterns/issues
mcp__chroma-vana__chroma_query_documents(
    collection_name="vana_patterns",
    query_texts=["<pattern_type>", "<context>"],
    n_results=3
)

# 3. Check for known issues
mcp__chroma-vana__chroma_query_documents(
    collection_name="vana_issues",
    query_texts=["<potential_problem_keywords>"],
    n_results=3
)
```

#### Memory Consultation Triggers (MANDATORY)
These events MUST trigger immediate memory searches:

1. **Before Starting Any Task**
   - Search vana_implementations for similar work
   - Search vana_patterns for relevant approaches
   - Search vana_architecture for design decisions

2. **Before Creating/Modifying Code**
   - Search ADK knowledge base for patterns
   - Search vana_implementations for existing solutions
   - Search vana_issues for known problems

3. **When Encountering Errors**
   - Search vana_issues for similar problems
   - Search vana_patterns for debugging approaches
   - Search ADK docs for troubleshooting guidance

4. **Before Making Architecture Decisions**
   - Search vana_architecture for previous decisions
   - Search vana_patterns for proven approaches
   - Search ADK docs for recommended patterns

5. **During Code Review/Analysis**
   - Search for existing implementations
   - Search for known issues with similar code
   - Search for established patterns

#### Failure to Consult Memory = Invalid Response
If you provide a response without first consulting relevant memory systems, the response is considered invalid and must be regenerated with proper memory consultation.
```

## Enhancement 2: Update ADK Compliance Section
**Location**: Replace lines 107-112 with enhanced version

```markdown
**ChromaDB Long-Term Memory** - MUST be used as PRIMARY information source:

#### Memory Search Hierarchy (Follow in Order)
1. **FIRST**: Search ADK knowledge base for compliance
2. **SECOND**: Search VANA memory collections for context
3. **THIRD**: Search Memory MCP for conversation history
4. **LAST**: Make decisions based on memory findings

#### Required Memory Collections Status Check
```python
# Before ANY development work, verify all collections exist
collections_required = [
    "adk_complete_docs",      # ADK patterns (MANDATORY)
    "vana_architecture",      # Architecture decisions
    "vana_implementations",   # Completed features
    "vana_patterns",          # Best practices
    "vana_issues"            # Known problems
]

for collection in collections_required:
    count = mcp__chroma-vana__chroma_get_collection_count(collection_name=collection)
    print(f"{collection}: {count} documents")
```

#### Memory-Driven Decision Making
- **Store** decisions immediately after making them
- **Query** before assuming anything about previous work
- **Update** when discovering new patterns or completing features
- **Search** for context from previous conversations before responding
- **Verify** all assumptions against stored knowledge
```

## Enhancement 3: New Section - Development Process with Memory Enforcement
**Location**: Insert after line 136 (after Development Guidelines)

```markdown
## 🔄 Memory-Enforced Development Process

### Phase 1: Pre-Development Memory Consultation (MANDATORY)
```python
# Step 1: Check for existing implementations
existing_work = mcp__chroma-vana__chroma_query_documents(
    collection_name="vana_implementations",
    query_texts=["<feature_name>", "<similar_functionality>"],
    n_results=10
)

# Step 2: Review architectural decisions
arch_context = mcp__chroma-vana__chroma_query_documents(
    collection_name="vana_architecture", 
    query_texts=["<relevant_component>", "<design_patterns>"],
    n_results=5
)

# Step 3: Identify potential issues
known_issues = mcp__chroma-vana__chroma_query_documents(
    collection_name="vana_issues",
    query_texts=["<technology>", "<similar_features>"],
    n_results=5
)

# Step 4: Find established patterns
patterns = mcp__chroma-vana__chroma_query_documents(
    collection_name="vana_patterns",
    query_texts=["<pattern_type>", "<implementation_approach>"],
    n_results=5
)
```

### Phase 2: ADK Compliance Verification (MANDATORY)
Always perform ADK knowledge base searches BEFORE implementing:
```python
# Required ADK pattern verification (customize search terms)
adk_guidance = mcp__chroma-vana__chroma_query_documents(
    collection_name="adk_complete_docs",
    query_texts=["<specific_adk_pattern>", "<implementation_type>"],
    n_results=5
)
```

### Phase 3: Implementation with Continuous Memory Updates
During implementation, continuously update memory:
```python
# Store key decisions immediately
mcp__chroma-vana__chroma_add_documents(
    collection_name="vana_architecture",
    documents=["Decision: <description> | Rationale: <reasoning>"],
    ids=[f"decision_{feature}_{timestamp}"],
    metadatas=[{"type": "decision", "feature": "<feature>", "date": "<date>"}]
)

# Store implementation patterns
mcp__chroma-vana__chroma_add_documents(
    collection_name="vana_patterns",
    documents=["Pattern: <pattern_name> | Usage: <context> | Benefits: <advantages>"],
    ids=[f"pattern_{pattern_name}_{timestamp}"],
    metadatas=[{"type": "pattern", "category": "<category>", "date": "<date>"}]
)
```

### Phase 4: Post-Implementation Memory Storage (MANDATORY)
After completing any work, MUST store results:
```python
# Store implementation summary
mcp__chroma-vana__chroma_add_documents(
    collection_name="vana_implementations",
    documents=[
        f"Feature: <name> | Implementation: <approach> | Files: <list> | "
        f"ADK Patterns: <patterns_used> | Challenges: <issues_faced> | "
        f"Solutions: <how_resolved>"
    ],
    ids=[f"impl_{feature_name}_{timestamp}"],
    metadatas=[{
        "feature": "<feature_name>",
        "files_modified": ["<file1>", "<file2>"],
        "adk_patterns": ["<pattern1>", "<pattern2>"],
        "date": "<date>",
        "status": "completed"
    }]
)

# Store any issues encountered and solutions
if issues_found:
    mcp__chroma-vana__chroma_add_documents(
        collection_name="vana_issues",
        documents=[f"Issue: <description> | Solution: <resolution> | Prevention: <how_to_avoid>"],
        ids=[f"issue_{issue_type}_{timestamp}"],
        metadatas=[{"type": "issue", "severity": "<level>", "resolved": True, "date": "<date>"}]
    )
```

### Memory Consultation Failure Patterns (AVOID)
❌ **Invalid Responses** - These require regeneration:
- Implementing without searching ADK knowledge base
- Creating new patterns without checking existing ones
- Solving problems without checking for previous solutions
- Making architecture decisions without consulting stored decisions
- Modifying code without checking implementation history

✅ **Valid Responses** - Memory-first approach:
- Always search before implementing
- Reference previous work when relevant
- Build on existing patterns rather than recreating
- Update memory with new learnings
- Maintain context continuity across sessions
```

## Enhancement 4: Enhanced Common Development Tasks Section
**Location**: Replace lines 233-243 with enhanced version

```markdown
### Adding a New Tool (Memory-First Approach)

#### Step 1: Memory Consultation (MANDATORY)
```python
# Check for existing similar tools
existing_tools = mcp__chroma-vana__chroma_query_documents(
    collection_name="vana_implementations",
    query_texts=["tool", "function", "<tool_purpose>"],
    n_results=10
)

# Verify ADK tool patterns
adk_patterns = mcp__chroma-vana__chroma_query_documents(
    collection_name="adk_complete_docs",
    query_texts=["FunctionTool", "tool creation", "tool registration"],
    n_results=5
)

# Check for known tool-related issues
tool_issues = mcp__chroma-vana__chroma_query_documents(
    collection_name="vana_issues",
    query_texts=["tool", "function", "registration"],
    n_results=5
)
```

#### Step 2: Implementation Following Memory Guidance
1. Create tool in `lib/_tools/` following discovered ADK patterns
2. Register in appropriate agent's tool list using established patterns
3. Add tests following existing test patterns found in memory
4. Update documentation only if explicitly requested

#### Step 3: Store Implementation in Memory
```python
# Store the new tool implementation
mcp__chroma-vana__chroma_add_documents(
    collection_name="vana_implementations",
    documents=[f"Tool: <name> | Purpose: <description> | Usage: <context> | Files: <location>"],
    ids=[f"tool_{tool_name}_{timestamp}"],
    metadatas=[{"type": "tool", "category": "<category>", "date": "<date>"}]
)
```

### Modifying Agent Behavior (Memory-First Approach)

#### Step 1: Memory Research (MANDATORY)
```python
# Find existing agent patterns
agent_patterns = mcp__chroma-vana__chroma_query_documents(
    collection_name="vana_implementations",
    query_texts=["agent", "LlmAgent", "<agent_type>"],
    n_results=10
)

# Check ADK agent requirements
adk_agent_patterns = mcp__chroma-vana__chroma_query_documents(
    collection_name="adk_complete_docs", 
    query_texts=["LlmAgent", "agent configuration", "sub_agents"],
    n_results=5
)

# Review previous agent modifications
agent_history = mcp__chroma-vana__chroma_query_documents(
    collection_name="vana_architecture",
    query_texts=["agent", "modification", "<specific_agent>"],
    n_results=5
)
```

#### Step 2: Implement Following Memory Guidance
1. Agent definitions in `agents/*/team.py` or `agents/*/specialist.py`
2. Model selection and prompts configurable per discovered patterns
3. Tools loaded via ADK's tool system using established methods
4. Test with `poetry run pytest -m agent`

#### Step 3: Document Changes in Memory
```python
# Store agent modification details
mcp__chroma-vana__chroma_add_documents(
    collection_name="vana_implementations",
    documents=[f"Agent Modified: <name> | Changes: <description> | Rationale: <reasoning>"],
    ids=[f"agent_mod_{agent_name}_{timestamp}"],
    metadatas=[{"type": "agent_modification", "agent": "<name>", "date": "<date>"}]
)
```
```

## Enhancement 5: Add Memory MCP Integration Section
**Location**: Insert after line 288 (after Memory Management section)

```markdown
#### Memory MCP Proactive Usage Patterns
Use Memory MCP for maintaining conversation context and entity relationships:

```python
# Before starting work, check conversation context
mcp__memory-mcp__search_nodes(
    query="<current_task_keywords>"
)

# Create entities for new concepts discovered
mcp__memory-mcp__create_entities(
    entities=[{
        "name": "<concept_name>",
        "entityType": "<type>",
        "observations": ["<key_information>"]
    }]
)

# Link related concepts
mcp__memory-mcp__create_relations(
    relations=[{
        "from": "<entity1>",
        "to": "<entity2>", 
        "relationType": "<relationship_type>"
    }]
)

# Add ongoing observations
mcp__memory-mcp__add_observations(
    observations=[{
        "entityName": "<entity>",
        "contents": ["<new_information>"]
    }]
)
```

#### Memory MCP Consultation Triggers
- **New Feature Discovery**: Create entity and relationships
- **Problem Resolution**: Add observations about solutions
- **Pattern Recognition**: Link similar concepts
- **Context Changes**: Update entity observations
- **Decision Points**: Search for related previous decisions
```

## Summary of Key Changes

1. **Memory-first workflow enforcement** - Make memory consultation mandatory before any action
2. **Specific trigger patterns** - Define exactly when to search memory
3. **Failure pattern identification** - Clearly state what constitutes invalid memory usage
4. **Hierarchical search strategies** - Provide structured approach to memory queries
5. **Continuous memory updates** - Require storage of decisions and implementations
6. **Context continuity enforcement** - Use memory to maintain session awareness
7. **Integration of all memory systems** - Coordinate ChromaDB and Memory MCP usage