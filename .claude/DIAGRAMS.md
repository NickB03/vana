<!-- DIAGRAMS.md | Architecture Visualization Guide | Last updated: 2025-12-29 -->

# Architecture Diagrams

This document contains comprehensive Mermaid diagrams visualizing the Vana chat application architecture. These diagrams reflect the current architecture after the December 2024 refactoring that introduced `normalizePromptForApi()` and `normalizeDefaultExportToApp()` — two critical normalization layers that standardize inputs before processing and ensure consistent artifact code generation.

## Overview

The architecture is organized into five key visualization layers:

1. **Input Processing Pipeline** — User message handling through normalization and validation
2. **Output Processing & Display** — Response routing to artifact vs. chat display
3. **Export Transformation Patterns** — The 9 export patterns handled by `normalizeDefaultExportToApp()`
4. **Security Layer Stack** — Defense-in-depth from input to runtime
5. **Artifact Bundling Pipeline** — ESM module bundling with import maps

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
        A1["artifact-validator"]
        A2["normalizeDefaultExportToApp()"]
        A3["9 Export Patterns"]
        A4["Iframe Sandbox"]
        A5["Client-Side Transpile<br/>(Sucrase)"]
    end

    subgraph ChatPath["Chat Display Path"]
        C1["sanitizeContent()"]
        C2["HTML Entity Encoding"]
        C3["ReactMarkdown Render"]
    end

    R -->|type=artifact| A1
    R -->|type=chat| C1

    A1 --> A2 --> A3 --> A5 --> A4
    C1 --> C2 --> C3

    style A1 fill:#e8f5e9
    style A2 fill:#c8e6c9
    style C1 fill:#fce4ec
    style A4 fill:#81c784
```

### Path Descriptions

**Artifact Path** (Green):
1. Validate artifact structure and code safety
2. Transform default exports to standardized form
3. Handle 9 different export patterns
4. Transpile with Sucrase (20x faster than Babel)
5. Execute in isolated iframe sandbox

**Chat Path** (Pink):
1. Sanitize HTML entities
2. Encode special characters
3. Render with ReactMarkdown for formatting

---

## 3. Export Transformation Patterns

This diagram shows all 9 export patterns that `normalizeDefaultExportToApp()` handles, transforming them into a consistent format.

```mermaid
flowchart LR
    subgraph Input["AI Generated Export Patterns"]
        I1["export default function App()"]
        I2["export default function Calc()"]
        I3["export default function()"]
        I4["function App()\nexport default App"]
        I5["const X = ()=&gt;{}\nexport default X"]
        I6["export { X as default }"]
        I7["export default () =&gt; ..."]
        I8["export default memo(App)"]
        I9["export default class..."]
    end

    subgraph Transform["normalizeDefaultExportToApp()"]
        T["Regex Pattern Matching<br/>+ AST Inspection"]
    end

    subgraph Output["Standardized Output"]
        O1["function App()"]
        O2["function App()"]
        O3["function App()"]
        O4["function App()"]
        O5["const X...\nconst App = X"]
        O6["const App = X"]
        O7["const App = () =&gt; ..."]
        O8["const App = ..."]
        O9["const App = class..."]
    end

    I1 --> T
    I2 --> T
    I3 --> T
    I4 --> T
    I5 --> T
    I6 --> T
    I7 --> T
    I8 --> T
    I9 --> T

    T --> O1
    T --> O2
    T --> O3
    T --> O4
    T --> O5
    T --> O6
    T --> O7
    T --> O8
    T --> O9

    style I1 fill:#e3f2fd
    style I2 fill:#e3f2fd
    style I3 fill:#e3f2fd
    style I4 fill:#e3f2fd
    style I5 fill:#e3f2fd
    style I6 fill:#e3f2fd
    style I7 fill:#e3f2fd
    style I8 fill:#e3f2fd
    style I9 fill:#e3f2fd
    style T fill:#fff9c4
    style O1 fill:#c8e6c9
    style O2 fill:#c8e6c9
    style O3 fill:#c8e6c9
    style O4 fill:#c8e6c9
    style O5 fill:#c8e6c9
    style O6 fill:#c8e6c9
    style O7 fill:#c8e6c9
    style O8 fill:#c8e6c9
    style O9 fill:#c8e6c9
```

### Pattern Details

The function normalizes these patterns:

1. **Named function declaration**: `export default function App()` → `function App()`
2. **Different function name**: `export default function Calc()` → `function App()`
3. **Anonymous function**: `export default function()` → `function App()`
4. **Separate declaration**: `function App() ... export default App` → `function App()`
5. **Arrow function variable**: `const X = () => {} ... export default X` → `const App = X`
6. **Named export as default**: `export { X as default }` → `const App = X`
7. **Inline arrow**: `export default () => ...` → `const App = () => ...`
8. **HOC wrapped**: `export default memo(App)` → `const App = memo(...)`
9. **Class component**: `export default class ...` → `const App = class ...`

All patterns ensure the final code has a consistent entry point: either `function App()` or `const App = ...`

---

## 4. Security Layer Stack

This diagram visualizes the defense-in-depth security architecture, with 5 layers from input sanitization through runtime containment.

```mermaid
flowchart TB
    subgraph L4["Layer 4: Runtime Containment"]
        L4a["Iframe Sandbox"]
        L4b["Restrictions:"]
        L4c["allow-scripts only"]
        L4d["Isolates DOM/Storage"]
    end

    subgraph L3["Layer 3: Code Validation"]
        L3a["artifact-validator"]
        L3b["Syntax Validation"]
        L3c["Pattern Detection"]
        L3d["Auto-Fix Engine"]
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

    L4 --> L3 --> L2 --> L1 --> L0

    style L4 fill:#ffcdd2
    style L3 fill:#fff9c4
    style L2 fill:#fff3e0
    style L1 fill:#e1f5fe
    style L0 fill:#f3e5f5
```

### Layer Details

- **Layer 0 (Sanitization)**: For chat display only. HTML entity encoding prevents XSS in rendered markdown.
- **Layer 1 (Normalization)**: First touchpoint for user input. Removes invisible characters that could hide malicious code.
- **Layer 2 (Prompt Defense)**: Detects injection patterns before they reach the model. Homoglyph detection prevents unicode-based evasion.
- **Layer 3 (Code Validation)**: Inspects generated artifact code for dangerous patterns. Auto-fix attempts safe corrections.
- **Layer 4 (Runtime)**: Ultimate containment. Iframe sandbox prevents network access, storage access, and other dangerous APIs.

---

## 5. Artifact Bundling Pipeline

This sequence diagram shows the complete flow of artifact bundling from client request through ESM module resolution and final HTML generation.

```mermaid
sequenceDiagram
    participant Client
    participant bundle-artifact as bundle-artifact<br/>Edge Function
    participant esm as esbuild
    participant CDN as esm.sh CDN

    Client->>bundle-artifact: POST {code, dependencies}

    Note over bundle-artifact: Initialize Bundle
    bundle-artifact->>bundle-artifact: Parse dependency list

    Note over bundle-artifact: Skip List Filtering
    bundle-artifact->>bundle-artifact: Skip: react
    bundle-artifact->>bundle-artifact: Skip: react-dom
    bundle-artifact->>bundle-artifact: Skip: lucide-react
    bundle-artifact->>bundle-artifact: Skip: framer-motion (UMD)

    Note over bundle-artifact: Code Transformation
    bundle-artifact->>bundle-artifact: normalizeDefaultExportToApp()
    bundle-artifact->>bundle-artifact: Wrap for bundler

    loop Each Remaining Dependency
        bundle-artifact->>CDN: Fetch ESM module
        CDN-->>bundle-artifact: Module code + metadata
    end

    Note over bundle-artifact: Bundling Phase
    bundle-artifact->>esm: Bundle code with externals
    esm-->>bundle-artifact: Bundled output

    Note over bundle-artifact: Generate Import Map
    bundle-artifact->>bundle-artifact: Create UMD shims
    bundle-artifact->>bundle-artifact: framer-motion polyfill
    bundle-artifact->>bundle-artifact: Generate import-map.json

    Note over bundle-artifact: Final Assembly
    bundle-artifact->>bundle-artifact: Create HTML template
    bundle-artifact->>bundle-artifact: Inject import-map
    bundle-artifact->>bundle-artifact: Inject bundled code

    bundle-artifact-->>Client: {html, importMap, bundledCode}
```

### Pipeline Stages

1. **Request Reception**: Client sends code and list of dependencies
2. **Skip List Filtering**: Remove standard library packages
   - `react`, `react-dom` (provided by runtime)
   - `lucide-react` (icon package)
   - `framer-motion` (UMD-only fallback)
3. **Code Transformation**: Apply `normalizeDefaultExportToApp()`
4. **Dependency Resolution**: Fetch ESM modules from esm.sh CDN
5. **Bundling**: esbuild combines code with external dependencies
6. **Import Map Generation**: Create UMD shims for incompatible packages
7. **HTML Assembly**: Generate final executable HTML

### Key Design Points

- **esm.sh CDN**: Provides ESM versions of npm packages
- **Import Map**: Enables module aliasing and polyfilling
- **UMD Shims**: Converts CommonJS modules to ESM compatibility
- **Skip List**: Prevents double-bundling of base libraries

---

## Related Documentation

- [ARTIFACT_SYSTEM.md](./ARTIFACT_SYSTEM.md) — Detailed artifact system architecture
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Complete system design and components
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — Data model and RPC functions
- [COMMON_PATTERNS.md](./COMMON_PATTERNS.md) — Development recipes

---

## Diagram Usage Notes

These diagrams can be rendered in:

- GitHub Markdown (native Mermaid support)
- [mermaid.live](https://mermaid.live) for interactive editing
- Local Mermaid CLI: `npm install -g @mermaid-js/mermaid-cli && mmdc -i diagram.md -o output.html`
- Obsidian, Notion, and other tools with Mermaid support

For best results on GitHub, view this file directly in the repository.
