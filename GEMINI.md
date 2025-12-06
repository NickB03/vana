# GEMINI.md

This file provides context to the Gemini CLI when reviewing pull requests and triaging issues in this repository.

## Project Overview

**Vana** is a production AI-powered development assistant that transforms natural language into interactive code, React components, diagrams, and images in real-time.

**Tech Stack**: React 18.3 + TypeScript 5.8 + Vite 5.4 + Tailwind CSS + shadcn/ui + Supabase (PostgreSQL + Edge Functions) + TanStack Query + Vitest

## Architecture

### Frontend (`src/`)
- **React 18** with TypeScript and Vite
- **shadcn/ui** components in `src/components/ui/`
- **TanStack Query** for data fetching (`src/hooks/`)
- **Tailwind CSS** for styling

### Backend (`supabase/functions/`)
- **Deno Edge Functions** for serverless AI endpoints
- **Shared utilities** in `_shared/` (config, CORS, validators, AI clients)
- **Key functions**: `chat/`, `generate-artifact/`, `bundle-artifact/`, `generate-image/`

### Database
- **PostgreSQL** with Row-Level Security (RLS)
- **Migrations** in `supabase/migrations/`
- **Key tables**: `chat_sessions`, `chat_messages`, `guest_rate_limits`

## Critical Conventions

### 1. Model Configuration
**NEVER hardcode model names.** Always use constants from `supabase/functions/_shared/config.ts`:

```typescript
// WRONG - causes CI/CD failures
model: "google/gemini-2.5-flash-lite"

// CORRECT
import { MODELS } from '../_shared/config.ts';
model: MODELS.GEMINI_FLASH
```

### 2. Package Manager
Use **npm only** - never Bun, Yarn, or pnpm (causes lock file conflicts).

### 3. Artifact Sandbox Isolation
Artifacts render in isolated iframes. They **cannot** use local imports:

```typescript
// WRONG - breaks artifacts
import { Button } from "@/components/ui/button"

// CORRECT - use npm packages
import * as Dialog from '@radix-ui/react-dialog';
```

### 4. Security DEFINER Functions
Always include `SET search_path = public, pg_temp` to prevent schema injection:

```sql
CREATE FUNCTION my_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- function body
END;
$$;
```

### 5. CORS Configuration
Use `corsHeaders` from `_shared/cors-config.ts`. Never use wildcard `*` origins in production.

### 6. Routes
Add new routes **ABOVE** the `*` catch-all in `App.tsx`, otherwise they will be unreachable.

## Testing

```bash
npm run test              # Run all tests (692 tests)
npm run test:coverage     # Coverage report (55% threshold, current: 74%)
```

## Code Review Focus Areas

When reviewing PRs, prioritize:

1. **Security**: SQL injection, XSS, secrets exposure, improper auth
2. **Model Configuration**: Hardcoded model names break CI/CD
3. **Artifact Isolation**: Local imports break sandbox rendering
4. **Database Security**: RLS policies, SECURITY DEFINER with search_path
5. **TypeScript**: Type safety, no `any` types without justification
6. **Performance**: Unnecessary re-renders, missing memoization, large bundles

## Issue Labels

- `bug` - Broken functionality or unexpected behavior
- `enhancement` - New feature or improvement request
- `documentation` - Documentation updates needed
- `security` - Security-related issues (high priority)
- `performance` - Performance optimization opportunities
- `good first issue` - Suitable for new contributors

## File Structure

```
src/
├── components/          # React components
│   ├── ui/              # shadcn/ui components
│   └── prompt-kit/      # Chat UI primitives
├── hooks/               # TanStack Query hooks
├── utils/               # Utilities + tests
└── pages/               # Route components

supabase/
├── functions/
│   ├── chat/            # Main chat endpoint
│   ├── generate-artifact/  # Artifact generation
│   ├── bundle-artifact/    # NPM bundling
│   └── _shared/         # Shared utilities
└── migrations/          # Database migrations
```
