# VANA Memory System Architecture Overview

## Introduction

The VANA Memory System implements a sophisticated dual-memory architecture designed for AI agent context persistence and intelligent information retrieval. This document provides a comprehensive overview of the system's design, components, and operation.

## System Architecture

### Core Components

1. **Standard Memory MCP Server**
   - Model Context Protocol implementation
   - Graph-based knowledge storage
   - Entity-relationship management
   - Cross-session persistence

2. **Custom ChromaDB Memory Server**
   - Vector-based semantic search
   - File content indexing
   - Chunk-based storage (2,343+ chunks)
   - 0.3s average search response time

3. **Auto-Indexing System**
   - Monitors .claude/ directory for changes
   - Automatic vector embedding generation
   - Real-time database updates
   - Conflict resolution mechanisms

4. **Integration Layer**
   - MCP server configuration
   - Permission management
   - API coordination
   - Error handling and recovery

## Memory Flow

```
User Input → Claude Code → Memory Query
                ↓
         Memory Decision Layer
         ↙              ↘
Standard MCP         ChromaDB
(Entities/Relations)  (Vector Search)
         ↘              ↙
          Combined Results
                ↓
         Response Generation
```

## Key Features

### 1. Dual Memory Architecture
- **Knowledge Graph**: Structured entity-relationship storage
- **Vector Database**: Semantic similarity search
- **Synchronized Operation**: Both systems work in harmony

### 2. Automatic Persistence
- Session insights stored autonomously
- No manual memory commands required
- Continuous learning and adaptation

### 3. Intelligent Retrieval
- Context-aware search algorithms
- Relevance scoring and ranking
- Cross-memory result fusion

### 4. Performance Optimization
- Sub-second search responses
- Efficient chunk management
- Scalable architecture

## Configuration Requirements

### MCP Server Setup (.claude.json)
```json
{
  "memory": {
    "type": "stdio",
    "command": "python",
    "args": ["/path/to/local_memory_server.py"],
    "env": {
      "MEMORY_CONFIG": "production"
    }
  }
}
```

### Permission Configuration (.claude/settings.local.json)
```json
{
  "permissions": {
    "allow": ["memory"]
  }
}
```

## Memory Categories

1. **Project Status**: Development phase, milestones, progress
2. **Technical Decisions**: Architecture choices, patterns, rationale
3. **User Preferences**: Communication style, workflow patterns
4. **System Knowledge**: Configurations, dependencies, constraints
5. **Relationships**: Component connections, team dynamics

## Next Steps

This architecture overview provides the foundation for understanding VANA's memory system. The following documents will cover:
- Visual flow diagrams
- Implementation details
- Deployment guides
- Troubleshooting procedures