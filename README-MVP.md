# VANA Project - MVP Implementation

## Overview

VANA (Versatile Agent Network Architecture) is an intelligent agent system built using Google's Agent Development Kit (ADK) with a focus on knowledge management and retrieval. The MVP implementation delivers a streamlined single-agent architecture that leverages external tools and services through Model Context Protocol (MCP).

## Key Features

- **Single Agent Architecture**: Simplified design with a primary Vana agent
- **Knowledge Retrieval**:
  - Vector Search via Vertex AI for semantic search
  - Knowledge Graph via MCP for structured knowledge
  - Hybrid Search combining both approaches
  - Web Search for recent information
- **Document Processing**:
  - Semantic chunking for structure-aware document processing
  - Hierarchical section extraction
  - Context-preserving chunk overlap
- **External Tool Integration**: Access to specialized tools through external MCP server
- **Google ADK Foundation**: Code-first agent definition with modular tool framework

## System Architecture

```
┌─────────────────────────────┐
│                             │
│    Google ADK Web UI        │
│    (http://localhost:8000)  │
│                             │
└───────────────┬─────────────┘
                │
                ▼
┌─────────────────────────────┐
│                             │
│      Vana Agent             │
│  (Primary Agent Interface)  │
│                             │
└───────────┬─────────────────┘
            │
            │ Tool Calls
            │
┌───────────┼─────────────────┐
│           │                 │
│  ┌────────▼─────────┐       │
│  │                  │       │
│  │  External MCP    │       │
│  │  Server          │       │
│  │                  │       │
│  └──┬──────────┬────┘       │
│     │          │            │
│     │          │            │
│  ┌──▼────┐  ┌──▼────────┐   │
│  │       │  │           │   │
│  │Vector │  │Knowledge  │   │
│  │Search │  │Graph      │   │
│  │       │  │           │   │
│  └──┬────┘  └──┬────────┘   │
│     │          │            │
│  ┌──▼──────────▼────────┐   │
│  │                      │   │
│  │    Hybrid Search     │   │
│  │    (Combined Results)│   │
│  │                      │   │
│  └──────────────────────┘   │
│                             │
└─────────────────────────────┘
```

## Getting Started

### Prerequisites

- Python 3.9 or higher
- Google Cloud account with Vertex AI enabled
- MCP API key (for Knowledge Graph functionality)
- Google ADK CLI

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/NickB03/vana.git
   cd vana
   ```

2. Create a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

5. Set required API keys:
   ```bash
   # For Knowledge Graph
   export MCP_API_KEY=your_mcp_api_key

   # For Web Search
   export GOOGLE_SEARCH_API_KEY=your_google_search_api_key
   export GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id

   # For Vector Search
   export GOOGLE_APPLICATION_CREDENTIALS=./secrets/service-account-key.json
   ```

### Running the Agent

Use the launch script to start the Vana agent:

```bash
chmod +x launch_vana_agent.sh
./launch_vana_agent.sh
```

Or manually start the ADK web UI:

```bash
cd adk-setup
adk web
```

Visit http://localhost:8000 in your browser to interact with the agent.

## Knowledge Tools

The Vana agent provides several knowledge-related tools:

### Vector Search

Search for information semantically using Vertex AI Vector Search:

```
!vector_search What is VANA?
```

### Knowledge Graph

Query structured knowledge using entity types and relationships:

```
!kg_query project "VANA"
!kg_store VANA project "VANA is a multi-agent system using Google's ADK"
```

### Hybrid Search

Combine both Vector Search and Knowledge Graph for comprehensive results:

```
!hybrid_search How does VANA work?
```

### Web Search

Search the web for recent information beyond the agent's training data:

```
!web_search What is the latest version of Google's ADK?
```

For a complete list of Knowledge Graph commands, see [docs/knowledge-graph-commands.md](docs/knowledge-graph-commands.md).

## Demonstrations

### Knowledge Graph Demo

Run the Knowledge Graph demonstration script to see the capabilities in action:

```bash
python examples/knowledge_graph_demo.py
```

This script demonstrates:
- Storing entities
- Querying entities
- Creating relationships
- Querying relationships
- Entity expansion

## MCP Integration

The system uses an external MCP server for tool integration. The configuration is in `claude-mcp-config.json`:

```json
{
  "serverUrl": "https://mcp.community.augment.co",
  "apiKey": "${MCP_API_KEY}",
  "namespace": "vana-project",
  "tools": ["knowledge_graph", "vector_search"]
}
```

To test MCP connectivity:

```bash
python scripts/test_mcp_connection.py
```

## Development Workflow

1. Define tools in the `tools/` directory
2. Add tool methods to the agent in `adk-setup/vana/agents/vana.py`
3. Test locally with the ADK web UI
4. Deploy to Vertex AI Agent Engine when ready

## Project Structure

- `adk-setup/` - Google ADK agent definitions
- `tools/` - Tool implementations
  - `hybrid_search.py` - Combined Vector Search and Knowledge Graph
  - `knowledge_graph/` - Knowledge Graph client
  - `vector_search/` - Vector Search client
  - `web_search.py` - Web search using Google Custom Search API
  - `document_processing/` - Document processing tools
    - `semantic_chunker.py` - Structure-aware document chunking
- `scripts/` - Utility scripts
- `examples/` - Example demonstrations
- `tests/` - Test and evaluation scripts
  - `test_web_search.py` - Test web search functionality
  - `test_semantic_chunking.py` - Test document chunking
  - `evaluate_retrieval.py` - Evaluate retrieval quality
- `docs/` - Documentation

## Architecture Choices

### Single Agent MVP

The MVP focuses on a single agent (Vana) to simplify initial development and testing. Future versions will expand to a multi-agent architecture.

### External MCP Server

We use an external MCP server rather than implementing our own to reduce development overhead and leverage community resources.

### Hybrid Search Approach

The hybrid search capability combines semantic search with structured knowledge to provide the most comprehensive and relevant results.

## Next Steps

1. Enhance Knowledge Graph integration with more sophisticated entity linking
2. Implement user feedback mechanism for result quality
3. Add additional domain-specific tools
4. Expand web search capabilities with multi-source integration
5. Enhance document processing with multi-modal support
6. Develop comprehensive evaluation framework for agent performance
7. Prepare for multi-agent expansion in next phase

## Resources

- [Google ADK Documentation](https://cloud.google.com/generative-ai-app-builder/docs/agent-development-kit/get-started)
- [Vertex AI Vector Search](https://cloud.google.com/vertex-ai/docs/vector-search/overview)
- [Google Custom Search API](https://developers.google.com/custom-search/v1/overview)
- [MCP Documentation](https://mcp.community.augment.co/docs)
- [VANA Architecture Guide](docs/vana-architecture-guide.md)
- [VANA System Capabilities](docs/vana-system-capabilities.md)
