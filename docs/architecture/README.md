# VANA Architecture Documentation

Technical overview of VANA's multi-agent AI system architecture.

## System Overview

VANA is built on Google's Agent Development Kit (ADK) with a distributed multi-agent architecture optimized for task coordination and tool orchestration.

```
┌─────────────────────────────────────────────────────────────────┐
│                     VANA System Architecture                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  VANA           │    │  Code Execution  │    │  Data Science   │
│  Orchestrator   │◄──►│  Specialist      │◄──►│  Specialist     │
│  (Central Hub)  │    │  (Secure Exec)   │    │  (ML/Analytics) │
│  9 Core Tools   │    │  Sandbox Mode    │    │  Full Function  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Tool Ecosystem                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ File Operations │ │ Search & Memory │ │ Agent Coord.    │   │
│  │ • read_file     │ │ • vector_search │ │ • coordinate    │   │
│  │ • write_file    │ │ • web_search    │ │ • delegate      │   │
│  │ • list_dir      │ │ • memory_ops    │ │ • get_status    │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│                                                                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ System Tools    │ │ Workflow Mgmt   │ │ External APIs   │   │
│  │ • health_check  │ │ • task_analyzer │ │ • GitHub        │   │
│  │ • echo          │ │ • workflow_eng  │ │ • Web Services  │   │
│  │ • system_info   │ │ • todo_mgmt     │ │ • Browser Auto  │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Shared Services Layer                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ Memory Service  │ │ Security Mgr    │ │ Monitoring      │   │
│  │ • ADK Memory    │ │ • Access Control│ │ • Health Checks │   │
│  │ • ChromaDB      │ │ • Audit Logging │ │ • Performance   │   │
│  │ • Vector Store  │ │ • Sandbox       │ │ • Error Track   │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Agent Architecture

### Real Agents (Fully Functional)

#### 1. VANA Orchestrator (`agents/vana/team.py`)
- **Role**: Central coordination hub
- **Tools**: 9 core tools loaded
- **Model**: `gemini-2.0-flash-exp`
- **Status**: ✅ Working (100%)

**Capabilities**:
- Task analysis and routing
- Tool orchestration
- Agent delegation
- Memory coordination
- Workflow management

#### 2. Code Execution Specialist (`agents/code_execution/specialist.py`)
- **Role**: Secure code execution
- **Languages**: Python, JavaScript, Shell
- **Security**: Sandboxed execution with resource limits
- **Status**: ⚠️ Fallback mode (Docker unavailable)

**Capabilities**:
- Python script execution
- JavaScript runtime
- Shell command execution
- Resource monitoring
- Security validation

#### 3. Data Science Specialist (`agents/data_science/specialist.py`)
- **Role**: ML and data analysis
- **Integration**: Uses Code Execution Specialist for Python
- **Libraries**: NumPy, Pandas, Scikit-learn, etc.
- **Status**: ✅ Working (100%)

**Capabilities**:
- Data processing and analysis
- Statistical computing
- Machine learning workflows
- Data visualization
- Model training and evaluation

### Proxy Agents (Discovery Pattern)

The system uses a proxy pattern for backward compatibility:

```python
# Memory Agent Proxy (agents/memory/__init__.py)
class MemoryAgentProxy:
    def __getattr__(self, name):
        return getattr(root_agent, name)

# Orchestration Agent Proxy (agents/orchestration/__init__.py)  
class OrchestrationAgentProxy:
    def __getattr__(self, name):
        return getattr(root_agent, name)
```

This allows legacy references to work while centralizing functionality in the VANA Orchestrator.

## Tool Architecture

### Tool Categories

#### Core Tools (Always Available)
- **File Operations**: 4 tools (read, write, list, exists)
- **Search Tools**: 3 tools (vector, web, knowledge)
- **Agent Coordination**: 4 tools (coordinate, delegate, status, transfer)
- **System Tools**: 3 tools (health, echo, info)

#### Conditional Tools (Require Permissions)
- **Memory Tools**: ChromaDB and MCP memory operations
- **External Services**: GitHub, filesystem, web services
- **Workflow Tools**: Task analysis, workflow engine
- **Browser Automation**: Playwright integration

### Tool Loading Pattern

```python
# From agents/vana/team.py
def load_tools():
    tools = []
    
    # Core tools (always loaded)
    tools.extend(load_core_tools())
    
    # Conditional tools (permission-based)
    if has_permission("memory"):
        tools.extend(load_memory_tools())
    
    if has_permission("external"):
        tools.extend(load_external_tools())
    
    return tools
```

## Memory Architecture

### Dual Memory System

#### 1. ADK Memory Service (Session)
- **Type**: In-memory storage
- **Scope**: Current session only
- **Use Case**: Development and testing
- **Status**: ✅ Working

#### 2. ChromaDB Memory (Persistent)
- **Type**: Vector database
- **Scope**: Persistent across sessions
- **Use Case**: Production memory
- **Status**: ⚠️ Optional (server-dependent)

### Memory Operations

```python
# Session memory (always available)
from lib._shared_libraries.adk_memory_service import ADKMemoryService
memory = ADKMemoryService()

# Persistent memory (when available)
await mcp__memory__store_memory(content, metadata)
results = await mcp__memory__search_memory(query)
```

## Security Architecture

### Sandbox Security (`lib/sandbox/`)

```yaml
# Security Policies (lib/sandbox/config/security_policies.yaml)
execution_limits:
  max_execution_time: 120  # seconds
  max_memory_usage: 512    # MB
  max_file_size: 10        # MB

allowed_operations:
  - file_read
  - file_write
  - network_request
  
blocked_operations:
  - system_modification
  - privilege_escalation
```

### Access Control

#### Permission System
- **Core Tools**: No permissions required
- **Conditional Tools**: Explicit allow/deny lists
- **MCP Servers**: Individual server configuration

#### Security Manager (`lib/security/security_manager.py`)
- Input validation and sanitization
- Access control enforcement
- Audit logging for security events
- Resource usage monitoring

## Infrastructure Status

### Working Components (46.2%)

#### ✅ Fully Operational
- Core agent loading and initialization
- Basic tool integration and execution
- Memory service (in-memory fallback)
- File operations and basic search
- Security manager and sandbox policies

#### ⚠️ Limited Functionality
- Code execution (fallback mode without Docker)
- Vector search (service not configured)
- Advanced logging (JSON formatter issues)

#### ❌ Known Issues
- Coordinated search tool integration error
- Docker environment not available
- Some MCP server configurations incomplete

### Error Handling Patterns

```python
# Graceful degradation example
try:
    result = await advanced_feature()
except ServiceUnavailableError:
    logger.warning("Advanced feature unavailable, using fallback")
    result = await fallback_implementation()
    result.add_limitation("Advanced features not available")
```

## Performance Characteristics

### Tool Loading Performance
- **Core Tools**: ~100ms initialization
- **Conditional Tools**: Variable (depends on permissions)
- **Memory Service**: ~50ms for in-memory, variable for ChromaDB

### Agent Communication
- **Intra-agent**: Direct method calls
- **Inter-agent**: Structured message passing
- **Tool Coordination**: Async execution with timeouts

### Resource Usage
- **Memory**: Base ~100MB, scales with tool usage
- **CPU**: Low baseline, spikes during task execution
- **Network**: Minimal for core, variable for external services

## Deployment Architecture

### Local Development
```
┌─────────────────┐
│ Poetry Env      │
│ Python 3.13+    │
│ ├─ VANA Core    │
│ ├─ Dependencies │
│ └─ Tools        │
└─────────────────┘
```

### Google Cloud Production
```
┌─────────────────────────────────┐
│ Google Cloud Run                │
│ ┌─────────────────────────────┐ │
│ │ VANA Container              │ │
│ │ ├─ Python 3.13 Runtime     │ │
│ │ ├─ Agent Orchestrator      │ │
│ │ ├─ Tool Ecosystem          │ │
│ │ └─ Security Sandbox        │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ External Services           │ │
│ │ ├─ Vertex AI (Models)       │ │
│ │ ├─ Secret Manager (Config)  │ │
│ │ ├─ Cloud Logging           │ │
│ │ └─ Cloud Monitoring        │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

## Extension Points

### Adding New Agents
1. Create agent class extending `LlmAgent`
2. Register with tool ecosystem
3. Update coordination patterns
4. Add to deployment configuration

### Adding New Tools
1. Implement tool following standardized patterns
2. Add permission requirements if needed
3. Update tool loading configuration
4. Include in appropriate agent toolset

### Adding New Services
1. Create service in `lib/_shared_libraries/`
2. Add configuration options
3. Update initialization patterns
4. Include error handling and fallbacks

---

*Architecture documentation reflects actual implementation as of January 2025*