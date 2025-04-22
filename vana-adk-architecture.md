# VANA ADK Architecture Plan

**Project ID**: analystai-454200  
**Document Type**: Technical Architecture Reference
**Framework**: Google ADK (Agent Development Kit)

## 1. System Overview

VANA is a multi-agent system built using Google's Agent Development Kit (ADK) that implements a code-first approach to agent definition. The system features a hierarchical agent structure with Ben as the coordinator and specialist agents for specific tasks.

## 2. High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                     Google Cloud Platform                          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    ADK Development Layer                      │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────────────┐  │ │
│  │  │                Agent Hierarchy (Python)                 │  │ │
│  │  │                                                        │  │ │
│  │  │           ┌────────────[Ben - Coordinator]────────────┐│  │ │
│  │  │           │                                           ││  │ │
│  │  │  ┌───────▼───────┐ ┌───────▼───────┐ ┌───────▼───────┐│  │ │
│  │  │  │     Rhea      │ │     Max       │ │     Sage      ││  │ │
│  │  │  │ (Meta-Arch)   │ │ (Interface)   │ │ (Platform)    ││  │ │
│  │  │  └───────────────┘ └───────────────┘ └───────────────┘│  │ │
│  │  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐│  │ │
│  │  │  │     Kai       │ │     Juno      │ │ [Other Agents]││  │ │
│  │  │  │ (Edge Cases)  │ │ (Story)       │ │               ││  │ │
│  │  │  └───────────────┘ └───────────────┘ └───────────────┘│  │ │
│  │  └────────────────────────────────────────────────────────┘  │ │
│  │                                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                   Vertex AI Services                          │ │
│  │                                                              │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐ │ │
│  │  │ Agent Engine     │  │ Vector Search    │  │ Embeddings  │ │ │
│  │  └──────────────────┘  └──────────────────┘  └─────────────┘ │ │
│  │                                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## 3. Component Details

### 3.1. ADK Core Components

1. **LlmAgent Class**: Base agent implementation with LLM capabilities
2. **Tools Framework**: Function decorators for agent capabilities
3. **Runner**: Execution engine for agent operations
4. **Session Management**: In-memory and managed session handling

### 3.2. Agent Definitions

```python
# Example agent structure
ben = LlmAgent(
    name="ben",
    model="gemini-2.0-flash",
    description="Project Lead & DevOps Strategist",
    instruction="System thinker who orchestrates progress through review and mentorship",
    sub_agents=[rhea, max, sage, kai, juno],
    tools=[coordinate_task, review_progress]
)
```

### 3.3. Tool Implementation

```python
@tool
def coordinate_task(task: str, assigned_to: str) -> str:
    """Coordinate task assignment to specialist agents."""
    # Implementation here
    pass
```

### 3.4. Vector Storage Integration

```python
@tool
def search_knowledge(query: str) -> str:
    """Search shared vector knowledge base."""
    index_endpoint = aiplatform.MatchingEngineIndexEndpoint(
        index_endpoint_name="vana-shared-index"
    )
    results = index_endpoint.find_neighbors(
        deployed_index_id="vana-index",
        queries=[generate_embedding(query)],
        num_neighbors=5
    )
    return format_results(results)
```

## 4. Data Flow

### 4.1. Agent Communication Flow

1. User query → Ben (Coordinator)
2. Ben analyzes and routes to appropriate specialist
3. Specialist agent processes task using tools
4. Specialist returns results to Ben
5. Ben synthesizes and returns final response

### 4.2. Vector Search Flow

1. Agent receives query requiring external knowledge
2. Agent calls `search_knowledge` tool
3. Tool generates embedding for query
4. Vector Search finds similar content
5. Results returned and incorporated into agent response

## 5. Technology Stack

### 5.1. Core Technologies

- **Python 3.9+**: Primary development language
- **Google ADK**: Agent development framework
- **Vertex AI**: Managed AI platform services
- **Gemini Models**: Primary LLM backend

### 5.2. GCP Services

- **Vertex AI Agent Engine**: Production runtime for agents
- **Vector Search**: Semantic search capabilities
- **Cloud Storage**: Document and artifact storage
- **IAM**: Identity and access management

## 6. Deployment Architecture

### 6.1. Local Development

```bash
# Run ADK development UI
adk web

# Test individual agents
adk run vana.agents.ben

# Run evaluations
adk eval vana evaluation_set.json
```

### 6.2. Production Deployment

```python
# deploy.py
from vertexai import agent_engines
from vana.agents.team import root_agent

remote_app = agent_engines.create(
    agent_engine=root_agent,
    requirements=[
        "google-cloud-aiplatform[adk,agent_engines]",
        "google-adk"
    ],
    display_name="VANA Multi-Agent System",
    description="Production deployment of VANA agent team"
)
```

## 7. Security Architecture

### 7.1. Authentication

- Application Default Credentials for local development
- Service account for production deployment
- IAM roles for least privilege access

### 7.2. Access Control

- Agent Engine service account requires:
  - `roles/aiplatform.user`
  - `roles/storage.objectViewer`
  - Custom role for Vector Search access

## 8. Monitoring & Observability

### 8.1. Built-in Monitoring

- Agent Engine dashboard in Cloud Console
- Cloud Logging for agent execution traces
- Cloud Trace for performance monitoring

### 8.2. Custom Metrics

- Agent response times
- Tool usage patterns
- Vector search query performance

## 9. Advantages of ADK Architecture

1. **Direct Code Control**: Define agents in Python, not YAML/JSON
2. **Simplified Multi-Agent**: Native support for agent hierarchies
3. **Faster Development**: Built-in UI for immediate testing
4. **Cleaner Integration**: Direct tool integration without complex pipelines
5. **Reduced Complexity**: Less infrastructure to manage

## 10. Migration from Agent-Starter-Pack

Key changes in the ADK approach:
- Replace template-based definitions with Python code
- Use ADK's built-in development tools
- Simplify vector storage integration
- Leverage native multi-agent capabilities

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

---

## 11. Automated GitHub Knowledge Sync

To ensure agents always have up-to-date knowledge of the codebase, VANA integrates an automated pipeline that syncs the latest GitHub repository content into the Vector Search index.

**Flow:**
1. **Trigger:** A GitHub Action or webhook triggers on push/merge to the main branch.
2. **Sync:** The automation pulls the latest codebase (or changed files) to a staging area.
3. **Preprocess:** Relevant files (e.g., `.py`, `.md`, `.json`) are extracted and chunked as needed.
4. **Embed:** The embedding pipeline generates vector representations for new/changed files.
5. **Index Update:** Embeddings are uploaded to GCS and the Vertex AI Vector Search index is updated.
6. **Query:** Agents immediately have access to the latest code knowledge via the RAG tool.

**Benefits:**
- Code knowledge is always current and queryable by agents.
- No manual intervention required after initial setup.
- Supports continuous improvement and rapid iteration.

**See also:**  
- `README.md` Troubleshooting & Integration Notes  
- `vana-adk-project-plan.md` for implementation milestones  
- `checklist.md` for operational steps
