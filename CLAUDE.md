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

## 🔧 Key Patterns & Components

### Artifact System
- **Auto-injected libraries (27+)**: D3, Chart.js, Three.js, GSAP, Lodash, Moment
- **React artifacts include**: Recharts, Framer Motion, lucide-react, Radix UI
- **Validation**: Multi-layer defense system against invalid imports
  - Layer 1: System prompt warnings (pre-generation)
  - Layer 2: Template examples (learn-by-example)
  - Layer 3: Pre-generation validation (request analysis)
  - Layer 4: Post-generation transformation (auto-fix invalid imports)
  - Layer 5: Runtime validation (block rendering if critical errors)
- **UI Framework**: ai-elements primitives (ArtifactContainer wrapper)
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

### Animation System (motion/react)
- **Durations**: fast (150ms), normal (200ms), moderate (300ms), slow (500ms)
- **Route transitions**: fadeInUp pattern, 300ms, sync mode
- **Message animations**: Only new messages to prevent lag
- **Accessibility**: `motion-safe:` prefix respects user preferences

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

# Browser verification checklist
✓ Page loads without console errors
✓ UI renders correctly (screenshot)
✓ Critical user flows work
✓ API calls return 200/201
✓ Service worker registered
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

- **Command Templates** (reusable workflows):
  - `.claude/commands/verify-ui.md` - UI verification workflow
  - `.claude/commands/test-artifact.md` - Artifact testing steps
  - `.claude/commands/debug-auth.md` - Authentication debugging

- **Session Notes** (recent work):
  - `.claude/CODE_REVIEW_FIXES_SUMMARY.md` - Security fixes documentation (Nov 2025)
  - `.claude/ARTIFACT_PROMPT_OPTIMIZATION.md` - Structured prompt engineering (Nov 2025)

## 📝 Environment Variables

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://vznhbocnuykdmjvujaka.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_key_here
VITE_SUPABASE_PROJECT_ID=vznhbocnuykdmjvujaka
```

### Edge Functions (Supabase Secrets)
```bash
# Required: 10 API keys distributed across 3 feature pools
# Each key MUST be from a different Google Cloud project for independent rate limits

# Chat pool (Flash model) - Keys 1-2
GOOGLE_KEY_1=AIzaSy...  # Chat key 1
GOOGLE_KEY_2=AIzaSy...  # Chat key 2

# Artifact pool (Pro model) - Keys 3-6
GOOGLE_KEY_3=AIzaSy...  # Artifact key 1
GOOGLE_KEY_4=AIzaSy...  # Artifact key 2
GOOGLE_KEY_5=AIzaSy...  # Artifact key 3
GOOGLE_KEY_6=AIzaSy...  # Artifact key 4

# Image pool (Flash-Image model) - Keys 7-10
GOOGLE_KEY_7=AIzaSy...   # Image key 1
GOOGLE_KEY_8=AIzaSy...   # Image key 2
GOOGLE_KEY_9=AIzaSy...   # Image key 3
GOOGLE_KEY_10=AIzaSy...  # Image key 4

# Optional: Production CORS origins (comma-separated)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Get API Keys:** [Google AI Studio](https://aistudio.google.com/app/apikey)

**Why 10 Keys?** Each key is from a separate Google Cloud project with independent rate limits:
- **Chat (Flash)**: 2 keys = 4 RPM total (2 RPM per key)
- **Artifacts (Pro)**: 4 keys = 8 RPM total (2 RPM per key) - shared by generation + fixing
- **Images (Flash-Image)**: 4 keys = 60 RPM total (15 RPM per key)

This architecture prevents overflow and ensures each feature has dedicated capacity.

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
CHAT Pool (Flash Model)
├── Keys: 1-2
├── Capacity: 4 RPM (2 keys × 2 RPM)
└── Used by: chat function

ARTIFACT Pool (Pro Model)
├── Keys: 3-6
├── Capacity: 8 RPM (4 keys × 2 RPM)
└── Used by: generate-artifact + generate-artifact-fix

IMAGE Pool (Flash-Image Model)
├── Keys: 7-10
├── Capacity: 60 RPM (4 keys × 15 RPM)
└── Used by: generate-image
```

**How It Works:**
1. **Cold Start**: Pick random key from pool (handles frequent Edge Function restarts)
2. **Subsequent Requests**: Round-robin through keys sequentially
3. **Next Cold Start**: Pick different random key (ensures distribution)

**Logs Example:**
```
🔑 Using GOOGLE_KEY_1 (position 1/2 in pool)  # Chat
🔑 Using GOOGLE_KEY_3 (position 1/4 in pool)  # Artifact
🔑 Using GOOGLE_KEY_7 (position 1/4 in pool)  # Image
```

**Full Guide:** See `KEY_POOL_ARCHITECTURE.md` and `FINAL_KEY_ROTATION_SUMMARY.md`

---

### 🔄 Advanced: LiteLLM Proxy (Optional - For Heavy Usage)

For even more capacity and advanced features like response caching and monitoring:

**Benefits:**
- ✅ 3x-5x more API capacity (e.g., 45 RPM for images with 3 keys)
- ✅ Response caching with Redis (saves 20-30% of API calls)
- ✅ Real-time monitoring dashboard
- ✅ Automatic failover with retry logic

**Quick Setup (5 minutes):**
```bash
# 1. Get 2-3 API keys per feature from different Google accounts
# 2. Copy configuration files
cp .env.example .env

# 3. Start LiteLLM proxy
docker-compose up -d

# 4. Access dashboard
open http://localhost:4000/ui
```

**Full Guide:** See `LITELLM_QUICKSTART.md` and `.claude/API_KEY_ROTATION_GUIDE.md`

## 🔒 Security Notes (November 2025 Updates)

### Recent Security Improvements
1. ✅ **Schema Injection Protection** - All SECURITY DEFINER functions use `search_path = public, pg_temp`
2. ✅ **Guest Rate Limiting** - 10 requests per 24 hours per IP (automatic cleanup after 7 days)
3. ✅ **CORS Origin Validation** - Replaced wildcard `*` with environment-based whitelist
4. ✅ **System Prompt Externalization** - Reduced chat function bundle size by 52%

### Manual Configuration Required
1. **Leaked Password Protection**: Enable in Supabase Dashboard → Authentication → Password Security
2. **Production CORS**: Set `ALLOWED_ORIGINS` environment variable in Edge Functions settings

See `.claude/CODE_REVIEW_FIXES_SUMMARY.md` for complete details.

---
*Last Updated: 2025-11-08 | Claude Code v1.x compatible*