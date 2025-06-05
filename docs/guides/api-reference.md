# 📚 API Reference

Complete reference for VANA's REST API, tools, and agent interfaces.

## 🌐 REST API Endpoints

### Base URL
- **Production**: `https://vana-qqugqgsbcq-uc.a.run.app`
- **Local**: `http://localhost:8080`

### Authentication
VANA uses Google Cloud IAM for authentication in production and API key authentication for local development.

```bash
# Production (using gcloud auth)
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     https://vana-qqugqgsbcq-uc.a.run.app/api/chat

# Local development
curl -H "X-API-Key: your-api-key" \
     http://localhost:8080/api/chat
```

### Core Endpoints

#### POST /api/chat
Main chat interface for interacting with VANA.

**Request:**
```json
{
  "message": "Your request to VANA",
  "session_id": "optional-session-id",
  "agent": "optional-specific-agent",
  "context": {
    "user_id": "optional-user-id",
    "preferences": {}
  }
}
```

**Response:**
```json
{
  "response": "VANA's response",
  "agent": "responding-agent",
  "tools_used": ["tool1", "tool2"],
  "execution_time": "1.23s",
  "session_id": "session-id",
  "task_id": "task-id-for-long-running",
  "metadata": {
    "confidence": 0.95,
    "sources": ["source1", "source2"]
  }
}
```

#### GET /api/health
System health and status information.

**Response:**
```json
{
  "status": "healthy",
  "agents": {
    "total": 24,
    "healthy": 24,
    "degraded": 0,
    "failed": 0
  },
  "tools": {
    "total": 42,
    "available": 42,
    "errors": 0
  },
  "performance": {
    "avg_response_time": "0.45s",
    "success_rate": "99.8%",
    "cache_hit_rate": "95.2%"
  },
  "resources": {
    "memory_usage": "68%",
    "cpu_usage": "23%",
    "api_quotas": {
      "vertex_ai": "45%",
      "brave_search": "12%"
    }
  }
}
```

#### GET /api/agents
List all available agents and their status.

**Response:**
```json
{
  "agents": [
    {
      "name": "vana",
      "type": "orchestrator",
      "status": "healthy",
      "description": "Master orchestrator agent",
      "capabilities": ["coordination", "planning", "synthesis"],
      "tools": ["echo", "coordinate_task", "delegate_to_agent"]
    },
    {
      "name": "travel_orchestrator",
      "type": "domain_orchestrator",
      "status": "healthy",
      "description": "Travel workflow coordination",
      "capabilities": ["travel_planning", "booking_coordination"],
      "tools": ["hotel_agent", "flight_agent", "itinerary_agent"]
    }
  ]
}
```

#### GET /api/tools
List all available tools and their specifications.

**Response:**
```json
{
  "tools": [
    {
      "name": "echo",
      "category": "system",
      "description": "Echo input for testing",
      "parameters": {
        "message": {
          "type": "string",
          "required": true,
          "description": "Message to echo"
        }
      },
      "response_format": "StandardToolResponse"
    }
  ]
}
```

#### GET /api/tasks/{task_id}
Get status of a long-running task.

**Response:**
```json
{
  "task_id": "task-123",
  "status": "running",
  "progress": 65,
  "started_at": "2024-01-15T10:30:00Z",
  "estimated_completion": "2024-01-15T10:35:00Z",
  "result": null,
  "error": null
}
```

#### POST /api/tools/{tool_name}
Execute a specific tool directly.

**Request:**
```json
{
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": "tool-specific-data",
  "message": "Operation completed successfully",
  "execution_time": 0.123,
  "tool_name": "tool_name",
  "metadata": {}
}
```

## 🛠️ Tool Reference

### File System Tools

#### read_file
Read contents of a file.

**Parameters:**
- `file_path` (string, required): Path to the file
- `encoding` (string, optional): File encoding (default: utf-8)

**Example:**
```json
{
  "file_path": "/path/to/file.txt",
  "encoding": "utf-8"
}
```

#### write_file
Write content to a file.

**Parameters:**
- `file_path` (string, required): Path to the file
- `content` (string, required): Content to write
- `mode` (string, optional): Write mode (default: w)

#### list_directory
List contents of a directory.

**Parameters:**
- `directory_path` (string, required): Path to directory
- `recursive` (boolean, optional): Include subdirectories

#### file_exists
Check if a file exists.

**Parameters:**
- `file_path` (string, required): Path to check

### Search Tools

#### vector_search
Perform semantic search using Vertex AI.

**Parameters:**
- `query` (string, required): Search query
- `limit` (integer, optional): Number of results (default: 10)
- `threshold` (float, optional): Similarity threshold (default: 0.7)

#### web_search
Search the web using Brave Search API.

**Parameters:**
- `query` (string, required): Search query
- `count` (integer, optional): Number of results (default: 10)
- `safe_search` (string, optional): Safe search level

#### search_knowledge
Hybrid search across multiple sources.

**Parameters:**
- `query` (string, required): Search query
- `sources` (array, optional): Sources to search
- `limit` (integer, optional): Results per source

### System Tools

#### echo
Echo input for testing.

**Parameters:**
- `message` (string, required): Message to echo

#### get_health_status
Get system health information.

**Parameters:** None

### Coordination Tools

#### coordinate_task
Coordinate a multi-agent task.

**Parameters:**
- `task_description` (string, required): Task to coordinate
- `agents` (array, optional): Specific agents to involve
- `priority` (string, optional): Task priority

#### delegate_to_agent
Delegate a task to a specific agent.

**Parameters:**
- `agent_name` (string, required): Target agent
- `task` (string, required): Task description
- `context` (object, optional): Additional context

#### get_agent_status
Get status of a specific agent.

**Parameters:**
- `agent_name` (string, required): Agent to check

#### transfer_to_agent
Transfer control to another agent.

**Parameters:**
- `agent_name` (string, required): Target agent
- `context` (object, optional): Transfer context

### Long Running Tools

#### ask_for_approval
Request human approval for an action.

**Parameters:**
- `action_description` (string, required): Action requiring approval
- `details` (object, optional): Additional details
- `timeout` (integer, optional): Approval timeout in seconds

#### process_large_dataset
Process a large dataset asynchronously.

**Parameters:**
- `dataset_path` (string, required): Path to dataset
- `operation` (string, required): Processing operation
- `parameters` (object, optional): Operation parameters

#### generate_report
Generate a comprehensive report.

**Parameters:**
- `report_type` (string, required): Type of report
- `data_sources` (array, required): Data sources
- `format` (string, optional): Output format

#### check_task_status
Check status of a long-running task.

**Parameters:**
- `task_id` (string, required): Task identifier

### Agent-as-Tools

All 20 specialist agents are available as tools:

#### Travel Agents
- `hotel_agent` - Hotel search and booking
- `flight_agent` - Flight search and management
- `payment_agent` - Payment processing
- `itinerary_agent` - Trip planning

#### Development Agents
- `code_generator` - Code generation
- `testing_agent` - Test creation and execution
- `documentation_agent` - Documentation generation
- `security_agent` - Security analysis

#### Research Agents
- `web_research_agent` - Web research
- `data_analysis_agent` - Data analysis
- `competitive_intelligence_agent` - Market research

#### Intelligence Agents
- `memory_management_agent` - Knowledge management
- `decision_engine_agent` - Decision support
- `learning_systems_agent` - System optimization

#### Utility Agents
- `monitoring_agent` - System monitoring
- `coordination_agent` - Workflow coordination

## 📊 Response Formats

### StandardToolResponse
All tools return responses in this standardized format:

```json
{
  "success": boolean,
  "data": any,
  "message": string,
  "execution_time": float,
  "tool_name": string,
  "metadata": {
    "timestamp": "ISO-8601-datetime",
    "version": "tool-version",
    "cache_hit": boolean,
    "source": "data-source"
  }
}
```

### Error Response
Error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details",
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req-123"
  }
}
```

## 🔧 SDK Examples

### Python SDK
```python
import requests

class VanaClient:
    def __init__(self, base_url, api_key=None):
        self.base_url = base_url
        self.api_key = api_key
    
    def chat(self, message, session_id=None):
        headers = {}
        if self.api_key:
            headers['X-API-Key'] = self.api_key
        
        response = requests.post(
            f"{self.base_url}/api/chat",
            json={"message": message, "session_id": session_id},
            headers=headers
        )
        return response.json()
    
    def get_health(self):
        response = requests.get(f"{self.base_url}/api/health")
        return response.json()

# Usage
client = VanaClient("https://vana-qqugqgsbcq-uc.a.run.app")
result = client.chat("Hello VANA!")
print(result['response'])
```

### JavaScript SDK
```javascript
class VanaClient {
    constructor(baseUrl, apiKey = null) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }
    
    async chat(message, sessionId = null) {
        const headers = {'Content-Type': 'application/json'};
        if (this.apiKey) {
            headers['X-API-Key'] = this.apiKey;
        }
        
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                message: message,
                session_id: sessionId
            })
        });
        
        return await response.json();
    }
    
    async getHealth() {
        const response = await fetch(`${this.baseUrl}/api/health`);
        return await response.json();
    }
}

// Usage
const client = new VanaClient('https://vana-qqugqgsbcq-uc.a.run.app');
client.chat('Hello VANA!').then(result => {
    console.log(result.response);
});
```

## 🚨 Rate Limits

### API Rate Limits
- **Chat API**: 100 requests per minute per user
- **Tool API**: 500 requests per minute per user
- **Health API**: 1000 requests per minute per user

### Tool-Specific Limits
- **Web Search**: 100 searches per hour
- **Vector Search**: 1000 queries per hour
- **File Operations**: 1000 operations per hour

## 🔒 Security

### Authentication Methods
1. **Google Cloud IAM** (Production)
2. **API Key** (Development)
3. **Service Account** (Automated systems)

### Input Validation
All inputs are validated for:
- Type checking
- Size limits
- Security threats
- Rate limiting

### Data Privacy
- No sensitive data is logged
- All communications use HTTPS
- Data is encrypted at rest
- Audit trails are maintained

---

**Need help?** Check our [troubleshooting guide](../troubleshooting/common-issues.md) or [create an issue](https://github.com/NickB03/vana/issues).
