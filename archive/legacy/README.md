# Legacy Code

This directory contains legacy code that is no longer actively used in the project. These files are preserved for historical reference.

## Subdirectories

- **ragie/**: Legacy implementation of the VANA memory system using Ragie.ai as the vector database.

## Transition to Current Implementation

The project has transitioned from the legacy implementations to more modern and scalable solutions:

1. **Ragie.ai to Vertex AI Vector Search**: The memory system has transitioned from Ragie.ai to Vertex AI Vector Search for improved scalability, performance, and integration with Google Cloud services.

2. **Addition of Knowledge Graph**: The project has integrated with MCP Knowledge Graph for structured knowledge representation, complementing the vector-based semantic search.

For details on the current implementation, see:
- [docs/vertex-ai-transition.md](../docs/vertex-ai-transition.md)
- [docs/knowledge-graph-setup.md](../docs/knowledge-graph-setup.md)
- [docs/knowledge-graph-commands.md](../docs/knowledge-graph-commands.md)
