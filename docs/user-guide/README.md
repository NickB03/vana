# VANA User Guide

Complete guide to using VANA's multi-agent AI system effectively.

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Agent Architecture](#agent-architecture)
3. [Working with Tools](#working-with-tools)
4. [Memory Management](#memory-management)
5. [Task Coordination](#task-coordination)
6. [Best Practices](#best-practices)
7. [Advanced Usage](#advanced-usage)
8. [Troubleshooting](#troubleshooting)

## Core Concepts

### What is VANA?

VANA is a multi-agent AI orchestration system built on Google's Agent Development Kit (ADK). It provides:

- **Dynamic Agent Coordination** - Intelligent task routing and delegation
- **Advanced Tool Integration** - Comprehensive toolset for development tasks
- **Memory Management** - Persistent context and knowledge storage
- **Cloud-Native Design** - Google Cloud integration with auto-scaling

### System Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  VANA           │    │  Code Execution  │    │  Data Science   │
│  Orchestrator   │◄──►│  Specialist      │◄──►│  Specialist     │
│  (Central Hub)  │    │  (Secure Exec)   │    │  (ML/Analytics) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Tool Ecosystem                             │
│  • File Operations  • Search Tools   • Agent Coordination      │
│  • Memory Tools     • System Tools   • Workflow Management     │
│  • External APIs    • Web Services   • Browser Automation      │
└─────────────────────────────────────────────────────────────────┘
```

## Agent Architecture

### Real Agents (Working)

#### 1. VANA Orchestrator
- **Role**: Central coordination and task routing
- **Location**: `agents/vana/team.py`
- **Capabilities**: 9 core tools, automatic delegation
- **Model**: gemini-2.0-flash-exp

#### 2. Code Execution Specialist  
- **Role**: Secure code execution and development tasks
- **Location**: `agents/code_execution/specialist.py`
- **Capabilities**: Python, JavaScript, Shell execution
- **Security**: Sandboxed execution with resource limits

#### 3. Data Science Specialist
- **Role**: Data analysis, ML, and statistical computing
- **Location**: `agents/data_science/specialist.py` 
- **Capabilities**: Data processing, visualization, model training
- **Integration**: Uses Code Execution Specialist for secure Python

### Proxy Agents (Discovery Pattern)

Memory and Orchestration agents use a proxy pattern to delegate to the VANA Orchestrator, avoiding circular imports while maintaining backward compatibility.

## Working with Tools

### Core Tools (Always Available)

#### File Operations
```python
# Reading files
content = await read_file("/path/to/file.txt")

# Writing files  
await write_file("/path/to/output.txt", "content")

# Listing directories
files = await list_directory("/project/path")

# Checking file existence
exists = await file_exists("/path/to/check")
```

#### Search Tools
```python
# Vector search (when available)
results = await vector_search("query terms")

# Web search
results = await web_search("current information query")

# Knowledge search
results = await search_knowledge("domain specific query")
```

#### Agent Coordination
```python
# Task coordination
result = await coordinate_task({
    "task": "complex_analysis",
    "requirements": ["data_processing", "visualization"]
})

# Agent delegation
result = await delegate_to_agent("data_science", {
    "task": "analyze_dataset",
    "data_path": "/path/to/data.csv"
})

# Status monitoring
status = await get_agent_status("code_execution")
```

### Conditional Tools (Require Permissions)

These tools need explicit configuration in `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(python:*)",
      "Bash(poetry:*)",
      "mcp__memory__*",
      "mcp__GitHub__*"
    ]
  }
}
```

## Memory Management

VANA uses dual memory systems:

### 1. ChromaDB Memory (Persistent)
```python
# Search memory
results = await mcp__memory__search_memory("previous discussions")

# Store information
await mcp__memory__store_memory(
    content="Important project decision",
    metadata={"category": "technical_decision"}
)

# Check status
stats = await mcp__memory__memory_stats()
```

### 2. ADK Memory Service (Session)
```python
# In-memory storage for current session
from lib._shared_libraries.adk_memory_service import ADKMemoryService
service = ADKMemoryService()
```

### Memory Best Practices

1. **Start sessions with memory retrieval**
2. **Store important decisions immediately**
3. **Use descriptive metadata for categorization**
4. **Regularly check memory system health**

## Task Coordination

### Simple Task Execution
```python
# Direct tool usage
result = await root_agent.process_request("Read and analyze config.py")
```

### Complex Workflow
```python
# Multi-step workflow
workflow = {
    "steps": [
        {"action": "analyze_requirements", "agent": "vana"},
        {"action": "execute_code", "agent": "code_execution"},
        {"action": "generate_report", "agent": "vana"}
    ]
}
result = await workflow_engine(workflow)
```

### Task Analysis
```python
# Intelligent task breakdown
analysis = await task_analyzer({
    "task": "Create comprehensive test suite",
    "context": "Python project with multiple modules"
})
```

## Best Practices

### 1. Environment Setup
- Always use Python 3.13+
- Configure Poetry environment properly
- Set required environment variables
- Test basic functionality before complex tasks

### 2. Tool Usage
- Start with core tools for basic operations
- Request permissions for advanced tools as needed
- Use incremental approach for large operations
- Handle errors gracefully with fallbacks

### 3. Memory Management
- Begin sessions with memory search
- Store insights proactively
- Use structured metadata
- Monitor memory system health

### 4. Task Planning
- Break complex tasks into smaller steps
- Use task analyzer for complexity assessment
- Plan for error scenarios and recovery
- Monitor progress and adjust as needed

## Advanced Usage

### Custom Workflow Creation
```python
# Define custom workflow patterns
custom_workflow = {
    "name": "documentation_generation",
    "steps": [
        {
            "step": "code_analysis",
            "agent": "vana",
            "tools": ["read_file", "search_knowledge"],
            "output": "analysis_report"
        },
        {
            "step": "content_generation", 
            "agent": "vana",
            "input": "analysis_report",
            "tools": ["write_file"],
            "output": "documentation"
        }
    ],
    "error_handling": "retry_with_fallback"
}
```

### Integration with External Services
```python
# GitHub integration
await mcp__GitHub__create_or_update_file(
    owner="username",
    repo="project", 
    path="docs/README.md",
    content="Updated documentation",
    message="Auto-generated docs update"
)

# Web search for current information
results = await mcp__brave_search__brave_web_search(
    query="latest Python best practices 2025"
)
```

### Performance Optimization
- Use batch operations for multiple related tasks
- Leverage caching for repeated operations
- Monitor resource usage and adjust timeouts
- Implement proper error handling and retries

## Troubleshooting

### Common Issues

#### 1. Python Version Problems
```bash
# Check version
python3 --version

# Fix if needed
poetry env use python3.13
poetry install
```

#### 2. Missing Dependencies
```bash
# Reinstall dependencies
poetry install --sync

# Check specific packages
poetry show | grep package_name
```

#### 3. Memory System Issues
```python
# Check memory status
stats = await mcp__memory__memory_stats()
status = await mcp__memory__operation_status()

# Restart if needed
# (See deployment guide for memory server restart)
```

#### 4. Tool Permission Errors
```json
// Add to .claude/settings.local.json
{
  "permissions": {
    "allow": ["ToolName(*)", "mcp__service__*"]
  }
}
```

### Getting Help

1. **Check Status**: Use system health checks
2. **Review Logs**: Look for specific error messages  
3. **Test Components**: Isolate failing components
4. **Community Support**: GitHub issues and discussions

## What's Working vs. Planned

### ✅ Working (46.2% Infrastructure)
- Core agent loading and coordination
- Basic tool integration
- Memory service (in-memory fallback)
- File operations and search
- Task analysis and workflow basics

### ⚠️ Limited Functionality
- Vector search (service not available)
- Docker-based execution (fallback mode)
- Some advanced tool integrations

### ❌ Known Issues
- Coordinated search tool integration error
- Some MCP server configurations need updates
- Full Docker environment not available

---

*For latest updates and issue reports, see [GitHub Issues](https://github.com/your-org/vana/issues)*