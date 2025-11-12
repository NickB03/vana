# Artifact Type Test Prompts - WebPreview Integration Verification

**Date:** January 12, 2025  
**Purpose:** Verify all artifact types work correctly after WebPreview integration  
**Expected:** HTML/React use WebPreview, others use original rendering

---

## 🎯 Test Instructions

1. Copy each prompt below (one at a time)
2. Paste into chat input at http://localhost:8081
3. Wait for artifact to generate
4. Verify expected behavior
5. Check console (F12) for errors
6. Mark ✅ or ❌ in results section

---

## 📋 Test Prompts by Artifact Type

### 1. HTML Artifact (Should Use WebPreview)

**Prompt:**
```
Create a simple HTML page with a blue button that says "Hello World" and shows an alert when clicked
```

**Expected Result:**
- ✅ WebPreview navigation bar appears (refresh, URL bar, full-screen)
- ✅ Blue button displays and works
- ✅ URL bar shows "about:blank"
- ✅ No console errors

**Test Result:** [ ] Pass / [ ] Fail

---

### 2. React Artifact (Should Use WebPreview)

**Prompt:**
```
Create a React counter component with increment and decrement buttons styled with Tailwind CSS
```

**Expected Result:**
- ✅ WebPreview navigation bar appears
- ✅ Counter starts at 0
- ✅ Increment button works (+1)
- ✅ Decrement button works (-1)
- ✅ No console errors

**Test Result:** [ ] Pass / [ ] Fail

---

### 3. SVG Artifact (Should NOT Use WebPreview)

**Prompt:**
```
Create an SVG circle with a radius of 50 pixels, filled with red color
```

**Expected Result:**
- ✅ SVG renders directly (no WebPreview navigation)
- ✅ Red circle displays
- ✅ No regression from previous behavior
- ✅ No console errors

**Test Result:** [ ] Pass / [ ] Fail

---

### 4. Mermaid Diagram (Should NOT Use WebPreview)

**Prompt:**
```
Create a mermaid flowchart showing a simple login process: Start -> Enter credentials -> Validate -> Success or Failure
```

**Expected Result:**
- ✅ Mermaid diagram renders (no WebPreview navigation)
- ✅ Flowchart displays correctly
- ✅ No regression from previous behavior
- ✅ No console errors

**Test Result:** [ ] Pass / [ ] Fail

---

### 5. Markdown Artifact (Should NOT Use WebPreview)

**Prompt:**
```
Create a markdown document with a title "My Project", a bulleted list of 3 features, and a code block showing a JavaScript function
```

**Expected Result:**
- ✅ Markdown renders with formatting (no WebPreview navigation)
- ✅ Title, list, and code block display correctly
- ✅ Syntax highlighting works in code block
- ✅ No console errors

**Test Result:** [ ] Pass / [ ] Fail

---

### 6. Code Artifact (Should NOT Use WebPreview)

**Prompt:**
```
Show me a Python function that calculates the fibonacci sequence
```

**Expected Result:**
- ✅ Code displays with syntax highlighting (no WebPreview navigation)
- ✅ Python syntax highlighting works
- ✅ Copy button works
- ✅ No console errors

**Test Result:** [ ] Pass / [ ] Fail

---

### 7. Image Artifact (Should NOT Use WebPreview)

**Prompt:**
```
Generate an image of a sunset over mountains
```

**Expected Result:**
- ✅ Image displays (no WebPreview navigation)
- ✅ Image loads correctly
- ✅ Download/export options work
- ✅ No console errors

**Test Result:** [ ] Pass / [ ] Fail

---

## 🔍 Advanced Tests (Optional)

### 8. Complex HTML with Libraries

**Prompt:**
```
Create an HTML page with a D3.js bar chart showing data for 5 products with random sales values
```

**Expected Result:**
- ✅ WebPreview navigation appears
- ✅ D3.js loads from CDN
- ✅ Bar chart renders
- ✅ No library loading errors

**Test Result:** [ ] Pass / [ ] Fail

---

### 9. React with Recharts

**Prompt:**
```
Create a React component with a line chart using Recharts showing temperature data over 7 days
```

**Expected Result:**
- ✅ WebPreview navigation appears
- ✅ Recharts loads correctly
- ✅ Line chart displays
- ✅ No import errors

**Test Result:** [ ] Pass / [ ] Fail

---

### 10. HTML with Animation

**Prompt:**
```
Create an HTML page with a bouncing ball animation using CSS animations
```

**Expected Result:**
- ✅ WebPreview navigation appears
- ✅ Ball animates smoothly
- ✅ Animation doesn't break on refresh
- ✅ No console errors

**Test Result:** [ ] Pass / [ ] Fail

---

## 🧪 WebPreview-Specific Tests

### 11. Refresh Button Test

**Steps:**
1. Generate any HTML artifact (use prompt #1)
2. Click refresh button (↻)
3. Verify toast appears: "Preview refreshed"
4. Verify artifact reloads

**Test Result:** [ ] Pass / [ ] Fail

---

### 12. Full-Screen Button Test

**Steps:**
1. Generate any HTML artifact (use prompt #1)
2. Click full-screen button (⛶)
3. Verify artifact maximizes
4. Verify close button (X) appears
5. Click close to exit full-screen

**Test Result:** [ ] Pass / [ ] Fail

---

### 13. Theme Switching Test

**Steps:**
1. Generate any HTML artifact (use prompt #1)
2. Toggle theme (light/dark mode button in header)
3. Verify artifact refreshes automatically
4. Verify WebPreview navigation updates theme
5. Toggle back and verify again

**Test Result:** [ ] Pass / [ ] Fail

---

## 📊 Test Results Summary

**Total Tests:** 13  
**Passed:** ___  
**Failed:** ___  
**Skipped:** ___

### Critical Tests (Must Pass):
- [ ] Test 1: HTML Artifact
- [ ] Test 2: React Artifact
- [ ] Test 3: SVG Artifact (regression check)
- [ ] Test 4: Mermaid Diagram (regression check)
- [ ] Test 11: Refresh Button
- [ ] Test 12: Full-Screen Button

### Nice-to-Have Tests:
- [ ] Test 5: Markdown
- [ ] Test 6: Code
- [ ] Test 7: Image
- [ ] Test 8-10: Advanced features
- [ ] Test 13: Theme switching

---

## 🐛 Issues Found

**Issue #1:**
- Test: ___
- Description: ___
- Severity: Critical / High / Medium / Low
- Screenshot: ___

**Issue #2:**
- Test: ___
- Description: ___
- Severity: Critical / High / Medium / Low
- Screenshot: ___

---

## ✅ Sign-Off

**Tester:** _______________  
**Date:** _______________  
**Browser:** Chrome / Safari / Firefox  
**OS:** macOS / Windows / Linux

**Overall Status:**
- [ ] ✅ All critical tests pass - Ready for Phase 6 (documentation)
- [ ] ⚠️ Minor issues found - Document and proceed
- [ ] ❌ Critical issues found - Needs fixes before proceeding

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________

