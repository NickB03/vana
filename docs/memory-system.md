# VANA Memory System

[Home](index.md) > Memory System

This document provides a comprehensive overview of the VANA memory system, consolidating information from various sources to provide a single, authoritative reference.

## Overview

The VANA memory system provides persistent storage and retrieval of information across sessions. It implements a hybrid approach combining:

1. **Short-Term Memory**: In-memory storage for recent interactions within a session
2. **Memory Bank**: File-based persistent storage for project knowledge and context
3. **Knowledge Graph**: MCP-based structured knowledge storage for entities and relationships
4. **Vector Search**: Vertex AI Vector Search for semantic retrieval of information

These components work together to provide a comprehensive memory system that enables the agent to:

- Maintain context within a session
- Access persistent knowledge across sessions
- Store and retrieve structured knowledge
- Extract entities and relationships from text

## Components

### 1. Short-Term Memory

The `ShortTermMemory` class provides in-memory storage for recent interactions within a session. It is implemented in `agent/memory/short_term.py`.

#### Key Features

- **In-Memory Storage**: Stores interactions in a memory buffer with configurable size
- **Role-Based Filtering**: Filter interactions by role (user, assistant)
- **Recency-Based Retrieval**: Get the most recent interactions
- **Text Search**: Search for interactions containing specific text
- **Summarization**: Generate summaries of recent interactions
- **Age-Based Pruning**: Automatically remove interactions older than a specified age
- **Statistics**: Get statistics about the memory buffer

#### Usage

```python
from agent.memory.short_term import ShortTermMemory

# Initialize with configuration
memory = ShortTermMemory(max_items=100, max_age_seconds=3600)

# Add an interaction
memory.add("user", "Hello", metadata={"source": "chat"})

# Get all interactions
all_items = memory.get_all()

# Get recent interactions
recent_items = memory.get_recent(count=5)

# Filter by role
user_items = memory.get_all(filter_role="user")

# Search for interactions
search_results = memory.search("VANA")

# Summarize interactions
summary = memory.summarize(max_length=200)

# Clear memory
memory.clear()

# Get statistics
stats = memory.get_stats()
```

### 2. Memory Bank

The `MemoryBankManager` class provides an interface to the file-based memory bank for persistent knowledge. It is implemented in `agent/memory/memory_bank.py`.

#### Key Features

- **File-Based Storage**: Stores information in Markdown files in the `memory-bank` directory
- **File Operations**: Read, update, and list memory bank files
- **Section Extraction**: Extract specific sections from memory bank files
- **Section Updates**: Update specific sections in memory bank files
- **Backup Creation**: Create backups of files before updating them
- **Security Checks**: Validate file paths to prevent path traversal attacks

#### Core Files

The memory bank includes the following core files:

- `projectbrief.md`: Project goals, scope, and requirements
- `productContext.md`: "Why" behind the project — problems, UX goals, solution vision
- `activeContext.md`: Live work state — current focus, next steps, decisions
- `systemPatterns.md`: System design — architecture, relationships, and technical decisions
- `techContext.md`: Tools, languages, dependencies, constraints, dev setup
- `progress.md`: What works, what's broken, and open issues

#### Usage

```python
from agent.memory.memory_bank import MemoryBankManager

# Initialize with memory bank directory
memory_bank = MemoryBankManager(memory_bank_dir="/path/to/memory-bank")

# Read a file
result = memory_bank.read_file("activeContext.md")

# Update a file
result = memory_bank.update_file("activeContext.md", "# New Content")

# List all files
result = memory_bank.list_files()

# Extract a section
result = memory_bank.extract_section("activeContext.md", "Current Focus")

# Update a section
result = memory_bank.update_section("activeContext.md", "Current Focus", "New focus content")
```

### 3. Knowledge Graph

The `KnowledgeGraphTool` class provides a wrapper around the existing Knowledge Graph Manager for the agent. It is implemented in `agent/tools/knowledge_graph.py`.

#### Key Features

- **Entity Storage**: Store information about entities with types and observations
- **Relationship Storage**: Store relationships between entities
- **Entity Retrieval**: Query the Knowledge Graph for entities
- **Entity Extraction**: Extract entities from text
- **MCP Integration**: Integrate with the MCP-based Knowledge Graph server

#### Usage

```python
from agent.tools.knowledge_graph import kg_query, kg_store, kg_relationship, kg_extract_entities

# Query the Knowledge Graph
entities = kg_query("project", "VANA")

# Store information
result = kg_store("VANA", "project", "VANA is an AI project")

# Store a relationship
result = kg_relationship("VANA", "uses", "Vector Search")

# Extract entities from text
entities = kg_extract_entities("VANA is a project that uses Vector Search")
```

### 4. Vector Search

The `VectorSearchTool` class provides a wrapper around the existing Vector Search Client for the agent. It is implemented in `agent/tools/vector_search.py`.

#### Key Features

- **Semantic Search**: Search for information based on meaning rather than keywords
- **Knowledge Retrieval**: Retrieve knowledge from the vector store
- **Health Status**: Get the health status of the Vector Search client
- **Content Upload**: Upload content to the vector store

#### Usage

```python
from agent.tools.vector_search import vector_search, search_knowledge, get_health_status

# Search for information
results = vector_search("What is VANA?")

# Search for knowledge
results = search_knowledge("What is Vector Search?")

# Get health status
status = get_health_status()
```

## Integration with Agent

The memory components are integrated with the agent as follows:

### Short-Term Memory Integration

```python
from agent.core import VanaAgent
from agent.memory.short_term import ShortTermMemory

# Create agent
agent = VanaAgent()

# Add short-term memory
agent.short_term_memory = ShortTermMemory()

# Use in message processing
def process_message(self, message, user_id):
    # Add user message to memory
    self.short_term_memory.add("user", message)

    # Process message and generate response
    response = self._generate_response(message, user_id)

    # Add assistant response to memory
    self.short_term_memory.add("assistant", response)

    return response
```

### Memory Bank Integration

```python
from agent.core import VanaAgent
from agent.memory.memory_bank import MemoryBankManager

# Create agent
agent = VanaAgent()

# Add memory bank
agent.memory_bank = MemoryBankManager()

# Use in message processing
def update_context(self, focus):
    # Update current focus in memory bank
    self.memory_bank.update_section("activeContext.md", "Current Focus", focus)
```

### Knowledge Graph Integration

```python
from agent.core import VanaAgent
from agent.tools.knowledge_graph import kg_query, kg_store, kg_relationship, kg_extract_entities

# Create agent
agent = VanaAgent()

# Register knowledge graph tools
agent.register_tool("kg_query", kg_query)
agent.register_tool("kg_store", kg_store)
agent.register_tool("kg_relationship", kg_relationship)
agent.register_tool("kg_extract_entities", kg_extract_entities)

# Use in message processing
def process_message(self, message, user_id):
    # Extract entities from message
    entities = kg_extract_entities(message)

    # Store entities in Knowledge Graph
    for entity in entities:
        kg_store(entity["name"], entity["type"], entity["observation"])

    # Process message and generate response
    response = self._generate_response(message, user_id)

    return response
```

### Vector Search Integration

```python
from agent.core import VanaAgent
from agent.tools.vector_search import vector_search, search_knowledge

# Create agent
agent = VanaAgent()

# Register vector search tools
agent.register_tool("vector_search", vector_search)
agent.register_tool("search_knowledge", search_knowledge)

# Use in message processing
def process_message(self, message, user_id):
    # Search for relevant information
    results = vector_search(message)

    # Process message and generate response
    response = self._generate_response(message, user_id, results)

    return response
```

## Error Handling and Resilience

All memory components include comprehensive error handling to ensure resilience:

- **Short-Term Memory**: Handles buffer overflow, invalid inputs, and age-based pruning
- **Memory Bank**: Validates file paths, handles file not found errors, and creates backups before updates
- **Knowledge Graph**: Checks availability, handles connection errors, and validates inputs
- **Vector Search**: Includes circuit breaker pattern, fallback mechanisms, and health checking

## Future Enhancements

Planned enhancements to the memory system include:

1. **Memory Consolidation**: Periodically summarize and consolidate short-term memory into long-term memory
2. **Relevance Scoring**: Improve retrieval by scoring memory items based on relevance to the current context
3. **Cross-Session Context**: Maintain context across multiple sessions using the Memory Bank
4. **Enhanced Entity Extraction**: Improve entity extraction with more sophisticated NLP techniques
5. **Memory Visualization**: Provide visualization tools for exploring the agent's memory

## References

- [Agent Memory Implementation](implementation/agent-memory.md): Detailed implementation documentation
- [Agent Core Architecture](architecture/agent-core.md): Architecture of the agent core system
- [Agent Tool Usage Guide](guides/agent-tool-usage.md): Guide for using agent tools
- [Knowledge Graph Integration Architecture](architecture/knowledge_graph_integration.md): Architecture of the Knowledge Graph integration
- [Vector Search Architecture](architecture/vector-search.md): Architecture of the Vector Search system
