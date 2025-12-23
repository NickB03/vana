# Tool System Deep Dive

> Detailed diagrams for specific subsystems of the unified tool architecture.

---

## 1. Chat Function Entry Point (Middleware Pipeline)

```mermaid
flowchart TB
    REQ[Incoming Request] --> CORS{CORS Preflight?}
    CORS -->|Yes| PREFLIGHT[Return 204]
    CORS -->|No| PARSE[Parse Request Body]

    PARSE --> VALID{validateInput}
    VALID -->|Invalid| ERR400[400 Bad Request]
    VALID -->|Valid| THROTTLE{checkApiThrottle}

    THROTTLE -->|Throttled| ERR503[503 Service Unavailable]
    THROTTLE -->|OK| RATELIMIT{checkRateLimit}

    RATELIMIT -->|Guest| GUEST_RL{Guest Rate Limit}
    RATELIMIT -->|Auth| AUTH_RL{Auth Rate Limit}

    GUEST_RL -->|Exceeded| ERR429_G[429 + Retry-After]
    GUEST_RL -->|OK| CONTINUE
    AUTH_RL -->|Exceeded| ERR429_A[429 + Retry-After]
    AUTH_RL -->|OK| CONTINUE

    CONTINUE --> AUTHN[authenticateUser]
    AUTHN --> VERIFY{verifySessionOwnership}

    VERIFY -->|Not Owner| ERR403[403 Forbidden]
    VERIFY -->|Owner| TOOL_CHAT[handleToolCallingChat]

    TOOL_CHAT --> SSE[SSE Stream Response]

    style ERR400 fill:#ffcdd2
    style ERR403 fill:#ffcdd2
    style ERR429_G fill:#ffe0b2
    style ERR429_A fill:#ffe0b2
    style ERR503 fill:#ffcdd2
    style TOOL_CHAT fill:#c8e6c9
```

---

## 2. GLM Native Tool Calling Flow

```mermaid
stateDiagram-v2
    [*] --> Idle

    Idle --> StreamingReasoning: callGLMWithRetry()
    StreamingReasoning --> StreamingReasoning: reasoning_content chunk

    StreamingReasoning --> StreamingContent: content begins
    StreamingContent --> StreamingContent: content chunk

    StreamingReasoning --> ToolCallDetected: tool_calls in delta
    StreamingContent --> ToolCallDetected: tool_calls in delta

    ToolCallDetected --> ExecutingTool: executeTool()
    ExecutingTool --> ToolSuccess: success=true
    ExecutingTool --> ToolFailure: success=false

    ToolSuccess --> ContinuationStream: callGLMWithToolResult()
    ToolFailure --> ErrorHandling: safe error message

    ContinuationStream --> ContinuationStream: content chunk
    ContinuationStream --> Complete: [DONE]

    StreamingContent --> Complete: [DONE] (no tool)

    ErrorHandling --> Complete: send error event

    Complete --> [*]
```

---

## 3. Artifact Executor Pipeline

```mermaid
flowchart TB
    START[executeArtifactGeneration] --> VALIDATE[validateParams]

    VALIDATE -->|Invalid| FAIL1[Throw ValidationError]
    VALIDATE -->|Valid| PROMPT[Build Type-Specific Prompt]

    subgraph "Prompt Construction"
        PROMPT --> PTYPE{Artifact Type?}
        PTYPE -->|react| REACT_P["Add CRITICAL FORMAT REQUIREMENTS<br/>No HTML document structure"]
        PTYPE -->|html| HTML_P["Standard HTML prompt"]
        PTYPE -->|svg| SVG_P["SVG-specific instructions"]
        PTYPE -->|code| CODE_P["Code snippet prompt"]
        PTYPE -->|mermaid| MERM_P["Mermaid diagram prompt"]
        PTYPE -->|markdown| MD_P["Markdown formatting prompt"]
    end

    REACT_P --> CALL_GLM
    HTML_P --> CALL_GLM
    SVG_P --> CALL_GLM
    CODE_P --> CALL_GLM
    MERM_P --> CALL_GLM
    MD_P --> CALL_GLM

    CALL_GLM[callGLMWithRetryTracking<br/>thinking: true] --> STREAM[Process Stream]

    STREAM --> EXTRACT[Extract code + reasoning]

    subgraph "Post-Processing Pipeline"
        EXTRACT --> STRIP[stripHtmlDocumentStructure<br/>Remove DOCTYPE, html, body tags]
        STRIP --> PREVALIDATE[preValidateAndFixGlmSyntax<br/>Fix 'const * as X' patterns]
        PREVALIDATE --> VALIDATE_CODE[validateArtifactCode<br/>Check imports, reserved keywords]
        VALIDATE_CODE --> AUTOFIX[autoFixArtifactCode<br/>Immutability transforms]
    end

    AUTOFIX --> TOKENS[extractGLMTokenUsage]
    TOKENS --> RESULT[Return ArtifactExecutorResult]

    style FAIL1 fill:#ffcdd2
    style STRIP fill:#fff9c4
    style PREVALIDATE fill:#fff9c4
    style VALIDATE_CODE fill:#fff9c4
    style AUTOFIX fill:#fff9c4
```

---

## 4. Image Executor Pipeline

```mermaid
flowchart TB
    START[executeImageGeneration] --> VALIDATE[validateParams]

    VALIDATE -->|Invalid| FAIL1[Throw ValidationError]
    VALIDATE -->|Valid| MODE{Mode?}

    MODE -->|generate| GEN_MSG[Build generation messages]
    MODE -->|edit| EDIT_MSG[Build edit messages<br/>+ base64 image]

    GEN_MSG --> CALL_API
    EDIT_MSG --> CALL_API

    CALL_API[Fetch OpenRouter API<br/>AbortController: 45s timeout] --> RESPONSE{Response OK?}

    RESPONSE -->|Error| FAIL2[Throw APIError]
    RESPONSE -->|OK| EXTRACT[extractImageFromResponse]

    EXTRACT --> FORMAT{Response Format?}

    FORMAT -->|base64 inline| B64[Extract base64 data]
    FORMAT -->|URL| URL[Fetch and convert to base64]
    FORMAT -->|multi-part| MULTI[Find image part]

    B64 --> STORAGE
    URL --> STORAGE
    MULTI --> STORAGE

    STORAGE[uploadWithRetry<br/>Supabase Storage] --> UPLOAD{Upload Success?}

    UPLOAD -->|Yes| SIGN[Get Signed URL<br/>7-day expiry]
    UPLOAD -->|No| DEGRADE[Degraded Mode<br/>Return base64 directly]

    SIGN --> RESULT[ImageExecutorResult<br/>storageSucceeded: true]
    DEGRADE --> RESULT_DEG[ImageExecutorResult<br/>storageSucceeded: false<br/>degradedMode: true]

    style FAIL1 fill:#ffcdd2
    style FAIL2 fill:#ffcdd2
    style DEGRADE fill:#ffe0b2
```

---

## 5. Tool Rate Limiter Circuit Breaker

```mermaid
stateDiagram-v2
    [*] --> Closed: Initial State

    Closed --> Open: 3 consecutive failures
    Closed --> Closed: success (reset counter)

    Open --> HalfOpen: 30s cooldown elapsed
    Open --> Open: request arrives (REJECT)

    HalfOpen --> Closed: success
    HalfOpen --> Open: failure (reset cooldown)

    note right of Open
        All requests rejected
        Returns 503 + Retry-After
    end note

    note right of HalfOpen
        Allow 1 test request
        Monitor result
    end note

    note right of Closed
        Normal operation
        Track failure count
    end note
```

---

## 6. Search Tool Flow

```mermaid
flowchart TB
    START[executeSearchTool] --> REWRITE{Query Rewrite<br/>Enabled?}

    REWRITE -->|Yes| OPTIMIZE[rewriteSearchQuery<br/>GLM optimization]
    REWRITE -->|No| SEARCH

    OPTIMIZE -->|Success| SEARCH[searchTavilyWithRetryTracking]
    OPTIMIZE -->|Fail| SEARCH

    SEARCH --> TAVILY[Tavily API Call<br/>Exponential backoff]

    TAVILY -->|Success| FORMAT[formatSearchContext]
    TAVILY -->|Fail after retries| FAIL[Return error result]

    FORMAT --> LOG[logTavilyUsage<br/>Cost tracking]
    LOG --> RESULT[ToolExecutionResult<br/>success: true]

    subgraph "Formatted Context"
        FORMAT --> CTX["
        WEB SEARCH RESULTS
        Query: [query]

        Source 1: [title]
        URL: [url]
        [snippet]

        Source 2: ...
        "]
    end

    style FAIL fill:#ffcdd2
    style RESULT fill:#c8e6c9
```

---

## 7. Tool Result Injection Format

```mermaid
flowchart LR
    subgraph "Tool Execution"
        TE[executeTool] --> TER[ToolExecutionResult]
    end

    subgraph "Format for GLM"
        TER --> FMT[formatResultForGLM]
        FMT --> XML["
        <tool_result>
          <tool_call_id>call_xxx</tool_call_id>
          <name>tool_name</name>
          <status>success|error</status>
          <result>
            [formatted content]
          </result>
        </tool_result>
        "]
    end

    subgraph "GLM Continuation"
        XML --> INJECT[Inject into messages]
        INJECT --> CALL[callGLMWithToolResult]
        CALL --> STREAM[Continue streaming]
    end
```

---

## 8. Frontend SSE Event Handling

```mermaid
flowchart TB
    SSE[SSE EventSource] --> PARSE[Parse event data]

    PARSE --> TYPE{Event Type?}

    TYPE -->|reasoning_step| RS[Update reasoning UI<br/>Show step progress]
    TYPE -->|reasoning_status| RST[Update status badge<br/>Show phase]
    TYPE -->|tool_call_start| TCS[Show tool indicator<br/>Loading state]
    TYPE -->|tool_result| TR[Update tool status<br/>Success/failure]

    TYPE -->|artifact_complete| AC[Render artifact<br/>Code preview]
    TYPE -->|image_complete| IC[Display image<br/>Show URL/base64]
    TYPE -->|web_search| WS[Show search results<br/>Source cards]

    TYPE -->|delta.content| DC[Append to message<br/>Streaming text]
    TYPE -->|reasoning_complete| RC[Finalize reasoning<br/>Collapse details]

    TYPE -->|"[DONE]"| DONE[Close stream<br/>Enable input]
    TYPE -->|error| ERR[Show error toast<br/>Retry option]

    subgraph "State Updates"
        RS --> STATE[React State]
        RST --> STATE
        TCS --> STATE
        TR --> STATE
        AC --> STATE
        IC --> STATE
        WS --> STATE
        DC --> STATE
        RC --> STATE
    end

    style ERR fill:#ffcdd2
    style DONE fill:#c8e6c9
```

---

## 9. Validation Layers Deep Dive

```mermaid
flowchart TB
    INPUT[Tool Parameters] --> L1

    subgraph L1["Layer 1: Prompt Injection Defense"]
        L1A[normalizeUnicode<br/>Cyrillic→ASCII] --> L1B
        L1B[detectDangerousPatterns<br/>SYSTEM:, IGNORE ALL] --> L1C
        L1C[validateModeHint<br/>Whitelist: artifact,image,auto]
    end

    L1C --> L2

    subgraph L2["Layer 2: Tool Parameter Validation"]
        L2A["checkPrototypePollution<br/>Block __proto__, constructor"] --> L2B
        L2B["rejectExtraProperties<br/>Only allow known keys"] --> L2C
        L2C["validateTypes<br/>Zod schema validation"] --> L2D
        L2D["enforceLimits<br/>prompt.length ≤ 10000"]
    end

    L2D --> L3

    subgraph L3["Layer 3: Rate Limiting"]
        L3A["checkCircuitBreaker<br/>3 fails → 30s open"] --> L3B
        L3B["checkApiThrottle<br/>Global API limits"] --> L3C
        L3C["checkUserLimit<br/>Per-user quotas"] --> L3D
        L3D["checkToolLimit<br/>Per-tool quotas"]
    end

    L3D --> L4

    subgraph L4["Layer 4: Execution Tracking"]
        L4A["checkMaxToolCalls<br/>Max 3 per request"] --> L4B
        L4B["startTimeout<br/>60s per tool"] --> L4C
        L4C["trackExecution<br/>Record metrics"]
    end

    L4C --> EXEC[Execute Tool]

    L1C -->|Injection| REJ1[❌ 403]
    L2D -->|Invalid| REJ2[❌ 400]
    L3D -->|Limited| REJ3[❌ 429]
    L4C -->|Exhausted| REJ4[❌ 503]

    style REJ1 fill:#f44336,color:#fff
    style REJ2 fill:#ff9800,color:#fff
    style REJ3 fill:#ffc107
    style REJ4 fill:#9e9e9e,color:#fff
    style EXEC fill:#4caf50,color:#fff
```

---

## 10. Error Sanitization Flow

```mermaid
flowchart TB
    ERR[Raw Error] --> CATCH[safe-error-handler]

    CATCH --> CHECK{Error Type?}

    CHECK -->|ToolValidationError| TVE[Extract message<br/>Keep validation details]
    CHECK -->|ToolRateLimitError| TRE[Add Retry-After header<br/>Keep rate info]
    CHECK -->|ResourceExhaustionError| REE[Mask internal limits<br/>Generic message]
    CHECK -->|APIError| API[Remove API keys<br/>Strip URLs]
    CHECK -->|Unknown| UNK[Generic server error]

    TVE --> SANITIZE
    TRE --> SANITIZE
    REE --> SANITIZE
    API --> SANITIZE
    UNK --> SANITIZE

    subgraph SANITIZE["Sanitization Pipeline"]
        S1[Remove stack traces] --> S2
        S2[Strip file paths] --> S3
        S3[Redact API keys<br/>sk-*, Bearer *] --> S4
        S4[Remove PII<br/>emails, tokens] --> S5
        S5[Standardize error code]
    end

    S5 --> OUTPUT[Safe Error Response]

    style ERR fill:#ffcdd2
    style OUTPUT fill:#c8e6c9
```

---

*Deep dive diagrams for the unified tool architecture*
