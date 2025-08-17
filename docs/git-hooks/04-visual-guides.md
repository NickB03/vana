# Git Hook Integration System - Visual Guides

## 🎨 System Overview Diagrams

### High-Level Architecture

```mermaid
graph TB
    subgraph "Vana Development Environment"
        subgraph "Claude Code Layer"
            CC[Claude Code CLI]
            FO[File Operations]
            TC[Tool Calls]
        end
        
        subgraph "Hook Integration Layer"
            HM[Hook Manager]
            PRD[PRD Validator]
            EH[Error Handler]
            FM[File Monitor]
        end
        
        subgraph "Claude Flow Layer"
            CF[Claude Flow]
            SM[Swarm Manager]
            AG[Agents]
            MM[Memory Manager]
        end
        
        subgraph "Storage Layer"
            HH[Hook History]
            SM_DB[Swarm Memory]
            NP[Neural Patterns]
            PM[Performance Metrics]
        end
    end
    
    %% Connections
    CC --> FO
    FO --> HM
    HM --> PRD
    HM --> EH
    HM --> FM
    
    HM --> CF
    CF --> SM
    SM --> AG
    CF --> MM
    
    HM --> HH
    MM --> SM_DB
    AG --> NP
    HM --> PM
    
    %% Styling
    classDef claudeCode fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef hookLayer fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef claudeFlow fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef storage fill:#fff3e0,stroke:#e65100,stroke-width:2px
    
    class CC,FO,TC claudeCode
    class HM,PRD,EH,FM hookLayer
    class CF,SM,AG,MM claudeFlow
    class HH,SM_DB,NP,PM storage
```

### Component Interaction Flow

```mermaid
graph LR
    subgraph "User Interface"
        DEV[Developer]
        IDE[VS Code/IDE]
    end
    
    subgraph "Claude Code Core"
        CLI[Claude Code CLI]
        TOOLS[Tool System]
        subgraph "File Tools"
            READ[Read Tool]
            WRITE[Write Tool]
            EDIT[Edit Tool]
        end
    end
    
    subgraph "Hook System"
        HI[Hook Interceptor]
        subgraph "Validation"
            PRE[Pre-Hook Validation]
            POST[Post-Hook Processing]
            PRD_VAL[PRD Validator]
        end
        subgraph "Coordination"
            CF_CMD[Claude Flow Commands]
            SWARM[Swarm Coordination]
            MEM[Memory Updates]
        end
    end
    
    subgraph "External Systems"
        FS[File System]
        GIT[Git Repository]
        CF_SRV[Claude Flow Service]
    end
    
    %% User Flow
    DEV --> IDE
    IDE --> CLI
    CLI --> TOOLS
    
    %% Tool Operations
    TOOLS --> READ
    TOOLS --> WRITE
    TOOLS --> EDIT
    
    %% Hook Interception
    READ --> HI
    WRITE --> HI
    EDIT --> HI
    
    %% Hook Processing
    HI --> PRE
    PRE --> PRD_VAL
    PRD_VAL --> POST
    POST --> CF_CMD
    CF_CMD --> SWARM
    SWARM --> MEM
    
    %% External Interactions
    POST --> FS
    POST --> GIT
    CF_CMD --> CF_SRV
    
    %% Styling
    classDef userLayer fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px
    classDef claudeCore fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef hookSystem fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef external fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    
    class DEV,IDE userLayer
    class CLI,TOOLS,READ,WRITE,EDIT claudeCore
    class HI,PRE,POST,PRD_VAL,CF_CMD,SWARM,MEM hookSystem
    class FS,GIT,CF_SRV external
```

## 🔄 Hook Execution Workflows

### Complete File Write Operation

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant CC as Claude Code
    participant HI as Hook Interceptor
    participant PRD as PRD Validator
    participant CF as Claude Flow
    participant FS as File System
    participant SM as Swarm Memory
    
    Dev->>CC: Create new component file
    CC->>HI: executePreWriteHook()
    
    Note over HI,PRD: Pre-operation Validation
    HI->>PRD: validateFileOperation()
    PRD->>PRD: Check PRD compliance
    PRD->>PRD: Analyze component structure
    PRD->>PRD: Validate UI framework usage
    
    alt PRD Validation Failed
        PRD-->>HI: {validated: false, violations: [...]}
        HI->>HI: generateBlockingGuidance()
        HI-->>CC: {allowed: false, guidance: "..."}
        CC-->>Dev: ❌ Operation Blocked + Guidance
    else PRD Validation Passed
        PRD-->>HI: {validated: true, score: 95}
        
        Note over HI,CF: Claude Flow Coordination
        HI->>CF: npx claude-flow hooks pre-edit
        CF->>CF: Initialize task coordination
        CF->>SM: Update swarm memory
        CF-->>HI: {success: true, agents: [...]}
        
        HI-->>CC: {allowed: true, result: {...}}
        
        Note over CC,FS: File Operation
        CC->>FS: Write file to disk
        FS-->>CC: File written successfully
        
        Note over CC,HI: Post-operation Processing
        CC->>HI: executePostWriteHook()
        HI->>CF: npx claude-flow hooks post-edit
        CF->>SM: Update file tracking
        CF->>SM: Notify agents of new file
        CF-->>HI: {success: true, tracked: true}
        
        HI->>HI: logFileAccess()
        HI-->>CC: {success: true}
        CC-->>Dev: ✅ File created successfully
    end
```

### File Edit Operation with Validation

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant CC as Claude Code
    participant HI as Hook Interceptor
    participant PRD as PRD Validator
    participant CF as Claude Flow
    participant FS as File System
    
    Dev->>CC: Edit existing file (old → new)
    
    Note over CC,HI: Pre-edit Hook
    CC->>HI: executePreEditHook(filePath, oldString, newString)
    
    Note over HI,FS: Content Simulation
    HI->>FS: Read current file content
    FS-->>HI: Current content
    HI->>HI: Simulate edit result
    
    Note over HI,PRD: Validation Process
    HI->>PRD: validateFileOperation(filePath, simulatedContent)
    PRD->>PRD: Analyze edit impact
    PRD->>PRD: Check compliance changes
    
    alt Edit Degrades Compliance
        PRD-->>HI: {validated: false, reasons: [...]}
        HI-->>CC: {allowed: false, blocking: true}
        CC-->>Dev: ❌ Edit blocked - would degrade compliance
    else Edit Maintains/Improves Compliance
        PRD-->>HI: {validated: true, improvements: [...]}
        
        HI->>CF: npx claude-flow hooks pre-edit
        CF-->>HI: {success: true}
        HI-->>CC: {allowed: true, simulatedContent: "..."}
        
        Note over CC,FS: Apply Edit
        CC->>FS: Apply string replacement
        FS-->>CC: Edit applied
        
        Note over CC,HI: Post-edit Processing
        CC->>HI: executePostEditHook()
        HI->>CF: npx claude-flow hooks post-edit
        CF->>CF: Update change tracking
        CF-->>HI: {success: true}
        CC-->>Dev: ✅ Edit completed
    end
```

### Agent Coordination During Development

```mermaid
graph TD
    subgraph "Development Session"
        START[Session Start]
        TASK[User Task]
        
        subgraph "File Operations"
            READ[Read Files]
            WRITE[Write Files]
            EDIT[Edit Files]
        end
        
        subgraph "Hook Processing"
            PRE_H[Pre-Hooks]
            POST_H[Post-Hooks]
            VALIDATE[Validation]
        end
        
        subgraph "Agent Coordination"
            SPAWN[Spawn Agents]
            ASSIGN[Assign Tasks]
            COORD[Coordinate Work]
            SYNC[Sync Progress]
        end
        
        END[Session End]
    end
    
    subgraph "Claude Flow Swarm"
        CODER[Coder Agent]
        REVIEWER[Reviewer Agent]
        TESTER[Tester Agent]
        ARCHITECT[Architect Agent]
    end
    
    subgraph "Persistent Memory"
        TASK_MEM[Task Memory]
        FILE_MEM[File History]
        PERF_MEM[Performance Data]
        PATTERN_MEM[Neural Patterns]
    end
    
    %% Session Flow
    START --> TASK
    TASK --> READ
    TASK --> WRITE
    TASK --> EDIT
    
    %% Hook Flow
    READ --> PRE_H
    WRITE --> PRE_H
    EDIT --> PRE_H
    PRE_H --> VALIDATE
    VALIDATE --> POST_H
    
    %% Coordination Flow
    PRE_H --> SPAWN
    SPAWN --> ASSIGN
    ASSIGN --> COORD
    POST_H --> SYNC
    
    %% Agent Assignments
    ASSIGN --> CODER
    ASSIGN --> REVIEWER
    ASSIGN --> TESTER
    ASSIGN --> ARCHITECT
    
    %% Memory Updates
    POST_H --> TASK_MEM
    POST_H --> FILE_MEM
    SYNC --> PERF_MEM
    COORD --> PATTERN_MEM
    
    %% Session End
    SYNC --> END
    END --> TASK_MEM
    
    %% Styling
    classDef sessionFlow fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px
    classDef agents fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef memory fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef hooks fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    
    class START,TASK,READ,WRITE,EDIT,END sessionFlow
    class CODER,REVIEWER,TESTER,ARCHITECT agents
    class TASK_MEM,FILE_MEM,PERF_MEM,PATTERN_MEM memory
    class PRE_H,POST_H,VALIDATE,SPAWN,ASSIGN,COORD,SYNC hooks
```

## 🛡️ Validation and Security Flow

### PRD Compliance Validation Process

```mermaid
flowchart TD
    INPUT[File Content Input] --> PARSE[Parse Content]
    PARSE --> RULES[Apply PRD Rules]
    
    subgraph "Validation Rules"
        UI_CHECK[UI Framework Check]
        ACC_CHECK[Accessibility Check]
        PERF_CHECK[Performance Check]
        STRUCT_CHECK[Structure Check]
    end
    
    RULES --> UI_CHECK
    RULES --> ACC_CHECK
    RULES --> PERF_CHECK
    RULES --> STRUCT_CHECK
    
    UI_CHECK --> UI_SCORE[UI Score]
    ACC_CHECK --> ACC_SCORE[Accessibility Score]
    PERF_CHECK --> PERF_SCORE[Performance Score]
    STRUCT_CHECK --> STRUCT_SCORE[Structure Score]
    
    UI_SCORE --> CALCULATE[Calculate Overall Score]
    ACC_SCORE --> CALCULATE
    PERF_SCORE --> CALCULATE
    STRUCT_SCORE --> CALCULATE
    
    CALCULATE --> THRESHOLD{Score >= 85?}
    
    THRESHOLD -->|Yes| PASS[✅ Validation Passed]
    THRESHOLD -->|No| FAIL[❌ Validation Failed]
    
    FAIL --> GUIDANCE[Generate Guidance]
    GUIDANCE --> SUGGESTIONS[Specific Suggestions]
    SUGGESTIONS --> BLOCK[Block Operation]
    
    PASS --> ALLOW[Allow Operation]
    ALLOW --> MONITOR[Monitor Performance]
    
    %% Styling
    classDef input fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px
    classDef process fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef validation fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef decision fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef success fill:#e8f5e8,stroke:#2e7d32,stroke-width:3px
    classDef failure fill:#ffebee,stroke:#c62828,stroke-width:3px
    
    class INPUT input
    class PARSE,RULES,CALCULATE process
    class UI_CHECK,ACC_CHECK,PERF_CHECK,STRUCT_CHECK,UI_SCORE,ACC_SCORE,PERF_SCORE,STRUCT_SCORE validation
    class THRESHOLD decision
    class PASS,ALLOW,MONITOR success
    class FAIL,GUIDANCE,SUGGESTIONS,BLOCK failure
```

### Security and Permission Flow

```mermaid
graph TD
    subgraph "Security Layers"
        subgraph "Input Validation"
            PATH_VAL[Path Validation]
            SIZE_VAL[Size Validation]
            CONTENT_VAL[Content Sanitization]
        end
        
        subgraph "Permission Checks"
            FILE_PERM[File Permissions]
            EXEC_PERM[Execution Permissions]
            HOOK_PERM[Hook Permissions]
        end
        
        subgraph "Command Security"
            CMD_SANITIZE[Command Sanitization]
            ENV_CLEAN[Environment Cleanup]
            TIMEOUT[Timeout Protection]
        end
        
        subgraph "Audit Trail"
            ACCESS_LOG[Access Logging]
            OPERATION_LOG[Operation Logging]
            ERROR_LOG[Error Logging]
        end
    end
    
    REQUEST[Hook Request] --> PATH_VAL
    PATH_VAL --> SIZE_VAL
    SIZE_VAL --> CONTENT_VAL
    
    CONTENT_VAL --> FILE_PERM
    FILE_PERM --> EXEC_PERM
    EXEC_PERM --> HOOK_PERM
    
    HOOK_PERM --> CMD_SANITIZE
    CMD_SANITIZE --> ENV_CLEAN
    ENV_CLEAN --> TIMEOUT
    
    TIMEOUT --> ACCESS_LOG
    ACCESS_LOG --> OPERATION_LOG
    OPERATION_LOG --> ERROR_LOG
    
    ERROR_LOG --> EXECUTE[Execute Hook]
    
    %% Security Violations
    PATH_VAL -.->|Path Traversal| BLOCK[Block Request]
    SIZE_VAL -.->|Too Large| BLOCK
    FILE_PERM -.->|No Permission| BLOCK
    TIMEOUT -.->|Timeout| BLOCK
    
    %% Styling
    classDef security fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef validation fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef audit fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px
    classDef flow fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    
    class PATH_VAL,SIZE_VAL,CONTENT_VAL,FILE_PERM,EXEC_PERM,HOOK_PERM security
    class CMD_SANITIZE,ENV_CLEAN,TIMEOUT validation
    class ACCESS_LOG,OPERATION_LOG,ERROR_LOG audit
    class REQUEST,EXECUTE,BLOCK flow
```

## 📊 Performance and Monitoring Diagrams

### Hook Performance Timeline

```mermaid
gantt
    title Hook Execution Performance Timeline
    dateFormat X
    axisFormat %L ms
    
    section File Operation
    User Request         :0, 5
    
    section Pre-Hook
    Hook Initialization  :5, 15
    PRD Validation      :15, 35
    Claude Flow Cmd     :35, 45
    
    section File I/O
    File System Op      :45, 50
    
    section Post-Hook
    Coordination Update :50, 65
    Memory Update       :65, 75
    Logging            :75, 80
    
    section Response
    Return to User      :80, 85
```

### System Resource Usage

```mermaid
graph LR
    subgraph "Resource Monitoring"
        subgraph "CPU Usage"
            CPU_IDLE[Idle: 85%]
            CPU_HOOKS[Hooks: 10%]
            CPU_CF[Claude Flow: 5%]
        end
        
        subgraph "Memory Usage"
            MEM_BASE[Base: 50MB]
            MEM_HOOKS[Hooks: 27MB]
            MEM_CACHE[Cache: 15MB]
            MEM_TEMP[Temp: 8MB]
        end
        
        subgraph "I/O Operations"
            IO_READ[File Reads: 120/min]
            IO_WRITE[File Writes: 45/min]
            IO_HOOK[Hook Calls: 85/min]
        end
        
        subgraph "Network"
            NET_CF[Claude Flow: 2KB/s]
            NET_API[API Calls: 15/min]
        end
    end
    
    subgraph "Performance Thresholds"
        THRESH_CPU[CPU < 20%]
        THRESH_MEM[Memory < 200MB]
        THRESH_IO[I/O < 500/min]
        THRESH_LAT[Latency < 100ms]
    end
    
    %% Connections
    CPU_HOOKS --> THRESH_CPU
    MEM_HOOKS --> THRESH_MEM
    IO_HOOK --> THRESH_IO
    
    %% Styling
    classDef resources fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px
    classDef thresholds fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef metrics fill:#fff3e0,stroke:#e65100,stroke-width:2px
    
    class CPU_IDLE,CPU_HOOKS,CPU_CF,MEM_BASE,MEM_HOOKS,MEM_CACHE,MEM_TEMP metrics
    class IO_READ,IO_WRITE,IO_HOOK,NET_CF,NET_API metrics
    class THRESH_CPU,THRESH_MEM,THRESH_IO,THRESH_LAT thresholds
```

## 🔄 State Transition Diagrams

### Hook System State Machine

```mermaid
stateDiagram-v2
    [*] --> Uninitialized
    
    Uninitialized --> Initializing : initialize()
    Initializing --> Ready : success
    Initializing --> Error : failure
    
    Ready --> PreHook : file operation
    PreHook --> Validating : validation required
    PreHook --> Executing : no validation needed
    
    Validating --> Blocking : validation failed
    Validating --> Executing : validation passed
    
    Blocking --> Ready : user fixes issues
    Blocking --> Disabled : emergency override
    
    Executing --> PostHook : operation complete
    Executing --> Error : operation failed
    
    PostHook --> Coordinating : swarm enabled
    PostHook --> Ready : swarm disabled
    
    Coordinating --> Ready : coordination complete
    Coordinating --> Error : coordination failed
    
    Error --> Ready : error handled
    Error --> Disabled : critical error
    
    Disabled --> Ready : manual re-enable
    Disabled --> [*] : shutdown
```

### Agent Coordination State

```mermaid
stateDiagram-v2
    [*] --> NoAgents
    
    NoAgents --> SpawningAgents : task requires agents
    SpawningAgents --> AgentsReady : spawn complete
    SpawningAgents --> SpawnFailed : spawn error
    
    AgentsReady --> AssigningTasks : new task
    AssigningTasks --> Working : tasks assigned
    AssigningTasks --> AssignFailed : assignment error
    
    Working --> Coordinating : inter-agent communication
    Working --> Completing : task finished
    
    Coordinating --> Working : coordination complete
    Coordinating --> CoordFailed : coordination error
    
    Completing --> AgentsReady : more tasks available
    Completing --> Terminating : no more tasks
    
    Terminating --> NoAgents : agents terminated
    
    SpawnFailed --> NoAgents : retry or disable
    AssignFailed --> AgentsReady : retry assignment
    CoordFailed --> AgentsReady : recover coordination
```

## 🎯 Data Flow Diagrams

### Information Flow Architecture

```mermaid
graph TB
    subgraph "User Layer"
        USER[Developer]
        IDE[IDE/Editor]
    end
    
    subgraph "Claude Code Layer"
        CLI[Claude Code CLI]
        TOOLS[Tool System]
        CACHE[Operation Cache]
    end
    
    subgraph "Hook Processing Layer"
        INTERCEPT[Hook Interceptor]
        VALIDATE[Validation Engine]
        EXECUTE[Execution Engine]
    end
    
    subgraph "Coordination Layer"
        CF_API[Claude Flow API]
        SWARM[Swarm Manager]
        AGENTS[Agent Pool]
    end
    
    subgraph "Storage Layer"
        FILE_SYS[File System]
        HOOK_DB[Hook Database]
        MEMORY[Swarm Memory]
        METRICS[Metrics Store]
    end
    
    %% Data Flow
    USER --> IDE
    IDE --> CLI
    CLI --> TOOLS
    TOOLS --> CACHE
    
    TOOLS --> INTERCEPT
    INTERCEPT --> VALIDATE
    VALIDATE --> EXECUTE
    
    EXECUTE --> CF_API
    CF_API --> SWARM
    SWARM --> AGENTS
    
    EXECUTE --> FILE_SYS
    INTERCEPT --> HOOK_DB
    SWARM --> MEMORY
    EXECUTE --> METRICS
    
    %% Feedback Loops
    CACHE --> TOOLS
    HOOK_DB --> VALIDATE
    MEMORY --> SWARM
    METRICS --> EXECUTE
    
    %% Styling
    classDef userLayer fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px
    classDef claudeLayer fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef hookLayer fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef coordLayer fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef storageLayer fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    
    class USER,IDE userLayer
    class CLI,TOOLS,CACHE claudeLayer
    class INTERCEPT,VALIDATE,EXECUTE hookLayer
    class CF_API,SWARM,AGENTS coordLayer
    class FILE_SYS,HOOK_DB,MEMORY,METRICS storageLayer
```

---

**Next**: [Hook Configuration Examples - Practical Configuration Templates](./05-configuration-examples.md)