<!-- CLAUDE.md v2.23 | Last updated: 2025-12-27 | Fixed Edge Functions env file location (supabase/functions/.env) -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Vana** is a production AI-powered development assistant that transforms natural language into interactive code, React components, diagrams, and images in real-time. Built with React 18, TypeScript, Vite, Supabase (PostgreSQL + Edge Functions), and multiple AI models via OpenRouter and Google AI Studio.

**Tech Stack**: React 18.3.1 + TypeScript 5.8.3 + Vite 5.4.19 + Tailwind CSS + shadcn/ui + Supabase + TanStack Query + Vitest

## Developer Environment

**Required versions** (check with `node -v`, `deno --version`, `supabase --version`):
- **Node.js**: v20+ (LTS recommended)
- **npm**: v10+ (comes with Node.js)
- **Deno**: v1.40+ (for Edge Functions development)
- **Supabase CLI**: v1.x
- **Chrome**: Required for DevTools MCP browser testing

**First-time setup**:
```bash
npm install                    # Install dependencies
supabase start                 # Start local Supabase (Docker required)
npm run dev                    # Start dev server on port 8080
```

## Features

### Interactive Onboarding

- **Feature Tour Demo**: Interactive guided tour at `/feature-tour` that introduces new users to key UI elements
- **Visual Highlights**: Gradient glow borders spotlight UI elements without blocking the interface
- **Step-by-Step Tooltips**: Contextual explanations for chat input, modes, and sidebar navigation

## ⚡ Quick Reference

| Task | Command/Pattern |
|------|-----------------|
| Start dev server | `npm run dev` (port 8080) |
| Run all tests | `npm run test` |
| Run specific test | `npm run test -- path/to/file.test.ts` |
| Check coverage | `npm run test:coverage` (55% threshold) |
| Deploy production | `./scripts/deploy-simple.sh prod` |
| Model names | Always use `MODELS.*` from `_shared/config.ts` |
| Artifact imports | NO `@/` imports — use npm packages or Tailwind |
| Chrome MCP | `npx chrome-devtools-mcp start` / `/chrome-status` |
| Validate critical files | `node scripts/validate-critical-files.cjs` |

## 🎯 MUST Rules (Non-Negotiable)

1. **Package Manager**: Use `npm` only — never Bun/Yarn/pnpm (lock file conflicts)
2. **Browser Verification**: Test with Chrome DevTools MCP after EVERY change
3. **Model Configuration**: **CRITICAL** - NEVER hardcode model names! Always use `MODELS.*` from `supabase/functions/_shared/config.ts`
   - ❌ `model: "google/gemini-2.5-flash-lite"` → CI/CD FAILS
   - ✅ `import { MODELS } from '../_shared/config.ts'` then `model: MODELS.GEMINI_FLASH`
4. **Artifact Imports**: **CRITICAL** - Cannot use `@/components/ui/*` in artifacts (sandbox isolation)
5. **Security DEFINER**: Always include `SET search_path = public, pg_temp` (prevents schema injection)
6. **CORS**: Never use wildcard `*` origins in production
7. **Animation**: Only animate new messages, not entire chat history
8. **Routes**: Add new routes ABOVE the `*` catch-all in App.tsx
9. **Critical Files Protection**: **EXTREMELY CRITICAL** - NEVER redirect git command output to critical files
   - ❌ `git show HEAD:index.html > index.html` → CORRUPTS FILE with error output
   - ✅ `git show HEAD:index.html` then manually copy content
   - **Pre-commit hook validates**: `index.html`, `package.json`, `vite.config.ts`, `tsconfig.json`
   - **Why**: Failed git commands redirect errors (like "fatal: path 'index.html' does not exist") to the file, corrupting it
   - **Protection**: Run `node scripts/validate-critical-files.cjs` before committing
   - **Recovery**: `git checkout HEAD~1 -- index.html` (or last known good commit)

## ⚠️ Anti-Patterns

| ❌ DON'T | ✅ DO INSTEAD | WHY |
|----------|---------------|-----|
| `bun install` | `npm install` | Lock file conflicts |
| Skip session validation | `await ensureValidSession()` | Auth errors |
| Import shadcn in artifacts | Use npm Radix UI or Tailwind | Sandbox isolation |
| Animate all messages | Animate last message only | Performance |
| Deploy without verification | Run Chrome DevTools checks | Runtime errors |
| Add routes after `*` | Add ABOVE catch-all | Routes unreachable |
| Hardcode model names | Use `MODELS.*` | CI/CD fails |
| Manual CORS headers | Use `corsHeaders` from cors-config.ts | Security |
| Start new dev server on 8081+ | Kill 8080 and restart there | Port confusion, perf |
| `git show ... > index.html` | `git show ...` then manual copy | Redirects errors to file, corrupting it |

## Chrome DevTools MCP Setup

```bash
npx chrome-devtools-mcp start|status|restart  # Manage Chrome instance
```

**Alias Setup** (recommended for convenience):
```bash
alias chrome-mcp="npx chrome-devtools-mcp"
```

**Slash commands**: `/chrome-status`, `/chrome-restart`, `/kill-chromedev`

**Screenshots** (ALWAYS use filePath - enforced by hook):
```typescript
// ✅ CORRECT - File-based (prevents 400 errors)
await browser.screenshot({ filePath: ".screenshots/name.png", format: "png" })

// ❌ WRONG - Base64 (blocked by hook, causes 400 errors)
await browser.screenshot({ format: "png" })  // Returns base64, exceeds payload limits
```

**Why**: Chrome MCP has two critical bugs when returning screenshots as base64:
1. **MIME type mismatch**: PNG screenshots labeled as `image/jpeg` → API validation fails
2. **Payload size limits**: Base64-encoded screenshots exceed message size limits → 400 errors

**Protection**: `.claude/hooks/chrome-screenshot-fix.py` automatically converts ALL screenshot calls to file-based format (logged to stderr).

**Browser Verification Pattern** (run after EVERY change):
```typescript
await browser.navigate({ url: "http://localhost:8080" })
const errors = await browser.getConsoleMessages({ onlyErrors: true })
await browser.screenshot({ filePath: ".screenshots/verification.png", format: "png" })
```

**Guide**: `.claude/CHROME_MCP_COMMANDS.md`

## Commands

### Development
```bash
npm run dev              # Dev server (port 8080)
npm run build            # Production build
npm run build:dev        # Dev build with sourcemaps
npm run preview          # Preview production build
```

**Dev Server Management** (IMPORTANT):
- **Port 8080 is the standard dev port** — do NOT start new servers on 8081, 8082, etc.
- **Vite HMR handles most changes** — no need to restart the server for code changes
- If HMR isn't working or you need a full reload:
  ```bash
  # Kill existing dev server on port 8080
  lsof -ti:8080 | xargs kill -9 2>/dev/null; npm run dev
  ```
- **Never run multiple dev servers** — kills performance and causes port confusion

### Testing (1,048 tests, 90+ files)
```bash
npm run test                  # Run all tests
npm run test -- --watch       # Watch mode
npm run test:coverage         # Coverage report (55% threshold)
npm run test -- path/to/test  # Specific file
```

### Deployment
```bash
./scripts/deploy-simple.sh prod           # Deploys Edge Functions to production
supabase functions deploy <name> --project-ref <ref>  # Individual function
```

### CI/CD Pipelines (Automated)

**Workflows** (`.github/workflows/`):

| Workflow | Trigger | What It Does |
|----------|---------|--------------|
| `deploy-migrations.yml` | Push to `main` with `supabase/migrations/**` changes | Applies database migrations to production |
| `deploy-edge-functions.yml` | Push to `main` with `supabase/functions/**` changes | Runs migrations first, then deploys Edge Functions |

**Flow Diagram**:
```
Push to main
    │
    ├── migrations/** changed?
    │   └── Yes → deploy-migrations.yml
    │             1. Checkout with full git history
    │             2. Link to production Supabase
    │             3. Run `supabase db push --linked`
    │             4. Fail pipeline if migrations fail ⚠️
    │
    └── functions/** changed?
        └── Yes → deploy-edge-functions.yml
                  1. Checkout with full git history
                  2. Link to production Supabase
                  3. Run migrations first (fail-fast on error)
                  4. Deploy all Edge Functions
```

**Key Safety Features**:
- **Fail-fast on migration errors**: Workflows exit immediately if `supabase db push` fails (no silent failures)
- **Migrations before functions**: Edge Functions always deploy against an up-to-date schema
- **Full git history**: `fetch-depth: 0` ensures `git diff` commands work for change detection

**Manual Deployment**:
```bash
# Local script (prompts for confirmation)
./scripts/deploy-simple.sh prod

# Manual workflow trigger (dry-run support)
gh workflow run "Deploy Database Migrations" --field dry_run=true
```

### Migration Schema Drift

**Symptoms**: CI/CD fails with `Remote migration versions not found in local migrations directory`

**Cause**: Production database has migrations in its history that don't exist locally (manual changes, deleted files, or renamed migrations).

**Fix**:
```bash
# 1. Check what's out of sync
supabase migration list

# 2. Option A: Mark remote migration as reverted (if it was applied manually)
supabase migration repair --status reverted <timestamp>

# 3. Option B: Pull current production schema
supabase db pull

# 4. Option C: Reset migration history (DANGEROUS - only for dev)
# This marks all local migrations as applied without running them
supabase db push --linked --include-all
```

**Prevention**:
- Never apply migrations directly to production — always go through CI/CD
- Keep migration files in sync with production history
- Use `supabase migration list` to audit drift before deploying

## Architecture

### Multi-Model AI System

| Function | Model | Provider | Notes |
|----------|-------|----------|-------|
| Chat/Summaries/Titles | Gemini 2.5 Flash Lite | OpenRouter | Single key, unlimited |
| Artifact Generation | GLM-4.6 | Z.ai API | Thinking mode enabled, streams reasoning |
| Artifact Error Fixing | GLM-4.6 | Z.ai API | Deep reasoning for debugging |
| Image Generation | Gemini 2.5 Flash Image | OpenRouter | Single key |

**Dual Status Update System** (Real-time progress updates):

The system uses TWO parallel mechanisms for status updates:

1. **[STATUS:] Markers (Legacy, retained for backward compatibility)**:
   - GLM-4.6 emits `[STATUS: action phrase]` markers during thinking (defined in `system-prompt.txt`)
   - Backend parses via `parseStatusMarker()` in `glm-client.ts` (lines 761-773)
   - Emitted as `status_update` SSE events
   - Direct architecture: GLM-4.6 reasoning → regex parse → SSE → UI

2. **ReasoningProvider (New, LLM-powered semantic status)**:
   - Buffers GLM-4.6 reasoning chunks during streaming
   - Calls GLM-4.5-Air to generate semantic, contextual status messages
   - Emitted as `reasoning_status` SSE events
   - Hybrid architecture: GLM-4.6 reasoning → buffer → GLM-4.5-Air call → SSE → UI
   - Includes circuit breaker (falls back to phase templates on LLM failure)

**Why both?**: The marker system provides instant, deterministic updates while ReasoningProvider generates more natural, contextual messages. Both run simultaneously for redundancy and improved UX quality.

**Feature Flag**: Set `USE_REASONING_PROVIDER=false` in `supabase/.env.local` to disable semantic status generation (disables ReasoningProvider, keeps marker system active).

**Implementation**: See `supabase/functions/chat/handlers/tool-calling-chat.ts` (lines 326-343, 543, 789, 878-903) where both systems process reasoning chunks in parallel.

### ReasoningProvider Implementation Details

**Location**: `supabase/functions/_shared/reasoning-provider.ts` (1,194 lines)

**Architecture**: Hybrid LLM + Template Fallback System for generating real-time status updates during artifact creation.

#### Core Components

**Model**: GLM-4.5-Air (via Z.ai Coding API)
- **Purpose**: Ultra-fast semantic status generation (200-500ms response time)
- **API**: `https://api.z.ai/api/coding/paas/v4/chat/completions`
- **Configuration**: `max_tokens: 50`, `temperature: 0.3`, thinking mode disabled
- **Security**: Input sanitized via `PromptInjectionDefense.sanitizeArtifactContext()`

**Classes**:
- `ReasoningProvider` — Main provider implementation (lines 780-1134)
- `GLMClient` — LLM client for status generation (lines 488-696)
- `createReasoningProvider()` — Factory function with sensible defaults (lines 1178-1194)
- `createNoOpReasoningProvider()` — No-op provider for testing/disabled scenarios (lines 1145-1168)

#### Flow Diagram

```
GLM-4.6 Reasoning Stream
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

#### Phase Detection Algorithm

**Method**: Keyword-based scoring with hysteresis (lines 731-764)

**Phases**: `analyzing` → `planning` → `implementing` → `styling` → `finalizing`

**Detection Logic**:
1. Scan buffered text for phase keywords (case-insensitive)
2. Score each phase based on keyword matches
3. Select highest-scoring phase if score ≥ 2 (strong signal required)
4. Otherwise, retain current phase (prevents flicker)

**Keywords** (lines 705-726):
```typescript
analyzing: ['understand', 'analyze', 'consider', 'examine', 'requirement', ...]
planning: ['plan', 'design', 'architect', 'structure', 'component', ...]
implementing: ['implement', 'build', 'create', 'code', 'function', ...]
styling: ['style', 'css', 'tailwind', 'color', 'responsive', ...]
finalizing: ['final', 'finish', 'complete', 'polish', 'optimize', ...]
```

#### Circuit Breaker Pattern

**Purpose**: Prevent cascading failures when LLM becomes unreliable

**States**: `CLOSED` (normal) → `OPEN` (tripped) → `HALF_OPEN` (testing) → `CLOSED`

**Thresholds** (lines 149-163):
- **Failure Threshold**: 3 consecutive failures
- **Cooldown Duration**: 30 seconds (30,000ms)
- **Reset Condition**: Single successful LLM call closes circuit

**Failure Criteria**:
- LLM request timeout (5s default)
- API errors (non-200 status codes)
- Invalid/empty responses
- Suspicious output patterns (SQL injection, XSS attempts)

**Behavior** (lines 1005-1041):
- **CLOSED**: Normal operation, calls LLM for status generation
- **OPEN**: All requests bypass LLM, use fallback templates immediately
- **HALF_OPEN**: After cooldown, attempt single LLM call to test recovery
- **Auto-Reset**: Successful call resets failure counter and closes circuit

**Monitoring**: Emits `circuitBreakerOpen: true` in event metadata when tripped

#### Buffering Strategy

**Purpose**: Balance API cost vs. update freshness (lines 94-115)

**Thresholds**:
- **minBufferChars**: 200 characters (triggers flush when reached)
- **maxBufferChars**: 800 characters (forces flush regardless of time)
- **maxWaitMs**: 4,000ms (forces flush if no new chunks received)

**Flush Logic** (lines 976-1041):
1. Check anti-flicker cooldown (1,200ms minimum between updates)
2. Verify pending call limit (max 5 concurrent LLM requests)
3. Check circuit breaker state
4. Call LLM or fallback to templates
5. Clear buffer after processing

#### Anti-Flicker Cooldown

**Purpose**: Prevent rapid status changes that create poor UX

**Mechanism** (lines 123-124, 988-995):
- Minimum 1,200ms between status emissions
- If flush requested during cooldown, schedule for end of cooldown period
- Cooldown timer resets on every successful emission

**Example**:
```
Time 0ms:   Emit status "Analyzing requirements..."
Time 500ms: Flush requested → scheduled for 1200ms
Time 1200ms: Emit next status "Planning architecture..."
```

#### Idle Heartbeat

**Purpose**: Show progress during long operations without new reasoning chunks

**Mechanism** (lines 145-147, 1104-1133):
- **Interval**: 8,000ms (8 seconds)
- **Trigger**: No new chunks received AND no pending LLM calls
- **Event Type**: `reasoning_heartbeat` (distinct from `reasoning_status`)
- **Message**: First template message from current phase

**Prevention**: Heartbeat paused while LLM calls are pending (prevents flicker)

#### Template Fallback System

**Trigger Conditions** (lines 1042-1052):
- Circuit breaker is OPEN
- LLM call fails or times out
- Max pending calls reached
- No GLM_API_KEY configured

**Template Structure** (lines 212-258):
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

#### Configuration

**Default Config** (lines 174-184):
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

**Feature Flag Override** (lines 42-67 in `config.ts`):
```bash
# Disable semantic status entirely
supabase secrets set USE_REASONING_PROVIDER=false
```

#### Lifecycle Management

**1. Initialization** (lines 799-823):
```typescript
const provider = createReasoningProvider(requestId, async (event) => {
  writer.write(`data: ${JSON.stringify(event)}\n\n`);
});
```

**2. Start** (lines 839-856):
```typescript
await provider.start();
// Emits initial "Analyzing your request..." status
// Starts idle heartbeat timer
```

**3. Process Chunks** (lines 858-888):
```typescript
provider.processReasoningChunk('Analyzing user requirements...');
// Buffers text, detects phase, flushes when threshold reached
```

**4. Manual Phase Change** (lines 890-900):
```typescript
await provider.setPhase('implementing');
// Emits immediate status update with new phase context
```

**5. Finalize** (lines 902-950):
```typescript
await provider.finalize('a calculator app');
// Generates final summary via LLM (or fallback)
// Emits reasoning_final event
// Automatically calls destroy()
```

**6. Destroy** (lines 952-968):
```typescript
provider.destroy();
// Clears all timers (flush, heartbeat)
// Marks provider as destroyed (ignores subsequent calls)
```

#### Event Types

**SSE Events Emitted** (lines 44-49):
- `reasoning_status` — Regular status update (LLM or template)
- `reasoning_final` — Final summary on artifact completion
- `reasoning_heartbeat` — Idle keepalive during long operations
- `reasoning_error` — Error notification (currently unused)

**Event Structure** (lines 54-84):
```typescript
{
  type: 'reasoning_status',
  message: 'Building core functionality...',
  phase: 'implementing',
  metadata: {
    requestId: 'req_123',
    timestamp: '2025-12-27T10:30:00.000Z',
    source: 'llm' | 'fallback',
    provider: 'z.ai',           // Only if source='llm'
    model: 'glm-4.5-air',       // Only if source='llm'
    circuitBreakerOpen: false,
  }
}
```

#### Integration Points

**Used By**:
- `supabase/functions/chat/handlers/tool-calling-chat.ts` (lines 326-343, 543, 789, 878-903)
  - Initializes provider when `USE_REASONING_PROVIDER=true`
  - Processes reasoning chunks in parallel with `[STATUS:]` marker system
  - Finalizes on artifact completion

**Dependencies**:
- `GLMClient` → Z.ai Coding API (GLM-4.5-Air model)
- `PromptInjectionDefense` → Input sanitization and output validation
- `MODELS.GLM_4_5_AIR` → Model name constant from `config.ts`

#### Code Examples

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

#### Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| No status updates | `USE_REASONING_PROVIDER=false` | Set to `true` or omit (defaults to `true`) |
| Circuit breaker stuck OPEN | Repeated LLM failures | Check GLM_API_KEY, network connectivity, Z.ai API status |
| Rapid status flicker | Anti-flicker cooldown too short | Increase `minUpdateIntervalMs` (default 1200ms) |
| Stale status messages | Buffer thresholds too high | Decrease `maxWaitMs` or `minBufferChars` |
| "Empty response from GLM" | Invalid API response format | Check Z.ai API changes, validate response structure |
| Memory leak | Provider not destroyed | Always call `destroy()` or use `finalize()` (auto-destroys) |

### Edge Function Decision Tree

| Scenario | Function | Model |
|----------|----------|-------|
| User sends chat message | `chat/` | Gemini Flash Lite |
| User requests artifact | `generate-artifact/` | GLM-4.6 (Z.ai) |
| Artifact has errors | `generate-artifact-fix/` | GLM-4.6 (Z.ai) |
| First message in session | `generate-title/` | Gemini Flash Lite |
| User requests image | `generate-image/` | Gemini Flash-Image |
| Conversation exceeds context | `summarize-conversation/` | Gemini Flash Lite |
| Artifact needs npm packages | `bundle-artifact/` | N/A (bundler) |
| Health/uptime monitoring | `health/` | N/A (status check) |

### Smart Context Management

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

### Prebuilt Bundle System

Optimizes artifact loading by using pre-bundled common dependencies instead of runtime fetching:

**Location**: `supabase/functions/_shared/prebuilt-bundles.ts`, `scripts/build-prebuilt-bundles.ts`

**Features**:
- **O(1) Package Lookup**: Hash map provides instant package access (vs O(n) array search)
- **Version Compatibility**: Supports exact matches, caret ranges (^2.0.0), tilde ranges (~2.5.0), and latest
- **Phased Rollout**: 70+ packages across four phases
  - Phase 1: State management, forms, UI essentials, animation (18 packages)
  - Phase 2: Data visualization - flowcharts, Nivo charts, Chart.js (8 packages)
  - Phase 3: Games & interactive - Konva, physics, GSAP, audio, drag-drop (9 packages)
  - Phase 4: 3D & WebGL - Three.js, React Three Fiber, Drei, React Three Postprocessing (8 packages)
- **5-10x Faster Loading**: Eliminates CDN round-trips for common packages
- **Smart Bundling**: Pure packages use `?bundle` for single-file optimization, React packages use standard URLs

**Usage**:
```typescript
import { getPrebuiltBundles } from './prebuilt-bundles.ts';
const { prebuilt, remaining, stats } = getPrebuiltBundles(dependencies);
```

### Artifact System

> **📌 Canonical Reference**: This section is the single source of truth for artifact restrictions.

**Component Architecture** (3,916 lines total across 10 components):
- **Frontend**:
  - `ArtifactContainer.tsx` — Main wrapper with state management, validation, editing (primary controller)
  - `ArtifactRenderer.tsx` — Rendering engine for all artifact types (React, HTML, SVG, Mermaid, images)
  - `ArtifactToolbar.tsx` — Toolbar with export, edit, maximize, and theme controls
  - `ArtifactCard.tsx` — Preview cards for artifact selection
  - `ArtifactErrorBoundary.tsx` — React error boundary for graceful degradation
  - `ArtifactErrorRecovery.tsx` — Auto-recovery logic with fallback renderers
  - `ArtifactCodeEditor.tsx` — Inline code editor with syntax highlighting
  - `ArtifactTabs.tsx` — Tab navigation for multi-artifact workspace
- **Backend**:
  - `supabase/functions/_shared/artifact-executor.ts` (793 lines) — Server-side artifact generation orchestrator
  - `supabase/functions/_shared/artifact-validator.ts` (962 lines) — Multi-layer validation engine
  - `supabase/functions/_shared/artifact-rules/` — Validation rule modules (6 files):
    - `core-restrictions.ts` — Import restrictions and security rules
    - `react-patterns.ts` — React-specific validation patterns
    - `html-patterns.ts` — HTML artifact validation
    - `bundling-guidance.ts` — NPM bundling detection and guidance
    - `type-selection.ts` — Artifact type inference
    - `error-patterns.ts` — Common error pattern detection
- **Utilities**:
  - `src/utils/artifactParser.ts` — XML-tag artifact extraction from AI responses
  - `src/utils/artifactValidator.ts` — Frontend validation layer
  - `src/utils/artifactErrorRecovery.ts` — Error classification and recovery strategies
  - `src/utils/artifactBundler.ts` — Client-side bundling coordination
  - `src/utils/sucraseTranspiler.ts` — Sucrase transpiler integration (Phase 4)

**Rendering Methods**:
- **Sucrase** (instant, default) — Client-side transpilation, 20x faster than Babel, ~100KB bundle
- **Babel Standalone** (instant, fallback) — Used when Sucrase fails, ~700KB bundle
- **Server Bundling** (2-5s) — Has npm imports, uses `bundle-artifact/` Edge Function

**Transpiler Architecture** (Sucrase Migration completed 2025-12-27):

### Dual Transpiler System with Intelligent Fallback

The project uses Sucrase as the primary transpiler with Babel Standalone as a fallback for maximum reliability.

#### Primary: Sucrase (Default)

**Performance Characteristics:**
- **Speed**: ~2-10ms transpilation time (vs Babel's 150-500ms)
- **Speedup**: ~20-50x faster than Babel Standalone
- **Bundle Size**: ~100KB (1.6MB on disk including dependencies)
- **Size Reduction**: 96% smaller download than Babel's ~700KB CDN bundle

**Implementation:**
- **Location**: `src/utils/sucraseTranspiler.ts`
- **Configuration**:
  ```typescript
  transform(code, {
    transforms: ['jsx', 'typescript'],  // Strip types, compile JSX
    production: true,                   // Optimize for production
    disableESTransforms: true,         // Keep ES6+ syntax (modern browsers)
    jsxPragma: 'React.createElement',  // React compatibility
    jsxFragmentPragma: 'React.Fragment'
  })
  ```
- **Features**:
  - Real-time performance logging to console
  - Sentry integration for error tracking
  - Detailed error reporting with line/column info

**Benchmarks** (`scripts/benchmark-transpilers.ts`):
| Artifact Size | Lines | Avg Time | Success Rate |
|--------------|-------|----------|--------------|
| Small (Counter) | ~50 | 2-5ms | 100% |
| Medium (Todo App) | ~200 | 5-8ms | 100% |
| Large (Dashboard) | ~500 | 8-12ms | 100% |

**Why Sucrase?**
- Used in production by: Claude Artifacts (Anthropic), CodeSandbox, Expo
- 4.7M+ weekly npm downloads
- Battle-tested reliability
- Same approach as official Claude Code artifacts

#### Fallback: Babel Standalone

**Trigger Conditions:**
- Sucrase transpilation returns `{ success: false }`
- Sucrase throws an exception (library load failure)
- Feature flag `SUCRASE_TRANSPILER` disabled (testing/debugging)

**Characteristics:**
- **Speed**: 150-500ms (runtime transpilation in browser)
- **Bundle Size**: ~700KB CDN download
- **Compatibility**: Broader syntax support for edge cases
- **Implementation**: `<script type="text/babel">` with runtime transpilation

**Fallback Flow:**
```typescript
// 1. Try Sucrase first
const result = transpileCode(code);

if (result.success) {
  // Use pre-transpiled code with <script type="module">
  return generateSucraseTemplate(result.code);
} else {
  // Log to Sentry and fall back to Babel
  Sentry.captureException(new Error(result.error));
  toast.warning('Using compatibility mode');
  return generateBabelTemplate(code); // Runtime transpilation
}
```

#### Template Differences

**Sucrase Template** (Pre-transpiled):
```html
<script type="module">
  // Code already transpiled to React.createElement() calls
  const App = () => React.createElement("div", null, "Hello");
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
</script>
<!-- NO Babel script tag needed -->
```

**Babel Template** (Runtime transpilation):
```html
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script type="text/babel" data-presets="react,typescript">
  // Raw JSX - transpiled at runtime by Babel
  const App = () => <div>Hello</div>;
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
</script>
```

#### Server-Side Integration

**Location**: `supabase/functions/_shared/artifact-validator.ts`

Sucrase strips TypeScript before validation:
```typescript
import { transform } from 'npm:sucrase@3.35.0';

// Strip types for validation (keeps JSX intact)
const result = transform(code, {
  transforms: ['typescript'],  // Only strip types
  disableESTransforms: true
});
```

**Fallback**: Regex-based TypeScript stripping if Sucrase fails (safety net)

#### Feature Flag Control

**Location**: `src/lib/featureFlags.ts`

```typescript
export const FEATURE_FLAGS = {
  SUCRASE_TRANSPILER: true,  // Enabled by default
} as const;
```

**Usage**:
```typescript
import { isFeatureEnabled } from '@/lib/featureFlags';

if (isFeatureEnabled('SUCRASE_TRANSPILER')) {
  // Use Sucrase path
} else {
  // Force Babel for debugging
}
```

#### Migration History

**Phases (PR #410 - December 2025):**

| Phase | Description | Changes |
|-------|-------------|---------|
| Phase 1 | Client-side migration | Created `sucraseTranspiler.ts`, updated `ArtifactRenderer.tsx` |
| Phase 2 | Server-side integration | Added Sucrase to `artifact-validator.ts` for TypeScript stripping |
| Phase 3 | Testing & benchmarks | Added 938 tests in `ArtifactRenderer.sucrase.test.tsx`, created benchmark script |
| Phase 4 | Cleanup & docs | Feature flag enabled by default, Babel kept as fallback |

**Key Files Modified:**
- `src/utils/sucraseTranspiler.ts` (147 lines) - New transpiler utility
- `src/components/ArtifactRenderer.tsx` (+779 lines) - Dual template system
- `scripts/benchmark-transpilers.ts` (660 lines) - Performance validation
- `src/utils/__tests__/sucraseTranspiler.test.ts` (698 tests)
- `src/components/__tests__/ArtifactRenderer.sucrase.test.tsx` (938 tests)

**Total Impact**:
- **+4,510 lines** of new code and tests
- **-1,210 lines** of deprecated code removed
- **Net +3,300 lines** (including comprehensive test coverage)

#### Error Handling & Monitoring

**Sentry Integration:**
```typescript
// Success path
Sentry.addBreadcrumb({
  category: 'transpiler.sucrase',
  message: 'Sucrase transpilation successful',
  level: 'info',
  data: { elapsed, codeLength, outputLength }
});

// Failure path (captured as exception for dashboard visibility)
Sentry.captureException(new Error(`Sucrase failed: ${error}`), {
  tags: { component: 'ArtifactRenderer', transpiler: 'sucrase' },
  extra: { error, details, line, column }
});
```

**User Notifications:**
- Success: Silent (logged to console only)
- Fallback: Warning toast with "compatibility mode" message
- Critical failure: Error toast with refresh option

#### Browser Compatibility

**Target browsers** (ES6+ module support required):
- Chrome 61+
- Firefox 60+
- Safari 10.1+
- Edge 16+

**Note**: Sucrase keeps ES6+ syntax intact (`disableESTransforms: true`) since modern browsers support it natively. This avoids the bloat of Babel's env preset converting everything to ES5.

#### Performance Optimization Benefits

**Bundle Size Reduction:**
- **Before**: 2.6MB Babel CDN download on every artifact render
- **After**: ~100KB Sucrase in main bundle (one-time download)
- **Savings**: 96% reduction in transpiler download size

**Transpilation Speed:**
- **Before**: 150-500ms runtime transpilation (blocking)
- **After**: 2-12ms pre-transpilation (non-blocking)
- **Improvement**: 20-50x faster artifact rendering

**Real-World Impact:**
- Artifacts appear instantly (sub-10ms transpilation)
- No CDN dependency for transpilation
- Better offline experience (transpiler bundled)
- Reduced bandwidth usage by 2.5MB per artifact

#### Limitations & Known Issues

**What Sucrase Does NOT Support:**
- Legacy decorators (use modern decorators or Babel fallback)
- Certain edge-case TypeScript syntax (falls back to Babel)
- Babel plugins/presets (by design - speed over features)

**Automatic Fallback Triggers:**
- Any transpilation error (syntax issues, unsupported features)
- Library load failure (rare, Sentry-tracked)
- Feature flag disabled (manual override)

**Supported types**: `code` | `html` | `react` | `svg` | `mermaid` | `markdown` | `image`

```tsx
// ❌ FORBIDDEN - Local imports never work
import { Button } from "@/components/ui/button"

// ✅ CORRECT - NPM packages (server-bundled via esm.sh)
import * as Dialog from '@radix-ui/react-dialog';
```

**React Instance Unification** (Fixed server-side 2025-12-01):
Server-bundled artifacts use a single React instance via import map shims:
- **Server** (`bundle-artifact/`): Generates esm.sh URLs with `?external=react,react-dom` (don't bundle React internally)
- **Import map**: Includes bare specifiers (`react`, `react-dom`, `react/jsx-runtime`) that redirect to `data:` URL shims → `window.React`
- **Client** (`BundledArtifactFrame`): Client-side patching kept as safety net for old bundles
- **CSP**: Server bundles include `data:` in `script-src` for shim modules
- **Bundle timeout**: 60 seconds for large dependency trees (handled by Supabase Edge Function runtime)

Key files:
- `supabase/functions/bundle-artifact/index.ts` (lines 395-472) — Server-side fix
- `src/components/ArtifactRenderer.tsx` (lines 204-294) — Client-side safety net

### 5-Layer Artifact Validation

1. **System Prompt Prevention** — AI receives warnings during generation
2. **Template Examples** — All templates use Radix UI + Tailwind
3. **Pre-Generation Validation** — `artifact-validator.ts` scans for patterns
4. **Post-Generation Transformation** — Auto-fixes imports & immutability
5. **Runtime Validation** — Blocks artifacts with critical errors

#### Error Code System

The validation system uses **structured error codes** for type-safe error handling instead of fragile string matching:

- **Schema**: `CATEGORY_SPECIFIC_ISSUE` (e.g., `RESERVED_KEYWORD_EVAL`, `IMPORT_LOCAL_PATH`, `IMMUTABILITY_ARRAY_ASSIGNMENT`)
- **Categories**: `RESERVED_KEYWORD`, `IMPORT`, `STORAGE`, `IMMUTABILITY`
- **Blocking vs Non-Blocking**: Immutability violations are non-blocking (only cause React strict mode warnings), all other errors block rendering
- **Fail-Closed Security**: Issues without error codes are treated as critical by default
- **Complete Reference**: See [docs/ERROR_CODES.md](docs/ERROR_CODES.md)

**Migration** (commit b1f86ad): Replaced fragile string matching with structured error codes to prevent false positives.

**Example**:
```typescript
// ✅ CORRECT - Type-safe filtering
const result = validateArtifactCode(code, 'react');
if (result.issues.some(e => e.code === VALIDATION_ERROR_CODES.IMPORT_LOCAL_PATH)) {
  // Handle forbidden import error
}

// ❌ WRONG - Fragile string matching (old approach)
if (result.issues.some(e => e.message.includes('local import'))) {
  // Can match unrelated errors like "Sublocal import detected"
}
```

### Immutability Enforcement

```javascript
// ❌ WRONG - Causes runtime errors
board[i] = 'X';           // Direct assignment
board.push(value);        // Mutates array

// ✅ CORRECT - Immutable patterns
const newBoard = [...board]; newBoard[i] = 'X';
const newBoard = [...board, value];
```

**Auto-fix**: Validator transforms direct assignments into immutable patterns.

**Error Codes**: All immutability violations use `IMMUTABILITY_*` codes and are **non-blocking** (only cause React strict mode warnings, don't crash artifacts). See [docs/ERROR_CODES.md](docs/ERROR_CODES.md) for complete list.

### Database Schema

**Key Tables**: `chat_sessions`, `chat_messages`, `guest_rate_limits`, `user_rate_limits`, `user_tool_rate_limits`, `api_throttle`, `artifact_versions`, `ai_usage_logs`, `message_feedback`

```sql
chat_sessions(id, user_id, title, first_message, conversation_summary, summary_checkpoint, last_summarized_at, created_at, updated_at)
chat_messages(id, session_id, role, content, reasoning, reasoning_steps, search_results, token_count, artifact_ids, created_at)
guest_rate_limits(id, identifier, request_count, window_start, last_request, first_request_at)
user_rate_limits(id, user_id, request_count, window_start, last_request, created_at)
user_tool_rate_limits(id, user_id, tool_name, request_count, window_start, last_request, created_at)  -- Issue #340 Phase 0
api_throttle(id, api_name, request_count, window_start, last_request, created_at)
artifact_versions(id, message_id, artifact_id, version_number, artifact_type, artifact_title, artifact_content, content_hash, created_at)
ai_usage_logs(id, request_id, function_name, provider, model, user_id, is_guest, input_tokens, output_tokens, total_tokens, latency_ms, status_code, estimated_cost, error_message, retry_count, prompt_preview, response_length, created_at)
message_feedback(id, message_id, session_id, feedback_type, created_at)
```

**Security**: All tables have RLS policies. SECURITY DEFINER functions use `SET search_path = public, pg_temp`.

**RPC Functions**:
- `check_tool_rate_limit(user_id, tool_name, max_requests, window_hours)` — Returns tool-specific rate limit status (Issue #340)

Full schema: `supabase/migrations/`

### Edge Functions (`supabase/functions/`)

| Function | Purpose |
|----------|---------|
| `chat/` | Main chat streaming with handlers/ and middleware/ |
| `generate-artifact/` | Artifact generation with GLM-4.6 + SSE streaming + validation |
| `bundle-artifact/` | Server-side npm bundling (Radix UI, framer-motion) |
| `generate-artifact-fix/` | Error fixing with GLM-4.6 deep reasoning |
| `generate-title/` | Session title generation |
| `generate-image/` | AI image generation (OpenRouter) |
| `summarize-conversation/` | Context summarization |
| `health/` | System health monitoring |
| `admin-analytics/` | Admin analytics dashboard data |
| `cache-manager/` | Cache management utilities |

**Shared Utilities** (`_shared/` — 35 TypeScript files):
- **Core Infrastructure**:
  - `config.ts` (441 lines) — Central configuration, model names, feature flags, rate limits
  - `cors-config.ts` — CORS headers and origin validation
  - `logger.ts` — Structured logging for Edge Functions
  - `validators.ts` (387 lines) — Input validation schemas
- **AI/Model Clients**:
  - `openrouter-client.ts` — OpenRouter API client for Gemini Flash Lite, Gemini Flash Image
  - `glm-client.ts` (1,188 lines) — Z.ai GLM-4.6 client with streaming, tool calling, reasoning
  - `glm-tool-parser.ts` (432 lines) — GLM native tool call parser
  - `glm-chat-router.ts` — GLM chat routing logic
- **Unified Tool System** (Issue #340):
  - `tool-definitions.ts` (7,894 bytes) — Tool catalog (generate_artifact, generate_image, browser.search)
  - `tool-executor.ts` (903 lines) — Main tool execution orchestrator
  - `artifact-executor.ts` (793 lines) — Artifact generation executor
  - `image-executor.ts` (726 lines) — Image generation executor
- **Tool Security Infrastructure** (Phase 0):
  - `tool-validator.ts` — Zod schemas, prototype pollution protection, param sanitization
  - `tool-rate-limiter.ts` (423 lines) — Fail-closed circuit breaker, per-tool rate limits
  - `tool-execution-tracker.ts` — Resource exhaustion protection (max 3 tools/request)
  - `prompt-injection-defense.ts` — Unicode normalization, SQL/HTML pattern detection
  - `safe-error-handler.ts` — Error sanitization, PII filtering, no stack traces in production
- **Context & Reasoning**:
  - `context-selector.ts` — Token-aware context window management
  - `context-ranker.ts` — Message importance scoring (recency + artifact-relation)
  - `token-counter.ts` — Accurate token counting for context budgets
  - `reasoning-provider.ts` (1,194 lines) — LLM-powered semantic status generation (GLM-4.5-Air)
  - `reasoning-types.ts` — Type definitions for reasoning system
- **Artifact System**:
  - `artifact-validator.ts` (962 lines) — Multi-layer validation engine
  - `artifact-rules/` (6 files) — Validation rule modules (core-restrictions, react-patterns, html-patterns, bundling-guidance, type-selection, error-patterns)
  - `prebuilt-bundles.ts` — Pre-bundled npm packages (70+ packages, O(1) lookup)
- **Utilities & Integrations**:
  - `storage-retry.ts` — Retry logic for Supabase Storage operations
  - `rate-limiter.ts` — Guest rate limiting (IP-based)
  - `api-error-handler.ts` — API error normalization
  - `error-handler.ts` (400 lines) — Generic error handling
  - `cdn-fallback.ts` — Multi-CDN failover (esm.sh → esm.run → jsdelivr)
  - `tavily-client.ts` (926 lines) — Web search integration
  - `title-transformer.ts` (561 lines) — Session title generation
  - `query-rewriter.ts` — Query enhancement for search
  - `system-prompt-inline.ts` (449 lines) — System prompts and instructions

### Unified Tool-Calling Architecture (Issue #340)

The chat function uses a unified tool-calling system that enables AI to invoke tools (artifact generation, image generation, web search) through function calling. This architecture was implemented in phases:

**Tool Catalog** (`tool-definitions.ts`):
```typescript
// Three canonical tools available to the AI
const TOOL_CATALOG = {
  generate_artifact: { handler: 'artifact', model: MODELS.GLM_4_6 },
  generate_image: { handler: 'image', model: MODELS.GEMINI_FLASH_IMAGE },
  'browser.search': { handler: 'search', streaming: false }
};
```

**SSE Event Flow**:
```
User Message → GLM Tool Call → tool_call_start event
                           → Executor runs (artifact/image/search)
                           → tool_result event
                           → artifact_complete / image_complete / web_search event
                           → AI Response (streaming)
```

**Security Infrastructure** (Phase 0):
- **Prompt Injection Defense**: Unicode normalization, SQL/HTML pattern detection, sandboxed validation
- **Tool Validator**: Zod schemas, prototype pollution protection, param sanitization
- **Tool Rate Limiter**: Fail-closed circuit breaker, per-tool limits, graceful degradation
- **Execution Tracker**: Resource exhaustion protection (max 3 tools/request), timing metrics
- **Safe Error Handler**: Error sanitization, no stack traces in production, PII filtering

## Model Configuration System

**Critical**: Never hardcode model names — use `MODELS.*` from `supabase/functions/_shared/config.ts`

```typescript
export const MODELS = {
  GEMINI_FLASH: 'google/gemini-2.5-flash-lite',
  GLM_4_6: 'zhipu/glm-4.6',  // Artifact generation via Z.ai API
  GEMINI_FLASH_IMAGE: 'google/gemini-2.5-flash-image'
} as const;
```

**Golden Snapshot Testing**: `model-config.snapshot.json` prevents accidental changes. CI/CD blocks merges if config drifts.

**To update models intentionally**:
1. Update `config.ts`
2. Update `model-config.snapshot.json` (version date + model name)
3. Run `cd supabase/functions && deno task test`

## State Management

**TanStack Query** (primary):
```typescript
export function useChatSessions() {
  return useQuery({
    queryKey: ["chatSessions"],
    queryFn: () => supabase.from("chat_sessions").select("*").order("updated_at", { ascending: false })
  });
}
```

**Key Hooks** (`src/hooks/`): `useChatMessages.tsx`, `useChatSessions.tsx`, `useArtifactVersions.ts`, `useAuthUserRateLimit.ts`

**React Context**: `MultiArtifactContext.tsx` (multi-artifact selection)

## Integrations

### Tavily Web Search

**Location**: `supabase/functions/_shared/tavily-client.ts`

Provides real-time web search and content extraction capabilities for grounded AI responses:

**Features**:
- **AI-Optimized Results**: Tavily API returns search results formatted for LLM consumption
- **Content Extraction**: Full webpage content reading for detailed analysis
- **Cost Tracking**: Built-in analytics for API usage monitoring
- **Retry Logic**: Exponential backoff for resilient requests
- **Context Formatting**: Automatic formatting for injection into AI prompts

**Usage**:
```typescript
import { searchWeb } from './tavily-client.ts';

const results = await searchWeb({
  query: "React hooks best practices",
  max_results: 5,
  include_raw_content: true
});
```

## Feature Flags

Feature flags are split between frontend and Edge Functions:

### Frontend Flags

**Location**: `src/lib/featureFlags.ts`

- `CONTEXT_AWARE_PLACEHOLDERS`: Dynamic input placeholder text based on current mode (disabled)
- `CANVAS_SHADOW_DEPTH`: Visual depth cues for chat card shadows (disabled)
- `SUCRASE_TRANSPILER`: Use Sucrase for artifact transpilation instead of Babel Standalone (enabled)
- `LANDING_PAGE_ENABLED`: Show landing page with scroll-to-app transition on first visit (disabled by default, can be overridden by admin via database setting)

**Usage**:
```typescript
import { isFeatureEnabled, FEATURE_FLAGS } from '@/lib/featureFlags';

if (isFeatureEnabled('CONTEXT_AWARE_PLACEHOLDERS')) {
  // Use context-aware placeholder
}
```

**Note**: `LANDING_PAGE_ENABLED` provides the immediate default value to prevent flash during load. Admins can override via database setting in `/admin` dashboard (stored in `app_settings` table as `landing_page_enabled`).

### Edge Function Flags

**Location**: `supabase/functions/_shared/config.ts` and environment variables

- `RATE_LIMIT_WARNINGS`: Enable rate limit warning responses (env var)
- `USE_REASONING_PROVIDER`: Enable semantic status generation (default: true)
- `USE_GLM_THINKING_FOR_CHAT`: Enable GLM thinking mode (default: true)
- `TAVILY_ALWAYS_SEARCH`: Force web search on all messages (default: false)

## Security

- **Database**: RLS policies, SECURITY DEFINER with `search_path`, JWT auth
- **API**: Guest rate limiting (20/5h), CORS whitelist, input validation
- **XSS**: DOMPurify + Zod schemas + server validation (14 attack scenarios tested)

## Monitoring & Observability

- **Sentry Integration**: Error tracking and performance monitoring
  - Frontend: ✅ **Implemented** - Automatic error capture, source maps for debugging
  - Edge Functions: ❌ **NOT IMPLEMENTED** - Only console logging (see [#380](https://github.com/NickB03/llm-chat-site/issues/380), [#381](https://github.com/NickB03/llm-chat-site/issues/381), [#382](https://github.com/NickB03/llm-chat-site/issues/382))
  - Setup: See `docs/SENTRY_INTEGRATION.md` for frontend configuration
  - **Missing**: ReasoningProvider errors, SafeErrorHandler errors, prompt injection detection
- **AI Usage Tracking**: Comprehensive logging via `ai_usage_logs` table
- **Rate Limit Analytics**: Real-time monitoring of API usage patterns

## Build Optimization

**Code Splitting** (`vite.config.ts`): vendor-react, vendor-ui, vendor-markdown, vendor-query, vendor-supabase

**Features**: Brotli + Gzip, PWA service worker, Terser minification, 52% bundle reduction via externalized prompts

**Cache**: Supabase API (NetworkFirst, 30s), Images (NetworkFirst, 5min), Service Worker (immediate activation)

### CDN Fallback Chain

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

## Demo Video Compression

Demo videos must be compressed before committing to avoid Cloudflare Pages build failures and slow page loads.

**Target**: 2-5 MB for hero/demo videos (max 10 MB)

**FFmpeg Compression Command**:
```bash
ffmpeg -i source.mp4 \
  -c:v libx264 -crf 23 -preset slow \
  -an \
  -movflags +faststart \
  public/Demos/output-compressed.mp4
```

**Parameters**:
| Parameter | Value | Purpose |
|-----------|-------|---------|
| `-c:v libx264` | H.264 codec | Universal browser support |
| `-crf` | 18-28 (lower=better) | Quality level. 23 = good balance, 20 = high quality |
| `-preset slow` | Compression efficiency | Better compression, slower encode |
| `-an` | No audio | Remove audio track (demos don't need it) |
| `-movflags +faststart` | Streaming | Enables progressive playback |

**Resolution** (optional — omit to keep original):
```bash
-vf "scale=1280:-2"   # 720p (smaller file)
-vf "scale=1920:-2"   # 1080p
```

**Video Location**: `public/` — served statically by Vite/Cloudflare

**Best Practices**:
- Only commit compressed versions to `public/`
- Use WebM + MP4 fallback for maximum compression: `<source src="demo.webm">` then `<source src="demo.mp4">`

## Common Patterns

### Session Validation
```typescript
const session = await ensureValidSession();
if (!session) { navigate("/auth"); return; }
```

### Creating Artifacts (AI Response Format)
```xml
<artifact type="application/vnd.ant.react" title="Component Name">
export default function App() { ... }
</artifact>
```

### Adding New Artifact Type
1. **Update type definition** in `src/components/ArtifactContainer.tsx`:
   ```typescript
   export type ArtifactType = "code" | "markdown" | "html" | "svg" | "mermaid" | "react" | "image" | "your-new-type";
   ```
2. **Add renderer logic** in `src/components/ArtifactRenderer.tsx`:
   ```typescript
   if (artifact.type === "your-new-type") {
     return <YourCustomRenderer content={artifact.content} />;
   }
   ```
3. **Update parser** in `src/utils/artifactParser.ts`:
   ```typescript
   const mimeTypeMap: Record<string, ArtifactType> = {
     'application/vnd.ant.react': 'react',
     'text/html': 'html',
     'application/vnd.your-type': 'your-new-type', // Add your MIME type
   };
   ```
4. **Add validation rules** (optional) in `supabase/functions/_shared/artifact-rules/type-selection.ts`
5. **Update tool definition** (optional) in `supabase/functions/_shared/tool-definitions.ts` if the new type should be available via tool calling

### Adding New Edge Function
1. Create `supabase/functions/your-function/index.ts`
2. Use `getCorsHeaders()` and `handleCorsPreflightRequest()` from `_shared/cors-config.ts`
3. Deploy: `supabase functions deploy your-function --project-ref <ref>`

## Git Conventions

### Commit Format
```
<type>: <description>
```
**Types**: `feat` (new feature), `fix` (bug fix), `docs` (documentation), `refactor` (restructure), `test` (tests), `chore` (maintenance)

### PR Checklist
- [ ] Tests pass (`npm run test`)
- [ ] Coverage maintained (`npm run test:coverage`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] Chrome DevTools verification completed
- [ ] No hardcoded model names

## Environment Variables

**Frontend** (`.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `VITE_ENABLE_ANALYTICS`

**Edge Functions** (Supabase Secrets):
- `OPENROUTER_GEMINI_FLASH_KEY` (chat, titles, summaries, fast reasoning)
- `OPENROUTER_GEMINI_IMAGE_KEY` (image generation)
- `GLM_API_KEY` (artifact generation via Z.ai)
- `TAVILY_API_KEY` (web search integration)
- `ALLOWED_ORIGINS` (CORS whitelist, supports wildcards like `https://*.llm-chat-site.pages.dev`)

**Tavily Web Search Configuration**:
- `TAVILY_ALWAYS_SEARCH` - Force web search for ALL chat messages, bypassing smart intent detection (default: false)
  - **WARNING**: Should only be `true` for testing purposes. In production, this increases latency (+2-4s per message) and API costs (1000x increase).
  - See `supabase/functions/_shared/config.ts` TAVILY_CONFIG.ALWAYS_SEARCH_ENABLED for detailed pros/cons

**GLM Thinking Mode**:
- `USE_GLM_THINKING_FOR_CHAT` - Enable GLM-4.6 thinking mode for chat messages (default: true, disable with 'false')
- `USE_REASONING_PROVIDER` - Enable ReasoningProvider for semantic status generation (default: true, disable with 'false')
- Status updates use BOTH `[STATUS:]` markers (legacy) and ReasoningProvider (semantic) - see Dual Status Update System above

**Rate Limiting Configuration** (optional, overrides defaults):
- `RATE_LIMIT_GUEST_MAX` (default: 20 requests per 5 hours)
- `RATE_LIMIT_AUTH_MAX` (default: 100 requests per 5 hours)
- `RATE_LIMIT_ARTIFACT_GUEST_MAX` (default: 5 per 5 hours)
- `RATE_LIMIT_ARTIFACT_AUTH_MAX` (default: 50 per 5 hours)
- `RATE_LIMIT_WARNINGS` (enable/disable rate limit warning toasts)
- And many more - see `supabase/functions/_shared/config.ts` for complete list

## File Structure

```
src/
├── components/
│   ├── ui/                          # 65 UI components (shadcn + custom)
│   ├── prompt-kit/                  # Chat UI primitives
│   ├── ai-elements/                 # AI-powered UI elements
│   ├── demo/                        # Demo components
│   ├── kibo-ui/                     # Custom UI components
│   ├── ArtifactContainer.tsx        # Main artifact wrapper (state, validation, editing)
│   ├── ArtifactRenderer.tsx         # Artifact rendering engine (React, HTML, SVG, Mermaid)
│   ├── ArtifactToolbar.tsx          # Toolbar controls (export, edit, maximize, theme)
│   ├── ArtifactCard.tsx             # Artifact preview cards
│   ├── ArtifactErrorBoundary.tsx    # React error boundary
│   ├── ArtifactErrorRecovery.tsx    # Auto-recovery with fallback renderers
│   ├── ArtifactCodeEditor.tsx       # Inline code editor
│   ├── ArtifactTabs.tsx             # Tab navigation for multi-artifact workspace
│   ├── ArtifactContainer.test.tsx   # Unit tests
│   ├── ArtifactContainer.performance.test.tsx  # Performance benchmarks
│   └── ChatInterface.tsx            # Main chat UI
├── hooks/                           # Data fetching hooks
├── utils/                           # Utilities + __tests__/
│   ├── artifactParser.ts            # XML-tag extraction from AI responses
│   ├── artifactValidator.ts         # Frontend validation layer
│   ├── artifactErrorRecovery.ts     # Error classification & recovery
│   ├── artifactBundler.ts           # Client-side bundling coordinator
│   ├── sucraseTranspiler.ts         # Sucrase transpiler integration
│   └── ...                          # Other utilities
├── pages/                           # Route components (Index, Auth, Landing)
└── integrations/supabase/           # Supabase client + types

supabase/
├── functions/
│   ├── chat/                        # Main chat endpoint
│   │   ├── handlers/                # tool-calling-chat.ts, url-extract.ts
│   │   ├── middleware/              # auth.ts, rateLimit.ts, validation.ts
│   │   └── index.ts                 # Entry point
│   ├── generate-artifact/           # Artifact generation (standalone, legacy)
│   ├── bundle-artifact/             # Server-side npm bundling
│   ├── generate-artifact-fix/       # AI-powered error fixing
│   ├── generate-image/              # Image generation
│   ├── generate-title/              # Session title generation
│   ├── summarize-conversation/      # Context summarization
│   ├── health/                      # Health monitoring
│   ├── admin-analytics/             # Analytics dashboard
│   ├── cache-manager/               # Cache utilities
│   ├── _shared/                     # Shared utilities (35 files)
│   │   ├── artifact-rules/          # Validation rule modules (6 files)
│   │   ├── config.ts                # Central configuration
│   │   ├── glm-client.ts            # GLM-4.6 client
│   │   ├── tool-executor.ts         # Tool execution orchestrator
│   │   ├── artifact-executor.ts     # Artifact executor
│   │   ├── image-executor.ts        # Image executor
│   │   ├── tool-validator.ts        # Tool parameter validation
│   │   ├── reasoning-provider.ts    # Semantic status generation
│   │   └── ...                      # 26 more utilities
│   └── ...                          # Other functions
└── migrations/                      # Database migrations
```

## Troubleshooting

| Issue | Check |
|-------|-------|
| Artifact blank screen | Console errors → `@/` imports → global access → strict mode violations |
| "useRef" null error | Dual React instances → check esm.sh uses `?external=react,react-dom` → verify import map shims |
| "Cannot find module" | tsconfig.json paths → Vitest aliases → `npm install` |
| Edge Function timeout | Function size (<10MB) → Deno URLs → `--no-verify-jwt` → quotas |
| Rate limiting errors | See "Local Dev Rate Limiting" below |
| Migration CI/CD fails | See "Migration Schema Drift" above → `supabase migration list` → repair or pull |
| Edge function "not configured" | Env file in wrong location → See "Edge Functions Environment Setup" below |

### Local Dev Rate Limiting

**Important**: When modifying `supabase/functions/.env`, the Docker-based edge runtime does NOT automatically reload environment variables.

**Symptoms**: Rate limit exceeded errors despite having high limits in `.env` (e.g., `RATE_LIMIT_ARTIFACT_GUEST_MAX=500`)

**Fix**: Restart the edge runtime to pick up new env vars:
```bash
supabase stop && supabase start
# OR restart just the edge runtime:
docker restart supabase_edge_runtime_vznhbocnuykdmjvujaka
```

**Verify env vars are loaded**:
```bash
docker exec supabase_edge_runtime_vznhbocnuykdmjvujaka printenv | grep -iE "RATE_LIMIT"
```

**Reset rate limit counters** (if needed):
```bash
docker exec -i supabase_db_vznhbocnuykdmjvujaka psql -U postgres -c "DELETE FROM guest_rate_limits; DELETE FROM api_throttle;"
```

**Note**: Chat and artifact endpoints share the same `guest_rate_limits` table but use different max values. If env vars aren't loaded, artifact requests fail after just 5 combined requests (production default) instead of 500 (local dev).

### Edge Functions Environment Setup

**Correct file location**: `supabase/functions/.env` (auto-loaded by `supabase start`)

| File | Purpose | Auto-loaded? |
|------|---------|--------------|
| `supabase/functions/.env` | Edge Functions secrets | ✅ Yes |
| `supabase/.env.local` | Legacy/backup location | ❌ No (requires `--env-file`) |
| `.env` (project root) | Frontend Vite vars (`VITE_*`) | N/A |

**Symptoms**: Edge functions fail with "not configured" errors (e.g., image generation fails).

**Verify env vars are loaded**:
```bash
docker exec supabase_edge_runtime_vznhbocnuykdmjvujaka printenv | grep -iE "OPENROUTER|GLM|TAVILY"
```

**Fix** (if env vars missing):
1. Ensure secrets are in `supabase/functions/.env` (not `supabase/.env.local`)
2. Restart Supabase: `supabase stop && supabase start`

**Template**: Copy from `supabase/.env.local.template` to `supabase/functions/.env` and fill in API keys.

**Security**: `supabase/functions/.env` is in `.gitignore` — never commit secrets.

## Performance Targets

| Metric | Target |
|--------|--------|
| FCP | < 1.5s |
| LCP | < 2.5s |
| TTI | < 3.5s |
| CLS | < 0.1 |
| Coverage | 74% current (55% min) |
| Test execution | < 3s (1,048 tests) |
| CI/CD runtime | < 5min |

## Additional Resources

- **GLM-4.6 Capabilities**: `.claude/docs/GLM-4.6-CAPABILITIES.md`
- **Artifact Import Guide**: `.claude/artifact-import-restrictions.md`
- **Chrome MCP Guide**: `.claude/CHROME_MCP_COMMANDS.md`
- **Gemini CLI Context**: `GEMINI.md` — Project context for Gemini CLI PR reviews
- **README**: `README.md`
- **Supabase Docs**: https://supabase.com/docs
- **OpenRouter Docs**: https://openrouter.ai/docs
- **Z.ai Docs**: https://docs.z.ai
