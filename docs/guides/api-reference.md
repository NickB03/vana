# 📚 API Reference

Complete reference for VANA's REST API, tools, and agent interfaces.

## 🌐 REST API Endpoints

### Base URL
- **Production**: `https://vana-prod-960076421399.us-central1.run.app`
- **Local**: `http://localhost:8080`

### Authentication
VANA uses Google Cloud IAM for authentication in production and API key authentication for local development.

```bash
# Production (using gcloud auth)
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     https://vana-prod-960076421399.us-central1.run.app/api/chat

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
  "agent": "vana",
  "mcp_enabled": true
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

### MCP Time Tools

#### get_current_time
Get current time with timezone support.

**Parameters:**
- `timezone` (string, optional): Target timezone (default: UTC)

#### convert_timezone
Convert datetime between timezones.

**Parameters:**
- `datetime_str` (string, required): Source datetime
- `from_tz` (string, required): Source timezone
- `to_tz` (string, required): Target timezone

#### calculate_date
Perform date calculations.

**Parameters:**
- `base_date` (string, required): Base date
- `operation` (string, required): Calculation operation

#### format_datetime
Format datetime strings.

**Parameters:**
- `datetime_str` (string, required): Datetime to format
- `format_str` (string, required): Format specification

#### get_time_until
Calculate time until target datetime.

**Parameters:**
- `target_datetime` (string, required): Target datetime

#### list_timezones
List available timezones.

**Parameters:**
- `region` (string, optional): Filter by region

### MCP Filesystem Tools

#### get_file_metadata
Get detailed file information.

**Parameters:**
- `file_path` (string, required): Path to file

#### batch_file_operations
Perform bulk file operations.

**Parameters:**
- `operations` (array, required): List of operations

#### compress_files
Compress files into archive.

**Parameters:**
- `file_list` (array, required): Files to compress
- `archive_name` (string, required): Archive filename

#### extract_archive
Extract files from archive.

**Parameters:**
- `archive_path` (string, required): Archive to extract
- `destination` (string, required): Extraction destination

#### find_files
Advanced file search.

**Parameters:**
- `search_pattern` (string, required): Search pattern
- `directory` (string, required): Search directory

#### sync_directories
Synchronize directories.

**Parameters:**
- `source` (string, required): Source directory
- `destination` (string, required): Destination directory

### MCP Core Integration

#### context7_sequential_thinking
Advanced reasoning capabilities.

**Parameters:**
- `problem` (string, required): Problem to analyze

#### brave_search_mcp
Enhanced web search.

**Parameters:**
- `query` (string, required): Search query
- `options` (object, optional): Search options

#### github_mcp_operations
GitHub API operations.

**Parameters:**
- `operation` (string, required): GitHub operation
- `params` (object, required): Operation parameters

#### list_available_mcp_servers
List MCP servers.

**Parameters:** None

#### get_mcp_integration_status
Get MCP integration status.

**Parameters:** None

### Agent-as-Tools

The repository exposes a small set of specialist agents as callable tools:

#### Available Tools
- `architecture_tool` – Architecture analysis
- `ui_tool` – UI/UX guidance
- `devops_tool` – Infrastructure planning
- `qa_tool` – Testing strategy

Additional agent tools described in earlier documentation (e.g. travel or
research agents) are not implemented in the current codebase.

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
client = VanaClient("https://vana-prod-960076421399.us-central1.run.app")
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
const client = new VanaClient('https://vana-prod-960076421399.us-central1.run.app');
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

