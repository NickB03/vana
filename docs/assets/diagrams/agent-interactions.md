# 🔄 VANA Agent Interaction Flows

This document shows how agents coordinate, delegate tasks, and handle different types of requests in the VANA system.

## 📊 Main Orchestration Flow

```mermaid
sequenceDiagram
    participant User
    participant VANA as 🎯 VANA Orchestrator
    participant CODE as 💻 Code Execution
    participant DATA as 📊 Data Science
    participant VAI as 🤖 Vertex AI

    User->>VANA: Task Request
    VANA->>VANA: Analyze Task (adk_analyze_task)
    VANA->>VANA: Match Capabilities (adk_match_capabilities)
    
    alt Code Execution Needed
        VANA->>CODE: Delegate Code Task
        CODE->>CODE: Execute in Sandbox
        CODE->>VANA: Return Results
    else Data Analysis Needed
        VANA->>DATA: Delegate Data Task
        DATA->>CODE: Request Code Execution
        CODE->>DATA: Return Processed Data
        DATA->>VANA: Return Analysis
    else Search/Knowledge Needed
        VANA->>VAI: Vector Search Query
        VAI->>VANA: Return Results
    end
    
    VANA->>User: Final Response
```

## 🔄 Proxy Agent Redirection Pattern

```mermaid
graph LR
    subgraph "User Requests"
        U1[Memory Request]
        U2[Orchestration Request]
        U3[Specialist Request]
        U4[Workflow Request]
    end

    subgraph "Proxy Agents"
        MEM[🧠 Memory Proxy]
        ORCH[🔄 Orchestration Proxy]
        SPEC[🛠️ Specialists Proxy]
        WORK[⚡ Workflows Proxy]
    end

    subgraph "Real Processing"
        VANA[🎯 VANA Orchestrator<br/>Handles All Requests]
    end

    U1 --> MEM
    U2 --> ORCH
    U3 --> SPEC
    U4 --> WORK

    MEM --> VANA
    ORCH --> VANA
    SPEC --> VANA
    WORK --> VANA

    classDef proxy fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef real fill:#e1f5fe,stroke:#01579b,stroke-width:3px

    class MEM,ORCH,SPEC,WORK proxy
    class VANA real
```

## 🛠️ Tool Execution Flow

```mermaid
flowchart TD
    START([User Request]) --> ANALYZE{Analyze Task Type}
    
    ANALYZE -->|File Operations| FILE[📁 File System Tools<br/>read_file, write_file<br/>list_directory, file_exists]
    ANALYZE -->|Search Needed| SEARCH[🔍 Search Tools<br/>vector_search, web_search<br/>search_knowledge]
    ANALYZE -->|System Check| SYSTEM[⚙️ System Tools<br/>echo, get_health_status]
    ANALYZE -->|Agent Coordination| COORD[🤝 Coordination Tools<br/>delegate_to_agent<br/>get_agent_status]
    ANALYZE -->|Complex Task| TASK[📊 Task Analysis Tools<br/>analyze_task<br/>match_capabilities]
    ANALYZE -->|Workflow| WORKFLOW[⚡ Workflow Tools<br/>create_workflow<br/>start_workflow]

    FILE --> EXECUTE[Execute Tool]
    SEARCH --> EXECUTE
    SYSTEM --> EXECUTE
    COORD --> EXECUTE
    TASK --> EXECUTE
    WORKFLOW --> EXECUTE

    EXECUTE --> RESULT[Return Results]
    RESULT --> END([Response to User])

    classDef toolCategory fill:#fff3e0,stroke:#e65100,stroke-width:2px
    class FILE,SEARCH,SYSTEM,COORD,TASK,WORKFLOW toolCategory
```

## 🔐 Security & Error Handling Flow

```mermaid
graph TB
    REQUEST[Incoming Request] --> VALIDATE{Input Validation}
    VALIDATE -->|Invalid| ERROR[Return Error Response]
    VALIDATE -->|Valid| AUTH{Authentication Check}
    
    AUTH -->|Unauthorized| ERROR
    AUTH -->|Authorized| EXECUTE[Execute Tool/Agent]
    
    EXECUTE --> MONITOR{Resource Monitoring}
    MONITOR -->|Timeout/Limit| TERMINATE[Terminate & Log]
    MONITOR -->|Normal| SUCCESS[Return Results]
    
    TERMINATE --> LOG[Security Logging]
    SUCCESS --> LOG
    ERROR --> LOG
    
    LOG --> RESPONSE[Send Response to User]

    classDef security fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef success fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef error fill:#fff3e0,stroke:#f57c00,stroke-width:2px

    class VALIDATE,AUTH,MONITOR,TERMINATE,LOG security
    class SUCCESS success
    class ERROR error
```

## 📊 Performance Optimization Flow

```mermaid
graph LR
    subgraph "Request Processing"
        REQ[Request] --> CACHE{Check Cache}
        CACHE -->|Hit| FAST[Fast Response]
        CACHE -->|Miss| PROCESS[Process Request]
        PROCESS --> STORE[Store in Cache]
        STORE --> RESP[Response]
    end

    subgraph "Resource Management"
        PROCESS --> MONITOR[Monitor Resources]
        MONITOR --> SCALE{Need Scaling?}
        SCALE -->|Yes| CLOUDRUN[Cloud Run Auto-scale]
        SCALE -->|No| CONTINUE[Continue Processing]
    end

    classDef cache fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef process fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef scale fill:#e8f5e8,stroke:#388e3c,stroke-width:2px

    class CACHE,FAST cache
    class PROCESS,STORE,RESP process
    class MONITOR,SCALE,CLOUDRUN scale
```

## 🎯 Key Interaction Patterns

### 1. Direct Tool Execution
- User request → VANA → Tool execution → Response
- Used for: File operations, searches, system checks

### 2. Agent Delegation
- User request → VANA → Specialist agent → Response
- Used for: Code execution, data analysis

### 3. Proxy Redirection
- User request → Proxy agent → VANA → Processing → Response
- Used for: Agent discovery compatibility

### 4. Multi-Step Workflows
- User request → VANA → Multiple tools/agents → Coordinated response
- Used for: Complex tasks requiring multiple capabilities

## 📈 Performance Characteristics

- **Direct Tool Execution**: <100ms average
- **Agent Delegation**: <500ms average
- **Proxy Redirection**: <50ms overhead
- **Multi-Step Workflows**: Variable based on complexity
- **Error Handling**: <10ms additional overhead

## 🔗 Related Documentation

- [System Architecture](system-architecture.md) - Overall system design
- [Tool Organization](tool-organization.md) - Tool categorization
- [Agent Reference](../../architecture/agents.md) - Agent specifications
- [Performance Guide](../../guides/monitoring.md) - Performance monitoring
