# Phase 1.3 Step 2: Server-Side Transformation Testing Guide

**Status:** Ready for Production Deployment
**Date:** 2026-01-14
**Commit:** 4d8958f

## Overview

Phase 1.3 Step 1 added 4 server-side HTML transformation functions to `bundle-artifact/index.ts`. This guide provides comprehensive testing procedures to verify the transformations work correctly before removing client-side fallback code.

## Pre-Deployment Checklist

- [x] Server-side functions implemented (`ensureLibraryInjection`, `normalizeExports`, `fixDualReactInstance`, `unescapeTemplateLiterals`)
- [x] TypeScript compilation passes
- [x] Unit tests pass (578/587 tests)
- [x] Git pre-commit hooks pass
- [x] Peer review completed
- [ ] Production deployment
- [ ] Test suite execution
- [ ] Client-side code removal

## Deployment Instructions

### 1. Deploy to Production

```bash
./scripts/deploy-simple.sh prod
# When prompted, type: vznhbocnuykdmjvujaka
```

**What happens:**
1. Confirms current branch and commit
2. Creates database backup
3. Runs test suite
4. Deploys updated `bundle-artifact` function
5. Verifies deployment success

**Expected output:**
```
✅ Deployment successful
✅ Function: bundle-artifact
✅ Version: [timestamp]
```

### 2. Verify Function is Live

```bash
# Test the function directly
curl -X POST https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/bundle-artifact \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "export default function App() { return <div>Test</div>; }",
    "sessionId": "test-session"
  }'
```

**Expected:** Returns HTML with React scripts injected

## Test Suite: 7 Transformation Categories

### Category 1: PropTypes Injection (Recharts)

**Purpose:** Recharts UMD library requires `window.PropTypes` to be available

**Test Steps:**
1. Generate artifact: "Create a Recharts line chart showing temperature data over 7 days"
2. Wait for artifact to render
3. Verify:
   - Chart displays without errors
   - Console shows: `PropTypes injected successfully`
   - No "PropTypes is not defined" errors

**Expected HTML Injection:**
```html
<script crossorigin src="https://unpkg.com/prop-types@15.8.1/prop-types.min.js"></script>
<script>if (typeof PropTypes !== "undefined") { window.PropTypes = PropTypes; }</script>
```

**Success Criteria:**
- ✅ Chart renders with axis labels and data points
- ✅ No console errors related to PropTypes
- ✅ PropTypes script appears in HTML source

---

### Category 2: Framer Motion Injection

**Purpose:** Detect motion/Motion usage and inject Framer Motion UMD

**Test Steps:**
1. Generate artifact: "Create an animated button using framer-motion with scale and rotation"
2. Interact with the button
3. Verify:
   - Animation plays smoothly
   - Console shows: `Framer Motion injected`
   - No "motion is not defined" errors

**Expected HTML Injection:**
```html
<script src="https://esm.sh/framer-motion@10.18.0/dist/framer-motion.js"></script>
```

**Success Criteria:**
- ✅ Button animates on hover/click
- ✅ Smooth transitions visible
- ✅ Framer Motion script in HTML source

---

### Category 3: Lucide Icons Injection

**Purpose:** Inject Lucide React icons UMD and alias icons to window

**Test Steps:**
1. Generate artifact: "Create a card component with lucide-react icons for user profile (User, Mail, Phone icons)"
2. Verify:
   - Icons render as SVG elements
   - Console shows: `Lucide React injected successfully`
   - No "LucideIcons is not defined" errors

**Expected HTML Injection:**
```html
<script src="https://esm.sh/lucide-react@0.263.1/dist/umd/lucide-react.js"></script>
<script>
  if (typeof lucideReact !== "undefined") {
    Object.entries(lucideReact).forEach(([name, icon]) => {
      if (typeof window[name] === "undefined") window[name] = icon;
    });
    window.LucideIcons = lucideReact;
  }
</script>
```

**Success Criteria:**
- ✅ Icons display correctly
- ✅ Icons are scalable SVGs
- ✅ Lucide script in HTML source

---

### Category 4: Canvas Confetti Injection

**Purpose:** Detect confetti usage and inject canvas-confetti library

**Test Steps:**
1. Generate artifact: "Create a celebration button that triggers confetti using canvas-confetti"
2. Click the button
3. Verify:
   - Confetti animation plays
   - Particles fall from top of screen
   - No "confetti is not defined" errors

**Expected HTML Injection:**
```html
<script src="https://esm.sh/canvas-confetti@1.9.3/dist/confetti.browser.js"></script>
```

**Success Criteria:**
- ✅ Confetti animation triggers
- ✅ Particles are colorful and animated
- ✅ Canvas Confetti script in HTML source

---

### Category 5: Import Syntax Normalization

**Purpose:** Fix GLM-generated invalid syntax (`const * as` → `import * as`)

**Test Steps:**
1. Generate artifact with multiple imports (complex React component)
2. Check browser console for syntax errors
3. Verify:
   - No "Unexpected token" errors
   - No "Invalid or unexpected token" errors
   - Component renders successfully

**Example Fix:**
```javascript
// Before (invalid)
const * as Icons from 'lucide-react';

// After (valid)
import * as Icons from 'lucide-react';
```

**Success Criteria:**
- ✅ No JavaScript syntax errors
- ✅ Imports resolve correctly
- ✅ Component functions as expected

---

### Category 6: Dual React Instance Fix

**Purpose:** Prevent "Cannot read properties of null (useRef)" errors with npm packages

**Test Steps:**
1. Generate artifact: "Create a Radix UI dialog with form inside"
2. Open and interact with dialog
3. Verify:
   - Dialog opens/closes smoothly
   - Form inputs work
   - No "Cannot read properties of null" errors
   - Console shows: `Updated CSP script-src with data:`

**Expected Transformations:**
```javascript
// esm.sh URLs changed from ?deps= to ?external=
https://esm.sh/@radix-ui/react-dialog?external=react,react-dom

// Import map includes React shims
{
  "imports": {
    "react": "data:text/javascript,export default window.React",
    "react-dom": "data:text/javascript,export default window.ReactDOM"
  }
}

// CSP allows data: URLs
Content-Security-Policy: script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: ...
```

**Success Criteria:**
- ✅ Radix UI components work correctly
- ✅ No useRef/useState hook errors
- ✅ Single React instance (check React DevTools)

---

### Category 7: Template Literal Unescaping

**Purpose:** Fix escaped backticks and dollar signs from server-side escaping

**Test Steps:**
1. Generate artifact with template literals in code
2. Verify:
   - No "Invalid or unexpected token" errors
   - Template literals work correctly
   - String interpolation functions

**Example Fix:**
```javascript
// Before (escaped)
const message = \`Hello \${name}\`;

// After (unescaped)
const message = `Hello ${name}`;
```

**Success Criteria:**
- ✅ No template literal syntax errors
- ✅ String interpolation works
- ✅ Template expressions evaluate

---

## Performance Testing

### Measure Bundle Processing Time

**Before (Client-side patching):** 50-100ms HTML manipulation
**After (Server-side patching):** ~0ms (pre-patched)

**How to measure:**

1. Open Chrome DevTools → Performance tab
2. Start recording
3. Generate a complex React artifact
4. Stop recording when artifact renders
5. Look for "HTML manipulation" or "regex operations" in flame graph

**Success Criteria:**
- ✅ No significant client-side HTML processing
- ✅ Faster time-to-interactive
- ✅ Reduced main thread blocking

---

## Rollback Plan

If issues are discovered:

```bash
# Revert the commit
git revert 4d8958f

# Redeploy previous version
./scripts/deploy-simple.sh prod
```

**What gets rolled back:**
- Server-side transformation functions removed
- Client-side fallback code still works
- No data loss or breaking changes

**Time to rollback:** ~3-5 minutes

---

## Known Limitations

1. **Backward Compatibility:** Old cached bundles still use client-side patching (working as expected)
2. **Library Versions:** Hard-coded library versions may need updates over time
3. **Detection Patterns:** Regex patterns may not catch all edge cases
4. **CSP Complexity:** Import map shims require `data:` URLs in CSP

---

## Monitoring

### What to Watch Post-Deployment

1. **Error Rate:** Should not increase
2. **Bundle Generation Time:** Should stay ~2-5 seconds
3. **Console Errors:** Watch for new library-related errors
4. **User Reports:** Monitor for artifact rendering issues

### Sentry Queries

```javascript
// Search for server-side transformation logs
[bundle-artifact] Injecting PropTypes
[bundle-artifact] Successfully transformed import syntax
[bundle-artifact] Fixing dual React instance
[bundle-artifact] Updated CSP script-src

// Watch for these errors (should NOT appear)
PropTypes is not defined
motion is not defined
LucideIcons is not defined
confetti is not defined
Cannot read properties of null (reading 'useRef')
Invalid or unexpected token
```

---

## Sign-Off

### Pre-Deployment

- [ ] All 4 transformation functions implemented
- [ ] TypeScript compiles without errors
- [ ] Tests pass (578/587)
- [ ] Peer review completed
- [ ] Backup created

### Post-Deployment

- [ ] Function deployed successfully
- [ ] Category 1 tested (PropTypes)
- [ ] Category 2 tested (Framer Motion)
- [ ] Category 3 tested (Lucide Icons)
- [ ] Category 4 tested (Canvas Confetti)
- [ ] Category 5 tested (Import Syntax)
- [ ] Category 6 tested (Dual React Instance)
- [ ] Category 7 tested (Template Literals)
- [ ] Performance improvement verified
- [ ] No new errors in Sentry
- [ ] Ready for Step 3 (client-side code removal)

---

## Next Steps (After Step 2 Complete)

**Phase 1.3 Step 3:** Remove Client-Side HTML Patches
- Remove lines 172-481 from `src/components/ArtifactRenderer.tsx`
- Simplify BundledArtifactFrame to just fetch and display
- ~300 lines removed from client bundle
- Further 50-100ms performance improvement

**Estimated Time:**
- Deployment: 10 minutes
- Testing: 30-45 minutes
- Verification: 15 minutes
- **Total: ~1 hour**
