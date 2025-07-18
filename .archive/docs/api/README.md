# VANA API Reference

**Last Updated**: July 11, 2025  
**Status**: Phase 3 Complete ✅

Complete documentation for VANA's hierarchical agent system, specialist tools, and API endpoints.

## 🏗️ Agent Hierarchy

### Level 1: User Interface
- **[VANA Chat Agent](./agents/vana-chat.md)** - User conversation interface (2 tools)

### Level 2: Orchestration
- **[Enhanced Master Orchestrator](./agents/master-orchestrator.md)** - Intelligent routing with caching/metrics (5 tools)

### Level 3: Workflow Managers (Phase 4)
- Sequential Manager - Linear task execution (coming soon)
- Parallel Manager - Concurrent execution (coming soon)
- Loop Manager - Iterative processing (coming soon)

### Level 4: Specialist Agents
- **[Architecture Specialist](./specialists/architecture-specialist.md)** - Code analysis and design (6 tools) ✅
- **[Security Specialist](./specialists/security-specialist.md)** - ELEVATED priority security (4 tools) ✅
- **[DevOps Specialist](./specialists/devops-specialist.md)** - Infrastructure automation (6 tools) ✅
- **[Data Science Specialist](./specialists/data-science-specialist.md)** - Pure Python analytics (6 tools) ✅
- **QA Specialist** - Test automation (Phase 4)
- **UI/UX Specialist** - Design analysis (Phase 4)

### Level 5: Maintenance Agents (Phase 4)
- Memory Agent - Long-term storage
- Planning Agent - Strategic planning
- Learning Agent - Self-improvement

## 🛠️ Tool Categories

### Core Tools (Always Available)
- **[File Operations](./tools/file-operations.md)** - Read, write, edit, and manage files
- **[Search Tools](./tools/search-tools.md)** - Content and pattern searching capabilities
- **[System Tools](./tools/system-tools.md)** - System monitoring and health checks

### Agent Coordination
- **[Agent Tools](./tools/agent-tools.md)** - Multi-agent coordination and task delegation
- **[Workflow Tools](./tools/workflow-tools.md)** - Multi-step workflow execution

### Specialist Tools (Phase 3)
- **[Architecture Tools](./tools/architecture-tools.md)** - AST analysis, patterns, refactoring ✅
- **[Security Tools](./tools/security-tools.md)** - Vulnerability scanning, compliance ✅
- **[DevOps Tools](./tools/devops-tools.md)** - CI/CD, K8s, monitoring ✅
- **[Data Science Tools](./tools/data-science-tools.md)** - Statistics, analysis, cleaning ✅

### MCP Integration
- **[Memory Tools](./tools/memory-tools.md)** - ChromaDB and persistent memory operations
- **[External Services](./tools/external-services.md)** - GitHub, filesystem, and web integration

## 🌐 REST API Endpoints

### Core Endpoints
```http
GET  /health          # System health check with phase info
GET  /version         # Version information (v3.0.0)
GET  /info            # Agent capabilities and status
```

### Chat API
```http
POST /api/v1/chat     # Main chat endpoint with hierarchical routing
{
  "query": "Analyze my code for security vulnerabilities",
  "session_id": "optional-session-id"
}
```

### Streaming API
```http
GET  /api/v1/stream   # Server-sent events for real-time responses
POST /api/v1/stream   # Streaming chat with hierarchical routing
```

### MCP Protocol
```http
GET  /mcp/sse         # Server-Sent Events for MCP
POST /mcp/messages    # JSON-RPC MCP communication
```

## 📋 System Status (Phase 3)

| Component | Status | Performance | Notes |
|-----------|--------|-------------|-------|
| **Enhanced Orchestrator** | ✅ Fully Functional | <100ms routing | LRU cache, metrics |
| **Architecture Specialist** | ✅ Working | 200-500ms | AST analysis, patterns |
| **Security Specialist** | ✅ ELEVATED | 100-300ms | Priority routing |
| **DevOps Specialist** | ✅ Working | 300-800ms | Config generation |
| **Data Science Specialist** | ✅ Working | 50-200ms | Pure Python |
| **File Operations** | ✅ Functional | <50ms | All operations working |
| **Search Tools** | ⚠️ Mostly Working | Variable | Coordinated search bug |
| **Memory Operations** | ⚠️ Fallback Mode | <50ms | In-memory fallback |
| **Code Execution** | ❌ Disabled | N/A | Sandbox issues |

## 🚀 Performance Metrics

### Routing Performance
- **Simple Tasks**: 10-50ms
- **Moderate Tasks**: 50-100ms
- **Complex Tasks**: 200-800ms
- **Cache Hits**: <5ms
- **Average Response**: <1s

### Cache Statistics
- **Hit Rate**: >90%
- **Speedup**: 40x for repeated queries
- **Capacity**: 100 entries (LRU)

### Specialist Response Times
| Specialist | Min | Avg | Max |
|------------|-----|-----|-----|
| Architecture | 200ms | 350ms | 500ms |
| Security | 100ms | 200ms | 300ms |
| DevOps | 300ms | 550ms | 800ms |
| Data Science | 50ms | 125ms | 200ms |

## 🔧 Tool Implementation Patterns

### ADK Compliance
All tools follow Google ADK patterns:
- Synchronous functions only (no async/await)
- Simple function-based tools
- Direct return values
- Maximum 6 tools per agent

### Standard Patterns
```python
def tool_name(param: str) -> str:
    """Tool description for ADK.
    
    Args:
        param: Parameter description
        
    Returns:
        Result description
    """
    # Validation
    if not param:
        return "Error: param is required"
    
    # Implementation
    result = process(param)
    
    # Return
    return format_result(result)
```

### Security Requirements
- Input validation on all tools
- Sanitization for file paths
- SQL injection prevention
- XSS protection
- Command injection blocking

## 📚 Quick Reference

### Essential Documentation
- **[Architecture Overview](../architecture/)** - System design and hierarchy
- **[Tool Permissions](./permissions.md)** - Configuration requirements
- **[Error Handling](./error-handling.md)** - Common errors and solutions
- **[Performance Guide](./performance.md)** - Optimization tips

### Phase 3 Additions
- **[Specialist Integration](./integration/specialists.md)** - Using specialists
- **[Routing Logic](./integration/routing.md)** - How tasks are routed
- **[Cache Strategy](./integration/caching.md)** - Response caching
- **[Security Priority](./integration/security-priority.md)** - ELEVATED routing

### Examples
- **[Basic Usage](./examples/basic.md)** - Simple requests
- **[Specialist Requests](./examples/specialists.md)** - Using each specialist
- **[Complex Workflows](./examples/workflows.md)** - Multi-step tasks
- **[Performance Tips](./examples/performance.md)** - Optimization

## 🔄 Version Information

**Current Version**: 3.0.0  
**Phase**: 3 Complete  
**Next Phase**: 4 (Workflow Management)  

See [CHANGELOG.md](../../CHANGELOG.md) for detailed version history.