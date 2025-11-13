# WebPreview Integration - Manual Test Plan

**Date:** January 12, 2025
**Implementation Status:** Phase 1-2 Complete (Basic WebPreview Integration)

---

## Test Environment

- **Dev Server:** http://localhost:8081
- **Browser:** Chrome (with DevTools)
- **Test Account:** Use existing authenticated session

---

## Phase 1-2 Testing: Basic WebPreview Integration

### Test 1: HTML Artifact Display

**Steps:**
1. Navigate to http://localhost:8081
2. Log in if needed
3. In chat input, type: "Create a simple HTML page with a button that says 'Click me' and shows an alert when clicked"
4. Wait for artifact to generate
5. Verify WebPreview component renders

**Expected Results:**
- ✅ WebPreview navigation bar appears at top
- ✅ Refresh button (↻) is visible
- ✅ URL bar shows blob URL (e.g., `blob:http://localhost:8081/...`)
- ✅ Full-screen button (⛶) is visible
- ✅ HTML content displays correctly in preview area
- ✅ Button is clickable and shows alert

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _______________

---

### Test 2: React Artifact Display

**Steps:**
1. In chat input, type: "Create a React counter component with increment and decrement buttons"
2. Wait for artifact to generate
3. Verify WebPreview component renders

**Expected Results:**
- ✅ WebPreview navigation bar appears
- ✅ Refresh button, URL bar, and full-screen button visible
- ✅ React component renders correctly
- ✅ Counter buttons work (increment/decrement)
- ✅ No console errors related to React

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _______________

---

### Test 3: Navigation Controls

**Steps:**
1. Generate any HTML or React artifact
2. Click the Refresh button (↻)
3. Verify preview refreshes
4. Click the Full-screen button (⛶)
5. Verify artifact maximizes

**Expected Results:**
- ✅ Refresh button shows toast "Preview refreshed"
- ✅ Preview content reloads (themeRefreshKey increments)
- ✅ Full-screen button maximizes artifact
- ✅ No console errors

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _______________

---

### Test 4: URL Bar Display

**Steps:**
1. Generate any HTML or React artifact
2. Observe URL bar in WebPreview navigation
3. Click on URL bar
4. Verify blob URL is displayed

**Expected Results:**
- ✅ URL bar shows blob URL (e.g., `blob:http://localhost:8081/abc123...`)
- ✅ URL bar is read-only (or editable but doesn't break preview)
- ✅ URL format is correct

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _______________

---

### Test 5: Theme Switching

**Steps:**
1. Generate any HTML or React artifact
2. Toggle theme (light/dark mode)
3. Verify preview updates

**Expected Results:**
- ✅ Preview refreshes when theme changes
- ✅ Artifact content respects new theme
- ✅ No visual glitches during transition

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _______________

---

### Test 6: Error Handling

**Steps:**
1. Generate an artifact with intentional error (e.g., "Create HTML with <script>alert('test'</script>")
2. Verify error display
3. Click "Ask AI to Fix" button
4. Verify fix attempt

**Expected Results:**
- ✅ Error banner appears above WebPreview
- ✅ Error message is clear and categorized
- ✅ "Ask AI to Fix" button works
- ✅ WebPreview still renders (even with error)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _______________

---

### Test 7: Loading State

**Steps:**
1. Generate a complex artifact (e.g., "Create a React dashboard with charts")
2. Observe loading state during generation
3. Verify skeleton loader appears

**Expected Results:**
- ✅ ArtifactSkeleton appears while loading
- ✅ Loading state clears when artifact ready
- ✅ No flash of unstyled content

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _______________

---

### Test 8: Mobile Responsive Layout

**Steps:**
1. Generate any HTML or React artifact
2. Open Chrome DevTools (F12)
3. Toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
4. Test on iPhone SE, iPad, and Desktop sizes

**Expected Results:**
- ✅ WebPreview navigation adapts to mobile
- ✅ URL bar is responsive
- ✅ Buttons remain accessible
- ✅ Preview content scales correctly

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _______________

---

### Test 9: Console Errors Check

**Steps:**
1. Open Chrome DevTools Console (F12)
2. Generate 2-3 different artifacts (HTML, React, SVG)
3. Monitor console for errors

**Expected Results:**
- ✅ No TypeScript errors
- ✅ No React warnings
- ✅ No "Failed to load resource" errors
- ✅ No WebPreview-related errors

**Actual Results:**
- [ ] Pass / [ ] Fail
- Console output: _______________

---

### Test 10: Blob URL Cleanup

**Steps:**
1. Generate an artifact
2. Close the artifact (X button)
3. Generate another artifact
4. Repeat 5-10 times
5. Check Chrome Task Manager (Shift+Esc) for memory leaks

**Expected Results:**
- ✅ Memory usage stays stable
- ✅ No accumulation of blob URLs
- ✅ Cleanup effect runs on unmount

**Actual Results:**
- [ ] Pass / [ ] Fail
- Memory usage: _______________

---

## Regression Testing

### Test 11: Other Artifact Types (Non-WebPreview)

**Steps:**
1. Generate SVG artifact: "Create an SVG circle"
2. Generate Mermaid diagram: "Create a flowchart"
3. Generate Markdown: "Create a markdown document"
4. Generate Code: "Show me a Python function"

**Expected Results:**
- ✅ SVG renders correctly (no WebPreview)
- ✅ Mermaid renders correctly (no WebPreview)
- ✅ Markdown renders correctly (no WebPreview)
- ✅ Code renders correctly (no WebPreview)
- ✅ No regressions in non-HTML/React artifacts

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _______________

---

### Test 12: Export Functionality

**Steps:**
1. Generate HTML artifact
2. Click Export menu
3. Test "Copy to clipboard"
4. Test "Download"
5. Test "Export as standalone HTML"

**Expected Results:**
- ✅ All export options still work
- ✅ No regressions in ExportMenu
- ✅ Exported content is correct

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _______________

---

## Summary

**Total Tests:** 12
**Passed:** ___
**Failed:** ___
**Blocked:** ___

**Critical Issues:**
- _______________

**Minor Issues:**
- _______________

**Next Steps:**
- [ ] Fix any critical issues
- [ ] Implement Phase 3 (Console logging) if tests pass
- [ ] Update documentation
- [ ] Create PR for review

---

**Tester:** _______________
**Date Completed:** _______________
