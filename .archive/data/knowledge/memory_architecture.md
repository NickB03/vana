---
title: Memory Architecture
created: 2025-06-08T14:45:13.054584
source: vana_knowledge_base_creator
type: system_documentation
---

# VANA Application Memory Architecture

**IMPORTANT NOTE:** This document describes the memory architecture for the **VANA application itself**. This is separate from the local development memory system used in the VS Code environment (which uses ChromaDB and a Knowledge Graph server).

## Memory Hierarchy

### 1. Session Memory (Automatic)
- **Purpose**: Current conversation context
- **Scope**: Single conversation session
- **Features**: Automatic management, conversation continuity
- **Access**: session.state dictionary

### 2. RAG Corpus (search_knowledge)
- **Purpose**: VANA-specific knowledge and documentation
- **Scope**: System-wide knowledge base
- **Features**: Semantic search, high-quality VANA information
- **Access**: search_knowledge("query")

### 3. Vector Search (vector_search)
- **Purpose**: Technical documentation and similarity search
- **Scope**: Broader technical knowledge
- **Features**: Vector embeddings, semantic similarity
- **Access**: vector_search("technical query")

### 4. Web Search (brave_search_mcp)
- **Purpose**: External information and current data
- **Scope**: Internet-wide information
- **Features**: Real-time data, external sources
- **Access**: brave_search_mcp("external query")

## Memory Usage Patterns

### Memory-First Strategy
1. **Check Session Memory**: Current conversation context
2. **Search VANA Knowledge**: search_knowledge for system information
3. **Use Vector Search**: vector_search for technical content
4. **Web Search**: brave_search_mcp for external information

### Agent Memory Behavior
- **Proactive Lookup**: Check memory before external searches
- **Context Preservation**: Maintain conversation continuity
- **Knowledge Sharing**: Share discoveries via session state
- **Learning**: Store successful patterns and preferences

### Memory Commands
- **!memory_on**: Start recording conversation
- **!memory_off**: Stop recording and clear buffer
- **!rag**: Save conversation to knowledge base

## Best Practices
- **Always check VANA knowledge first** for system questions
- **Use memory hierarchy** to avoid redundant searches
- **Store important discoveries** in session state
- **Cite memory sources** when using retrieved information
