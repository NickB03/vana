# VANA API Reference

Complete documentation for VANA's tools, agents, and endpoints.

## 🛠️ Tool Categories

### Core Tools (Always Available)
- **[File Operations](./tools/file-operations.md)** - Read, write, edit, and manage files
- **[Search Tools](./tools/search-tools.md)** - Content and pattern searching capabilities
- **[System Tools](./tools/system-tools.md)** - System monitoring and health checks

### Agent Coordination
- **[Agent Tools](./tools/agent-tools.md)** - Multi-agent coordination and task delegation
- **[Workflow Tools](./tools/workflow-tools.md)** - Multi-step workflow execution

### MCP Integration
- **[Memory Tools](./tools/memory-tools.md)** - ChromaDB and persistent memory operations
- **[External Services](./tools/external-services.md)** - GitHub, filesystem, and web integration

## 🌐 REST API Endpoints

### Core Endpoints
- `GET /health` - System health check
- `GET /version` - Version information
- `GET /info` - Agent capabilities

### MCP Protocol
- `GET /mcp/sse` - Server-Sent Events for MCP
- `POST /mcp/messages` - JSON-RPC MCP communication

## 📋 Tool Status Reference

| Category | Status | Notes |
|----------|--------|-------|
| **File Operations** | ✅ Fully Functional | All file management operations working |
| **Search Tools** | ⚠️ Mostly Working | Coordinated search has known bug |
| **Agent Coordination** | ✅ Fully Functional | All delegation patterns working |
| **Memory Operations** | ⚠️ Fallback Mode | Using in-memory fallback |
| **External Services** | ⚠️ Requires Config | Needs API keys for full functionality |

## 🔧 Tool Implementation Patterns

All tools follow standardized patterns:
- Consistent error handling and validation
- Structured logging via `lib/logging/structured_logger.py`
- Type hints and comprehensive docstrings
- Security validation with input sanitization

## 📚 Quick Reference

- **[Tool Permissions](./permissions.md)** - Configuration requirements
- **[Error Handling](./error-handling.md)** - Common errors and solutions
- **[Examples](./examples/)** - Working code examples for each tool