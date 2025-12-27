# Sucrase Migration Implementation Plan

**Generated:** 2025-12-26
**Updated:** 2025-12-26 - Scope clarification: prebuilt bundles unaffected
**Status:** Ready for Peer Review
**Reference:** `.claude/proposals/transpiler-upgrade-proposal.md`

---

## Executive Summary

This document provides a comprehensive implementation plan for migrating from Babel Standalone to Sucrase for artifact transpilation in the Vana AI development assistant platform. The migration addresses a critical performance and bundle size optimization identified in the proposal at `.claude/proposals/transpiler-upgrade-proposal.md`.

**Scope:** This migration ONLY affects client-side transpilation (Path A). The prebuilt bundle system and server-side bundling (Path B) are completely unaffected because Sucrase only transpiles code—it does not modify import statements.

**Key Benefits:**
- 96% bundle size reduction (2.6MB to ~100KB)
- 20x faster transpilation performance
- Same approach used by Claude Artifacts (Anthropic)
- Proven in production by CodeSandbox, Expo, and 4.7M+ weekly npm downloads

---

## Architecture Clarification: Two Rendering Paths

This migration ONLY affects **Path A (Client-Side Transpilation)**. The prebuilt bundle system (Path B) is completely unaffected.

### Path A: Client-Side Transpilation (Babel → Sucrase)

**When:** Artifact has NO npm imports (uses React globals only)

```
User Code (JSX/TS) → Babel Standalone → Browser Execution
                     ↓
                  [MIGRATION]
                     ↓
User Code (JSX/TS) → Sucrase (pre-transpile) → Browser Execution
```

**What changes:**
- Replace runtime Babel transpilation with pre-transpiled code
- Remove 2.6MB Babel Standalone CDN dependency
- 20x faster transpilation (happens before iframe load)

### Path B: Server-Side Bundling (Unchanged)

**When:** Artifact has npm imports (e.g., `import * as Dialog from '@radix-ui/react-dialog'`)

```
User Code → Server bundler (bundle-artifact/) → esm.sh CDN URLs → Browser
                    ↓
            Uses prebuilt bundles for common packages
```

**Why unaffected:**
- Sucrase only transpiles code (JSX → createElement, strips types)
- Sucrase does NOT modify import statements
- Prebuilt bundles are CDN URL mappings, not transpilation
- Server bundler already handles TypeScript via esm.sh

### Import Map Shims (Requires Testing)

Both paths use import map shims for React globals:
```javascript
// Shim redirects bare imports to window globals
import React from 'react';  // → window.React
```

**Valid concern:** Need to verify Sucrase-transpiled code works with these shims.

---

## Current State Analysis

### Client-Side Transpilation (ArtifactRenderer.tsx)

**Location:** `src/components/ArtifactRenderer.tsx`

**Current Implementation (Lines 1227-1378):**
- Babel Standalone loaded via CDN: `https://unpkg.com/@babel/standalone/babel.min.js`
- Uses `<script type="text/babel" data-type="module" data-presets="env,react,typescript">` for runtime transpilation
- Presets: env, react, typescript
- Transpilation happens in the iframe after page load

**Key Code Pattern (Lines 1277-1365):**
```html
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script type="text/babel" data-type="module" data-presets="env,react,typescript">
  // Component code is embedded here and transpiled at runtime
</script>
```

### Server-Side Bundling (bundle-artifact/index.ts)

**Location:** `supabase/functions/bundle-artifact/index.ts`

**Current Implementation:**
- Uses esm.sh CDN for runtime ESM imports (no bundler)
- Manual TypeScript stripping via regex patterns (lines 403-441)
- No Babel dependency on server side

### TypeScript Stripping (artifact-validator.ts)

**Location:** `supabase/functions/_shared/artifact-validator.ts`

**Current Implementation (Lines 213-268):**
- Regex-based TypeScript syntax stripping
- Handles: generic type parameters, type annotations, type assertions, interfaces, type aliases
- Uses complex regex patterns with lookbehinds/lookaheads

---

## Phase 1: Client-Side Migration

### Estimated Time: 2-4 hours

### Step 1.1: Install Sucrase Package

**File:** `package.json`

Add to dependencies:
```json
{
  "dependencies": {
    "sucrase": "^3.35.0"
  }
}
```

**Commands:**
```bash
npm install sucrase
```

### Step 1.2: Create Transpilation Helper Utility

**New File:** `src/utils/sucraseTranspiler.ts`

```typescript
/**
 * Sucrase Transpiler for Artifact Code
 *
 * Replaces Babel Standalone with Sucrase for 20x faster transpilation
 * and 96% smaller bundle size.
 *
 * Reference: https://github.com/alangpierce/sucrase
 * Used by: Claude Artifacts, CodeSandbox, Expo
 */
import { transform } from 'sucrase';
import * as Sentry from '@sentry/react';

export interface TranspileResult {
  success: true;
  code: string;
  elapsed: number;
}

export interface TranspileError {
  success: false;
  error: string;
  details?: string;
  line?: number;
  column?: number;
}

/**
 * Transpiles JSX/TypeScript code to browser-compatible JavaScript
 *
 * @param code - Source code with JSX and/or TypeScript
 * @param options - Transpilation options
 * @returns Transpiled code or error
 */
export function transpileCode(
  code: string,
  options?: {
    filename?: string;
    preserveJsxPragma?: boolean;
  }
): TranspileResult | TranspileError {
  const start = performance.now();

  try {
    const result = transform(code, {
      transforms: ['jsx', 'typescript'],
      production: true,
      disableESTransforms: true, // Keep ES modules, don't downlevel
      jsxPragma: 'React.createElement',
      jsxFragmentPragma: 'React.Fragment',
      filePath: options?.filename,
    });

    const elapsed = performance.now() - start;

    return {
      success: true,
      code: result.code,
      elapsed,
    };
  } catch (error) {
    const elapsed = performance.now() - start;

    // Parse Sucrase error format for line/column info
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lineMatch = errorMessage.match(/\((\d+):(\d+)\)/);

    // Report to Sentry for monitoring
    Sentry.captureException(error, {
      tags: {
        component: 'sucraseTranspiler',
        action: 'transpile',
      },
      extra: {
        codeLength: code.length,
        elapsed,
      },
    });

    return {
      success: false,
      error: 'Transpilation failed',
      details: errorMessage,
      line: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
      column: lineMatch ? parseInt(lineMatch[2], 10) : undefined,
    };
  }
}

/**
 * Checks if Sucrase is available and working
 * Used for feature flag gating and health checks
 */
export function isSucraseAvailable(): boolean {
  try {
    const result = transpileCode('const x: number = 1;');
    return result.success;
  } catch {
    return false;
  }
}
```

### Step 1.3: Update ArtifactRenderer.tsx

**File:** `src/components/ArtifactRenderer.tsx`

**Modifications Required:**

1. **Import Sucrase Transpiler** (add after line 16):
```typescript
import { transpileCode } from '@/utils/sucraseTranspiler';
import { isFeatureEnabled } from '@/lib/featureFlags';
```

2. **Modify React Preview Content Generation** (replace lines 1176-1378):

The key change is to transpile the code BEFORE embedding it in the HTML template, then use a regular `<script type="module">` instead of `<script type="text/babel">`.

```typescript
// PRIORITY 3: Client-side rendering for simple React (no npm imports)
const processedCode = artifact.content
  .replace(/^```[\w]*\n?/gm, '')
  .replace(/^```\n?$/gm, '')
  // ... existing processing ...
  .trim();

// Transpile with Sucrase (or fall back to Babel if disabled)
let transpiledCode: string;
let usedSucrase = false;

if (isFeatureEnabled('SUCRASE_TRANSPILER')) {
  const result = transpileCode(processedCode);
  if (result.success) {
    transpiledCode = result.code;
    usedSucrase = true;
  } else {
    console.warn('[ArtifactRenderer] Sucrase failed, falling back to Babel:', result.error);
    transpiledCode = processedCode; // Fall back to Babel
  }
} else {
  transpiledCode = processedCode; // Use Babel (legacy)
}

const reactPreviewContent = usedSucrase
  ? generateSucraseTemplate(transpiledCode, componentName, injectedCDNs)
  : generateBabelTemplate(processedCode, componentName, injectedCDNs);
```

3. **Create Template Generator Functions**:

```typescript
// New function: Generate HTML template for Sucrase (no Babel needed)
function generateSucraseTemplate(
  transpiledCode: string,
  componentName: string,
  injectedCDNs: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- React UMD (NO Babel needed - code already transpiled) -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <!-- ... rest of template setup ... -->
</head>
<body>
  <div id="root"></div>
  <script type="module">
    // Pre-transpiled code (JSX/TS already converted to JS)
    ${transpiledCode}

    // Render component
    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      const Component = ${componentName};
      root.render(React.createElement(Component));
      window.parent.postMessage({ type: 'artifact-rendered-complete', success: true }, '*');
    } catch (error) {
      window.parent.postMessage({ type: 'artifact-error', message: error.message }, '*');
    }
  </script>
</body>
</html>`;
}

// Existing function: Generate HTML template for Babel (legacy fallback)
function generateBabelTemplate(
  code: string,
  componentName: string,
  injectedCDNs: string
): string {
  // ... existing implementation from lines 1222-1378 ...
}
```

### Step 1.4: Add Feature Flag

**File:** `src/lib/featureFlags.ts`

Add new flag:
```typescript
export const FEATURE_FLAGS = {
  // ... existing flags ...

  /**
   * Sucrase Transpiler
   * When enabled, uses Sucrase instead of Babel Standalone for artifact transpilation.
   * Benefits: 96% smaller bundle, 20x faster transpilation
   * Rollback: Set to false to revert to Babel Standalone
   */
  SUCRASE_TRANSPILER: false, // Start disabled, enable for staged rollout
} as const;
```

---

## Phase 2: Server-Side TypeScript Stripping (Optional)

### Estimated Time: 2-3 hours

> **Note:** This phase is an OPTIONAL optimization. The server bundler (`bundle-artifact/`) already works correctly using esm.sh for TypeScript handling. This phase improves consistency by using Sucrase for TypeScript stripping in `artifact-validator.ts`, replacing fragile regex patterns.

### Step 2.1: Add Sucrase to Edge Function

**File:** `supabase/functions/bundle-artifact/index.ts`

The server-side bundling uses esm.sh for runtime imports. Sucrase can be used here for more reliable TypeScript stripping, replacing the current regex-based approach.

Add import at top:
```typescript
import { transform } from "npm:sucrase@3.35.0";
```

### Step 2.2: Replace Regex-Based TypeScript Stripping

**File:** `supabase/functions/_shared/artifact-validator.ts`

Replace lines 213-268 in `autoFixArtifactCode()`:

```typescript
/**
 * Strip TypeScript syntax using Sucrase instead of fragile regex
 *
 * Benefits:
 * - Correct AST-based transformation
 * - Handles edge cases regex can't (generic arrow functions, nested generics)
 * - Same tool used client-side for consistency
 */
function stripTypeScriptWithSucrase(code: string): { code: string; stripped: boolean } {
  try {
    const result = transform(code, {
      transforms: ['typescript'], // Only strip types, keep JSX for browser
      disableESTransforms: true,
    });
    return { code: result.code, stripped: true };
  } catch (error) {
    // Fall back to regex stripping if Sucrase fails
    console.warn('[artifact-validator] Sucrase TS strip failed, using regex fallback:', error);
    return { code, stripped: false };
  }
}
```

### Step 2.3: Add Fallback Logic

Preserve existing regex-based stripping as a fallback:

```typescript
export function autoFixArtifactCode(code: string): { fixed: string; changes: string[] } {
  let fixed = code;
  const changes: string[] = [];

  // ... existing fixes (reserved keywords, malformed imports, etc.) ...

  // NEW: Try Sucrase for TypeScript stripping first
  const sucraseResult = stripTypeScriptWithSucrase(fixed);
  if (sucraseResult.stripped) {
    fixed = sucraseResult.code;
    changes.push('Stripped TypeScript syntax with Sucrase');
  } else {
    // FALLBACK: Use existing regex patterns (lines 217-266)
    let tsStripped = false;
    // ... existing regex stripping code ...
    if (tsStripped) {
      changes.push('Stripped TypeScript syntax (regex fallback)');
    }
  }

  return { fixed, changes };
}
```

---

## Phase 3: Testing Strategy

### Estimated Time: 1-2 days

### Step 3.1: Unit Tests for Transpilation

**New File:** `src/utils/__tests__/sucraseTranspiler.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { transpileCode, isSucraseAvailable } from '../sucraseTranspiler';

describe('sucraseTranspiler', () => {
  describe('transpileCode', () => {
    it('transpiles simple JSX', () => {
      const result = transpileCode('<div>Hello</div>');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).toContain('React.createElement');
        expect(result.code).not.toContain('<div>');
      }
    });

    it('strips TypeScript types', () => {
      const result = transpileCode('const x: number = 1;');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).toBe('const x = 1;');
        expect(result.code).not.toContain(': number');
      }
    });

    it('handles generic components', () => {
      const result = transpileCode(`
        function List<T>({ items }: { items: T[] }) {
          return <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>;
        }
      `);
      expect(result.success).toBe(true);
    });

    it('handles complex React patterns', () => {
      const result = transpileCode(`
        const [state, setState] = useState<number>(0);
        const ref = useRef<HTMLDivElement>(null);
        const callback = useCallback((e: MouseEvent) => {}, []);
      `);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).not.toContain('<number>');
        expect(result.code).not.toContain('<HTMLDivElement>');
        expect(result.code).not.toContain(': MouseEvent');
      }
    });

    it('preserves namespace imports (import * as)', () => {
      const result = transpileCode("import * as Dialog from '@radix-ui/react-dialog';");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).toContain("import * as Dialog from");
        expect(result.code).not.toContain("import * from"); // Regression check
      }
    });

    it('handles enums', () => {
      const result = transpileCode(`
        enum Status { Active = 'active', Inactive = 'inactive' }
        const s: Status = Status.Active;
      `);
      expect(result.success).toBe(true);
    });

    it('returns error for invalid syntax', () => {
      const result = transpileCode('const x = {');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Transpilation failed');
        expect(result.details).toBeDefined();
      }
    });

    it('provides line/column for errors', () => {
      const result = transpileCode('line1\nconst x = {');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.line).toBe(2);
      }
    });
  });

  describe('isSucraseAvailable', () => {
    it('returns true when Sucrase works', () => {
      expect(isSucraseAvailable()).toBe(true);
    });
  });
});
```

### Step 3.2: Update Existing Validator Tests

**File:** `supabase/functions/_shared/__tests__/artifact-validator.test.ts`

Add tests for Sucrase integration:

```typescript
Deno.test("autoFixArtifactCode - uses Sucrase for TypeScript stripping", () => {
  const code = `const x: string = "hello";\nconst y: number = 42;\n\nexport default function App() { return <div>{x} {y}</div>; }`;
  const { fixed, changes } = autoFixArtifactCode(code);

  assertEquals(fixed.includes(': string'), false);
  assertEquals(fixed.includes(': number'), false);
  // Check which method was used
  assertEquals(changes.some(c => c.includes('Sucrase') || c.includes('TypeScript')), true);
});

Deno.test("autoFixArtifactCode - falls back to regex when Sucrase fails", () => {
  // This test verifies fallback behavior for edge cases
  // Sucrase should handle most cases, regex is safety net
});
```

### Step 3.3: Integration Tests

**File:** `src/components/__tests__/ArtifactRenderer.sucrase.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { ArtifactRenderer } from '../ArtifactRenderer';

describe('ArtifactRenderer with Sucrase', () => {
  it('renders React component using Sucrase transpilation', async () => {
    // Enable feature flag for test
    vi.mock('@/lib/featureFlags', () => ({
      isFeatureEnabled: (flag: string) => flag === 'SUCRASE_TRANSPILER',
    }));

    const artifact = {
      id: 'test-1',
      type: 'react',
      content: `
        export default function App() {
          const [count, setCount] = useState(0);
          return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
        }
      `,
      title: 'Counter',
    };

    // Render and verify no Babel script tag
    const { container } = render(<ArtifactRenderer artifact={artifact} /* ... */ />);

    await waitFor(() => {
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeTruthy();
      // Verify Babel is NOT loaded
      const iframeDoc = iframe?.contentDocument;
      const babelScript = iframeDoc?.querySelector('script[src*="babel"]');
      expect(babelScript).toBeNull();
    });
  });
});
```

### Step 3.4: Browser Compatibility Matrix

Test on:
| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 61+ | Required |
| Safari | 10.1+ | Required |
| Firefox | 60+ | Required |
| Edge | 16+ | Required |

### Step 3.5: Performance Benchmarks

Create benchmark script:
```typescript
// scripts/benchmark-transpilers.ts
import { transform as sucraseTransform } from 'sucrase';

const testCases = [
  // Small component (50 lines)
  { name: 'small', code: '...' },
  // Medium component (200 lines)
  { name: 'medium', code: '...' },
  // Large component (500 lines)
  { name: 'large', code: '...' },
];

// Run 100 iterations and measure
for (const tc of testCases) {
  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    sucraseTransform(tc.code, { transforms: ['jsx', 'typescript'] });
  }
  const elapsed = performance.now() - start;
  console.log(`${tc.name}: ${elapsed / 100}ms avg`);
}
```

---

## Phase 4: Rollout Strategy

### Estimated Time: 1 week (monitoring)

### Step 4.1: Feature Flag Implementation

Already covered in Phase 1.4. The flag `SUCRASE_TRANSPILER` controls the rollout.

### Step 4.2: Staged Rollout

1. **Stage 1 (Day 1-2): Internal Testing**
   - Enable flag in development environment
   - Run full test suite
   - Verify Chrome DevTools MCP testing passes

2. **Stage 2 (Day 3-4): 10% Rollout**
   - Use percentage-based feature flag (random by session)
   - Monitor Sentry for errors
   - Track transpilation times in logs

3. **Stage 3 (Day 5-6): 50% Rollout**
   - Increase to 50% of users
   - Compare error rates between groups
   - Monitor performance metrics

4. **Stage 4 (Day 7): 100% Rollout**
   - Full deployment
   - Babel code paths remain for fallback

### Step 4.3: Monitoring and Alerting

**Sentry Integration:**
```typescript
// In sucraseTranspiler.ts
Sentry.setTag('transpiler', usedSucrase ? 'sucrase' : 'babel');

// Track transpilation success rate
Sentry.captureMessage('Transpilation completed', {
  level: 'info',
  tags: { transpiler: 'sucrase', success: 'true' },
  extra: { elapsed: result.elapsed, codeLength: code.length },
});
```

**Key Metrics to Monitor:**
- Transpilation error rate (target: <0.1%)
- Transpilation time (target: <10ms for 95th percentile)
- Artifact render success rate (should remain stable)
- Bundle size reduction (verify with Chrome DevTools)

### Step 4.4: Rollback Procedure

If issues are detected:

1. **Immediate Rollback:** Set `SUCRASE_TRANSPILER: false` in featureFlags.ts
2. **Partial Rollback:** Reduce percentage in feature flag system
3. **No Code Deployment Required:** Flag change is instant

---

## Phase 5: Cleanup

### Estimated Time: 2-4 hours

### Step 5.1: Remove Babel Standalone Dependency

**After 2 weeks of stable production usage:**

1. **Remove from ArtifactRenderer.tsx:**
   - Delete `generateBabelTemplate()` function
   - Remove Babel CDN script tag from template
   - Remove feature flag checks (always use Sucrase)

2. **Update index.html CSP:**
   - Remove `unpkg.com` from script-src if no longer needed
   - Verify CSP still allows esm.sh for other dependencies

### Step 5.2: Update Documentation

**File:** `CLAUDE.md`

Update the Artifact System section:
```markdown
### Artifact System

**Rendering Methods**:
- **Sucrase Transpilation** (instant) — JSX/TypeScript stripped at build time, no runtime overhead
- **Server Bundling** (2-5s) — Has npm imports, uses `bundle-artifact/` Edge Function

**Transpiler:** Sucrase v3.35.0 (replaced Babel Standalone 2025-XX-XX)
- 96% smaller than Babel Standalone (100KB vs 2.6MB)
- 20x faster transpilation
- Same approach as Claude Artifacts (Anthropic)
```

### Step 5.3: Update package.json

**Remove if no other usage:**
```diff
- "@babel/standalone": "^7.x.x",  // If it was a direct dependency
```

**Verify Sucrase is in dependencies:**
```json
{
  "dependencies": {
    "sucrase": "^3.35.0"
  }
}
```

---

## Timeline Summary

With the clarified scope (prebuilt bundles unaffected), the original 8-10 day estimate remains accurate:

| Phase | Description | Duration | Status |
|-------|-------------|----------|--------|
| Phase 1 | Client-Side Migration (Babel → Sucrase) | 2-4 hours | **Core scope** |
| Phase 2 | Server-Side TS Stripping (Optional) | 2-3 hours | Optional optimization |
| Phase 3 | Testing Strategy | 1-2 days | Required |
| Phase 4 | Rollout Strategy | 1 week | Monitoring period |
| Phase 5 | Cleanup | 2-4 hours | After stable rollout |

**Total Active Development:** 1-2 days
**Total Including Rollout Monitoring:** 8-10 days

**Scope Clarification Notes:**
- Phase 1 is the only mandatory migration work
- Phase 2 can be deferred or skipped (esm.sh already handles TS)
- No prebuilt bundle testing required (Path B unchanged)
- Focus testing on import map shims and React globals

---

## Risk Assessment and Mitigation

### Risk 1: Import Map Shim Compatibility
**Likelihood:** Low
**Impact:** Medium
**Mitigation:**
- Sucrase preserves import statements unchanged
- Test with existing import map shims (`react` → `window.React`)
- Verify both bare imports and destructured imports work
- Keep Babel fallback code until 2 weeks post-rollout

### Risk 2: React Global Access
**Likelihood:** Low
**Impact:** Medium
**Mitigation:**
- Sucrase uses `React.createElement` pragma by default
- UMD React scripts expose `window.React` as expected
- Test useState, useEffect, and other hooks
- Verify Fragment shorthand (`<>...</>`) transpiles correctly

### Risk 3: Browser Compatibility Issues
**Likelihood:** Low
**Impact:** Medium
**Mitigation:**
- Test on all target browsers before rollout
- Keep Babel fallback code until 2 weeks post-rollout
- Feature flag allows instant rollback

### Risk 4: Edge Cases in TypeScript Stripping
**Likelihood:** Low
**Impact:** Low
**Mitigation:**
- Comprehensive test suite with real-world examples
- Regex fallback for Sucrase failures (Phase 2)
- Monitor Sentry for new error patterns

### Risk 5: Sucrase Package Issues
**Likelihood:** Very Low
**Impact:** Medium
**Mitigation:**
- Package has 4.7M weekly downloads and is production-proven
- Pin to specific version (^3.35.0)
- Fallback to Babel if Sucrase unavailable

---

## Success Criteria Checklist

**Before Full Rollout:**
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Chrome DevTools verification passes
- [ ] Client-side transpilation works (Path A artifacts render)
- [ ] Import map shims still function (bare `react` imports resolve)
- [ ] React globals accessible (`window.React`, hooks work)
- [ ] Performance benchmarks show improvement
- [ ] No increase in Sentry error rate
- [ ] Bundle size reduction confirmed (2.6MB → ~100KB)

**After Full Rollout (2 weeks):**
- [ ] Error rate < 0.1%
- [ ] No user-reported regressions
- [ ] Bundle size reduced by >90%
- [ ] Transpilation time < 10ms (p95)
- [ ] Babel cleanup completed
- [ ] Documentation updated

**NOT Required (unchanged by migration):**
- Prebuilt bundle system (Path B - uses esm.sh CDN)
- Server bundler (`bundle-artifact/` function)
- npm import resolution

---

## Critical Files for Implementation

**Phase 1 (Core - Client-Side Migration):**

1. **src/components/ArtifactRenderer.tsx** - Primary transpilation logic, HTML template generation (lines 1176-1378)

2. **src/utils/sucraseTranspiler.ts** - New helper utility for Sucrase transpilation

3. **src/lib/featureFlags.ts** - Feature flag for staged rollout

4. **package.json** - Add sucrase dependency

**Phase 2 (Optional - Server-Side TS Stripping):**

5. **supabase/functions/_shared/artifact-validator.ts** - TypeScript stripping (lines 213-268), auto-fix functions

6. **supabase/functions/_shared/__tests__/artifact-validator.test.ts** - Test patterns to follow for new tests

**NOT Modified (Path B - Prebuilt Bundles):**
- `supabase/functions/_shared/prebuilt-bundles.ts` - Unchanged (CDN URL mappings)
- `supabase/functions/bundle-artifact/index.ts` - Unchanged (esm.sh bundling)
