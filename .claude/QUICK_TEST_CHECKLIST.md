# Quick Test Checklist - Model Routing Architecture

## Setup (1 minute)
- [ ] Dev server running at http://localhost:8080
- [ ] Browser DevTools open (F12)
- [ ] Console tab visible
- [ ] Network tab visible
- [ ] Supabase Dashboard open: https://supabase.com/dashboard/project/vznhbocnuykdmjvujaka/logs/edge-functions

---

## Test 1: Regular Chat - Flash Model (2 minutes)

### Query
```
What is React and why is it popular?
```

### Quick Check
- [ ] Response appears in 1-3 seconds
- [ ] Text streams smoothly
- [ ] No errors in console
- [ ] Network shows POST to `/functions/v1/chat` only

### Supabase Logs (Optional)
- [ ] Look for: `🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #N of 2`

---

## Test 2: Artifact Generation - Pro Model (3 minutes)

### Query
```
Create a simple todo list app with React
```

### Quick Check
- [ ] Browser console shows: `Artifact generation request detected`
- [ ] Network shows POST to `/functions/v1/generate-artifact`
- [ ] Artifact card appears in chat
- [ ] Click "Open" button on artifact card
- [ ] Artifact renders in canvas panel (right side)
- [ ] No import errors in console (no "@/components/ui/..." errors)
- [ ] Component shows sample todos (not empty)

### Supabase Logs (Optional)
- [ ] Look for: `🔑 Using GOOGLE_AI_STUDIO_KEY_FIX key #N of 2`

---

## Test 3: Image Generation - Image Model (3 minutes)

### Query
```
Generate an image of a serene mountain landscape at sunset
```

### Quick Check
- [ ] Browser console shows: `Image generation request detected`
- [ ] Network shows POST to `/functions/v1/generate-image`
- [ ] Image appears inline in chat
- [ ] Image loads correctly (no broken image icon)

### Supabase Logs (Optional)
- [ ] Look for: `🔑 Using GOOGLE_AI_STUDIO_KEY_IMAGE key #N of 2`

---

## Quick Pass/Fail Assessment

### All tests pass if:
- ✅ All 3 queries work correctly
- ✅ No console errors
- ✅ Correct functions called for each type
- ✅ Response times reasonable

### Common failure modes:
- ❌ Artifact has import errors → Check transformer
- ❌ Wrong function called → Check intent detector
- ❌ Slow responses → Check API keys configured
- ❌ 429 errors → Check rate limits/key rotation

---

## Where to Find Logs

### Browser Console
- DevTools (F12) → Console tab
- Look for: "Artifact generation request detected" or "Image generation request detected"

### Network Tab
- DevTools (F12) → Network tab → Filter: Fetch/XHR
- Look for: `/functions/v1/chat`, `/generate-artifact`, `/generate-image`

### Supabase Function Logs
- Dashboard → Edge Functions → Logs
- Filter by function: chat, generate-artifact, generate-image
- Look for: `🔑 Using GOOGLE_AI_STUDIO_KEY_...` logs

---

## Quick Troubleshooting

| Problem | Quick Fix |
|---------|-----------|
| No key logs visible | Check Supabase Dashboard, not browser console |
| Artifact won't render | Check console for import errors, verify Radix UI usage |
| Wrong model used | Check intent-detector.ts patterns |
| Rate limit errors | Verify all 6 keys set in Supabase secrets |
| Function not found | Ensure functions are deployed to remote Supabase |

---

## Time Estimate
**Total Testing Time**: ~10 minutes
- Setup: 1 min
- Test 1: 2 min
- Test 2: 3 min
- Test 3: 3 min
- Review: 1 min

---

## Report Results

After testing, note:
1. Which tests passed/failed
2. Any console errors
3. Response times
4. Screenshots (optional but helpful)

Share results with team or document in:
- `.claude/MODEL_ROUTING_TEST_RESULTS.md` (create this file)
- Or summarize in chat/Slack

---

*Quick reference for manual testing - see MODEL_ROUTING_TEST_GUIDE.md for detailed instructions*
