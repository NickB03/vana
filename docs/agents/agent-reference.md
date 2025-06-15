# 🤖 VANA Agent Reference

Complete reference documentation for all 7 discoverable agents in the VANA system.

## 📊 Agent Overview

| Agent | Type | Status | Location | Description |
|-------|------|--------|----------|-------------|
| **VANA** | Real | ✅ Active | `agents/vana/team.py` | Main orchestrator with 19 core tools |
| **Code Execution** | Real | ✅ Active | `agents/code_execution/specialist.py` | Secure multi-language code execution |
| **Data Science** | Real | ✅ Active | `agents/data_science/specialist.py` | Data analysis and machine learning |
| **Memory** | Proxy | ✅ Active | `agents/memory/__init__.py` | Delegates to VANA |
| **Orchestration** | Proxy | ✅ Active | `agents/orchestration/__init__.py` | Delegates to VANA |
| **Specialists** | Proxy | ✅ Active | `agents/specialists/__init__.py` | Delegates to VANA |
| **Workflows** | Proxy | ✅ Active | `agents/workflows/__init__.py` | Delegates to VANA |

## 🎯 Real Agents (3)

### 1. VANA Orchestrator

**File**: `agents/vana/team.py`  
**Role**: Central coordinator and task router  
**Model**: gemini-2.0-flash-exp  
**Status**: ✅ Operational  

#### Capabilities
- **Task Coordination**: Central hub for all system operations
- **Tool Execution**: 19 core tools + conditional tools
- **Agent Delegation**: Intelligent routing to specialist agents
- **Workflow Management**: Complete workflow lifecycle management
- **Memory Integration**: Vertex AI RAG corpus and session management

#### Core Tools (19)
- **File System (4)**: read_file, write_file, list_directory, file_exists
- **Search (3)**: vector_search, web_search, search_knowledge
- **System (2)**: echo, get_health_status
- **Coordination (4)**: coordinate_task, delegate_to_agent, get_agent_status, transfer_to_agent
- **Task Analysis (3)**: analyze_task, match_capabilities, classify_task
- **Workflows (8)**: Complete workflow management suite

#### Usage Patterns
- **Primary Entry Point**: All user requests initially handled by VANA
- **Task Analysis**: Determines optimal processing approach
- **Delegation**: Routes complex tasks to appropriate specialists
- **Result Aggregation**: Consolidates responses from multiple agents

### 2. Code Execution Specialist

**File**: `agents/code_execution/specialist.py`  
**Role**: Secure code execution across multiple programming languages  
**Status**: ✅ Operational  

#### Capabilities
- **Multi-Language Support**: Python, JavaScript, Shell execution
- **Sandbox Isolation**: Secure execution environment with resource limits
- **Security Validation**: Input validation and malicious code detection
- **Resource Monitoring**: CPU, memory, and execution time constraints
- **Integration**: Coordinates with VANA for complex development tasks

#### Security Features
- **Isolated Execution**: Docker-based sandbox environment
- **Resource Limits**: Memory, CPU, and time constraints
- **Input Validation**: AST parsing and pattern matching
- **Audit Logging**: Complete execution audit trail

#### Usage Patterns
- **Code Execution**: Direct execution of user-provided code
- **Development Tasks**: Complex programming and scripting operations
- **Data Processing**: Computational tasks requiring code execution
- **Integration Testing**: Validation of code functionality

### 3. Data Science Specialist

**File**: `agents/data_science/specialist.py`  
**Role**: Data analysis, visualization, and machine learning capabilities  
**Status**: ✅ Operational  

#### Capabilities
- **Data Analysis**: Statistical analysis and data exploration
- **Visualization**: Chart and graph generation
- **Machine Learning**: Model training and prediction
- **Data Processing**: Cleaning, transformation, and preparation
- **Integration**: Leverages Code Execution Specialist for secure Python execution

#### Supported Operations
- **Statistical Analysis**: Descriptive and inferential statistics
- **Data Visualization**: Plots, charts, and interactive visualizations
- **Machine Learning**: Classification, regression, clustering
- **Data Cleaning**: Missing value handling, outlier detection

#### Usage Patterns
- **Data Analysis**: Exploratory data analysis and insights
- **Visualization**: Creating charts and graphs for data presentation
- **ML Workflows**: End-to-end machine learning pipelines
- **Statistical Computing**: Advanced statistical operations

## 🔄 Proxy Agents (4)

### Proxy Pattern Architecture

All proxy agents follow the same pattern:
1. **Agent Discovery**: Appear as discoverable agents for compatibility
2. **Request Delegation**: All requests redirected to VANA orchestrator
3. **Lazy Loading**: Minimal resource usage with on-demand initialization
4. **Transparent Operation**: Users interact normally, unaware of redirection

### 4. Memory Agent

**File**: `agents/memory/__init__.py`  
**Implementation**: `MemoryAgentProxy` class  
**Purpose**: Memory management and knowledge operations  
**Delegation**: All requests → VANA orchestrator  

### 5. Orchestration Agent

**File**: `agents/orchestration/__init__.py`  
**Implementation**: `OrchestrationAgentProxy` class  
**Purpose**: Task orchestration and workflow coordination  
**Delegation**: All requests → VANA orchestrator  

### 6. Specialists Agent

**File**: `agents/specialists/__init__.py`  
**Implementation**: `SpecialistAgentProxy` class  
**Purpose**: Specialist agent coordination  
**Delegation**: All requests → VANA orchestrator  

### 7. Workflows Agent

**File**: `agents/workflows/__init__.py`  
**Implementation**: `WorkflowsAgentProxy` class  
**Purpose**: Workflow management and execution  
**Delegation**: All requests → VANA orchestrator  

## 🔧 Agent Coordination Patterns

### Direct Execution
```
User Request → VANA → Tool Execution → Response
```

### Specialist Delegation
```
User Request → VANA → Code/Data Specialist → Response → VANA → User
```

### Proxy Redirection
```
User Request → Proxy Agent → VANA → Processing → Response
```

## 📊 Performance Characteristics

| Agent | Response Time | Resource Usage | Availability |
|-------|---------------|----------------|--------------|
| VANA | <100ms | Medium | 99.9% |
| Code Execution | <500ms | High (sandbox) | 99.9% |
| Data Science | <300ms | Medium-High | 99.9% |
| Proxy Agents | <50ms | Minimal | 99.9% |

## 🔗 Related Documentation

- [System Architecture](../architecture/system-overview.md) - Overall system design
- [Tool Reference](../architecture/tools.md) - Complete tool documentation
- [Agent Interactions](../assets/diagrams/agent-interactions.md) - Visual interaction flows
- [Deployment Guide](../deployment/cloud-run.md) - Agent deployment information
