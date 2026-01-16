# Phase 1.3 Step 2: Troubleshooting Guide

**Problem-Solution Reference for Server-Side Transformation Testing**

---

## Quick Diagnosis

**Use this flowchart to identify issues:**

1. **Artifact won't generate?** → See [Deployment Issues](#deployment-issues)
2. **Blank screen/white screen?** → See [Rendering Issues](#rendering-issues)
3. **Console shows errors?** → See [Error Reference](#error-reference)
4. **Library not defined?** → See [Library Injection Issues](#library-injection-issues)
5. **Performance not improved?** → See [Performance Issues](#performance-issues)
6. **Syntax errors?** → See [Syntax Issues](#syntax-issues)

---

## Deployment Issues

### Problem: Function deployment fails

**Symptoms:**
- `./scripts/deploy-simple.sh prod` exits with error
- "Deployment failed" message
- Function not updated in Supabase dashboard

**Diagnosis:**
```bash
# Check TypeScript compilation
cd supabase/functions/bundle-artifact
deno check index.ts

# Check for syntax errors
grep -n "ensureLibraryInjection\|normalizeExports\|fixDualReactInstance\|unescapeTemplateLiterals" index.ts
```

**Solutions:**

1. **TypeScript errors:**
   ```bash
   # Fix compilation errors in index.ts
   # Run checks again
   deno check index.ts
   ```

2. **Authentication issues:**
   ```bash
   # Re-login to Supabase
   supabase login
   # Link project
   supabase link --project-ref vznhbocnuykdmjvujaka
   ```

3. **Network/timeout:**
   ```bash
   # Retry deployment with verbose logging
   SUPABASE_LOGGING=true ./scripts/deploy-simple.sh prod
   ```

**Verification:**
```bash
# Check function is live
curl -I https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/bundle-artifact
# Should return 200 or 405 (method not allowed is OK)
```

---

## Rendering Issues

### Problem: Artifact shows blank screen

**Symptoms:**
- White/blank iframe
- No errors in console
- Infinite loading spinner

**Diagnosis:**
```javascript
// Open iframe in new tab
// Right-click iframe → "This Frame" → "Open Frame in New Tab"
// Check console in new tab for errors
```

**Common Causes:**

1. **HTML malformed:**
   - View page source in new tab
   - Check for unclosed tags
   - Validate HTML structure

2. **Scripts blocked by CSP:**
   - Console shows "Refused to load script"
   - Check CSP meta tag in HTML
   - Verify `script-src` includes necessary origins

3. **Module script errors:**
   - Look for red errors in console
   - Check module script syntax
   - Verify import map is valid JSON

**Solutions:**

**Malformed HTML:**
```bash
# Check transformation functions don't break HTML structure
# Review bundle-artifact/index.ts lines 290-444
grep -A 5 "replace(" supabase/functions/bundle-artifact/index.ts
```

**CSP too restrictive:**
- Check if `data:` is in `script-src` (needed for import maps)
- Verify CDN origins are whitelisted
- Check `fixDualReactInstance()` updates CSP correctly

**Module errors:**
- Check import syntax is valid
- Verify all imports have quotes
- Check template literals are unescaped

---

## Error Reference

### "PropTypes is not defined"

**Category:** Library Injection (PropTypes)

**Cause:** PropTypes script not injected or loaded after Recharts

**Diagnosis:**
```javascript
// In console (iframe context)
window.PropTypes  // Should return object, not undefined

// In Elements tab, search for:
"prop-types"  // Should find script tag
```

**Solutions:**

1. **Script not injected:**
   ```typescript
   // Check ensureLibraryInjection() detects Recharts
   // Regex: /recharts|PropTypes/i
   // Should match "recharts" in import or code
   ```

2. **Script order wrong:**
   - PropTypes must load BEFORE Recharts
   - Check script injection happens after ReactDOM
   - Verify script placement in HTML

3. **CDN blocked:**
   - Check Network tab for failed `unpkg.com` request
   - Try loading `https://unpkg.com/prop-types@15.8.1/prop-types.min.js` directly
   - If blocked, CDN issue (not transformation issue)

**Workaround:**
Add PropTypes script manually to test if transformation issue or CDN issue:
```html
<!-- Add before Recharts script -->
<script crossorigin src="https://unpkg.com/prop-types@15.8.1/prop-types.min.js"></script>
<script>window.PropTypes = PropTypes;</script>
```

---

### "motion is not defined"

**Category:** Library Injection (Framer Motion)

**Cause:** Framer Motion script not injected

**Diagnosis:**
```javascript
// In console (iframe context)
window.motion  // Should return object, not undefined
```

**Solutions:**

1. **Detection regex failed:**
   ```typescript
   // Check code contains "motion" or "Motion"
   // Regex: /\bmotion\b|\bMotion\b/
   // Must be word boundary (not "emotion" or "promotion")
   ```

2. **Script not loaded:**
   - Check Network tab for `esm.sh/framer-motion` request
   - Verify script tag in HTML
   - Check for CSP blocking esm.sh

**Workaround:**
```html
<script src="https://esm.sh/framer-motion@10.18.0/dist/framer-motion.js"></script>
```

---

### "LucideIcons is not defined" or "User is not defined"

**Category:** Library Injection (Lucide Icons)

**Cause:** Lucide scripts not injected or aliasing script failed

**Diagnosis:**
```javascript
// In console (iframe context)
window.LucideIcons  // Should return large object
window.User         // Should return function/component
```

**Solutions:**

1. **UMD script missing:**
   - Search HTML for `lucide-react`
   - Should find 2 script tags (UMD + aliasing)
   - Check Network tab for failed loads

2. **Aliasing script failed:**
   ```javascript
   // Check aliasing script executed
   // Should see this in HTML:
   Object.entries(lucideReact).forEach(([name, icon]) => {
     if (typeof window[name] === "undefined") window[name] = icon;
   });
   ```

3. **lucideReact undefined:**
   - UMD script didn't set global `lucideReact`
   - Check UMD URL is correct
   - Verify version `0.556.0` works

**Workaround:**
```html
<script src="https://esm.sh/lucide-react@0.556.0/dist/umd/lucide-react.js"></script>
<script>
  if (typeof lucideReact !== "undefined") {
    Object.entries(lucideReact).forEach(([name, icon]) => {
      if (typeof window[name] === "undefined") window[name] = icon;
    });
    window.LucideIcons = lucideReact;
  }
</script>
```

---

### "confetti is not defined"

**Category:** Library Injection (Canvas Confetti)

**Cause:** canvas-confetti script not injected

**Diagnosis:**
```javascript
// In console (iframe context)
typeof confetti  // Should return "function"
```

**Solutions:**

1. **Detection failed:**
   ```typescript
   // Check code contains "confetti" (case-insensitive)
   // Regex: /confetti/i
   ```

2. **Script not loaded:**
   - Check Network tab for `canvas-confetti` request
   - Verify script tag in HTML

**Workaround:**
```html
<script src="https://esm.sh/canvas-confetti@1.9.3/dist/confetti.browser.js"></script>
```

---

### "Unexpected token" or "Invalid or unexpected token"

**Category:** Syntax Issues (Import or Template Literals)

**Cause:** Invalid import syntax or escaped template literals

**Diagnosis:**
- Look at specific line number in error message
- Find that line in Elements tab → `<script type="module">`
- Check for `const * as` (invalid) or `\`` (escaped backtick)

**Solutions:**

**Invalid import syntax:**
```typescript
// Check normalizeExports() function
// Should replace: const * as X from 'pkg' → import * as X from 'pkg'
// Should replace: from React; → from 'react';
```

**Escaped template literals:**
```typescript
// Check unescapeTemplateLiterals() function
// Should replace: \` → `
// Should replace: \$ → $
```

**Verification:**
```bash
# Check transformations are applied
grep -A 10 "normalizeExports\|unescapeTemplateLiterals" supabase/functions/bundle-artifact/index.ts
```

**Manual Test:**
```javascript
// Test regex replacements
const testHtml = 'const * as Icons from "lucide";';
const fixed = testHtml.replace(/const\s*\*\s*as\s+(\w+)\s+from\s+(['"][^'"]+['"])/g, 'import * as $1 from $2');
console.log(fixed); // Should be: import * as Icons from "lucide";
```

---

### "Invalid hook call" or "Cannot read properties of null (reading 'useRef')"

**Category:** Dual React Instance

**Cause:** npm package bundled its own React, conflicting with global React

**Diagnosis:**
```javascript
// Check for multiple React instances
// In console (iframe context)
window.React  // Should be defined
window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED  // Should exist

// In HTML, search for:
"?external=react,react-dom"  // esm.sh URLs should have this
"data:text/javascript,export default window.React"  // Import map should have this
```

**Solutions:**

1. **esm.sh URLs not transformed:**
   ```typescript
   // Check fixDualReactInstance() runs
   // Should replace: ?deps=react@x.x.x,react-dom@x.x.x
   // With: ?external=react,react-dom
   ```

2. **Import map missing:**
   - Search HTML for `<script type="importmap">`
   - Should contain React/ReactDOM redirects to window globals
   - Verify import map is valid JSON

3. **CSP blocks data: URLs:**
   - Search HTML for `Content-Security-Policy`
   - Verify `script-src` includes `data:`
   - Check `fixDualReactInstance()` updates CSP

**Verification:**
```bash
# Check all esm.sh URLs use ?external=
grep -o 'https://esm.sh/[^"]*' [HTML_FILE] | grep -v "external=react"
# Should return empty (all URLs have external param)
```

**Workaround:**
Manually add import map before module scripts:
```html
<script type="importmap">
{
  "imports": {
    "react": "data:text/javascript,export default window.React",
    "react-dom": "data:text/javascript,export default window.ReactDOM",
    "react/jsx-runtime": "data:text/javascript,export const jsx=window.React.createElement;export const jsxs=window.React.createElement;export const Fragment=window.React.Fragment"
  }
}
</script>
```

---

## Library Injection Issues

### Problem: Script injected but library undefined

**Symptoms:**
- Script tag found in HTML
- Network tab shows 200 OK for script
- `window.X` still undefined

**Diagnosis:**
```javascript
// Check script execution order
// In console, check loading order
performance.getEntriesByType('resource')
  .filter(e => e.name.includes('.js'))
  .map(e => ({ name: e.name, duration: e.duration }))
```

**Common Causes:**

1. **Script loaded after usage:**
   - Library script loads asynchronously
   - Component tries to use library before loaded
   - Need `defer` or proper ordering

2. **Global not set:**
   - UMD script loaded but didn't set `window.X`
   - Check if library exports to global scope
   - May need manual aliasing

3. **CSP blocked script:**
   - Script tag exists but CSP prevented execution
   - Check console for "Refused to execute script"

**Solutions:**

1. **Add loading check:**
   ```javascript
   // In component, check if library loaded
   if (typeof LibraryName === 'undefined') {
     console.error('Library not loaded yet');
   }
   ```

2. **Manual global assignment:**
   ```html
   <script>
   if (typeof lucideReact !== "undefined" && typeof window.User === "undefined") {
     // Manually alias icons to window
     Object.entries(lucideReact).forEach(([name, icon]) => {
       window[name] = icon;
     });
   }
   </script>
   ```

---

## Performance Issues

### Problem: No performance improvement measured

**Symptoms:**
- Tests pass but performance profile shows no difference
- Client-side processing still visible
- 50-100ms improvement not seen

**Diagnosis:**
```javascript
// Check if transformations actually applied
// View HTML source, search for:
// 1. Library scripts (should be present)
// 2. Import syntax (should be valid)
// 3. Import map (should have React redirects)
// 4. Template literals (should be unescaped)

// If all present, transformations ARE working
// Performance may be measured incorrectly
```

**Common Causes:**

1. **Baseline comparison incorrect:**
   - No "before" measurement to compare against
   - Network latency dominates timing
   - CPU throttling not applied (differences too small)

2. **Cache hits:**
   - Testing same artifact repeatedly
   - Bundle served from cache (already pre-patched)
   - Not generating NEW bundles

3. **Client code still present:**
   - Step 3 not done yet (client code removal)
   - Client transformations still run (but as no-ops)
   - Profile shows functions but they do nothing

**Solutions:**

1. **Proper performance measurement:**
   ```
   - Clear cache before each test
   - Use CPU throttling (4x slowdown)
   - Generate DIFFERENT artifacts each time
   - Compare total bundle load time, not just transformations
   ```

2. **Check for absence of client work:**
   - Profile should NOT show HTML string manipulation
   - No heavy regex operations in iframe
   - Module script parses immediately without pre-processing

3. **Accept that improvement is there:**
   - If transformations work (tests pass)
   - And HTML is pre-patched (verified in source)
   - Then optimization is successful
   - 50-100ms may not be visible if network-bound

**Expected Flame Graph:**
- **Before (client-side):** Load HTML → Parse → **Transform HTML** → Parse Module → Render
- **After (server-side):** Load HTML (pre-patched) → Parse → Parse Module → Render

The "Transform HTML" step should be ABSENT.

---

## Syntax Issues

### Problem: Module script fails to parse

**Symptoms:**
- "Failed to load module script" error
- Syntax error with line number
- Component doesn't render

**Diagnosis:**
```javascript
// Find the exact error
// Console will show line number and specific issue

// Common patterns:
// - "Unexpected token '*'" → Import syntax issue
// - "Unexpected token '`'" → Template literal escaping
// - "Unexpected identifier" → Unquoted import
```

**Solutions:**

**Import syntax:**
```typescript
// normalizeExports() should fix these:
const * as Icons from 'lucide';  // INVALID
import * as Icons from 'lucide'; // VALID

from React;      // INVALID
from 'react';    // VALID
```

**Template literals:**
```typescript
// unescapeTemplateLiterals() should fix these:
const msg = \`Hello \${name}\`;  // INVALID (escaped)
const msg = `Hello ${name}`;     // VALID (unescaped)
```

**Manual Fix:**
```bash
# If transformations not working, check they're called
grep -A 5 "finalHtml = " supabase/functions/bundle-artifact/index.ts | grep -E "ensureLibrary|normalize|fixDual|unescape"

# Should show all 4 transformations applied to finalHtml
```

---

## Network Issues

### Problem: CDN resources fail to load

**Symptoms:**
- Script tags present but Network tab shows failed requests
- 404 or timeout errors for esm.sh/unpkg.com
- Libraries undefined despite injection

**Diagnosis:**
```javascript
// Check Network tab in DevTools
// Filter by "JS" or search for library names
// Look for red (failed) requests

// Common failures:
// - unpkg.com (PropTypes)
// - esm.sh (Framer Motion, Lucide, Confetti)
```

**Solutions:**

1. **CDN down/blocked:**
   ```bash
   # Test CDN directly
   curl -I https://unpkg.com/prop-types@15.8.1/prop-types.min.js
   curl -I https://esm.sh/framer-motion@10.18.0/dist/framer-motion.js

   # Should return 200 OK
   ```

2. **Network firewall:**
   - Corporate firewall blocking CDNs
   - Try from different network
   - Use mobile hotspot to test

3. **Version not found:**
   - Specific version no longer on CDN
   - Try latest version or different version
   - Update version in `ensureLibraryInjection()`

**Workaround:**
Use alternative CDN:
```typescript
// In ensureLibraryInjection(), replace URLs:
// unpkg.com → cdn.jsdelivr.net
// esm.sh → cdn.skypack.dev
```

---

## Rollback Scenarios

### When to rollback?

**Immediate rollback required if:**
- ❌ Multiple test categories fail (3+)
- ❌ Critical errors prevent ANY artifact from rendering
- ❌ Data corruption or security issues
- ❌ Production site completely broken

**Investigation before rollback if:**
- ⚠️ 1-2 test categories fail (may be isolated issues)
- ⚠️ Specific library injection fails (may be CDN issue)
- ⚠️ Performance not improved (may be measurement issue)
- ⚠️ Intermittent failures (may be network/cache issue)

### Rollback Procedure

```bash
# 1. Find Step 1 commit
git log --oneline -20 | grep "Phase 1.3 Step 1"
# Example output: 4d8958f feat: add server-side HTML transformations

# 2. Revert commit
git revert 4d8958f

# 3. Push revert
git push origin main

# 4. Redeploy function
./scripts/deploy-simple.sh prod

# 5. Verify rollback
# Generate test artifact, should use old client-side code
```

**Verification after rollback:**
```javascript
// Check client-side code still present
// In src/components/ArtifactRenderer.tsx
// Lines 172-481 should still exist
grep -n "applyBundleTransformations" src/components/ArtifactRenderer.tsx
# Should return line numbers (function exists)
```

**Time to rollback:** 3-5 minutes

---

## Debug Checklist

Use this checklist to systematically debug any issue:

- [ ] 1. Clear browser cache and hard reload (Ctrl+Shift+R)
- [ ] 2. Check console for errors (note exact message)
- [ ] 3. Inspect HTML source in Elements tab
- [ ] 4. Check Network tab for failed requests
- [ ] 5. Verify global variables in console (iframe context)
- [ ] 6. Test in incognito mode (eliminate extensions)
- [ ] 7. Test in different browser (Safari/Firefox)
- [ ] 8. Check Supabase function logs for errors
- [ ] 9. Verify transformations applied in HTML
- [ ] 10. Compare with expected HTML structure

---

## Getting Help

If none of these solutions work:

1. **Document the issue:**
   - Exact error message
   - Reproduction steps
   - Browser/OS versions
   - Screenshots of console/network/elements

2. **Check recent changes:**
   ```bash
   git log --oneline -10
   git diff HEAD~1 supabase/functions/bundle-artifact/index.ts
   ```

3. **Test locally:**
   ```bash
   supabase start
   # Test against local Edge Function
   # Faster iteration for debugging
   ```

4. **Review implementation:**
   - Read transformation functions: lines 290-444
   - Check integration point: lines 658-667
   - Verify regex patterns match expected input

---

## Known Limitations

**Not bugs, expected behavior:**

1. **Old cached bundles:** Still use client-side code (will expire in 4 weeks)
2. **Library version changes:** Hard-coded versions may become outdated
3. **Regex edge cases:** Some unusual syntax may not be caught
4. **CSP complexity:** Import map shims require `data:` URLs (security trade-off)

---

## Contact

**Documentation:**
- Full testing guide: `docs/PHASE_1_3_TEST_EXECUTION_CHECKLIST.md`
- Implementation: `supabase/functions/bundle-artifact/index.ts`
- Progress tracking: `.phase1.3-progress.md`

**Last Updated:** 2026-01-16
