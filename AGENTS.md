# AGENTS.md

This file provides guidance for AI coding assistants (Codex, Cline, Augment Code, etc.) when working with code in this repository.

## Project Overview

**Vana** is a production AI-powered development assistant that transforms natural language into interactive code, React components, diagrams, and images in real-time. Built with React 18, TypeScript, Vite, Supabase (PostgreSQL + Edge Functions), and multiple AI models via OpenRouter and Google AI Studio.

**Tech Stack**: React 18.3 + TypeScript 5.8 + Vite 5.4 + Tailwind CSS + shadcn/ui + Supabase + TanStack Query + Vitest

## 🎯 MUST Rules (Non-Negotiable)

1. **Package Manager**: Use `npm` only. Never use Bun/Yarn/pnpm (creates lock file conflicts)
2. **Browser Verification**: Test with Chrome DevTools MCP after EVERY change
3. **Model Configuration**: **CRITICAL** - NEVER hardcode model names! Always use `MODELS.*` from `supabase/functions/_shared/config.ts`
   - ❌ BAD: `model: "google/gemini-2.5-flash-lite"`
   - ✅ GOOD: `import { MODELS } from '../_shared/config.ts'` then `model: MODELS.GEMINI_FLASH`
   - Golden snapshot tests will FAIL if you hardcode model names
4. **Artifact Imports**: **CRITICAL** - Cannot use `@/components/ui/*` in artifacts (see "Critical Artifact Restrictions" section)
5. **Security DEFINER Functions**: Always include `SET search_path = public, pg_temp` to prevent schema injection
6. **CORS Configuration**: Never use wildcard `*` origins in production (use `supabase/functions/_shared/cors-config.ts`)
7. **Animation Performance**: Only animate new messages, not entire chat history
8. **Route Order**: Add new routes ABOVE the `*` catch-all in App.tsx

## Chrome DevTools MCP Setup

```bash
# Prevent duplicate browser instances
chrome-mcp start     # Start single Chrome instance
chrome-mcp status    # Check if running
chrome-mcp restart   # Clean restart if issues occur
```

**Browser Verification Pattern** (CRITICAL - run after EVERY change):
```typescript
// Navigate to app
await browser.navigate({ url: "http://localhost:8080" })

// Check for errors
const errors = await browser.getConsoleMessages({ onlyErrors: true })

// Take screenshot for verification
await browser.screenshot({ filename: "verification.png" })
```

**Guides**: `.claude/CHROME_MCP_COMMANDS.md` for complete MCP documentation

## Development Commands

### Core Development
```bash
npm run dev              # Start dev server on port 8080
npm run build            # Production build
npm run build:dev        # Development build with sourcemaps
npm run build:staging    # Staging build
npm run preview          # Preview production build
```

### Testing (293 tests, 74.21% coverage)
```bash
npm run test                  # Run all tests
npm run test -- --watch       # Run tests in watch mode
npm run test:ui               # Run tests with Vitest UI
npm run test:coverage         # Generate coverage report (enforces 55% threshold)

# Run specific test file
npm run test -- src/utils/__tests__/artifactValidator.test.ts

# Run tests matching pattern
npm run test -- --grep "artifact"
```

### Code Quality
```bash
npm run lint             # Run ESLint (0 errors, 94 warnings allowed)
```

### Deployment (Edge Functions)
```bash
# Deploy to staging
./scripts/deploy-simple.sh staging

# Deploy to production (requires confirmation + creates backup)
./scripts/deploy-simple.sh prod

# Deploy individual function
supabase functions deploy chat --project-ref <ref>
```

## Architecture Overview

### Multi-Model AI System

The application uses **multiple AI models** optimized for different tasks:

1. **Chat/Summaries/Titles**: Gemini 2.5 Flash Lite via OpenRouter (single API key, unlimited)
2. **Artifact Generation**: Kimi K2-Thinking via OpenRouter (single API key, optimized for code)
3. **Artifact Error Fixing**: Kimi K2-Thinking via OpenRouter (deep reasoning for debugging)
4. **Image Generation**: Gemini Flash-Image via Google AI Studio (10-key rotation pool, 150 RPM)

**Key Insight**: Only image generation uses key rotation (10 keys for high throughput). Chat and artifacts use single OpenRouter keys for simplicity and unlimited capacity.

### Artifact System Architecture

Artifacts are interactive components rendered in isolated sandboxes (iframes) alongside chat messages. They support:

- **React components** with Tailwind CSS (NO local imports allowed - see `.claude/artifact-import-restrictions.md`)
- **HTML pages** with live preview
- **Mermaid diagrams** (flowcharts, sequence diagrams, etc.)
- **SVG graphics**
- **Code snippets** with syntax highlighting
- **Markdown documents**
- **AI-generated images**

**CRITICAL**: Artifacts run in isolated sandboxes with NO access to local project files. Only CDN-loaded libraries are available. See "Artifact Import Restrictions" section below.

### 5-Layer Artifact Validation System

The codebase implements a comprehensive defense-in-depth validation system to prevent artifact failures:

1. **System Prompt Prevention**: AI receives prominent warnings during generation
2. **Template Examples**: All templates use only Radix UI + Tailwind (no local imports)
3. **Pre-Generation Validation**: `supabase/functions/_shared/artifact-validator.ts` - Scans requests for problematic patterns
4. **Post-Generation Transformation**: Automatically fixes common import mistakes and immutability violations
5. **Runtime Validation**: Blocks artifacts with critical errors before rendering

**File Location**: `supabase/functions/_shared/artifact-validator.ts`

**Key Functions**:
- `validateArtifactCode()` - Main validation function
- `autoFixArtifactCode()` - Auto-fixes reserved keywords, React imports, immutability violations
- `validateImmutability()` - Detects and fixes array/object mutation patterns
- `detectReservedKeywords()` - Catches strict mode violations (`eval`, `arguments`, etc.)

### Immutability Enforcement

React strict mode enforces immutability. The validator detects and auto-fixes these patterns:

❌ **WRONG** (causes runtime errors):
```javascript
board[i] = 'X';           // Direct assignment - WILL CRASH
board.push(value);        // Mutates original array
board.splice(0, 1);       // Mutates original array
board.sort();             // Mutates original array
```

✅ **CORRECT** (immutable patterns):
```javascript
const newBoard = [...board];
newBoard[i] = 'X';

const newBoard = [...board, value];     // Instead of push
const sorted = [...board].sort();       // Copy first, then sort
```

**Auto-fix**: The validator automatically transforms direct array assignments into immutable patterns.

### Database Schema (Supabase PostgreSQL)

**Core Tables**:
```sql
-- User sessions with AI-generated titles
chat_sessions {
  id: uuid (PK)
  user_id: uuid (FK to auth.users)
  title: text (AI-generated)
  first_message: text
  conversation_summary: text (for long conversations)
  created_at: timestamptz
  updated_at: timestamptz
}

-- Chat messages with reasoning support
chat_messages {
  id: uuid (PK)
  session_id: uuid (FK to chat_sessions)
  role: text ('user' | 'assistant')
  content: text
  reasoning: text (structured JSON - chain of thought)
  token_count: integer
  created_at: timestamptz
}

-- Guest rate limiting (IP-based, 20 requests/5h)
guest_rate_limits {
  id: uuid (PK)
  identifier: text (IP address)
  request_count: integer
  window_start: timestamptz
  last_request_at: timestamptz
}

-- AI usage tracking for analytics
ai_usage_tracking {
  id: uuid (PK)
  user_id: uuid
  model: text
  input_tokens: integer
  output_tokens: integer
  total_cost: numeric
  endpoint: text
  created_at: timestamptz
}
```

**Security**: All tables have Row-Level Security (RLS) policies. All SECURITY DEFINER functions use `SET search_path = public, pg_temp` to prevent privilege escalation.

### Edge Functions (Deno on Supabase)

Located in `supabase/functions/`:

1. **chat** - Main chat streaming (Gemini 2.5 Flash Lite via OpenRouter)
   - Handles SSE streaming
   - Intent detection for artifacts/images
   - Reasoning generation (chain of thought)
   - Rate limiting for guests

2. **generate-artifact** - Artifact generation (Kimi K2-Thinking via OpenRouter)
   - Optimized for fast, reliable code generation
   - Pre/post-generation validation
   - Auto-transformation of common mistakes
   - Immutability enforcement

3. **generate-artifact-fix** - Artifact error fixing (Kimi K2-Thinking)
   - Deep reasoning for debugging
   - Comprehensive error analysis
   - Automatic code corrections

4. **generate-title** - Session title generation (Gemini Flash Lite)
   - Auto-generates descriptive titles from first message

5. **generate-image** - AI image generation (Gemini Flash-Image)
   - 10-key rotation pool (150 RPM total)
   - Round-robin key selection

6. **summarize-conversation** - Context summarization (Gemini Flash Lite)
   - Intelligent conversation summarization for long chats

**Shared Utilities** (`supabase/functions/_shared/`):
- `openrouter-client.ts` - OpenRouter API client with retry logic
- `artifact-validator.ts` - Validation and auto-fix utilities
- `cors-config.ts` - Environment-based CORS validation
- `system-prompt-inline.ts` - Externalized system prompts (52% bundle reduction)
- `reasoning-generator.ts` - Structured reasoning generation

## Critical Artifact Restrictions

**ALWAYS read** `.claude/artifact-import-restrictions.md` before working with artifacts.

### ❌ FORBIDDEN (Will Break Artifacts)

```tsx
// LOCAL IMPORTS - NEVER WORKS
import { Button } from "@/components/ui/button"      // ❌ FAILS
import { Card } from "@/components/ui/card"          // ❌ FAILS
import { cn } from "@/lib/utils"                     // ❌ FAILS
import anything from "@/..."                          // ❌ FAILS
```

**Why**: Artifacts run in isolated sandboxes (iframes) with NO access to local project files.

### ✅ ALLOWED (Works in Artifacts)

```tsx
// React - Available as global
const { useState, useEffect, useMemo } = React;

// Tailwind CSS - Always available (no import needed)
<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">

// Lucide Icons - Available as globals
const { Check, X, Settings } = LucideReact;

// Recharts - Available as globals
const { LineChart, Line, XAxis, YAxis, Tooltip } = Recharts;
```

### Component Conversion Pattern

```tsx
// ❌ shadcn/ui (FAILS)
<Button variant="default" size="lg">Click me</Button>

// ✅ Tailwind (WORKS)
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
  Click me
</button>
```

**See**: `.claude/artifact-import-restrictions.md` for complete conversion guide.

## Testing Strategy

### Test Infrastructure
- **Framework**: Vitest 4.0 with React Testing Library
- **Coverage**: 74.21% (exceeds 55% threshold by 19%)
- **Total Tests**: 293 passing, 27 skipped
- **CI/CD**: GitHub Actions with automatic coverage reporting to Codecov

### Coverage Breakdown
| Metric | Current | Threshold | Status |
|--------|---------|-----------|--------|
| Statements | 74.21% | 55% | ✅ +19% |
| Branches | 68.58% | 50% | ✅ +18% |
| Functions | 65.81% | 55% | ✅ +11% |
| Lines | 74.29% | 55% | ✅ +19% |

### Key Test Suites

1. **Artifact System** (`src/components/ArtifactContainer.test.tsx`):
   - 14 XSS security tests
   - 5 performance benchmarks
   - Export menu validation
   - Version control tests

2. **Export Utilities** (`src/utils/__tests__/exportArtifact.test.ts`):
   - 98% coverage
   - Clipboard fallback mechanisms
   - Multi-file ZIP export validation

3. **Security Validators** (`src/utils/__tests__/artifactValidator.test.ts`):
   - Import restriction enforcement
   - Syntax validation for all artifact types
   - Immutability violation detection

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- src/utils/__tests__/artifactValidator.test.ts

# Generate coverage report
npm run test:coverage

# Run tests in watch mode
npm run test -- --watch
```

**CI/CD**: All tests run automatically on PRs. PRs are blocked if tests fail or coverage drops below threshold.

## State Management

### TanStack Query (React Query)
Primary data fetching and caching layer:

```typescript
// Example: Chat sessions hook
export function useChatSessions() {
  return useQuery({
    queryKey: ["chatSessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
```

**Key Hooks** (located in `src/hooks/`):
- `useChatMessages.tsx` - Message CRUD, streaming, artifact parsing
- `useChatSessions.tsx` - Session management, title generation
- `useArtifactVersions.ts` - Version control for artifacts
- `useAuthUserRateLimit.ts` - Rate limit checking

### React Context
Used sparingly for global state:
- `MultiArtifactContext.tsx` - Multi-artifact selection state

## Security Features

### Database Hardening
- All SECURITY DEFINER functions use `SET search_path = public, pg_temp` to prevent schema injection
- Row-Level Security (RLS) policies on all tables
- JWT-based authentication with automatic refresh

### API Protection
- **Guest rate limiting**: 20 requests per 5-hour window (IP-based)
- **CORS validation**: Environment-based origin whitelist (no wildcard `*` in production)
- **Input validation**: All Edge Functions validate message format, length, and content

### XSS Prevention
- DOMPurify sanitization on all user-generated content
- Triple-layer security: Server validation + Zod schemas + DOMPurify
- 14 XSS attack scenarios tested and validated

## Build Optimization

### Code Splitting (vite.config.ts)
```typescript
manualChunks: {
  "vendor-react": ["react", "react-dom", "react-router-dom"],
  "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
  "vendor-markdown": ["react-markdown", "remark-gfm"],
  "vendor-query": ["@tanstack/react-query"],
  "vendor-supabase": ["@supabase/supabase-js"],
}
```

### Performance Features
- **Brotli + Gzip compression** for all assets
- **PWA support** with service worker (fast updates optimized)
- **Terser minification** with console removal in production
- **Unique asset hashing** for cache busting
- **52% bundle reduction** via system prompt externalization

### Cache Strategy
- **Supabase API**: NetworkFirst, 30-second cache
- **Images**: NetworkFirst, 5-minute cache
- **Service Worker**: Immediate activation (`clientsClaim`, `skipWaiting`)

## ⚠️ Anti-Patterns (Never Do This)

| ❌ DON'T | ✅ DO INSTEAD | WHY |
|----------|---------------|-----|
| `bun install` | `npm install` | Prevents lock file conflicts |
| Skip session validation | `await ensureValidSession()` | Prevents auth errors |
| Import shadcn in artifacts | Use Tailwind CSS + React state | Local imports unavailable |
| Animate all messages | Animate last message only | Performance (100+ msgs) |
| Deploy without verification | Test in browser with Chrome MCP | Catches runtime errors |
| Add routes after `*` | Add ABOVE catch-all | Routes never reached |
| Hardcode model names | Use `MODELS.*` from config.ts | CI/CD will FAIL, breaks production |
| Use console.log in production | Remove or use dev only | Stripped by Terser |
| Duplicate error handling | Use `createErrorResponse()` | Consistency & maintenance |
| Manual CORS headers | Use `corsHeaders` from cors-config.ts | Security & standardization |

## Model Configuration System (Production-Ready)

**Critical Rule:** **NEVER hardcode model names in Edge Functions!** Always use `MODELS.*` constants from `supabase/functions/_shared/config.ts`.

### Single Source of Truth

All AI model names are defined in `supabase/functions/_shared/config.ts`:

```typescript
export const MODELS = {
  /** Gemini 2.5 Flash Lite for chat/summaries/titles */
  GEMINI_FLASH: 'google/gemini-2.5-flash-lite',
  /** Kimi K2-Thinking for artifact generation */
  KIMI_K2: 'moonshotai/kimi-k2-thinking',
  /** Gemini Flash Image for image generation */
  GEMINI_FLASH_IMAGE: 'google/gemini-2.5-flash-image'
} as const;
```

### Usage in Edge Functions

```typescript
// ✅ CORRECT - Import and use MODELS constants
import { MODELS } from '../_shared/config.ts';

const response = await fetch(OPENROUTER_URL, {
  body: JSON.stringify({
    model: MODELS.GEMINI_FLASH,  // ✅ Good!
    messages: [...]
  })
});

// ❌ WRONG - Never hardcode model names!
const response = await fetch(OPENROUTER_URL, {
  body: JSON.stringify({
    model: "google/gemini-2.5-flash-lite",  // ❌ BAD! Will fail tests
    messages: [...]
  })
});
```

### Golden Snapshot Testing

**Purpose:** Prevents accidental model configuration changes that could break production.

**How it works:**
1. `model-config.snapshot.json` stores the expected model names
2. Tests compare `config.ts` against the snapshot on every commit
3. Tests FAIL if model names don't match (catches accidental changes)
4. CI/CD blocks merges if model config has drifted

**Test Files:**
- `supabase/functions/_shared/__tests__/model-config.test.ts` - 4 comprehensive tests
- `supabase/functions/_shared/__tests__/model-config.snapshot.json` - Golden snapshot

### Updating Model Names (Intentional Changes)

When you **deliberately** need to change a model:

1. **Update config.ts:**
   ```typescript
   export const MODELS = {
     GEMINI_FLASH: 'google/new-model-name',  // Changed
   }
   ```

2. **Update snapshot:**
   ```json
   {
     "version": "2025-11-XX",  // ← Update date
     "models": {
       "GEMINI_FLASH": "google/new-model-name"  // ← Match config
     }
   }
   ```

3. **Test & Deploy:**
   ```bash
   cd supabase/functions && deno task test
   supabase functions deploy
   ```

### Benefits

- **Single Point of Change:** Update one constant, not 6+ files
- **Type Safety:** TypeScript ensures correct model names
- **Automated Validation:** CI/CD catches configuration drift
- **Zero Production Incidents:** Prevents 404 errors from wrong model names

## Common Development Patterns

### Session Validation Pattern

Always validate session before authenticated operations:

```typescript
import { ensureValidSession } from "@/utils/authHelpers";

const session = await ensureValidSession();
if (!session) {
  toast({ title: "Authentication required", variant: "destructive" });
  navigate("/auth");
  return;
}
// Proceed with authenticated operation
const { data, error } = await supabase
  .from("chat_sessions")
  .insert({ user_id: session.user.id, ...});
```

### Creating Artifacts (AI Response Format)

Artifacts are embedded in AI responses using XML-like tags:

```xml
<artifact type="application/vnd.ant.react" title="Dashboard Component">
export default function Dashboard() {
  const { useState } = React;
  const [count, setCount] = useState(0);

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <button
        onClick={() => setCount(count + 1)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Count: {count}
      </button>
    </div>
  );
}
</artifact>
```

**Supported types**: `code` | `html` | `react` | `svg` | `mermaid` | `markdown` | `image`

### Adding a New Artifact Type

1. **Update type definition** in `src/components/Artifact.tsx`:
```typescript
export type ArtifactType = "code" | "html" | "react" | "svg" | "mermaid" | "markdown" | "image" | "your-new-type";
```

2. **Add renderer logic** in `Artifact` component:
```typescript
if (artifact.type === "your-new-type") {
  return <YourCustomRenderer content={artifact.content} />;
}
```

3. **Update parser** in `src/utils/artifactParser.ts`:
```typescript
const mimeTypeMap: Record<string, ArtifactType> = {
  // ... existing types
  'application/vnd.your-type': 'your-new-type',
};
```

### Adding a New Edge Function

1. **Create function directory**: `supabase/functions/your-function/`
2. **Create index.ts** with CORS headers:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors-config.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  // Your logic here
});
```

3. **Deploy**: `supabase functions deploy your-function --project-ref <ref>`

### Handling Streaming Responses

```typescript
// Example from useChatMessages.tsx
const streamChat = async (message: string) => {
  const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ messages, sessionId }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));
        // Handle delta, reasoning, or completion
      }
    }
  }
};
```

## Environment Variables

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://vznhbocnuykdmjvujaka.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon_key>
VITE_SUPABASE_PROJECT_ID=vznhbocnuykdmjvujaka
VITE_ENABLE_ANALYTICS=false
```

### Edge Functions (Supabase Secrets)
```bash
# OpenRouter (chat, artifacts, summaries, titles)
supabase secrets set OPENROUTER_GEMINI_FLASH_KEY=sk-or-v1-...
supabase secrets set OPENROUTER_KIMI_K2_KEY=sk-or-v1-...
supabase secrets set OPENROUTER_K2T_KEY=sk-or-v1-...

# Google AI Studio (image generation - 10-key rotation)
supabase secrets set GOOGLE_KEY_1=AIzaSy...
supabase secrets set GOOGLE_KEY_2=AIzaSy...
# ... GOOGLE_KEY_3 through GOOGLE_KEY_10

# CORS configuration (production)
supabase secrets set ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## File Structure Reference

```
src/
├── components/
│   ├── ui/                    # shadcn/ui components (69 files)
│   ├── prompt-kit/            # Custom chat UI primitives
│   ├── Artifact.tsx           # Main artifact renderer
│   ├── ArtifactCard.tsx       # Artifact preview cards
│   ├── ChatInterface.tsx      # Main chat UI with resizable panels
│   └── ChatSidebar.tsx        # Session list sidebar
├── hooks/
│   ├── useChatMessages.tsx    # Chat message CRUD + streaming
│   ├── useChatSessions.tsx    # Session management
│   ├── useArtifactVersions.ts # Version control
│   └── useAuthUserRateLimit.ts # Rate limiting
├── utils/
│   ├── artifactParser.ts      # Parse artifacts from AI responses
│   ├── artifactValidator.ts   # Client-side validation
│   ├── exportArtifact.ts      # Multi-format export system
│   └── __tests__/             # Utility test suites
├── pages/
│   ├── Index.tsx              # Main chat page
│   ├── Auth.tsx               # Login page
│   └── Landing.tsx            # Marketing landing page
└── integrations/
    └── supabase/              # Supabase client + types

supabase/
├── functions/
│   ├── chat/                  # Main chat (Gemini Flash Lite)
│   ├── generate-artifact/     # Artifact generation (Kimi K2)
│   ├── generate-artifact-fix/ # Error fixing (Kimi K2)
│   ├── generate-title/        # Title generation (Gemini)
│   ├── generate-image/        # Image generation (Flash-Image)
│   ├── summarize-conversation/ # Summarization (Gemini)
│   └── _shared/               # Shared utilities
│       ├── openrouter-client.ts
│       ├── artifact-validator.ts
│       ├── cors-config.ts
│       └── system-prompt-inline.ts
└── migrations/                # Database migrations
```

## Key Architectural Decisions

### Why Kimi K2-Thinking for Artifacts?
- **Faster**: Eliminated timeout issues (previous model was too slow)
- **More reliable**: Enhanced reasoning capabilities for complex code generation
- **Better error fixing**: Deep reasoning for debugging and auto-correction

### Why 10-Key Rotation for Images?
- **High throughput**: 150 RPM total (10 keys × 15 RPM each)
- **Independent rate limits**: Each key must be from different Google Cloud project
- **Dedicated to images**: Chat and artifacts use single OpenRouter keys for simplicity

### Why No Radix UI in Artifacts?
- **Babel standalone limitations**: Import maps not supported
- **Sandbox isolation**: Artifacts run in iframes with no access to local modules
- **Solution**: Use Tailwind CSS utility classes with React state instead

### Why Externalized System Prompts?
- **52% bundle reduction**: Moved large prompts from inline strings to separate file
- **Better maintainability**: Single source of truth for prompts
- **Shared across functions**: Reduces duplication

## Troubleshooting

### Artifact shows blank/white screen
1. Check browser console for import errors
2. Verify no `@/` imports in artifact code
3. Ensure all libraries accessed via globals (React, Recharts, LucideReact)
4. Check for strict mode violations (reserved keywords, array mutations)

### Tests failing with "Cannot find module"
1. Ensure TypeScript paths are configured: `tsconfig.json` has `@/*` alias
2. Check Vitest config resolves aliases correctly
3. Run `npm install` to ensure all dependencies are installed

### Edge Function deployment timeout
1. Check function size (should be <10MB)
2. Verify all imports use valid Deno URLs
3. Use `--no-verify-jwt` flag for testing without authentication
4. Check Supabase project status and quotas

### Rate limiting errors for guests
1. Current limit: 20 requests per 5-hour window
2. Check `guest_rate_limits` table for IP record
3. Wait for window to reset or authenticate to bypass

## Performance Targets

### Frontend (Web Vitals)
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.5s
- **Cumulative Layout Shift (CLS)**: < 0.1

### Testing
- **Coverage threshold**: 55% minimum (current: 74.21%)
- **Test execution**: < 3 seconds for full suite
- **CI/CD runtime**: < 5 minutes for complete pipeline

## Additional Resources

- **Artifact Import Guide**: `.claude/artifact-import-restrictions.md`
- **README**: `README.md` (comprehensive project documentation)
- **Supabase Docs**: https://supabase.com/docs
- **OpenRouter Docs**: https://openrouter.ai/docs
- **Vitest Docs**: https://vitest.dev/guide/
