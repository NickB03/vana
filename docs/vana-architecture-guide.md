# VANA Architecture Guide

## Overview

VANA (Versatile Agent Network Architecture) is a multi-agent system built using Google's Agent Development Kit (ADK) that implements a code-first approach to agent definition. The system features a hierarchical agent structure with Ben as the coordinator and specialist agents for specific tasks, all sharing knowledge through Vector Search and memory management through n8n and MCP.

## System Architecture

### Core Components

1. **Agent Hierarchy**
   - **Ben (Project Lead)**: Coordinates the team and delegates tasks
   - **Specialist Agents**: Handle specific domains (Rhea, Max, Sage, Kai, Juno)
   - **Agent Communication**: Structured protocol for task delegation and results reporting

2. **Knowledge Management**
   - **Vector Search**: Semantic search capabilities via Vertex AI Vector Search
   - **Memory System**: Long-term memory via Ragie.ai integration
   - **GitHub Knowledge Sync**: Automated pipeline to keep knowledge up-to-date

3. **Integration Layer**
   - **n8n Workflows**: Automation for memory management
   - **MCP Server**: Model Context Protocol for agent communication
   - **Railway Deployment**: Hosting for n8n server

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                           │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                         Ben (Coordinator)                       │
└───┬───────────────┬───────────────────┬───────────────────┬─────┘
    │               │                   │                   │
┌───▼───┐       ┌───▼───┐           ┌───▼───┐           ┌───▼───┐
│  Rhea  │       │  Max   │           │  Sage  │           │  Kai   │
│ (Data) │       │ (Code) │           │ (Infra)│           │ (Test) │
└───────┘       └───────┘           └───────┘           └───────┘
                                                            │
┌─────────────────────────────────────────────────┐     ┌───▼───┐
│              Knowledge Management               │     │  Juno  │
├─────────────────────────────────────────────────┤     │ (Docs) │
│ ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │     └───────┘
│ │Vector Search│  │  Ragie.ai   │  │GitHub Sync│ │
│ └─────────────┘  └─────────────┘  └───────────┘ │
└─────────────────────────────────────────────────┘
                        │
┌───────────────────────▼───────────────────────────┐
│               Integration Layer                   │
├───────────────────────────────────────────────────┤
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│ │n8n Workflows│  │ MCP Server  │  │  Railway    │ │
│ └─────────────┘  └─────────────┘  └─────────────┘ │
└───────────────────────────────────────────────────┘
```

## Data Flow

### Agent Communication Flow

1. User query → Ben (Coordinator)
2. Ben analyzes and routes to appropriate specialist
3. Specialist agent processes task using tools
4. Specialist returns results to Ben
5. Ben synthesizes and returns final response

### Vector Search Flow

1. Agent receives query requiring external knowledge
2. Agent calls `search_knowledge` tool
3. Tool generates embedding for query
4. Vector Search finds similar content
5. Results returned and incorporated into agent response

### Memory Management Flow

1. User activates memory recording with `!memory_on` command
2. Conversation is buffered in the MemoryBufferManager
3. User triggers memory save with `!rag` command
4. MCP server sends buffer to n8n webhook
5. n8n workflow processes and saves to Ragie.ai
6. Future queries can retrieve relevant memories

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

- **n8n**: Workflow automation tool
- **MCP**: Model Context Protocol for agent communication
- **Railway**: Hosting platform for n8n
- **Ragie.ai**: External vector database for memory

## Deployment Architecture

### Local Development

```bash
# Run ADK development UI
adk web

# Test individual agents
adk run vana.agents.ben

# Run evaluations
adk eval vana evaluation_set.json

# Start n8n MCP server
cd mcp-servers/n8n-mcp
./start-mcp-server.sh
```

### Production Deployment

```bash
# Deploy n8n to Railway
railway up

# Deploy agents to Vertex AI Agent Engine
python deploy.py
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

1. **Memory System**: Falls back to Vector Search if Ragie.ai is unavailable
2. **Vector Search**: Falls back to agent's built-in knowledge if search fails
3. **Agent Delegation**: Falls back to Ben if specialist agents are unavailable

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
- Vector search query performance
- Memory retrieval success rates

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

### Appendix C: n8n Workflow Reference

| Workflow | Purpose | Trigger |
|----------|---------|---------|
| Manual Memory Save | Save conversation to Ragie | `!rag` command |
| Daily Memory Sync | Scheduled memory backup | Time-based schedule |

### Appendix D: Troubleshooting Guide

See the [Troubleshooting Guide](troubleshooting.md) for common issues and solutions.
