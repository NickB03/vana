<!-- DIAGRAMS.md | Architecture Visualization Guide | Last updated: 2026-01-18 -->

# Architecture Diagrams

This document contains comprehensive Mermaid diagrams visualizing the Vana chat application architecture. These diagrams reflect the current architecture using vanilla Sandpack for artifact rendering — a zero-config approach where AI-generated code is passed directly to Sandpack with natural error surfacing.

## Overview

The architecture is organized into four key visualization layers:

1. **Input Processing Pipeline** — User message handling through normalization and validation
2. **Output Processing & Display** — Response routing to artifact vs. chat display
3. **Security Layer Stack** — Defense-in-depth from input to runtime
4. **Artifact Rendering Flow** — Vanilla Sandpack rendering with error recovery

---

## 1. Input Processing Pipeline

This diagram shows the complete flow from user input through three normalization/validation layers before reaching the AI API.

```mermaid
flowchart TB
    subgraph Input["User Input"]
        UI[User Message/Prompt]
    end

    subgraph Normalization["Layer 1: Input Normalization"]
        N1[normalizePromptForApi]
        N1a["CRLF → LF"]
        N1b["Remove Control Chars"]
        N1c["Strip Zero-Width Unicode"]
        N1d["Preserve: / &lt; &gt; quotes"]
    end

    subgraph Security["Layer 2: Security Defense"]
        S1[PromptInjectionDefense]
        S1a["Unicode Normalization NFKC"]
        S1b["Dangerous Pattern Detection"]
        S1c["Mode Hint Validation"]
    end

    subgraph Validation["Layer 3: Tool Validation"]
        V1[ToolParameterValidator]
        V1a["Schema Validation"]
        V1b["Length Limits"]
        V1c["Object Freezing"]
    end

    subgraph API["AI API"]
        AIAPI["Gemini 3 Flash Model"]
    end

    UI --> N1
    N1 --> N1a --> N1b --> N1c --> N1d
    N1d --> S1
    S1 --> S1a --> S1b --> S1c
    S1c --> V1
    V1 --> V1a --> V1b --> V1c
    V1c --> AIAPI

    style N1 fill:#e1f5fe
    style S1 fill:#fff3e0
    style V1 fill:#e8f5e9
    style AIAPI fill:#c8e6c9
```

### Flow Description

- **User Input**: Raw message from chat interface
- **Layer 1 (Normalization)**: `normalizePromptForApi()` standardizes text format
  - Converts CRLF line endings to LF
  - Removes control characters (0x00-0x1F, 0x7F-0x9F)
  - Strips zero-width Unicode (ZWSP, ZWNJ, ZWJ)
  - Preserves important characters: `/`, `<`, `>`, quotes
- **Layer 2 (Security)**: `PromptInjectionDefense` detects malicious patterns
  - NFKC Unicode normalization
  - Homoglyph and instruction injection detection
  - Mode hint validation
- **Layer 3 (Validation)**: Tool parameter validation
  - JSON schema validation
  - Length limit enforcement
  - Object immutability (Object.freeze)
- **API**: Cleaned input sent to Gemini 3 Flash

---

## 2. Output Processing & Display

This diagram shows how AI responses branch into two distinct paths: artifact rendering or chat display.

```mermaid
flowchart TB
    subgraph AIRESP["AI Response"]
        R["Model Output<br/>(with type field)"]
    end

    subgraph ArtifactPath["Artifact Path"]
        A1["Extract Artifact Code"]
        A2["Pass to Sandpack"]
        A3["Sandpack Runtime"]
        A4["Iframe Sandbox"]
    end

    subgraph ChatPath["Chat Display Path"]
        C1["sanitizeContent()"]
        C2["HTML Entity Encoding"]
        C3["ReactMarkdown Render"]
    end

    R -->|type=artifact| A1
    R -->|type=chat| C1

    A1 --> A2 --> A3 --> A4
    C1 --> C2 --> C3

    style A1 fill:#e8f5e9
    style A2 fill:#c8e6c9
    style A3 fill:#81c784
    style C1 fill:#fce4ec
    style A4 fill:#81c784
```

### Path Descriptions

**Artifact Path** (Green):
1. Extract artifact code from AI response
2. Pass code directly to Sandpack (no transformations)
3. Sandpack handles transpilation and bundling internally
4. Execute in isolated iframe sandbox with natural error display

**Chat Path** (Pink):
1. Sanitize HTML entities
2. Encode special characters
3. Render with ReactMarkdown for formatting

---

## 3. Security Layer Stack

This diagram visualizes the defense-in-depth security architecture, with 4 layers from input sanitization through runtime containment.

```mermaid
flowchart TB
    subgraph L3["Layer 3: Runtime Containment"]
        L3a["Sandpack Iframe Sandbox"]
        L3b["Restrictions:"]
        L3c["allow-scripts only"]
        L3d["Isolates DOM/Storage"]
    end

    subgraph L2["Layer 2: Prompt Defense"]
        L2a["PromptInjectionDefense"]
        L2b["Homoglyph Detection"]
        L2c["Instruction Injection Block"]
        L2d["Unicode Normalization"]
    end

    subgraph L1["Layer 1: Input Normalization"]
        L1a["normalizePromptForApi()"]
        L1b["Text Standardization"]
        L1c["Control Char Removal"]
        L1d["Preserves Visible Chars"]
    end

    subgraph L0["Layer 0: Display Sanitization"]
        L0a["sanitizeContent()"]
        L0b["HTML Entity Encoding"]
        L0c["Markdown-Safe Output"]
    end

    L3 --> L2 --> L1 --> L0

    style L3 fill:#ffcdd2
    style L2 fill:#fff3e0
    style L1 fill:#e1f5fe
    style L0 fill:#f3e5f5
```

### Layer Details

- **Layer 0 (Sanitization)**: For chat display only. HTML entity encoding prevents XSS in rendered markdown.
- **Layer 1 (Normalization)**: First touchpoint for user input. Removes invisible characters that could hide malicious code.
- **Layer 2 (Prompt Defense)**: Detects injection patterns before they reach the model. Homoglyph detection prevents unicode-based evasion.
- **Layer 3 (Runtime)**: Ultimate containment. Sandpack iframe sandbox prevents network access, storage access, and other dangerous APIs. Errors are surfaced naturally in the Sandpack console.

---

## 4. Artifact Rendering Flow

This sequence diagram shows the vanilla Sandpack artifact rendering flow, including error handling and the "Ask AI to Fix" recovery pattern.

```mermaid
sequenceDiagram
    participant AI as Gemini 3 Flash
    participant Client as React App
    participant Sandpack as Sandpack Runtime
    participant User

    AI->>Client: Generate artifact code

    Note over Client: Extract artifact from response
    Client->>Sandpack: Pass code directly (no transformations)

    Note over Sandpack: Internal Processing
    Sandpack->>Sandpack: Transpile TypeScript/JSX
    Sandpack->>Sandpack: Bundle dependencies
    Sandpack->>Sandpack: Execute in iframe sandbox

    alt Code executes successfully
        Sandpack->>Client: Render component
        Client->>User: Display artifact
    else Error occurs
        Sandpack->>Client: Surface error in console
        Client->>User: Show error + "Ask AI to Fix" button
        User->>Client: Click "Ask AI to Fix"
        Client->>AI: Send error context for repair
        AI->>Client: Generate fixed code
        Client->>Sandpack: Pass corrected code
    end
```

### Flow Stages

1. **Code Generation**: Gemini 3 Flash generates React/TypeScript artifact code
2. **Direct Pass-through**: Code is passed to Sandpack without any transformations
3. **Sandpack Processing**: Internal transpilation and bundling (zero-config)
4. **Execution**: Component runs in isolated iframe sandbox
5. **Error Recovery**: Natural error surfacing with "Ask AI to Fix" button

### Key Design Points

- **Zero Transformations**: No client-side code manipulation or normalization
- **Sandpack Handles Everything**: Transpilation, bundling, and execution managed internally
- **Natural Error Display**: Errors appear in Sandpack's built-in console
- **AI-Assisted Recovery**: "Ask AI to Fix" button sends error context back to the model
- **Package Support**: React, Recharts, Framer Motion, Lucide, Radix UI (via Sandpack's npm integration)

---

## Related Documentation

- [ARTIFACT_SYSTEM.md](./ARTIFACT_SYSTEM.md) — Detailed artifact system architecture
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Complete system design and components
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — Data model and RPC functions
- [DEVELOPMENT_PATTERNS.md](./DEVELOPMENT_PATTERNS.md) — Development recipes

---

## Diagram Usage Notes

These diagrams can be rendered in:

- GitHub Markdown (native Mermaid support)
- [mermaid.live](https://mermaid.live) for interactive editing
- Local Mermaid CLI: `npm install -g @mermaid-js/mermaid-cli && mmdc -i diagram.md -o output.html`
- Obsidian, Notion, and other tools with Mermaid support

For best results on GitHub, view this file directly in the repository.
