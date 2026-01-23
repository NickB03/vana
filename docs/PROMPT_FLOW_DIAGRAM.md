# Prompt Flow Diagram

**Visual representation of complete instruction flow from user input to AI response**

---

## 🔄 COMPLETE FLOW (Mermaid Diagram)

```mermaid
graph TD
    A[👤 User Input<br/>Carousel: Build a React game...] --> B[🔐 Chat Endpoint<br/>Validation & Rate Limiting]

    B --> C{Artifact<br/>Editing?}
    C -->|Yes| D1[📝 Build Artifact Context<br/>Current artifact details]
    C -->|No| D2[Skip artifact context]
    D1 --> E
    D2 --> E

    E[🏗️ System Prompt Construction<br/>system-prompt-inline.ts] --> E1[Base Prompt 286 lines]
    E1 --> E2{Tool Calling<br/>Enabled?}

    E2 -->|Yes| E3[⚡ CRITICAL RULE #1<br/>3-5 sentences MANDATORY]
    E2 -->|No| F
    E3 --> E4[Tool Definitions]
    E4 --> E5[Execution Sequence]
    E5 --> E6[Example Transformation]
    E6 --> E7[Failure Modes]
    E7 --> F

    F{Additional<br/>Context?} -->|Search| F1[+ Search Results]
    F -->|URL Extract| F2[+ URL Content]
    F -->|None| G
    F1 --> G
    F2 --> G

    G[📤 First Gemini Call] --> G1[System: FULL PROMPT<br/>User: Build game...]
    G1 --> G2[Tools: artifact, image, search]
    G2 --> H{Gemini<br/>Decision}

    H -->|Text Only| Z[💬 Direct Response<br/>No tool used]
    H -->|Tool Call| I[🔧 Tool Call Detected<br/>generate_artifact]

    I --> J[⚙️ Tool Execution<br/>artifact-generator-structured.ts]
    J --> J1[Generate via JSON Schema]
    J1 --> J2[Validate with Zod]
    J2 --> J3[Send to Client via SSE]
    J3 --> K

    K[📊 Tool Result Formatting<br/>tool-executor.ts] --> K1{Format<br/>Type?}

    K1 -->|Artifact| K2[✅ Artifact created<br/>YOU MUST RESPOND<br/>following RULE #1]
    K1 -->|Image| K3[✅ Image created<br/>YOU MUST RESPOND<br/>following RULE #1]
    K1 -->|Search| K4[Search results...]

    K2 --> L
    K3 --> L
    K4 --> L

    L[🔄 Continuation Call] --> L1[System: SAME PROMPT<br/>User: Build game...<br/>Assistant: tool_calls<br/>Tool: RESULT]
    L1 --> M[🤖 Final Gemini Response]

    M --> N{Has<br/>Explanation?}

    N -->|Yes ✅| O[I've created a game...<br/>3-5 sentences]
    N -->|No ❌| P[SILENT<br/>Indicates conflict]

    O --> Q[✅ Client Receives<br/>Artifact + Explanation]
    P --> R[❌ Client Receives<br/>Only Artifact marker]

    Q --> S[😊 Good UX]
    R --> T[😞 Bad UX]

    Z --> S

    style E3 fill:#f96,stroke:#333,stroke-width:4px
    style K2 fill:#9f6,stroke:#333,stroke-width:4px
    style K3 fill:#9f6,stroke:#333,stroke-width:4px
    style O fill:#6f9,stroke:#333,stroke-width:2px
    style P fill:#f66,stroke:#333,stroke-width:2px
    style S fill:#6f9,stroke:#333,stroke-width:2px
    style T fill:#f66,stroke:#333,stroke-width:2px
```

---

## 🎯 CONFLICT POINTS VISUALIZATION

```mermaid
graph LR
    A[System Prompt<br/>RULE #1:<br/>3-5 sentences] --> B{Alignment<br/>Check}

    C[Tool Result<br/>BEFORE:<br/>2-3 sentences] -.->|❌ CONFLICT| B
    D[Tool Result<br/>AFTER:<br/>Follow RULE #1] -.->|✅ ALIGNED| B

    B -->|Conflicting| E[Gemini Confused<br/>Ignores both]
    B -->|Aligned| F[Gemini Executes<br/>Follows RULE #1]

    E --> G[❌ No Explanation]
    F --> H[✅ 3-5 Sentence<br/>Explanation]

    style C fill:#f66,stroke:#333,stroke-width:2px
    style D fill:#6f9,stroke:#333,stroke-width:2px
    style E fill:#f96,stroke:#333,stroke-width:2px
    style F fill:#9f6,stroke:#333,stroke-width:2px
    style G fill:#f66,stroke:#333,stroke-width:4px
    style H fill:#6f9,stroke:#333,stroke-width:4px
```

---

## 🏗️ SYSTEM PROMPT STRUCTURE

```mermaid
graph TD
    A[getSystemInstruction] --> B{Options}

    B --> C[Base Prompt<br/>~286 lines]
    C --> C1[Identity: Vana AI]
    C1 --> C2[Artifact Types]
    C2 --> C3[Package Whitelist]
    C3 --> C4[Critical Rules]
    C4 --> C5[Best Practices]
    C5 --> C6[Common Pitfalls]

    B -->|useToolCalling=true| D[Tool Calling Block<br/>~54 lines]
    D --> D1[Tool Definitions]
    D1 --> D2[⚡ CRITICAL RULE #1]
    D2 --> D3[Execution Sequence]
    D3 --> D4[Template Structure]
    D4 --> D5[Example Transform]
    D5 --> D6[Failure Modes]

    B -->|fullArtifactContext| E[Artifact Context<br/>variable]
    E --> E1[Current Artifact]
    E1 --> E2[Type, Title, Code]
    E2 --> E3[Editing Guidance]

    B -->|matchedTemplate| F[Template Guidance<br/>variable]
    F --> F1[Currently Stubbed<br/>Always empty]

    C6 --> G[Combined Prompt]
    D6 --> G
    E3 --> G
    F1 --> G

    G --> H[Append Search Context<br/>if provided]
    H --> I[Append URL Context<br/>if provided]
    I --> J[Final System Prompt<br/>Sent to Gemini]

    style D2 fill:#f96,stroke:#333,stroke-width:4px
    style J fill:#9f6,stroke:#333,stroke-width:2px
```

---

## 📊 INSTRUCTION INJECTION HIERARCHY

```mermaid
graph TD
    A[System Prompt<br/>POLICY LAYER] --> B[Primary Behavior Rules]
    B --> B1[CRITICAL RULE #1:<br/>Always explain artifacts]
    B1 --> B2[Format: 3-5 sentences]
    B2 --> B3[Template: I've created...]
    B3 --> B4[Content: Features + Usage]

    C[Tool Result<br/>TRIGGER LAYER] --> D[Execution Triggers]
    D --> D1[✅ Tool completed]
    D1 --> D2[YOU MUST RESPOND]
    D2 --> D3[Following RULE #1<br/>↑ References Policy]

    E[Context Data<br/>INFORMATION LAYER] --> F[Supporting Data]
    F --> F1[Search Results]
    F1 --> F2[URL Content]
    F2 --> F3[Artifact Context]

    B4 --> G[Gemini Processing]
    D3 --> G
    F3 --> G

    G --> H{Aligned<br/>Instructions?}
    H -->|Yes ✅| I[Execute Policy]
    H -->|No ❌| J[Confused/Skip]

    I --> K[3-5 Sentence<br/>Explanation]
    J --> L[No Response<br/>or Partial]

    style A fill:#6f9,stroke:#333,stroke-width:4px
    style C fill:#9f6,stroke:#333,stroke-width:4px
    style E fill:#9cf,stroke:#333,stroke-width:2px
    style I fill:#6f9,stroke:#333,stroke-width:2px
    style J fill:#f66,stroke:#333,stroke-width:2px
```

---

## 🔧 TOOL EXECUTION FLOW

```mermaid
sequenceDiagram
    participant U as User
    participant C as Chat Endpoint
    participant G1 as Gemini (1st call)
    participant T as Tool Executor
    participant A as Artifact Generator
    participant G2 as Gemini (continuation)
    participant CL as Client

    U->>C: "Build a React game..."
    C->>C: Build system prompt<br/>(+ CRITICAL RULE #1)
    C->>G1: System + User message<br/>+ Tools
    G1->>G1: Decide to use tool
    G1-->>C: tool_call: generate_artifact
    C->>T: Execute tool
    T->>A: Generate artifact code
    A-->>T: Code + validation
    T->>CL: SSE: artifact_complete
    T-->>C: Tool result:<br/>"YOU MUST RESPOND<br/>following RULE #1"

    Note over C,G2: Continuation with tool result

    C->>G2: System (SAME)<br/>+ User<br/>+ Assistant (tool_calls)<br/>+ Tool (result)

    alt Aligned Instructions
        G2->>G2: Read RULE #1<br/>Read tool result<br/>Both say "explain"
        G2-->>C: "I've created a game...<br/>3-5 sentences"
        C->>CL: SSE: content_chunks
        CL->>CL: Show explanation ✅
    else Conflicting Instructions
        G2->>G2: RULE #1: 3-5 sentences<br/>Tool: 2-3 sentences<br/>CONFLICT!
        G2-->>C: [silence]
        C->>CL: [no explanation]
        CL->>CL: Only artifact marker ❌
    end
```

---

## 📝 KEY TAKEAWAYS

### Visualization Insights

1. **Three-Layer Architecture**
   - **Policy Layer** (System Prompt): Defines WHAT and HOW
   - **Trigger Layer** (Tool Results): Signals WHEN to execute policy
   - **Information Layer** (Context Data): Provides WHAT to explain

2. **Critical Alignment Points**
   - System Prompt ← **MUST ALIGN** → Tool Results
   - Both must reference same requirements
   - Conflicts cause complete failure, not partial compliance

3. **Flow Bottleneck**
   - Step 7 (Tool Result Formatting) was the failure point
   - Fixed by aligning tool results with system prompt
   - Now both layers reinforce same requirement

### Testing Focus Areas

Based on flow diagram, test these critical paths:

1. **Path A**: User input → First Gemini call → Direct response (no tools)
   - Expected: Works normally (not affected by tool changes)

2. **Path B**: User input → Tool call → Tool execution → Continuation → Explanation
   - Expected: **95%+ compliance** with aligned instructions

3. **Path C**: User input with artifact editing context → Tool call → Explanation
   - Expected: Explanation mentions edits/improvements

---

**Diagrams created**: 2026-01-20
**Purpose**: Visual audit of prompt flow and conflict identification
**Status**: ✅ All conflicts identified and resolved
