# VANA MCP Integration System

A comprehensive Model Context Protocol (MCP) integration system for connecting to external MCP servers and services.

## Overview

The VANA MCP Integration System provides a robust framework for connecting to and managing external MCP servers, including GitHub, Brave Search, and HTTP fetch capabilities. It implements the MCP protocol for seamless tool discovery and execution across multiple external services.

## Features

- **MCP Client**: JSON-RPC protocol implementation for MCP communication
- **MCP Manager**: Centralized server lifecycle management and coordination
- **MCP Registry**: Server and tool registry with capability indexing
- **GitHub Integration**: Complete GitHub API integration for repositories, issues, and code search
- **Brave Search Integration**: Web, news, image, and video search capabilities
- **Fetch Integration**: HTTP client for web requests, scraping, and file downloads
- **Security & Configuration**: Comprehensive security policies and configuration management
- **Comprehensive Testing**: Full test suite with mocks for all external services

## Architecture

```
lib/mcp/
├── core/                   # Core MCP components
│   ├── mcp_client.py      # JSON-RPC client implementation
│   ├── mcp_manager.py     # Server lifecycle management
│   └── mcp_registry.py    # Capability tracking and discovery
├── servers/               # External server integrations
│   ├── github_server.py   # GitHub API integration
│   ├── brave_search_server.py  # Brave Search integration
│   └── fetch_server.py    # HTTP client integration
├── config/                # Configuration files
│   ├── servers.json       # Server configurations
│   └── security.json      # Security policies
└── example_usage.py       # Usage examples
```

## Quick Start

### 1. Installation

The MCP integration system is part of the VANA project. Ensure you have the required dependencies:

```bash
pip install requests asyncio
```

### 2. Configuration

Set up your API keys as environment variables:

```bash
export GITHUB_TOKEN="your_github_token"
export BRAVE_API_KEY="your_brave_api_key"
```

### 3. Basic Usage

```python
import asyncio
from lib.mcp.core.mcp_manager import MCPManager

async def main():
    # Create manager with configuration
    manager = MCPManager("lib/mcp/config/servers.json")
    
    try:
        # Start GitHub server
        github_instance = await manager.start_server("github")
        
        # Discover available tools
        tools = await manager.discover_tools("github")
        print(f"Available tools: {[tool.name for tool in tools]}")
        
        # Execute a tool
        result = await manager.execute_tool(
            "github", 
            "list_repositories", 
            {"user": "octocat", "limit": 5}
        )
        
        if result.success:
            print("Tool executed successfully!")
        
    finally:
        await manager.shutdown()

# Run the example
asyncio.run(main())
```

## Core Components

### MCP Client

The `MCPClient` handles JSON-RPC communication with external MCP servers:

```python
from lib.mcp.core.mcp_client import MCPClient, ServerConfig

# Create server configuration
config = ServerConfig(
    name="github",
    command=["python", "-m", "github_mcp_server"],
    env={"GITHUB_TOKEN": "your_token"}
)

# Create and connect client
client = MCPClient(config)
await client.connect()

# List available tools
tools = await client.list_tools()

# Execute a tool
response = await client.call_tool("create_repository", {
    "name": "test-repo",
    "description": "A test repository"
})
```

### MCP Manager

The `MCPManager` orchestrates multiple server connections:

```python
from lib.mcp.core.mcp_manager import MCPManager

manager = MCPManager("config/servers.json")

# Start multiple servers
await manager.start_server("github")
await manager.start_server("brave_search")
await manager.start_server("fetch")

# Get all available tools
all_tools = manager.get_all_tools()

# Execute tools across servers
github_result = await manager.execute_tool("github", "search_code", {"query": "function"})
search_result = await manager.execute_tool("brave_search", "web_search", {"query": "Python"})
```

### MCP Registry

The `MCPRegistry` provides capability tracking and intelligent routing:

```python
from lib.mcp.core.mcp_registry import MCPRegistry, ServerInfo, ServerStatus

registry = MCPRegistry()

# Register a server
server_info = ServerInfo(
    name="github",
    description="GitHub API integration",
    capabilities=["repositories", "issues"],
    tools=["create_repository", "create_issue"],
    status=ServerStatus.RUNNING
)
registry.register_server(server_info)

# Find servers by tool
servers = registry.find_tool("create_repository")

# Find servers by capability
dev_servers = registry.find_by_capability("repositories")
```

## Server Integrations

### GitHub Server

Complete GitHub API integration:

```python
from lib.mcp.servers.github_server import GitHubServer

github = GitHubServer("your_github_token")

# Repository operations
repos = github.list_repositories("octocat")
repo = github.create_repository("test-repo", "Description")

# Issue management
issue = github.create_issue("owner/repo", "Bug Report", "Description")
github.add_comment("owner/repo", 123, "This is a comment")

# Code search
results = github.search_code("function", language="python")
```

### Brave Search Server

Web search capabilities:

```python
from lib.mcp.servers.brave_search_server import BraveSearchServer

brave = BraveSearchServer("your_brave_api_key")

# Web search
web_results = brave.web_search("Python programming", count=10)

# News search
news_results = brave.news_search("AI technology", freshness="pd")

# Image search
image_results = brave.image_search("cats", size="medium")

# Get suggestions
suggestions = brave.get_suggestions("machine learn")
```

### Fetch Server

HTTP client and web scraping:

```python
from lib.mcp.servers.fetch_server import FetchServer

fetch = FetchServer()

# HTTP requests
response = fetch.http_get("https://api.example.com/data")
post_response = fetch.http_post("https://api.example.com/submit", json={"key": "value"})

# Web scraping
scraped = fetch.scrape_content("https://example.com")
print(f"Title: {scraped.title}")
print(f"Content: {scraped.content[:100]}...")

# File download
result = fetch.download_file("https://example.com/file.pdf", "/tmp/file.pdf")

# URL status check
status = fetch.check_url_status("https://example.com")
print(f"Status: {status.status_code}, Accessible: {status.accessible}")
```

## Configuration

### Server Configuration (`config/servers.json`)

```json
{
  "github": {
    "enabled": true,
    "command": ["python", "-m", "lib.mcp.servers.github_server"],
    "env": {"GITHUB_TOKEN": "${GITHUB_TOKEN}"},
    "rate_limit": 60,
    "timeout": 30
  },
  "brave_search": {
    "enabled": true,
    "command": ["python", "-m", "lib.mcp.servers.brave_search_server"],
    "env": {"BRAVE_API_KEY": "${BRAVE_API_KEY}"},
    "rate_limit": 100,
    "timeout": 15
  }
}
```

### Security Configuration (`config/security.json`)

```json
{
  "domain_restrictions": {
    "allowed_domains": ["github.com", "api.github.com", "search.brave.com"],
    "blocked_domains": ["localhost", "127.0.0.1"],
    "require_https": true
  },
  "rate_limiting": {
    "requests_per_minute": 100,
    "burst_limit": 10
  },
  "request_limits": {
    "max_request_size": 1048576,
    "max_response_size": 10485760,
    "timeout_seconds": 30
  }
}
```

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
pytest tests/mcp/ -v

# Run specific test categories
pytest tests/mcp/ -m unit
pytest tests/mcp/ -m integration
pytest tests/mcp/ -m slow

# Run with coverage
pytest tests/mcp/ --cov=lib.mcp --cov-report=html
```

## Error Handling

The system includes comprehensive error handling:

```python
try:
    result = await manager.execute_tool("github", "create_repository", params)
    if not result.success:
        print(f"Tool execution failed: {result.error_message}")
except Exception as e:
    print(f"System error: {e}")
```

## Performance Monitoring

Track server performance and health:

```python
# Check server health
health = await manager.get_server_health("github")
print(f"Healthy: {health.is_healthy}")
print(f"Response time: {health.response_time}")
print(f"Error count: {health.error_count}")

# Get performance metrics
metrics = registry.get_server_metrics("github")
print(f"Success rate: {metrics.successful_requests / metrics.total_requests}")
print(f"Average response time: {metrics.average_response_time}")
```

## Contributing

1. Follow the existing code structure and patterns
2. Add comprehensive tests for new functionality
3. Update documentation for any API changes
4. Ensure all tests pass before submitting

## License

This MCP integration system is part of the VANA project and follows the same licensing terms.
