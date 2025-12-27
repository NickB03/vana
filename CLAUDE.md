<!-- CLAUDE.md v2.22 | Last updated: 2025-12-26 | Fixed UI component count, clarified feature flags, added Chrome MCP guide -->

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

**Implementation**: See `supabase/functions/chat/handlers/tool-calling-chat.ts` (lines 464-475) where both systems process reasoning chunks in parallel.

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

**Rendering Methods**:
- **Babel Standalone** (instant) — No npm imports, uses UMD globals (window.React)
- **Server Bundling** (2-5s) — Has npm imports, uses `bundle-artifact/` Edge Function

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

**Shared Utilities** (`_shared/`):
- **Core**: `config.ts`, `cors-config.ts`, `logger.ts`, `validators.ts`
- **AI/Models**: `openrouter-client.ts`, `glm-client.ts`
- **Unified Tool System** (Issue #340): `tool-definitions.ts`, `tool-executor.ts`, `artifact-executor.ts`, `image-executor.ts`
- **Tool Security** (Phase 0): `tool-validator.ts`, `tool-rate-limiter.ts`, `tool-execution-tracker.ts`, `prompt-injection-defense.ts`, `safe-error-handler.ts`
- **Context Management**: `context-selector.ts`, `context-ranker.ts`, `token-counter.ts`
- **Artifacts**: `artifact-validator.ts`, `artifact-rules/`, `prebuilt-bundles.ts`
- **Utilities**: `storage-retry.ts`, `rate-limiter.ts`, `api-error-handler.ts`, `error-handler.ts`, `cdn-fallback.ts`
- **Prompts**: `system-prompt-inline.ts`, `system-prompt.txt`
- **Integrations**: `tavily-client.ts` (web search)

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

**Usage**:
```typescript
import { isFeatureEnabled, FEATURE_FLAGS } from '@/lib/featureFlags';

if (isFeatureEnabled('CONTEXT_AWARE_PLACEHOLDERS')) {
  // Use context-aware placeholder
}
```

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
1. Update `ArtifactType` in `src/components/ArtifactContainer.tsx`
2. Add renderer logic in `ArtifactContainer` component
3. Update parser in `src/utils/artifactParser.ts`

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
│   ├── ui/                    # 65 UI components (shadcn + custom)
│   ├── prompt-kit/            # Chat UI primitives
│   ├── ai-elements/           # AI-powered UI elements
│   ├── demo/                  # Demo components
│   ├── kibo-ui/               # Custom UI components
│   ├── ArtifactContainer.tsx  # Main artifact wrapper (state, validation, editing)
│   ├── ArtifactRenderer.tsx   # Artifact rendering logic
│   └── ChatInterface.tsx      # Main chat UI
├── hooks/                     # Data fetching hooks
├── utils/                     # Utilities + __tests__/
├── pages/                     # Route components (Index, Auth, Landing)
└── integrations/supabase/     # Supabase client + types

supabase/
├── functions/
│   ├── chat/                  # handlers/, middleware/, index.ts
│   ├── generate-artifact/     # Artifact generation
│   ├── bundle-artifact/       # npm bundling
│   ├── _shared/               # Shared utilities
│   └── ...                    # Other functions
└── migrations/                # Database migrations
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
| Edge function "not configured" | `.env.local` not loaded → See "Edge Functions .env.local Not Loading" below |

### Local Dev Rate Limiting

**Important**: When modifying `supabase/.env.local`, the Docker-based edge runtime does NOT automatically reload environment variables.

**Symptoms**: Rate limit exceeded errors despite having high limits in `.env.local` (e.g., `RATE_LIMIT_ARTIFACT_GUEST_MAX=500`)

**Fix**: Restart the edge runtime to pick up new env vars:
```bash
supabase stop && supabase start
# OR restart just the edge runtime:
docker restart supabase_edge_runtime_vznhbocnuykdmjvujaka
```

**Verify env vars are loaded**:
```bash
docker inspect supabase_edge_runtime_vznhbocnuykdmjvujaka | grep -E "RATE_LIMIT"
```

**Reset rate limit counters** (if needed):
```bash
docker exec -i supabase_db_vznhbocnuykdmjvujaka psql -U postgres -c "DELETE FROM guest_rate_limits; DELETE FROM api_throttle;"
```

**Note**: Chat and artifact endpoints share the same `guest_rate_limits` table but use different max values. If env vars aren't loaded, artifact requests fail after just 5 combined requests (production default) instead of 500 (local dev).

### Edge Functions .env.local Not Loading

**Symptoms**: Edge functions fail with "not configured" errors (e.g., image generation fails). API keys in `supabase/.env.local` are not being read by the edge runtime container.

**Cause**: `supabase start` sometimes fails to load `.env.local` into the Docker edge runtime container. The integrated edge runtime expects auto-discovery but path resolution can fail.

**Verify the problem**:
```bash
# Check if API keys are loaded in the container
docker exec supabase_edge_runtime_vznhbocnuykdmjvujaka printenv | grep -iE "OPENROUTER|GLM|TAVILY"
# If empty, env vars are NOT loaded
```

**Fix**: Use `supabase functions serve` with explicit `--env-file` flag instead of the integrated edge runtime:
```bash
# 1. Stop the integrated edge runtime (keep other services running)
docker stop supabase_edge_runtime_vznhbocnuykdmjvujaka

# 2. Start functions serve with explicit env file
supabase functions serve --env-file supabase/.env.local
```

**Convenience alias** (add to shell profile):
```bash
alias supabase-functions='docker stop supabase_edge_runtime_vznhbocnuykdmjvujaka 2>/dev/null; supabase functions serve --env-file supabase/.env.local'
```

**Why this happens**: The integrated edge runtime in `supabase start` uses Docker volume mounts and automatic env file discovery. Path resolution issues can cause `.env.local` to not be found, especially if:
- Working directory changed during Supabase startup
- Multiple Supabase projects on the system
- Previous `.env.local` location cached incorrectly

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
