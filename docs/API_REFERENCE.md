# VANA API Reference

Complete reference for the VANA multi-agent AI system API.

## Base URL

```
http://localhost:8081
```

## Authentication

Currently, VANA uses API key authentication for frontend integration. Include your API key in the request headers:

```bash
# For frontend requests
-H "Authorization: Bearer your_api_key"
```

## Endpoints

### POST /run

Execute a task through VANA's multi-agent orchestration system.

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

**Success (200):**
```json
{
  "status": "healthy"
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