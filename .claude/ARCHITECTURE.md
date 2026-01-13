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
├── golden-patterns.ts        # Best practice recommendations
├── error-patterns.ts         # Common error patterns and fixes
├── bundling-guidance.ts      # Package bundling instructions
├── verification-checklist.ts # Pre-generation validation
├── pattern-cache.ts          # Performance caching for patterns
├── type-selection.ts         # Artifact type detection logic
├── react-patterns.ts         # React-specific patterns
└── html-patterns.ts          # HTML artifact patterns
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
    └─ Anti-Patterns (AI "Slop" prevention)
        ├─ Banned: Inter, Roboto, #3b82f6, purple gradients
        └─ Required: Custom palettes, distinctive fonts, asymmetric layouts
```

**Key Functions**:
- `generateCSSVariables()`: Convert tokens to CSS custom properties
- `generateThemeCSS()`: Full theme with light/dark modes + accessibility

**Component State Requirements**: `default`, `hover`, `active`, `focus`, `disabled`, `loading`, `empty`, `error`

#### Canonical Examples System

**Purpose**: Provide complete, working artifact code that AI can copy as templates.

**Philosophy** (best practices approach):
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
4. Gemini 3 Flash generates artifact with thinking mode enabled
5. Server validates output via artifact-validator.ts
6. Return structured artifact or error with fix suggestions
```

**Data Flow**:
```
artifact-rules/
    ↓ (imported by)
chat/handlers/tool-calling-chat.ts
    ↓ (builds system prompt)
Gemini 3 Flash (OpenRouter)
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
| User sends chat message | `chat/` | Gemini 3 Flash (w/ Flash Lite fallback) | N/A |
| User requests artifact | Tool-calling via `chat/` → `generate_artifact` | Gemini 3 Flash | ✅ getMatchingTemplate() |
| Artifact has errors | Tool-calling via `chat/` → `generate_artifact_fix` | Gemini 3 Flash | N/A (uses existing context) |
| First message in session | `generate-title/` | Gemini 3 Flash | N/A |
| User requests image | Tool-calling via `chat/` → `generate_image` | Gemini Flash Image | N/A |
| Conversation exceeds context | `summarize-conversation/` | Gemini 3 Flash | N/A |
| Web search query rewrite | `query-rewriter` (shared) | Gemini 3 Flash | N/A |
| Artifact needs npm packages | `bundle-artifact/` | N/A (esbuild bundler) | N/A |
| Health/uptime monitoring | `health/` | N/A (status check) | N/A |

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

## Prebuilt Bundle System

Optimizes artifact loading by using pre-bundled common dependencies instead of runtime fetching:

**Location**: `supabase/functions/_shared/prebuilt-bundles.ts`

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
