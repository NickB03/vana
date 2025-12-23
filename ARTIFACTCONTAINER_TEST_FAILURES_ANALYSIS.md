# ArtifactContainer Test Failures - Root Cause Analysis

**Date**: 2025-12-22
**Initial Status**: 15/35 tests failing
**Final Status**: ✅ ALL 35/35 TESTS PASSING

---

## Summary

The ArtifactContainer tests were failing due to **incomplete Sentry mock** in test setup, not rendering issues:

1. **Root Cause (FIXED)**: Missing `addBreadcrumb` export in `@sentry/react` mock (src/test/setup.ts)
2. **Secondary Issue (FIXED)**: `WebPreviewBody` component had hardcoded `title="Preview"` attribute
3. **Test Query Update (FIXED)**: Updated tests to use `data-testid="artifact-iframe"` for reliable queries

**Key Insight**: When components completely fail to render in tests, check for runtime errors in lifecycle hooks (useEffect, etc.) before investigating rendering logic. The "iframes not rendering" symptom was actually a test crash during component initialization.

---

## Root Cause #0: Incomplete Sentry Mock ✅ FIXED (THE ACTUAL BLOCKER)

**Location**: `src/test/setup.ts` lines 64-68
**Discovered**: After initial "fix" still showed failures

**Problem**: The `@sentry/react` mock was missing the `addBreadcrumb` export, causing runtime crashes when ArtifactRenderer tried to log events.

```typescript
// BEFORE (broken):
vi.mock('@sentry/react', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  init: vi.fn(),
  // ❌ Missing addBreadcrumb
}));

// AFTER (fixed):
vi.mock('@sentry/react', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),  // ✅ Added
  init: vi.fn(),
}));
```

**Impact**:
- `ArtifactRenderer.tsx:725` calls `Sentry.addBreadcrumb()` in a useEffect
- Missing export caused "No 'addBreadcrumb' export is defined" error
- Component crashed before any DOM rendering occurred
- Created misleading symptom: "iframes not rendering" when actually test setup was broken

**Fix Applied**: Added `addBreadcrumb: vi.fn()` to Sentry mock

**Result**: ✅ All 35/35 tests now pass

---

## Root Cause #1: Hardcoded Title Attribute ✅ FIXED

**Location**: `src/components/ai-elements/web-preview.tsx` lines 171-187

**Problem**: The `WebPreviewBody` component had `title="Preview"` hardcoded on line 185, which overrode any custom `title` prop passed from parent components.

```typescript
// BEFORE (broken):
export const WebPreviewBody = ({
  className,
  loading,
  src,
  ...props
}: WebPreviewBodyProps) => {
  return (
    <div className="flex-1 relative">
      <iframe
        title="Preview"  // ❌ Hardcoded, overrides props
        {...props}
      />
    </div>
  );
};

// AFTER (fixed):
export const WebPreviewBody = ({
  className,
  loading,
  src,
  title = "Preview",  // ✅ Prop with default value
  ...props
}: WebPreviewBodyProps) => {
  return (
    <div className="flex-1 relative">
      <iframe
        title={title}  // ✅ Uses prop value
        {...props}
      />
    </div>
  );
};
```

**Fix Applied**: Extract `title` from props with default value `"Preview"`, then pass it to iframe element.

**Impact**: This allows `ArtifactRenderer` to pass custom titles (e.g., `title={artifact.title}`) that will be respected by the iframe.

---

## ~~Root Cause #2: Test Environment Rendering Issue~~ ❌ RED HERRING

**Initial Theory**: Even after fixing the title attribute, iframes were still not rendering in the test environment.

**Evidence That Misled Investigation**:
```html
<!-- DOM shows header and toolbar, but no iframe -->
<div class="flex flex-col overflow-hidden rounded-lg border bg-background shadow-sm h-full" data-testid="artifact-container">
  <div class="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
    <!-- Header renders correctly -->
    <p class="font-medium text-foreground text-sm">HTML Test</p>
  </div>
  <!-- TabsContent and iframe are missing from output -->
</div>
```

**Why This Was Wrong**:
- The missing iframes were NOT due to TabsContent/Radix UI rendering issues
- The missing iframes were NOT due to WebPreview context problems
- The missing iframes were NOT due to error boundaries

**Actual Cause**: The Sentry mock was incomplete (missing `addBreadcrumb`), causing:
1. ArtifactRenderer useEffect to crash on line 725
2. Component initialization to fail before any DOM rendering
3. React Testing Library to show only partial DOM (header rendered before crash)

**Lesson Learned**: When tests show complete DOM absence for child components, check for:
1. Runtime errors in parent component lifecycle hooks (useEffect, useMemo, etc.)
2. Missing mock exports that are called during initialization
3. Console errors hidden by test mocks (our setup.ts mocks console.error)

---

## Test Results

### ✅ All 35/35 Tests Passing (Previously 15 failing)

**Fixed by**: Adding `addBreadcrumb` to Sentry mock + updating test queries

**Previously Failing Tests (now fixed)**:

**HTML Artifacts (2)**:
- ✅ renders HTML content in iframe
- ✅ applies sandbox attributes to iframe

**React Artifacts (2)**:
- ✅ renders React without Sandpack when no npm imports
- ✅ renders React with Sandpack when npm imports detected

**SVG Artifacts (1)**:
- ✅ renders SVG as image

**Image Artifacts (1)**:
- ✅ renders image artifact

**Validation (1)**:
- ✅ shows validation errors

**XSS Security Protection (6)**:
- ✅ applies sandbox attribute to HTML iframes
- ✅ sandboxes potentially malicious script tags in HTML
- ✅ prevents inline event handlers in HTML content
- ✅ blocks data exfiltration attempts in HTML
- ✅ prevents iframe navigation to external URLs
- ✅ blocks postMessage attacks from malicious iframes

**Theme Integration (1)**:
- ✅ refreshes iframe when theme changes

**Performance (1)**:
- ✅ renders large HTML artifacts efficiently

### Already Passing Tests (20 total):
- ✅ Basic rendering tests (title, buttons, tabs)
- ✅ Markdown artifacts
- ✅ Mermaid diagrams
- ✅ Code editing functionality
- ✅ Performance benchmarks (rapid updates, memory leaks)

---

## Architectural Changes Timeline

**2025-11-05** (commit `6e864dfa`):
- Installed `ai-elements` library with `WebPreview` components
- Replaced direct `<iframe>` elements with `<WebPreview>` + `<WebPreviewBody>` wrapper components
- Introduced hardcoded `title="Preview"` in `WebPreviewBody`

**Impact**:
- **Before**: Direct iframe rendering with explicit `title={artifact.title}`
- **After**: Iframe wrapped in WebPreview components with hardcoded title
- Tests that relied on finding iframes by title broke silently (not caught in CI)

---

## ✅ Solution Implemented

### Three-Part Fix

**1. Fix Sentry Mock (Root Cause)**
```typescript
// src/test/setup.ts
vi.mock('@sentry/react', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),  // ✅ Added this
  init: vi.fn(),
}));
```

**2. Fix WebPreviewBody Title Prop**
```typescript
// src/components/ai-elements/web-preview.tsx
export const WebPreviewBody = ({
  title = "Preview",  // ✅ Extract as prop
  // ...
}: WebPreviewBodyProps) => {
  return (
    <iframe
      data-testid="artifact-iframe"  // ✅ Added for tests
      title={title}  // ✅ Use prop instead of hardcoded
      {...props}
    />
  );
};
```

**3. Update Test Queries**
```typescript
// src/components/ArtifactContainer.test.tsx (10 tests updated)
// BEFORE:
const iframe = screen.getByTitle('HTML Test');

// AFTER:
const iframe = screen.getByTestId('artifact-iframe');
expect(iframe).toHaveAttribute('title', 'HTML Test');
```

---

## ✅ Completed Steps

1. ✅ **Identified root cause**: Incomplete Sentry mock missing `addBreadcrumb`
2. ✅ **Fixed Sentry mock**: Added missing export to `src/test/setup.ts`
3. ✅ **Fixed WebPreviewBody**: Made title prop configurable instead of hardcoded
4. ✅ **Updated test queries**: Changed 10 tests to use `data-testid` for reliability
5. ✅ **Verified fix**: All 35/35 tests passing (was 20/35 before)
6. ✅ **Documented findings**: Updated analysis with root cause and lessons learned

## Recommendations for Future

1. **CI/CD**: Run test suite in CI to catch failures before merge
2. **Mock Completeness**: When adding new Sentry/telemetry calls, update test mocks immediately
3. **Console Mocking**: Consider NOT mocking `console.error` in tests - would have revealed Sentry error earlier
4. **Test Debugging**: When components don't render in tests, check lifecycle hooks BEFORE investigating rendering logic

---

## Files Modified

- ✅ `src/test/setup.ts` (added `addBreadcrumb` to Sentry mock) - **Root cause fix**
- ✅ `src/components/ai-elements/web-preview.tsx` (fixed title attribute, added data-testid)
- ✅ `src/components/ArtifactContainer.test.tsx` (updated 10 test queries)
- 📋 `src/components/ArtifactRenderer.tsx` (no changes needed - uses WebPreviewBody correctly)

---

## ✅ Verification Checklist

- [x] All 15 failing tests now pass (35/35 total)
- [x] No regressions in previously passing tests (all 20 still pass)
- [x] Test queries use reliable `data-testid` selectors
- [x] WebPreviewBody respects custom title props
- [x] Iframes render with correct sandbox attributes
- [x] XSS protection tests pass (6 security tests)
- [x] Theme integration test passes
- [x] Performance tests pass (large artifacts, rapid updates)

---

## Related Issues

- AI Elements Integration: commit `6e864dfa` (2025-11-05)
- Pre-existing test failures were not caught because tests weren't run in CI
- Need to add test verification to pre-commit hooks or CI pipeline
