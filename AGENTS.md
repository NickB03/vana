<!-- AGENTS.md | Auto-generated from CLAUDE.md | Last synced: 2026-01-18 -->

# Repository Guidelines for AI Coding Assistants

> ⚠️ **Auto-generated from CLAUDE.md** — Do not edit directly. Run `npm run sync:agents` after editing CLAUDE.md.

This file provides essential guidance for AI coding assistants (Gemini, Cline, Codex, Cursor, etc.). For detailed documentation, see `docs/` directory.

## Project Overview

**Vana** is an AI chat application with interactive artifacts rendered in real-time.

**Tech Stack**: React 18.3.1 + TypeScript 5.8.3 + Vite 5.4.19 + Tailwind + shadcn/ui + Supabase + TanStack Query + Vitest

**Architecture**: See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed system design.

## Quick Start

**Required versions**:
- Node.js v20+, npm v10+, Deno v1.40+, Supabase CLI v1.x, Xcode 15+ (XcodeBuildMCP)

```bash
npm install # Install dependencies
supabase start # Start local Supabase (Docker required)
npm run dev # Dev server on port 8080
```

## ⚡ Quick Reference

| Task | Command/Pattern |
|------|-----------------|
| Dev server | `npm run dev` (port 8080) |
| Kill & restart dev | `lsof -ti:8080 \| xargs kill -9; npm run dev` |
| Run tests | `npm run test` |
| Run integration tests | `npm run test:integration` (requires `supabase start`) |
| Run E2E (local) | `npm run test:e2e:headed` |
| Run E2E (GitHub) | `gh workflow run e2e-manual.yml` |
| Run E2E critical | `gh workflow run e2e-manual.yml -f test_filter="@critical"` |
| Build production | `npm run build` |
| Deploy to production | **PR required** — Auto-deploys via CI/CD when merged to `main` |
| Model names | Always use `MODELS.*` from `config.ts` |
| Artifact imports | NO `@/` imports — use npm packages |
| iOS Simulator UI | Call `describe_ui` before `tap`/`swipe` — never guess coordinates |

## 🎯 MUST Rules (Non-Negotiable)

1. **Package Manager**: Use `npm` only — never Bun/Yarn/pnpm (lock file conflicts)
2. **Browser Verification**: Test in browser after EVERY UI change (open localhost:8080)
3. **Model Configuration**: NEVER hardcode model names! Use `MODELS.*` from `config.ts` ([details](./docs/CONFIGURATION.md#model-configuration))
4. **Artifact Imports**: Cannot use `@/components/ui/*` in artifacts (sandbox isolation - use npm packages instead)
5. **Security DEFINER**: Always include `SET search_path = public, pg_temp` ([details](./docs/DATABASE_SCHEMA.md#security-definer-functions))
6. **CORS**: Never use wildcard `*` origins — use `getCorsHeaders()` ([details](./docs/CONFIGURATION.md#cors-configuration))
7. **Animation**: Only animate new messages, not entire chat history
8. **Routes**: Add new routes ABOVE the `*` catch-all in App.tsx
9. **Critical Files Protection**: NEVER redirect git output to critical files ([why?](./docs/CI_CD.md#critical-files-protection))
10. **Deployment Process**: NEVER deploy directly to production — ALL changes require PR review and automated testing ([workflow](./docs/CI_CD.md#deployment-workflow))
11. **iOS Simulator Automation**: ALWAYS call `describe_ui` before `tap`/`swipe`/`long_press` — coordinates from screenshots are unreliable

## ⚠️ Anti-Patterns

| ❌ DON'T | ✅ DO INSTEAD | WHY |
|----------|---------------|-----|
| `bun install` | `npm install` | Lock file conflicts |
| Skip session validation | `await ensureValidSession()` | Auth errors |
| Import shadcn in artifacts | Use npm Radix UI or Tailwind | Sandbox isolation |
| Animate all messages | Animate last message only | Performance |
| Hardcode model names | Use `MODELS.*` | CI/CD fails |
| Start dev server on 8081+ | Kill 8080 and restart there | Port confusion |
| `git show ... > index.html` | Manual copy | Corrupts file |
| Deploy directly to prod | Create PR → tests → review → merge | Skips safety checks |
| Manual CORS headers | Use `getCorsHeaders()` | Security |
| `tap` without `describe_ui` | Call `describe_ui` first, use returned coordinates | Fragile automation |

## Essential Commands

**Development**:
```bash
npm run dev # Dev server (port 8080)
npm run build # Production build
npm run preview # Preview production build
lsof -ti:8080 | xargs kill -9 2>/dev/null; npm run dev # Kill & restart
```

**Testing**:
```bash
npm run test # Unit tests
npm run test -- --watch # Watch mode
npm run test:integration # Integration tests (requires `supabase start`)
npm run test:coverage # Coverage (55% min)
```
Integration tests location: `supabase/functions/_shared/__tests__/` and `src/hooks/__tests__/*.integration.test.ts`

**Integration Test Setup**:
- Start local Supabase: `supabase start`
- Credentials are automatically fetched from `supabase status`
- No manual JWT/key configuration needed for local development
- CI uses environment variables which take precedence over defaults

**Deployment**:
- **Production**: Automatic deployment via CI/CD when PR is merged to `main`
- **Never deploy directly** — All changes require PR review and testing
- See [CI_CD.md](./docs/CI_CD.md) for deployment workflow details

**Pre-deployment Checklist**:
```bash
npm run test # All tests must pass
npm run test:integration # Integration tests must pass
npm run build # Production build must succeed
npm run test:e2e:headed # E2E tests must pass (critical paths)
```

## Quick Architecture Reference

**AI Models** ([full architecture](./docs/ARCHITECTURE.md)):
- **Chat/Artifacts/Query Rewrite**: Gemini 3 Flash (OpenRouter, 1M context)
- **Titles/Summaries**: Gemini 2.5 Flash Lite (OpenRouter, fast & cheap)
- **Image Generation**: Gemini 2.5 Flash Image (OpenRouter)
- **Chat Fallback**: Gemini 2.5 Flash Lite (OpenRouter, circuit breaker only)

**Artifact System** ([details](./docs/ARTIFACT_SYSTEM.md)):
- **Rendering**: Vanilla Sandpack (CodeSandbox runtime) — instant, zero-config
- **Storage**: Database persistence in `artifact_versions` table (not XML embedding)
- **Error Handling**: Natural error surfacing in Sandpack console + "Ask AI to Fix" button
- **Package Support**: React, Recharts, Framer Motion, Lucide, Radix UI

**Tool Calling** ([details](./docs/TOOL_CALLING_SYSTEM.md)):
- `generate_artifact` → Gemini 3 Flash
- `generate_image` → Gemini Flash Image
- `browser.search` → Tavily

## Quick Troubleshooting

| Issue | Quick Fix |
|-------|-----------|
| Artifact errors | Check Sandpack console → avoid `@/` imports → use "Ask AI to Fix" button |
| Rate limiting errors | Restart edge runtime → [guide](./docs/TROUBLESHOOTING.md#rate-limiting-issues) |
| Edge Function timeout | Check function size/quotas → [guide](./docs/TROUBLESHOOTING.md#build-development-issues) |
| XcodeBuildMCP "describe_ui not called" warning | Call `describe_ui` before `tap`/`swipe` to get accurate coordinates |

**Full guide**: [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

## Essential Patterns

**Session validation**:
```typescript
const session = await ensureValidSession();
if (!session) { navigate("/auth"); return; }
```

**Creating artifacts**:
```xml
<artifact type="react" title="Component Name">
export default function App() { ... }
</artifact>
```

**iOS Simulator automation** (XcodeBuildMCP):
```
1. describe_ui → Get accessibility tree with element frames
2. Find target element → Locate button/field in returned JSON
3. tap/swipe/type → Use exact coordinates or id/label from describe_ui
```
Prefer `tap({ id: "accessibilityId" })` or `tap({ label: "Button Text" })` over raw coordinates.

**More patterns**: [DEVELOPMENT_PATTERNS.md](./docs/DEVELOPMENT_PATTERNS.md)

## Configuration

**Environment setup**: [CONFIGURATION.md](./docs/CONFIGURATION.md)

**Key secrets** (Supabase):
- `OPENROUTER_GEMINI_FLASH_KEY` (artifacts, chat, titles, summaries)
- `OPENROUTER_GEMINI_IMAGE_KEY` (images)
- `TAVILY_API_KEY` (search)

**Feature flags**: [CONFIGURATION.md](./docs/CONFIGURATION.md#feature-flags)

## File Structure

```
src/
├── components/ # UI components + artifact system
├── hooks/ # TanStack Query hooks
├── utils/ # Utilities + tests
├── pages/ # Route components
└── integrations/ # Supabase client

supabase/
├── functions/ # Edge Functions
│ ├── chat/ # Main chat endpoint
│ ├── _shared/ # Shared utilities
│ └── ... # Other functions
└── migrations/ # Database schema
```

**Full structure**: [DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)

## Git Conventions

**Commit format**: `<type>: <description>`
**Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**PR Checklist** (Required before merge):
- [ ] All unit tests pass (`npm run test`)
- [ ] Integration tests pass (`npm run test:integration`)
- [ ] E2E critical paths pass (`npm run test:e2e:headed`)
- [ ] Production build succeeds (`npm run build`)
- [ ] Test coverage maintained (≥55%)
- [ ] No TypeScript errors
- [ ] Browser verification completed (test UI changes at localhost:8080)
- [ ] No hardcoded model names (use `MODELS.*`)
- [ ] Database migrations tested locally (if applicable)
- [ ] Edge Functions tested locally (if applicable)

## Performance Targets

| Metric | Target |
|--------|--------|
| FCP | < 1.5s |
| LCP | < 2.5s |
| Coverage | 55% min |
| CI/CD | < 5min |

## Additional Resources

**Core Documentation** (in `docs/` directory):
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System design & reasoning provider
- [ARTIFACT_SYSTEM.md](./docs/ARTIFACT_SYSTEM.md) — Vanilla Sandpack rendering, package whitelist, error handling
- [DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) — Tables, RPC functions, security
- [TOOL_CALLING_SYSTEM.md](./docs/TOOL_CALLING_SYSTEM.md) — Tool execution architecture
- [CONFIGURATION.md](./docs/CONFIGURATION.md) — Models, feature flags, env vars
- [INTEGRATIONS.md](./docs/INTEGRATIONS.md) — Tavily, CDN fallback
- [CI_CD.md](./docs/CI_CD.md) — CI/CD, optimization, deployment
- [DEVELOPMENT_PATTERNS.md](./docs/DEVELOPMENT_PATTERNS.md) — Development recipes
- [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) — Debugging guide
- [TESTING_STRATEGY.md](./docs/TESTING_STRATEGY.md) — Testing strategy, E2E & integration tests

**Specialized Guides**:
- [Gemini 3 Flash Guide](./docs/GEMINI_3_FLASH_GUIDE.md) — Model specs, thinking modes, tool calling
- [Architecture Diagrams](./docs/ARCHITECTURE_DIAGRAMS.md) — Visual system design diagrams

**External**:
- [Supabase Docs](https://supabase.com/docs)
- [OpenRouter Docs](https://openrouter.ai/docs)
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)
