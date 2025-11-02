# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered chat assistant application built with Vite, React, TypeScript, shadcn/ui, and Tailwind CSS. The app features real-time chat with AI, artifact generation (code, HTML, React components, Mermaid diagrams), session management, and authentication via Supabase.

## Common Commands

### Development
```bash
npm run dev          # Start development server on port 8080
npm run build        # Production build with optimizations
npm run build:dev    # Development build with sourcemaps
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Package Management
**CRITICAL**: Always use `npm` commands. Never use Bun, Yarn, or pnpm as this will create conflicting lock files.

If you encounter dependency issues:
```bash
rm -rf node_modules
rm -f bun.lockb yarn.lock pnpm-lock.yaml
npm install
```

## Architecture Overview

### Core Structure
```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components (69 files)
│   ├── prompt-kit/     # Custom chat UI primitives
│   ├── landing/        # Landing page components (Hero, ShowcaseSection, BenefitsSection, CTASection)
│   ├── ChatInterface   # Main chat interface with artifact canvas
│   ├── ChatSidebar     # Session list sidebar
│   ├── Artifact        # Artifact renderer (code, HTML, React, Mermaid, SVG)
│   └── VirtualizedMessageList  # Performance-optimized message list
├── hooks/              # Custom React hooks
│   ├── useChatMessages # Chat message CRUD and streaming logic
│   └── useChatSessions # Session management
├── utils/              # Utility functions
│   ├── artifactParser  # Extracts artifacts from AI responses
│   ├── artifactValidator # Validates and secures artifact content
│   ├── authHelpers     # Session validation helpers
│   └── fileValidation  # File upload validation
├── integrations/
│   └── supabase/       # Supabase client and type definitions
└── pages/              # Route pages (Landing, Index, Auth, Signup, NotFound)
```

### Key Components

#### Landing Page (`src/pages/Landing.tsx`)
The landing page showcases the app's capabilities with multiple sections:

**Components:**
- **Hero** - Main hero section with CTA buttons
- **ShowcaseSection** - Embla carousel displaying AI capability demos (research, code, visualization, diagrams, images, documents)
- **BenefitsSection** - Feature benefits grid
- **CTASection** - Call-to-action section

**ShowcaseSection Carousel:**
- Uses Embla Carousel with AutoScroll plugin
- Implements edge fade using `mask-image` CSS property (not overlay divs)
- Fade pattern: `linear-gradient(to right, transparent, black 8%, black 92%, transparent)`
- Theme-aware, performant, and Safari-compatible
- Auto-scrolls at 1px/s, pauses on hover
- Manual navigation with chevron buttons (desktop) or prev/next buttons (mobile)
- 6 showcase cards with gradient borders and hover effects

**Implementation Pattern:**
```tsx
// Use mask-image for fade edges (preferred over overlay divs)
<div
  ref={emblaRef}
  style={{
    maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
    WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)'
  }}
>
  {/* carousel content */}
</div>
```

#### ChatInterface (`src/components/ChatInterface.tsx`)
- Main chat UI with message list and input
- Manages artifact canvas with ResizablePanel
- Handles file uploads and streaming responses
- Uses `useChatMessages` hook for message management
- Passes send handler to parent via `onSendMessage` callback

#### Artifact System (`src/components/Artifact.tsx`)
- Renders interactive artifacts in a sandboxed environment
- Supported types: `code`, `html`, `react`, `svg`, `mermaid`, `markdown`, `image`
- Library approval system for external CDN dependencies
- Error categorization: syntax, runtime, import, unknown
- Validation before rendering with `artifactValidator`

#### Artifact Parser (`src/utils/artifactParser.ts`)
- Extracts artifacts from XML-like tags in AI responses
- Format: `<artifact type="..." title="...">content</artifact>`
- Maps MIME types to internal types
- Detects HTML code blocks as artifacts
- Returns cleaned content + extracted artifacts

#### Session Management
- **useChatSessions**: Creates, fetches, deletes chat sessions
- **useChatMessages**: CRUD operations for messages in a session
- Sessions stored in Supabase with RLS policies
- Optimized session validation (checks 5min before token expiry)

### Authentication & Security
- Supabase Auth with localStorage persistence
- Session validation before operations (`ensureValidSession`)
- RLS policies on `chat_sessions` and `chat_messages` tables
- File upload validation: type, size, MIME type, content scanning
- Sanitized filenames with user-scoped storage paths

#### Google OAuth Setup
The application supports Google OAuth authentication for streamlined user sign-in/sign-up.

**Supabase Configuration:**
1. Navigate to Supabase Dashboard → Authentication → Providers
2. Enable the **Google** provider
3. Configure OAuth consent screen in [Google Cloud Console](https://console.cloud.google.com/)
4. Add authorized redirect URIs in Google Cloud Console:
   - Development: `http://localhost:8080/auth`
   - Production: `https://your-production-domain.com/auth`
5. Copy Client ID and Client Secret from Google Cloud Console to Supabase

**Implementation:**
- Shared hook: `useGoogleAuth` (`src/hooks/useGoogleAuth.ts`)
- Used in both `LoginForm.tsx` and `SignupForm.tsx`
- OAuth redirects to `/auth` page which handles session detection
- Auth page redirects to `/` after successful authentication
- Proper error handling with user-friendly messages
- TypeScript-safe with `AuthError` types from `@supabase/supabase-js`
- Includes specific error messages for popup blockers and network issues

### Database Schema (Supabase)
```typescript
chat_sessions {
  id: string (PK)
  user_id: string (FK to auth.users)
  title: string
  first_message: string | null
  conversation_summary: string | null
  created_at, updated_at: timestamps
}

chat_messages {
  id: string (PK)
  session_id: string (FK to chat_sessions)
  role: "user" | "assistant"
  content: string
  reasoning: string | null
  token_count: number | null
  created_at: timestamp
}

user_preferences {
  id: string (PK)
  user_id: string (FK to auth.users)
  approved_libraries: Json
  auto_approve_libraries: boolean
}
```

### Performance Optimizations
- Lazy loaded routes with React.lazy
- Code splitting by vendor (react, ui, markdown, query, supabase)
- React Query with 5min stale time, 10min GC time
- VirtualizedMessageList for long chat histories
- Debounced artifact validation (300ms)
- PWA with service worker and caching strategies
- Brotli + Gzip compression
- Terser minification (drops console.log in production)

### Vite Configuration
- React SWC for fast refresh
- Path alias: `@` → `./src`
- Development server on `[::]`:8080
- Manual chunks for vendor code splitting
- Source maps in development only
- Optimized deps: react, react-dom, react-router-dom

### TypeScript Configuration
- Path mapping: `@/*` → `./src/*`
- Relaxed settings: `noImplicitAny: false`, `strictNullChecks: false`
- `skipLibCheck: true`, `allowJs: true`

### Styling & UI
- Tailwind CSS with `@tailwindcss/typography`
- shadcn/ui component library (extensive Radix UI primitives)
- Theme system: light/dark/system mode + color themes
- `tailwind-merge` and `class-variance-authority` for dynamic classes
- Mobile-first responsive design with safe area insets

### State Management
- React Query for server state
- React Context for theme
- Local state with useState/useEffect
- No Redux/Zustand

### Important Development Patterns

#### Custom Routes
Add custom routes ABOVE the catch-all `*` route in `src/App.tsx`:
```tsx
<Route path="/your-path" element={<YourComponent />} />
{/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
<Route path="*" element={<NotFound />} />
```

#### Artifact Creation
When creating artifacts, use this format in AI responses:
```
<artifact type="application/vnd.ant.react" title="Component Name">
import { Button } from "@/components/ui/button"
export default function Component() { ... }
</artifact>
```

Types: `application/vnd.ant.code`, `text/html`, `text/markdown`, `image/svg+xml`, `application/vnd.ant.mermaid`, `application/vnd.ant.react`

#### Session Validation Pattern
Always validate session before operations:
```typescript
const session = await ensureValidSession();
if (!session) {
  toast({ title: "Authentication required", variant: "destructive" });
  navigate("/auth");
  return;
}
```

#### File Upload Flow
1. Validate with `validateFile(file)` - checks type, size, MIME, content
2. Sanitize filename with `sanitizeFilename(file.name)`
3. Upload to Supabase storage with user ID prefix: `${user.id}/${timestamp}${ext}`
4. Get public URL and insert as markdown link

### Environment Variables
The project uses a single Supabase instance (lovable cloud) for both local development and deployments.

Required in `.env`:
```
VITE_SUPABASE_URL=https://xfwlneedhqealtktaacv.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

**Note:** No separate `.env.development` is needed. The lovable cloud instance works perfectly for local VS Code development with no restrictions.

### MCP Tools Integration
This project has multiple Model Context Protocol (MCP) servers configured, providing Claude Code with direct access to various development tools and services.

## Chrome DevTools MCP Integration

### Configuration
The Chrome DevTools MCP server is configured in `~/.claude.json`:
```bash
claude mcp add chrome-devtools "npx chrome-devtools-mcp@latest --channel stable --headless false"
```

**Configuration Options:**
- `--channel stable` - Uses stable Chrome release (recommended)
- `--headless false` - Browser visible for debugging (set to `true` for CI/CD)
- Alternative channels: `canary`, `beta`, `dev`
- `--isolated` - Run in isolated profile
- `--executablePath <path>` - Custom Chrome path

### Core Capabilities

Chrome DevTools MCP provides three primary capabilities for coding agents:

1. **Performance Analysis** - Record traces and extract actionable performance insights
2. **Browser Debugging** - Analyze network requests, console messages, and DOM state
3. **Reliable Automation** - Puppeteer-based automation with automatic action waiting

### Available Tools

The Chrome DevTools MCP provides comprehensive browser control and inspection:

**Navigation & Control:**
- Navigate to URLs and manage browser lifecycle
- Execute JavaScript in page context
- Wait for elements, network idle, or custom conditions

**Inspection & Debugging:**
- Take screenshots (full page or element-specific)
- Capture console messages (logs, warnings, errors)
- Inspect network requests and responses
- Query and inspect DOM elements
- Get accessibility tree snapshots

**Performance Analysis:**
- Start/stop performance trace recording
- Extract performance metrics and insights
- Analyze Core Web Vitals (LCP, FID, CLS)
- Identify performance bottlenecks

### Verification Requirements

**CRITICAL**: After ANY code changes, debugging, or deployments affecting the application, you MUST verify the service works as expected in a real browser using Chrome DevTools MCP.

**Required Verification Steps:**

1. **After Frontend Changes:**
   ```typescript
   // Navigate to the application
   await browser.navigate({ url: "http://localhost:8080" });

   // Take screenshot to verify UI renders correctly
   await browser.screenshot({ filename: "ui-verification.png" });

   // Check console for errors
   const console = await browser.getConsoleMessages();
   // Verify no critical errors present

   // Verify key interactive elements work
   await browser.click({ element: "main navigation button" });
   ```

2. **After Authentication Changes:**
   ```typescript
   // Navigate to auth page
   await browser.navigate({ url: "http://localhost:8080/auth" });

   // Fill and submit auth form
   await browser.fillForm({
     fields: [
       { name: "email", type: "textbox", value: "test@example.com" },
       { name: "password", type: "textbox", value: "testpass123" }
     ]
   });

   // Check for successful redirect
   await browser.waitFor({ text: "Dashboard" });

   // Verify session storage
   const session = await browser.evaluate({
     function: "() => localStorage.getItem('supabase.auth.token')"
   });
   ```

3. **After API/Backend Changes:**
   ```typescript
   // Navigate to feature using the API
   await browser.navigate({ url: "http://localhost:8080" });

   // Monitor network requests
   const requests = await browser.getNetworkRequests();

   // Verify API calls succeed
   const apiCalls = requests.filter(r => r.url.includes('/api/'));
   // Check status codes are 200/201

   // Check console for API errors
   const errors = await browser.getConsoleMessages({ onlyErrors: true });
   ```

4. **After Performance Optimizations:**
   ```typescript
   // Start performance trace
   await browser.startTrace();

   // Navigate and perform actions
   await browser.navigate({ url: "http://localhost:8080" });
   await browser.waitForNetworkIdle();

   // Stop trace and get metrics
   const metrics = await browser.stopTrace();

   // Verify Core Web Vitals meet targets:
   // - LCP < 2.5s
   // - FID < 100ms
   // - CLS < 0.1
   ```

5. **After Build/Deployment:**
   ```typescript
   // Navigate to production URL
   await browser.navigate({ url: "https://your-app.com" });

   // Verify service worker registration
   const sw = await browser.evaluate({
     function: "() => navigator.serviceWorker.controller !== null"
   });

   // Test offline capability
   await browser.setOffline(true);
   await browser.reload();
   // Verify app still loads from cache

   // Check no 404s or missing resources
   const requests = await browser.getNetworkRequests();
   const failed = requests.filter(r => r.status >= 400);
   ```

### Usage Patterns & Examples

**Basic Verification Workflow:**
```typescript
// 1. Start dev server if not running
await bash("npm run dev");
await sleep(3000); // Wait for server startup

// 2. Navigate to application
await browser.navigate({ url: "http://localhost:8080" });

// 3. Verify page loads without errors
const snapshot = await browser.snapshot();
const console = await browser.getConsoleMessages({ onlyErrors: true });

if (console.length > 0) {
  console.log("⚠️  Console errors detected:", console);
}

// 4. Take screenshot for visual confirmation
await browser.screenshot({ filename: "verification.png" });

// 5. Test critical user flows
await browser.click({ element: "Start New Chat button" });
await browser.type({ element: "message input", text: "test message" });
await browser.click({ element: "send button" });

// 6. Verify network calls succeed
const requests = await browser.getNetworkRequests();
const supabaseOk = requests.some(r =>
  r.url.includes('supabase') && r.status === 200
);
```

**Debugging Component Issues:**
```typescript
// Navigate to problematic component
await browser.navigate({ url: "http://localhost:8080" });

// Get component state via React DevTools (if available)
const state = await browser.evaluate({
  function: "() => window.__REACT_DEVTOOLS_GLOBAL_HOOK__"
});

// Check for runtime errors
const errors = await browser.getConsoleMessages({ onlyErrors: true });

// Inspect DOM for unexpected state
const dom = await browser.evaluate({
  function: "() => document.querySelector('.artifact-canvas').innerHTML"
});

// Take screenshot showing issue
await browser.screenshot({
  element: "problematic component",
  filename: "component-issue.png"
});
```

**Testing Artifact Rendering:**
```typescript
// Navigate to chat interface
await browser.navigate({ url: "http://localhost:8080" });

// Create new session
await browser.click({ element: "New Chat button" });

// Send message requesting artifact
await browser.type({
  element: "message input",
  text: "Create a React button component"
});
await browser.click({ element: "send button" });

// Wait for artifact to appear
await browser.waitFor({ text: "artifact" });

// Verify artifact panel opens
const snapshot = await browser.snapshot();
// Check snapshot contains artifact canvas

// Verify no React errors in console
const errors = await browser.getConsoleMessages({ onlyErrors: true });
const reactErrors = errors.filter(e => e.includes('React'));

// Screenshot artifact for review
await browser.screenshot({
  element: "artifact canvas",
  filename: "artifact-verification.png"
});
```

**Performance Testing After Changes:**
```typescript
// Start clean performance trace
await browser.navigate({ url: "about:blank" });
await browser.startTrace();

// Navigate to app
await browser.navigate({ url: "http://localhost:8080" });

// Perform typical user actions
await browser.click({ element: "New Chat" });
await browser.type({ element: "input", text: "Hello" });
await browser.click({ element: "send" });
await browser.waitForNetworkIdle();

// Get performance metrics
const trace = await browser.stopTrace();

// Verify metrics
console.log("Performance Metrics:");
console.log(`- LCP: ${trace.lcp}ms (target: <2500ms)`);
console.log(`- FID: ${trace.fid}ms (target: <100ms)`);
console.log(`- CLS: ${trace.cls} (target: <0.1)`);
console.log(`- TTI: ${trace.tti}ms`);
```

### Best Practices

1. **Always verify in browser after changes** - Don't rely solely on build success
2. **Test critical user flows** - Authentication, chat message sending, artifact rendering
3. **Check console for errors** - Both before and after user actions
4. **Monitor network requests** - Ensure API calls succeed with correct status codes
5. **Take screenshots** - Visual verification catches UI issues automated tests miss
6. **Test responsive design** - Resize browser to mobile/tablet viewports
7. **Verify accessibility** - Use accessibility snapshots to check ARIA attributes
8. **Performance testing** - Run traces for any performance-related changes
9. **Test error scenarios** - Verify error handling works (network failures, auth errors, etc.)
10. **Cross-browser verification** - Test in different channels (stable, canary) when needed

### When to Use Chrome DevTools MCP

**Required Usage Scenarios:**
- ✅ After fixing bugs affecting UI/UX
- ✅ After adding new components or pages
- ✅ After modifying authentication flows
- ✅ After changing API integrations
- ✅ After performance optimizations
- ✅ After build configuration changes
- ✅ Before marking tasks as complete
- ✅ Before creating pull requests

**Verification Checklist:**
- [ ] Page loads without console errors
- [ ] UI renders as expected (screenshot taken)
- [ ] Critical user flows work (auth, chat, artifacts)
- [ ] Network requests succeed (200/201 status codes)
- [ ] No JavaScript runtime errors
- [ ] Responsive design works across viewports
- [ ] Performance metrics meet targets (if applicable)
- [ ] Service worker registered (for PWA features)

## Supabase MCP Integration

This project has the Supabase Model Context Protocol (MCP) server configured, providing Claude Code with direct access to Supabase project operations.

#### Configuration
The MCP server is configured in `~/.claude.json`:
```bash
claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=xfwlneedhqealtktaacv&features=docs%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage%2Caccount"
```

#### Available MCP Capabilities
**Database Operations:**
- `list_tables` - List all tables in schemas
- `execute_sql` - Execute raw SQL queries (DML operations)
- `apply_migration` - Apply DDL migrations with automatic naming
- `list_migrations` - View migration history
- `list_extensions` - List installed Postgres extensions
- `generate_typescript_types` - Generate TypeScript types from schema

**Documentation & Debugging:**
- `search_docs` - Search Supabase documentation via GraphQL
- `get_logs` - Fetch logs by service (api, postgres, auth, storage, realtime, edge-function, branch-action)
- `get_advisors` - Get security/performance recommendations (run after DDL changes to catch missing RLS policies)

**Edge Functions:**
- `list_edge_functions` - List all Edge Functions
- `get_edge_function` - Retrieve function source code
- `deploy_edge_function` - Deploy or update Edge Functions

**Development Branches:**
- `create_branch` - Create development branch with fresh database
- `list_branches` - List all branches with status
- `delete_branch` - Remove development branch
- `merge_branch` - Merge migrations and functions to production
- `reset_branch` - Reset branch to specific migration version
- `rebase_branch` - Rebase branch on production to handle drift

**Project Info:**
- `get_project_url` - Get API URL
- `get_anon_key` - Get anonymous API key

#### Usage Patterns
**Schema Changes:**
```typescript
// Always use apply_migration for DDL operations
await apply_migration({
  name: "add_user_settings_table",
  query: "CREATE TABLE user_settings (...)"
});

// Check for security issues after migrations
await get_advisors({ type: "security" });
```

**Debugging:**
```typescript
// Check logs when troubleshooting issues
await get_logs({ service: "api" });
await get_logs({ service: "postgres" });
```

**Type Generation:**
After schema changes, regenerate TypeScript types:
```typescript
const types = await generate_typescript_types();
// Update src/integrations/supabase/types.ts
```

**Branch Workflow:**
```typescript
// Create branch for testing migrations
await create_branch({ name: "feature-test" });
// Test migrations on branch
// Merge to production when ready
await merge_branch({ branch_id: "..." });
```

### Testing Notes
- No test suite currently configured
- Manual testing workflow used during development

### Browser Compatibility
- PWA manifest with theme color `#8B7BF7`
- Service worker with NetworkFirst strategy for Supabase
- CacheFirst for images (24h TTL)
- Safe area insets for mobile notches

### Known Quirks
- ESLint configured to ignore unused TypeScript vars
- TypeScript strict mode is disabled for flexibility
- Console logs stripped in production builds
- Component tagger only runs in development mode
