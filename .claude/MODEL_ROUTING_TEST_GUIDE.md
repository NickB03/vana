# Model Routing Test Guide - Manual Testing

## Overview
This guide will help you manually test the newly deployed model architecture that uses:
- **gemini-2.5-flash** for regular chat (fast, cost-effective)
- **gemini-2.5-pro** for artifact generation (high quality, complex code)
- **gemini-2.5-flash-preview-image** for image generation

---

## Prerequisites
1. Dev server running: `npm run dev`
2. Browser open at http://localhost:8080
3. Browser DevTools open (F12) with Console tab visible
4. Network tab open to monitor API calls

---

## Test 1: Regular Chat (Flash Model)

### Steps:
1. Open http://localhost:8080 in browser
2. Start a new chat session or click "New Chat"
3. Open DevTools Console (F12 → Console tab)
4. Type this message: **"What is React and why is it popular?"**
5. Press Enter/Send

### What to Check:

#### In Browser Console:
Look for these log entries:
```
✅ API key found, length: 39
Starting chat stream for session: [session-id]
```

#### In Terminal (where npm run dev is running):
Look for Supabase function logs showing:
```
🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2
```

#### In Network Tab (DevTools):
- Look for POST request to `/functions/v1/chat`
- Status should be 200
- Response type: `text/event-stream` (SSE)

### Expected Result:
- Response appears within 1-3 seconds
- Text streams naturally character by character
- No errors in console
- No calls to `/generate-artifact` or `/generate-image`

### Pass Criteria:
- [ ] Response received and displayed correctly
- [ ] Response time < 3 seconds
- [ ] No console errors
- [ ] Chat model logs show GOOGLE_AI_STUDIO_KEY_CHAT

---

## Test 2: Artifact Generation (Pro Model Delegation)

### Steps:
1. In the same chat session (or new one)
2. Clear console (right-click → Clear console)
3. Type this message: **"Create a simple todo list app with React"**
4. Press Enter/Send

### What to Check:

#### In Browser Console:
Look for:
```
Artifact generation request detected (type: react)
```

#### In Terminal (Supabase logs):
Look for:
```
Artifact generation request detected (type: react)
🔑 Using GOOGLE_AI_STUDIO_KEY_FIX key #1 of 2
Artifact generated successfully, length: [X] characters
```

#### In Network Tab:
- Look for POST request to `/functions/v1/generate-artifact`
- Status should be 200
- Response body should contain JSON with `artifactCode` field

#### In Chat UI:
- Artifact card should appear below the response
- Click "Open" button on the artifact card
- Artifact should render in the canvas panel (right side on desktop)
- Look for any React errors in console related to imports

### Expected Result:
- Intent detector recognizes artifact request
- Request delegated to generate-artifact function
- Pro model generates high-quality React component
- Artifact renders without import errors
- Component includes sample data and looks polished

### Pass Criteria:
- [ ] Console log shows "Artifact generation request detected"
- [ ] Network tab shows call to `/generate-artifact`
- [ ] Artifact renders successfully in canvas
- [ ] No import errors (e.g., no "@/components/ui/..." errors)
- [ ] Component has sample data (not empty state)

---

## Test 3: Image Generation (Existing Flow)

### Steps:
1. In the same or new chat session
2. Clear console
3. Type this message: **"Generate an image of a serene mountain landscape at sunset"**
4. Press Enter/Send

### What to Check:

#### In Browser Console:
Look for:
```
Image generation request detected
```

#### In Terminal (Supabase logs):
Look for:
```
Image generation request detected
🔑 Using GOOGLE_AI_STUDIO_KEY_IMAGE key #1 of 2
```

#### In Network Tab:
- Look for POST request to `/functions/v1/generate-image`
- Status should be 200
- Response should contain `imageUrl` field

#### In Chat UI:
- Image should appear inline in the chat
- Image should load and display correctly
- No broken image icon

### Expected Result:
- Intent detector recognizes image request
- Request delegated to generate-image function
- Image generates and uploads to storage
- Image displays inline in chat
- Image URL format: storage.googleapis.com

### Pass Criteria:
- [ ] Console log shows "Image generation request detected"
- [ ] Network tab shows call to `/generate-image`
- [ ] Image generates and displays correctly
- [ ] Image URL points to storage.googleapis.com
- [ ] Response time < 10 seconds

---

## Test 4: Mixed Conversation Flow

### Steps:
1. Start a fresh chat session
2. Test sequence:
   - Regular question: "What are React hooks?"
   - Artifact request: "Create a calculator app"
   - Regular question: "How do I use useState?"
   - Image request: "Generate an image of a futuristic city"

### What to Check:
- Proper routing for each message type
- No model confusion or crossed responses
- Each request uses the appropriate function/model
- Consistent performance across message types

### Pass Criteria:
- [ ] All 4 messages route correctly
- [ ] No errors or failed requests
- [ ] Responses are contextually appropriate
- [ ] Models switch correctly between Flash and Pro

---

## Console Log Analysis

### Expected Log Patterns Summary:

#### Regular Chat (Flash):
```
Request body: {"messages":[...], "sessionId":"..."}
✅ API key found, length: 39
Starting chat stream for session: [session-id]
🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #N of 2
```

#### Artifact Generation (Pro):
```
Artifact generation request detected (type: react)
[In generate-artifact function:]
🔑 Using GOOGLE_AI_STUDIO_KEY_FIX key #N of 2
Artifact generated successfully, length: [N] characters
```

#### Image Generation:
```
Image generation request detected
[In generate-image function:]
🔑 Using GOOGLE_AI_STUDIO_KEY_IMAGE key #N of 2
```

---

## Troubleshooting

### Issue: No key rotation logs visible
**Cause**: Logs appear in Supabase function logs, not browser console
**Solution**: Check terminal where Supabase CLI is running (`supabase functions serve`)

### Issue: Artifact doesn't render
**Possible Causes**:
1. Import errors - Check console for "@/components/ui" errors
2. Transform system not working - Check chat/index.ts transform logs
3. Invalid artifact format - Check artifact XML structure

### Issue: Wrong model being used
**Cause**: Intent detection not working correctly
**Solution**: Check intent-detector.ts logic and test patterns

### Issue: API key errors
**Cause**: Keys not properly configured in environment
**Solution**:
```bash
# Check if keys are set
supabase secrets list

# Set keys if missing
supabase secrets set GOOGLE_KEY_1=your_key_here
supabase secrets set GOOGLE_KEY_2=your_key_here
# ... etc for keys 3-6
```

---

## Success Criteria Summary

All tests should pass with:
- [ ] Regular chat uses Flash model (fast responses)
- [ ] Artifact requests delegate to generate-artifact with Pro model
- [ ] Image requests delegate to generate-image with image model
- [ ] No console errors during any test
- [ ] All artifacts render without import errors
- [ ] Response times within acceptable ranges:
  - Regular chat: < 3s
  - Artifacts: < 10s
  - Images: < 15s
- [ ] Key rotation logs show proper pool usage:
  - GOOGLE_AI_STUDIO_KEY_CHAT for chat
  - GOOGLE_AI_STUDIO_KEY_FIX for artifacts
  - GOOGLE_AI_STUDIO_KEY_IMAGE for images

---

## Recording Results

Copy the results to `/tmp/test_results.md` with:
- Screenshots of each test scenario
- Console log excerpts
- Network tab evidence
- Performance timings
- Any errors encountered

---

## Next Steps After Testing

If all tests pass:
- [ ] Document findings in test results file
- [ ] Create deployment checklist
- [ ] Prepare for production deployment
- [ ] Update monitoring/alerting for new architecture

If tests fail:
- [ ] Document specific failures with screenshots
- [ ] Review error logs for root cause
- [ ] Create fix plan with priority ordering
- [ ] Retest after fixes applied
