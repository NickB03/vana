# Manual WebPreview Testing Guide

**Date:** January 12, 2025
**Status:** Phase 1-2 Complete, Ready for Testing

---

## 🎯 Quick Test (5 minutes)

### Test 1: HTML Artifact with WebPreview

1. **Open:** http://localhost:8081 (should already be open)
2. **Login** if needed
3. **Type in chat:** 
   ```
   Create a simple HTML page with a red button that says "Click me" and shows an alert when clicked
   ```
4. **Wait** for artifact to generate (3-5 seconds)
5. **Verify:**
   - [ ] WebPreview navigation bar appears at top of artifact
   - [ ] Refresh button (↻) is visible on the left
   - [ ] URL bar in center shows "about:blank"
   - [ ] Full-screen button (⛶) is visible on the right
   - [ ] Red button displays correctly
   - [ ] Clicking button shows alert
   - [ ] No console errors (F12 → Console tab)

**Screenshot location:** Take screenshot if issues occur

---

### Test 2: React Artifact with WebPreview

1. **Type in chat:**
   ```
   Create a React counter component with increment and decrement buttons
   ```
2. **Wait** for artifact to generate
3. **Verify:**
   - [ ] WebPreview navigation bar appears
   - [ ] Counter displays (starts at 0)
   - [ ] Increment button works (+1)
   - [ ] Decrement button works (-1)
   - [ ] No console errors

---

### Test 3: Navigation Controls

1. **Click Refresh button (↻)**
   - [ ] Toast notification appears: "Preview refreshed"
   - [ ] Artifact reloads (counter resets if testing React)

2. **Click Full-screen button (⛶)**
   - [ ] Artifact maximizes to full screen
   - [ ] Close button (X) appears to exit full-screen

---

### Test 4: Console Check

1. **Open DevTools:** Press F12 (or Cmd+Option+I on Mac)
2. **Go to Console tab**
3. **Look for errors:**
   - [ ] No "Failed to load resource" errors for WebPreview
   - [ ] No "Cannot read property" errors
   - [ ] No TypeScript errors
   - [ ] Warnings are OK (React Router, Motion, Tailwind CDN)

**Expected warnings (OK to ignore):**
- React Router future flags
- Motion.dev animation warnings
- Tailwind CDN production warning
- Recharts/Babel errors (these are from artifact content, not WebPreview)

---

### Test 5: Theme Switching

1. **Toggle theme** (light/dark mode button in header)
2. **Verify:**
   - [ ] Artifact refreshes automatically
   - [ ] WebPreview navigation bar updates theme
   - [ ] No visual glitches

---

## 🔍 What to Look For

### ✅ Success Indicators
- WebPreview navigation bar is visible and styled correctly
- Refresh button shows tooltip on hover
- URL bar is centered and shows "about:blank"
- Full-screen button works
- Artifact content renders correctly
- No console errors related to WebPreview

### ❌ Failure Indicators
- Navigation bar is missing or broken
- Buttons don't work or show errors
- Artifact content doesn't display
- Console shows WebPreview-related errors
- Page crashes or freezes

---

## 📸 Screenshots Needed

If any issues occur, take screenshots of:
1. **Full page view** - showing artifact with WebPreview
2. **Console errors** - F12 → Console tab
3. **Network tab** - F12 → Network tab (if loading issues)

---

## 🐛 Common Issues & Fixes

### Issue: Navigation bar not visible
- **Check:** Inspect element (right-click artifact → Inspect)
- **Look for:** `<div class="...">` with WebPreview components
- **Fix:** May need to adjust CSS or component structure

### Issue: Artifact content not displaying
- **Check:** Console for errors
- **Look for:** "srcDoc" or "iframe" errors
- **Fix:** May need to adjust srcDoc content

### Issue: Buttons don't work
- **Check:** Console for onClick errors
- **Look for:** "handleRefresh is not defined" or similar
- **Fix:** May need to verify handler functions

---

## 📊 Test Results Template

**Tester:** _______________
**Date:** _______________
**Browser:** Chrome / Safari / Firefox
**OS:** macOS / Windows / Linux

### Results:
- [ ] Test 1: HTML Artifact - PASS / FAIL
- [ ] Test 2: React Artifact - PASS / FAIL
- [ ] Test 3: Navigation Controls - PASS / FAIL
- [ ] Test 4: Console Check - PASS / FAIL
- [ ] Test 5: Theme Switching - PASS / FAIL

### Issues Found:
1. _______________
2. _______________
3. _______________

### Screenshots:
- Attached: YES / NO
- Location: _______________

### Overall Status:
- [ ] ✅ Ready for Phase 3 (Console logging)
- [ ] ⚠️ Needs fixes before proceeding
- [ ] ❌ Critical issues, rollback needed

---

## 🚀 Next Steps

**If all tests pass:**
1. Mark Phase 5 as COMPLETE
2. Decide on Phase 3 (console logging) - optional enhancement
3. Update documentation (Phase 6)
4. Create PR for review

**If issues found:**
1. Document issues in detail
2. Provide screenshots/console logs
3. AI will debug and fix
4. Re-test after fixes

---

**Testing URL:** http://localhost:8081
**Dev Server Status:** Running on terminal 14
**Chrome MCP Status:** Running (PID: 16481)

