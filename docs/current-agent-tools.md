# Current Agent Tools Usage Documentation

**Created**: 2025-01-14  
**Purpose**: Document current agent tool usage before Phase 1 implementation

## Current Implementation Overview

The `lib/_tools/agent_tools.py` file implements a custom "Agents-as-Tools" pattern with:

### Classes and Data Structures

1. **AgentToolResult** (dataclass)
   - Tracks execution results with success status, timing, metadata
   - Used by AgentTool.execute() method

2. **AgentTool** (custom class)
   - Custom implementation wrapping specialist agents
   - Methods: `__init__`, `_extract_capabilities`, `__call__`, `execute`, `_simulate_agent_execution`, `get_tool_info`
   - Simulates agent execution for testing

3. **_AgentToolsSingleton** (singleton pattern)
   - Manages lazy initialization of tools
   - Ensures tools are created only once

### Functions

1. **Factory Functions**:
   - `create_agent_tool()` - Creates single AgentTool instance
   - `create_specialist_agent_tools()` - Creates dictionary of tools for 4 specialists

2. **Tool Creation**:
   - `_create_adk_agent_tools()` - Creates FunctionTool wrappers
   - `_get_adk_tools()` - Lazy initialization wrapper

3. **Getter Functions**:
   - `get_adk_architecture_tool()`
   - `get_adk_ui_tool()`
   - `get_adk_devops_tool()`
   - `get_adk_qa_tool()`

4. **Utility Functions**:
   - `initialize_agent_tools()` - Public initialization
   - `_get_tool_or_initialize()` - Internal helper

### Module-Level Variables
- `adk_architecture_tool`
- `adk_ui_tool`
- `adk_devops_tool`
- `adk_qa_tool`

## Usage Patterns

### 1. Direct Import Usage
```python
from lib._tools.agent_tools import adk_architecture_tool, adk_ui_tool
```

### 2. Factory Function Usage
```python
from lib._tools.agent_tools import create_specialist_agent_tools
tools = create_specialist_agent_tools(arch_spec, ui_spec, devops_spec, qa_spec)
```

### 3. Singleton Pattern Usage
```python
from lib._tools.agent_tools import get_adk_architecture_tool
tool = get_adk_architecture_tool()
```

## Files Using Agent Tools

1. **agents/vana/enhanced_orchestrator.py**:
   - Imports: `from lib.tools.agent_as_tool import create_specialist_tools`
   - Creates specialist tools for agent-as-tool pattern

2. **tests/unit/tools/test_agent_tools_comprehensive.py**:
   - Tests all agent tool functionality
   - Imports multiple classes and functions

## Current Functionality Summary

- **Total Lines**: 514
- **Classes**: 3 (AgentToolResult, AgentTool, _AgentToolsSingleton)
- **Functions**: 10
- **Module Variables**: 4
- **Imports**: google.adk.tools.FunctionTool

## Dependencies

- Uses custom AgentTool class (NOT from ADK)
- Depends on FunctionTool from google.adk.tools
- No usage of official google.adk.tools.agent_tool.AgentTool