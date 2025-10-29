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
└── pages/              # Route pages (Index, Auth, Signup, NotFound)
```

### Key Components

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
Required in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

### MCP Tools Integration
This project has the Supabase Model Context Protocol (MCP) server configured, providing Claude Code with direct access to Supabase project operations.

#### Configuration
The MCP server is configured in `~/.claude.json`:
```bash
claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=vznhbocnuykdmjvujaka&features=docs%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage%2Caccount"
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
