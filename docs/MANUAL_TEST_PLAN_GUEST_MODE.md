# Manual Test Plan: Guest Mode Enhancement

**Feature:** Guest Mode with 10 messages + SystemMessage component
**Test Date:** _______________
**Tester:** _______________
**Environment:** Development (http://localhost:8083)

---

## Pre-Test Setup

### Prerequisites
- [ ] Dev server running on http://localhost:8083
- [ ] Clear browser localStorage: `localStorage.clear()`
- [ ] Not logged in (guest mode)
- [ ] Browser console open (F12)

### Test Environment
- **URL:** http://localhost:8083
- **Browser:** Chrome/Safari/Firefox
- **Device:** Desktop / Mobile
- **Network:** Normal / Slow 3G / Offline

---

## Test Suite 1: Basic Guest Flow (Critical Path)

### Test 1.1: Homepage Access
**Objective:** Verify guest can access homepage

**Steps:**
1. Navigate to http://localhost:8083
2. Observe landing page

**Expected:**
- [ ] Landing page loads successfully
- [ ] No authentication required
- [ ] No errors in console
- [ ] Prompt input visible

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 1.2: First Message Submission
**Objective:** Verify first message sends successfully

**Steps:**
1. Type "Hello, test message 1" in homepage prompt input
2. Click submit button
3. Observe transition to chat interface

**Expected:**
- [ ] Chat interface appears
- [ ] First message appears in chat
- [ ] AI responds to message
- [ ] **SystemMessage appears at top** ⭐
- [ ] SystemMessage shows "You have **9** free messages remaining"
- [ ] "Sign In" button visible in SystemMessage
- [ ] No console errors

**Actual Result:** _______________

**Screenshot:** 📸 _______________ (Capture SystemMessage)

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 1.3: SystemMessage Appearance
**Objective:** Verify SystemMessage displays correctly

**Steps:**
1. Inspect SystemMessage component
2. Check positioning and styling

**Expected:**
- [ ] SystemMessage centered at top (max-w-3xl)
- [ ] Blue/zinc background (action variant, filled)
- [ ] Info icon visible
- [ ] Text: "You have **9** free messages remaining. Sign in for increased limits on the free tier!"
- [ ] "Sign In" button styled correctly
- [ ] Responsive on mobile

**Visual Checks:**
- [ ] Proper spacing (py-3, px-6)
- [ ] Border radius (rounded-[12px])
- [ ] Dark mode support
- [ ] Button hover state

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 1.4: Subsequent Messages (2-9)
**Objective:** Verify counter updates correctly

**Steps:**
1. Send message 2: "Test message 2"
2. Send message 3: "Test message 3"
3. ...continue until message 9

**Expected for Each Message:**
- [ ] Message 2: Shows "8 free messages remaining"
- [ ] Message 3: Shows "7 free messages remaining"
- [ ] Message 4: Shows "6 free messages remaining"
- [ ] Message 5: Shows "5 free messages remaining"
- [ ] Message 6: Shows "4 free messages remaining"
- [ ] Message 7: Shows "3 free messages remaining"
- [ ] Message 8: Shows "2 free messages remaining"
- [ ] Message 9: Shows "1 free message remaining" (singular!)

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 1.5: Tenth Message
**Objective:** Verify last free message

**Steps:**
1. Send message 10: "Final free message"

**Expected:**
- [ ] Message sends successfully
- [ ] AI responds
- [ ] SystemMessage shows: "You've reached your free message limit. Sign in to continue chatting with increased limits!"
- [ ] Counter shows 10/10

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 1.6: Limit Enforcement
**Objective:** Verify message limit is enforced

**Steps:**
1. Try to send message 11: "This should be blocked"
2. Observe behavior

**Expected:**
- [ ] GuestLimitDialog appears
- [ ] Message does NOT send
- [ ] Dialog shows sign-up CTA
- [ ] Cannot send more messages until signed in

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 1.7: Sign In Button Navigation
**Objective:** Verify CTA button works

**Steps:**
1. Click "Sign In" button in SystemMessage
2. Observe navigation

**Expected:**
- [ ] Navigates to /auth page
- [ ] URL changes to http://localhost:8083/auth
- [ ] Auth page loads correctly
- [ ] No errors in console

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

## Test Suite 2: Edge Cases

### Test 2.1: Page Refresh Mid-Session
**Objective:** Verify session persists

**Steps:**
1. Send 3 guest messages
2. Note current counter (should show 7 remaining)
3. Refresh page (Cmd/Ctrl + R)
4. Check localStorage: `localStorage.getItem('vana_guest_session')`

**Expected:**
- [ ] localStorage contains session data
- [ ] Session not expired
- [ ] Counter still shows 7 remaining
- [ ] Message history lost (expected for guests)

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 2.2: Private Browsing Mode
**Objective:** Verify in-memory fallback works

**Steps:**
1. Open private/incognito window
2. Navigate to http://localhost:8083
3. Send guest message

**Expected:**
- [ ] Message sends successfully
- [ ] Counter updates (in-memory)
- [ ] Console warning about localStorage (expected)
- [ ] No crashes or errors
- [ ] SystemMessage appears

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 2.3: Sign In After 5 Messages
**Objective:** Verify conversion flow

**Steps:**
1. Send 5 guest messages
2. Click "Sign In" button
3. Sign in with valid credentials
4. Return to homepage

**Expected:**
- [ ] Session cleared: `localStorage.getItem('vana_guest_session')` === null
- [ ] Counter reset/removed
- [ ] SystemMessage no longer appears
- [ ] Unlimited messages available
- [ ] Previous guest messages NOT saved (expected)

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 2.4: Network Error During Guest Chat
**Objective:** Verify error handling

**Steps:**
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Send guest message

**Expected:**
- [ ] Error toast appears
- [ ] Message NOT marked as sent
- [ ] Counter NOT incremented
- [ ] User can retry when back online

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 2.5: Long Message Content
**Objective:** Verify message length handling

**Steps:**
1. Send message with 5000 characters
2. Observe behavior

**Expected:**
- [ ] Message sends successfully
- [ ] Counter increments
- [ ] No truncation or errors
- [ ] AI responds appropriately

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

## Test Suite 3: Regression Tests (Authenticated Users)

### Test 3.1: Authenticated User Flow
**Objective:** Verify auth users unaffected

**Steps:**
1. Sign in with valid credentials
2. Start new chat session
3. Send messages

**Expected:**
- [ ] No SystemMessage appears
- [ ] No message limit
- [ ] Messages save to database
- [ ] Session persists in sidebar
- [ ] No guest-related UI

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 3.2: Session Creation (Auth Users)
**Objective:** Verify database sessions work

**Steps:**
1. As authenticated user, send first message
2. Check sidebar for new session
3. Refresh page

**Expected:**
- [ ] Session appears in sidebar
- [ ] Messages persist
- [ ] Session has auto-generated title
- [ ] Can click session to load conversation

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 3.3: Artifact Generation (Auth Users)
**Objective:** Verify artifacts still work

**Steps:**
1. As authenticated user, request: "Create a React button component"
2. Observe artifact canvas

**Expected:**
- [ ] Artifact card appears
- [ ] Canvas opens with React component
- [ ] Component renders correctly
- [ ] No interference from guest mode code

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

## Test Suite 4: UI/UX Testing

### Test 4.1: Mobile Responsiveness
**Objective:** Verify mobile experience

**Steps:**
1. Resize browser to mobile (375px width)
2. Send guest messages
3. Observe SystemMessage

**Expected:**
- [ ] SystemMessage responsive
- [ ] Text wraps properly
- [ ] "Sign In" button accessible
- [ ] No horizontal scroll
- [ ] Touch targets adequate (48px min)

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 4.2: Dark Mode
**Objective:** Verify dark theme support

**Steps:**
1. Toggle dark mode in app settings
2. Observe SystemMessage styling

**Expected:**
- [ ] Background: dark:bg-zinc-900
- [ ] Text readable: dark:text-zinc-300
- [ ] Border transparent
- [ ] Button contrast sufficient
- [ ] No visual glitches

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 4.3: Accessibility
**Objective:** Verify a11y compliance

**Steps:**
1. Use keyboard only (Tab, Enter)
2. Navigate to "Sign In" button
3. Activate with Enter key

**Expected:**
- [ ] Button focus visible
- [ ] Keyboard navigation works
- [ ] Screen reader announces text
- [ ] Color contrast WCAG AA compliant

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

## Test Suite 5: Performance Testing

### Test 5.1: Rapid Message Sending
**Objective:** Verify rate limiting/performance

**Steps:**
1. Send 10 messages rapidly (as fast as possible)
2. Observe behavior

**Expected:**
- [ ] All messages process correctly
- [ ] Counter updates accurately
- [ ] No crashes or freezes
- [ ] UI remains responsive

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 5.2: Bundle Size Impact
**Objective:** Verify minimal bundle impact

**Steps:**
1. Check production bundle size
2. Compare with previous build

**Expected:**
- [ ] SystemMessage adds ~3KB (gzipped)
- [ ] No significant increase in load time
- [ ] PWA cache updated correctly

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

## Test Suite 6: Security Testing

### Test 6.1: XSS Prevention
**Objective:** Verify no XSS vulnerabilities

**Steps:**
1. Send message: `<script>alert('XSS')</script>`
2. Observe rendering

**Expected:**
- [ ] Script NOT executed
- [ ] Content escaped/sanitized
- [ ] No alert dialog appears
- [ ] Message displays as text

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 6.2: API Authentication Bypass
**Objective:** Verify auth only bypassed for guests

**Steps:**
1. Open DevTools → Network tab
2. Send guest message
3. Inspect request headers

**Expected:**
- [ ] No Authorization header for guests
- [ ] `isGuest: true` in request body
- [ ] `sessionId: undefined` for guests
- [ ] Backend accepts request

**Actual Result:** _______________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

## Console Error Checks

### Throughout All Tests
- [ ] No JavaScript errors
- [ ] No React warnings
- [ ] No network errors (except offline test)
- [ ] No localStorage quota warnings
- [ ] No unhandled promise rejections

**Console Errors Found:** _______________

---

## Test Summary

**Total Tests:** 25
**Tests Passed:** _____ / 25
**Tests Failed:** _____ / 25
**Tests Blocked:** _____ / 25

**Pass Rate:** _____%

---

## Critical Issues Found

| Issue # | Severity | Description | Steps to Reproduce | Status |
|---------|----------|-------------|-------------------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## Recommendations

Based on testing:

1. **Must Fix (Blocking):**
   - _______________

2. **Should Fix (High Priority):**
   - _______________

3. **Nice to Have (Low Priority):**
   - _______________

---

## Sign-Off

**Tested By:** _______________
**Date:** _______________
**Status:** ⬜ Approved ⬜ Approved with Conditions ⬜ Rejected

**Notes:** _______________

---

## Next Steps

- [ ] Address critical issues
- [ ] Re-test failed scenarios
- [ ] Update documentation
- [ ] Deploy to staging
- [ ] Schedule production deployment

---

**Test Plan Version:** 1.0
**Last Updated:** November 4, 2025
