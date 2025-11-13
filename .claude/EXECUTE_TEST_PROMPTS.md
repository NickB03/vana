# Execute Test Prompts - Manual Testing Guide

**Status**: Dev server verified ✅ Running on http://localhost:8080

**Purpose**: Execute all test prompts from QUICK_TEST_PROMPTS.md to verify WebPreview integration

**Estimated Time**: 15-20 minutes

---

## 🚀 Quick Start

### Prerequisites
- ✅ Dev server running on http://localhost:8080
- ✅ Chrome browser open
- ✅ Browser console open (F12)
- ✅ Network tab open

### Testing Flow
1. Open http://localhost:8080 in your browser
2. Copy a test prompt below
3. Paste into chat input
4. Submit and observe results
5. Check the verification points
6. Record pass/fail status

---

## ✅ Critical Tests (Must Pass)

### Test 1: HTML Artifact with WebPreview
**Copy this prompt:**
```
Create a simple HTML page with a blue button that says "Hello World" and shows an alert when clicked
```

**Expected Results:**
- [ ] Artifact card appears in chat
- [ ] Click "Open" button to view artifact
- [ ] WebPreview navigation bar visible with 3 controls:
  - Back button
  - Refresh button
  - Full screen button
- [ ] Blue "Hello World" button renders correctly
- [ ] Clicking button shows alert
- [ ] No console errors

**Browser Console Should Show:**
```
Artifact generation request detected
POST /functions/v1/generate-artifact → 200 OK
```

**If Fails:** Check for import errors, verify artifact parser is working

---

### Test 2: React Counter with WebPreview
**Copy this prompt:**
```
Create a React counter component with increment and decrement buttons styled with Tailwind CSS
```

**Expected Results:**
- [ ] Artifact card appears
- [ ] WebPreview navigation bar visible
- [ ] Counter starts at 0
- [ ] Increment button increases count
- [ ] Decrement button decreases count
- [ ] Tailwind styles applied correctly
- [ ] No "@/components/ui" import errors
- [ ] No console errors

**Browser Console Should Show:**
```
Artifact generation request detected
POST /functions/v1/generate-artifact → 200 OK
```

**If Fails:** Check for invalid imports (should use Radix UI primitives, not @/ imports)

---

### Test 3: SVG Artifact (No WebPreview)
**Copy this prompt:**
```
Create an SVG circle with a radius of 50 pixels, filled with red color
```

**Expected Results:**
- [ ] Artifact card appears
- [ ] NO WebPreview navigation (direct SVG rendering)
- [ ] Red circle visible, radius 50px
- [ ] SVG rendered inline in chat
- [ ] No console errors

**Browser Console Should Show:**
```
Artifact generation request detected
POST /functions/v1/generate-artifact → 200 OK
```

**If Fails:** Check artifact type detection logic

---

### Test 4: Mermaid Diagram (No WebPreview)
**Copy this prompt:**
```
Create a mermaid flowchart showing a simple login process: Start -> Enter credentials -> Validate -> Success or Failure
```

**Expected Results:**
- [ ] Artifact card appears
- [ ] NO WebPreview navigation (diagram rendering)
- [ ] Flowchart renders correctly
- [ ] All nodes visible: Start, Enter credentials, Validate, Success, Failure
- [ ] Arrows connect nodes properly
- [ ] No console errors

**Browser Console Should Show:**
```
Artifact generation request detected
POST /functions/v1/generate-artifact → 200 OK
```

**If Fails:** Check mermaid library loading

---

## 🔍 Regression Tests (Should Still Work)

### Test 5: Markdown Artifact
**Copy this prompt:**
```
Create a markdown document with a title "My Project", a bulleted list of 3 features, and a code block showing a JavaScript function
```

**Expected Results:**
- [ ] Markdown renders with formatting
- [ ] Title "My Project" appears as H1
- [ ] Bulleted list with 3 items
- [ ] Code block with syntax highlighting
- [ ] No console errors

---

### Test 6: Code Artifact
**Copy this prompt:**
```
Show me a Python function that calculates the fibonacci sequence
```

**Expected Results:**
- [ ] Code block with Python syntax highlighting
- [ ] Function definition visible
- [ ] No console errors

---

### Test 7: Image Generation
**Copy this prompt:**
```
Generate an image of a sunset over mountains
```

**Expected Results:**
- [ ] Browser console shows: `Image generation request detected`
- [ ] Network shows: `POST /functions/v1/generate-image → 200 OK`
- [ ] Image appears inline in chat
- [ ] Image loads correctly (no broken icon)
- [ ] Download button available
- [ ] No console errors

**Browser Console Should Show:**
```
Image generation request detected
POST /functions/v1/generate-image → 200 OK
```

**If Fails:** Check image generation function and API key configuration

---

## 🚀 Advanced Tests (Optional)

### Test 8: HTML with D3.js
**Copy this prompt:**
```
Create an HTML page with a D3.js bar chart showing data for 5 products with random sales values
```

**Expected Results:**
- [ ] WebPreview navigation bar visible
- [ ] Bar chart renders correctly
- [ ] 5 bars visible with different heights
- [ ] D3.js library loaded from CDN
- [ ] No library loading errors

---

### Test 9: React with Recharts
**Copy this prompt:**
```
Create a React component with a line chart using Recharts showing temperature data over 7 days
```

**Expected Results:**
- [ ] WebPreview navigation bar visible
- [ ] Line chart renders correctly
- [ ] 7 data points visible
- [ ] Recharts library working
- [ ] No import errors
- [ ] No console errors

---

### Test 10: HTML with CSS Animation
**Copy this prompt:**
```
Create an HTML page with a bouncing ball animation using CSS animations
```

**Expected Results:**
- [ ] WebPreview navigation bar visible
- [ ] Ball animates smoothly
- [ ] Bouncing effect works correctly
- [ ] Animation loops continuously
- [ ] No console errors

---

## 📊 Results Tracking

### Pass/Fail Summary
Fill this out as you test:

| Test | Type | Status | Notes |
|------|------|--------|-------|
| 1 | HTML + WebPreview | ⬜ Pass / ⬜ Fail | |
| 2 | React + WebPreview | ⬜ Pass / ⬜ Fail | |
| 3 | SVG (no WebPreview) | ⬜ Pass / ⬜ Fail | |
| 4 | Mermaid (no WebPreview) | ⬜ Pass / ⬜ Fail | |
| 5 | Markdown | ⬜ Pass / ⬜ Fail | |
| 6 | Code | ⬜ Pass / ⬜ Fail | |
| 7 | Image Generation | ⬜ Pass / ⬜ Fail | |
| 8 | HTML + D3.js | ⬜ Pass / ⬜ Fail | |
| 9 | React + Recharts | ⬜ Pass / ⬜ Fail | |
| 10 | HTML + Animation | ⬜ Pass / ⬜ Fail | |

### Critical Issues Found
Document any critical issues:
- [ ] Import errors in React artifacts
- [ ] WebPreview not appearing for HTML/React
- [ ] Console errors blocking functionality
- [ ] API calls failing (check Network tab)
- [ ] Artifacts not rendering

---

## 🐛 Troubleshooting

### If WebPreview Doesn't Appear
1. Check browser console for errors
2. Verify artifact type is `html` or `react`
3. Check `ArtifactContainer` component props
4. Verify `WebPreview` component is imported

### If Artifact Has Import Errors
1. Look for `@/components/ui/*` imports
2. Verify transformation logic in artifact parser
3. Check that Radix UI primitives are used instead
4. Review `.claude/artifact-import-restrictions.md`

### If API Calls Fail
1. Check Supabase Edge Functions are deployed
2. Verify API keys are configured
3. Check function logs in Supabase Dashboard
4. Verify guest rate limiting isn't blocking requests

### If Console Shows Errors
1. Take screenshot of console
2. Note the error message and stack trace
3. Check which test prompt caused the error
4. Document in "Critical Issues Found" section

---

## 📸 Screenshot Checklist

Take screenshots of:
1. ✅ Test 1 (HTML with WebPreview navigation)
2. ✅ Test 2 (React counter working)
3. ✅ Test 7 (Image generation result)
4. ❌ Any failing tests with console errors

---

## 🎯 Success Criteria

**Tests Pass If:**
- ✅ All 4 critical tests (1-4) pass
- ✅ WebPreview appears for HTML/React artifacts
- ✅ No WebPreview for SVG/Mermaid/Markdown/Code
- ✅ No console errors during normal operation
- ✅ All API calls return 200 OK
- ✅ Artifacts render correctly

**Tests Fail If:**
- ❌ Import errors in React artifacts
- ❌ WebPreview missing for HTML/React
- ❌ WebPreview appears for wrong types
- ❌ Console shows red errors (warnings OK)
- ❌ API calls return 4xx/5xx errors
- ❌ Artifacts fail to render

---

## 📝 Next Steps After Testing

### If All Tests Pass
1. Document results in git commit
2. Update `.claude/WEBPREVIEW_INTEGRATION_STATUS.md`
3. Consider creating PR for feature branch

### If Tests Fail
1. Document failures in detail
2. Create debugging session with Claude Code
3. Fix issues before merging to main

---

## 📚 Related Documentation

- **Test Prompts**: `.claude/QUICK_TEST_PROMPTS.md`
- **Test Checklist**: `.claude/quick_test_checklist.md`
- **Artifact Docs**: `.claude/artifacts.md`
- **Import Restrictions**: `.claude/artifact-import-restrictions.md`
- **WebPreview Component**: `src/components/WebPreview.tsx`

---

**Testing URL**: http://localhost:8080
**Last Updated**: 2025-11-12
**Automated by**: Claude Code
