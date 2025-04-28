# VANA Architecture Guide

## Overview

VANA (Versatile Agent Network Architecture) is an intelligent agent system built using Google's Agent Development Kit (ADK) that implements a code-first approach to agent definition. For the MVP, VANA operates as a single primary agent leveraging Vertex AI Vector Search and Knowledge Graph for comprehensive knowledge retrieval, with a simplified architecture focused on core functionality.

## System Architecture

### Core Components

1. **Agent System**
   - **Vana (Primary Agent)**: Handles user interactions and knowledge retrieval
   - **Google ADK**: Code-first agent definition with built-in tools
   - **External Tools**: Access to specialized capabilities via MCP

2. **Knowledge Management**
   - **Vector Search**: Semantic search capabilities via Vertex AI Vector Search
   - **Knowledge Graph**: Structured knowledge representation with entities and relationships
   - **Hybrid Search**: Combined approach leveraging both Vector Search and Knowledge Graph
   - **GitHub Knowledge Sync**: Automated pipeline to keep knowledge up-to-date

3. **Integration Layer**
   - **External MCP Server**: Community-hosted Model Context Protocol server
   - **Knowledge Graph API**: Structured knowledge storage and retrieval
   - **Vertex AI Services**: Managed AI platform for embeddings and search

### Architecture Diagram

```
┌─────────────────────────────┐
│                             │
│    Google ADK Web UI        │
│    (http://localhost:8080)  │
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

## Data Flow

### Agent Communication Flow

1. User query → Vana Agent
2. Vana analyzes the query and determines required knowledge
3. Vana calls appropriate tools (Vector Search, Knowledge Graph, or Hybrid Search)
4. External MCP server processes tool requests
5. Vana synthesizes results and returns response to user

### Vector Search Flow

1. Agent receives query requiring external knowledge
2. Agent calls `search_knowledge` tool
3. Tool generates embedding for query
4. Vector Search finds similar content
5. Results returned and incorporated into agent response

### Knowledge Graph Flow

1. Agent receives query requiring structured knowledge
2. Agent calls `kg_query` or `hybrid_search` tool
3. MCP server processes the request to Knowledge Graph
4. Knowledge Graph finds relevant entities and relationships
5. Results returned and incorporated into agent response

### Hybrid Search Flow

1. Agent receives complex query requiring both semantic and structured knowledge
2. Agent calls `hybrid_search` tool
3. Tool queries both Vector Search and Knowledge Graph in parallel
4. Results from both sources are combined and ranked
5. Combined results returned to agent for comprehensive response

## Technology Stack

### Core Technologies

- **Python 3.9+**: Primary development language
- **Google ADK**: Agent development framework
- **Vertex AI**: Managed AI platform services
- **Gemini Models**: Primary LLM backend

### GCP Services

- **Vertex AI Agent Engine**: Production runtime for agents
- **Vector Search**: Semantic search capabilities
- **Cloud Storage**: Document and artifact storage
- **IAM**: Identity and access management

### Integration Technologies

- **MCP**: Model Context Protocol for agent communication
- **External MCP Server**: Community-hosted MCP server
- **Knowledge Graph API**: Structured knowledge representation
- **Hybrid Search**: Combined Vector Search and Knowledge Graph retrieval

## Deployment Architecture

### Local Development

```bash
# Run ADK development UI
adk web

# Test Vana agent
adk run vana.agents.vana

# Run evaluations
adk eval vana evaluation_set.json

# Configure MCP connection
export MCP_API_KEY=your_api_key
export MCP_SERVER_URL=PLACEHOLDER_MCP_SERVER_URL
export MCP_NAMESPACE=vana-project
```

### Production Deployment

```bash
# Deploy agent to Vertex AI Agent Engine
python deploy.py

# Configure production environment variables
gcloud secrets create MCP_API_KEY --data-file=/path/to/mcp_api_key.txt
gcloud secrets create VECTOR_SEARCH_ENDPOINT_ID --data-file=/path/to/endpoint_id.txt
```

## Security Architecture

### Authentication & Authorization

- **GCP IAM**: Service account permissions for GCP resources
- **API Keys**: Secured in environment variables
- **Webhook Authentication**: Basic auth for n8n webhooks

### Data Protection

- **Environment Variables**: Sensitive credentials stored in .env files
- **Gitignore Rules**: Prevent committing sensitive files
- **Encrypted Communication**: HTTPS for production deployments

## Error Handling

### Graceful Degradation

The system implements graceful degradation at multiple levels:

1. **Hybrid Search**: Falls back to Vector Search if Knowledge Graph is unavailable
2. **Vector Search**: Falls back to agent's built-in knowledge if search fails
3. **Knowledge Graph**: Falls back to direct entity lookup if relationship queries fail

### Error Recovery

1. **Automatic Retries**: For transient failures in API calls
2. **Logging**: Comprehensive logging for debugging
3. **Monitoring**: Health checks and alerts for critical components

## Monitoring & Observability

### Built-in Monitoring

- Agent Engine dashboard in Cloud Console
- Cloud Logging for agent execution traces
- Cloud Trace for performance monitoring

### Custom Metrics

- Agent response times
- Tool usage patterns
- Vector Search query performance
- Knowledge Graph query success rates
- Hybrid Search result quality

## Appendices

### Appendix A: ADK Resource Types

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| LlmAgent | Agent definition | Instructions, tools, sub-agents |
| Tool | Agent capabilities | @tool decorator, type hints |
| Runner | Execution engine | Stream handling, state management |
| Session | Conversation state | Memory, context preservation |

### Appendix B: Development Workflow

1. Define agents in Python code
2. Implement tools with docstrings
3. Test locally with `adk web`
4. Evaluate with `adk eval`
5. Deploy to Agent Engine

### Appendix C: Knowledge Commands Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `!vector_search` | Search Vector Search | `!vector_search What is VANA?` |
| `!kg_query` | Query Knowledge Graph | `!kg_query project VANA` |
| `!hybrid_search` | Search both systems | `!hybrid_search How does VANA work?` |
| `!kg_store` | Store entity in Knowledge Graph | `!kg_store VANA project "VANA is a system..."` |

### Appendix D: Troubleshooting Guide

See the [Troubleshooting Guide](troubleshooting.md) for common issues and solutions.
