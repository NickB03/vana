# Unified Tool-Calling Architecture (Issue #340)

> **Last Updated**: 2025-12-19
> **Status**: Production
> **Version**: Phase 0 Complete

This document provides visual documentation of the unified chat + tool system architecture implemented in Issue #340.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Complete Data Flow](#2-complete-data-flow)
3. [Security Infrastructure](#3-security-infrastructure)
4. [SSE Event Flow](#4-sse-event-flow)
5. [Tool Executor Routing](#5-tool-executor-routing)
6. [Tool Catalog & Definitions](#6-tool-catalog--definitions)

---

## 1. High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend (React)"
        UI[Chat Interface]
        AR[Artifact Renderer]
        IR[Image Renderer]
    end

    subgraph "Edge Functions"
        CHAT[chat/index.ts]

        subgraph "Handlers"
            TCH[tool-calling-chat.ts]
            STR[streaming.ts]
        end

        subgraph "Middleware"
            AUTH[Authentication]
            RL[Rate Limiting]
            VAL[Validation]
        end
    end

    subgraph "Tool System (_shared/)"
        TD[tool-definitions.ts<br/>TOOL_CATALOG]
        TE[tool-executor.ts<br/>Router]

        subgraph "Specialized Executors"
            AE[artifact-executor.ts]
            IE[image-executor.ts]
            SE[Search Executor]
        end

        subgraph "Security Layer"
            TV[tool-validator.ts]
            TRL[tool-rate-limiter.ts]
            TET[tool-execution-tracker.ts]
            PID[prompt-injection-defense.ts]
            SEH[safe-error-handler.ts]
        end
    end

    subgraph "AI Providers"
        GLM[GLM-4.6<br/>Z.ai API]
        GEM[Gemini Flash<br/>OpenRouter]
        TAV[Tavily API]
    end

    subgraph "Database"
        SB[(Supabase<br/>PostgreSQL)]
        ST[(Supabase<br/>Storage)]
    end

    UI -->|SSE Stream| CHAT
    CHAT --> AUTH
    AUTH --> RL
    RL --> VAL
    VAL --> TCH

    TCH --> TD
    TD --> TE
    TE --> TV
    TV --> TRL
    TRL --> TET

    TE --> AE
    TE --> IE
    TE --> SE

    AE --> GLM
    IE --> GEM
    SE --> TAV

    AE -->|artifact_complete| UI
    IE -->|image_complete| UI
    SE -->|web_search| UI

    IE --> ST
    CHAT --> SB

    AR -.->|Renders| UI
    IR -.->|Renders| UI

    style TD fill:#e1f5fe
    style TE fill:#e1f5fe
    style TV fill:#ffebee
    style TRL fill:#ffebee
    style TET fill:#ffebee
    style PID fill:#ffebee
    style GLM fill:#e8f5e9
    style GEM fill:#e8f5e9
    style TAV fill:#e8f5e9
```

---

## 2. Complete Data Flow

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend
    participant CH as chat/index.ts
    participant MW as Middleware
    participant TC as tool-calling-chat.ts
    participant GLM as GLM-4.6
    participant TE as tool-executor.ts
    participant EX as Specialized Executor
    participant API as External API
    participant DB as Supabase

    U->>FE: Send message
    FE->>CH: POST /chat (SSE)

    rect rgb(255, 245, 238)
        Note over CH,MW: Middleware Pipeline
        CH->>MW: validateInput()
        MW->>MW: checkApiThrottle()
        MW->>MW: checkRateLimit()
        MW->>MW: authenticateUser()
        MW->>MW: verifySessionOwnership()
    end

    CH->>TC: handleToolCallingChat()

    rect rgb(232, 245, 233)
        Note over TC,GLM: Initial GLM Call
        TC->>GLM: callGLMWithRetry()<br/>+ tools: TOOL_CATALOG
        GLM-->>TC: SSE Stream starts

        loop Stream Processing
            GLM-->>TC: reasoning_content chunks
            TC-->>FE: reasoning_step events
            GLM-->>TC: content chunks
            TC-->>FE: content delta events
        end

        GLM-->>TC: tool_calls detected
    end

    rect rgb(227, 242, 253)
        Note over TC,API: Tool Execution
        TC->>FE: tool_call_start event
        TC->>TE: executeTool()

        TE->>TE: Security validation<br/>(5 layers)
        TE->>EX: Route to executor
        EX->>API: Call external API
        API-->>EX: Response
        EX-->>TE: ToolExecutionResult

        TE-->>TC: Formatted result
        TC->>FE: tool_result event
        TC->>FE: artifact_complete /<br/>image_complete /<br/>web_search event
    end

    rect rgb(243, 229, 245)
        Note over TC,GLM: GLM Continuation
        TC->>GLM: callGLMWithToolResult()<br/>+ <tool_result> XML

        loop Continuation Stream
            GLM-->>TC: content chunks
            TC-->>FE: content delta events
        end

        GLM-->>TC: [DONE]
    end

    TC->>DB: Save message + artifacts
    TC->>FE: [DONE]
    FE->>U: Display complete response
```

---

## 3. Security Infrastructure

```mermaid
graph TB
    subgraph "5-Layer Security Model"
        direction TB

        subgraph L1["Layer 1: Prompt Injection Defense"]
            L1A[Unicode Normalization]
            L1B[Pattern Detection]
            L1C[Mode Hint Validation]
            L1D[Content Sanitization]
        end

        subgraph L2["Layer 2: Tool Parameter Validation"]
            L2A[Prototype Pollution Check]
            L2B[Extra Property Rejection]
            L2C[Type Guards]
            L2D[Length Limits]
        end

        subgraph L3["Layer 3: Tool Rate Limiting"]
            L3A[Circuit Breaker Pattern]
            L3B[Fail-Closed Design]
            L3C[API Throttle Check]
            L3D[Per-Tool Limits]
        end

        subgraph L4["Layer 4: Execution Tracking"]
            L4A[Max 3 Tools/Request]
            L4B[60s Timeout/Tool]
            L4C[Resource Exhaustion Guard]
            L4D[Execution Statistics]
        end

        subgraph L5["Layer 5: Safe Error Handling"]
            L5A[Error Sanitization]
            L5B[No Stack Traces]
            L5C[PII Filtering]
            L5D[Standardized Codes]
        end
    end

    INPUT[Incoming Request] --> L1
    L1 --> L2
    L2 --> L3
    L3 --> L4
    L4 --> L5
    L5 --> EXEC[Tool Execution]

    L1 -->|Injection Detected| REJECT1[403 Forbidden]
    L2 -->|Invalid Params| REJECT2[400 Bad Request]
    L3 -->|Rate Limited| REJECT3[429 Too Many]
    L4 -->|Resource Exhausted| REJECT4[503 Unavailable]
    L5 -->|Error| SAFE[Sanitized Error]

    style L1 fill:#ffcdd2
    style L2 fill:#ffe0b2
    style L3 fill:#fff9c4
    style L4 fill:#c8e6c9
    style L5 fill:#bbdefb
    style REJECT1 fill:#f44336,color:#fff
    style REJECT2 fill:#ff9800,color:#fff
    style REJECT3 fill:#ffc107
    style REJECT4 fill:#9e9e9e,color:#fff
```

### Security Validation Order

```mermaid
flowchart LR
    subgraph "prompt-injection-defense.ts"
        A1[normalizeUnicode] --> A2[detectDangerousPatterns]
        A2 --> A3[validateModeHint]
        A3 --> A4[sanitizeContent]
    end

    subgraph "tool-validator.ts"
        B1[checkPrototypePollution] --> B2[validateExtraProperties]
        B2 --> B3[validateFieldTypes]
        B3 --> B4[enforeLengthLimits]
        B4 --> B5[freezeObject]
    end

    subgraph "tool-rate-limiter.ts"
        C1[checkCircuitBreaker] --> C2[checkApiThrottle]
        C2 --> C3[checkUserLimit]
        C3 --> C4[checkToolLimit]
    end

    subgraph "tool-execution-tracker.ts"
        D1[checkMaxToolCalls] --> D2[startTimeout]
        D2 --> D3[trackExecution]
        D3 --> D4[recordMetrics]
    end

    A4 --> B1
    B5 --> C1
    C4 --> D1
    D4 --> E[Execute Tool]

    style A1 fill:#ffcdd2
    style B1 fill:#ffe0b2
    style C1 fill:#fff9c4
    style D1 fill:#c8e6c9
    style E fill:#e1f5fe
```

---

## 4. SSE Event Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant BE as Backend

    Note over FE,BE: Stream Opens

    rect rgb(255, 243, 224)
        Note right of BE: Reasoning Phase
        BE->>FE: reasoning_step {phase, title, items}
        BE->>FE: reasoning_step {phase, title, items}
        BE->>FE: reasoning_status {content, source}
    end

    rect rgb(227, 242, 253)
        Note right of BE: Tool Call Detected
        BE->>FE: tool_call_start {toolName, arguments}
    end

    rect rgb(232, 245, 233)
        Note right of BE: Tool Execution
        BE->>FE: tool_result {toolName, success, latencyMs}

        alt generate_artifact
            BE->>FE: artifact_complete {artifactCode, type, title}
        else generate_image
            BE->>FE: image_complete {imageUrl, imageData}
        else browser.search
            BE->>FE: web_search {query, sources}
        end
    end

    rect rgb(243, 229, 245)
        Note right of BE: GLM Continuation
        loop Content Streaming
            BE->>FE: {choices: [{delta: {content}}]}
        end
    end

    rect rgb(255, 224, 224)
        Note right of BE: Finalization
        BE->>FE: reasoning_complete {reasoning, steps}
        BE->>FE: [DONE]
    end
```

### SSE Event Types Reference

```mermaid
graph LR
    subgraph "Event Categories"
        direction TB

        subgraph "Reasoning Events"
            R1[reasoning_step]
            R2[reasoning_status]
            R3[reasoning_complete]
        end

        subgraph "Tool Events"
            T1[tool_call_start]
            T2[tool_result]
        end

        subgraph "Result Events"
            A1[artifact_complete]
            A2[image_complete]
            A3[web_search]
        end

        subgraph "Content Events"
            C1[delta.content]
            C2[delta.reasoning_content]
        end

        subgraph "Control Events"
            X1["[DONE]"]
            X2[error]
        end
    end

    style R1 fill:#fff3e0
    style R2 fill:#fff3e0
    style R3 fill:#fff3e0
    style T1 fill:#e3f2fd
    style T2 fill:#e3f2fd
    style A1 fill:#e8f5e9
    style A2 fill:#e8f5e9
    style A3 fill:#e8f5e9
    style C1 fill:#f3e5f5
    style C2 fill:#f3e5f5
    style X1 fill:#ffebee
    style X2 fill:#ffebee
```

---

## 5. Tool Executor Routing

```mermaid
flowchart TB
    CALL[Tool Call Received] --> VALIDATE{Validate Tool Name}

    VALIDATE -->|Unknown| DENY[Fail-Closed: DENIED]
    VALIDATE -->|Valid| ROUTE{Route by Handler}

    ROUTE -->|handler: 'artifact'| AE[artifact-executor.ts]
    ROUTE -->|handler: 'image'| IE[image-executor.ts]
    ROUTE -->|handler: 'search'| SE[Search Executor]

    subgraph "Artifact Executor"
        AE --> AE1[validateParams]
        AE1 --> AE2[buildPrompt]
        AE2 --> AE3[callGLM-4.6]
        AE3 --> AE4[stripHTML]
        AE4 --> AE5[preValidate]
        AE5 --> AE6[validateCode]
        AE6 --> AE7[autoFix]
        AE7 --> AER[ArtifactResult]
    end

    subgraph "Image Executor"
        IE --> IE1[validateParams]
        IE1 --> IE2[buildMessages]
        IE2 --> IE3[callGeminiFlash]
        IE3 --> IE4[extractImage]
        IE4 --> IE5[uploadWithRetry]
        IE5 --> IER[ImageResult]
    end

    subgraph "Search Executor"
        SE --> SE1[rewriteQuery]
        SE1 --> SE2[callTavily]
        SE2 --> SE3[formatContext]
        SE3 --> SE4[logUsage]
        SE4 --> SER[SearchResult]
    end

    AER --> FORMAT[formatResultForGLM]
    IER --> FORMAT
    SER --> FORMAT

    FORMAT --> INJECT[Inject as tool_result XML]
    INJECT --> CONTINUE[callGLMWithToolResult]

    style DENY fill:#f44336,color:#fff
    style AE fill:#bbdefb
    style IE fill:#c8e6c9
    style SE fill:#fff9c4
```

### Tool Parameters & Limits

```mermaid
graph TB
    subgraph "generate_artifact"
        GA_TYPE["type: react|html|svg|code|mermaid|markdown"]
        GA_PROMPT["prompt: string (max 10,000 chars)"]
        GA_RATE["Rate: 5/5h guest, 50/5h auth"]
        GA_MODEL["Model: GLM-4.6 (Z.ai)"]
    end

    subgraph "generate_image"
        GI_PROMPT["prompt: string (max 2,000 chars)"]
        GI_MODE["mode: generate|edit"]
        GI_ASPECT["aspectRatio: 1:1|16:9|9:16|4:3|3:4"]
        GI_RATE["Rate: 2/5h guest, 25/5h auth"]
        GI_MODEL["Model: Gemini Flash Image"]
    end

    subgraph "browser.search"
        BS_QUERY["query: string (max 500 chars)"]
        BS_RATE["Rate: 20/5h guest, 100/5h auth"]
        BS_MODEL["Provider: Tavily API"]
    end

    style GA_TYPE fill:#e3f2fd
    style GI_PROMPT fill:#e8f5e9
    style BS_QUERY fill:#fff9c4
```

---

## 6. Tool Catalog & Definitions

```mermaid
classDiagram
    class TOOL_CATALOG {
        +generate_artifact: ToolDefinition
        +generate_image: ToolDefinition
        +browser.search: ToolDefinition
    }

    class ToolDefinition {
        +name: string
        +description: string
        +parameters: Record~string, ToolParameter~
        +required: string[]
        +execution: ToolExecutionMetadata
    }

    class ToolExecutionMetadata {
        +handler: 'artifact' | 'image' | 'search'
        +model: string
        +streaming: boolean
    }

    class ToolParameter {
        +type: 'string' | 'enum'
        +description: string
        +enum?: string[]
        +maxLength?: number
    }

    class ToolContext {
        +requestId: string
        +userId?: string
        +isGuest: boolean
        +functionName?: string
        +supabaseClient?: SupabaseClient
    }

    class ToolExecutionResult {
        +success: boolean
        +toolName: string
        +data?: object
        +error?: string
        +latencyMs: number
        +retryCount?: number
    }

    TOOL_CATALOG --> ToolDefinition
    ToolDefinition --> ToolExecutionMetadata
    ToolDefinition --> ToolParameter
    ToolContext --> ToolExecutionResult
```

### GLM Tool Call Format

```mermaid
flowchart LR
    subgraph "Request to GLM"
        REQ["tools: GLMToolDefinition[]"]
        REQ --> GDEF["
        {
          type: 'function',
          function: {
            name: 'generate_artifact',
            description: '...',
            parameters: {
              type: 'object',
              properties: {...},
              required: [...]
            }
          }
        }
        "]
    end

    subgraph "Response from GLM"
        RESP["tool_calls array"]
        RESP --> TCALL["
        {
          id: 'call_abc123',
          function: {
            name: 'browser.search',
            arguments: '{\"query\":\"...\"}'
          }
        }
        "]
    end

    subgraph "Tool Result Injection"
        RES["<tool_result> XML"]
        RES --> XML["
        <tool_result>
          <tool_call_id>call_abc123</tool_call_id>
          <name>browser.search</name>
          <status>success</status>
          <result>...</result>
        </tool_result>
        "]
    end

    GDEF --> RESP
    TCALL --> RES
```

---

## File Reference

| File | Purpose |
|------|---------|
| `_shared/tool-definitions.ts` | TOOL_CATALOG, getGLMToolDefinitions() |
| `_shared/tool-executor.ts` | Central router, executeTool() |
| `_shared/artifact-executor.ts` | Artifact generation pipeline |
| `_shared/image-executor.ts` | Image generation + storage |
| `_shared/tool-validator.ts` | Parameter validation, Zod schemas |
| `_shared/tool-rate-limiter.ts` | Per-tool rate limits, circuit breaker |
| `_shared/tool-execution-tracker.ts` | Resource exhaustion protection |
| `_shared/prompt-injection-defense.ts` | Input sanitization |
| `_shared/safe-error-handler.ts` | Error sanitization |
| `chat/handlers/tool-calling-chat.ts` | Main orchestration handler |
| `chat/handlers/streaming.ts` | SSE stream handling |

---

## Performance Characteristics

| Tool | Typical Latency | Model | Notes |
|------|----------------|-------|-------|
| generate_artifact | 2-5s | GLM-4.6 | Thinking mode enabled |
| generate_image | 3-8s | Gemini Flash | +storage upload |
| browser.search | 1-3s | Tavily | +optional query rewrite |

---

*Generated from codebase analysis on 2025-12-19*
