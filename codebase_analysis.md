# Vana Codebase Analysis

**Generated**: November 24, 2025
**Codebase Version**: v0.0.0 (feat/extract-chat-layout-component branch)
**Analysis Depth**: Comprehensive

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Directory Structure Analysis](#3-directory-structure-analysis)
4. [File-by-File Breakdown](#4-file-by-file-breakdown)
5. [Architecture Deep Dive](#5-architecture-deep-dive)
6. [API Endpoints Analysis](#6-api-endpoints-analysis)
7. [Database Schema](#7-database-schema)
8. [State Management](#8-state-management)
9. [Testing Infrastructure](#9-testing-infrastructure)
10. [CI/CD Pipeline](#10-cicd-pipeline)
11. [Security Measures](#11-security-measures)
12. [Performance Optimizations](#12-performance-optimizations)
13. [Visual Architecture Diagrams](#13-visual-architecture-diagrams)
14. [Key Insights & Recommendations](#14-key-insights--recommendations)

---

## 1. Project Overview

### What is Vana?

**Vana** is a production-grade AI-powered development assistant that transforms natural language into:
- Interactive React components
- HTML pages with live preview
- Mermaid diagrams (flowcharts, sequence diagrams)
- SVG graphics
- Code snippets with syntax highlighting
- Markdown documents
- AI-generated images

### Project Classification

| Attribute | Value |
|-----------|-------|
| **Type** | Full-stack Web Application |
| **Architecture** | Serverless (BaaS with Edge Functions) |
| **Pattern** | Component-based SPA + API |
| **Target Platform** | Web (Desktop + Mobile responsive) |
| **Deployment** | Netlify/Vercel (Frontend) + Supabase (Backend) |

### Metrics Summary

| Metric | Value |
|--------|-------|
| **Source Files** | 238 TypeScript/TSX files |
| **Lines of Code** | ~32,579 lines |
| **Source Directory Size** | 1.5MB (src) + 792KB (supabase) |
| **Dependencies** | 71 production + 27 dev dependencies |
| **Test Coverage** | 74.21% statements |
| **Total Tests** | 293 passing, 27 skipped |

---

## 2. Technology Stack

### Frontend Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3 | UI framework with concurrent features |
| **TypeScript** | 5.8 | Type safety and developer experience |
| **Vite** | 5.4 | Build tool and dev server (SWC-powered) |
| **Tailwind CSS** | 3.4 | Utility-first styling |
| **shadcn/ui** | Latest | Component library (Radix UI based) |
| **TanStack Query** | 5.83 | Server state management |
| **React Router** | 6.30 | Client-side routing |
| **Motion** | 12.x | Animation library (Framer Motion successor) |

### Backend Layer

| Technology | Purpose |
|------------|---------|
| **Supabase** | PostgreSQL database + Auth + Edge Functions |
| **Deno** | Edge Function runtime |
| **OpenRouter** | AI model routing (Gemini, Kimi K2) |
| **Google AI Studio** | Image generation API |
| **Tavily** | Web search integration |

### AI Models Used

| Model | Provider | Use Case |
|-------|----------|----------|
| **Gemini 2.5 Flash Lite** | OpenRouter | Chat, summaries, titles |
| **Kimi K2-Thinking** | OpenRouter | Artifact generation, error fixing |
| **Gemini Flash Image** | Google AI Studio | Image generation (10-key rotation) |

### Key Libraries

| Library | Purpose |
|---------|---------|
| **react-markdown** | Markdown rendering |
| **remark-gfm** | GitHub-flavored markdown |
| **shiki** | Syntax highlighting |
| **mermaid** | Diagram rendering |
| **lucide-react** | Icon library |
| **zod** | Runtime validation |
| **JSZip** | Multi-file export |
| **DOMPurify** | XSS sanitization |

---

## 3. Directory Structure Analysis

```
llm-chat-site/
├── src/                          # Frontend application (1.5MB)
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui components (66 files)
│   │   ├── prompt-kit/           # Custom chat UI primitives
│   │   ├── landing/              # Marketing page components
│   │   ├── layout/               # Page layout components
│   │   ├── ai-elements/          # AI output rendering
│   │   └── kibo-ui/              # Third-party integrations
│   ├── hooks/                    # Custom React hooks (16 files)
│   ├── utils/                    # Utility functions (24 files)
│   ├── pages/                    # Route pages (8 files)
│   ├── contexts/                 # React contexts
│   ├── types/                    # TypeScript type definitions
│   ├── constants/                # Static constants
│   ├── data/                     # Static data files
│   ├── integrations/             # External service clients
│   ├── lib/                      # Utility libraries
│   └── test/                     # Test setup and mocks
├── supabase/                     # Backend infrastructure (792KB)
│   ├── functions/                # Edge Functions
│   │   ├── chat/                 # Main chat endpoint
│   │   ├── generate-artifact/    # Artifact generation
│   │   ├── bundle-artifact/      # NPM bundling service
│   │   ├── generate-artifact-fix/# Error fixing
│   │   ├── generate-title/       # Title generation
│   │   ├── generate-image/       # Image generation
│   │   ├── summarize-conversation/ # Summarization
│   │   ├── admin-analytics/      # Usage analytics
│   │   └── _shared/              # Shared utilities
│   └── migrations/               # Database migrations (13 files)
├── public/                       # Static assets
├── .github/workflows/            # CI/CD pipelines (4 files)
├── docs/                         # Documentation
└── coverage/                     # Test coverage reports
```

### Directory Purposes

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `src/components/` | All React components including UI primitives, features, and layouts | `Artifact.tsx`, `ChatInterface.tsx`, `ArtifactCard.tsx` |
| `src/hooks/` | Custom React hooks for data fetching, state, and utilities | `useChatMessages.tsx`, `useChatSessions.tsx` |
| `src/utils/` | Pure utility functions for parsing, validation, export | `artifactParser.ts`, `artifactValidator.ts` |
| `src/pages/` | Route-level page components | `Home.tsx`, `Auth.tsx`, `Landing.tsx` |
| `supabase/functions/` | Deno Edge Functions for AI integration | `chat/index.ts`, `generate-artifact/index.ts` |
| `supabase/migrations/` | PostgreSQL schema migrations | Rate limiting, analytics, chat tables |

---

## 4. File-by-File Breakdown

### Core Application Files

#### Entry Points

| File | Size | Purpose |
|------|------|---------|
| `src/main.tsx` | 10 lines | React DOM mount point |
| `src/App.tsx` | 108 lines | Root component with routing, providers, error boundaries |
| `index.html` | - | HTML shell with PWA metadata |

#### Key Components

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/Artifact.tsx` | ~500 | Main artifact renderer (React, HTML, SVG, Mermaid, Code) |
| `src/components/ArtifactCard.tsx` | ~300 | Artifact preview cards with actions |
| `src/components/ChatSidebar.tsx` | ~400 | Session list with CRUD operations |
| `src/components/ExportMenu.tsx` | ~250 | Multi-format export (ZIP, MD, JSON, SVG) |
| `src/components/Settings.tsx` | ~200 | User preferences panel |

#### Custom Hooks

| File | Lines | Purpose |
|------|-------|---------|
| `useChatMessages.tsx` | ~600 | Message CRUD, SSE streaming, artifact parsing |
| `useChatSessions.tsx` | ~200 | Session management with TanStack Query |
| `useArtifactVersions.ts` | ~400 | Version control for artifacts |
| `useGuestSession.ts` | ~200 | Guest mode state management |
| `useScrollTransition.ts` | ~200 | Scroll-triggered animations |

#### Utility Modules

| File | Lines | Purpose |
|------|-------|---------|
| `artifactParser.ts` | ~200 | Parse artifact XML from AI responses |
| `artifactValidator.ts` | 361 | Client-side syntax and import validation |
| `artifactBundler.ts` | ~200 | Server-side npm bundling integration |
| `exportArtifact.ts` | 290 | Multi-format export utilities |
| `libraryDetection.ts` | 192 | Detect and inject CDN libraries |
| `themeUtils.ts` | 264 | Theme styling for iframes |
| `cacheBusting.ts` | 239 | Service worker cache management |

### Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Build configuration with PWA, compression, code splitting |
| `tailwind.config.ts` | Tailwind CSS with custom colors, animations, typography |
| `tsconfig.json` | TypeScript configuration with path aliases |
| `vitest.config.ts` | Test configuration with coverage thresholds |
| `eslint.config.js` | ESLint configuration |

### Edge Functions

| Function | Purpose | Model |
|----------|---------|-------|
| `chat/index.ts` | Main chat streaming with intent detection | Gemini 2.5 Flash Lite |
| `generate-artifact/index.ts` | Artifact code generation | Kimi K2-Thinking |
| `generate-artifact-fix/index.ts` | Artifact error fixing | Kimi K2-Thinking |
| `bundle-artifact/index.ts` | NPM package bundling | - |
| `generate-title/index.ts` | Session title generation | Gemini Flash Lite |
| `generate-image/index.ts` | AI image generation | Gemini Flash Image |
| `summarize-conversation/index.ts` | Long conversation summarization | Gemini Flash Lite |

### Shared Backend Utilities

| File | Purpose |
|------|---------|
| `_shared/config.ts` | Centralized configuration (rate limits, models, validation) |
| `_shared/openrouter-client.ts` | OpenRouter API client with retry logic |
| `_shared/tavily-client.ts` | Tavily web search integration |
| `_shared/artifact-validator.ts` | Server-side artifact validation |
| `_shared/cors-config.ts` | CORS header management |
| `_shared/error-handler.ts` | Centralized error handling |
| `_shared/rate-limiter.ts` | Rate limiting enforcement |
| `_shared/system-prompt-inline.ts` | Externalized AI prompts |

---

## 5. Architecture Deep Dive

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (React SPA)                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │  Pages   │  │Components│  │  Hooks   │  │   State (TanStack)   │ │
│  │          │  │          │  │          │  │                      │ │
│  │  Home    │──│ Chat     │──│ useChat  │──│  QueryClient         │ │
│  │  Auth    │  │ Artifact │  │ Messages │  │  React Context       │ │
│  │  Landing │  │ Sidebar  │  │          │  │                      │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS (SSE for streaming)
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTIONS (Deno)                   │
├─────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────────┐  ┌──────────────────────────┐  │
│  │    chat    │  │generate-artifact│  │    bundle-artifact      │  │
│  │            │  │                │  │                          │  │
│  │  Streaming │  │  Code Gen      │  │  NPM Bundling            │  │
│  │  Intent    │  │  Validation    │  │  Storage Upload          │  │
│  │  Tavily    │  │  Transform     │  │                          │  │
│  └─────┬──────┘  └───────┬────────┘  └────────────┬─────────────┘  │
│        │                 │                        │                 │
│        └────────────────┬┴────────────────────────┘                 │
│                         │                                           │
│  ┌──────────────────────┴───────────────────────────────────────┐  │
│  │                    _shared/ utilities                         │  │
│  │  config.ts │ openrouter-client.ts │ artifact-validator.ts    │  │
│  │  cors-config.ts │ rate-limiter.ts │ error-handler.ts         │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │   OpenRouter │ │ Google AI    │ │   Tavily     │
            │              │ │   Studio     │ │              │
            │ Gemini Flash │ │ Flash Image  │ │ Web Search   │
            │ Kimi K2      │ │ 10-key pool  │ │              │
            └──────────────┘ └──────────────┘ └──────────────┘
                                    │
                                    ▼
            ┌─────────────────────────────────────────────────┐
            │            SUPABASE POSTGRESQL                   │
            │                                                  │
            │  chat_sessions │ chat_messages │ guest_rate_limits│
            │  user_preferences │ ai_usage_tracking │ intent_examples│
            │                                                  │
            │  Row-Level Security (RLS) on all tables          │
            └─────────────────────────────────────────────────┘
```

### Component Hierarchy

```
App.tsx
├── QueryClientProvider (TanStack Query)
├── ThemeProvider (Dark/Light mode)
├── TooltipProvider (Radix UI)
├── BrowserRouter
│   └── Suspense (Code splitting fallback)
│       └── AnimationErrorBoundary
│           └── AnimatedRoutes
│               ├── Home (/)
│               │   ├── Landing sections (scroll-triggered)
│               │   └── ChatLayout
│               │       ├── ChatSidebar
│               │       │   └── SessionList
│               │       │       └── SidebarItem[]
│               │       └── ChatInterface
│               │           ├── ResizablePanel (Chat)
│               │           │   ├── MessageList
│               │           │   │   └── MessageWithArtifacts[]
│               │           │   │       ├── Markdown
│               │           │   │       ├── ReasoningDisplay
│               │           │   │       ├── WebSearchResults
│               │           │   │       └── ArtifactCard[]
│               │           │   └── PromptInput
│               │           └── ResizablePanel (Artifact)
│               │               └── ArtifactContainer
│               │                   └── Artifact (renderer)
│               ├── Auth (/auth)
│               ├── Signup (/signup)
│               ├── Landing (/landing)
│               ├── AdminDashboard (/admin)
│               └── NotFound (*)
├── Toaster (shadcn/ui)
├── Sonner (toast notifications)
└── UpdateNotification (Service Worker)
```

### Data Flow

```
User Input
    │
    ▼
ChatInterface.onSubmit()
    │
    ├─► useChatMessages.streamChat()
    │       │
    │       ├─► POST /functions/v1/chat
    │       │       │
    │       │       ├─► Intent Detection
    │       │       │   (artifact/image/search)
    │       │       │
    │       │       ├─► Tavily Search (if needed)
    │       │       │
    │       │       └─► OpenRouter Gemini
    │       │               │
    │       │               ▼
    │       │           SSE Stream
    │       │               │
    │       ▼               ▼
    │   Parse Response   Browser
    │       │               │
    │       ├─► Text delta  │
    │       ├─► Reasoning   │
    │       └─► Search results
    │               │
    │               ▼
    │       parseArtifacts()
    │               │
    │               ├─► Extract artifact XML
    │               ├─► Generate stable ID (SHA-256)
    │               └─► Detect npm imports
    │                       │
    │                       ▼
    │               Has npm imports?
    │                   │
    │           ┌───────┴───────┐
    │           │ Yes           │ No
    │           ▼               ▼
    │   POST /bundle-artifact   Babel Standalone
    │           │               (client-side)
    │           ▼
    │   Deno Bundle + Storage
    │           │
    │           ▼
    │   Signed URL (1h expiry)
    │           │
    └───────────┴───────────────────────┐
                                        ▼
                                ArtifactContainer.render()
                                        │
                                        ▼
                                   Iframe Sandbox
```

### 5-Layer Artifact Validation System

The codebase implements defense-in-depth validation:

```
Layer 1: System Prompt Prevention
    │   AI instructed to avoid local imports
    ▼
Layer 2: Template Examples
    │   All templates use Radix UI + Tailwind only
    ▼
Layer 3: Pre-Generation Validation
    │   artifact-validator.ts scans for problematic patterns
    ▼
Layer 4: Post-Generation Transformation
    │   Auto-fix common mistakes (immutability, reserved keywords)
    ▼
Layer 5: Runtime Validation
        Block artifacts with critical errors before rendering
```

---

## 6. API Endpoints Analysis

### Edge Function Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/functions/v1/chat` | POST | Optional | Main chat with streaming |
| `/functions/v1/generate-artifact` | POST | Optional | Generate React/HTML/SVG artifacts |
| `/functions/v1/generate-artifact-fix` | POST | Required | Fix artifact errors |
| `/functions/v1/bundle-artifact` | POST | Required | Bundle npm dependencies |
| `/functions/v1/generate-title` | POST | Required | Generate session titles |
| `/functions/v1/generate-image` | POST | Optional | Generate AI images |
| `/functions/v1/summarize-conversation` | POST | Required | Summarize long conversations |
| `/functions/v1/admin-analytics` | GET | Admin | Usage analytics dashboard |

### Request/Response Formats

#### Chat Endpoint

**Request:**
```typescript
{
  messages: Array<{
    role: 'user' | 'assistant' | 'system',
    content: string
  }>,
  sessionId?: string,
  conversationSummary?: string,
  recentMessages?: Array<Message>
}
```

**Response (SSE Stream):**
```typescript
// Text delta
data: {"delta": "Hello, "}

// Reasoning step
data: {"reasoning": {"title": "Analyzing...", "content": "..."}}

// Search results
data: {"searchResults": {"query": "...", "results": [...]}}

// Done signal
data: [DONE]
```

#### Generate Artifact Endpoint

**Request:**
```typescript
{
  prompt: string,
  sessionId?: string,
  conversationContext?: string
}
```

**Response:**
```typescript
{
  content: string,  // Artifact XML
  usage?: {
    inputTokens: number,
    outputTokens: number
  }
}
```

#### Bundle Artifact Endpoint

**Request:**
```typescript
{
  code: string,
  dependencies: string[],  // e.g., ['@radix-ui/react-dialog']
  sessionId: string,
  artifactId: string
}
```

**Response:**
```typescript
{
  success: true,
  bundleUrl: string,  // Signed URL (1h expiry)
  size: number
}
```

### Rate Limiting

| User Type | Chat | Artifacts | Images | Search |
|-----------|------|-----------|--------|--------|
| Guest | 20/5h | 5/5h | 20/5h | 10/5h |
| Authenticated | 100/5h | 50/5h | 50/5h | 50/5h |
| API Throttle | 15/min | 10/min | 15/min | 10/min |

---

## 7. Database Schema

### Core Tables

```sql
-- Chat sessions with AI-generated titles
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL DEFAULT 'New Chat',
  first_message TEXT,
  conversation_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat messages with structured reasoning
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  reasoning TEXT,  -- Chain of thought JSON
  reasoning_steps JSONB,  -- Structured reasoning
  search_results JSONB,  -- Web search results
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Guest rate limiting (IP-based)
CREATE TABLE guest_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL UNIQUE,  -- IP address
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT now(),
  last_request_at TIMESTAMPTZ DEFAULT now()
);

-- AI usage tracking for analytics
CREATE TABLE ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  model TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_cost NUMERIC(10, 6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  approved_libraries TEXT[],
  auto_approve_libraries BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Row-Level Security (RLS)

All tables have RLS policies:

```sql
-- Users can only access their own sessions
CREATE POLICY "Users can view own sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only access messages in their sessions
CREATE POLICY "Users can view own messages"
  ON chat_messages FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );
```

### Migrations Timeline

| Date | Migration | Purpose |
|------|-----------|---------|
| 2025-01-12 | intent_examples_v2 | Intent detection training data |
| 2025-10-24 | d353ddaa | Initial chat schema |
| 2025-11-08 | comprehensive_rate_limiting | Rate limit tables |
| 2025-11-12 | ai_usage_tracking | Usage analytics |
| 2025-11-12 | usage_analytics_views | Analytics views |
| 2025-11-14 | add_reasoning_steps_column | Structured reasoning |
| 2025-11-22 | create_artifact_bundles_bucket | Bundle storage |
| 2025-11-23 | add_search_results_column | Web search storage |

---

## 8. State Management

### TanStack Query (Primary)

Used for all server state:

```typescript
// Session list
const { data: sessions } = useQuery({
  queryKey: ['chatSessions'],
  queryFn: () => supabase.from('chat_sessions').select('*')
});

// Messages for a session
const { data: messages } = useQuery({
  queryKey: ['chatMessages', sessionId],
  queryFn: () => supabase.from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
});
```

**Cache Configuration:**
- Stale time: 5 minutes
- GC time: 10 minutes
- No refetch on window focus
- Single retry on failure

### React Context (Minimal)

Used sparingly for global UI state:

```typescript
// MultiArtifactContext - Manages up to 5 concurrent artifacts
const MultiArtifactContext = createContext({
  selectedArtifacts: Map<string, ArtifactData>,
  addArtifact: (id: string, data: ArtifactData) => void,
  removeArtifact: (id: string) => void,
  // LRU eviction when max reached
});
```

### Local Storage

Used for persistence:
- Theme preference
- Session artifact selections
- Version information (cache busting)

---

## 9. Testing Infrastructure

### Framework Configuration

```typescript
// vitest.config.ts
{
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 5000
  },
  coverage: {
    provider: 'v8',
    thresholds: {
      statements: 55,
      branches: 50,
      functions: 55,
      lines: 55
    }
  }
}
```

### Current Coverage

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Statements | 74.21% | 55% | +19% |
| Branches | 68.58% | 50% | +18% |
| Functions | 65.81% | 55% | +11% |
| Lines | 74.29% | 55% | +19% |

### Test Suites

| Suite | Tests | Focus |
|-------|-------|-------|
| `artifactValidator.test.ts` | 20+ | Import validation, syntax checking |
| `exportArtifact.test.ts` | 15+ | Multi-format export (98% coverage) |
| `artifactBundler.test.ts` | 10+ | NPM bundling integration |
| `npmDetection.test.ts` | 10+ | Package detection |
| `useArtifactVersions.test.ts` | 10+ | Version control hook |
| `Artifact.test.tsx` | 15+ | Component rendering |

### Security Tests

```typescript
// 14 XSS attack scenarios validated
describe('XSS Prevention', () => {
  it('should sanitize script tags', () => {...});
  it('should sanitize event handlers', () => {...});
  it('should sanitize data URIs', () => {...});
  // ... 11 more scenarios
});
```

---

## 10. CI/CD Pipeline

### GitHub Actions Workflows

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `frontend-quality.yml` | PR, push to main | Lint, Test, Coverage, Build |
| `edge-functions-tests.yml` | PR | Deno tests for Edge Functions |
| `model-config-guard.yml` | PR | Validate model configuration |
| `deploy-edge-functions.yml` | Manual | Deploy to Supabase |

### Frontend Quality Pipeline

```yaml
name: Frontend Quality
jobs:
  quality:
    steps:
      - Checkout repository
      - Setup Node.js 20
      - Install dependencies (npm ci)
      - Lint (npm run lint)
      - Test with coverage (npm run test:coverage)
      - Upload coverage to Codecov
      - Build (npm run build)
      - Upload coverage artifact
```

### Model Configuration Guard

```yaml
# Prevents accidental model name changes
- Validates config.ts against golden snapshot
- Fails if model names have drifted
- Ensures MODELS.* constants are used everywhere
```

### Branch Protection

- PRs required for main branch
- Required status checks:
  - Frontend Quality (lint, test, build)
  - Edge Functions Tests
  - Model Config Guard

---

## 11. Security Measures

### Authentication

| Feature | Implementation |
|---------|----------------|
| **Provider** | Supabase Auth (email + Google OAuth) |
| **Token** | JWT with automatic refresh |
| **Session** | Stored in localStorage (secure context) |
| **API Auth** | Bearer token in Authorization header |

### Database Security

```sql
-- All SECURITY DEFINER functions include search_path
CREATE FUNCTION get_user_sessions()
RETURNS SETOF chat_sessions
SECURITY DEFINER
SET search_path = public, pg_temp  -- Prevents schema injection
AS $$
  SELECT * FROM chat_sessions WHERE user_id = auth.uid();
$$;
```

### Input Validation

| Layer | Mechanism |
|-------|-----------|
| **Frontend** | Zod schemas, React Hook Form |
| **Backend** | Deno validators, length limits |
| **Database** | CHECK constraints, RLS policies |

### XSS Prevention

```typescript
// Triple-layer sanitization
1. Server validation (artifact-validator.ts)
2. Zod schema validation (runtime)
3. DOMPurify sanitization (before render)

// Artifact sandbox isolation
- Iframes with sandbox attribute
- No access to parent window
- CSP headers on bundle URLs
```

### CORS Configuration

```typescript
// Environment-based origin validation
const ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [];

// No wildcard origins in production
if (origin && ALLOWED_ORIGINS.includes(origin)) {
  headers.set('Access-Control-Allow-Origin', origin);
}
```

### Rate Limiting

```typescript
// IP-based for guests
// User ID-based for authenticated
// Per-endpoint limits (chat, artifacts, images)
// Exponential backoff on violations
```

---

## 12. Performance Optimizations

### Build Optimizations

```typescript
// vite.config.ts
{
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'vendor-markdown': ['react-markdown', 'remark-gfm'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js']
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Production only
        pure_funcs: ['console.log', 'console.info']
      }
    }
  }
}
```

### Compression

| Type | Threshold | Extension |
|------|-----------|-----------|
| Brotli | 1KB | .br |
| Gzip | 1KB | .gz |

### PWA Configuration

```typescript
// Service worker strategy
{
  registerType: 'autoUpdate',
  workbox: {
    clientsClaim: true,  // Immediate activation
    skipWaiting: true,
    runtimeCaching: [
      {
        urlPattern: /supabase\.co/,
        handler: 'NetworkFirst',
        options: { cacheName: 'supabase-cache' }
      },
      {
        urlPattern: /\.(png|jpg|svg)$/,
        handler: 'NetworkFirst',
        options: { cacheName: 'images-cache' }
      }
    ]
  }
}
```

### React Optimizations

| Technique | Implementation |
|-----------|----------------|
| **Code Splitting** | `lazy()` for all pages |
| **Memoization** | `React.memo()` on message components |
| **Virtualization** | Virtual scrolling for long message lists |
| **Debouncing** | Input handlers, search queries |
| **Animation** | Only animate last message (not entire history) |

### Backend Optimizations

| Technique | Implementation |
|-----------|----------------|
| **System Prompt Externalization** | 52% bundle reduction |
| **Shared Utilities** | Common code in `_shared/` |
| **Connection Pooling** | Supabase handles automatically |
| **Response Streaming** | SSE for real-time updates |

---

## 13. Visual Architecture Diagrams

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                          React SPA (Vite)                                ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ ││
│  │  │ Landing Page │  │ Chat Panel   │  │ Artifact     │  │ Sidebar     │ ││
│  │  │              │  │              │  │ Panel        │  │             │ ││
│  │  │  Hero        │  │  Messages    │  │  Preview     │  │  Sessions   │ ││
│  │  │  Benefits    │  │  Input       │  │  Export      │  │  Settings   │ ││
│  │  │  CTA         │  │  Streaming   │  │  Versions    │  │  Theme      │ ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE PLATFORM                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                       Edge Functions (Deno)                              ││
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────────┐││
│  │  │   /chat    │  │/generate-  │  │ /bundle-   │  │ /generate-image    │││
│  │  │            │  │ artifact   │  │  artifact  │  │                    │││
│  │  │ SSE Stream │  │ Code Gen   │  │ NPM Bundle │  │ AI Images          │││
│  │  │ Intent     │  │ Transform  │  │ Storage    │  │ 10-key rotation    │││
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └──────────┬─────────┘││
│  │        │               │               │                    │          ││
│  │        └───────────────┴───────────────┴────────────────────┘          ││
│  │                                │                                        ││
│  │                    ┌───────────┴───────────┐                           ││
│  │                    │    _shared/ utils     │                           ││
│  │                    └───────────────────────┘                           ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                       PostgreSQL + Auth                                  ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  ││
│  │  │chat_sessions │  │chat_messages │  │guest_rate_   │  │ai_usage_   │  ││
│  │  │              │  │              │  │limits        │  │tracking    │  ││
│  │  │ id, title    │  │ id, content  │  │ identifier   │  │ model      │  ││
│  │  │ user_id      │  │ role         │  │ request_count│  │ tokens     │  ││
│  │  │ summary      │  │ reasoning    │  │ window_start │  │ cost       │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  ││
│  │                                                                          ││
│  │  ┌──────────────┐  ┌──────────────┐                                     ││
│  │  │   Storage    │  │     Auth     │                                     ││
│  │  │              │  │              │                                     ││
│  │  │ Bundles      │  │ JWT Tokens   │                                     ││
│  │  │ Images       │  │ Google OAuth │                                     ││
│  │  └──────────────┘  └──────────────┘                                     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │  OpenRouter  │  │ Google AI    │  │   Tavily     │
            │              │  │   Studio     │  │              │
            │ Gemini Flash │  │ Flash Image  │  │ Web Search   │
            │ Kimi K2      │  │              │  │              │
            └──────────────┘  └──────────────┘  └──────────────┘
```

### Artifact Rendering Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARTIFACT GENERATION FLOW                      │
└─────────────────────────────────────────────────────────────────┘

  User Request: "Create a dashboard with Radix UI dialog"
        │
        ▼
┌───────────────────┐
│  Intent Detection │
│  (chat function)  │
└─────────┬─────────┘
          │ "artifact" intent
          ▼
┌───────────────────┐
│ generate-artifact │
│   Edge Function   │
│                   │
│ 1. Validate input │
│ 2. Kimi K2 model  │
│ 3. Transform code │
│ 4. Return XML     │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  parseArtifacts() │
│  (client-side)    │
│                   │
│ 1. Extract XML    │
│ 2. SHA-256 ID     │
│ 3. Detect imports │
└─────────┬─────────┘
          │
          ▼
    ┌─────┴─────┐
    │Has npm    │
    │imports?   │
    └─────┬─────┘
          │
    ┌─────┴─────┐
    │           │
   Yes          No
    │           │
    ▼           ▼
┌─────────┐  ┌─────────┐
│ bundle- │  │ Babel   │
│artifact │  │Standalone│
│         │  │         │
│1.Extract│  │Client-  │
│  deps   │  │side     │
│2.Bundle │  │transform│
│  w/esm  │  │         │
│3.Upload │  │         │
│  storage│  │         │
│4.Return │  │         │
│  URL    │  │         │
└────┬────┘  └────┬────┘
     │            │
     └──────┬─────┘
            │
            ▼
    ┌───────────────┐
    │ ArtifactContainer │
    │                   │
    │  Sandboxed        │
    │  Iframe           │
    │                   │
    │  CSP headers      │
    │  Theme injection  │
    │  Error boundary   │
    └───────────────────┘
```

---

## 14. Key Insights & Recommendations

### Code Quality Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Architecture** | Excellent | Clean separation of concerns, well-defined layers |
| **Type Safety** | Good | TypeScript throughout, some `any` usage could be reduced |
| **Testing** | Good | 74% coverage, comprehensive security tests |
| **Documentation** | Excellent | Detailed CLAUDE.md, inline comments, type docs |
| **Error Handling** | Excellent | 5-layer validation, graceful degradation |
| **Security** | Excellent | RLS, rate limiting, XSS prevention, CORS |

### Strengths

1. **Robust Artifact System**
   - 5-layer validation prevents most failures
   - Dual rendering (Babel + Server bundling) handles all use cases
   - Automatic error fixing with AI

2. **Production-Ready Infrastructure**
   - Comprehensive rate limiting
   - Golden snapshot testing for model config
   - Automated CI/CD pipeline

3. **Developer Experience**
   - Well-documented codebase
   - Centralized configuration
   - Clear error messages

4. **Performance**
   - Code splitting reduces initial bundle
   - PWA support for offline access
   - Streaming for real-time feedback

### Areas for Improvement

1. **Type Safety Enhancement**
   ```typescript
   // Consider enabling stricter TypeScript options
   {
     "strictNullChecks": true,  // Currently false
     "noImplicitAny": true      // Currently false
   }
   ```

2. **Test Coverage Expansion**
   - Integration tests for Edge Functions
   - E2E tests with Playwright/Cypress
   - Visual regression tests

3. **Monitoring & Observability**
   - Add structured logging (not just console.log)
   - Implement APM (Application Performance Monitoring)
   - Error tracking (Sentry/LogRocket)

4. **Documentation**
   - API documentation (OpenAPI/Swagger)
   - Component storybook
   - Architecture decision records (ADRs)

### Security Recommendations

1. **Content Security Policy**: Add CSP headers to the main application
2. **Subresource Integrity**: Add SRI hashes for CDN resources
3. **API Rate Limiting**: Consider Redis for distributed rate limiting
4. **Audit Logging**: Log all security-relevant events

### Performance Recommendations

1. **Image Optimization**: Consider next-gen formats (WebP, AVIF)
2. **Edge Caching**: Add CDN for static assets
3. **Database Indexing**: Review query patterns and add indexes
4. **Bundle Analysis**: Regular bundle size audits

---

## Appendix: Quick Reference

### Development Commands

```bash
# Start development
npm run dev

# Run tests
npm run test
npm run test:coverage

# Build
npm run build

# Deploy Edge Functions
supabase functions deploy <function-name>
```

### Key Files to Modify

| Task | Files |
|------|-------|
| Add new page | `src/pages/`, `src/App.tsx` |
| Add new component | `src/components/` |
| Add Edge Function | `supabase/functions/` |
| Update rate limits | `supabase/functions/_shared/config.ts` |
| Update AI models | `supabase/functions/_shared/config.ts` |
| Add database migration | `supabase/migrations/` |

### Environment Variables

```bash
# Frontend (.env)
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=

# Backend (Supabase Secrets)
OPENROUTER_GEMINI_FLASH_KEY=
OPENROUTER_KIMI_K2_KEY=
GOOGLE_KEY_1= through GOOGLE_KEY_10=
ALLOWED_ORIGINS=
TAVILY_API_KEY=
```

---

*Generated by Claude Code - Comprehensive Codebase Analysis*
