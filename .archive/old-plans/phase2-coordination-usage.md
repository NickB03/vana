# Phase 2 - Coordination Tool Usage Analysis

**Created**: 2025-01-14 - MP-2.1  
**Purpose**: Document all coordination tool usage for ADK migration  

## 🔍 Coordination Functions Analysis

### **Target Functions for Migration**:
1. `coordinate_task` - Task assignment with agent routing
2. `delegate_to_agent` - Direct agent delegation with JSON-RPC
3. `intelligent_route_task` - Intelligent task routing
4. `orchestrate_complex_task` - Multi-agent task orchestration

### **Core Implementation Location**:
- **File**: `/Users/nick/Development/vana/lib/_tools/real_coordination_tools.py`
- **Main Functions**:
  - `real_coordinate_task(task_description: str, assigned_agent: str) -> str` (line 556)
  - `real_delegate_to_agent(agent_name: str, task: str, context: str) -> str` (line 562)
  - `real_intelligent_route_task(task: str, context: str) -> str` (line 590)
  - `real_orchestrate_complex_task(task: str, context: str, max_agents: int, timeout_seconds: int) -> str` (line 610)

## 📁 Files Using Coordination Tools

### **Primary Implementation Files**:
1. `lib/_tools/real_coordination_tools.py` - Main coordination implementation
2. `lib/_tools/standardized_system_tools.py` - System tool coordination
3. `lib/_tools/enhanced_reasoning_tools.py` - Reasoning tool coordination
4. `lib/_tools/agent_discovery.py` - Agent discovery coordination
5. `lib/_tools/adk_tools.py` - ADK tool coordination wrappers
6. `lib/_tools/__init__.py` - Tool module initialization
7. `lib/_tools/comprehensive_tool_listing.py` - Tool listing and coordination

### **Agent Team Files**:
1. `agents/vana/team_simple.py` - Simple team coordination
2. `agents/vana/team_original.py` - Original team implementation
3. `agents/vana/team_minimal.py` - Minimal team setup

### **Test Files**:
1. `tests/unit/tools/test_agent_coordination_tools.py` - Unit tests
2. `tests/integration/test_multi_agent_coordination.py` - Integration tests
3. `tests/e2e/test_complete_user_workflows.py` - End-to-end tests
4. `tests/framework/agent_client.py` - Test framework client
5. `tests/framework/agent_intelligence_validator.py` - Validation framework

## 📊 Usage Statistics

### **Function Distribution**:
- **coordinate_task references**: ~15 files
- **delegate_to_agent references**: ~20 files
- **intelligent_route_task references**: ~10 files
- **orchestrate_complex_task references**: ~8 files

**Total files with coordination tools**: 31 files

### **Current Implementation Pattern**:
```python
# Existing pattern
def real_delegate_to_agent(agent_name: str, task: str, context: str) -> str:
    service = get_coordination_service()
    # Complex async/sync handling
    return asyncio.run(service.delegate_to_agent(agent_name, task, context))
```

### **Target ADK Pattern**:
```python
# ADK pattern (to be implemented)
def adk_coordinate_agent(agent_name: str, task: str, context: str) -> str:
    # Use AgentTool.run_async() method
    # Maintain JSON compatibility
    pass
```

## 🎯 Migration Priority

### **High Priority (Core Functions)**:
1. `real_delegate_to_agent` - Most widely used (20 files)
2. `real_coordinate_task` - Core coordination (15 files)

### **Medium Priority (Advanced Features)**:
3. `real_intelligent_route_task` - Routing optimization (10 files)
4. `real_orchestrate_complex_task` - Complex orchestration (8 files)

### **Dependencies to Preserve**:
- JSON result format compatibility
- Async/sync bridging patterns
- Error handling and timeout management
- Agent discovery service integration

## ✅ Analysis Complete

**MP-2.1 Results**:
- ✅ All coordination tool usage documented
- ✅ 31 files identified with coordination references
- ✅ Function distribution categorized
- ✅ Migration priorities established
- ✅ Implementation patterns analyzed

**Ready for MP-2.2**: Create ADK Coordination Function