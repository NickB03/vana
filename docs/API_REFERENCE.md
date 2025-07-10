# VANA API Reference

Complete reference for the VANA multi-agent AI system API.

## Base URL

```
http://localhost:8081  # Standard mode
http://localhost:8081  # Agentic mode (main_agentic.py)
```

## Authentication

Currently, VANA uses API key authentication for frontend integration. Include your API key in the request headers:

```bash
# For frontend requests
-H "Authorization: Bearer your_api_key"
```

## Endpoints

### POST /api/v1/chat (Agentic Mode)

Main endpoint for the hierarchical agent system. Processes requests through the 5-level agent hierarchy.

#### Request

**URL:** `POST /api/v1/chat`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer your_api_key (optional)
```

**Body:**
```json
{
  "message": "string - The task or question",
  "session_id": "string - Optional session identifier",
  "context": {
    "previous_messages": ["array of previous messages"],
    "user_preferences": {}
  }
}
```

#### Response

**Success (200):**
```json
{
  "response": "string - Agent response",
  "session_id": "string - Session identifier",
  "metadata": {
    "routing_path": ["VANA_Chat", "Master_Orchestrator", "Architecture_Specialist"],
    "complexity": "moderate",
    "tools_used": ["analyze_codebase", "suggest_patterns"],
    "execution_time": 2.34
  }
}
```

#### Examples

##### Simple Task
```bash
curl -X POST http://localhost:8081/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the system architecture?"}'
```

##### Complex Task
```bash
curl -X POST http://localhost:8081/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Analyze the codebase and suggest architectural improvements"}'
```

---

### POST /run

Execute a task through VANA's multi-agent orchestration system (legacy endpoint).

#### Request

**URL:** `POST /run`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "input": "string - The task description or question"
}
```

#### Response

**Success (200):**
```json
{
  "result": {
    "output": "string - The response from the agents",
    "id": "string - Unique session identifier"
  }
}
```

**Error (400):**
```json
{
  "detail": "string - Error description"
}
```

#### Examples

##### Simple Query
```bash
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "What is the current time?"}'
```

Response:
```json
{
  "result": {
    "output": "The current UTC time is 2025-07-10 16:45:32. You'll need to apply the appropriate timezone offset to get the time in your specific location.",
    "id": "session_abc123"
  }
}
```

##### File Operations
```bash
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "Create a file named test.txt with the content Hello World"}'
```

Response:
```json
{
  "result": {
    "output": "✅ Successfully created file test.txt with content: Hello World\n\nFile details:\n- Path: test.txt\n- Size: 11 bytes\n- Content: Hello World",
    "id": "session_def456"
  }
}
```

##### Data Analysis
```bash
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "Analyze the CSV file sales_data.csv and create a summary"}'
```

##### Code Generation
```bash
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "Write a Python function to calculate the factorial of a number"}'
```

##### Web Search
```bash
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "Search for the latest news about artificial intelligence"}'
```

---

### GET /health

Check the health status of the VANA system.

#### Request

**URL:** `GET /health`

**Headers:** None required

#### Response

**Standard Mode (200):**
```json
{
  "status": "healthy"
}
```

**Agentic Mode (200):**
```json
{
  "status": "healthy",
  "version": "2.0.0-alpha",
  "agent_system": "hierarchical",
  "phase": "1",
  "features": [
    "VANA Chat Agent",
    "Master Orchestrator",
    "5 Active Specialists",
    "Task Complexity Analysis",
    "Intelligent Routing"
  ]
}
```

**Degraded (200):**
```json
{
  "status": "degraded",
  "issues": ["vector_search_unavailable"]
}
```

**Unhealthy (503):**
```json
{
  "status": "unhealthy",
  "error": "Core services unavailable"
}
```

#### Example

```bash
curl http://localhost:8081/health
```

---

## Task Types and Agent Routing

### Hierarchical Agent System (Agentic Mode)

The system uses a 5-level hierarchy with intelligent routing based on task complexity:

#### Level 1: VANA Chat Agent
- **Role:** User interface, minimal tools (2)
- **Routes to:** Master Orchestrator for all substantive tasks

#### Level 2: Master Orchestrator (HierarchicalTaskManager)
- **Complexity Analysis:** Simple → Moderate → Complex → Enterprise
- **Tools:** 5 routing and coordination tools
- **Routes to:** Appropriate specialist agents

#### Level 3: Project Managers (Phase 3 - Coming Soon)
- **Sequential Workflow Manager**
- **Parallel Workflow Manager**
- **Loop Workflow Manager**

#### Level 4: Specialist Agents (Active)

##### Architecture Specialist
**Triggers:** "system design", "architecture", "patterns", "structure"
**Tools:** analyze_codebase, suggest_patterns, review_architecture, document_design
**Capabilities:** System design, pattern recommendations, architecture reviews

##### DevOps Specialist
**Triggers:** "deployment", "CI/CD", "infrastructure", "monitoring"
**Tools:** analyze_deployment, suggest_pipeline, review_infrastructure, optimize_performance
**Capabilities:** Deployment strategies, pipeline optimization, infrastructure as code

##### QA Specialist
**Triggers:** "testing", "quality", "bugs", "test coverage"
**Tools:** analyze_tests, generate_test_cases, review_coverage, suggest_improvements
**Capabilities:** Test strategy, coverage analysis, quality metrics

##### UI/UX Specialist
**Triggers:** "interface", "user experience", "design", "frontend"
**Tools:** analyze_ui, suggest_ux_improvements, review_accessibility, create_mockups
**Capabilities:** UI analysis, UX recommendations, accessibility reviews

##### Data Science Specialist
**Triggers:** "analyze data", "machine learning", "statistics", "visualization"
**Tools:** statistical_analysis, ml_operations, data_visualization, feature_engineering
**Capabilities:** Data analysis, ML model development, statistical insights

#### Level 5: Maintenance Agents (Phase 4 - Coming Soon)
- **Memory Agent:** Long-term memory management
- **Planning Agent:** Strategic planning and optimization
- **Learning Agent:** System improvement through experience

### Legacy Routing (Standard Mode)

VANA automatically analyzes tasks and routes them to appropriate agents:

### Code Execution Tasks
**Triggers:** "write code", "execute script", "run program", "debug"
**Agent:** Code Execution Agent
**Capabilities:** Multi-language support, sandboxed execution, code analysis

### Data Science Tasks
**Triggers:** "analyze data", "create visualization", "machine learning", "statistics"
**Agent:** Data Science Agent
**Capabilities:** Statistical analysis, ML operations, data visualization

### File Operations
**Triggers:** "create file", "read file", "list directory", "delete"
**Agent:** File System Tools
**Capabilities:** CRUD operations, directory management, file validation

### Web Research
**Triggers:** "search for", "find information", "latest news", "research"
**Agent:** Web Search Tools
**Capabilities:** Real-time web search, information extraction, content summarization

### General Orchestration
**Triggers:** Complex multi-step tasks, coordination requests
**Agent:** VANA Orchestrator
**Capabilities:** Task decomposition, agent coordination, workflow management

## Response Formats

### Success Response Structure
```json
{
  "result": {
    "output": "Main response content",
    "id": "session_identifier",
    "metadata": {
      "agent_used": "agent_name",
      "execution_time": "time_in_seconds",
      "tools_invoked": ["tool1", "tool2"]
    }
  }
}
```

### Error Response Structure
```json
{
  "error": {
    "type": "error_type",
    "message": "Human-readable error message",
    "code": "error_code",
    "details": "Additional error information"
  }
}
```

## Rate Limiting

Current rate limits:
- **General requests:** 100 requests per minute
- **Health checks:** 1000 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1625097600
```

## Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| 400 | Bad Request | Check request format and required fields |
| 401 | Unauthorized | Verify API key |
| 429 | Rate Limited | Reduce request frequency |
| 500 | Internal Error | Check system logs, contact support |
| 503 | Service Unavailable | System maintenance or overload |

## SDKs and Libraries

### Python Client

```python
import requests

class VANAClient:
    def __init__(self, base_url="http://localhost:8081"):
        self.base_url = base_url
    
    def run_task(self, input_text):
        response = requests.post(
            f"{self.base_url}/run",
            json={"input": input_text},
            headers={"Content-Type": "application/json"}
        )
        return response.json()
    
    def health_check(self):
        response = requests.get(f"{self.base_url}/health")
        return response.json()

# Usage
client = VANAClient()
result = client.run_task("Create a simple Python script")
print(result)
```

### JavaScript Client

```javascript
class VANAClient {
  constructor(baseUrl = 'http://localhost:8081') {
    this.baseUrl = baseUrl;
  }
  
  async runTask(input) {
    const response = await fetch(`${this.baseUrl}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    });
    return response.json();
  }
  
  async healthCheck() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

// Usage
const client = new VANAClient();
client.runTask('Analyze this data').then(result => {
  console.log(result);
});
```

## Webhooks (Planned)

Future webhook support for long-running tasks:

```json
{
  "webhook_url": "https://your-app.com/webhook",
  "events": ["task_complete", "task_failed"],
  "input": "Long running task description"
}
```

## Streaming API (Planned)

Future streaming support for real-time responses:

```javascript
const eventSource = new EventSource('/run/stream?input=task');
eventSource.onmessage = function(event) {
  console.log(JSON.parse(event.data));
};
```

---

## Best Practices

### Request Optimization
1. **Be specific**: Clear, detailed task descriptions yield better results
2. **Context matters**: Provide relevant context for better agent selection
3. **Batch operations**: Combine related tasks when possible

### Error Handling
1. **Always check status codes**: Don't assume success
2. **Implement retries**: For transient failures with exponential backoff
3. **Log responses**: For debugging and optimization

### Performance
1. **Cache responses**: When appropriate for your use case
2. **Monitor rate limits**: Implement proper throttling
3. **Use health checks**: Monitor system availability

---

*This API is actively developed. Check back for updates and new features.*