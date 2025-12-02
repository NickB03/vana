<!-- CLAUDE.md v2.7 | Last updated: 2025-12-01 | Added SSE streaming architecture for artifact generation -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Vana** is a production AI-powered development assistant that transforms natural language into interactive code, React components, diagrams, and images in real-time. Built with React 18, TypeScript, Vite, Supabase (PostgreSQL + Edge Functions), and multiple AI models via OpenRouter and Google AI Studio.

**Tech Stack**: React 18.3 + TypeScript 5.8 + Vite 5.4 + Tailwind CSS + shadcn/ui + Supabase + TanStack Query + Vitest

## ⚡ Quick Reference

| Task | Command/Pattern |
|------|-----------------|
| Start dev server | `npm run dev` (port 8080) |
| Run all tests | `npm run test` |
| Run specific test | `npm run test -- path/to/file.test.ts` |
| Check coverage | `npm run test:coverage` (55% threshold) |
| Deploy staging | `./scripts/deploy-simple.sh staging` |
| Deploy production | `./scripts/deploy-simple.sh prod` |
| Model names | Always use `MODELS.*` from `_shared/config.ts` |
| Artifact imports | NO `@/` imports — use npm packages or Tailwind |
| Chrome MCP | `chrome-mcp start` / `/chrome-status` |

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

## Chrome DevTools MCP Setup

```bash
chrome-mcp start|status|restart  # Manage Chrome instance
```

**Slash commands**: `/chrome-status`, `/chrome-restart`, `/kill-chromedev`

**Screenshots** (file-based to avoid MCP serialization bug):
```bash
./scripts/take-screenshot.sh "description"
# Or: take_screenshot({ filePath: ".screenshots/name.png", format: "png" })
```

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

### Testing (692 tests, 74% coverage)
```bash
npm run test                  # Run all tests
npm run test -- --watch       # Watch mode
npm run test:coverage         # Coverage report (55% threshold)
npm run test -- path/to/test  # Specific file
```

### Deployment
```bash
./scripts/deploy-simple.sh staging|prod  # prod requires confirmation
supabase functions deploy <name> --project-ref <ref>  # Individual function
```

## Architecture

### Multi-Model AI System

| Function | Model | Provider | Notes |
|----------|-------|----------|-------|
| Chat/Summaries/Titles | Gemini 2.5 Flash Lite | OpenRouter | Single key, unlimited |
| Artifact Generation | GLM-4.6 | Z.ai API | Thinking mode enabled, streams reasoning |
| Artifact Error Fixing | GLM-4.6 | Z.ai API | Deep reasoning for debugging |
| Fast Reasoning (parallel) | Gemini 2.5 Flash Lite | OpenRouter | 2-4s, shows while artifact generates |
| Image Generation | Gemini Flash-Image | Google AI Studio | 10-key rotation, 150 RPM |

### Edge Function Decision Tree

| Scenario | Function | Model |
|----------|----------|-------|
| User sends chat message | `chat/` | Gemini Flash Lite |
| User requests artifact | `generate-artifact/` | GLM-4.6 (Z.ai) |
| Fast reasoning (parallel) | `generate-reasoning/` | Gemini Flash Lite |
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
- **Bundle timeout**: Increased to 60 seconds for large dependency trees

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

**Key Tables**: `chat_sessions`, `chat_messages`, `guest_rate_limits`, `ai_usage_tracking`, `message_feedback`, `response_quality_logs`

```sql
chat_sessions(id, user_id, title, first_message, conversation_summary, created_at, updated_at)
chat_messages(id, session_id, role, content, reasoning, search_results, token_count, created_at)
guest_rate_limits(id, identifier, request_count, window_start, last_request_at)
message_feedback(id, message_id, session_id, feedback_type, created_at)
response_quality_logs(id, session_id, quality_score, latency_ms, model, created_at)
```

**Security**: All tables have RLS policies. SECURITY DEFINER functions use `SET search_path = public, pg_temp`.

Full schema: `supabase/migrations/`

### Edge Functions (`supabase/functions/`)

| Function | Purpose |
|----------|---------|
| `chat/` | Main chat streaming with handlers/ and middleware/ |
| `generate-artifact/` | Artifact generation with GLM-4.6 + SSE streaming + validation |
| `generate-reasoning/` | Fast parallel reasoning (deprecated, now integrated in generate-artifact) |
| `bundle-artifact/` | Server-side npm bundling (Radix UI, framer-motion) |
| `generate-artifact-fix/` | Error fixing with GLM-4.6 deep reasoning |
| `generate-title/` | Session title generation |
| `generate-image/` | AI image generation (10-key rotation) |
| `summarize-conversation/` | Context summarization |
| `health/` | System health monitoring |
| `admin-analytics/` | Admin analytics dashboard data |
| `cache-manager/` | Cache management utilities |
| `intent-examples/` | Intent detection examples |

**Shared Utilities** (`_shared/`):
- **Core**: `config.ts`, `cors-config.ts`, `logger.ts`, `validators.ts`
- **AI/Models**: `openrouter-client.ts`, `glm-client.ts`, `model-router.ts`, `complexity-analyzer.ts`, `reasoning-generator.ts`, `glm-reasoning-parser.ts`
- **Context Management**: `context-selector.ts`, `context-ranker.ts`, `token-counter.ts`
- **State/Quality**: `state-machine.ts`, `conversation-state.ts`, `response-quality.ts`
- **Artifacts**: `artifact-validator.ts`, `artifact-rules/`
- **Utilities**: `storage-retry.ts`, `rate-limiter.ts`, `api-error-handler.ts`, `error-handler.ts`
- **Prompts**: `system-prompt-inline.ts`, `system-prompt.txt`
- **Integrations**: `tavily-client.ts` (web search)

## GLM-4.6 API Reference

GLM-4.6 powers artifact generation via Z.ai. Key implementation details:

**API Endpoint**: `https://api.z.ai/api/coding/paas/v4/chat/completions` (Coding Plan only)

**Critical Streaming Behavior**: GLM streams `reasoning_content` FIRST, then `content`:
```
1. [reasoning_content chunks] → thinking process (displayed in UI)
2. [content chunks] → actual artifact code
3. [DONE]
```

**Request Parameters**:
```json
{
  "model": "glm-4.6",
  "thinking": { "type": "enabled" },  // Required for reasoning
  "stream": true,
  "temperature": 1.0,  // GLM-recommended default
  "max_tokens": 8000
}
```

**Error Handling**: 429 = rate limited (check Retry-After header), 503 = retry with backoff

**SSE Streaming (Updated 2025-12-01)**: Artifact generation uses real-time SSE streaming:
- **Event types**: `reasoning_chunk`, `reasoning_complete`, `content_chunk`, `artifact_complete`, `error`
- **Frontend**: `useChatMessages.tsx` handles EventSource, `ReasoningDisplay.tsx` shows Claude-style ticker
- **Key fix**: Artifact code no longer appears as raw text in chat during generation

**Full Documentation**: `.claude/docs/GLM-4.6-CAPABILITIES.md`

## Model Configuration System

**Critical**: Never hardcode model names — use `MODELS.*` from `supabase/functions/_shared/config.ts`

```typescript
export const MODELS = {
  GEMINI_FLASH: 'google/gemini-2.5-flash-lite',
  GLM_4_6: 'zhipu/glm-4.6',  // Artifact generation via Z.ai API
  KIMI_K2: 'moonshotai/kimi-k2-thinking',  // @deprecated - use GLM_4_6
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

## Security

- **Database**: RLS policies, SECURITY DEFINER with `search_path`, JWT auth
- **API**: Guest rate limiting (20/5h), CORS whitelist, input validation
- **XSS**: DOMPurify + Zod schemas + server validation (14 attack scenarios tested)

## Build Optimization

**Code Splitting** (`vite.config.ts`): vendor-react, vendor-ui, vendor-markdown, vendor-query, vendor-supabase

**Features**: Brotli + Gzip, PWA service worker, Terser minification, 52% bundle reduction via externalized prompts

**Cache**: Supabase API (NetworkFirst, 30s), Images (NetworkFirst, 5min), Service Worker (immediate activation)

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
1. Update `ArtifactType` in `src/components/Artifact.tsx`
2. Add renderer logic in `Artifact` component
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
- `GLM_API_KEY` (artifact generation via Z.ai)
- `GOOGLE_KEY_1` through `GOOGLE_KEY_10` (image generation)
- `ALLOWED_ORIGINS` (CORS)

## File Structure

```
src/
├── components/
│   ├── ui/                    # 69 shadcn components
│   ├── prompt-kit/            # Chat UI primitives
│   ├── Artifact.tsx           # Main artifact renderer
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
docker exec -i supabase_db_vznhbocnuykdmjvujaka psql -U postgres -c "DELETE FROM guest_rate_limits; DELETE FROM api_throttle_state;"
```

**Note**: Chat and artifact endpoints share the same `guest_rate_limits` table but use different max values. If env vars aren't loaded, artifact requests fail after just 5 combined requests (production default) instead of 500 (local dev).

## Performance Targets

| Metric | Target |
|--------|--------|
| FCP | < 1.5s |
| LCP | < 2.5s |
| TTI | < 3.5s |
| CLS | < 0.1 |
| Coverage | 55% min (current: 74%) |
| Test execution | < 3s |
| CI/CD runtime | < 5min |

## Glossary

| Term | Definition |
|------|------------|
| **Artifact** | Interactive component rendered in isolated iframe sandbox |
| **Edge Function** | Serverless Deno function on Supabase |
| **Golden Snapshot** | Test pattern comparing config against known-good baseline |
| **RLS** | Row-Level Security — PostgreSQL per-user data access |
| **SSE** | Server-Sent Events — streaming protocol for chat |
| **OpenRouter** | API aggregator for multiple AI models |

## Additional Resources

- **GLM-4.6 Capabilities**: `.claude/docs/GLM-4.6-CAPABILITIES.md`
- **Artifact Import Guide**: `.claude/artifact-import-restrictions.md`
- **Chrome MCP Guide**: `.claude/CHROME_MCP_COMMANDS.md`
- **README**: `README.md`
- **Supabase Docs**: https://supabase.com/docs
- **OpenRouter Docs**: https://openrouter.ai/docs
- **Z.ai Docs**: https://docs.z.ai
