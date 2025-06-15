# 🛠️ VANA Tool Reference

Complete reference documentation for all tools available in the VANA system.

## 📊 Tool Overview

VANA provides **19 core tools** always available in the VANA agent, plus conditional tools when dependencies are available.

> **🛠️ Visual Organization**: See our [tool organization diagrams](../assets/diagrams/tool-organization.md) for visual breakdown.

## 🔧 Core Tools (19) - Always Available

### 📁 File System Tools (4)

#### `adk_read_file`
- **Purpose**: Secure file reading with validation
- **Parameters**: `file_path` (string)
- **Returns**: File contents or error message
- **Security**: Path validation, access control
- **Usage**: Reading configuration files, documents, code files

#### `adk_write_file`
- **Purpose**: File creation and modification with proper permissions
- **Parameters**: `file_path` (string), `content` (string), `mode` (optional)
- **Returns**: Success confirmation or error message
- **Security**: Path validation, permission checks
- **Usage**: Creating files, updating configurations, saving results

#### `adk_list_directory`
- **Purpose**: Directory exploration and listing
- **Parameters**: `directory_path` (string), `recursive` (optional boolean)
- **Returns**: List of files and directories
- **Security**: Access control, path validation
- **Usage**: File system exploration, directory analysis

#### `adk_file_exists`
- **Purpose**: File existence checking
- **Parameters**: `file_path` (string)
- **Returns**: Boolean existence status
- **Security**: Path validation
- **Usage**: Conditional file operations, validation

### 🔍 Search Tools (3)

#### `adk_vector_search`
- **Purpose**: Semantic similarity search via Vertex AI
- **Parameters**: `query` (string), `limit` (optional integer)
- **Returns**: Ranked search results with similarity scores
- **Integration**: Vertex AI Vector Search
- **Usage**: Semantic search, knowledge retrieval, similarity matching

#### `adk_web_search`
- **Purpose**: Real-time web search with Brave API
- **Parameters**: `query` (string), `count` (optional integer)
- **Returns**: Web search results with URLs and snippets
- **Integration**: Brave Search API
- **Usage**: External information retrieval, research, fact-checking

#### `adk_search_knowledge`
- **Purpose**: RAG corpus knowledge search
- **Parameters**: `query` (string), `context` (optional string)
- **Returns**: Relevant knowledge base entries
- **Integration**: Vertex AI RAG Corpus
- **Usage**: Internal knowledge retrieval, context-aware search

### ⚙️ System Tools (2)

#### `adk_echo`
- **Purpose**: System testing and validation
- **Parameters**: `message` (string)
- **Returns**: Echo of input message with timestamp
- **Usage**: System health checks, connectivity testing, debugging

#### `adk_get_health_status`
- **Purpose**: Real-time system health monitoring
- **Parameters**: None
- **Returns**: Comprehensive system status report
- **Includes**: Agent status, tool availability, resource usage
- **Usage**: System monitoring, health checks, diagnostics

### 🤝 Agent Coordination Tools (4)

#### `adk_coordinate_task`
- **Purpose**: Multi-agent task coordination
- **Parameters**: `task_description` (string), `agents` (optional list)
- **Returns**: Task coordination plan and execution status
- **Usage**: Complex multi-agent workflows, task orchestration

#### `adk_delegate_to_agent`
- **Purpose**: Direct agent delegation
- **Parameters**: `agent_name` (string), `task` (string), `context` (optional)
- **Returns**: Agent response and execution results
- **Usage**: Specialist task delegation, agent-to-agent communication

#### `adk_get_agent_status`
- **Purpose**: Agent discovery and status
- **Parameters**: `agent_name` (optional string)
- **Returns**: Agent availability, capabilities, and health status
- **Usage**: Agent discovery, health monitoring, capability checking

#### `adk_transfer_to_agent`
- **Purpose**: Agent transfer capabilities
- **Parameters**: `target_agent` (string), `context` (string), `session_data` (optional)
- **Returns**: Transfer confirmation and new agent session
- **Usage**: Seamless agent handoffs, session transfers

### 📊 Task Analysis Tools (3)

#### `adk_analyze_task`
- **Purpose**: NLP-based task analysis
- **Parameters**: `task_description` (string)
- **Returns**: Task complexity, requirements, and recommended approach
- **Usage**: Task planning, complexity assessment, approach optimization

#### `adk_match_capabilities`
- **Purpose**: Agent-task capability matching
- **Parameters**: `task_requirements` (string), `available_agents` (optional list)
- **Returns**: Best-match agents with capability scores
- **Usage**: Optimal agent selection, capability assessment

#### `adk_classify_task`
- **Purpose**: Task classification and routing
- **Parameters**: `task_description` (string)
- **Returns**: Task category, priority, and routing recommendations
- **Usage**: Automatic task routing, priority assignment

### ⚡ Workflow Management Tools (8)

#### `adk_create_workflow`
- **Purpose**: Create multi-step workflows
- **Parameters**: `workflow_definition` (object), `name` (string)
- **Returns**: Workflow ID and creation confirmation
- **Usage**: Complex process automation, multi-step task definition

#### `adk_start_workflow`
- **Purpose**: Initiate workflow execution
- **Parameters**: `workflow_id` (string), `input_data` (optional object)
- **Returns**: Execution ID and initial status
- **Usage**: Workflow execution, process automation

#### `adk_get_workflow_status`
- **Purpose**: Monitor workflow progress
- **Parameters**: `workflow_id` (string)
- **Returns**: Current status, progress, and step details
- **Usage**: Progress monitoring, status tracking

#### `adk_list_workflows`
- **Purpose**: List active and completed workflows
- **Parameters**: `status_filter` (optional string)
- **Returns**: List of workflows with status and metadata
- **Usage**: Workflow management, status overview

#### `adk_pause_workflow`
- **Purpose**: Pause workflow execution
- **Parameters**: `workflow_id` (string)
- **Returns**: Pause confirmation and current state
- **Usage**: Workflow control, temporary suspension

#### `adk_resume_workflow`
- **Purpose**: Resume paused workflows
- **Parameters**: `workflow_id` (string)
- **Returns**: Resume confirmation and execution status
- **Usage**: Workflow control, execution continuation

#### `adk_cancel_workflow`
- **Purpose**: Cancel workflow execution
- **Parameters**: `workflow_id` (string), `reason` (optional string)
- **Returns**: Cancellation confirmation and cleanup status
- **Usage**: Workflow termination, error recovery

#### `adk_get_workflow_templates`
- **Purpose**: Access workflow templates
- **Parameters**: `category` (optional string)
- **Returns**: Available templates with descriptions
- **Usage**: Workflow creation, template-based automation

## 🔧 Conditional Tools (Variable Count)

### 🛠️ Specialist Tools
- **Availability**: When `agents.specialists.agent_tools` imports successfully
- **Purpose**: Additional specialist capabilities
- **Count**: Variable based on successful imports
- **Usage**: Extended functionality when dependencies available

### 🎯 Orchestration Tools (6)

#### `analyze_task_complexity`
- **Purpose**: Advanced task complexity analysis
- **Usage**: Enterprise-level task assessment

#### `route_to_specialist`
- **Purpose**: Intelligent specialist routing
- **Usage**: Optimal specialist selection

#### `coordinate_workflow`
- **Purpose**: Advanced workflow coordination
- **Usage**: Complex multi-agent workflows

#### `decompose_enterprise_task`
- **Purpose**: Enterprise task decomposition
- **Usage**: Breaking down complex enterprise tasks

#### `save_specialist_knowledge_func`
- **Purpose**: Specialist knowledge storage
- **Usage**: Preserving specialist insights

#### `get_specialist_knowledge_func`
- **Purpose**: Specialist knowledge retrieval
- **Usage**: Accessing stored specialist knowledge

## 🏗️ Tool Architecture

### Standardization Framework
- **Interface**: All tools follow ADK FunctionTool pattern
- **Error Handling**: Consistent error responses and logging
- **Performance Monitoring**: Built-in execution timing and metrics
- **Security**: Input validation and secure execution patterns

### Execution Pattern
1. **Input Validation**: Comprehensive parameter validation
2. **Security Check**: Access control and permission verification
3. **Tool Execution**: Secure execution with resource monitoring
4. **Result Processing**: Standardized response formatting
5. **Performance Logging**: Execution metrics and timing

## 📊 Performance Metrics

| Tool Category | Count | Avg Response Time | Availability |
|---------------|-------|-------------------|--------------|
| File System | 4 | <50ms | 100% |
| Search | 3 | <200ms | 99.9% |
| System | 2 | <10ms | 100% |
| Coordination | 4 | <100ms | 100% |
| Task Analysis | 3 | <150ms | 100% |
| Workflows | 8 | <300ms | 100% |
| **Core Total** | **19** | **<100ms avg** | **99.9%** |

## 🔗 Related Documentation

- [Agent Reference](../agents/agent-reference.md) - Complete agent documentation
- [System Architecture](../architecture/system-overview.md) - Overall system design
- [Tool Organization](../assets/diagrams/tool-organization.md) - Visual tool breakdown
- [API Reference](../guides/api-reference.md) - Tool API details
