# Troubleshooting Guide

## Artifact Issues

### Blank Screen / White Screen

**Symptoms**: Artifact renders as blank screen with no content

**Common Causes**:
1. Local imports (`@/components/ui/*`) — Not allowed in artifacts
2. Global variable access (`window`, `document` during render)
3. React strict mode violations (direct mutations)
4. Syntax errors in code

**Debugging Steps**:

1. **Check Console for Errors**:
```bash
# Open browser DevTools (F12) and look for:
# - Import errors: "Failed to resolve module"
# - Runtime errors: "Cannot read property..."
# - Validation errors: "IMPORT_LOCAL_PATH"
```

2. **Verify No Local Imports**:
```typescript
// ❌ WRONG - Causes blank screen
import { Button } from "@/components/ui/button"

// ✅ CORRECT - Use npm packages
import * as Dialog from '@radix-ui/react-dialog';
```

3. **Check for Global Access**:
```typescript
// ❌ WRONG - May cause issues during SSR
const width = window.innerWidth;

// ✅ CORRECT - Use useEffect
useEffect(() => {
  const width = window.innerWidth;
}, []);
```

4. **Inspect Artifact Validation**:
```typescript
// Look for validation errors in chat response
// Error code: IMPORT_LOCAL_PATH, RESERVED_KEYWORD_EVAL, etc.
```

**See**: `.claude/artifact-import-restrictions.md` for complete import rules

### "useRef" Null Error

**Symptoms**: `TypeError: Cannot read property 'current' of null`

**Cause**: Dual React instances (artifact uses different React than main app)

**Fix**:
1. **Check esm.sh URLs** use `?external=react,react-dom`:
```typescript
// In bundled artifact HTML
<script type="importmap">
{
  "imports": {
    "react": "data:text/javascript,export default window.React",
    "react-dom": "data:text/javascript,export default window.ReactDOM"
  }
}
</script>
```

2. **Verify Import Map Shims** in `ArtifactRenderer.tsx`

3. **Server-Side Fix**: Check `bundle-artifact/index.ts` generates correct shims

**See**: CLAUDE.md "React Instance Unification" section

## Build & Development Issues

### "Cannot find module" Errors

**Symptoms**: TypeScript import errors, Vitest failures

**Causes**:
- Missing path aliases in `tsconfig.json`
- Vitest not configured with same aliases
- Missing npm install

**Fix**:

1. **Check tsconfig.json paths**:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

2. **Check Vitest config**:
```typescript
// vite.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src')
  }
}
```

3. **Reinstall dependencies**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Edge Function Timeout

**Symptoms**: Edge Function request times out after 60s

**Causes**:
- Function size > 10MB
- Infinite loop in code
- External API timeout
- Missing `--no-verify-jwt` flag (local dev)

**Fix**:

1. **Check Function Size**:
```bash
du -sh supabase/functions/<function-name>

# If > 10MB, optimize:
# - Move large dependencies to npm imports
# - Use dynamic imports
# - Remove unused code
```

2. **Check for Infinite Loops**:
```typescript
// Add timeout to long operations
const timeout = setTimeout(() => {
  throw new Error('Operation timeout');
}, 55000);  // 55s (before 60s limit)

try {
  await operation();
} finally {
  clearTimeout(timeout);
}
```

3. **Check External API Timeouts**:
```typescript
// Add timeout to fetch
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

try {
  const response = await fetch(url, { signal: controller.signal });
} finally {
  clearTimeout(timeout);
}
```

4. **Local Dev JWT Verification**:
```bash
# Disable JWT verification for local testing
supabase functions serve --no-verify-jwt
```

### "Cannot find module" in Edge Functions

**Symptoms**: Deno import errors in Edge Functions

**Causes**:
- Incorrect Deno import URL
- Version mismatch
- CDN timeout

**Fix**:

1. **Use Correct CDN**:
```typescript
// ❌ WRONG - Old URL
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';

// ✅ CORRECT - Use version in other functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
```

2. **Lock Versions**:
```bash
# Create deno.lock file
cd supabase/functions
deno cache --lock=deno.lock --lock-write index.ts
```

## Database & Migration Issues

### Migration CI/CD Fails

**Symptoms**: `deploy-migrations.yml` workflow fails

**Common Causes**:
- SQL syntax error
- Foreign key constraint violation
- Duplicate migration timestamp
- Schema drift (local ≠ production)

**Fix**:

1. **Check Migration Status**:
```bash
supabase migration list

# Look for:
# - Duplicate timestamps
# - Missing migrations
# - Out-of-order migrations
```

2. **Repair Schema Drift**:
```bash
# Pull production schema to local
supabase db pull

# Or reset local DB
supabase db reset
```

3. **Test Migration Locally**:
```bash
# Reset and reapply all migrations
supabase db reset

# Check for errors
```

4. **Validate SQL Syntax**:
```sql
-- Common issues:
-- Missing semicolons
-- Incorrect function signatures
-- Missing SECURITY DEFINER search_path
```

**See**: `.claude/BUILD_AND_DEPLOYMENT.md` for deployment details

## Rate Limiting Issues

### Rate Limit Exceeded Despite High Limits

**Symptoms**: Rate limit errors even with high limits in `.env`

**Cause**: Edge runtime doesn't auto-reload environment variables

**Fix**:

```bash
# Restart Edge runtime to pick up new env vars
supabase stop && supabase start

# OR restart just the edge runtime container
docker restart supabase_edge_runtime_*
```

**Verify env vars loaded**:
```bash
docker exec supabase_edge_runtime_* printenv | grep -iE "RATE_LIMIT"
```

**Reset rate limit counters** (if needed):
```bash
docker exec -i supabase_db_* psql -U postgres -c "DELETE FROM guest_rate_limits; DELETE FROM api_throttle;"
```

**Note**: Chat and artifact endpoints share the same `guest_rate_limits` table but use different max values.

### Edge Function "Not Configured" Error

**Symptoms**: Edge functions fail with "not configured" error (e.g., image generation)

**Cause**: Secrets not in correct location

**Fix**:

1. **Check File Location**:
```bash
# Secrets must be in this location (auto-loaded)
supabase/functions/.env

# NOT in these locations (ignored)
supabase/.env.local
.env
```

2. **Verify Secrets Loaded**:
```bash
docker exec supabase_edge_runtime_* printenv | grep -iE "OPENROUTER|GLM|TAVILY"
```

3. **Restart Supabase**:
```bash
supabase stop && supabase start
```

4. **Template**: Copy from `supabase/.env.local.template` to `supabase/functions/.env`

**File Location Reference**:

| File | Purpose | Auto-loaded? |
|------|---------|--------------|
| `supabase/functions/.env` | Edge Functions secrets | ✅ Yes |
| `supabase/.env.local` | Legacy/backup location | ❌ No (requires `--env-file`) |
| `.env` (project root) | Frontend Vite vars (`VITE_*`) | N/A |

## Performance Issues

### Slow Artifact Rendering

**Symptoms**: Artifacts take > 5s to render

**Causes**:
- Large npm dependencies (bundling timeout)
- Multiple unnecessary imports
- Not using prebuilt bundles

**Fix**:

1. **Check Prebuilt Bundles**:
```typescript
// Prebuilt bundles load instantly (no bundling)
import { useForm } from 'react-hook-form';  // Prebuilt ✅

// Other packages require bundling (2-5s)
import someRarePackage from 'rare-package';  // Not prebuilt
```

2. **Minimize Imports**:
```typescript
// ❌ WRONG - Imports entire library
import _ from 'lodash';

// ✅ CORRECT - Import only what's needed
import debounce from 'lodash/debounce';
```

3. **Check Bundle Size**:
```bash
# Large bundles (> 1MB) take longer
# See bundle size in artifact_complete SSE event
```

**See**: `.claude/ARCHITECTURE.md` "Prebuilt Bundle System"

### Slow Chat Response

**Symptoms**: Chat takes > 10s to respond

**Causes**:
- Web search enabled (adds 2-4s)
- Large context window (many messages)
- Thinking mode enabled (slower but better)

**Fix**:

1. **Check if Web Search Triggered**:
```bash
# Look for web_search SSE event
# Only searches when needed (smart intent detection)
```

2. **Optimize Context Window**:
```bash
# System auto-summarizes after threshold
# Check conversation_summary in chat_sessions table
```

3. **Disable Thinking Mode** (not recommended):
```bash
supabase secrets set USE_GLM_THINKING_FOR_CHAT=false
```

## Browser Compatibility

### Artifact Not Working in Old Browsers

**Symptoms**: Artifacts fail in IE11, old Safari

**Cause**: Sucrase keeps ES6+ syntax (modern browsers only)

**Supported Browsers**:
- Chrome 61+
- Firefox 60+
- Safari 10.1+
- Edge 16+

**Note**: ES6+ module support required. No polyfills for older browsers.

### Service Worker Not Activating

**Symptoms**: PWA features not working

**Causes**:
- Service worker blocked by browser
- HTTPS not enabled (required for SW)
- Service worker cache conflict

**Fix**:

1. **Check HTTPS**:
```bash
# Service workers only work on HTTPS (or localhost)
```

2. **Clear Service Worker**:
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
```

3. **Check Browser Support**:
```javascript
if ('serviceWorker' in navigator) {
  // Supported
} else {
  console.warn('Service Worker not supported');
}
```

## Common Error Codes

### Artifact Validation Errors

**IMPORT_LOCAL_PATH**:
- **Cause**: Tried to import `@/components/ui/*` in artifact
- **Fix**: Use npm packages (Radix UI, etc.)

**RESERVED_KEYWORD_EVAL**:
- **Cause**: Used `eval()` or `Function()` constructor
- **Fix**: Remove dynamic code execution

**IMMUTABILITY_ARRAY_ASSIGNMENT**:
- **Cause**: Direct array mutation (`arr[0] = 'x'`)
- **Fix**: Use immutable patterns (`[...arr]`)

**See**: `docs/ERROR_CODES.md` for complete reference

## Getting Help

**Documentation**:
- `.claude/` directory — All documentation
- `docs/ERROR_CODES.md` — Complete error reference
- `CLAUDE.md` — Quick reference

**Logs**:
- **Frontend**: Browser DevTools console
- **Edge Functions**: `supabase functions logs <name>`
- **Database**: `supabase db logs`

**Health Check**:
```bash
# Check Edge Functions health
curl https://your-project.supabase.co/functions/v1/health

# Check local Supabase status
supabase status
```
