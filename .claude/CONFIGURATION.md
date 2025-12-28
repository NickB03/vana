# Configuration Guide

## Model Configuration

**Location**: `supabase/functions/_shared/config.ts`

### Model Constants

```typescript
export const MODELS = {
  GEMINI_FLASH: 'google/gemini-2.5-flash-lite',
  GLM_4_6: 'zhipu/glm-4.6',
  GEMINI_FLASH_IMAGE: 'google/gemini-2.5-flash-image',
  GLM_4_5_AIR: 'zhipu/glm-4.5-air'
} as const;
```

### CRITICAL Rule

**NEVER hardcode model names!** Always use `MODELS.*` constants.

**Why**:
- CI/CD blocks merges if model names are hardcoded
- Golden snapshot testing (`model-config.snapshot.json`) validates consistency
- Centralized updates when models change

**Examples**:

```typescript
// ❌ WRONG - CI/CD FAILS
const model = "google/gemini-2.5-flash-lite";

// ✅ CORRECT
import { MODELS } from '../_shared/config.ts';
const model = MODELS.GEMINI_FLASH;
```

### Updating Models Intentionally

1. Update `supabase/functions/_shared/config.ts`
2. Update `model-config.snapshot.json` (version date + model name)
3. Run tests: `cd supabase/functions && deno task test`
4. Commit both files together

## Feature Flags

### Frontend Flags

**Location**: `src/lib/featureFlags.ts`

```typescript
export const FEATURE_FLAGS = {
  CONTEXT_AWARE_PLACEHOLDERS: false,  // Dynamic input placeholder text
  CANVAS_SHADOW_DEPTH: false,         // Visual depth cues for chat cards
  LANDING_PAGE_ENABLED: false,        // Show landing page on first visit
} as const;
```

**Usage**:
```typescript
import { isFeatureEnabled } from '@/lib/featureFlags';

if (isFeatureEnabled('LANDING_PAGE_ENABLED')) {
  // Show landing page with scroll-to-app transition
}
```

> **Note**: The `SUCRASE_TRANSPILER` flag was removed in December 2025. Sucrase is now the only transpiler with no Babel fallback. Errors show "Ask AI to Fix" for one-click recovery.

### App Settings (Database-Controlled)

**Location**: `src/hooks/useAppSettings.ts` (stored in `app_settings` table)

**Available Settings**:
- `landing_page_enabled` — Show landing page on first visit (default: `false`)
- `force_tour` — Force product tour for all users (default: `false`)

**Note**: These are NOT static feature flags — they're controlled by admins via the `/admin` dashboard and stored in the database.

**Usage**:
```typescript
import { useAppSetting } from '@/hooks/useAppSettings';

const { value: landingPageEnabled } = useAppSetting('landing_page_enabled');

if (landingPageEnabled.enabled) {
  // Show landing page
}
```

**Admin Control**:
```typescript
import { useAppSettings } from '@/hooks/useAppSettings';

const { updateSetting } = useAppSettings();

// Update setting (admin only)
await updateSetting('landing_page_enabled', { enabled: true });
```

### Edge Function Flags

**Location**: `supabase/functions/_shared/config.ts` and environment variables

#### USE_REASONING_PROVIDER

**Purpose**: Enable semantic status generation during artifact creation

**Default**: `true`

**Environment Variable**: `USE_REASONING_PROVIDER`

**Behavior**:
- `true` — Use ReasoningProvider (LLM-powered semantic status messages)
- `false` — No status updates (shows "Thinking..." only)

**Configuration**:
```bash
# Disable (not recommended)
supabase secrets set USE_REASONING_PROVIDER=false
```

#### USE_GLM_THINKING_FOR_CHAT

**Purpose**: Enable GLM-4.6 thinking mode for chat messages

**Default**: `true`

**Environment Variable**: `USE_GLM_THINKING_FOR_CHAT`

**Behavior**:
- `true` — GLM streams reasoning chunks (visible as status updates)
- `false` — GLM responds directly without thinking mode

**Configuration**:
```bash
# Disable thinking mode
supabase secrets set USE_GLM_THINKING_FOR_CHAT=false
```

#### TAVILY_ALWAYS_SEARCH

**Purpose**: Force web search on ALL chat messages

**Default**: `false`

**Environment Variable**: `TAVILY_ALWAYS_SEARCH`

**WARNING**: Should only be `true` for testing purposes!

**Behavior**:
- `false` — Smart intent detection (only searches when needed)
- `true` — Every message triggers web search (+2-4s latency, 1000x API cost increase)

**Configuration**:
```bash
# Enable for testing only
supabase secrets set TAVILY_ALWAYS_SEARCH=true
```

#### RATE_LIMIT_WARNINGS

**Purpose**: Enable rate limit warning responses

**Default**: `true`

**Environment Variable**: `RATE_LIMIT_WARNINGS`

**Behavior**:
- `true` — Show toast warnings when approaching rate limits
- `false` — Silent rate limiting (errors only when exceeded)

## Environment Variables

### Frontend (.env)

Required for Vite build:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbG...  # Public, safe to expose
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_ENABLE_ANALYTICS=true
```

### Edge Functions (Supabase Secrets)

**File Location**: `supabase/functions/.env` (auto-loaded by `supabase start`)

**Required Secrets**:

```bash
# AI API Keys
OPENROUTER_GEMINI_FLASH_KEY=sk-...     # Chat, titles, summaries
OPENROUTER_GEMINI_IMAGE_KEY=sk-...     # Image generation
GLM_API_KEY=...                        # Artifact generation (Z.ai)
TAVILY_API_KEY=tvly-...                # Web search

# CORS Configuration
ALLOWED_ORIGINS=https://your-site.com,https://*.preview-site.pages.dev

# Feature Flags (optional)
USE_REASONING_PROVIDER=true
USE_GLM_THINKING_FOR_CHAT=true
TAVILY_ALWAYS_SEARCH=false
RATE_LIMIT_WARNINGS=true
```

**Setting Secrets (Production)**:
```bash
# Set individual secret
supabase secrets set OPENROUTER_GEMINI_FLASH_KEY=sk-...

# Set from .env file
supabase secrets set --env-file supabase/functions/.env
```

**Local Development**:
- Secrets auto-loaded from `supabase/functions/.env`
- Restart required after changes: `supabase stop && supabase start`

### Rate Limiting Configuration

All rate limits are configurable via environment variables (overrides defaults):

```bash
# Guest Limits (IP-based)
RATE_LIMIT_GUEST_MAX=20                    # requests per 5 hours
RATE_LIMIT_ARTIFACT_GUEST_MAX=5            # artifacts per 5 hours
RATE_LIMIT_IMAGE_GUEST_MAX=10              # images per 5 hours
RATE_LIMIT_SEARCH_GUEST_MAX=20             # searches per 5 hours

# Authenticated User Limits
RATE_LIMIT_AUTH_MAX=100                    # requests per 5 hours
RATE_LIMIT_ARTIFACT_AUTH_MAX=50            # artifacts per 5 hours
RATE_LIMIT_IMAGE_AUTH_MAX=100              # images per 5 hours
RATE_LIMIT_SEARCH_AUTH_MAX=200             # searches per 5 hours

# Window Configuration
RATE_LIMIT_WINDOW_HOURS=5                  # rolling window size
```

**See**: `supabase/functions/_shared/config.ts` for complete list

## State Management

### TanStack Query

**Primary state management** for server data:

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

export function useChatSessions() {
  return useQuery({
    queryKey: ["chatSessions"],
    queryFn: () => supabase
      .from("chat_sessions")
      .select("*")
      .order("updated_at", { ascending: false })
  });
}
```

**Key Hooks** (`src/hooks/`):
- `useChatMessages.tsx` — Fetch messages for a session
- `useChatSessions.tsx` — Fetch all sessions for user
- `useArtifactVersions.ts` — Fetch artifact version history
- `useAuthUserRateLimit.ts` — Fetch user rate limit status

### React Context

**Multi-Artifact Selection**: `MultiArtifactContext.tsx`

```typescript
import { useMultiArtifact } from '@/contexts/MultiArtifactContext';

const { selectedArtifacts, toggleArtifact } = useMultiArtifact();
```

## CORS Configuration

**Location**: `supabase/functions/_shared/cors-config.ts`

**Allowed Origins** (environment variable):
```bash
ALLOWED_ORIGINS=https://your-site.com,https://*.preview-site.pages.dev
```

**Wildcard Support**:
- `*` — Matches any subdomain
- `https://*.example.com` — Matches all subdomains of example.com

**Usage in Edge Functions**:
```typescript
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors-config.ts';

// Handle OPTIONS preflight
if (req.method === 'OPTIONS') {
  return handleCorsPreflightRequest(origin);
}

// Add CORS headers to response
return new Response(body, {
  headers: {
    ...getCorsHeaders(origin),
    'Content-Type': 'application/json'
  }
});
```

**Security**:
- Never use wildcard `*` in production
- Always validate origin against whitelist
- Pre-flight requests (OPTIONS) handled separately

## References

- **Model Config**: `supabase/functions/_shared/config.ts`
- **Feature Flags**: `src/lib/featureFlags.ts`
- **App Settings**: `src/hooks/useAppSettings.ts`
- **CORS Config**: `supabase/functions/_shared/cors-config.ts`
- **Rate Limits**: `supabase/functions/_shared/config.ts` (RATE_LIMIT_CONFIG)
