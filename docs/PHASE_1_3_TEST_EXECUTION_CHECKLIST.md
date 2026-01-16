# Phase 1.3 Step 2: Test Execution Checklist
**Manual Testing Guide for Server-Side HTML Transformations**

**Status:** Ready for Execution
**Date:** 2026-01-16
**Prerequisites:**
- ✅ Step 1 complete (server-side functions deployed)
- ✅ Production deployment complete
- [ ] Manual testing execution

---

## Quick Start

**Testing Environment:** Production (`https://chat.geminixai.app/`)

**Time Estimate:** 45-60 minutes

**Tools Needed:**
- Chrome Browser with DevTools
- Network tab for monitoring requests
- Console tab for checking globals and errors
- Elements tab for HTML inspection

**Testing Approach:**
1. Create new chat session
2. Generate artifact for each category
3. Verify server-side transformation applied
4. Check console for expected globals/logs
5. Document pass/fail with screenshots/evidence

---

## Test Categories Overview

| Category | Transformation | Verification Method | Time |
|----------|---------------|---------------------|------|
| 1. PropTypes | Inject PropTypes script for Recharts | Check `window.PropTypes` | 5 min |
| 2. Framer Motion | Inject Framer Motion UMD | Check animation + script | 5 min |
| 3. Lucide Icons | Inject Lucide + alias to window | Check icons render + `window.LucideIcons` | 5 min |
| 4. Canvas Confetti | Inject confetti library | Check animation + `window.confetti` | 5 min |
| 5. Import Syntax | Fix `const * as` → `import * as` | Check HTML source + no errors | 5 min |
| 6. Dual React | Fix esm.sh + import map | Check HTML + no hook errors | 10 min |
| 7. Template Literals | Unescape backticks/dollar signs | Check HTML source + no syntax errors | 5 min |

**Total:** ~40 minutes testing + 10 minutes documentation

---

## Category 1: PropTypes Injection (Recharts)

### What This Tests
**Transformation:** `ensureLibraryInjection()` detects Recharts usage and injects PropTypes library
**Location:** `bundle-artifact/index.ts` lines 301-334
**Why:** Recharts UMD library requires `window.PropTypes` to be available globally

### Test Prompt
```
Create a Recharts bar chart showing monthly sales data for 6 months.
Include axis labels, tooltips, and a legend. Use vibrant colors.
```

### Expected Server-Side Behavior
1. Detects `recharts` or `PropTypes` in code using regex: `/recharts|PropTypes/i`
2. Injects PropTypes script tags after ReactDOM script or before `</head>`:
   ```html
   <script crossorigin src="https://unpkg.com/prop-types@15.8.1/prop-types.min.js"></script>
   <script>if (typeof PropTypes !== "undefined") { window.PropTypes = PropTypes; }</script>
   ```
3. Bundles HTML and uploads to storage pre-patched

### Verification Steps

#### 1. Generate Artifact
- [ ] Paste prompt into chat
- [ ] Wait for artifact to render (~3-5 seconds)
- [ ] Chart should display immediately without errors

#### 2. Check Console (F12 → Console)
- [ ] No "PropTypes is not defined" errors
- [ ] No "Cannot read property 'object' of undefined" errors
- [ ] Chart renders with axes, tooltips, legend

#### 3. Inspect HTML Source (F12 → Elements → iframe)
- [ ] Right-click artifact iframe → Inspect
- [ ] Search for `prop-types` in HTML (Ctrl+F)
- [ ] Verify script tag exists:
   ```html
   <script crossorigin src="https://unpkg.com/prop-types@15.8.1/prop-types.min.js"></script>
   ```

#### 4. Check Global Variable (F12 → Console)
- [ ] Switch to iframe context (dropdown in console)
- [ ] Type: `window.PropTypes`
- [ ] Should return object with `{object: ƒ, array: ƒ, bool: ƒ, ...}`

### Pass Criteria
✅ **PASS** if:
- Chart renders without errors
- `window.PropTypes` is defined
- PropTypes script tag appears in HTML
- No console errors related to PropTypes

❌ **FAIL** if:
- "PropTypes is not defined" error
- Chart shows blank screen or error message
- Script tag missing from HTML
- `window.PropTypes` is undefined

### Troubleshooting
**Issue:** Chart blank but no errors
- Check Network tab for failed script loads
- Verify esm.sh CDN is accessible
- Check for CSP violations in console

**Issue:** PropTypes script present but undefined
- Verify script loaded before Recharts (order matters)
- Check browser console for script loading errors

---

## Category 2: Framer Motion Injection

### What This Tests
**Transformation:** `ensureLibraryInjection()` detects motion/Motion usage and injects Framer Motion UMD
**Location:** `bundle-artifact/index.ts` lines 307-310
**Why:** Framer Motion uses special `motion` components for animations

### Test Prompt
```
Create an animated card component using framer-motion. The card should
scale up on hover, rotate slightly on click, and have smooth transitions.
Add a colorful gradient background.
```

### Expected Server-Side Behavior
1. Detects `motion` or `Motion` in code using regex: `/\bmotion\b|\bMotion\b/`
2. Injects Framer Motion script after ReactDOM or before `</head>`:
   ```html
   <script src="https://esm.sh/framer-motion@10.18.0/dist/framer-motion.js"></script>
   ```
3. Makes `motion` globally available for use in code

### Verification Steps

#### 1. Generate Artifact
- [ ] Paste prompt into chat
- [ ] Wait for artifact to render
- [ ] Card should appear with gradient background

#### 2. Test Animation
- [ ] Hover over card → should scale up smoothly
- [ ] Click card → should rotate slightly
- [ ] Transitions should be smooth (no jank)

#### 3. Check Console
- [ ] No "motion is not defined" errors
- [ ] No "Cannot read property 'div' of undefined" errors
- [ ] No animation-related errors

#### 4. Inspect HTML Source
- [ ] Right-click iframe → Inspect → Elements
- [ ] Search for `framer-motion` (Ctrl+F)
- [ ] Verify script tag exists:
   ```html
   <script src="https://esm.sh/framer-motion@10.18.0/dist/framer-motion.js"></script>
   ```

#### 5. Check Global Variable
- [ ] Console → Switch to iframe context
- [ ] Type: `window.motion`
- [ ] Should return object with `{div: ƒ, span: ƒ, button: ƒ, ...}`

### Pass Criteria
✅ **PASS** if:
- Card animates smoothly on hover/click
- `window.motion` is defined
- Framer Motion script in HTML
- No console errors

❌ **FAIL** if:
- "motion is not defined" error
- No animations play
- Script tag missing
- `window.motion` undefined

### Troubleshooting
**Issue:** Animation jerky or laggy
- This is a performance issue, not a transformation issue
- Transformation still passes if motion works

**Issue:** motion defined but animations don't play
- Check for CSS conflicts (z-index, overflow)
- Verify GPU acceleration (may need `will-change: transform`)

---

## Category 3: Lucide Icons Injection

### What This Tests
**Transformation:** `ensureLibraryInjection()` detects lucide-react and injects UMD + aliases icons to window
**Location:** `bundle-artifact/index.ts` lines 311-314
**Why:** Lucide icons need to be globally available for components to import

### Test Prompt
```
Create a user profile card with lucide-react icons: User icon for avatar,
Mail icon for email, Phone icon for contact, MapPin for location.
Style it nicely with borders and spacing.
```

### Expected Server-Side Behavior
1. Detects `lucide-react` in code using regex: `/lucide-react/`
2. Injects Lucide UMD + aliasing script:
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
3. Makes individual icons available as `window.User`, `window.Mail`, etc.

### Verification Steps

#### 1. Generate Artifact
- [ ] Paste prompt into chat
- [ ] Wait for profile card to render
- [ ] Icons should display as SVG elements (not broken images)

#### 2. Visual Verification
- [ ] User icon appears (person silhouette)
- [ ] Mail icon appears (envelope)
- [ ] Phone icon appears (phone handset)
- [ ] MapPin icon appears (location pin)
- [ ] Icons are clean vector graphics (scalable)

#### 3. Check Console
- [ ] No "LucideIcons is not defined" errors
- [ ] No "User is not a valid component" errors
- [ ] No icon rendering errors

#### 4. Inspect HTML Source
- [ ] Right-click iframe → Inspect → Elements
- [ ] Search for `lucide-react` (Ctrl+F)
- [ ] Verify script tags exist (both UMD + aliasing)

#### 5. Check Global Variables
- [ ] Console → Switch to iframe context
- [ ] Type: `window.LucideIcons`
- [ ] Should return large object with hundreds of icon components
- [ ] Type: `window.User`
- [ ] Should return function/component for User icon
- [ ] Type: `window.Mail`
- [ ] Should return function/component for Mail icon

### Pass Criteria
✅ **PASS** if:
- All 4+ icons render as SVGs
- `window.LucideIcons` is defined
- Individual icons like `window.User` are defined
- Lucide scripts in HTML
- No console errors

❌ **FAIL** if:
- Icons show as broken images or missing
- "LucideIcons is not defined" error
- Script tags missing
- `window.LucideIcons` undefined

### Troubleshooting
**Issue:** Icons render but are tiny/huge
- This is a styling issue, transformation still passes

**Issue:** Only some icons render
- Check if all icons exist in Lucide library
- Verify icon names match exactly (case-sensitive)

---

## Category 4: Canvas Confetti Injection

### What This Tests
**Transformation:** `ensureLibraryInjection()` detects confetti usage and injects canvas-confetti library
**Location:** `bundle-artifact/index.ts` lines 315-318
**Why:** Canvas confetti creates celebratory particle animations

### Test Prompt
```
Create a celebration button that triggers colorful confetti when clicked.
Use canvas-confetti library. Make the button large and inviting with
a "Celebrate!" label.
```

### Expected Server-Side Behavior
1. Detects `confetti` in code using regex: `/confetti/i`
2. Injects canvas-confetti script:
   ```html
   <script src="https://esm.sh/canvas-confetti@1.9.3/dist/confetti.browser.js"></script>
   ```
3. Makes `confetti` function globally available

### Verification Steps

#### 1. Generate Artifact
- [ ] Paste prompt into chat
- [ ] Wait for button to render
- [ ] Button should display with "Celebrate!" label

#### 2. Test Animation
- [ ] Click the button
- [ ] Confetti particles should explode from center or top
- [ ] Particles should be colorful (multiple colors)
- [ ] Particles should fall with gravity
- [ ] Animation should last ~2-3 seconds

#### 3. Check Console
- [ ] No "confetti is not defined" errors
- [ ] No "Cannot read property 'create' of undefined" errors
- [ ] No canvas errors

#### 4. Inspect HTML Source
- [ ] Right-click iframe → Inspect → Elements
- [ ] Search for `canvas-confetti` (Ctrl+F)
- [ ] Verify script tag exists:
   ```html
   <script src="https://esm.sh/canvas-confetti@1.9.3/dist/confetti.browser.js"></script>
   ```

#### 5. Check Global Variable
- [ ] Console → Switch to iframe context
- [ ] Type: `window.confetti`
- [ ] Should return function
- [ ] Type: `typeof confetti`
- [ ] Should return `"function"`

#### 6. Manual Trigger (Optional)
- [ ] In console (iframe context), type: `confetti()`
- [ ] Should trigger confetti animation immediately

### Pass Criteria
✅ **PASS** if:
- Confetti animation triggers on button click
- Particles are colorful and animated
- `window.confetti` is defined as function
- Canvas Confetti script in HTML
- No console errors

❌ **FAIL** if:
- "confetti is not defined" error
- Button click has no effect
- Script tag missing
- `window.confetti` undefined

### Troubleshooting
**Issue:** Confetti triggers but all white/single color
- This is a configuration issue, transformation still passes
- Confetti library loaded correctly

**Issue:** Confetti appears then disappears instantly
- Check for z-index issues with canvas
- Verify canvas element exists in DOM

---

## Category 5: Import Syntax Normalization

### What This Tests
**Transformation:** `normalizeExports()` fixes invalid import syntax that GLM sometimes generates
**Location:** `bundle-artifact/index.ts` lines 336-359
**Why:** GLM models occasionally generate `const * as X from 'pkg'` (invalid) instead of `import * as X from 'pkg'` (valid)

### Test Prompt
```
Create a complex dashboard with multiple components importing from
different packages. Use react hooks, lucide-react icons, and recharts
for data visualization. Make it interactive with tabs.
```

**Note:** This test relies on AI generating complex code that might trigger the invalid syntax. If artifact works without syntax errors, transformation is working.

### Expected Server-Side Behavior
1. Searches HTML for invalid patterns:
   - `const * as X from 'package'` → `import * as X from 'package'`
   - `from React;` → `from 'react';`
   - `from ReactDOM;` → `from 'react-dom';`
2. Replaces using regex: `/const\s*\*\s*as\s+(\w+)\s+from\s+(['"][^'"]+['"])\s*;?|from\s+(React|ReactDOM)\s*;/g`
3. Ensures valid ES module syntax before bundling

### Verification Steps

#### 1. Generate Artifact
- [ ] Paste prompt into chat
- [ ] Wait for dashboard to render
- [ ] Dashboard should display without blank screen

#### 2. Check Console (Primary Indicator)
- [ ] No "Unexpected token" errors
- [ ] No "Invalid or unexpected token" errors
- [ ] No "Unexpected identifier" errors
- [ ] No syntax errors in red

#### 3. Inspect HTML Source
- [ ] Right-click iframe → Inspect → Elements
- [ ] Find the `<script type="module">` tag
- [ ] Search for `import * as` (should exist if transformation worked)
- [ ] Search for `const * as` (should NOT exist if transformation worked)
- [ ] All imports should have quotes: `from 'react'` not `from React;`

#### 4. Check Module Script Parsing
- [ ] Look for blue info icons in console (successful module load)
- [ ] No red syntax errors when parsing module script
- [ ] Component should function normally

### Pass Criteria
✅ **PASS** if:
- No JavaScript syntax errors in console
- Module script parses successfully
- Imports use valid syntax (`import * as`)
- No unquoted module names (`from React;`)
- Component renders and functions

❌ **FAIL** if:
- "Unexpected token" or syntax error
- Module script fails to parse
- `const * as` appears in final HTML
- Unquoted imports like `from React;` in HTML
- Artifact shows blank screen with syntax errors

### Troubleshooting
**Issue:** No `const * as` found in HTML
- This is GOOD - means either:
  1. Transformation already fixed it, or
  2. AI didn't generate invalid syntax
- Test still PASSES

**Issue:** Syntax error but not related to imports
- Check error message for specific issue
- May be unrelated to import normalization
- Document the actual error for investigation

### Alternative Test (Force Invalid Syntax)
If AI doesn't generate invalid syntax naturally, you can test the transformation logic is present by checking the server-side code exists:

```bash
# Verify the transformation function exists
grep -A 10 "normalizeExports" supabase/functions/bundle-artifact/index.ts
```

Should return the function definition. If present, transformation is deployed.

---

## Category 6: Dual React Instance Fix

### What This Tests
**Transformation:** `fixDualReactInstance()` prevents multiple React instances when using npm packages with esm.sh
**Location:** `bundle-artifact/index.ts` lines 361-418
**Why:** npm packages via esm.sh can bundle their own React, conflicting with global React and causing "Cannot read properties of null (reading 'useRef')" errors

### Test Prompt
```
Create an interactive form using @radix-ui/react-dialog with a dialog
that contains input fields for name, email, and message. Add validation
and a submit button. Style it with Tailwind CSS.
```

### Expected Server-Side Behavior
1. Detects `esm.sh` URLs in HTML
2. Replaces `?deps=react@x.x.x,react-dom@x.x.x` with `?external=react,react-dom`
3. Adds `?external=react,react-dom` to esm.sh URLs without query params
4. Updates CSP meta tag to allow `data:` URLs: `script-src ... blob: data:`
5. Updates import map to redirect React imports to window globals:
   ```json
   {
     "imports": {
       "react": "data:text/javascript,export default window.React",
       "react-dom": "data:text/javascript,export default window.ReactDOM",
       "react/jsx-runtime": "data:text/javascript,export const jsx=window.React.createElement;..."
     }
   }
   ```

### Verification Steps

#### 1. Generate Artifact
- [ ] Paste prompt into chat
- [ ] Wait for form component to render
- [ ] Button should display to open dialog

#### 2. Test Functionality
- [ ] Click button to open dialog
- [ ] Dialog should open smoothly (overlay + modal)
- [ ] Input fields should be interactive
- [ ] Close button should work
- [ ] No React hook errors in console

#### 3. Check Console (Critical)
- [ ] No "Cannot read properties of null (reading 'useRef')" errors
- [ ] No "Invalid hook call" errors
- [ ] No "Hooks can only be called inside the body of a function component" errors
- [ ] No dual React instance warnings

#### 4. Inspect HTML Source - esm.sh URLs
- [ ] Right-click iframe → Inspect → Elements
- [ ] Search for `esm.sh` (Ctrl+F)
- [ ] Verify URLs use `?external=react,react-dom`:
   ```html
   <script type="module">
   import { Dialog } from 'https://esm.sh/@radix-ui/react-dialog?external=react,react-dom';
   </script>
   ```
- [ ] Should NOT see `?deps=react@18.3.1,react-dom@18.3.1`

#### 5. Inspect HTML Source - Import Map
- [ ] Search for `importmap` (Ctrl+F)
- [ ] Verify import map includes React shims:
   ```html
   <script type="importmap">
   {
     "imports": {
       "react": "data:text/javascript,export default window.React",
       "react-dom": "data:text/javascript,export default window.ReactDOM"
     }
   }
   </script>
   ```

#### 6. Inspect HTML Source - CSP Header
- [ ] Search for `Content-Security-Policy` (Ctrl+F)
- [ ] Verify `script-src` includes `data:`:
   ```html
   <meta http-equiv="Content-Security-Policy" content="... script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: ...">
   ```

#### 7. Verify Single React Instance (React DevTools)
- [ ] Install React DevTools extension if not installed
- [ ] Open React DevTools tab
- [ ] Should show single component tree (not duplicate roots)
- [ ] Should detect React version once (not "Multiple versions detected")

### Pass Criteria
✅ **PASS** if:
- Radix UI components work correctly (dialog opens/closes)
- No useRef/useState hook errors
- esm.sh URLs use `?external=react,react-dom`
- Import map redirects React to window globals
- CSP allows `data:` URLs
- Single React instance in DevTools
- Form is interactive and functional

❌ **FAIL** if:
- "Cannot read properties of null" errors
- "Invalid hook call" errors
- esm.sh URLs still use `?deps=`
- Import map missing or incorrect
- CSP doesn't allow `data:`
- React DevTools shows multiple React versions
- Dialog won't open or form is broken

### Troubleshooting
**Issue:** Dialog opens but inputs don't work
- Check for z-index issues (modal overlay covering inputs)
- Verify pointer-events CSS is correct
- This may not be a transformation issue

**Issue:** CSP violation errors in console
- Check if `data:` is in CSP `script-src` directive
- Verify CSP transformation applied correctly
- Look for "Refused to load the script" errors

**Issue:** Import map present but React still dual-loaded
- Check if import map is loaded BEFORE module scripts
- Verify import map syntax is valid JSON
- Check browser support for import maps (Chrome 89+, Safari 16.4+)

---

## Category 7: Template Literal Unescaping

### What This Tests
**Transformation:** `unescapeTemplateLiterals()` fixes escaped backticks and dollar signs from server-side escaping
**Location:** `bundle-artifact/index.ts` lines 420-444
**Why:** Template literals can get double-escaped during HTML generation, causing syntax errors

### Test Prompt
```
Create a greeting card component that uses template literals for
personalized messages. Include variables for name, age, and favorite color.
Display the message in a styled card with the interpolated values.
```

### Expected Server-Side Behavior
1. Detects escaped template literal syntax in `<script type="module">`:
   - `\`` (escaped backtick) → `` ` `` (unescaped)
   - `\$` (escaped dollar) → `$` (unescaped)
   - `\\\\` (quad backslash) → `\\` (double backslash)
2. Applies unescaping only to module script content
3. Preserves other escaping in HTML attributes and text nodes

### Verification Steps

#### 1. Generate Artifact
- [ ] Paste prompt into chat
- [ ] Wait for greeting card to render
- [ ] Card should display with personalized message

#### 2. Check Console
- [ ] No "Invalid or unexpected token" errors
- [ ] No "Unexpected token" errors related to backticks
- [ ] No template literal syntax errors
- [ ] Message should display with interpolated values (not `${name}` literally)

#### 3. Verify String Interpolation Works
- [ ] Message should show actual values like "Hello John" not "Hello ${name}"
- [ ] Variables should be properly substituted
- [ ] Template literal should evaluate correctly

#### 4. Inspect HTML Source - Module Script
- [ ] Right-click iframe → Inspect → Elements
- [ ] Find `<script type="module">` tag
- [ ] Search for template literals with `` ` `` (backticks)
- [ ] Verify backticks are NOT escaped: should see `` `Hello ${name}` ``
- [ ] Should NOT see `\`Hello \${name}\``

#### 5. Check for Over-Escaping
- [ ] Template literals should have single backticks: `` ` ``
- [ ] Dollar signs in template expressions should be single: `${}`
- [ ] No backslashes before backticks or dollar signs in module script

### Pass Criteria
✅ **PASS** if:
- No template literal syntax errors
- String interpolation works (variables substituted)
- Template expressions evaluate correctly
- Module script contains unescaped backticks `` ` ``
- Module script contains unescaped dollar signs `$`
- Card displays personalized message with actual values

❌ **FAIL** if:
- "Invalid or unexpected token" errors
- Template literals show as `\`` in HTML source
- Dollar signs show as `\$` in HTML source
- String interpolation doesn't work (shows `${name}` literally)
- Syntax errors prevent component from rendering

### Troubleshooting
**Issue:** No template literals found in HTML
- AI might have used string concatenation instead
- Try regenerating with explicit instruction to use template literals
- Or accept that transformation code exists server-side (check git)

**Issue:** Template literals work but are escaped in HTML
- Check if escaping is in HTML attributes vs script content
- Escaping in HTML attributes is OK (like `data-tooltip="\`value\`"`)
- Only module script content should be unescaped

**Issue:** Template literal works but displays `${name}` literally
- This is a logic error (variable undefined), not escaping issue
- Transformation still PASSES if syntax is correct

### Alternative Verification
If template literals aren't generated naturally:

```bash
# Check transformation function exists in deployed code
grep -A 10 "unescapeTemplateLiterals" supabase/functions/bundle-artifact/index.ts
```

Should return the function definition. If present, transformation is deployed.

---

## Performance Testing

### Objective
Verify that server-side transformations eliminate client-side HTML processing overhead (~50-100ms).

### Setup
1. Open Chrome DevTools
2. Go to Performance tab
3. Set CPU throttling to 4x slowdown (to make timing differences more visible)
4. Enable "Screenshots" checkbox

### Test Procedure

#### 1. Baseline Recording
- [ ] Clear cache (Ctrl+Shift+Delete)
- [ ] Start Performance recording (red circle)
- [ ] Generate any artifact from Categories 1-4 above
- [ ] Wait for artifact to fully render
- [ ] Stop recording (red square)

#### 2. Analyze Recording
- [ ] Scrub through timeline to find artifact iframe load
- [ ] Look in Main thread activity
- [ ] Search for "HTML manipulation" or "regex" operations
- [ ] Measure time from iframe creation to first paint

#### 3. Expected Results

**Before Step 1 (Client-side transformations):**
```
Iframe Load → HTML Fetch → DOM Parse → Client Transforms (50-100ms) → Render
```

**After Step 1 (Server-side transformations):**
```
Iframe Load → HTML Fetch (pre-patched) → DOM Parse → Render
```

**Key Difference:** No client-side transformation step

### Verification

- [ ] Check flame graph for absence of these operations:
  - `applyBundleTransformations` function calls
  - Heavy regex operations in iframe context
  - DOM manipulation before render
  - HTML string replacement operations

- [ ] Measure time-to-interactive:
  - **Before:** ~2000-2100ms (bundle generation) + 50-100ms (client transforms)
  - **After:** ~2000-2100ms (bundle generation) + 0ms (pre-patched)
  - **Expected Improvement:** 50-100ms faster

- [ ] Check Performance Timeline:
  - No yellow (scripting) blocks related to HTML patching
  - No long tasks blocking main thread
  - Faster first contentful paint (FCP)

### Pass Criteria
✅ **PASS** if:
- No significant client-side HTML processing visible
- Time-to-interactive is 50-100ms faster than baseline
- No transformation functions appear in profile
- Main thread blocking reduced

❌ **FAIL** if:
- Still see client-side HTML manipulation in profile
- No performance improvement measurable
- Transformation functions still executing client-side

**Note:** If you don't have a "before" baseline, compare to expected timings. The key indicator is absence of HTML manipulation activity.

---

## Completion Report Template

After completing all tests, fill out this summary:

### Test Execution Summary

**Date:** [YYYY-MM-DD]
**Tester:** [Your Name]
**Environment:** Production (`https://chat.geminixai.app/`)
**Browser:** Chrome [Version]

### Results by Category

| Category | Status | Notes | Evidence |
|----------|--------|-------|----------|
| 1. PropTypes | ✅ PASS / ❌ FAIL | [Brief description] | [Screenshot/Log link] |
| 2. Framer Motion | ✅ PASS / ❌ FAIL | [Brief description] | [Screenshot/Log link] |
| 3. Lucide Icons | ✅ PASS / ❌ FAIL | [Brief description] | [Screenshot/Log link] |
| 4. Canvas Confetti | ✅ PASS / ❌ FAIL | [Brief description] | [Screenshot/Log link] |
| 5. Import Syntax | ✅ PASS / ❌ FAIL | [Brief description] | [Screenshot/Log link] |
| 6. Dual React Instance | ✅ PASS / ❌ FAIL | [Brief description] | [Screenshot/Log link] |
| 7. Template Literals | ✅ PASS / ❌ FAIL | [Brief description] | [Screenshot/Log link] |
| Performance | ✅ PASS / ❌ FAIL | [Timing measurements] | [Performance profile] |

### Overall Assessment

**Tests Passed:** [X / 8]
**Tests Failed:** [X / 8]

**Critical Issues:** [List any blocking issues]

**Non-Critical Issues:** [List minor issues]

### Go/No-Go Decision

**Proceed to Step 3 (Client-side code removal)?**
- [ ] ✅ **GO** - All tests passed, safe to remove client-side code
- [ ] ❌ **NO-GO** - Issues found, investigation required

**Rationale:** [Explain decision]

### Next Steps

If GO:
- [ ] Update `.phase1.3-progress.md` with test results
- [ ] Proceed to Step 3 (remove client-side code)
- [ ] Create PR for Step 3 changes

If NO-GO:
- [ ] File bug reports for failing tests
- [ ] Investigate root causes
- [ ] Fix issues and re-test
- [ ] Do not proceed to Step 3 until all tests pass

---

## Rollback Procedure

If critical issues are discovered during testing:

### Immediate Rollback

```bash
# 1. Identify the commit to revert (Step 1 commit)
git log --oneline -10

# 2. Revert the server-side transformation commit
git revert [COMMIT_HASH]

# 3. Redeploy bundle-artifact function
./scripts/deploy-simple.sh prod

# 4. Verify rollback
# Generate a test artifact and confirm old behavior
```

### What Gets Rolled Back
- Server-side transformation functions removed
- Client-side code still present and functional
- No data loss or breaking changes
- Old cached bundles unaffected

### Rollback Time
**Expected:** 3-5 minutes total
- 1 min: Revert commit
- 2-3 min: Redeploy function
- 1 min: Verify rollback successful

### Post-Rollback Actions
1. Document issues found in testing
2. Create bug report with reproduction steps
3. Fix issues in separate branch
4. Re-test fixes locally before re-deploying
5. Schedule new Step 2 testing session

---

## Common Issues Reference

### Issue: "Unexpected token" in console
**Category:** Import Syntax (5) or Template Literals (7)
**Solution:** Check module script syntax, verify transformations applied
**Rollback?** No - investigate specific syntax issue first

### Issue: "X is not defined" (library)
**Category:** Library Injection (1-4)
**Solution:** Check script tag injection, verify CDN accessible
**Rollback?** No - may be CDN issue, not transformation issue

### Issue: "Invalid hook call"
**Category:** Dual React Instance (6)
**Solution:** Check import map and esm.sh URLs use `?external=`
**Rollback?** Yes if widespread, investigate if isolated

### Issue: Blank screen, no errors
**Category:** Multiple possible causes
**Solution:** Check Network tab for failed loads, verify HTML valid
**Rollback?** Yes if reproducible, investigate if isolated

### Issue: Performance worse than expected
**Category:** Performance (8)
**Solution:** Check for network latency, CDN issues, CPU throttling
**Rollback?** No - unlikely to be transformation issue

---

## Tips for Efficient Testing

1. **Use a consistent browser profile:** Create a clean Chrome profile for testing to avoid extension interference

2. **Take screenshots early:** Capture evidence as you test, don't wait until the end

3. **Test in batches:** Complete all 7 categories, then do performance testing separately

4. **Document failures immediately:** Note exact error messages and reproduction steps while fresh

5. **Use browser DevTools presets:** Set up your console/network/elements tabs in advance

6. **Test edge cases if time permits:** Try unusual prompts that might break transformations

7. **Keep chat history:** Don't clear the chat session until all tests complete (for reference)

8. **Monitor network conditions:** Ensure stable internet to avoid false failures from CDN issues

---

## Success Criteria Summary

**PASS Requirements (All must be true):**
- ✅ All 7 transformation categories pass
- ✅ No console errors in production
- ✅ Artifacts render correctly in Chrome
- ✅ Performance improvement verified (50-100ms faster or no client-side processing)
- ✅ No increase in error rates (check Supabase logs)

**Proceed to Step 3 ONLY if all 5 criteria met.**

---

**End of Test Execution Checklist**

For questions or issues during testing, refer to:
- `docs/PHASE_1_3_TESTING_GUIDE.md` - Original testing guide
- `.phase1.3-progress.md` - Progress tracking document
- `.claude/TROUBLESHOOTING.md` - General troubleshooting guide
