# ADK Integration Architecture Diagrams

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph "Browser"
        subgraph "React Application"
            subgraph "UI Layer"
                CP[Chat Page]
                TP[Thinking Panel]
                MI[Message Input]
                CS[Connection Status]
            end
            
            subgraph "Service Layer"
                AM[ADK Manager]
                SM[Session Manager]
                SC[SSE Client]
                ET[Event Transformer]
                ES[Event Store]
                EH[Error Handler]
            end
            
            subgraph "State Management"
                RC[React Context]
                RH[React Hooks]
                LS[Local Storage]
            end
        end
    end
    
    subgraph "ADK Backend"
        subgraph "FastAPI Server"
            EP1[POST /users/{id}/sessions]
            EP2[POST /run_sse]
            EP3[POST /feedback]
        end
        
        subgraph "Agent System"
            IPA[Interactive Planner Agent]
            PG[Plan Generator]
            SR[Section Researcher]
            RC2[Report Composer]
        end
    end
    
    %% UI Connections
    CP --> AM
    TP --> ES
    MI --> AM
    CS --> SC
    
    %% Service Layer Connections
    AM --> SM
    AM --> SC
    AM --> ET
    SC --> ES
    ET --> ES
    
    %% State Connections
    AM --> RC
    ES --> RC
    SM --> LS
    
    %% Backend Connections
    SM -.->|Create Session| EP1
    SC -.->|SSE Stream| EP2
    AM -.->|Feedback| EP3
    
    %% Agent Flow
    EP2 --> IPA
    IPA --> PG
    IPA --> SR
    SR --> RC2
```

## 2. SSE Event Flow Architecture

```mermaid
sequenceDiagram
    participant UI as React UI
    participant AM as ADK Manager
    participant SC as SSE Client
    participant SM as Session Manager
    participant BE as ADK Backend
    participant AG as Agent Graph
    
    %% Initial Setup
    UI->>AM: Initialize
    AM->>SM: getOrCreateSession(userId)
    SM->>BE: POST /users/{userId}/sessions
    BE-->>SM: Session {id, metadata}
    SM-->>AM: Session Created
    AM->>SC: connect(sessionId, userId)
    SC-->>UI: Connection Ready
    
    %% Message Flow
    UI->>AM: sendMessage(content)
    AM->>SC: sendMessage(ADKMessage)
    SC->>BE: POST /run_sse?alt=sse
    BE->>AG: Process with Agents
    
    %% SSE Event Stream
    loop SSE Events
        AG-->>BE: Agent Events
        BE-->>SC: data: {event}
        SC->>SC: Parse SSE Event
        SC->>AM: Emit ADK Event
        AM->>UI: Update UI State
    end
    
    BE-->>SC: data: [DONE]
    SC->>AM: Stream Complete
    AM->>UI: Message Complete
```

## 3. Agent Activity Event Processing

```mermaid
graph LR
    subgraph "Raw SSE Event"
        RE[ADKSSEEvent]
    end
    
    subgraph "Event Processor"
        EP[Event Parser]
        AD[Agent Detector]
        CD[Content Detector]
        WD[Workflow Detector]
    end
    
    subgraph "UI Events"
        TE[Thinking Event]
        ME[Message Event]
        WE[Workflow Event]
    end
    
    RE --> EP
    EP --> AD
    EP --> CD
    EP --> WD
    
    AD -->|author != 'user'| TE
    CD -->|content.parts| ME
    WD -->|actions.stateDelta| WE
    
    TE --> ThinkingUpdate
    ME --> MessageUpdate
    WE --> WorkflowUpdate
    
    subgraph "UI Updates"
        ThinkingUpdate["{stepId, agent, action, status}"]
        MessageUpdate["{content, isPartial, format}"]
        WorkflowUpdate["{plan, report, sources}"]
    end
```

## 4. Session Management Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Uninitialized
    
    Uninitialized --> CheckingCache: getOrCreateSession()
    
    CheckingCache --> CacheHit: Session Found
    CheckingCache --> CacheMiss: No Session
    
    CacheHit --> ValidatingSession: Validate
    CacheMiss --> CreatingSession: Create New
    
    ValidatingSession --> Active: Valid
    ValidatingSession --> Expired: Invalid
    
    Expired --> CreatingSession: Refresh
    CreatingSession --> Active: Success
    CreatingSession --> Error: Failed
    
    Active --> Refreshing: Token Expiry
    Refreshing --> Active: Success
    Refreshing --> Error: Failed
    
    Error --> Retry: Recoverable
    Error --> [*]: Unrecoverable
    
    Retry --> CreatingSession: Attempt
```

## 5. Error Handling and Recovery Flow

```mermaid
graph TB
    subgraph "Error Detection"
        E1[Network Error]
        E2[Session Error]
        E3[SSE Parse Error]
        E4[Agent Error]
    end
    
    subgraph "Error Handler"
        EH[Error Handler]
        EC[Error Classifier]
        RS[Retry Strategy]
        RC[Recovery Manager]
    end
    
    subgraph "Recovery Actions"
        A1[Retry Request]
        A2[Refresh Session]
        A3[Reconnect SSE]
        A4[Show Error UI]
        A5[Fallback Mode]
    end
    
    E1 --> EH
    E2 --> EH
    E3 --> EH
    E4 --> EH
    
    EH --> EC
    EC -->|Retryable| RS
    EC -->|Session Issue| RC
    EC -->|Fatal| A4
    
    RS --> A1
    RC --> A2
    RC --> A3
    
    A1 -->|Max Retries| A5
    A2 -->|Failed| A5
    A3 -->|Failed| A5
```

## 6. Message Transformation Pipeline

```mermaid
graph LR
    subgraph "User Input"
        UI[User Message]
        MD[Metadata]
    end
    
    subgraph "Transform to ADK"
        T1[Message Transformer]
        AM[ADK Message Format]
    end
    
    subgraph "ADK Request"
        REQ["{
            app_name: 'app',
            user_id: string,
            session_id: string,
            new_message: {
                role: 'user',
                parts: [{text}]
            },
            streaming: true
        }"]
    end
    
    UI --> T1
    MD --> T1
    T1 --> AM
    AM --> REQ
    
    subgraph "ADK Response"
        SSE[SSE Events]
    end
    
    subgraph "Transform to UI"
        T2[Event Transformer]
        UE[UI Events]
    end
    
    subgraph "UI Updates"
        MSG[Message Updates]
        THK[Thinking Updates]
        WFL[Workflow Updates]
    end
    
    REQ -.->|HTTP POST| SSE
    SSE --> T2
    T2 --> UE
    UE --> MSG
    UE --> THK
    UE --> WFL
```

## 7. Two-Phase Workflow Integration

```mermaid
stateDiagram-v2
    [*] --> UserInput: User provides topic
    
    state Phase1 {
        UserInput --> PlanGeneration: Generate Plan
        PlanGeneration --> PlanPresentation: Show to User
        PlanPresentation --> UserFeedback: Await Response
        UserFeedback --> PlanRefinement: Modify Request
        UserFeedback --> PlanApproval: Approve
        PlanRefinement --> PlanPresentation: Updated Plan
    }
    
    state Phase2 {
        PlanApproval --> Outlining: Create Structure
        Outlining --> Research: Execute Searches
        Research --> Evaluation: Check Quality
        Evaluation --> Enhancement: Needs More
        Evaluation --> Composition: Sufficient
        Enhancement --> Research: Additional Searches
        Composition --> FinalReport: Generate Report
    }
    
    FinalReport --> [*]: Complete
```

## 8. Event Store and State Management

```mermaid
graph TB
    subgraph "Event Sources"
        SSE[SSE Client]
        SM[Session Manager]
        EH[Error Handler]
    end
    
    subgraph "Event Store"
        ES[Event Store]
        EQ[Event Queue]
        SUB[Subscribers]
        HIST[Event History]
    end
    
    subgraph "React Integration"
        CTX[ADK Context]
        HOOK[useADK Hook]
        RED[Reducer]
    end
    
    subgraph "UI Components"
        CHAT[Chat Component]
        THINK[Thinking Panel]
        STATUS[Status Bar]
    end
    
    SSE -->|emit| ES
    SM -->|emit| ES
    EH -->|emit| ES
    
    ES --> EQ
    EQ --> SUB
    ES --> HIST
    
    SUB --> CTX
    CTX --> HOOK
    HOOK --> RED
    
    RED --> CHAT
    RED --> THINK
    RED --> STATUS
```

## 9. Testing Architecture

```mermaid
graph TB
    subgraph "Test Infrastructure"
        MS[Mock SSE Server]
        MA[Mock ADK API]
        TD[Test Data Factory]
    end
    
    subgraph "Unit Tests"
        UT1[Service Tests]
        UT2[Transformer Tests]
        UT3[Hook Tests]
    end
    
    subgraph "Integration Tests"
        IT1[SSE Flow Tests]
        IT2[Session Tests]
        IT3[Error Recovery Tests]
    end
    
    subgraph "E2E Tests"
        E2E1[Full Workflow]
        E2E2[Error Scenarios]
        E2E3[Performance Tests]
    end
    
    TD --> UT1
    TD --> UT2
    TD --> UT3
    
    MS --> IT1
    MA --> IT2
    MS --> IT3
    
    MS --> E2E1
    MA --> E2E1
    MS --> E2E2
    MA --> E2E2
```

## 10. Performance Optimization Flow

```mermaid
graph LR
    subgraph "Event Stream"
        S1[Event 1]
        S2[Event 2]
        S3[Event 3]
        S4[Event N]
    end
    
    subgraph "Optimization Layer"
        EB[Event Batcher]
        DB[Debouncer]
        TH[Throttler]
        CB[Cache]
    end
    
    subgraph "Processing"
        P1[Process Batch]
        P2[Update UI]
    end
    
    S1 --> EB
    S2 --> EB
    S3 --> EB
    S4 --> EB
    
    EB -->|16ms| P1
    P1 --> DB
    DB -->|50ms| TH
    TH -->|100ms| P2
    
    P1 --> CB
    CB -->|Cache Hit| P2
```

These diagrams provide a comprehensive visual representation of the ADK integration architecture, showing:

1. Overall system architecture and component relationships
2. Detailed SSE event flow from user input to UI updates
3. Agent activity processing pipeline
4. Session management state machine
5. Error handling and recovery strategies
6. Message transformation between frontend and ADK formats
7. Two-phase workflow implementation
8. Event store and React state management
9. Testing architecture layers
10. Performance optimization strategies

Each diagram focuses on a specific aspect of the integration, making it easier to understand and implement the various components of the system.