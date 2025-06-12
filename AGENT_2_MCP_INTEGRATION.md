# AGENT 2: MCP Server Integration Development

**Priority**: HIGH | **Timeline**: 4-6 days | **Branch**: `feature/mcp-integration-agent2`

## 🎯 YOUR MISSION

Implement the Model Context Protocol (MCP) integration system for external tool access, including GitHub, Brave Search, and Fetch server integrations. This enables VANA agents to access external services and APIs.

## 📋 SETUP INSTRUCTIONS

```bash
git clone https://github.com/NickB03/vana.git
cd vana
git checkout main
git pull origin main
git checkout -b feature/mcp-integration-agent2
poetry install
```

## 🎯 YOUR ASSIGNED DIRECTORIES

**YOU HAVE EXCLUSIVE OWNERSHIP OF:**
- `lib/mcp/` (create entire directory structure)
- `lib/mcp/core/` (MCP manager, client, registry)
- `lib/mcp/servers/` (GitHub, Brave Search, Fetch integrations)
- `lib/mcp/config/` (server configurations and security settings)
- `tests/mcp/` (comprehensive test suite)

**DO NOT MODIFY ANY OTHER DIRECTORIES**

## 🔧 IMPLEMENTATION REQUIREMENTS

### 1. MCP Manager (`lib/mcp/core/mcp_manager.py`)
```python
class MCPManager:
    """Centralized MCP server lifecycle management and coordination."""
    
    def __init__(self, config_path: str):
        """Initialize with server configuration."""
        
    def start_server(self, server_name: str) -> ServerInstance:
        """Start an MCP server instance."""
        
    def stop_server(self, server_name: str) -> bool:
        """Stop an MCP server instance."""
        
    def discover_tools(self, server_name: str) -> List[Tool]:
        """Discover available tools from a server."""
        
    def execute_tool(self, server_name: str, tool_name: str, params: dict) -> ToolResult:
        """Execute a tool on a specific server."""
        
    def get_server_health(self, server_name: str) -> HealthStatus:
        """Check server health and status."""
        
    def restart_server(self, server_name: str) -> bool:
        """Restart a failed server."""
```

### 2. MCP Client (`lib/mcp/core/mcp_client.py`)
```python
class MCPClient:
    """JSON-RPC protocol implementation for MCP communication."""
    
    def __init__(self, server_config: ServerConfig):
        """Initialize client with server configuration."""
        
    def connect(self) -> bool:
        """Establish connection to MCP server."""
        
    def send_request(self, method: str, params: dict, timeout: int = 30) -> Response:
        """Send JSON-RPC request with timeout and retry."""
        
    def call_tool(self, tool_name: str, arguments: dict) -> ToolResponse:
        """Call a specific tool with arguments."""
        
    def list_tools(self) -> List[ToolInfo]:
        """List available tools from server."""
        
    def disconnect(self) -> bool:
        """Clean disconnect from server."""
```

### 3. MCP Registry (`lib/mcp/core/mcp_registry.py`)
```python
class MCPRegistry:
    """Server and tool registry with capability indexing."""
    
    def register_server(self, server_info: ServerInfo) -> bool:
        """Register a new MCP server."""
        
    def unregister_server(self, server_name: str) -> bool:
        """Unregister an MCP server."""
        
    def find_tool(self, tool_name: str) -> List[ServerInfo]:
        """Find servers that provide a specific tool."""
        
    def get_capabilities(self, server_name: str) -> Capabilities:
        """Get server capabilities and tool list."""
        
    def update_metrics(self, server_name: str, metrics: PerformanceMetrics) -> bool:
        """Update performance metrics for a server."""
```

### 4. GitHub Server Integration (`lib/mcp/servers/github_server.py`)
```python
class GitHubServer:
    """GitHub API integration for repository and issue management."""
    
    def __init__(self, api_token: str, rate_limit: int = 60):
        """Initialize with GitHub API token."""
        
    # Repository Management
    def create_repository(self, name: str, description: str, private: bool = False) -> Repository:
        """Create a new GitHub repository."""
        
    def clone_repository(self, repo_url: str, local_path: str) -> bool:
        """Clone repository to local path."""
        
    def list_repositories(self, user: str, limit: int = 50) -> List[Repository]:
        """List user repositories."""
        
    # Issue Management
    def create_issue(self, repo: str, title: str, body: str, labels: List[str] = None) -> Issue:
        """Create a new issue."""
        
    def update_issue(self, repo: str, issue_number: int, **kwargs) -> Issue:
        """Update an existing issue."""
        
    def search_issues(self, query: str, repo: str = None) -> List[Issue]:
        """Search issues with query."""
        
    def add_comment(self, repo: str, issue_number: int, comment: str) -> Comment:
        """Add comment to issue."""
        
    # Code Operations
    def search_code(self, query: str, repo: str = None, language: str = None) -> List[CodeResult]:
        """Search code in repositories."""
        
    def get_file_content(self, repo: str, file_path: str, ref: str = "main") -> FileContent:
        """Get file content from repository."""
        
    def create_pull_request(self, repo: str, title: str, body: str, head: str, base: str) -> PullRequest:
        """Create a pull request."""
```

### 5. Brave Search Integration (`lib/mcp/servers/brave_search_server.py`)
```python
class BraveSearchServer:
    """Brave Search API integration for web search capabilities."""
    
    def __init__(self, api_key: str, rate_limit: int = 100):
        """Initialize with Brave Search API key."""
        
    def web_search(self, query: str, count: int = 10, offset: int = 0, 
                   country: str = "US", language: str = "en") -> SearchResults:
        """Perform web search with filtering options."""
        
    def news_search(self, query: str, count: int = 10, 
                    freshness: str = "pd", country: str = "US") -> NewsResults:
        """Search news articles with date filtering."""
        
    def image_search(self, query: str, count: int = 10, 
                     size: str = "medium", type: str = "photo") -> ImageResults:
        """Search images with size and type filtering."""
        
    def video_search(self, query: str, count: int = 10, 
                     duration: str = "medium") -> VideoResults:
        """Search videos with duration filtering."""
        
    def local_search(self, query: str, location: str, 
                     radius: int = 5000) -> LocalResults:
        """Search local businesses and places."""
        
    def get_suggestions(self, query: str, country: str = "US") -> List[str]:
        """Get search suggestions for query."""
```

### 6. Fetch Server Integration (`lib/mcp/servers/fetch_server.py`)
```python
class FetchServer:
    """HTTP client for web requests and content fetching."""
    
    def __init__(self, timeout: int = 30, max_size: int = 10485760):
        """Initialize with timeout and size limits."""
        
    def http_get(self, url: str, headers: dict = None, params: dict = None) -> HttpResponse:
        """Perform HTTP GET request."""
        
    def http_post(self, url: str, data: dict = None, json: dict = None, 
                  headers: dict = None) -> HttpResponse:
        """Perform HTTP POST request."""
        
    def http_put(self, url: str, data: dict = None, json: dict = None, 
                 headers: dict = None) -> HttpResponse:
        """Perform HTTP PUT request."""
        
    def http_delete(self, url: str, headers: dict = None) -> HttpResponse:
        """Perform HTTP DELETE request."""
        
    def scrape_content(self, url: str, selector: str = None) -> ScrapedContent:
        """Scrape web content with optional CSS selector."""
        
    def download_file(self, url: str, local_path: str, 
                      progress_callback: callable = None) -> DownloadResult:
        """Download file with progress tracking."""
        
    def check_url_status(self, url: str) -> UrlStatus:
        """Check URL status and accessibility."""
```

## 📁 CONFIGURATION STRUCTURE

### Server Configuration (`lib/mcp/config/servers.json`)
```json
{
  "github": {
    "enabled": true,
    "api_token_env": "GITHUB_TOKEN",
    "rate_limit": 60,
    "timeout": 30,
    "retry_attempts": 3
  },
  "brave_search": {
    "enabled": true,
    "api_key_env": "BRAVE_API_KEY",
    "rate_limit": 100,
    "timeout": 15,
    "default_country": "US"
  },
  "fetch": {
    "enabled": true,
    "timeout": 30,
    "max_file_size": 10485760,
    "allowed_domains": ["*"],
    "blocked_domains": ["localhost", "127.0.0.1"]
  }
}
```

### Security Configuration (`lib/mcp/config/security.json`)
```json
{
  "domain_restrictions": {
    "allowed_domains": ["github.com", "api.github.com", "search.brave.com"],
    "blocked_domains": ["localhost", "127.0.0.1", "0.0.0.0"],
    "require_https": true
  },
  "rate_limiting": {
    "requests_per_minute": 100,
    "burst_limit": 10,
    "cooldown_seconds": 60
  },
  "request_limits": {
    "max_request_size": 1048576,
    "max_response_size": 10485760,
    "timeout_seconds": 30
  }
}
```

## 🧪 TESTING REQUIREMENTS

Create comprehensive tests in `tests/mcp/`:

### Test Files to Create:
- `test_mcp_manager.py` - Manager functionality tests
- `test_mcp_client.py` - JSON-RPC client tests
- `test_mcp_registry.py` - Registry and discovery tests
- `test_github_server.py` - GitHub integration tests (with mocks)
- `test_brave_search_server.py` - Brave Search tests (with mocks)
- `test_fetch_server.py` - HTTP client tests (with mocks)
- `test_security.py` - Security and rate limiting tests
- `test_integration.py` - End-to-end integration tests

### Mock Testing Strategy:
- Use `responses` library for HTTP mocking
- Mock all external API calls
- Test error handling and retry mechanisms
- Validate rate limiting and security measures

## ✅ SUCCESS CRITERIA

Your implementation is successful when:

1. **All three MCP servers (GitHub, Brave, Fetch) operational**
2. **Tool discovery and execution coordination working**
3. **Configuration management and security implemented**
4. **Error handling and retry mechanisms functional**
5. **Comprehensive test coverage (>85%)**
6. **All tests pass with mocked external services**
7. **Rate limiting and security measures working**
8. **JSON-RPC protocol correctly implemented**

## 🚀 GETTING STARTED

1. **Create the directory structure:**
```bash
mkdir -p lib/mcp/core
mkdir -p lib/mcp/servers
mkdir -p lib/mcp/config
mkdir -p tests/mcp
```

2. **Start with MCP Client** - Foundation for communication
3. **Build MCP Manager** - Orchestrates everything
4. **Implement MCP Registry** - Tool discovery
5. **Create server integrations** - GitHub, Brave, Fetch
6. **Add configuration management** - Security and settings
7. **Write comprehensive tests** - Mock all external calls
8. **Document API usage** - Enable integration

## 📝 COMMIT GUIDELINES

- Commit frequently: `feat: add GitHub server integration`
- Include tests with each server implementation
- Mock all external API calls in tests
- Document configuration options

## 🔄 WHEN READY TO MERGE

1. All tests pass with mocked services
2. Configuration files are complete
3. Security measures are implemented
4. Documentation includes API examples
5. Error handling covers edge cases

**Remember: You are building the external connectivity layer. Focus on reliability, security, and proper error handling.**
