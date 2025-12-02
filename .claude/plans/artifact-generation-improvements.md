# Artifact Generation System Improvement Plan

**Created**: 2025-12-01
**Status**: Planning
**Estimated Total Effort**: 8-12 hours across 4 phases

---

## Executive Summary

This plan addresses 12 identified issues in the artifact generation system, organized into 4 implementation phases. The highest-impact changes (fixing dual React instances at the source) are prioritized first, followed by reliability improvements, UX enhancements, and future optimizations.

---

## Phase 1: Critical Fixes (P0) - ~2 hours

### 1.1 Fix Dual React Instance at Source

**Problem**: `bundle-artifact/index.ts` generates `?deps=react@18.3.1,react-dom@18.3.1` URLs, causing esm.sh to bundle its own React copy internally. This creates dual React instances where hooks fail.

**Current Code** (`bundle-artifact/index.ts:395`):
```typescript
const esmUrl = `https://esm.sh/${pkg}@${version}?deps=react@18.3.1,react-dom@18.3.1`;
```

**Fix**:
```typescript
const esmUrl = `https://esm.sh/${pkg}@${version}?external=react,react-dom`;
```

**Files to Modify**:
- `supabase/functions/bundle-artifact/index.ts`

**Testing**:
1. Generate artifact with Radix UI components
2. Verify no "useRef is null" errors
3. Check Network tab shows esm.sh URLs with `?external=`
4. Test with @radix-ui/react-dialog, @radix-ui/react-select

**Acceptance Criteria**:
- [ ] All esm.sh URLs use `?external=react,react-dom`
- [ ] No dual React instance errors in any test artifact
- [ ] Client-side patching in `BundledArtifactFrame` becomes unnecessary (but keep as safety net)

---

### 1.2 Add Complete Import Map Entries Server-Side

**Problem**: Server bundles only include `react-shim` and `react-dom-shim`, but not the bare specifiers (`react`, `react-dom`, `react/jsx-runtime`) that esm.sh packages import.

**Current Code** (`bundle-artifact/index.ts:446-458`):
```typescript
const browserImportMap: Record<string, string> = {
  'react-shim': 'data:text/javascript,...',
  'react-dom-shim': 'data:text/javascript,...',
};
```

**Fix**: Add all required entries:
```typescript
const browserImportMap: Record<string, string> = {
  // Shims for transformed code
  'react-shim': 'data:text/javascript,const R=window.React;export default R;export const{useState,useEffect,useRef,useMemo,useCallback,useContext,createContext,createElement,Fragment,memo,forwardRef,useReducer,useLayoutEffect,useImperativeHandle,useDebugValue,useDeferredValue,useTransition,useId,useSyncExternalStore,lazy,Suspense,startTransition,Children,cloneElement,isValidElement,createRef,Component,PureComponent,StrictMode}=R;',
  'react-dom-shim': 'data:text/javascript,const D=window.ReactDOM;export default D;export const{createRoot,hydrateRoot,createPortal,flushSync,findDOMNode,unmountComponentAtNode,render,hydrate}=D;',

  // Bare specifiers for esm.sh packages with ?external=react,react-dom
  'react': 'data:text/javascript,const R=window.React;export default R;export const{useState,useEffect,useRef,useMemo,useCallback,useContext,createContext,createElement,Fragment,memo,forwardRef,useReducer,useLayoutEffect,useImperativeHandle,useDebugValue,useDeferredValue,useTransition,useId,useSyncExternalStore,lazy,Suspense,startTransition,Children,cloneElement,isValidElement,createRef,Component,PureComponent,StrictMode}=R;',
  'react-dom': 'data:text/javascript,const D=window.ReactDOM;export default D;export const{createRoot,hydrateRoot,createPortal,flushSync,findDOMNode,unmountComponentAtNode,render,hydrate}=D;',
  'react-dom/client': 'data:text/javascript,const D=window.ReactDOM;export default D;export const{createRoot,hydrateRoot,createPortal,flushSync}=D;',
  'react/jsx-runtime': 'data:text/javascript,const R=window.React;const Fragment=R.Fragment;const jsx=(type,props,key)=>R.createElement(type,{...props,key});const jsxs=jsx;export{jsx,jsxs,Fragment};',
  'react/jsx-dev-runtime': 'data:text/javascript,const R=window.React;const Fragment=R.Fragment;const jsx=(type,props,key)=>R.createElement(type,{...props,key});const jsxs=jsx;export{jsx,jsxs,Fragment};',
};
```

**Files to Modify**:
- `supabase/functions/bundle-artifact/index.ts`

**Testing**:
1. Generate artifact with modern JSX transform (jsx-runtime)
2. Verify import map in generated HTML has all entries
3. Test Radix UI component rendering without client-side patching

**Acceptance Criteria**:
- [ ] Import map includes `react`, `react-dom`, `react-dom/client`, `react/jsx-runtime`
- [ ] Server bundles work without client-side import map patching
- [ ] All React hooks resolve to window.React

---

### 1.3 Increase Bundle Timeout

**Problem**: 30-second timeout insufficient for large dependency trees.

**Current Code** (`bundle-artifact/index.ts:51`):
```typescript
const BUNDLE_TIMEOUT_MS = 30000; // 30 seconds
```

**Fix**:
```typescript
const BUNDLE_TIMEOUT_MS = 60000; // 60 seconds
```

**Files to Modify**:
- `supabase/functions/bundle-artifact/index.ts`

**Note**: This constant isn't currently used in the code (bundling is synchronous). Consider adding timeout wrapper:

```typescript
const bundleWithTimeout = async (operation: Promise<T>, timeoutMs: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Bundle timeout after ${timeoutMs}ms`)), timeoutMs)
  );
  return Promise.race([operation, timeout]);
};
```

**Acceptance Criteria**:
- [ ] Timeout constant increased to 60 seconds
- [ ] Complex artifacts (Recharts + Radix + Framer Motion) complete without timeout

---

## Phase 2: Reliability Improvements (P1) - ~3 hours

### 2.1 Add Artifact Rendered Signal

**Problem**: `ReasoningDisplay` shows "Done" before artifact actually renders in iframe.

**Fix**: Add bidirectional communication:

**Server** (`bundle-artifact/index.ts` HTML template):
```html
<script>
  // After component renders successfully
  window.addEventListener('load', () => {
    window.parent.postMessage({ type: 'artifact-rendered-complete' }, '*');
  });

  // For React components specifically
  const observer = new MutationObserver((mutations, obs) => {
    if (document.getElementById('root')?.children.length > 0) {
      window.parent.postMessage({ type: 'artifact-rendered-complete' }, '*');
      obs.disconnect();
    }
  });
  observer.observe(document.getElementById('root'), { childList: true });
</script>
```

**Client** (`src/hooks/useChatMessages.tsx`):
```typescript
// In message handler
case 'artifact-rendered-complete':
  setIsArtifactFullyRendered(true);
  break;
```

**Client** (`src/components/ReasoningDisplay.tsx`):
```typescript
// Only show "Done" when both conditions met:
const isComplete = reasoningComplete && artifactRenderedComplete;
```

**Files to Modify**:
- `supabase/functions/bundle-artifact/index.ts` (HTML template)
- `src/components/ArtifactRenderer.tsx` (client-side Babel template)
- `src/hooks/useChatMessages.tsx`
- `src/components/ReasoningDisplay.tsx`

**Testing**:
1. Generate complex artifact
2. Verify "Thinking..." shows until artifact is visible
3. Time the transition to ensure no premature "Done"

**Acceptance Criteria**:
- [ ] `artifact-rendered-complete` message sent from iframe
- [ ] ReasoningDisplay waits for this signal before showing final state
- [ ] No flash of "Done" before artifact appears

---

### 2.2 Improve Error Recovery with Structured Fallbacks

**Problem**: Errors show messages but don't offer structured recovery paths.

**Fix**: Create error classification system with fallback actions:

```typescript
// New file: src/utils/artifactErrorRecovery.ts
export interface ArtifactError {
  type: 'syntax' | 'runtime' | 'import' | 'bundling' | 'timeout';
  message: string;
  suggestedFix?: string;
  canAutoFix: boolean;
  fallbackRenderer?: 'sandpack' | 'babel' | 'static-preview';
  retryStrategy?: 'immediate' | 'with-fix' | 'different-model';
}

export function classifyAndRecover(error: string, artifactCode: string): ArtifactError {
  // Syntax errors - try auto-fix
  if (error.includes('Unexpected token') || error.includes('SyntaxError')) {
    return {
      type: 'syntax',
      message: error,
      canAutoFix: true,
      suggestedFix: 'AI will attempt to fix syntax issues',
      retryStrategy: 'with-fix'
    };
  }

  // Import errors - try Sandpack fallback
  if (error.includes('Failed to resolve') || error.includes('Module not found')) {
    return {
      type: 'import',
      message: error,
      canAutoFix: false,
      fallbackRenderer: 'sandpack',
      suggestedFix: 'Trying Sandpack for better npm support'
    };
  }

  // Bundling timeout - retry with simpler approach
  if (error.includes('timeout') || error.includes('Bundle timeout')) {
    return {
      type: 'timeout',
      message: error,
      canAutoFix: false,
      fallbackRenderer: 'babel',
      suggestedFix: 'Using client-side rendering instead'
    };
  }

  // Default
  return {
    type: 'runtime',
    message: error,
    canAutoFix: true,
    retryStrategy: 'with-fix'
  };
}
```

**Files to Create**:
- `src/utils/artifactErrorRecovery.ts`

**Files to Modify**:
- `src/components/ArtifactRenderer.tsx` (use recovery system)
- `src/components/ArtifactContainer.tsx` (automatic fallback logic)

**Testing**:
1. Trigger each error type intentionally
2. Verify appropriate fallback is attempted
3. Test auto-retry flows

**Acceptance Criteria**:
- [ ] All errors classified with recovery strategy
- [ ] Automatic fallback to Sandpack for import errors
- [ ] Clear user messaging about what's happening

---

### 2.3 Fix CSP for Data URLs in Server Bundles

**Problem**: Server bundles may not have `data:` in CSP, causing import map shims to fail.

**Current Code** (`bundle-artifact/index.ts:488-493`):
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com https://esm.sh blob: data:;
```

**Verify**: Check that `data:` is already present in `script-src`. If not, add it.

**Testing**:
1. View source of generated bundle HTML
2. Confirm CSP includes `data:` in script-src
3. Test import map shim loading

**Acceptance Criteria**:
- [ ] CSP includes `data:` in script-src directive
- [ ] Import map data URLs load without CSP violations

---

## Phase 3: UX Enhancements (P2) - ~3 hours

### 3.1 Extend Storage URL Expiry

**Problem**: 1-hour signed URLs cause broken artifacts for returning users.

**Current Code** (`bundle-artifact/index.ts:642`):
```typescript
const expiresIn = 3600; // 1 hour in seconds
```

**Fix**:
```typescript
const expiresIn = 86400; // 24 hours in seconds
```

**Additional**: Add client-side expiry detection with auto-refresh:

```typescript
// src/components/ArtifactContainer.tsx
const isUrlExpired = (url: string, expiresAt: string) => {
  return new Date(expiresAt) < new Date();
};

useEffect(() => {
  if (artifact.bundleUrl && artifact.expiresAt) {
    if (isUrlExpired(artifact.bundleUrl, artifact.expiresAt)) {
      // Trigger re-bundle
      triggerRebundle(artifact);
    }
  }
}, [artifact]);
```

**Files to Modify**:
- `supabase/functions/bundle-artifact/index.ts`
- `src/components/ArtifactContainer.tsx`

**Testing**:
1. Generate artifact, wait 1+ hours, verify still works
2. Manually expire URL, verify re-bundle triggered
3. Check storage costs at 24h vs 1h expiry

**Acceptance Criteria**:
- [ ] URLs valid for 24 hours
- [ ] Client detects expired URLs and re-bundles
- [ ] User sees loading state during re-bundle

---

### 3.2 Add Bundle Progress Events

**Problem**: No feedback during 5-15 second bundling process.

**Fix**: Add SSE events for bundling progress:

```typescript
// bundle-artifact/index.ts - Add progress streaming
const writer = encoder.getWriter();

await writer.write(`data: ${JSON.stringify({ type: 'bundle_start', dependencies: Object.keys(dependencies) })}\n\n`);

for (const [pkg, version] of Object.entries(dependencies)) {
  await writer.write(`data: ${JSON.stringify({ type: 'bundle_progress', package: pkg, status: 'fetching' })}\n\n`);
  // ... fetch logic
}

await writer.write(`data: ${JSON.stringify({ type: 'bundle_complete', bundleUrl })}\n\n`);
```

**Client** (`src/hooks/useChatMessages.tsx`):
```typescript
case 'bundle_progress':
  setBundlingStatus(`Bundling ${data.package}...`);
  break;
```

**Files to Modify**:
- `supabase/functions/bundle-artifact/index.ts`
- `src/hooks/useChatMessages.tsx`
- `src/components/ArtifactContainer.tsx` (show status)

**Testing**:
1. Generate artifact with multiple dependencies
2. Verify progress messages appear
3. Check timing and message accuracy

**Acceptance Criteria**:
- [ ] Users see "Bundling recharts..." etc during wait
- [ ] Progress shown in ReasoningDisplay or artifact skeleton
- [ ] No UI flash or jank

---

### 3.3 Optimize ReasoningDisplay Animations

**Problem**: AnimatePresence causes layout thrashing on lower-end devices.

**Fix**: Use CSS transforms instead of layout properties:

```typescript
// ReasoningDisplay.tsx
const motionVariants = {
  initial: {
    opacity: 0,
    transform: 'translateY(8px)' // Use transform, not y
  },
  animate: {
    opacity: 1,
    transform: 'translateY(0px)',
    transition: { duration: 0.2 }
  },
  exit: {
    opacity: 0,
    transform: 'translateY(-8px)',
    transition: { duration: 0.15 }
  }
};
```

**Files to Modify**:
- `src/components/ReasoningDisplay.tsx`

**Testing**:
1. Profile with Chrome DevTools Performance tab
2. Check for layout thrashing during animations
3. Test on lower-end device/throttled CPU

**Acceptance Criteria**:
- [ ] No layout recalculations during step transitions
- [ ] Smooth 60fps animations
- [ ] Reduced CPU usage during streaming

---

## Phase 4: Future Optimizations (P3) - ~2-4 hours

### 4.1 Pre-bundle Common Dependencies

**Problem**: Popular dependency combos take 5-15 seconds to bundle every time.

**Strategy**: Create pre-bundled packages for common combinations:

```typescript
// New file: supabase/functions/_shared/prebuilt-bundles.ts
export const PREBUILT_BUNDLES = {
  'recharts@2.5.0': {
    url: 'https://storage.supabase.co/.../recharts-2.5.0.bundle.js',
    includes: ['recharts', 'prop-types'],
    size: 245000
  },
  '@radix-ui/react-dialog@1.0.5': {
    url: 'https://storage.supabase.co/.../radix-dialog-1.0.5.bundle.js',
    includes: ['@radix-ui/react-dialog', '@radix-ui/react-primitive'],
    size: 45000
  },
  'framer-motion@11': {
    url: 'https://storage.supabase.co/.../framer-motion-11.bundle.js',
    includes: ['framer-motion'],
    size: 180000
  }
};

export function getPrebuiltBundle(dependencies: Record<string, string>): PrebuiltBundle | null {
  // Check if all deps are covered by a prebuilt bundle
  for (const [key, bundle] of Object.entries(PREBUILT_BUNDLES)) {
    const [pkg, version] = key.split('@');
    if (dependencies[pkg] === version) {
      return bundle;
    }
  }
  return null;
}
```

**Implementation Steps**:
1. Create build script for pre-bundling
2. Upload bundles to Supabase Storage
3. Modify bundle-artifact to check prebuilt first
4. Add cache headers for long-term caching

**Files to Create**:
- `supabase/functions/_shared/prebuilt-bundles.ts`
- `scripts/build-prebuilt-bundles.ts`

**Files to Modify**:
- `supabase/functions/bundle-artifact/index.ts`

**Testing**:
1. Generate artifact using recharts
2. Verify prebuilt bundle served
3. Measure time savings (should be <1s vs 10s)

**Acceptance Criteria**:
- [ ] Top 5 dependency combos pre-bundled
- [ ] Bundle time reduced from ~10s to <1s for common cases
- [ ] Fallback to dynamic bundling for uncommon deps

---

### 4.2 Implement Token-Based Rate Limiting

**Problem**: All artifacts count equally against limits regardless of complexity.

**Strategy**: Track tokens instead of request counts:

```sql
-- New table for token-based tracking
CREATE TABLE artifact_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  guest_identifier TEXT,
  tokens_used INTEGER NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RPC function
CREATE OR REPLACE FUNCTION check_token_rate_limit(
  p_user_id UUID,
  p_guest_identifier TEXT,
  p_tokens_requested INTEGER,
  p_max_tokens INTEGER DEFAULT 100000,
  p_window_hours INTEGER DEFAULT 5
) RETURNS JSON AS $$
-- Implementation
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Files to Create**:
- `supabase/migrations/xxx_token_based_rate_limits.sql`

**Files to Modify**:
- `supabase/functions/generate-artifact/index.ts`
- `supabase/functions/_shared/rate-limiter.ts`

**Testing**:
1. Verify token counting accuracy
2. Test limit enforcement
3. Compare UX for simple vs complex artifacts

**Acceptance Criteria**:
- [ ] Rate limiting based on tokens (estimated before generation)
- [ ] Complex artifacts cost more quota
- [ ] Simple artifacts cost less quota

---

### 4.3 Add Artifact Response Caching

**Problem**: Identical prompts regenerate artifacts wastefully.

**Strategy**: Hash prompt + context and cache responses:

```typescript
// src/utils/artifactCache.ts
const CACHE_PREFIX = 'artifact_cache_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getCachedArtifact(promptHash: string): ArtifactData | null {
  const cached = localStorage.getItem(`${CACHE_PREFIX}${promptHash}`);
  if (!cached) return null;

  const { artifact, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_TTL_MS) {
    localStorage.removeItem(`${CACHE_PREFIX}${promptHash}`);
    return null;
  }

  return artifact;
}

export function cacheArtifact(promptHash: string, artifact: ArtifactData): void {
  localStorage.setItem(`${CACHE_PREFIX}${promptHash}`, JSON.stringify({
    artifact,
    timestamp: Date.now()
  }));
}

export function hashPrompt(prompt: string, context: string): string {
  // Use SHA-256 for consistent hashing
  return crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(prompt + context)
  ).then(buf => Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0')).join(''));
}
```

**Files to Create**:
- `src/utils/artifactCache.ts`

**Files to Modify**:
- `src/hooks/useChatMessages.tsx`

**Testing**:
1. Generate same artifact twice
2. Verify second request uses cache
3. Test cache invalidation

**Acceptance Criteria**:
- [ ] Identical requests served from cache
- [ ] Cache respects 24h TTL
- [ ] Option to force regeneration

---

## Implementation Schedule

| Phase | Tasks | Time | Dependencies |
|-------|-------|------|--------------|
| **Phase 1** | 1.1, 1.2, 1.3 | ~2h | None |
| **Phase 2** | 2.1, 2.2, 2.3 | ~3h | Phase 1 |
| **Phase 3** | 3.1, 3.2, 3.3 | ~3h | Phase 2 |
| **Phase 4** | 4.1, 4.2, 4.3 | ~3h | Phase 3 |

**Recommended Order**: Complete Phase 1 first as it fixes the root cause of dual React issues. Other phases can be parallelized.

---

## Testing Strategy

### Unit Tests
- `artifact-validator.ts` import map generation
- Token counting for rate limiting
- Error classification logic

### Integration Tests
- Full artifact generation flow with each fix
- SSE streaming with new events
- Bundle timeout handling

### E2E Tests (Chrome DevTools MCP)
1. Generate React artifact → verify renders without errors
2. Generate Radix UI artifact → verify hooks work
3. Trigger timeout → verify fallback behavior
4. Check reasoning display timing

### Performance Tests
- Bundle time before/after prebuilts
- Animation frame rate during streaming
- Memory usage with caching

---

## Rollback Plan

Each phase is independently deployable and rollback-safe:

1. **Phase 1**: Revert bundle-artifact changes, client-side patching continues to work
2. **Phase 2**: Revert signal handling, premature "Done" returns but artifacts work
3. **Phase 3**: Revert UX changes, functionality unaffected
4. **Phase 4**: Disable prebuilts/caching, fall back to dynamic bundling

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Dual React errors | ~5% of Radix artifacts | 0% |
| Bundle timeout failures | ~10% | <2% |
| Premature completion display | Common | Never |
| Average bundle time (common deps) | ~10s | <2s |
| User satisfaction (artifact gen) | Unknown | Measure baseline + 20% |

---

## Open Questions

1. **Pre-built bundle hosting**: Supabase Storage vs CDN? Consider egress costs.
2. **Token counting accuracy**: How to estimate before generation? Use character count heuristic?
3. **Cache storage**: localStorage vs IndexedDB for larger artifacts?
4. **Rate limit UI**: How to show users their remaining quota?

---

## Appendix: File Change Summary

### Files to Modify
- `supabase/functions/bundle-artifact/index.ts` (Phases 1, 2, 3)
- `supabase/functions/generate-artifact/index.ts` (Phase 4)
- `src/components/ArtifactRenderer.tsx` (Phase 2)
- `src/components/ArtifactContainer.tsx` (Phases 2, 3)
- `src/components/ReasoningDisplay.tsx` (Phases 2, 3)
- `src/hooks/useChatMessages.tsx` (Phases 2, 3, 4)
- `supabase/functions/_shared/rate-limiter.ts` (Phase 4)

### Files to Create
- `src/utils/artifactErrorRecovery.ts` (Phase 2)
- `supabase/functions/_shared/prebuilt-bundles.ts` (Phase 4)
- `scripts/build-prebuilt-bundles.ts` (Phase 4)
- `src/utils/artifactCache.ts` (Phase 4)
- `supabase/migrations/xxx_token_based_rate_limits.sql` (Phase 4)
