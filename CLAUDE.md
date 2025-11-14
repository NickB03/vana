# AI Chat Assistant - Project Instructions

AI-powered chat application with real-time streaming, artifact rendering, image generation. It is being built as a personal project focused on high quality and secure but may not require the same code standards as an enterprise application.

## 🚀 Quick Start

```bash
npm install          # Install dependencies (npm only!)
chrome-mcp start     # Start Chrome debug instance (first time)
npm run dev          # Start dev server → http://localhost:8080
npm run build        # Production build
npm run test         # Run tests with Vitest
```

**Stack**: Vite + React 18.3 + TypeScript 5.8 + shadcn/ui + Tailwind + Supabase + Motion/React

### Chrome DevTools MCP Setup
```bash
# Prevent duplicate browser instances
chrome-mcp start     # Start single Chrome instance
chrome-mcp status    # Check if running
chrome-mcp restart   # Clean restart if issues occur
```

**Slash commands** (in Claude Code):
- `/chrome-status` - Check Chrome MCP status and resources
- `/chrome-restart` - Gentle restart of Chrome instance
- `/kill-chromedev` - Nuclear option: kill all processes and restart clean

**Guides**: `.claude/chrome-mcp-setup.md` | `.claude/CHROME_MCP_COMMANDS.md`

## 🎯 MUST Rules (Non-Negotiable)

1. **Package Manager**: Use `npm` only. Never use Bun/Yarn/pnpm (creates lock file conflicts)
2. **Session Validation**: Always call `await ensureValidSession()` before DB operations
3. **Browser Verification**: Test with Chrome DevTools MCP after EVERY change
4. **Route Order**: Add new routes ABOVE the `*` catch-all in App.tsx
5. **Artifact Imports**: **CRITICAL** - Cannot use `@/components/ui/*` in artifacts (use Radix UI primitives)
   - System has 5-layer defense against invalid imports
   - See `.claude/artifact-import-restrictions.md` for complete guide
   - Auto-transformation fixes most common mistakes
6. **Animation Performance**: Only animate new messages, not entire chat history
7. **Security DEFINER Functions**: Always include `SET search_path = public, pg_temp` to prevent schema injection
8. **CORS Configuration**: Never use wildcard `*` origins in production (use `supabase/functions/_shared/cors-config.ts`)
9. **Deployment**: Run verification script before marking deployment complete
10. **Artifact Prompts**: Use structured format (Context → Task → Requirements → Output) for better AI generation
11. **Shared Utilities**: Use centralized modules in `supabase/functions/_shared/` for common patterns

## 🏗️ Architecture Overview

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui (69 components)
│   ├── prompt-kit/     # Chat UI primitives
│   ├── landing/        # Landing page sections
│   ├── ChatInterface   # Main chat UI + streaming
│   ├── Artifact        # Renders code/HTML/React/Mermaid
│   └── VirtualizedMessageList  # Optimized for 100+ messages
├── hooks/              # Custom React hooks
│   ├── useChatMessages # Message CRUD + streaming
│   └── useChatSessions # Session management
├── utils/              # Utilities
│   ├── artifactParser  # Extract artifacts from AI
│   └── artifactValidator # Security validation
└── pages/              # Route components

supabase/functions/
├── _shared/            # Shared Edge Function utilities
│   ├── config.ts       # Centralized configuration constants
│   ├── error-handler.ts # Standardized error responses
│   ├── rate-limiter.ts  # Rate limiting service
│   ├── validators.ts    # Request validation utilities
│   ├── cors-config.ts   # CORS configuration
│   ├── gemini-client.ts # Google AI client wrapper
│   ├── openrouter-client.ts # OpenRouter client wrapper
│   └── __tests__/       # Comprehensive test suite
├── chat/               # Chat streaming endpoint
├── generate-artifact/  # Artifact generation
├── generate-image/     # Image generation
├── admin-analytics/    # Usage analytics dashboard
└── [other functions]
```

## 💻 Common Workflows

### Add a New Page
```typescript
// 1. Create component in src/pages/MyPage.tsx
export default function MyPage() { return <div>...</div> }

// 2. Add route in App.tsx (ABOVE catch-all)
<Route path="/my-page" element={<AnimatedRoute><MyPage /></AnimatedRoute>} />

// 3. Verify in browser
await browser.navigate({ url: "http://localhost:8080/my-page" })
```

### Create an Artifact
```xml
<artifact type="application/vnd.ant.react" title="Component Name">
export default function Component() {
  return <Button>Click me</Button>
}
</artifact>
```
Types: `code` | `html` | `react` | `svg` | `mermaid` | `markdown`

### Session Validation Pattern
```typescript
const session = await ensureValidSession();
if (!session) {
  toast({ title: "Authentication required", variant: "destructive" });
  navigate("/auth");
  return;
}
// Proceed with authenticated operation
```

### Browser Verification (CRITICAL)
```typescript
// After ANY code change:
await browser.navigate({ url: "http://localhost:8080" });
const errors = await browser.getConsoleMessages({ onlyErrors: true });
await browser.screenshot({ filename: "verification.png" });
```

## ⚠️ Anti-Patterns (Never Do This)

| ❌ DON'T | ✅ DO INSTEAD | WHY |
|----------|---------------|-----|
| `bun install` | `npm install` | Prevents lock file conflicts |
| Skip session validation | `await ensureValidSession()` | Prevents auth errors |
| Import shadcn in artifacts | Use Radix UI + Tailwind | Local imports unavailable |
| Animate all messages | Animate last message only | Performance (100+ msgs) |
| Deploy without verification | Run Chrome DevTools checks | Catches runtime errors |
| Add routes after `*` | Add ABOVE catch-all | Routes never reached |
| Use console.log in production | Remove or use dev only | Stripped by Terser |
| Duplicate error handling | Use `createErrorResponse()` | Consistency & maintenance |
| Manual CORS headers | Use `corsHeaders` from config | Security & standardization |

## 🔧 Key Patterns & Components

### Edge Function Shared Utilities (Nov 2025)

**Status:** ✅ Production Ready

Centralized utilities for consistent error handling, validation, and configuration across all Edge Functions:

**Core Modules:**
- `config.ts` - Centralized configuration constants and environment variables
- `error-handler.ts` - Standardized error response formatting
- `validators.ts` - Reusable request validation (auth, JSON, content length)
- `rate-limiter.ts` - Rate limiting service with IP tracking

**Usage Example:**
```typescript
import { createErrorResponse } from '../_shared/error-handler.ts';
import { validateAuthUser, validateJsonRequest } from '../_shared/validators.ts';
import { CONFIG } from '../_shared/config.ts';
import { RateLimiter } from '../_shared/rate-limiter.ts';

// Validate authentication
const user = await validateAuthUser(req);

// Validate JSON body
const body = await validateJsonRequest(req);

// Check rate limits
const rateLimiter = new RateLimiter(supabaseClient);
await rateLimiter.checkLimit(user.id, 'chat', CONFIG.RATE_LIMITS.CHAT);

// Return standardized errors
return createErrorResponse('Invalid request', 400, { field: 'message' });
```

**Benefits:**
- **DRY Principle**: Eliminates duplicate code across 10+ Edge Functions
- **Consistency**: Standardized error messages and validation
- **Maintainability**: Changes propagate to all functions automatically
- **Testing**: Centralized logic easier to test comprehensively
- **Type Safety**: Full TypeScript support with interfaces

**Testing:**
- ✅ 100% test coverage for shared utilities
- ✅ Unit tests for each module (`__tests__/`)
- ✅ Integration tests for cross-module interactions
- ✅ GitHub Actions CI/CD workflow
- ✅ Deno test runner with coverage reporting

**Documentation:**
- `.claude/REFACTORING_TEST_PLAN.md` - Comprehensive testing strategy
- `.claude/TESTING_QUICK_REFERENCE.md` - Quick command reference
- `.claude/REFACTORING_TEST_SUITE_SUMMARY.md` - Test suite overview
- `supabase/functions/_shared/__tests__/README.md` - Developer guide

### Testing Infrastructure (Nov 2025)

**Status:** ✅ Production Ready

**Frontend Testing (Vitest):**
- **293 tests passing**, 27 skipped (320 total)
- **Coverage**: 74.21% statements (exceeds 55% threshold by 19%)
- **Runtime**: 2.43s
- **Key areas**: Artifact system (98% coverage), XSS security (9 scenarios), performance benchmarks

**Edge Function Testing (Deno):**
- **213 tests** across 5 suites, 90%+ coverage, <5s runtime
- **Organization**: `supabase/functions/_shared/__tests__/`
- **Commands**: `deno task test`, `deno task test:watch`, `deno task test:coverage`

**CI/CD Pipeline (GitHub Actions):**
- **Workflow**: `.github/workflows/frontend-quality.yml`
- **Stages**: Lint → Test → Coverage → Build (~2-3min total)
- **Codecov**: Automatic coverage upload, PR comments, trend tracking
- **Branch Protection**: Requires passing checks + 1 approval before merge

**Running Tests:**
```bash
# Frontend (Vitest)
npm run test             # Run all tests
npm run test:coverage    # Generate coverage report
npm run test:ui          # Interactive UI

# Edge Functions (Deno)
cd supabase/functions/_shared/__tests__
./run-tests.sh           # Full suite with coverage
deno test --watch        # Watch mode
```

**Quality Metrics:**
| Metric | Current | Threshold | Status |
|--------|---------|-----------|--------|
| Statements | 74.21% | 55% | ✅ +19% |
| Branches | 68.58% | 50% | ✅ +18% |
| Functions | 65.81% | 55% | ✅ +11% |
| Lines | 74.29% | 55% | ✅ +19% |

### AI Elements Integration (Nov 2025)

**Status:** ✅ Production Ready

The application uses **ai-elements** library components for professional artifact rendering with browser-style controls:

**Core Components:**
- `Artifact` - Composable container with header, actions, and content areas
- `WebPreview` - Browser-style preview with navigation bar and URL display

**Implementation:**
- `src/components/ai-elements/artifact.tsx` (144 lines, 8 sub-components)
  - `Artifact`, `ArtifactHeader`, `ArtifactTitle`, `ArtifactDescription`, `ArtifactContent`, `ArtifactActions`, `ArtifactAction`, `ArtifactClose`

- `src/components/ai-elements/web-preview.tsx` (263 lines, 6 sub-components)
  - `WebPreview`, `WebPreviewNavigation`, `WebPreviewUrl`, `WebPreviewBody`, `WebPreviewConsole`, `WebPreviewNavigationButton`

**Usage Example:**
```tsx
// Artifact container with actions
<Artifact>
  <ArtifactHeader>
    <ArtifactTitle>Interactive Chart</ArtifactTitle>
    <ArtifactActions>
      <ArtifactAction icon={Copy} tooltip="Copy code" onClick={handleCopy} />
      <ArtifactAction icon={Download} tooltip="Download" onClick={handleDownload} />
    </ArtifactActions>
  </ArtifactHeader>
  <ArtifactContent>
    {/* Artifact content */}
  </ArtifactContent>
</Artifact>

// HTML/React artifacts with WebPreview
<WebPreview defaultUrl="about:blank">
  <WebPreviewNavigation>
    <WebPreviewNavigationButton tooltip="Refresh" onClick={handleRefresh}>
      <RefreshCw className="h-4 w-4" />
    </WebPreviewNavigationButton>
    <WebPreviewUrl />
    <WebPreviewNavigationButton tooltip="Full screen" onClick={handleFullScreen}>
      <Maximize2 className="h-4 w-4" />
    </WebPreviewNavigationButton>
  </WebPreviewNavigation>
  <WebPreviewBody srcDoc={htmlContent} sandbox="allow-scripts allow-same-origin" />
</WebPreview>
```

**Features:**
- Composable sub-components for flexible layouts
- Built-in tooltip support via shadcn/ui
- Browser-style navigation controls (refresh, full-screen)
- URL bar display (shows "about:blank" for inline content)
- Loading states with skeleton fallbacks
- Secure iframe sandboxing
- Theme-aware refresh mechanism
- Accessibility improvements (sr-only labels)

**Architecture:**
- Zero Vercel AI SDK dependencies (pure React primitives)
- 100% backward compatible with existing artifact system
- Minimal integration (UI chrome only, all logic preserved)
- Uses `srcDoc` for inline HTML (no blob URL memory leaks)

**Testing:**
- ✅ 11/12 test cases passing (mobile testing pending)
- ✅ No regressions in other artifact types
- ✅ Export, validation, error handling preserved
- ✅ Theme switching works correctly

**Known Limitations:**
- Console logging not integrated (use browser DevTools)
- URL bar shows "about:blank" (inline content has no real URL)
- Mobile navigation controls need verification

**Documentation:**
- `.claude/AI_ELEMENTS_INTEGRATION_FINAL.md` - Complete integration history
- `.claude/AI_ELEMENTS_QUICK_REFERENCE.md` - Component API reference
- `.claude/WEBPREVIEW_INTEGRATION_GUIDE.md` - Implementation guide
- `.claude/artifacts.md` (WebPreview section) - Usage patterns

### Artifact System
- **Auto-injected libraries (27+)**: D3, Chart.js, Three.js, GSAP, Lodash, Moment
- **React artifacts include**: Recharts, Framer Motion, lucide-react, Radix UI
- **Validation**: Multi-layer defense system against invalid imports
  - Layer 1: System prompt warnings (pre-generation)
  - Layer 2: Template examples (learn-by-example)
  - Layer 3: Pre-generation validation (request analysis)
  - Layer 4: Post-generation transformation (auto-fix invalid imports)
  - Layer 5: Runtime validation (block rendering if critical errors)
- **Rendering**: ai-elements `Artifact` + `WebPreview` components (see above)
- **Details**: See `.claude/artifacts.md` for complete library list

### Artifact Suggestions UI
- **Display**: 5 cards visible initially on large screens (lg:basis-1/5)
- **Total Pool**: 20 diverse suggestions across 4 categories
  - Image Generation (5 options)
  - Web Apps (5 options)
  - Data Visualization (5 options)
  - Games (5 options)
- **Navigation**: Horizontal carousel with prev/next buttons
- **Responsive**: Adapts from 2 cards (mobile) to 5 cards (desktop)
- **Implementation**: `GalleryHoverCarousel` component in Home.tsx
- **Interaction**: Click any card to populate chat input with prompt
- **Prompt Engineering**: All 20 prompts use structured format (Nov 2025)
  - Context → Task → Requirements → Output structure
  - Explicit library mentions (Radix UI, Recharts, D3, Framer Motion)
  - Clear constraints (no localStorage, no @/ imports)
  - Organized by feature category for better AI parsing

### Artifact Export System (Nov 2025)
- **Export Menu**: Replaced simple download with comprehensive export options
- **Format-Specific Exports**:
  - Copy to clipboard (all artifact types)
  - Download with proper file extension (.jsx, .html, .svg, .mmd, .md)
  - Export HTML as standalone with CDN library injection
  - Export React as JSX component with imports
  - Export Mermaid as rendered SVG or source .mmd file
  - Export with version history (JSON format)
- **Multi-Artifact Support**: ZIP export for artifacts with dependencies
- **Implementation**: `ExportMenu` component integrated into `ArtifactContainer`
- **Dependencies**: jszip for multi-file archives

### Database Schema (Supabase)
```sql
chat_sessions { id, user_id, title, created_at, updated_at }
chat_messages { id, session_id, role, content, created_at }
guest_rate_limits { id, ip_address, request_count, window_start, last_request }
ai_usage_logs { id, user_id, function_name, provider, model, tokens, cost, latency, created_at }
intent_examples { id, intent, text, embedding, created_at }
```

**Security Features:**
- ✅ Row-Level Security (RLS) enforces user-scoped access
- ✅ All SECURITY DEFINER functions use `search_path = public, pg_temp`
- ✅ Guest rate limiting: 10 requests per 24-hour window (IP-based)
- ✅ CORS origin validation (no wildcard `*` in production)
- ✅ Check security status: `get_advisors({ type: "security" })`

### Performance Optimizations
- Virtual scrolling for long chats (100+ messages)
- React Query: 5min stale, 10min cache time
- Lazy loaded routes with React.lazy()
- Code splitting: react, ui, markdown, query, supabase
- Service worker with NetworkFirst for API, 5min cache for images
- Landing page optimizations (lazy loading, reduced animations on mobile)
- Shader background performance improvements

### Animation System (motion/react)
- **Durations**: fast (150ms), normal (200ms), moderate (300ms), slow (500ms)
- **Route transitions**: fadeInUp pattern, 300ms, sync mode
- **Message animations**: Only new messages to prevent lag
- **Accessibility**: `motion-safe:` prefix respects user preferences
- **Landing page**: Reduced motion on mobile, optimized scroll effects

## 🛠️ MCP Tools Integration

### Chrome DevTools MCP (Browser Automation)
```typescript
// Navigation & screenshots
await browser.navigate({ url: "http://localhost:8080" })
await browser.screenshot({ filename: "test.png" })

// Console & network monitoring
await browser.getConsoleMessages({ onlyErrors: true })
await browser.getNetworkRequests()

// Performance analysis
await browser.startTrace()
const metrics = await browser.stopTrace()
```
**Full guide**: `.claude/mcp-chrome-devtools.md`

### Supabase MCP (Database & Functions)
```typescript
// Migrations (DDL)
await apply_migration({ name: "add_table", query: "CREATE TABLE..." })

// Queries (DML)
await execute_sql({ query: "SELECT * FROM chat_sessions" })

// After migrations
await get_advisors({ type: "security" })  // Check for RLS issues
```
**Full guide**: `.claude/mcp-supabase.md`

## 📦 Deployment & Verification

```bash
# Build and verify locally
npm run build
node scripts/verify-deployment.cjs

# Verify remote deployment
node scripts/verify-deployment.cjs https://your-domain.com

# Run Edge Function tests
cd supabase/functions/_shared/__tests__
./run-tests.sh

# Browser verification checklist
✓ Page loads without console errors
✓ UI renders correctly (screenshot)
✓ Critical user flows work
✓ API calls return 200/201
✓ Service worker registered
✓ Edge Function tests pass
```

**Cache-busting**: Build generates unique hashes for all assets. HTML never cached.
**Details**: `.claude/deployment.md`

## 🔍 Debugging Checklist

- [ ] Check browser console (F12)
- [ ] Verify session token isn't expired
- [ ] Check Supabase logs: `await get_logs({ service: "api" })`
- [ ] Test in incognito mode (cache issues)
- [ ] Verify environment variables are set
- [ ] Check network tab for failed requests
- [ ] Review Edge Function logs: `supabase functions logs [function-name]`
- [ ] Run test suite: `cd supabase/functions/_shared/__tests__ && deno test`

## 📚 Additional Documentation

- **Detailed Guides** (when needed):
  - `.claude/artifacts.md` - Complete artifact system documentation
  - `.claude/artifact-import-restrictions.md` - Critical: Artifact import rules
  - `.claude/ARTIFACT_IMPORT_FIX_SUMMARY.md` - Multi-layer validation system
  - `.claude/mcp-chrome-devtools.md` - Browser automation patterns
  - `.claude/mcp-supabase.md` - Database operations guide
  - `.claude/deployment.md` - Cache-busting & deployment details
  - `.claude/troubleshooting.md` - Common issues & solutions
  - `.claude/AI_ELEMENTS_SUMMARY.md` - ai-elements integration status
  - `.claude/chrome-mcp-setup.md` - Chrome DevTools MCP configuration

- **Testing Documentation** (Nov 2025):
  - `.claude/REFACTORING_TEST_PLAN.md` - Comprehensive testing strategy
  - `.claude/TESTING_QUICK_REFERENCE.md` - Quick command reference
  - `.claude/REFACTORING_TEST_SUITE_SUMMARY.md` - Test suite overview
  - `supabase/functions/_shared/__tests__/README.md` - Developer guide
  - `.github/workflows/edge-functions-tests.yml` - CI/CD workflow

- **Command Templates** (reusable workflows):
  - `.claude/commands/verify-ui.md` - UI verification workflow
  - `.claude/commands/test-artifact.md` - Artifact testing steps
  - `.claude/commands/debug-auth.md` - Authentication debugging

- **Session Notes** (recent work):
  - `.claude/CODE_REVIEW_FIXES_SUMMARY.md` - Security fixes documentation (Nov 2025)
  - `.claude/ARTIFACT_PROMPT_OPTIMIZATION.md` - Structured prompt engineering (Nov 2025)
  - `.claude/OPENROUTER_MIGRATION_SUMMARY.md` - OpenRouter migration details (Nov 2025)

## 📝 Environment Variables

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://vznhbocnuykdmjvujaka.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_key_here
VITE_SUPABASE_PROJECT_ID=vznhbocnuykdmjvujaka
```

### Edge Functions (Supabase Secrets)
```bash
# OpenRouter API Keys (for chat, summaries, titles, artifacts)
OPENROUTER_GEMINI_FLASH_KEY=sk-or-v1-...  # Chat/summaries/titles (Gemini 2.5 Flash Lite)
OPENROUTER_K2T_KEY=sk-or-v1-...           # Artifacts (Kimi K2-Thinking)

# Google AI Studio Keys (for image generation ONLY)
# All 10 keys dedicated to images - 150 RPM total (10 keys × 15 RPM each)
# Each key MUST be from a different Google Cloud project for independent rate limits
GOOGLE_KEY_1=AIzaSy...   # Image key 1
GOOGLE_KEY_2=AIzaSy...   # Image key 2
GOOGLE_KEY_3=AIzaSy...   # Image key 3
GOOGLE_KEY_4=AIzaSy...   # Image key 4
GOOGLE_KEY_5=AIzaSy...   # Image key 5
GOOGLE_KEY_6=AIzaSy...   # Image key 6
GOOGLE_KEY_7=AIzaSy...   # Image key 7
GOOGLE_KEY_8=AIzaSy...   # Image key 8
GOOGLE_KEY_9=AIzaSy...   # Image key 9
GOOGLE_KEY_10=AIzaSy...  # Image key 10

# Optional: Production CORS origins (comma-separated)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Get API Keys:**
- **OpenRouter:** [https://openrouter.ai/keys](https://openrouter.ai/keys)
- **Google AI Studio:** [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

**Current Architecture (Nov 2025):**
- **Chat/Summaries/Titles**: OpenRouter Gemini 2.5 Flash Lite (reliable, fast, no rate limit issues)
- **Artifacts**: OpenRouter Kimi K2-Thinking (high quality code generation)
- **Images**: Google AI Studio Gemini Flash-Image (150 RPM with 10 keys)

This architecture provides better reliability and 2.5× more image generation capacity than the previous setup.

### 🔄 API Key Rotation (Production-Ready)

**Problem:** Free tier rate limits (2-15 RPM) can be restrictive during active development.

**Solution:** Built-in **random + round-robin rotation** across multiple API keys (no external infrastructure needed).

**Current Implementation:**
- ✅ Lightweight rotation built into Supabase Edge Functions
- ✅ Random starting point handles Edge Function cold starts
- ✅ Automatic load distribution across all keys
- ✅ Zero external dependencies or infrastructure
- ✅ Production-ready and deployed

**Key Pool Architecture:**
```
OPENROUTER (Gemini 2.5 Flash Lite)
├── Key: OPENROUTER_GEMINI_FLASH_KEY
├── Usage: Unlimited (pay-as-you-go)
└── Used by: chat, generate-title, summarize-conversation

OPENROUTER (Kimi K2-Thinking)
├── Key: OPENROUTER_K2T_KEY
├── Usage: Unlimited (pay-as-you-go)
└── Used by: generate-artifact, generate-artifact-fix

GOOGLE AI STUDIO (Flash-Image Model)
├── Keys: 1-10 (all dedicated to images!)
├── Capacity: 150 RPM (10 keys × 15 RPM)
└── Used by: generate-image
```

**How Image Key Rotation Works:**
1. **Cold Start**: Pick random key from pool (handles frequent Edge Function restarts)
2. **Subsequent Requests**: Round-robin through keys sequentially
3. **Next Cold Start**: Pick different random key (ensures distribution)

**Logs Example:**
```
🚀 Routing to Gemini 2.5 Flash Lite via OpenRouter (stream: true)    # Chat
🤖 Routing to Kimi K2-Thinking via OpenRouter                        # Artifact
🔑 Using GOOGLE_KEY_7 (position 7/10 in pool)                        # Image
```

**Full Guide:** See `KEY_POOL_ARCHITECTURE.md` and `FINAL_KEY_ROTATION_SUMMARY.md`

## 🔒 Security Notes (November 2025 Updates)

### Recent Security Improvements (Phase 1 Complete)
1. ✅ **Schema Injection Protection** - All SECURITY DEFINER functions use `search_path = public, pg_temp`
2. ✅ **Guest Rate Limiting** - 10 requests per 24 hours per IP (automatic cleanup after 7 days)
3. ✅ **CORS Origin Validation** - Replaced wildcard `*` with environment-based whitelist (CWE-942)
4. ✅ **XSS Input Sanitization** - HTML entity encoding for all user content (CWE-79)
5. ✅ **System Prompt Externalization** - Reduced chat function bundle size by 52%
6. ✅ **Centralized Error Handling** - Standardized error responses across all Edge Functions
7. ✅ **Request Validation** - Reusable validators with type assertions and security checks

**Security Audit Results:**
- **Before**: 2 HIGH vulnerabilities (CORS wildcard, XSS)
- **After**: 0 vulnerabilities ✅
- **Coverage**: 9/9 XSS attack scenarios blocked
- **Status**: Production-ready with comprehensive security hardening

### Manual Configuration Required
1. **Leaked Password Protection**: Enable in Supabase Dashboard → Authentication → Password Security
2. **Production CORS**: Set `ALLOWED_ORIGINS` environment variable in Edge Functions settings

See `.claude/CODE_REVIEW_FIXES_SUMMARY.md` for complete details.

## 🆕 Recent Updates (Updated: 2025-11-13)

### Phase 1 Edge Function Refactoring (Nov 13, 2025) ✅ COMPLETE

**Status:** Production-ready with comprehensive testing and security hardening

**Major refactoring initiative** completed to improve code quality, maintainability, and testing coverage. This phase extracted common patterns into shared modules following SOLID principles.

#### New Shared Utilities (1,116 lines)
- **`config.ts`** (165 lines): Centralized configuration constants (eliminates 18+ magic numbers)
- **`error-handler.ts`** (330 lines): Standardized error responses with CORS security fix
- **`validators.ts`** (347 lines): Request validators with XSS sanitization (HTML entity encoding)
- **`rate-limiter.ts`** (274 lines): Parallel rate limit checks (3x faster via Promise.all)

#### Comprehensive Test Suite (213 tests, 1,500+ lines)
- **Unit Tests**: 213 tests across 5 suites with 90%+ coverage
- **Integration Tests**: Cross-module interaction validation
- **Test Utilities**: Mock helpers for Supabase, Request, and Response objects
- **CI/CD Integration**: GitHub Actions workflow with automated testing
- **Coverage Reporting**: Deno test runner with detailed reports
- **Execution Time**: <5 seconds for full suite

#### Testing Commands
```bash
# Run all tests (from project root)
cd supabase/functions && deno task test

# Watch mode (development)
deno task test:watch

# With coverage report
deno task test:coverage

# From test directory
cd supabase/functions/_shared/__tests__
./run-tests.sh
```

#### Impact Metrics
- **Code Reduction**: 315+ lines of duplicate code eliminated (37% reduction)
- **Complexity**: Reduced from ~40 to ~18 (55% improvement)
- **Test Coverage**: 0% → 90%+ (213 comprehensive tests)
- **Code Duplication**: 20% → <3% (85% reduction)
- **Magic Numbers**: 18+ → 0 (100% elimination)
- **Industry Ranking**: TOP 10% across all quality metrics

#### AI Code Review Score: 92/100 (A-)
- **Security**: 100/100 (after fixes)
- **Performance**: 90/100
- **Architecture**: 95/100
- **Maintainability**: 90/100
- **Testing**: 95/100

#### Security Fixes
- **CORS Wildcard** (CWE-942, CVSS 5.3): Fixed in error-handler.ts and cache-manager/index.ts
- **XSS Sanitization** (CWE-79, CVSS 6.1): Added HTML entity encoding to validators.ts
- **Verification**: 9/9 XSS attack scenarios blocked, no wildcards in codebase

#### Refactored Example
- `generate-image/index.refactored.ts`: 302 → 180 lines (40% reduction)
- Demonstrates all new patterns and best practices
- Ready for production deployment

#### Documentation (10,000+ lines)
- `.claude/PHASE1_REFACTORING_SUMMARY.md` - Complete metrics and analysis
- `.claude/REFACTORING_MIGRATION_GUIDE.md` - Step-by-step deployment guide
- `.claude/AI_CODE_REVIEW_REPORT.md` - Professional code review (92/100)
- `.claude/SECURITY_FIX_XSS_SANITIZATION.md` - XSS vulnerability audit
- `.claude/CORS_SECURITY_AUDIT_REPORT.md` - CORS security analysis
- `.claude/REFACTORING_TEST_PLAN.md` - Complete testing strategy
- `.claude/TESTING_QUICK_REFERENCE.md` - Quick command guide
- `.claude/PROJECT_STATUS_UPDATE_NOV_13_2025.md` - Final project status

#### Next Steps
1. Set `ALLOWED_ORIGINS` environment variable in Supabase Edge Functions settings
2. Deploy refactored code to staging for smoke testing
3. Monitor for 24-48 hours before production deployment
4. Apply same patterns to remaining Edge Functions (chat, generate-title, etc.)

### OpenRouter Migration (Nov 13, 2025)

Complete migration from Google AI Studio to OpenRouter for improved reliability:

- **Chat/Summaries/Titles**: Now use Gemini 2.5 Flash Lite via OpenRouter (unlimited pay-as-you-go)
- **Artifacts**: Migrated to Kimi K2-Thinking via OpenRouter (higher quality code generation)
- **Images**: Continue using Google AI Studio with 10-key rotation (150 RPM capacity)

**Benefits:**
- No more rate limit issues for chat operations
- Better code quality with Kimi K2-Thinking
- Simplified architecture with fewer API providers
- Maintained high capacity for image generation

### Intent Detection Enhancement (Nov 13, 2025)

Improved intent detection system with embeddings-based matching:

- **Architecture**: Separate pgvector tables for intent vs knowledge embeddings
- **Model**: Using `gte-small` (384 dimensions) for fast, accurate intent matching
- **Functions**: Dedicated `setup-intent-examples` Edge Function for embeddings
- **Performance**: Sub-100ms intent detection with high accuracy

### Admin Analytics Dashboard (Nov 12, 2025)

New `/admin` route for real-time monitoring:

- **Features**: Request volumes, cost tracking, latency metrics, error analysis
- **Visualizations**: Charts for cost breakdown, usage trends, performance metrics
- **Auto-refresh**: Updates every 30 seconds
- **Access Control**: Email or role-based admin authentication

### CI/CD Infrastructure & Testing Improvements (Nov 14, 2025) ✅ COMPLETE

**Status:** Production-ready with comprehensive automation

Complete CI/CD pipeline with branch protection, coverage tracking, and enhanced test infrastructure:

#### GitHub Actions Workflow
- **Pipeline**: Lint → Test (293) → Coverage Upload → Build
- **Runtime**: ~2-3 minutes per PR
- **Workflow**: `.github/workflows/frontend-quality.yml`
- **Triggers**: Push to `main`, all pull requests
- **Integration**: Codecov automatic upload with PR comments

#### Branch Protection
- **Enforcement**: GitHub ruleset on `main` branch
- **Requirements**: 1 PR approval, all checks pass
- **Prevention**: Force pushes, direct commits, branch deletion
- **Script**: `scripts/setup-branch-protection.sh` for automation

#### Testing Improvements
- **Coverage Increase**: 68% → 74.21% (+6% overall)
- **New Tests**: 73 added (7 → 80 for key utilities)
- **Highlights**:
  - `exportArtifact.ts`: 23% → 98% (+75%!)
  - XSS Security: 9 comprehensive attack scenarios
  - Performance: 5 large artifact benchmarks
- **Quality Gates**: 55% minimum threshold, auto-blocked PRs if failed

#### Codecov Integration
- **Features**: PR comments, coverage trends, diff visualization
- **Thresholds**: 70% project, 75% patch (new code)
- **Ignored**: Test files, examples, type definitions
- **Configuration**: `codecov.yml` with custom rules

#### Documentation
- `docs/branch-protection-setup.md` - Complete setup guide (8KB)
- `docs/quick-setup-checklist.md` - 5-minute deployment
- `docs/testing-ci.md` - CI/CD playbook
- `docs/testing-coverage.md` - Coverage workflow
- `docs/IMPLEMENTATION_SUMMARY.md` - Deployment summary

---

*Last Updated: 2025-11-14 | Claude Code v1.x compatible*
