# System Architecture

## Overview

**Vana** is an AI chat application built with a modern, scalable architecture that combines:
- **Frontend**: React 18.3.1 + TypeScript + Vite + Tailwind + shadcn/ui
- **Backend**: Supabase Edge Functions (Deno runtime)
- **AI Models**: Google Gemini via OpenRouter (1M context window)
- **Real-time**: Server-Sent Events (SSE) for streaming responses

## Model Configuration

All AI operations use Gemini 3 Flash via OpenRouter for unified, high-performance inference:

| Function | Model | Provider | Rationale |
|----------|-------|----------|-----------|
| Title Generation | Gemini 3 Flash | OpenRouter | Fast, 1M context window |
| Conversation Summaries | Gemini 3 Flash | OpenRouter | Fast, 1M context window |
| Search Query Rewriting | Gemini 3 Flash | OpenRouter | Fast query optimization |
| Artifact Generation | Gemini 3 Flash | OpenRouter | Thinking mode with effort levels, structured output |
| Artifact Error Fixing | Gemini 3 Flash | OpenRouter | Deep reasoning for debugging |
| Image Generation | Gemini 2.5 Flash Image | OpenRouter | High-quality image synthesis |
| Chat Fallback | Gemini 2.5 Flash Lite | OpenRouter | Circuit breaker fallback only |

**Context Window**: Gemini 3 Flash provides 1M tokens (5x improvement over previous models).

**Thinking Mode**: Gemini reasoning supports effort levels (minimal, low, medium, high) for adjustable depth.

**Model Constants**: All model names are defined in `supabase/functions/_shared/config.ts` as `MODELS.*` constants. **Never hardcode model names** — this causes CI/CD failures.

## Artifact Generation Architecture

**Philosophy**: Simple, fast artifact generation with vanilla Sandpack rendering.

### Components

**Backend** (`supabase/functions/_shared/`):
- `artifact-tool-v2.ts` — Simple XML parser that extracts artifact code from AI responses (~50 lines)
- `system-prompt-v2.ts` — Minimal artifact generation guidance with package whitelist (~200 lines)

**Frontend** (`src/components/`):
- `SimpleArtifactRenderer.tsx` — Vanilla Sandpack renderer with fixed dependency list (~150 lines)
- `ArtifactErrorBoundary.tsx` — React error boundary for graceful degradation

**Tool Calling** (`chat/handlers/tool-calling-chat.ts`):
- Integrates `generate_artifact` tool with chat system
- No transformations or validation layers
- Raw code passed directly to Sandpack

### Flow

```
User requests artifact
    ↓
Gemini 3 Flash generates code (with thinking mode)
    ↓
artifact-tool-v2.ts extracts code from XML tags
    ↓
Raw code sent to client (no transformations)
    ↓
SimpleArtifactRenderer displays via Sandpack
    ↓
Errors? → Show in Sandpack console + "Ask AI to Fix" button
```

### Package Whitelist

**Sandpack Global**: `react`, `react-dom` (available as window globals)

**Auto-bundled by Sandpack**:
- `recharts` — Charts and data visualization
- `framer-motion` — Animations
- `lucide-react` — Icons
- `@radix-ui/react-*` — UI primitives (Dialog, Tabs, Switch, etc.)

### Required Structure

Every React artifact must use:

```jsx
// Destructure React hooks (MANDATORY)
const { useState, useEffect, useCallback, useMemo } = React;

// Export default App component (MANDATORY)
export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* Component content */}
    </div>
  );
}
```

### Error Handling

**Natural Error Surfacing**:
- Sandpack shows compilation/runtime errors in console
- No server-side validation or transformation
- Errors surface immediately with line numbers

**"Ask AI to Fix" Recovery**:
1. User clicks "Ask AI to Fix" button
2. Error message + code sent to Gemini 3 Flash
3. AI generates corrected code
4. Re-render with fix

### Key Constraints

**Import Restrictions**:
- ❌ Local `@/` imports never work (sandbox isolation)
- ✅ Use npm packages from whitelist

**State Management**:
- Must use immutable patterns (spread operator, map, filter)
- Direct array mutations crash in React strict mode

## Edge Function Decision Tree

Route requests to the appropriate Edge Function based on the scenario:

| Scenario | Function | Model Used |
|----------|----------|------------|
| User sends chat message | `chat/` | Gemini 3 Flash (w/ Flash Lite fallback) |
| User requests artifact | Tool-calling via `chat/` → `generate_artifact` | Gemini 3 Flash |
| First message in session | `generate-title/` | Gemini 3 Flash |
| User requests image | Tool-calling via `chat/` → `generate_image` | Gemini Flash Image |
| Conversation exceeds context | `summarize-conversation/` | Gemini 3 Flash |
| Web search query rewrite | `query-rewriter` (shared) | Gemini 3 Flash |
| Health/uptime monitoring | `health/` | N/A (status check) |

## Unified LLM Client Architecture

**Location**: `supabase/functions/_shared/gemini-client.ts`

The Gemini 3 Flash migration (January 2026) consolidated all LLM operations into a single, unified client.

### Unified Client Design

**Replaced Components**:
- `glm-client.ts` — Removed (GLM/Kimi support)
- `glm-chat-router.ts` — Removed (routing logic)
- `reasoning-provider.ts` — Removed (separate status generation)

**Current Architecture**:
```
gemini-client.ts
    ├─ callGemini() — Core API call function
    ├─ callGeminiWithRetry() — Exponential backoff wrapper
    ├─ callGeminiWithToolResult() — Tool continuation flow
    ├─ generateArtifact() — Artifact generation with thinking mode
    ├─ generateTitle() — Fast title generation
    ├─ generateSummary() — Conversation summaries
    ├─ rewriteQuery() — Search query optimization
    ├─ processGeminiStream() — Async generator for SSE streams
    └─ Extraction helpers (extractText, extractToolCalls, extractReasoning)
```

### Key Features

**Thinking Mode** (Gemini 3 Flash):
- Configurable effort levels: `minimal`, `low`, `medium`, `high`
- Default: `medium` for artifacts, disabled for fast tasks
- Built-in reasoning via `reasoning.effort` parameter

**Tool Calling**:
- Full OpenAI-compatible function calling
- Automatic thought signature preservation for extended thinking
- Tool continuation via `callGeminiWithToolResult()`

**Retry Logic**:
- Exponential backoff for 429 (rate limit) and 503 (overload)
- Configurable via `RETRY_CONFIG` in `config.ts`
- Automatic response body draining to prevent resource leaks

### Migration Notes (January 2026)

**Breaking Changes**:
- `ReasoningProvider` completely removed
- `USE_REASONING_PROVIDER` environment variable deprecated
- All LLM operations now use OpenRouter + Gemini

**Why this change**:
- Gemini 3 Flash provides built-in reasoning with effort levels
- No need for separate status generation system
- Simplified architecture: one client for all operations
- 5x context window improvement (1M tokens vs 200K)

**Legacy Code Notes**:
Some source files contain GLM/Kimi references in comments (e.g., "GLM syntax fixes"). These are historical documentation explaining why certain code patterns exist (e.g., handling malformed import syntax). The actual GLM integration has been removed.

## Smart Context Management

Token-aware context windowing system that optimizes conversation history for AI models:

**Components** (`_shared/`):
- `context-selector.ts` — Main orchestrator for context selection
- `context-ranker.ts` — Scores messages by importance/recency
- `token-counter.ts` — Accurate token counting for context budgets

**Features**:
- Dynamic context window sizing based on model limits
- Message importance ranking (recent > artifact-related > conversational)
- Graceful degradation when context exceeds budget
- Guest session support for artifact bundling

## Input Normalization & Security Layers

The system implements defense-in-depth for input handling with clear separation of concerns:

### Normalization vs. Sanitization

| Function | Purpose | Location | When Used |
|----------|---------|----------|-----------|
| `normalizePromptForApi()` | Text normalization for API transmission | tool-validator.ts, validators.ts | Before sending prompts to AI models |
| `sanitizeContent()` | HTML entity encoding for display | validators.ts | Before rendering in HTML contexts |

### normalizePromptForApi()

**Purpose**: Normalize user input for consistent API processing WITHOUT modifying visible content.

**Transformations**:
- Standardizes line endings (CRLF/CR → LF)
- Removes ASCII control characters (keeps TAB and LF)
- Removes zero-width Unicode (U+200B-U+200F, U+2028-U+202F, U+FEFF)
- Preserves all visible characters including `/`, `<`, `>`, quotes

**Critical**: Does NOT HTML-encode forward slashes, which allows npm paths like `@radix-ui/react-select` to pass through uncorrupted.

**Location**: `supabase/functions/_shared/tool-validator.ts` (exported), `supabase/functions/_shared/validators.ts`

### Security Layer Stack

```
┌─────────────────────────────────────────┐
│ Layer 4: Iframe Sandbox                 │ ← XSS containment in artifacts
├─────────────────────────────────────────┤
│ Layer 3: artifact-validator             │ ← Code pattern validation
├─────────────────────────────────────────┤
│ Layer 2: PromptInjectionDefense         │ ← Prompt manipulation detection
├─────────────────────────────────────────┤
│ Layer 1: normalizePromptForApi()        │ ← Input text normalization
├─────────────────────────────────────────┤
│ Layer 0: sanitizeContent() (display)    │ ← HTML encoding for chat display
└─────────────────────────────────────────┘
```

Each layer has a single responsibility—no layer attempts to handle all security concerns.
