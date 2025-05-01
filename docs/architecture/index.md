# Architecture Documentation

[Home](../index.md) > Architecture

This section contains architecture documentation for the VANA system, describing the high-level design and component relationships.

## Contents

- [System Overview](overview.md)
- [ADK Integration](adk-integration.md)
- [Memory System](memory-system.md)
- [Vector Search](vector-search.md)
- [Knowledge Graph](knowledge-graph.md)
- [Agent Orchestration](agent-orchestration.md)

## Overview

The VANA architecture is built around a primary agent (Vana) that coordinates with specialist agents, leveraging Google's Agent Development Kit (ADK) for context management, state persistence, and tool execution. The system integrates with Vertex AI Vector Search, Knowledge Graph, and Web Search for comprehensive knowledge retrieval.

## Key Components

- **ADK Integration**: Seamless integration with Google's Agent Development Kit
- **Memory System**: Persistent memory across sessions and devices
- **Vector Search**: Semantic search using Vertex AI Vector Search
- **Knowledge Graph**: Structured knowledge representation
- **Agent Orchestration**: Coordination between specialist agents
- **Web Search**: Integration with Google Custom Search API
