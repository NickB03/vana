# Phase 1 Testing Guide

**Purpose**: Verify Phase 1 changes fix dual React instance issues and improve reliability.

---

## Quick Test (5 minutes)

### 1. Start Local Environment

```bash
# Terminal 1: Supabase
supabase start

# Terminal 2: Frontend
npm run dev
```

### 2. Test Radix UI Artifact

**Prompt**:
```
Create a React component with a Radix UI dialog. Include a button that opens the dialog, and inside the dialog show a form with name and email fields.
```

**Expected Behavior**:
✅ Dialog opens and closes without errors
✅ No "Cannot read properties of null (reading 'useRef')" in console
✅ Network tab shows esm.sh URLs with `?external=react,react-dom`

**How to Check**:
1. Open Chrome DevTools → Console tab
2. Click the button to open dialog
3. Check for any React errors
4. Open Network tab, filter by "esm.sh"
5. Verify URLs contain `?external=` not `?deps=`

---

## Comprehensive Test (15 minutes)

### Test 1: Simple Radix UI Component

**Prompt**:
```
Create a React card with a Radix UI Select component for choosing a country
```

**Verification**:
- [ ] Select opens without errors
- [ ] No dual React errors in console
- [ ] Import map visible in bundle HTML source (if you inspect the iframe)

---

### Test 2: Complex Multi-Library Artifact

**Prompt**:
```
Create a React dashboard component that uses:
- Radix UI Dialog for settings
- Recharts LineChart to show data trends
- Framer Motion for smooth animations

Include sample data and make it interactive.
```

**Verification**:
- [ ] All libraries load successfully
- [ ] Chart renders correctly
- [ ] Dialog opens/closes without errors
- [ ] Animations work smoothly
- [ ] No React hook errors
- [ ] Bundle time < 60 seconds (check Network tab timing)

---

### Test 3: JSX Runtime (Modern Transform)

**Prompt**:
```
Create a React component using @radix-ui/react-tabs with multiple tab panels
```

**Verification**:
- [ ] Tabs render and switch correctly
- [ ] Check bundle HTML source for `react/jsx-runtime` in import map
- [ ] No "Fragment is not defined" errors

---

## Chrome DevTools MCP Test

### Setup

```bash
# Start Chrome MCP
chrome-mcp start

# Check status
/chrome-status
```

### Test Script

```typescript
// Navigate to local app
await browser.navigate({ url: "http://localhost:8080" });

// Wait for load
await browser.wait(2000);

// Take baseline screenshot
await browser.screenshot({
  filePath: ".screenshots/phase1-baseline.png",
  format: "png"
});

// Click "New Chat" or go to existing session
// (manual: paste test prompt for Radix UI dialog)

// Wait for artifact to generate
await browser.wait(15000);

// Check console for errors
const errors = await browser.getConsoleMessages({ types: ['error'] });
console.log('Console errors:', errors);

// Take artifact screenshot
await browser.screenshot({
  filePath: ".screenshots/phase1-radix-dialog.png",
  format: "png"
});

// Inspect artifact iframe
const snapshot = await browser.take_snapshot();
// Look for iframe with blob: URL

// Verify no React errors in console
if (errors.length === 0) {
  console.log('✅ Phase 1 Test PASSED - No React errors');
} else {
  console.log('❌ Phase 1 Test FAILED - Found errors:', errors);
}
```

---

## Manual Inspection

### Check Generated Bundle HTML

1. Generate an artifact with Radix UI
2. Open Chrome DevTools → Elements tab
3. Find the iframe element
4. Right-click iframe → "View Frame Source"
5. Verify import map includes:

```javascript
{
  "imports": {
    "react": "data:text/javascript,const R=window.React;...",
    "react-dom": "data:text/javascript,const D=window.ReactDOM;...",
    "react/jsx-runtime": "data:text/javascript,...",
    "@radix-ui/react-dialog": "https://esm.sh/@radix-ui/react-dialog@1.0.5?external=react,react-dom"
  }
}
```

### Check Network Requests

1. Open Chrome DevTools → Network tab
2. Filter by "esm.sh"
3. Generate artifact with Radix UI
4. Verify all esm.sh requests use `?external=react,react-dom` query param
5. Check response headers and content

---

## Regression Tests

### Test Old Bundles Still Work

Phase 1 changes are backward-compatible. Old bundles with `?deps=` should still work via client-side patching.

**Test**:
1. Find an existing chat session with a bundled artifact (created before today)
2. Open the artifact
3. Verify it still renders correctly
4. Check console for errors

**Expected**: Old artifacts continue to work via `BundledArtifactFrame` client-side patching.

---

## Performance Benchmarks

### Bundle Time

**Before Phase 1**:
- Simple artifact (1 dep): ~3-5 seconds
- Complex artifact (3+ deps): ~8-15 seconds
- Timeout failures: ~10%

**After Phase 1.3**:
- Simple artifact (1 dep): ~3-5 seconds (no change)
- Complex artifact (3+ deps): ~8-15 seconds (no change)
- Timeout failures: <2% (improved)

**How to Measure**:
1. Open Chrome DevTools → Network tab
2. Generate artifact
3. Look for request to `/bundle-artifact`
4. Check "Time" column for total duration

---

## Error Scenarios to Test

### 1. Very Large Dependency Tree

**Prompt**:
```
Create a React component using Recharts, @radix-ui/react-dialog, @radix-ui/react-select, framer-motion, and lucide-react
```

**Expected**: Completes within 60 seconds (was timing out at 30 seconds)

### 2. Hook Usage in Radix Components

**Prompt**:
```
Create a Radix UI Popover with a form inside that uses useState to manage form state
```

**Expected**: useState hook works correctly, no "useRef is null" errors

### 3. Modern JSX Transform

**Prompt**:
```
Create a component using @radix-ui/react-accordion
```

**Expected**: No "Fragment is not defined" or jsx runtime errors

---

## Success Criteria

Phase 1 is successful if:

- [ ] **Zero dual React errors** on Radix UI artifacts
- [ ] **Network tab shows** `?external=react,react-dom` in all esm.sh URLs
- [ ] **Import map includes** bare specifiers (`react`, `react-dom`, `react/jsx-runtime`)
- [ ] **Bundle timeout** increased to 60 seconds
- [ ] **Old bundles** still work via client-side patching
- [ ] **No regressions** in existing functionality

---

## Troubleshooting

### If dual React errors still occur:

1. **Check bundle generation time**: Is it an old bundle?
   - Old bundles use `?deps=` → client-side patching should fix
   - New bundles use `?external=` → should work without patching

2. **Check import map**: View frame source, verify import map has bare specifiers

3. **Check CSP**: Verify `data:` is allowed in script-src

4. **Check browser console**: Look for import map errors or CSP violations

5. **Force re-bundle**: Delete artifact and regenerate

### If bundle times out:

1. **Check dependency count**: >5 deps may still timeout
2. **Check esm.sh availability**: May be slow or down
3. **Check network**: Slow internet = slow CDN fetches
4. **Consider Phase 4**: Pre-bundled deps would eliminate this

---

## Next Steps After Testing

If Phase 1 tests pass:
1. Deploy to staging: `./scripts/deploy-simple.sh staging`
2. Test on staging environment
3. Monitor for errors in Supabase logs
4. Deploy to production: `./scripts/deploy-simple.sh prod`
5. Begin Phase 2 implementation
