# Common Development Patterns

## Session Validation

**When to use**: Before any authenticated operation

**Pattern**:
```typescript
import { ensureValidSession } from '@/utils/authHelpers';
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
const session = await ensureValidSession();

if (!session) {
  navigate("/auth");
  return;
}

// Proceed with authenticated operation
const { user } = session;
```

**Why**: Ensures user is authenticated before accessing protected resources. Redirects to login if session expired.

## Creating Artifacts (AI Response Format)

**When to use**: When AI needs to generate artifacts in chat responses

**Pattern**:
```xml
<artifact type="application/vnd.ant.react" title="Component Name">
export default function App() {
  return <div>Hello World</div>;
}
</artifact>
```

**Supported Types**:
- `application/vnd.ant.react` — React components
- `text/html` — HTML pages
- `image/svg+xml` — SVG graphics
- `application/vnd.ant.mermaid` — Mermaid diagrams
- `text/markdown` — Markdown documents

**Multiple Artifacts**:
```xml
<artifact type="application/vnd.ant.react" title="Counter Component">
export default function Counter() { ... }
</artifact>

<artifact type="text/html" title="Landing Page">
<!DOCTYPE html>
<html>...</html>
</artifact>
```

## Adding New Artifact Type

**Steps**:

### 1. Update Type Definition

**File**: `src/components/ArtifactContainer.tsx`

```typescript
export type ArtifactType =
  | "code"
  | "markdown"
  | "html"
  | "svg"
  | "mermaid"
  | "react"
  | "image"
  | "your-new-type";  // Add here
```

### 2. Add Renderer Logic

**File**: `src/components/ArtifactRenderer.tsx`

```typescript
if (artifact.type === "your-new-type") {
  return <YourCustomRenderer content={artifact.content} />;
}
```

### 3. Update Parser

**File**: `src/utils/artifactParser.ts`

```typescript
const mimeTypeMap: Record<string, ArtifactType> = {
  'application/vnd.ant.react': 'react',
  'text/html': 'html',
  'application/vnd.your-type': 'your-new-type',  // Add mapping
};
```

### 4. Update Tool Definition (Optional)

**File**: `supabase/functions/_shared/tool-definitions.ts`

```typescript
const ARTIFACT_TYPES = [
  'react',
  'html',
  'svg',
  'mermaid',
  'markdown',
  'your-new-type'  // Add to enum
];
```

## Adding New Edge Function

**Steps**:

### 1. Create Function

```bash
mkdir -p supabase/functions/your-function
touch supabase/functions/your-function/index.ts
```

### 2. Implement Handler

**File**: `supabase/functions/your-function/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors-config.ts';

serve(async (req) => {
  const origin = req.headers.get('origin') || '';

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(origin);
  }

  try {
    // Your logic here
    const data = { message: 'Hello from Edge Function' };

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...getCorsHeaders(origin),
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...getCorsHeaders(origin),
        'Content-Type': 'application/json'
      }
    });
  }
});
```

### 3. Deploy Function

```bash
# Test locally
supabase functions serve your-function

# Deploy to production
supabase functions deploy your-function --project-ref <project-ref>
```

### 4. Set Environment Variables (if needed)

```bash
# Add to supabase/functions/.env
YOUR_API_KEY=...

# Or set via CLI
supabase secrets set YOUR_API_KEY=...
```

## TanStack Query Patterns

### Basic Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
    staleTime: 5 * 60 * 1000,  // 5 minutes
  });
}
```

### Query with Parameters

```typescript
export function useChatMessages(sessionId: string) {
  return useQuery({
    queryKey: ["chatMessages", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,  // Only fetch if sessionId exists
  });
}
```

### Mutation

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title: string) => {
      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({ title })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch sessions
      queryClient.invalidateQueries({ queryKey: ["chatSessions"] });
    },
  });
}
```

## Immutable State Updates

### Array Updates

```typescript
// ❌ WRONG - Mutates array
board[i] = 'X';
board.push(value);
board.sort();

// ✅ CORRECT - Immutable patterns
const newBoard = [...board];
newBoard[i] = 'X';

const newBoard = [...board, value];

const newBoard = [...board].sort();
```

### Object Updates

```typescript
// ❌ WRONG - Mutates object
user.name = 'John';
delete user.email;

// ✅ CORRECT - Immutable patterns
const newUser = { ...user, name: 'John' };

const { email, ...newUser } = user;  // Remove email
```

### Nested Updates

```typescript
// ❌ WRONG - Mutates nested object
state.user.profile.name = 'John';

// ✅ CORRECT - Immutable pattern
const newState = {
  ...state,
  user: {
    ...state.user,
    profile: {
      ...state.user.profile,
      name: 'John'
    }
  }
};

// Or use Immer (if installed)
import { produce } from 'immer';

const newState = produce(state, draft => {
  draft.user.profile.name = 'John';
});
```

## Error Handling

### Edge Function Errors

```typescript
import { sanitizeError } from '../_shared/safe-error-handler.ts';

try {
  // Operation that might fail
  const result = await riskyOperation();
  return new Response(JSON.stringify(result), { status: 200 });
} catch (error) {
  // Sanitize error (removes stack traces, PII)
  const safeError = sanitizeError(error, 'function-name');

  return new Response(JSON.stringify({ error: safeError.message }), {
    status: safeError.statusCode || 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Frontend Errors

```typescript
import * as Sentry from '@sentry/react';
import { toast } from 'sonner';

try {
  await operation();
} catch (error) {
  // Log to Sentry
  Sentry.captureException(error, {
    tags: { component: 'ComponentName' },
    extra: { context: 'additional info' }
  });

  // Show user-friendly message
  toast.error('Operation failed. Please try again.');

  // Re-throw if needed
  throw error;
}
```

## Rate Limit Checking

### Frontend Check

```typescript
import { useAuthUserRateLimit } from '@/hooks/useAuthUserRateLimit';

const { data: rateLimit, isLoading } = useAuthUserRateLimit();

if (!isLoading && !rateLimit?.allowed) {
  toast.error(`Rate limit exceeded. Resets at ${rateLimit.reset_at}`);
  return;
}

// Proceed with operation
```

### Edge Function Check

```typescript
import { checkUserToolRateLimit } from '../_shared/tool-rate-limiter.ts';

const rateLimitResult = await checkUserToolRateLimit(
  userId,
  'generate_artifact',
  50,  // max requests
  5    // window hours
);

if (!rateLimitResult.allowed) {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      reset_at: rateLimitResult.reset_at,
      remaining: rateLimitResult.remaining
    }),
    { status: 429 }
  );
}
```

## SSE Streaming Pattern

### Backend (Edge Function)

```typescript
const stream = new ReadableStream({
  async start(controller) {
    const writer = {
      write: (data: string) => {
        controller.enqueue(new TextEncoder().encode(data));
      }
    };

    try {
      // Emit events
      writer.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);

      // ... processing ...

      writer.write(`data: ${JSON.stringify({ type: 'data', content: '...' })}\n\n`);

      writer.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } finally {
      controller.close();
    }
  }
});

return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  }
});
```

### Frontend (EventSource)

```typescript
const eventSource = new EventSource('/api/stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'start':
      console.log('Stream started');
      break;
    case 'data':
      console.log('Data:', data.content);
      break;
    case 'done':
      eventSource.close();
      break;
  }
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  eventSource.close();
};
```

## Artifact System Patterns (Vanilla Sandpack)

The artifact system uses vanilla Sandpack for direct code rendering. No server-side transformations or bundling.

### Core Principles

1. **Sandpack renders code directly** — No preprocessing, transpilation, or bundling
2. **Default export required** — All React artifacts must use `export default function App()`
3. **Package whitelist enforced** — Only approved packages work in sandbox
4. **Error recovery via UI** — Users click "Ask AI to Fix" button for errors

### Creating React Artifacts

**Pattern**:
```xml
<artifact type="application/vnd.ant.react" title="My Component">
export default function App() {
  return <div className="p-4">Hello World</div>;
}
</artifact>
```

**Requirements**:
- Must have `export default function App()`
- Cannot use `@/` imports (sandbox isolation)
- Use npm package names directly

### Approved Package Whitelist

Only these packages are available in the Sandpack sandbox:

| Package | Usage |
|---------|-------|
| `react`, `react-dom` | Core React |
| `recharts` | Charts and data visualization |
| `framer-motion` | Animations |
| `lucide-react` | Icons |
| `@radix-ui/*` | Accessible UI primitives |

**Example with packages**:
```typescript
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { Plus, Trash } from 'lucide-react';

export default function App() {
  const [items, setItems] = useState([]);
  // ...
}
```

### Error Handling

Sandpack displays errors naturally in its console. Users can:

1. **View errors** — Sandpack console shows runtime/compile errors
2. **Click "Ask AI to Fix"** — Button sends error context to AI for correction
3. **AI regenerates** — Fixed code replaces broken artifact

**No manual error handling needed** — The system handles this automatically.

### Import Restrictions

**Artifacts cannot use**:
```typescript
// ❌ WRONG - @/ imports don't work in sandbox
import { Button } from '@/components/ui/button';

// ✅ CORRECT - Use npm packages directly
import * as Dialog from '@radix-ui/react-dialog';
```

**Why**: Artifacts run in isolated Sandpack sandbox without access to project source code.

## References

- **Session Utils**: `src/utils/authHelpers.ts`
- **Artifact Parser**: `src/utils/artifactParser.ts`
- **Artifact Renderer**: `src/components/ArtifactRenderer.tsx`
- **Sandpack Docs**: https://sandpack.codesandbox.io/docs
- **TanStack Query Docs**: https://tanstack.com/query/latest
- **Supabase Client Docs**: https://supabase.com/docs/reference/javascript
