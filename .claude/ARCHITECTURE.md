# System Architecture

## Overview

**Vana** is an AI chat application built with a modern, scalable architecture that combines:
- **Frontend**: React 18.3.1 + TypeScript + Vite + Tailwind + shadcn/ui
- **Backend**: Supabase Edge Functions (Deno runtime)
- **AI Models**: Multi-provider strategy via OpenRouter and Z.ai
- **Real-time**: Server-Sent Events (SSE) for streaming responses

## Model Configuration

All AI operations use the multi-model orchestration system for optimal cost/performance balance:

| Function | Model | Provider | Rationale |
|----------|-------|----------|-----------|
| Title Generation | GLM-4.5-Air | Z.ai API | Fast, thinking disabled |
| Conversation Summaries | GLM-4.5-Air | Z.ai API | Fast, thinking disabled |
| Search Query Rewriting | GLM-4.5-Air | Z.ai API | Fast query optimization |
| Artifact Generation | GLM-4.7 | Z.ai API | Thinking mode, structured output |
| Artifact Error Fixing | GLM-4.7 | Z.ai API | Deep reasoning for debugging |
| Image Generation | Gemini 2.5 Flash Image | OpenRouter | High-quality image synthesis |
| Chat Fallback | Gemini 2.5 Flash Lite | OpenRouter | Circuit breaker fallback only |

**Model Constants**: All model names are defined in `supabase/functions/_shared/config.ts` as `MODELS.*` constants. **Never hardcode model names** — this causes CI/CD failures.

## Artifact Generation Architecture

### Artifact Rules Module System

**Location**: `supabase/functions/_shared/artifact-rules/`

The artifact generation system uses a modular architecture with separation of concerns across multiple specialized modules:

#### Module Structure

```
artifact-rules/
├── index.ts                  # Barrel export (single entry point)
├── core-restrictions.ts      # Hard constraints and banned patterns
├── template-matcher.ts       # Template selection via confidence scoring
├── design-tokens.ts          # Design system tokens and anti-patterns
├── canonical-examples.ts     # Full working examples for AI to copy
├── mandatory-patterns.ts     # Required React boilerplate patterns
└── golden-patterns.ts        # Best practice recommendations
```

**Design Philosophy**:
- **Prescriptive over restrictive**: Show exact patterns to copy instead of listing violations
- **Template-first generation**: Match user intent to proven examples
- **Separation of concerns**: Each module has a single responsibility
- **Structured failures**: Return rich error context instead of silent failures

#### Template Matching Pipeline

**Purpose**: Intelligently match user requests to pre-built artifact templates using multi-criterion confidence scoring.

**Architecture**:

```
User Message
    ↓
Input Validation (throw on null/undefined, return [] on empty)
    ↓
For Each Template:
    ├─ calculateConfidenceScore() → 5 criteria scores
    │   ├─ Keyword Density (30%): matched/total keywords ratio
    │   ├─ Word Boundary (25%): exact word matches (not substrings)
    │   ├─ Specificity (20%): templates with more keywords need more matches
    │   ├─ Template Relevance (15%): description word overlap
    │   └─ Intent Clarity (10%): artifact-building verbs present
    ↓
calculateWeightedConfidence() → 0-100 score
    ↓
Filter by threshold (default: 25%)
    ↓
Sort by confidence (highest first)
    ↓
Return TemplateMatchOutput:
    ├─ matched: true → formatTemplateGuidance()
    ├─ matched: false → structured reason (no_matches | low_confidence | invalid_input)
    └─ metadata: confidence, templateId, scores breakdown
```

**Key Algorithms**:

1. **Keyword Matching**:
   - Word boundary matches (full credit): `\b${keyword}\b`
   - Substring matches (half credit): `includes(keyword)`
   - Prevents false positives (e.g., "dash" matching "dashboard")

2. **Confidence Thresholds**:
   - **High Quality**: ≥70% (preferred for template injection)
   - **Minimum Match**: ≥25% (consider as candidate)
   - **Rejection**: <30% for non-high-quality matches

3. **Specificity Scaling**:
   - Templates with 8+ keywords: require 30% keyword match
   - Templates with 5-7 keywords: require 25% keyword match
   - Templates with 3-4 keywords: require 20% keyword match
   - Templates with <3 keywords: require 15% keyword match

**Return Types**:
```typescript
interface TemplateMatchResult {
  template: ArtifactTemplate;
  confidence: number; // 0-100
  scores: {
    keywordDensity: number;
    wordBoundary: number;
    specificity: number;
    templateRelevance: number;
    intentClarity: number;
  };
  isHighQuality: boolean; // confidence >= 70%
}

interface TemplateMatchOutput {
  template: string; // Formatted guidance or ''
  matched: boolean;
  reason: 'invalid_input' | 'no_matches' | 'low_confidence' | 'matched';
  confidence?: number;
  templateId?: string;
}
```

#### Design Tokens System

**Purpose**: Enforce consistent design language across artifacts using semantic tokens instead of ad-hoc values.

**Location**: `supabase/functions/_shared/artifact-rules/design-tokens.ts`

**Architecture**:

```
Design Tokens (Token-First Methodology)
    ├─ Color Tokens (semantic names)
    │   ├─ LIGHT_COLORS (hsl values for light mode)
    │   ├─ DARK_COLORS (adjusted for dark backgrounds)
    │   └─ Categories: background, surface, text, border, primary, accent, semantic states
    ├─ Typography Tokens (size, lineHeight, weight, letterSpacing)
    │   ├─ Fixed scales (display → h1-h6 → body → caption)
    │   └─ Fluid scales (clamp() for responsive sizing)
    ├─ Spacing Tokens (8px base system)
    │   └─ 0, 1 (4px), 2 (8px), 3 (12px), ... 24 (96px)
    ├─ Radius, Shadow, Motion, Z-Index tokens
    ├─ Design Directions (style templates)
    │   ├─ Minimal Premium SaaS (md radius, sm shadow, comfortable)
    │   ├─ Bold Editorial (sm radius, no shadow, high contrast)
    │   ├─ Soft & Organic (2xl radius, md shadow, spacious)
    │   ├─ Dark Neon Restrained (lg radius, lg shadow, high contrast)
    │   └─ Playful & Colorful (xl radius, md shadow, vibrant)
    └─ Anti-Patterns (Z.ai "AI Slop" prevention)
        ├─ Banned: Inter, Roboto, #3b82f6, purple gradients
        └─ Required: Custom palettes, distinctive fonts, asymmetric layouts
```

**Key Functions**:
- `generateCSSVariables()`: Convert tokens to CSS custom properties
- `generateThemeCSS()`: Full theme with light/dark modes + accessibility

**Component State Requirements**: `default`, `hover`, `active`, `focus`, `disabled`, `loading`, `empty`, `error`

#### Canonical Examples System

**Purpose**: Provide complete, working artifact code that AI can copy as templates.

**Philosophy** (Z.ai approach):
- **Show, don't tell**: Full working code instead of abstract patterns
- **Copy-paste ready**: AI uses these as starting points, not references
- **Real-world scenarios**: Common requests (forms, dashboards, games, tables, settings)
- **Best practices baked in**: Dark mode, validation, loading states, accessibility

**Examples Included**:
1. **Interactive Contact Form** - Validation, loading states, success feedback
2. **Analytics Dashboard** - Recharts integration, Radix Tabs, metric cards
3. **Tic-Tac-Toe Game** - Immutable state, winner detection, score tracking
4. **Data Table with Search** - Filter, sort, action buttons, status badges
5. **Settings Page** - Radix Tabs + Switch, form inputs, save feedback

**Search Algorithm**:
```typescript
findRelevantExample(userRequest: string): ExampleMatchResult {
  // Case-insensitive keyword matching
  // Returns: { example, matchedKeywords[], debugInfo: { totalExamples, bestScore } }
  // Never returns null - returns rich context for no-match scenarios
}
```

#### Mandatory Patterns Validation

**Purpose**: Enforce non-negotiable React structure for artifacts.

**Critical Patterns**:
1. **React Globals**: `const { useState } = React` (NOT imports)
2. **Export Structure**: `export default function App()` (must be named `App`)
3. **Wrapper Requirements**: `min-h-screen` container for full-height layouts
4. **Package Imports**: Namespace imports for Radix UI (`import * as Dialog`)
5. **Auto-Injected Globals**: framer-motion (no import needed)

**Validation Pipeline**:
```typescript
validateReactBoilerplate(code: string): ValidationResult {
  // Returns: { valid: boolean, violations: string[], warnings: string[] }
  // Violations = build failures
  // Warnings = best practice suggestions
}
```

**Violation Examples**:
- ❌ `import React from 'react'` → Use React global
- ❌ `import { useState } from 'react'` → Use `const { useState } = React`
- ❌ `export default function Calculator()` → Must be named `App`
- ❌ `import { Dialog } from '@radix-ui/react-dialog'` → Use namespace import

**Fix Generation**:
```typescript
getViolationFix(violation: string): string {
  // Returns prescriptive before/after code examples
  // Shows exact replacement patterns
}
```

#### Integration with Chat Pipeline

**Location**: `supabase/functions/chat/handlers/tool-calling-chat.ts`

**Flow**:
```
1. User sends artifact request
2. getMatchingTemplate(userMessage) → TemplateMatchOutput
3. If matched && confidence >= 70%:
   ├─ Inject template guidance into system prompt
   ├─ Include CORE_RESTRICTIONS
   ├─ Include MANDATORY_REACT_BOILERPLATE
   └─ Include relevant CANONICAL_EXAMPLES
4. GLM-4.7 generates artifact with thinking mode enabled
5. Server validates output via artifact-validator.ts
6. Return structured artifact or error with fix suggestions
```

**Data Flow**:
```
artifact-rules/
    ↓ (imported by)
chat/handlers/tool-calling-chat.ts
    ↓ (builds system prompt)
GLM-4.7 (Z.ai API)
    ↓ (generates artifact)
artifact-validator.ts
    ↓ (validates structure)
Client Renderer
    ↓ (Sucrase transpile OR bundle-artifact/)
User's Browser
```

## Edge Function Decision Tree

Route requests to the appropriate Edge Function based on the scenario:

| Scenario | Function | Model Used | Template Matching |
|----------|----------|------------|-------------------|
| User sends chat message | `chat/` | GLM-4.7 (w/ OpenRouter fallback) | N/A |
| User requests artifact | Tool-calling via `chat/` → `generate_artifact` | GLM-4.7 | ✅ getMatchingTemplate() |
| Artifact has errors | Tool-calling via `chat/` → `generate_artifact_fix` | GLM-4.7 | N/A (uses existing context) |
| First message in session | `generate-title/` | GLM-4.5-Air | N/A |
| User requests image | Tool-calling via `chat/` → `generate_image` | Gemini Flash Image | N/A |
| Conversation exceeds context | `summarize-conversation/` | GLM-4.5-Air | N/A |
| Web search query rewrite | `query-rewriter` (shared) | GLM-4.5-Air | N/A |
| Artifact needs npm packages | `bundle-artifact/` | N/A (esbuild bundler) | N/A |
| Health/uptime monitoring | `health/` | N/A (status check) | N/A |

## Status Update System

The system provides real-time progress updates during artifact generation using **ReasoningProvider**:

### ReasoningProvider Architecture

**Purpose**: Generate semantic, contextual status messages during artifact creation by analyzing GLM-4.7 reasoning output.

**Model**: GLM-4.5-Air (via Z.ai Coding API)
- Ultra-fast semantic status generation (200-500ms response time)
- Configuration: `max_tokens: 50`, `temperature: 0.3`, thinking mode disabled
- Security: Input sanitized via `PromptInjectionDefense.sanitizeArtifactContext()`

**Location**: `supabase/functions/_shared/reasoning-provider.ts`

### Flow Diagram

```
GLM-4.7 Reasoning Stream
    ↓
Buffer Chunks (200-800 chars)
    ↓
Phase Detection (keyword matching)
    ↓
Circuit Breaker Check
    ├─ OPEN → Fallback Templates
    └─ CLOSED → GLM-4.5-Air Call
        ├─ Success → Semantic Status (SSE: reasoning_status)
        └─ Failure → Fallback Templates + Record Failure
```

### Core Components

**Classes**:
- `ReasoningProvider` — Main provider implementation
- `GLMClient` — LLM client for status generation
- `createReasoningProvider()` — Factory function with sensible defaults
- `createNoOpReasoningProvider()` — No-op provider for testing/disabled scenarios

**SSE Events**:
- `reasoning_status` — Regular status update (LLM or template)
- `reasoning_final` — Final summary on artifact completion
- `reasoning_heartbeat` — Idle keepalive during long operations
- `reasoning_error` — Error notification (currently unused)

### Phase Detection Algorithm

**Phases**: `analyzing` → `planning` → `implementing` → `styling` → `finalizing`

**Detection Logic**:
1. Scan buffered text for phase keywords (case-insensitive)
2. Score each phase based on keyword matches
3. Select highest-scoring phase if score ≥ 2 (strong signal required)
4. Otherwise, retain current phase (prevents flicker)

**Keywords**:
```typescript
analyzing: ['understand', 'analyze', 'consider', 'examine', 'requirement', ...]
planning: ['plan', 'design', 'architect', 'structure', 'component', ...]
implementing: ['implement', 'build', 'create', 'code', 'function', ...]
styling: ['style', 'css', 'tailwind', 'color', 'responsive', ...]
finalizing: ['final', 'finish', 'complete', 'polish', 'optimize', ...]
```

### Circuit Breaker Pattern

**Purpose**: Prevent cascading failures when LLM becomes unreliable

**States**: `CLOSED` (normal) → `OPEN` (tripped) → `HALF_OPEN` (testing) → `CLOSED`

**Thresholds**:
- **Failure Threshold**: 3 consecutive failures
- **Cooldown Duration**: 30 seconds
- **Reset Condition**: Single successful LLM call closes circuit

**Failure Criteria**:
- LLM request timeout (5s default)
- API errors (non-200 status codes)
- Invalid/empty responses
- Suspicious output patterns (SQL injection, XSS attempts)

**Behavior**:
- **CLOSED**: Normal operation, calls LLM for status generation
- **OPEN**: All requests bypass LLM, use fallback templates immediately
- **HALF_OPEN**: After cooldown, attempt single LLM call to test recovery
- **Auto-Reset**: Successful call resets failure counter and closes circuit

### Buffering Strategy

**Purpose**: Balance API cost vs. update freshness

**Thresholds**:
- **minBufferChars**: 200 characters (triggers flush when reached)
- **maxBufferChars**: 800 characters (forces flush regardless of time)
- **maxWaitMs**: 4,000ms (forces flush if no new chunks received)

**Flush Logic**:
1. Check anti-flicker cooldown (1,200ms minimum between updates)
2. Verify pending call limit (max 5 concurrent LLM requests)
3. Check circuit breaker state
4. Call LLM or fallback to templates
5. Clear buffer after processing

### Anti-Flicker Cooldown

**Purpose**: Prevent rapid status changes that create poor UX

**Mechanism**:
- Minimum 1,200ms between status emissions
- If flush requested during cooldown, schedule for end of cooldown period
- Cooldown timer resets on every successful emission

**Example**:
```
Time 0ms:   Emit status "Analyzing requirements..."
Time 500ms: Flush requested → scheduled for 1200ms
Time 1200ms: Emit next status "Planning architecture..."
```

### Idle Heartbeat

**Purpose**: Show progress during long operations without new reasoning chunks

**Mechanism**:
- **Interval**: 8,000ms (8 seconds)
- **Trigger**: No new chunks received AND no pending LLM calls
- **Event Type**: `reasoning_heartbeat` (distinct from `reasoning_status`)
- **Message**: First template message from current phase

### Template Fallback System

**Trigger Conditions**:
- Circuit breaker is OPEN
- LLM call fails or times out
- Max pending calls reached
- No GLM_API_KEY configured

**Template Structure**:
```typescript
const phaseTemplates = {
  analyzing: ["Analyzing requirements...", "Understanding the context...", "Evaluating approach..."],
  planning: ["Designing the architecture...", "Planning component structure...", "Outlining implementation strategy..."],
  implementing: ["Building core functionality...", "Implementing features...", "Writing application logic..."],
  styling: ["Adding visual polish...", "Styling components...", "Refining the interface..."],
  finalizing: ["Finalizing implementation...", "Adding final touches...", "Completing the artifact..."],
};
```

**Message Rotation**: Cycles through templates sequentially (prevents repetition within same phase)

### Configuration

**Default Config**:
```typescript
{
  minBufferChars: 200,
  maxBufferChars: 800,
  maxWaitMs: 4000,
  minUpdateIntervalMs: 1200,
  maxPendingCalls: 5,
  timeoutMs: 5000,
  idleHeartbeatMs: 8000,
  circuitBreakerThreshold: 3,
  circuitBreakerResetMs: 30000,
}
```

**Environment Variables**:
- `USE_REASONING_PROVIDER`: Enable/disable provider (default: `true`)
- `GLM_API_KEY`: Z.ai API key (required for LLM-powered status)

### Lifecycle Management

**1. Initialization**:
```typescript
const provider = createReasoningProvider(requestId, async (event) => {
  writer.write(`data: ${JSON.stringify(event)}\n\n`);
});
```

**2. Start**:
```typescript
await provider.start();
// Emits initial "Analyzing your request..." status
// Starts idle heartbeat timer
```

**3. Process Chunks**:
```typescript
provider.processReasoningChunk('Analyzing user requirements...');
// Buffers text, detects phase, flushes when threshold reached
```

**4. Manual Phase Change**:
```typescript
await provider.setPhase('implementing');
// Emits immediate status update with new phase context
```

**5. Finalize**:
```typescript
await provider.finalize('a calculator app');
// Generates final summary via LLM (or fallback)
// Emits reasoning_final event
// Automatically calls destroy()
```

**6. Destroy**:
```typescript
provider.destroy();
// Clears all timers (flush, heartbeat)
// Marks provider as destroyed (ignores subsequent calls)
```

### Integration Points

**Used By**:
- `supabase/functions/chat/handlers/tool-calling-chat.ts`
  - Initializes provider when `USE_REASONING_PROVIDER=true`
  - Processes reasoning chunks during streaming to generate semantic status updates
  - Finalizes on artifact completion

**Dependencies**:
- `GLMClient` → Z.ai Coding API (GLM-4.5-Air model)
- `PromptInjectionDefense` → Input sanitization and output validation
- `MODELS.GLM_4_5_AIR` → Model name constant from `config.ts`

### Code Examples

**Basic Usage**:
```typescript
import { createReasoningProvider } from './_shared/reasoning-provider.ts';

const provider = createReasoningProvider('req_123', async (event) => {
  // Emit SSE event to client
  writer.write(`data: ${JSON.stringify(event)}\n\n`);
});

await provider.start();

// Process streaming reasoning
for await (const chunk of reasoningStream) {
  await provider.processReasoningChunk(chunk);
}

// Finalize with artifact description
await provider.finalize('a todo list app with dark mode');
// Automatically calls destroy()
```

**Custom Configuration**:
```typescript
const provider = createReasoningProvider('req_123', eventCallback, {
  config: {
    minBufferChars: 300,        // More patient before flushing
    circuitBreakerThreshold: 5, // More tolerant of failures
  },
  phaseConfig: {
    implementing: {
      name: 'Building',
      messages: ['Coding the app...', 'Writing features...'],
    },
  },
});
```

**Circuit Breaker State Monitoring**:
```typescript
const state = provider.getState();
if (state.circuitBreaker.isOpen) {
  console.warn('Circuit breaker tripped, using fallback templates');
}
```

### Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| No status updates | `USE_REASONING_PROVIDER=false` | Set to `true` or omit (defaults to `true`) |
| Circuit breaker stuck OPEN | Repeated LLM failures | Check GLM_API_KEY, network connectivity, Z.ai API status |
| Rapid status flicker | Anti-flicker cooldown too short | Increase `minUpdateIntervalMs` (default 1200ms) |
| Stale status messages | Buffer thresholds too high | Decrease `maxWaitMs` or `minBufferChars` |
| "Empty response from GLM" | Invalid API response format | Check Z.ai API changes, validate response structure |
| Memory leak | Provider not destroyed | Always call `destroy()` or use `finalize()` (auto-destroys) |

### Migration Guide (December 2025)

**Breaking Change**: Removed legacy `[STATUS:]` marker system.

**If you previously set `USE_REASONING_PROVIDER=false`:**
- **Before**: System fell back to regex-based status markers
- **After**: No status updates shown (displays "Thinking..." only)
- **Action**: Remove `USE_REASONING_PROVIDER=false` environment variable to re-enable status updates

**Why this change**: ReasoningProvider is now the sole status update system with built-in template fallback via circuit breaker.

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
| `normalizePromptForApi()` | Text normalization for API transmission | tool-validator.ts, validators.ts | Before sending prompts to GLM |
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

## Prebuilt Bundle System

Optimizes artifact loading by using pre-bundled common dependencies instead of runtime fetching:

**Location**: `supabase/functions/_shared/prebuilt-bundles.ts`, `scripts/build-prebuilt-bundles.ts`

**Features**:
- **O(1) Package Lookup**: Hash map provides instant package access
- **Version Compatibility**: Supports exact matches, caret ranges (^2.0.0), tilde ranges (~2.5.0), and latest
- **Phased Rollout**: 70+ packages across four phases
  - Phase 1: State management, forms, UI essentials, animation
  - Phase 2: Data visualization - flowcharts, Nivo charts, Chart.js
  - Phase 3: Games & interactive - Konva, physics, GSAP, audio, drag-drop
  - Phase 4: 3D & WebGL - Three.js, React Three Fiber, Drei, React Three Postprocessing
- **5-10x Faster Loading**: Eliminates CDN round-trips for common packages
- **Smart Bundling**: Pure packages use `?bundle` for single-file optimization, React packages use standard URLs

**Note**: `framer-motion` is handled specially via UMD shim (not ESM bundling) to avoid Safari import map compatibility issues. It's excluded from both import transform and import map loops in `bundle-artifact/index.ts`.

**Usage**:
```typescript
import { getPrebuiltBundles } from './prebuilt-bundles.ts';
const { prebuilt, remaining, stats } = getPrebuiltBundles(dependencies);
```

## CDN Fallback Strategy

**Location**: `supabase/functions/_shared/cdn-fallback.ts`

Provides resilient multi-CDN strategy for ESM package loading with automatic failover:

**Features**:
- **Multi-Provider Fallback**: esm.sh → esm.run → jsdelivr (3-second timeout per provider)
- **Parallel Verification**: Checks all CDNs simultaneously, returns fastest successful
- **Health Monitoring**: Tracks CDN availability with detailed logging
- **React Externalization**: Proper `?external=react,react-dom` handling where supported

**Usage**:
```typescript
import { getWorkingCdnUrl } from './cdn-fallback.ts';

const result = await getWorkingCdnUrl('lodash', '4.17.21', requestId);
if (result) {
  console.log(`Using ${result.provider}: ${result.url}`);
}
```
