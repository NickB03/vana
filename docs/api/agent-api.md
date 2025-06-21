# VANA Agent API Reference

## Agent Discovery

### List Available Agents
Retrieve all available agents in the VANA system with their capabilities and tools.

```http
GET /list-apps
```

**Response:**
```json
{
  "agents": [
    {
      "name": "vana",
      "description": "Main orchestration agent for task coordination and delegation",
      "tools": ["adk_echo", "adk_search_knowledge", "adk_coordinate_task", "adk_read_file", "adk_web_search"],
      "capabilities": ["orchestration", "delegation", "file_operations", "search", "workflow_management"],
      "status": "active"
    },
    {
      "name": "code_execution",
      "description": "Secure code execution specialist with multi-language support",
      "tools": ["execute_code", "validate_code_security", "get_execution_history"],
      "capabilities": ["python", "javascript", "shell", "security_validation"],
      "status": "active"
    },
    {
      "name": "data_science",
      "description": "Advanced data analysis and machine learning specialist",
      "tools": ["analyze_data", "visualize_data", "clean_data", "model_data"],
      "capabilities": ["statistical_analysis", "visualization", "ml_modeling"],
      "status": "active"
    },
    {
      "name": "memory",
      "description": "Proxy agent that delegates to VANA orchestrator",
      "tools": ["delegates_to_vana"],
      "capabilities": ["proxy_delegation"],
      "status": "active"
    },
    {
      "name": "orchestration",
      "description": "Proxy agent that delegates to VANA orchestrator",
      "tools": ["delegates_to_vana"],
      "capabilities": ["proxy_delegation"],
      "status": "active"
    },
    {
      "name": "specialists",
      "description": "Proxy agent that delegates to VANA orchestrator",
      "tools": ["delegates_to_vana"],
      "capabilities": ["proxy_delegation"],
      "status": "active"
    },
    {
      "name": "workflows",
      "description": "Proxy agent that delegates to VANA orchestrator",
      "tools": ["delegates_to_vana"],
      "capabilities": ["proxy_delegation"],
      "status": "active"
    }
  ],
  "architecture": "multi-agent with proxy pattern",
  "real_agents": 3,
  "proxy_agents": 4,
  "system_status": "operational"
}
```

### Get Agent Details
Retrieve detailed information about a specific agent.

```http
GET /agents/{agent_name}
```

**Parameters:**
- `agent_name` (string): Name of the agent to retrieve

**Response:**
```json
{
  "name": "vana",
  "description": "Main orchestration agent for task coordination and delegation",
  "version": "2.0.0",
  "tools": [
    {
      "name": "adk_read_file",
      "description": "Read file contents from the file system",
      "parameters": {
        "file_path": {"type": "string", "required": true}
      }
    },
    {
      "name": "adk_web_search",
      "description": "Search the web for information",
      "parameters": {
        "query": {"type": "string", "required": true},
        "max_results": {"type": "integer", "default": 5}
      }
    },
    {
      "name": "adk_coordinate_task",
      "description": "Coordinate tasks between agents",
      "parameters": {
        "task_description": {"type": "string", "required": true},
        "target_agent": {"type": "string", "required": false}
      }
    }
  ],
  "capabilities": ["file_operations", "search", "coordination", "task_analysis", "workflow_management"],
  "tool_categories": ["file_system", "search", "system", "coordination", "task_analysis", "workflow_management"],
  "status": "active",
  "last_updated": "2025-06-21T15:30:00Z"
}
```

## Tool Execution

### Execute Agent Tool
Execute a specific tool within an agent with provided parameters.

```http
POST /agents/{agent_name}/tools/{tool_name}
```

**Parameters:**
- `agent_name` (string): Name of the target agent
- `tool_name` (string): Name of the tool to execute

**Request Body:**
```json
{
  "parameters": {
    "file_path": "/path/to/file.txt"
  },
  "context": {
    "session_id": "session_123",
    "user_id": "user_456"
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "content": "File contents here...",
    "file_size": 1024,
    "encoding": "utf-8",
    "last_modified": "2025-06-21T10:00:00Z"
  },
  "metadata": {
    "agent": "vana",
    "tool": "adk_read_file",
    "timestamp": "2025-06-21T15:30:00Z",
    "execution_id": "exec_789"
  }
}
```

### Batch Tool Execution
Execute multiple tools in sequence or parallel.

```http
POST /agents/batch-execute
```

**Request Body:**
```json
{
  "execution_mode": "sequential",
  "tasks": [
    {
      "agent": "vana",
      "tool": "adk_read_file",
      "parameters": {
        "file_path": "dataset.csv"
      }
    },
    {
      "agent": "vana",
      "tool": "adk_web_search",
      "parameters": {
        "query": "data analysis techniques",
        "max_results": 3
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "batch_id": "batch_123",
  "results": [
    {
      "task_id": 0,
      "success": true,
      "result": {
        "content": "CSV file contents with 1000 rows, 5 columns",
        "file_size": 50000,
        "encoding": "utf-8"
      }
    },
    {
      "task_id": 1,
      "success": true,
      "result": {
        "results": [
          {"title": "Data Analysis Guide", "url": "https://example.com/guide1"},
          {"title": "Statistical Methods", "url": "https://example.com/guide2"}
        ],
        "total_results": 2
      }
    }
  ],
  "total_execution_time": 2.45
}
```

## Agent Communication

### Send Message to Agent
Send a natural language message to an agent for processing.

```http
POST /agents/{agent_name}/message
```

**Request Body:**
```json
{
  "message": "Can you analyze this dataset and create a visualization?",
  "attachments": [
    {
      "type": "file",
      "name": "data.csv",
      "content": "base64_encoded_content"
    }
  ],
  "context": {
    "conversation_id": "conv_123",
    "previous_messages": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": {
    "message": "I'll analyze your dataset and create a visualization. Let me start with descriptive statistics.",
    "actions_taken": [
      {
        "tool": "analyze_data",
        "result": "Dataset analysis complete"
      },
      {
        "tool": "visualize_data",
        "result": "Histogram created successfully"
      }
    ],
    "attachments": [
      {
        "type": "image",
        "name": "analysis_chart.png",
        "url": "/results/chart_789.png"
      }
    ]
  },
  "metadata": {
    "response_time": 3.2,
    "tools_used": 2,
    "confidence": 0.95
  }
}
```

### Agent-to-Agent Communication
Enable agents to communicate with each other for complex workflows.

```http
POST /agents/{source_agent}/delegate/{target_agent}
```

**Request Body:**
```json
{
  "task": "Execute this Python code and analyze the results",
  "parameters": {
    "code": "import pandas as pd; df = pd.read_csv('data.csv'); print(df.describe())",
    "analysis_type": "statistical"
  },
  "delegation_context": {
    "priority": "high",
    "timeout": 60,
    "return_format": "structured"
  }
}
```

**Response:**
```json
{
  "success": true,
  "delegation_id": "deleg_456",
  "result": {
    "execution_output": "Statistical summary of dataset",
    "analysis_results": {
      "rows": 1000,
      "columns": 5,
      "missing_values": 12,
      "data_types": ["int64", "float64", "object"]
    }
  },
  "workflow": {
    "steps": [
      {"agent": "code_execution", "action": "execute_code", "status": "completed"},
      {"agent": "data_science", "action": "analyze_data", "status": "completed"}
    ],
    "total_time": 4.1
  }
}
```

## Error Responses

### Standard Error Format
All API endpoints return errors in a consistent format.

```json
{
  "success": false,
  "error": {
    "code": "TOOL_EXECUTION_FAILED",
    "message": "Tool execution failed due to invalid parameters",
    "details": {
      "parameter": "code",
      "issue": "Security validation failed: potentially malicious code detected",
      "suggestion": "Please review your code for security compliance"
    },
    "timestamp": "2025-06-12T15:30:00Z",
    "request_id": "req_789"
  }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `AGENT_NOT_FOUND` | Specified agent does not exist | 404 |
| `TOOL_NOT_FOUND` | Specified tool not available for agent | 404 |
| `INVALID_PARAMETERS` | Tool parameters are invalid or missing | 400 |
| `TOOL_EXECUTION_FAILED` | Tool execution encountered an error | 500 |
| `SECURITY_VIOLATION` | Request violates security policies | 403 |
| `RATE_LIMIT_EXCEEDED` | Too many requests in time window | 429 |
| `AGENT_UNAVAILABLE` | Agent is temporarily unavailable | 503 |
| `TIMEOUT_ERROR` | Request exceeded maximum execution time | 408 |

### Error Handling Examples

**Security Violation:**
```json
{
  "success": false,
  "error": {
    "code": "SECURITY_VIOLATION",
    "message": "Code execution blocked by security policy",
    "details": {
      "violation_type": "forbidden_import",
      "blocked_import": "os.system",
      "security_level": "high"
    }
  }
}
```

**Rate Limit Exceeded:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Request rate limit exceeded",
    "details": {
      "limit": "100 requests per minute",
      "current_usage": 101,
      "reset_time": "2025-06-12T15:31:00Z"
    }
  }
}
```

## Authentication

### API Key Authentication
Include your API key in the request headers.

```http
Authorization: Bearer your_api_key_here
Content-Type: application/json
```

### Service Account Authentication
For server-to-server communication, use service account credentials.

```python
import requests
from google.auth import default

# Get default credentials
credentials, project = default()

# Make authenticated request
headers = {
    'Authorization': f'Bearer {credentials.token}',
    'Content-Type': 'application/json'
}

response = requests.get(
    'https://vana-prod-960076421399.us-central1.run.app/list-apps',
    headers=headers
)
```

## Rate Limiting

### Rate Limit Headers
All responses include rate limiting information.

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 60
```

### Rate Limit Policies

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Agent Discovery | 1000/hour | 1 hour |
| Tool Execution | 100/minute | 1 minute |
| Message Processing | 50/minute | 1 minute |
| Batch Operations | 10/minute | 1 minute |
