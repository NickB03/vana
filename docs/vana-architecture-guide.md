# VANA Architecture Guide

## Overview

VANA (Versatile Agent Network Architecture) is an intelligent agent system built using Google's Agent Development Kit (ADK) that implements a code-first approach to agent definition. The system features a primary agent (Vana) with specialist sub-agents, leveraging Vertex AI Vector Search, Knowledge Graph, and Web Search for comprehensive knowledge retrieval.

## System Architecture

### Core Components

1. **Agent System**
   - **Vana (Primary Agent)**: Lead Developer, Architect, and Strategist for Project Vana
   - **Specialist Agents**: Rhea (Meta-Architect), Max (Interface), Sage (Platform), Kai (Edge Cases), Juno (Test Specialist)
   - **Google ADK**: Code-first agent definition with built-in tools
   - **External Tools**: Access to specialized capabilities via MCP

2. **Knowledge Management**
   - **Vector Search**: Semantic search capabilities via Vertex AI Vector Search (with mock implementation fallback)
   - **Knowledge Graph**: Structured knowledge representation with entities and relationships via Context7 MCP
   - **Web Search**: Up-to-date information retrieval via Google Custom Search API (with mock implementation fallback)
   - **Hybrid Search**: Combined approach leveraging Vector Search, Knowledge Graph, and Web Search
   - **GitHub Knowledge Sync**: Automated pipeline to keep knowledge up-to-date

3. **Integration Layer**
   - **External MCP Server**: Community-hosted Model Context Protocol server (mcp.community.augment.co)
   - **Knowledge Graph API**: Structured knowledge storage and retrieval
   - **Vertex AI Services**: Managed AI platform for embeddings and search
   - **Google Custom Search API**: Web search capabilities

4. **Testing Framework**
   - **Juno Autonomous Tester**: Agent-based testing with learning from previous results
   - **Structured Testing**: Predefined test cases with expected results
   - **Interactive Testing**: Manual testing interface

### Architecture Diagram

```
┌─────────────────────────────┐
│                             │
│    Google ADK Web UI        │
│    (http://localhost:8000)  │
│                             │
└───────────────┬─────────────┘
                │
                ▼
┌─────────────────────────────────────────────────┐
│                                                 │
│               Vana Agent                        │
│     (Lead Developer & Project Strategist)       │
│                                                 │
└───┬───────────────┬───────────────┬─────────────┘
    │               │               │
    │ Delegation    │ Tool Calls    │ Testing
    │               │               │
    ▼               ▼               ▼
┌──────────┐  ┌─────────────────────────┐  ┌─────────────┐
│          │  │                         │  │             │
│Specialist│  │    Knowledge Sources    │  │    Juno     │
│ Agents   │  │                         │  │(Test Agent) │
│          │  │                         │  │             │
└──────────┘  └──────────┬──────────────┘  └──────┬──────┘
                         │                        │
                         ▼                        ▼
┌────────────────────────────────────────┐  ┌────────────────┐
│                                        │  │                │
│  ┌──────────┐  ┌──────────┐  ┌───────┐ │  │ Test Framework │
│  │          │  │          │  │       │ │  │                │
│  │  Vector  │  │Knowledge │  │  Web  │ │  │ ┌────────────┐ │
│  │  Search  │  │  Graph   │  │Search │ │  │ │Structured  │ │
│  │          │  │          │  │       │ │  │ │Testing     │ │
│  └────┬─────┘  └────┬─────┘  └───┬───┘ │  │ └────────────┘ │
│       │             │            │     │  │                │
│       │             │            │     │  │ ┌────────────┐ │
│  ┌────▼─────────────▼────────────▼───┐ │  │ │Autonomous  │ │
│  │                                   │ │  │ │Testing     │ │
│  │        Enhanced Hybrid Search     │ │  │ └────────────┘ │
│  │        (Combined Results)         │ │  │                │
│  │                                   │ │  │ ┌────────────┐ │
│  └───────────────────────────────────┘ │  │ │Interactive │ │
│                                        │  │ │Testing     │ │
└────────────────────────────────────────┘  │ └────────────┘ │
                                            │                │
                                            └────────────────┘
```

## Data Flow

### Agent Communication Flow

1. User query → Vana Agent
2. Vana analyzes the query and determines required knowledge or delegation
3. Vana either:
   - Calls appropriate tools (Vector Search, Knowledge Graph, Web Search, or Hybrid Search)
   - Delegates to a specialist agent based on expertise
4. External MCP server processes tool requests
5. Vana synthesizes results and returns response to user

### Agent Delegation Flow

1. User query → Vana Agent
2. Vana determines a specialist agent is better suited for the task
3. Vana calls `transfer_to_agent` or `coordinate_task` function
4. Task is assigned to the appropriate specialist agent
5. Specialist agent processes the task and returns results
6. Results are presented to the user

### Vector Search Flow

1. Agent receives query requiring external knowledge
2. Agent calls `search_knowledge` tool
3. Tool attempts to use Vertex AI Vector Search
4. If permissions fail, falls back to mock implementation
5. Results returned and incorporated into agent response

### Knowledge Graph Flow

1. Agent receives query requiring structured knowledge
2. Agent calls `kg_query` or `hybrid_search` tool
3. MCP server processes the request to Knowledge Graph
4. Knowledge Graph finds relevant entities and relationships
5. Results returned and incorporated into agent response

### Web Search Flow

1. Agent receives query requiring up-to-date information
2. Agent calls `web_search` tool
3. Tool attempts to use Google Custom Search API
4. If API fails, falls back to mock implementation
5. Results returned and incorporated into agent response

### Enhanced Hybrid Search Flow

1. Agent receives complex query requiring comprehensive knowledge
2. Agent calls `enhanced_search` tool
3. Tool queries Vector Search, Knowledge Graph, and Web Search in parallel
4. Results from all sources are combined, ranked, and deduplicated
5. Combined results returned to agent for comprehensive response

### Testing Framework Flow

1. Test runner initiates testing session
2. Juno (Test Agent) is activated in one of three modes:
   - Structured Testing: Executes predefined test cases
   - Autonomous Testing: Designs and executes tests dynamically
   - Interactive Testing: Facilitates manual testing
3. Juno sends test queries to Vana
4. Juno analyzes Vana's responses against expected results
5. Juno generates test reports and insights
6. For autonomous testing, Juno learns from previous test results to improve testing strategy

## Technology Stack

### Core Technologies

- **Python 3.9+**: Primary development language
- **Google ADK 0.5.0**: Agent development framework
- **Vertex AI**: Managed AI platform services
- **Gemini 2.0 Flash**: Primary LLM backend

### GCP Services

- **Vertex AI Agent Engine**: Production runtime for agents
- **Vector Search**: Semantic search capabilities
- **Cloud Storage**: Document and artifact storage
- **IAM**: Identity and access management
- **Google Custom Search API**: Web search capabilities

### Integration Technologies

- **MCP**: Model Context Protocol for agent communication
- **External MCP Server**: Community-hosted MCP server (mcp.community.augment.co)
- **Knowledge Graph API**: Structured knowledge representation
- **Enhanced Hybrid Search**: Combined Vector Search, Knowledge Graph, and Web Search retrieval

### Testing Technologies

- **Juno Autonomous Tester**: Agent-based testing framework
- **Test Runner**: Bash script for test execution
- **Test Cases**: JSON-formatted test definitions
- **Test Results**: JSON and Markdown reports

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
|-----------|---------|------------|
| Agent | Agent definition | Instructions, tools, sub-agents |
| Tool | Agent capabilities | @tool decorator, type hints |
| Runner | Execution engine | Stream handling, state management |
| Session | Conversation state | Memory, context preservation |

### Appendix B: Development Workflow

1. Define agents in Python code
2. Implement tools with docstrings
3. Test locally with `adk web`
4. Run automated tests with Juno
5. Evaluate with `adk eval`
6. Deploy to Agent Engine

### Appendix C: Knowledge Commands Reference

| Command | Purpose | Example |
|---------|---------|----------|
| `!vector_search` | Search Vector Search | `!vector_search What is VANA?` |
| `!kg_query` | Query Knowledge Graph | `!kg_query project VANA` |
| `!hybrid_search` | Search Vector Search and Knowledge Graph | `!hybrid_search How does VANA work?` |
| `!enhanced_search` | Search all knowledge sources | `!enhanced_search What's the latest on VANA?` |
| `!web_search` | Search the web | `!web_search What is Google ADK?` |
| `!kg_store` | Store entity in Knowledge Graph | `!kg_store VANA project "VANA is a system..."` |

### Appendix D: Testing Commands Reference

| Command | Purpose | Example |
|---------|---------|----------|
| `./scripts/run_vana_tests.sh` | Run predefined test cases | `./scripts/run_vana_tests.sh` |
| `./scripts/run_vana_tests.sh --autonomous` | Run autonomous testing | `./scripts/run_vana_tests.sh --autonomous --max-tests 15` |
| `./scripts/run_vana_tests.sh --interactive` | Run interactive testing | `./scripts/run_vana_tests.sh --interactive` |
| `./scripts/run_vana_tests.sh --single-test` | Run a single test | `./scripts/run_vana_tests.sh --single-test TC002` |

### Appendix E: Troubleshooting Guide

See the [Troubleshooting Guide](troubleshooting.md) for common issues and solutions.
