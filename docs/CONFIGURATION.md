# Configuration Guide

## Model Configuration

**Location**: `supabase/functions/_shared/config.ts`

### Model Constants

```typescript
export const MODELS = {
  GEMINI_3_FLASH: 'google/gemini-3-flash-preview',  // Primary model
  GEMINI_FLASH: 'google/gemini-2.5-flash-lite',     // Fallback (circuit breaker)
  GEMINI_FLASH_IMAGE: 'google/gemini-2.5-flash-image' // Image generation
} as const;
```

### Model Specifications

#### Gemini 3 Flash (Primary)
| Specification | Value |
|---------------|-------|
| Model ID | `google/gemini-3-flash-preview` |
| Context Window | 1M tokens (1,048,576) |
| Max Output | 65K tokens (65,536) |
| Input Price | $0.50 per million tokens |
| Output Price | $3.00 per million tokens |
| Reasoning | `reasoning.effort` levels (minimal, low, medium, high) |
| Tool Calling | Full OpenAI-compatible support |
| Media Resolution | `low`, `medium`, `high`, `ultra_high` |

**Used for**: Artifacts, titles, summaries, query rewriting, chat (via tool-calling)

#### Gemini 2.5 Flash Lite (Fallback)
| Specification | Value |
|---------------|-------|
| Model ID | `google/gemini-2.5-flash-lite` |
| Purpose | Circuit breaker fallback only |

**Note**: Only used when primary model fails; not for regular operations.

#### Gemini 2.5 Flash Image
| Specification | Value |
|---------------|-------|
| Model ID | `google/gemini-2.5-flash-image` |
| Purpose | Image generation |

### CRITICAL Rule

**NEVER hardcode model names!** Always use `MODELS.*` constants.

**Why**:
- CI/CD blocks merges if model names are hardcoded
- Golden snapshot testing (`model-config.snapshot.json`) validates consistency
- Centralized updates when models change

**Examples**:

```typescript
// ❌ WRONG - CI/CD FAILS
const model = "google/gemini-3-flash-preview";

// ✅ CORRECT
import { MODELS } from '../_shared/config.ts';
const model = MODELS.GEMINI_3_FLASH;
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

> **Note**: All artifact transpilation is now handled internally by Sandpack (CodeSandbox runtime). Errors surface naturally in the Sandpack console with an "Ask AI to Fix" button for one-click recovery.

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

#### RATE_LIMIT_DISABLED

**Purpose**: Disable all rate limiting checks for local development

**Default**: `false`

**Environment Variable**: `RATE_LIMIT_DISABLED`

**Behavior**:
- `false` — Normal rate limiting enabled
- `true` — Bypass all rate limits (development only)

**WARNING**: Never enable in production!

**Configuration**:
```bash
# Enable for local development only
RATE_LIMIT_DISABLED=true supabase functions serve
```

#### DEBUG_PREMADE_CARDS

**Purpose**: Enable enhanced debug logging for premade card artifact generation

**Default**: `false`

**Environment Variable**: `DEBUG_PREMADE_CARDS`

**Behavior**:
- `false` — Normal logging
- `true` — Detailed execution traces for troubleshooting premade cards

**Configuration**:
```bash
supabase secrets set DEBUG_PREMADE_CARDS=true
```

#### AUTO_FIX_ARTIFACTS

**Purpose**: Automatically attempt an AI fix pass when artifact validation fails

**Default**: `true`

**Environment Variable**: `AUTO_FIX_ARTIFACTS`

**Behavior**:
- `true` — AI attempts to fix validation errors automatically
- `false` — Validation errors returned immediately without fix attempt

**Configuration**:
```bash
# Disable auto-fix (not recommended)
supabase secrets set AUTO_FIX_ARTIFACTS=false
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
OPENROUTER_GEMINI_FLASH_KEY=sk-...     # All LLM operations (Gemini 3 Flash, Flash Lite)
OPENROUTER_GEMINI_IMAGE_KEY=sk-...     # Image generation (Gemini Flash Image)
TAVILY_API_KEY=tvly-...                # Web search

# CORS Configuration
ALLOWED_ORIGINS=https://your-site.com,https://*.preview-site.pages.dev

# Feature Flags (optional)
TAVILY_ALWAYS_SEARCH=false
RATE_LIMIT_WARNINGS=true
AUTO_FIX_ARTIFACTS=true
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

### Gemini API Timeout Configuration

**Location**: `supabase/functions/_shared/config.ts` (GEMINI_CONFIG)

Controls timeout limits for Gemini API requests to prevent hanging connections:

```bash
# Non-streaming request timeout (default: 60s)
GEMINI_REQUEST_TIMEOUT_MS=60000

# Streaming request timeout (default: 4min for Gemini 3 Flash with thinking)
GEMINI_STREAM_TIMEOUT_MS=240000

# Timeout between stream chunks (default: 30s)
GEMINI_CHUNK_TIMEOUT_MS=30000
```

**Example: Increase timeouts for complex artifacts**:
```bash
supabase secrets set GEMINI_REQUEST_TIMEOUT_MS=90000
supabase secrets set GEMINI_STREAM_TIMEOUT_MS=300000
```

### Rate Limiting Configuration

All rate limits are configurable via environment variables (overrides defaults):

```bash
# Guest Limits (IP-based) - defaults from config.ts
RATE_LIMIT_GUEST_MAX=60                    # requests per 5 hours (default: 60)
RATE_LIMIT_ARTIFACT_GUEST_MAX=15           # artifacts per 5 hours (default: 15)
RATE_LIMIT_IMAGE_GUEST_MAX=60              # images per 5 hours (default: 60)
RATE_LIMIT_SEARCH_GUEST_MAX=30             # searches per 5 hours (default: 30)

# Authenticated User Limits
RATE_LIMIT_AUTH_MAX=100                    # requests per 5 hours (default: 100)
RATE_LIMIT_ARTIFACT_AUTH_MAX=50            # artifacts per 5 hours (default: 50)
RATE_LIMIT_IMAGE_AUTH_MAX=50               # images per 5 hours (default: 50)
RATE_LIMIT_SEARCH_AUTH_MAX=50              # searches per 5 hours (default: 50)

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
- **Gemini Client**: `supabase/functions/_shared/gemini-client.ts`
- **Feature Flags**: `src/lib/featureFlags.ts`
- **App Settings**: `src/hooks/useAppSettings.ts`
- **CORS Config**: `supabase/functions/_shared/cors-config.ts`
- **Rate Limits**: `supabase/functions/_shared/config.ts` (RATE_LIMITS)
