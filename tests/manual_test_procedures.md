# Manual Test Procedures for Chat Actions Integration

## Overview

This document provides comprehensive manual test procedures for validating the chat actions integration in Phase 3. These tests should be performed in addition to the automated test suites to ensure complete functionality validation.

## Prerequisites

### Environment Setup
1. **Backend Server**: Ensure backend is running on port 8000
   ```bash
   cd app && python -m uvicorn server:app --reload --port 8000
   ```

2. **Frontend Server**: Ensure frontend is running on port 3000
   ```bash
   cd frontend && npm run dev
   ```

3. **Environment Variables**: Verify required environment variables are set
   - `GOOGLE_API_KEY`: Valid Google API key for Gemini model
   - `NODE_ENV`: Set to "development" for testing
   - `ALLOW_ORIGINS`: Should include "http://localhost:3000"

4. **Test Data**: Create a test session with sample messages

## Test Suite 1: Message Edit Functionality

### Test 1.1: Basic Edit Mode
**Objective**: Verify edit button opens edit mode with current content

**Steps**:
1. Navigate to chat interface with existing messages
2. Hover over a user message to reveal action buttons
3. Click the "Edit" button (pencil icon)
4. **Verify**:
   - Message content becomes editable (textarea appears)
   - Current message content is pre-populated
   - Save and Cancel buttons are visible
   - Other action buttons are hidden

**Expected Result**: Edit mode opens successfully with correct content

---

### Test 1.2: Save Edit Operation
**Objective**: Verify save edit sends PUT request and updates via SSE

**Steps**:
1. Follow Test 1.1 to enter edit mode
2. Modify the message content (e.g., add "EDITED: " prefix)
3. Click "Save" button
4. **Verify**:
   - PUT request sent to `/api/messages/{message_id}` endpoint
   - Loading indicator appears briefly
   - Message content updates to new text
   - Edit mode closes, returning to normal view
   - SSE event received for message update
   - Message shows "edited" indicator if applicable

**Expected Result**: Message saves successfully and updates in real-time

---

### Test 1.3: Cancel Edit Operation
**Objective**: Verify cancel edit reverts to normal view

**Steps**:
1. Follow Test 1.1 to enter edit mode
2. Modify the message content significantly
3. Click "Cancel" button
4. **Verify**:
   - Edit mode closes immediately
   - Original message content is preserved (no changes saved)
   - Normal action buttons reappear
   - No API request is sent

**Expected Result**: Edit is cancelled with no changes persisted

---

### Test 1.4: Edit with Regeneration Trigger
**Objective**: Test edit functionality that triggers assistant message regeneration

**Steps**:
1. Edit a user message that has an assistant response below it
2. Enable "Trigger regeneration" option if available
3. Save the edit
4. **Verify**:
   - User message updates correctly
   - Subsequent assistant message begins regenerating
   - Progress indicators appear for regeneration
   - New assistant response replaces old one
   - SSE events received for both edit and regeneration

**Expected Result**: Edit triggers successful regeneration of assistant response

---

## Test Suite 2: Message Delete Functionality

### Test 2.1: Delete Confirmation Dialog
**Objective**: Verify delete shows confirmation before removing messages

**Steps**:
1. Hover over any message to reveal action buttons
2. Click the "Delete" button (trash icon)
3. **Verify**:
   - Confirmation dialog appears
   - Dialog explains deletion will also remove subsequent messages
   - "Confirm" and "Cancel" options are available
   - Message count to be deleted is displayed

**Expected Result**: Confirmation dialog appears with clear warning

---

### Test 2.2: Confirmed Delete Operation
**Objective**: Verify confirmed delete removes messages correctly

**Steps**:
1. Follow Test 2.1 to show confirmation dialog
2. Click "Confirm" in the dialog
3. **Verify**:
   - DELETE request sent to `/api/messages/{message_id}` endpoint
   - Target message and all subsequent messages are removed
   - Chat interface updates immediately
   - SSE event received for deletion
   - Message count updates correctly

**Expected Result**: Messages are deleted successfully

---

### Test 2.3: Cancelled Delete Operation
**Objective**: Verify cancelled delete preserves messages

**Steps**:
1. Follow Test 2.1 to show confirmation dialog
2. Click "Cancel" in the dialog
3. **Verify**:
   - Confirmation dialog closes
   - No messages are removed
   - No API request is sent
   - All messages remain unchanged

**Expected Result**: Delete is cancelled with no changes

---

### Test 2.4: Delete Message Chain
**Objective**: Test deletion of message with subsequent responses

**Steps**:
1. Select a user message that has assistant responses below it
2. Initiate delete operation
3. Confirm deletion
4. **Verify**:
   - Original message and all subsequent messages are removed
   - Conversation history is truncated at deletion point
   - Message numbering/ordering remains consistent

**Expected Result**: Entire message chain from deletion point onwards is removed

---

## Test Suite 3: Upvote/Downvote Functionality

### Test 3.1: Upvote Toggle
**Objective**: Verify upvote button toggles correctly and persists

**Steps**:
1. Locate an assistant message
2. Click the "Upvote" button (thumbs up icon)
3. **Verify**:
   - Button becomes highlighted/active
   - POST request sent to `/api/messages/{message_id}/feedback`
   - Upvote count increases if visible
   - Button state persists on page refresh

**Expected Result**: Upvote is registered and persists correctly

---

### Test 3.2: Downvote Toggle
**Objective**: Verify downvote button toggles correctly and persists

**Steps**:
1. Locate an assistant message
2. Click the "Downvote" button (thumbs down icon)
3. **Verify**:
   - Button becomes highlighted/active
   - POST request sent to feedback endpoint
   - Downvote count increases if visible
   - Button state persists on page refresh

**Expected Result**: Downvote is registered and persists correctly

---

### Test 3.3: Vote Switching
**Objective**: Test switching between upvote and downvote

**Steps**:
1. Upvote a message (following Test 3.1)
2. Click the downvote button
3. **Verify**:
   - Upvote becomes inactive
   - Downvote becomes active
   - Appropriate API requests are sent
   - Counts update correctly

**Expected Result**: Vote switches successfully between up and down

---

### Test 3.4: Vote Removal
**Objective**: Test removing a vote by clicking the same button

**Steps**:
1. Upvote a message
2. Click the upvote button again
3. **Verify**:
   - Upvote becomes inactive/unselected
   - API request sent to remove feedback
   - Vote count decreases

**Expected Result**: Vote is successfully removed

---

## Test Suite 4: Message Regeneration

### Test 4.1: Basic Regeneration
**Objective**: Verify regenerate starts and completes successfully

**Steps**:
1. Locate an assistant message
2. Click the "Regenerate" button (refresh icon)
3. **Verify**:
   - POST request sent to `/api/messages/{message_id}/regenerate`
   - Message content clears or shows loading state
   - Progress indicators appear
   - SSE events received for regeneration progress
   - New content gradually appears or appears at completion

**Expected Result**: Message regenerates with new content

---

### Test 4.2: Regeneration Thought Process
**Objective**: Verify regeneration shows thought process and progress

**Steps**:
1. Start regeneration as in Test 4.1
2. Monitor the regeneration process
3. **Verify**:
   - Progress bar or percentage indicator appears
   - Status messages show processing steps (e.g., "Processing query...", "Generating response...")
   - Partial content may stream in real-time
   - Process completes with full new response

**Expected Result**: Detailed progress is shown throughout regeneration

---

### Test 4.3: Regeneration with Gemini Model
**Objective**: Verify Gemini integration works properly

**Steps**:
1. Ensure GOOGLE_API_KEY is configured
2. Regenerate a message that requires complex reasoning
3. **Verify**:
   - Regeneration completes successfully
   - Generated content is coherent and relevant
   - Response quality is appropriate for a Gemini model
   - No API errors occur

**Expected Result**: Gemini model generates high-quality response

---

### Test 4.4: Regeneration Error Handling
**Objective**: Test regeneration error scenarios

**Steps**:
1. Temporarily disable API key or network
2. Attempt regeneration
3. **Verify**:
   - Error message appears
   - Original message content is preserved
   - User can retry the operation
   - No partial or corrupted content remains

**Expected Result**: Errors are handled gracefully with clear feedback

---

## Test Suite 5: Real-time SSE Updates

### Test 5.1: SSE Connection Establishment
**Objective**: Verify SSE connection establishes correctly

**Steps**:
1. Open chat interface
2. Open browser developer tools, Network tab
3. Look for EventSource connection
4. **Verify**:
   - SSE connection to `/agent_network_sse/{session_id}` established
   - Connection status shows as "open"
   - Initial connection event received
   - Heartbeat events received periodically

**Expected Result**: SSE connection established and maintained

---

### Test 5.2: Real-time Edit Updates
**Objective**: Verify edit operations trigger real-time updates

**Steps**:
1. Have two browser tabs open to the same session
2. Edit a message in tab 1
3. **Verify** in tab 2:
   - Message content updates immediately
   - No page refresh required
   - Edit indicator appears if applicable

**Expected Result**: Edit updates appear in real-time across all clients

---

### Test 5.3: Real-time Delete Updates
**Objective**: Verify delete operations trigger real-time updates

**Steps**:
1. Have two browser tabs open to the same session
2. Delete a message in tab 1
3. **Verify** in tab 2:
   - Message disappears immediately
   - Subsequent messages are also removed if applicable
   - Message ordering remains correct

**Expected Result**: Delete updates appear in real-time across all clients

---

### Test 5.4: Real-time Regeneration Updates
**Objective**: Verify regeneration progress appears in real-time

**Steps**:
1. Have two browser tabs open to the same session
2. Start regeneration in tab 1
3. **Verify** in tab 2:
   - Regeneration progress appears
   - Progress updates stream in real-time
   - Final content appears when complete

**Expected Result**: Regeneration progress appears in real-time across all clients

---

## Test Suite 6: Integration and CORS

### Test 6.1: CORS Configuration
**Objective**: Verify CORS allows frontend requests

**Steps**:
1. Open browser developer tools, Console tab
2. Perform any chat action
3. **Verify**:
   - No CORS errors appear in console
   - Requests complete successfully
   - Proper CORS headers are present in response

**Expected Result**: No CORS issues, all requests succeed

---

### Test 6.2: Authentication Headers
**Objective**: Test authentication if applicable

**Steps**:
1. If authentication is enabled, ensure valid token
2. Perform chat actions
3. **Verify**:
   - Requests include proper Authorization headers
   - Server accepts authenticated requests
   - Proper user context is maintained

**Expected Result**: Authentication works correctly

---

### Test 6.3: Backend Health Check
**Objective**: Verify backend is properly configured

**Steps**:
1. Navigate to http://localhost:8000/health
2. **Verify**:
   - Returns HTTP 200 status
   - Shows "healthy" status
   - Google API is configured (if applicable)
   - All dependencies are available

**Expected Result**: Backend health check passes

---

## Test Suite 7: Error Handling

### Test 7.1: Network Failure Handling
**Objective**: Test behavior during network issues

**Steps**:
1. Disconnect network or block backend requests
2. Attempt various chat actions
3. **Verify**:
   - Appropriate error messages appear
   - Actions fail gracefully
   - UI remains responsive
   - Retry options are available if applicable

**Expected Result**: Network failures are handled gracefully

---

### Test 7.2: Server Error Handling
**Objective**: Test behavior during server errors

**Steps**:
1. Trigger server error (invalid message ID, etc.)
2. **Verify**:
   - User-friendly error messages appear
   - Technical error details are hidden from user
   - Actions can be retried
   - Application state remains consistent

**Expected Result**: Server errors are handled with good user experience

---

### Test 7.3: Invalid Data Handling
**Objective**: Test handling of malformed or invalid data

**Steps**:
1. Edit a message with extremely long content
2. Try various edge cases (empty content, special characters)
3. **Verify**:
   - Input validation works properly
   - Appropriate error messages for validation failures
   - No data corruption occurs

**Expected Result**: Invalid data is handled with proper validation

---

## Test Suite 8: Performance and Responsiveness

### Test 8.1: Action Response Time
**Objective**: Verify actions complete in reasonable time

**Steps**:
1. Perform all types of actions (edit, delete, regenerate, vote)
2. Measure response times
3. **Verify**:
   - Edit/delete actions complete within 1-2 seconds
   - Regeneration starts within 2-3 seconds
   - UI remains responsive during operations
   - No blocking of other interactions

**Expected Result**: All actions are performant and responsive

---

### Test 8.2: Large Content Handling
**Objective**: Test handling of large message content

**Steps**:
1. Create or edit messages with large content (several paragraphs)
2. Test all actions on large messages
3. **Verify**:
   - Actions work correctly regardless of content size
   - UI doesn't break with large content
   - Scrolling and display work properly

**Expected Result**: Large content is handled efficiently

---

### Test 8.3: Concurrent Operations
**Objective**: Test multiple simultaneous operations

**Steps**:
1. Have multiple browser tabs open
2. Perform actions simultaneously in different tabs
3. **Verify**:
   - All operations complete successfully
   - No conflicts or race conditions
   - State remains consistent across tabs

**Expected Result**: Concurrent operations work without conflicts

---

## Test Suite 9: Mobile and Accessibility

### Test 9.1: Mobile Responsiveness
**Objective**: Verify functionality works on mobile devices

**Steps**:
1. Open chat interface in mobile browser or use browser dev tools mobile view
2. Test all chat actions on mobile
3. **Verify**:
   - Action buttons are appropriately sized for touch
   - Edit mode works with mobile keyboards
   - Confirmations work with touch interactions
   - Layout remains functional

**Expected Result**: Full functionality available on mobile devices

---

### Test 9.2: Keyboard Navigation
**Objective**: Test keyboard accessibility

**Steps**:
1. Navigate using only keyboard (Tab, Enter, Escape keys)
2. Test all actions via keyboard
3. **Verify**:
   - All buttons are focusable
   - Actions can be triggered with keyboard
   - Focus indicators are visible
   - Logical tab order

**Expected Result**: Full keyboard accessibility

---

### Test 9.3: Screen Reader Compatibility
**Objective**: Test with assistive technologies

**Steps**:
1. Use screen reader software or browser accessibility tools
2. Test action announcements
3. **Verify**:
   - Actions are properly announced
   - State changes are communicated
   - Error messages are accessible
   - Proper ARIA labels are present

**Expected Result**: Good screen reader experience

---

## Test Completion Checklist

### Functional Tests Complete
- [ ] Edit mode opens with current content
- [ ] Save edit sends PUT request and updates via SSE
- [ ] Cancel edit reverts to normal view
- [ ] Delete shows confirmation and removes messages
- [ ] Upvote/Downvote toggle correctly and persist
- [ ] Regenerate shows thought process and updates content
- [ ] All SSE events update UI in real-time

### Integration Tests Complete
- [ ] Frontend connects to backend on port 8000
- [ ] CORS is properly configured
- [ ] Authentication headers work (if applicable)
- [ ] Error states are handled gracefully
- [ ] Network failures show appropriate messages

### Model Integration Tests Complete
- [ ] Gemini model integration works properly
- [ ] API key validation successful
- [ ] Content generation quality is acceptable
- [ ] Error handling for model failures works

### Performance Tests Complete
- [ ] Actions complete in reasonable time
- [ ] Large content is handled efficiently
- [ ] Concurrent operations work without issues

### Accessibility Tests Complete
- [ ] Mobile responsiveness verified
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility confirmed

## Issues Found

Document any issues found during manual testing:

| Test | Issue Description | Severity | Status |
|------|------------------|----------|---------|
| e.g., Test 1.2 | Edit save button not responding | High | Fixed |
| | | | |

## Test Environment Details

**Date**: _________
**Tester**: _________
**Backend Version**: _________
**Frontend Version**: _________
**Browser**: _________
**OS**: _________

## Sign-off

**Manual Testing Complete**: [ ]
**All Critical Issues Resolved**: [ ]
**Ready for Production**: [ ]

**Tester Signature**: _________
**Date**: _________