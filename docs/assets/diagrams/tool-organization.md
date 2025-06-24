# 🛠️ VANA Tool Organization

This document provides visual breakdowns of VANA's 19 core tools plus conditional tools, organized by category and functionality.

## 📊 Core Tools Overview (19 Total)

```mermaid
mindmap
  root((VANA Tools<br/>19 Core + Conditional))
    File System (4)
      adk_read_file
      adk_write_file
      adk_list_directory
      adk_file_exists
    Search (3)
      adk_vector_search
      adk_web_search
      adk_search_knowledge
    System (2)
      adk_echo
      adk_get_health_status
    Coordination (4)
      adk_coordinate_task
      adk_delegate_to_agent
      adk_get_agent_status
      adk_transfer_to_agent
    Task Analysis (3)
      adk_analyze_task
      adk_match_capabilities
      adk_classify_task
    Workflows (8)
      adk_create_workflow
      adk_start_workflow
      adk_get_workflow_status
      adk_list_workflows
      adk_pause_workflow
      adk_resume_workflow
      adk_cancel_workflow
      adk_get_workflow_templates
```

## 🔧 Tool Categories Breakdown

```mermaid
pie title VANA Core Tools Distribution (19 Total)
    "Workflow Management" : 8
    "File System" : 4
    "Agent Coordination" : 4
    "Search" : 3
    "Task Analysis" : 3
    "System" : 2
```

## 🏗️ Tool Architecture Pattern

```mermaid
graph TB
    subgraph "Tool Execution Layer"
        USER[User Request] --> VANA[VANA Orchestrator]
        VANA --> ROUTER{Tool Router}
    end

    subgraph "Core Tools (Always Available)"
        ROUTER --> FILE[📁 File System Tools]
        ROUTER --> SEARCH[🔍 Search Tools]
        ROUTER --> SYSTEM[⚙️ System Tools]
        ROUTER --> COORD[🤝 Coordination Tools]
        ROUTER --> TASK[📊 Task Analysis Tools]
        ROUTER --> WORKFLOW[⚡ Workflow Tools]
    end

    subgraph "Conditional Tools (When Available)"
        ROUTER -.-> SPECIALIST[🛠️ Specialist Tools]
        ROUTER -.-> ORCHESTRATION[🎯 Orchestration Tools]
    end

    subgraph "Tool Execution Framework"
        FILE --> WRAPPER[ADK FunctionTool Wrapper]
        SEARCH --> WRAPPER
        SYSTEM --> WRAPPER
        COORD --> WRAPPER
        TASK --> WRAPPER
        WORKFLOW --> WRAPPER
        SPECIALIST -.-> WRAPPER
        ORCHESTRATION -.-> WRAPPER

        WRAPPER --> MONITOR[Performance Monitoring]
        WRAPPER --> VALIDATE[Input Validation]
        WRAPPER --> EXECUTE[Secure Execution]

        EXECUTE --> RESULT[Standardized Response]
    end

    classDef coreTools fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef conditionalTools fill:#f3e5f5,stroke:#4a148c,stroke-width:2px,stroke-dasharray: 5 5
    classDef framework fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px

    class FILE,SEARCH,SYSTEM,COORD,TASK,WORKFLOW coreTools
    class SPECIALIST,ORCHESTRATION conditionalTools
    class WRAPPER,MONITOR,VALIDATE,EXECUTE,RESULT framework
```

## 📋 Detailed Tool Reference

### 📁 File System Tools (4)

```mermaid
graph LR
    subgraph "File Operations"
        READ[adk_read_file<br/>Secure file reading<br/>with validation]
        WRITE[adk_write_file<br/>File creation/modification<br/>with permissions]
        LIST[adk_list_directory<br/>Directory exploration<br/>and listing]
        EXISTS[adk_file_exists<br/>File existence<br/>checking]
    end

    READ --> SECURITY[Security Validation]
    WRITE --> SECURITY
    LIST --> SECURITY
    EXISTS --> SECURITY

    classDef fileOp fill:#fff3e0,stroke:#e65100,stroke-width:2px
    class READ,WRITE,LIST,EXISTS fileOp
```

### 🔍 Search Tools (3)

```mermaid
graph TB
    subgraph "Search Capabilities"
        VECTOR[adk_vector_search<br/>Semantic similarity search<br/>via Vertex AI]
        WEB[adk_web_search<br/>Real-time web search<br/>with Brave API]
        KNOWLEDGE[adk_search_knowledge<br/>RAG corpus knowledge<br/>search]
    end

    VECTOR --> VAI[Vertex AI Vector Search]
    WEB --> BRAVE[Brave Search API]
    KNOWLEDGE --> RAG[RAG Corpus]

    classDef searchTool fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    classDef service fill:#e8f5e8,stroke:#4caf50,stroke-width:2px

    class VECTOR,WEB,KNOWLEDGE searchTool
    class VAI,BRAVE,RAG service
```

### ⚡ Workflow Management Tools (8)

```mermaid
stateDiagram-v2
    [*] --> Create: adk_create_workflow
    Create --> Start: adk_start_workflow
    Start --> Running

    Running --> Pause: adk_pause_workflow
    Pause --> Resume: adk_resume_workflow
    Resume --> Running

    Running --> Cancel: adk_cancel_workflow
    Cancel --> [*]

    Running --> Complete
    Complete --> [*]

    note right of Running
        Monitor with:
        - adk_get_workflow_status
        - adk_list_workflows
    end note

    note left of Create
        Templates available:
        - adk_get_workflow_templates
    end note
```

## 🔄 Conditional Tools Architecture

```mermaid
graph TB
    subgraph "Conditional Loading Pattern"
        IMPORT{Try Import} --> SUCCESS{Import Success?}
        SUCCESS -->|Yes| LOAD[Load Tools]
        SUCCESS -->|No| FALLBACK[Graceful Degradation]

        LOAD --> SPECIALIST[Specialist Tools Available]
        LOAD --> ORCHESTRATION[Orchestration Tools Available]

        FALLBACK --> CORE[Core Tools Only]
    end

    subgraph "Orchestration Tools (6)"
        ORCHESTRATION --> COMPLEXITY[analyze_task_complexity]
        ORCHESTRATION --> ROUTE[route_to_specialist]
        ORCHESTRATION --> COORDINATE[coordinate_workflow]
        ORCHESTRATION --> DECOMPOSE[decompose_enterprise_task]
        ORCHESTRATION --> SAVE[save_specialist_knowledge_func]
        ORCHESTRATION --> GET[get_specialist_knowledge_func]
    end

    classDef conditional fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef core fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class SPECIALIST,ORCHESTRATION,COMPLEXITY,ROUTE,COORDINATE,DECOMPOSE,SAVE,GET conditional
    class CORE core
```

## 📊 Tool Performance Metrics

| Category | Tool Count | Avg Response Time | Availability |
|----------|------------|-------------------|--------------|
| File System | 4 | <50ms | 100% |
| Search | 3 | <200ms | 99.9% |
| System | 2 | <10ms | 100% |
| Coordination | 4 | <100ms | 100% |
| Task Analysis | 3 | <150ms | 100% |
| Workflows | 8 | <300ms | 100% |
| **Core Total** | **19** | **<100ms avg** | **99.9%** |
| Conditional | Variable | Variable | Depends on imports |

## 🎯 Tool Usage Patterns

### High Frequency Tools
- `adk_echo` - System testing and validation
- `adk_get_health_status` - Health monitoring
- `adk_vector_search` - Semantic search operations
- `adk_delegate_to_agent` - Agent coordination

### Workflow Tools
- `adk_create_workflow` → `adk_start_workflow` → `adk_get_workflow_status`
- Used for complex multi-step operations

### File Operations
- `adk_file_exists` → `adk_read_file` or `adk_write_file`
- Security validation at each step

### Search Operations
- `adk_search_knowledge` for internal knowledge
- `adk_vector_search` for semantic similarity
- `adk_web_search` for external information

## 🔗 Related Documentation

- [System Architecture](system-architecture.md) - Overall system design
- [Agent Interactions](agent-interactions.md) - How agents use tools
- [Tool Reference](../../architecture/tools.md) - Complete tool documentation
- [API Reference](../../guides/api-reference.md) - Tool API details
