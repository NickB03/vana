# Artifact Transpilation Architecture

> **Last Updated**: 2025-12-27
> **Status**: Sucrase-only transpilation with "Ask AI to Fix" error recovery
> **Production Validation**: Used by Claude Artifacts (Anthropic), CodeSandbox, Expo

---

## Table of Contents

- [Overview](#overview)
- [Why Sucrase?](#why-sucrase)
- [Supported Syntax](#supported-syntax)
- [Unsupported Syntax (Will Fail)](#unsupported-syntax-will-fail)
- [Error Handling](#error-handling)
- [Performance Benchmarks](#performance-benchmarks)
- [Implementation Details](#implementation-details)
  - [Client-Side Transpilation](#client-side-transpilation)
  - [Server-Side Integration](#server-side-integration)
  - [Code Paths](#code-paths)
- [Template Differences](#template-differences)
- [Feature Flag Control](#feature-flag-control)
- [Browser Compatibility](#browser-compatibility)
- [Troubleshooting](#troubleshooting)
- [Related Files](#related-files)

---

## Overview

Vana uses **Sucrase** for all client-side artifact transpilation, providing dramatically faster rendering and smaller bundle sizes compared to traditional transpilers like Babel.

**Key Benefits**:
- ⚡ **20-50x faster** transpilation (2-10ms vs 150-500ms)
- 📦 **96% smaller** bundle (100KB vs 700KB CDN download)
- 🏭 **Production-proven** by major platforms (Claude Artifacts, CodeSandbox, Expo)
- 🎯 **Modern syntax support** for React, TypeScript, JSX/TSX

**Design Philosophy**:
- **Fail fast** with clear error messages (no silent degradation)
- **One-click recovery** via "Ask AI to Fix" button
- **No runtime fallback** — errors surface immediately for AI-assisted fixing

---

## Why Sucrase?

### Production Validation

Sucrase is battle-tested in production by:
- **Claude Artifacts** (Anthropic) — Same artifact rendering approach as Vana
- **CodeSandbox** — Real-time code transpilation for millions of sandboxes
- **Expo** — React Native development environment
- **4.7M+ weekly npm downloads** — Industry standard for fast transpilation

### Performance Characteristics

| Metric | Sucrase | Babel Standalone | Improvement |
|--------|---------|------------------|-------------|
| **Transpilation Time** | 2-10ms | 150-500ms | 20-50x faster |
| **Bundle Size** | ~100KB | ~700KB | 96% reduction |
| **Download Type** | One-time (bundled) | Per-artifact (CDN) | Offline-capable |
| **Syntax Support** | Modern JS/TS/JSX | Legacy + Edge Cases | Sufficient for 99% |

### Real-World Impact

**Before Sucrase**:
- 2.6MB Babel CDN download on every artifact render
- 150-500ms blocking transpilation time
- Poor offline experience

**After Sucrase**:
- ~100KB in main bundle (one-time download)
- 2-12ms non-blocking transpilation
- Artifacts appear instantly (sub-10ms)
- 2.5MB bandwidth saved per artifact

---

## Supported Syntax

Sucrase handles all modern JavaScript, TypeScript, and React patterns:

✅ **Fully Supported**:
- Modern JavaScript (ES6+: arrow functions, destructuring, spread, async/await, etc.)
- TypeScript (types stripped, interfaces removed)
- JSX/TSX (compiled to `React.createElement()` calls)
- React patterns (hooks, components, fragments)
- Import/export statements (ES modules)

**Configuration**:
```typescript
transform(code, {
  transforms: ['jsx', 'typescript'],  // Strip types, compile JSX
  production: true,                   // Optimize for production
  disableESTransforms: true,          // Keep ES6+ syntax (no downleveling)
  jsxPragma: 'React.createElement',
  jsxFragmentPragma: 'React.Fragment'
})
```

**Key Design Decision**: `disableESTransforms: true` keeps modern syntax intact since target browsers (Chrome 61+, Firefox 60+, Safari 10.1+, Edge 16+) natively support ES6+. This avoids Babel's bloat from converting to ES5.

---

## Unsupported Syntax (Will Fail)

Sucrase intentionally **does not support** certain advanced or legacy features:

❌ **Will Fail**:
- **Legacy decorators**: `@decorator class Foo {}`
  *(Use modern decorators or Babel fallback)*
- **TypeScript namespaces**: `namespace Foo {}`
  *(Use ES modules instead)*
- **Advanced TypeScript edge cases**: Certain complex type transformations
  *(Rarely encountered in artifact code)*
- **Babel plugins/presets**: Custom transformations
  *(By design — speed over features)*

**Why These Limitations?**
Sucrase's speed comes from **simple, fast parsing** without full AST transformations. These unsupported features represent <1% of real-world artifact code.

**Error Recovery Strategy**:
When Sucrase fails, the system shows an error with the "Ask AI to Fix" button, allowing one-click error resolution.

---

## Error Handling

When transpilation fails, the system provides **immediate, actionable feedback**:

### Error Flow

```
Artifact Code → Sucrase Transpilation
                ↓
          [Success?]
          ↙        ↘
        Yes         No
         ↓           ↓
    Render       Show Error Toast
    (2-10ms)     + Sentry Capture
                      ↓
                 "Ask AI to Fix"
                 (one-click recovery)
```

### User Experience

**On Transpilation Failure**:
1. **Error Message**: Displays line/column info from Sucrase parser
2. **"Ask AI to Fix" Button**: One-click recovery sends code + error to AI
3. **Sentry Capture**: Error logged for monitoring (no user impact)
4. **No Silent Degradation**: Failures are immediately visible

**Example Error**:
```
Transpilation failed at line 42, column 15:
Unexpected token 'namespace'. Namespaces are not supported.

[Ask AI to Fix] [View Code]
```

### Monitoring & Observability

**Sentry Integration**:

**Success Path** (Breadcrumb only):
```typescript
Sentry.addBreadcrumb({
  category: 'transpiler.sucrase',
  message: 'Sucrase transpilation successful',
  level: 'info',
  data: { elapsed: 3.2, codeLength: 1024, outputLength: 987 }
});
```

**Failure Path** (Exception capture):
```typescript
Sentry.captureException(new Error(`Sucrase failed: ${error}`), {
  tags: { component: 'sucraseTranspiler', action: 'transpile' },
  extra: { codeLength, elapsed, line, column }
});
```

---

## Performance Benchmarks

Real-world transpilation timing across artifact sizes:

| Artifact Size | Lines of Code | Avg Time (Sucrase) | Avg Time (Babel) | Speedup |
|---------------|---------------|---------------------|------------------|---------|
| **Small** (Counter) | ~50 | 2-5ms | 150-250ms | 50x |
| **Medium** (Todo App) | ~200 | 5-8ms | 250-350ms | 40x |
| **Large** (Dashboard) | ~500 | 8-12ms | 350-500ms | 35x |

**Test Methodology**:
Run `npx tsx scripts/benchmark-transpilers.ts` to measure transpilation performance on your machine.

**Bundle Size Impact**:

| Component | Size (Gzipped) | Load Time (3G) | Load Time (4G) |
|-----------|----------------|----------------|----------------|
| Babel Standalone CDN | ~700KB | ~4s | ~1.5s |
| Sucrase (bundled) | ~100KB | ~0.5s | ~0.2s |
| **Savings** | **600KB (86%)** | **3.5s** | **1.3s** |

---

## Implementation Details

### Client-Side Transpilation

**Location**: `src/utils/sucraseTranspiler.ts` (147 lines)

**Core Function**:
```typescript
export function transpileCode(
  code: string,
  options?: { filename?: string; preserveJsxPragma?: boolean }
): TranspileResult | TranspileError {
  const start = performance.now();

  try {
    const result = transform(code, {
      transforms: ['jsx', 'typescript'],
      production: true,
      disableESTransforms: true,
      jsxPragma: 'React.createElement',
      jsxFragmentPragma: 'React.Fragment',
      filePath: options?.filename,
    });

    const elapsed = performance.now() - start;
    console.log(`Transpilation successful in ${elapsed.toFixed(2)}ms`);

    return { success: true, code: result.code, elapsed };
  } catch (error) {
    // Parse error for line/column info, log to Sentry
    return {
      success: false,
      error: 'Transpilation failed',
      details: errorMessage,
      line: lineNumber,
      column: columnNumber,
    };
  }
}
```

**Availability Check**:
```typescript
export function isSucraseAvailable(): boolean {
  try {
    const result = transpileCode('const x: number = 1;');
    return result.success;
  } catch (error) {
    console.warn('Sucrase availability check failed:', error);
    return false;
  }
}
```

### Server-Side Integration

**Location**: `supabase/functions/_shared/artifact-validator.ts` (962 lines)

**Purpose**: Strip TypeScript types before validation (keeps JSX intact for pattern matching)

**Implementation**:
```typescript
import { transform } from 'npm:sucrase@3.35.0';

function stripTypeScriptWithSucrase(code: string): {
  code: string;
  stripped: boolean;
  error?: string;
} {
  try {
    const result = transform(code, {
      transforms: ['typescript'],  // Only strip types (no JSX transpilation)
      disableESTransforms: true
    });

    return {
      code: result.code,
      stripped: true  // Types were successfully stripped
    };
  } catch (error) {
    console.warn('Sucrase failed, falling back to regex stripping:', error);
    return {
      code: regexStripTypeScript(code),  // Fallback to regex
      stripped: true,
      error: String(error)
    };
  }
}
```

**Why Sucrase on Server?**
AST-based type stripping is more reliable than regex for validation. Sucrase provides accurate TypeScript removal without breaking JSX patterns that validators need to detect.

**Fallback**: Regex-based TypeScript stripping if Sucrase fails (rare)

### Code Paths

**Three rendering strategies** based on artifact complexity:

1. **Simple Artifacts** (no npm imports):
   ```
   User Code → Sucrase → Pre-transpiled Template → iframe Render
   (2-10ms total)
   ```

2. **Bundled Artifacts** (npm imports):
   ```
   User Code → Server Bundle (esm.sh) → Sucrase (if JSX) → iframe Render
   (2-5s server bundling + 2-10ms transpilation)
   ```

3. **Sandpack Artifacts** (complex dependencies):
   ```
   User Code → CodeSandbox Runtime (handles transpilation) → iframe Render
   (variable, depends on CodeSandbox API)
   ```

---

## Template Differences

The transpiler strategy determines how code is injected into the artifact iframe:

### Sucrase Template (Pre-transpiled)

**Template**: `<script type="module">` with pre-transpiled ES modules

```html
<!DOCTYPE html>
<html>
<head>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    // Code ALREADY transpiled to React.createElement() calls
    const App = () => React.createElement("div", { className: "counter" },
      React.createElement("h1", null, "Count: ", count),
      React.createElement("button", { onClick: () => setCount(count + 1) }, "+")
    );

    ReactDOM.createRoot(document.getElementById('root'))
      .render(React.createElement(App));
  </script>
</body>
</html>
```

**Advantages**:
- ✅ No runtime transpilation overhead
- ✅ No Babel CDN dependency (~700KB saved)
- ✅ Works offline (code pre-processed)
- ✅ Instant rendering (2-10ms transpile → render)

### Historical: Babel Template (Removed)

> **Note**: Babel Standalone fallback was removed in December 2025 (PR #410). The system now uses Sucrase-only transpilation with "Ask AI to Fix" error recovery.

**Why Removed?**
- 700KB CDN download overhead eliminated
- 150-500ms runtime transpilation removed
- Simpler codebase with single transpiler path
- AI-assisted error fixing provides better UX than silent fallback

---

## Browser Compatibility

**Target Browsers** (ES6+ module support required):

| Browser | Minimum Version | ES Module Support | Notes |
|---------|----------------|-------------------|-------|
| **Chrome** | 61+ | ✅ Full | Recommended |
| **Firefox** | 60+ | ✅ Full | Recommended |
| **Safari** | 10.1+ | ✅ Full | Works well |
| **Edge** | 16+ | ✅ Full | Chromium-based |

**Why Modern Browsers Only?**
Sucrase's `disableESTransforms: true` keeps modern syntax intact (arrow functions, destructuring, async/await, etc.). This avoids Babel's bloat from ES5 downleveling, but requires browsers with native ES6+ support.

**Legacy Browser Support**:
Not a priority since Vana targets modern browsers. If legacy support is needed, Babel fallback can be forced via feature flag (at the cost of 600KB+ bundle increase).

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| **"Unexpected token" error** | Unsupported syntax (decorators, namespaces) | Click "Ask AI to Fix" or manually remove legacy syntax |
| **Blank artifact screen** | Transpilation failed | Check browser console for Sucrase errors, click "Ask AI to Fix" |
| **"Ask AI to Fix" button appears** | Syntax error detected by Sucrase | Click button for AI-assisted fixing or manually fix reported line/column |
| **Error toast with line/column** | Sucrase parse failure | Review code at specified location, common issues: namespaces, decorators |
| **"Library load failure"** | Sucrase import failed (rare) | Hard refresh browser, check network tab |

### Debug Steps

1. **Open Browser Console**:
   - Look for `[sucraseTranspiler]` log messages
   - Success: `Transpilation successful in 3.2ms (1024 chars)`
   - Failure: `Transpilation failed after 2.1ms: Unexpected token 'namespace'`

2. **Check Sentry Dashboard**:
   - Filter by tag `component:sucraseTranspiler`
   - Review breadcrumbs for transpilation history
   - Check error frequency and patterns

3. **Test Sucrase Availability**:
   ```typescript
   import { isSucraseAvailable } from '@/utils/sucraseTranspiler';
   console.log('Sucrase available:', isSucraseAvailable());
   ```

4. **Run Benchmark**:
   ```bash
   npx tsx scripts/benchmark-transpilers.ts
   ```
   Verify transpilation times match expected performance.

### Performance Regression Detection

**Expected Times**:
- Small artifacts (<100 lines): 2-5ms
- Medium artifacts (100-300 lines): 5-8ms
- Large artifacts (300-600 lines): 8-12ms

**If Times Exceed 20ms**:
1. Check for extremely large artifact code (>1000 lines)
2. Verify Sucrase transpilation succeeded (check console logs)
3. Profile with Chrome DevTools Performance tab
4. Report issue with benchmark results

---

## Related Files

### Core Implementation
- **`src/utils/sucraseTranspiler.ts`** (147 lines) — Client-side transpiler wrapper
- **`src/components/ArtifactRenderer.tsx`** (lines 204-294) — Rendering engine with dual template system
- **`supabase/functions/_shared/artifact-validator.ts`** (962 lines) — Server-side validation with Sucrase integration

### Testing & Validation
- **`scripts/benchmark-transpilers.ts`** (660 lines) — Performance validation suite
- **`src/utils/__tests__/sucraseTranspiler.test.ts`** (698 tests) — Unit tests for transpiler
- **`src/components/__tests__/ArtifactRenderer.sucrase.test.tsx`** (938 tests) — Integration tests

### Configuration & Rules
- **`supabase/functions/_shared/artifact-rules/core-restrictions.ts`** — Syntax validation rules (includes Sucrase restrictions)
- **`docs/ERROR_CODES.md`** — Structured error code reference

### Migration History
- **PR #410** — Complete Sucrase migration (Phases 1-4, December 2025)
- **Commit d864d8d** — Merged Sucrase migration to main
- **December 2025** — Babel Standalone fallback removed, Sucrase-only with "Ask AI to Fix" error recovery
- **4,510 lines added** (including comprehensive test coverage)
- **-1,210 lines removed** (deprecated Babel-only code)

---

**For more information**:
- [Sucrase Documentation](https://github.com/alangpierce/sucrase)
- [Artifact System Overview](./.claude/ARTIFACT_SYSTEM.md)
- [Error Codes Reference](./ERROR_CODES.md)
- [Performance Optimization Guide](./.claude/BUILD_AND_DEPLOYMENT.md)
