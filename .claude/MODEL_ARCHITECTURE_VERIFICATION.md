# Model Architecture Verification Report

**Date:** 2025-11-09
**Branch:** feature/litellm-api-key-rotation
**Status:** ✅ CODE REVIEW PASSED - REQUIRES RUNTIME VERIFICATION

---

## Architecture Overview

The application now implements a **multi-model architecture** to optimize for cost, speed, and quality:

| Feature | Model | Endpoint | Key Pool |
|---------|-------|----------|----------|
| **Regular Chat** | `gemini-2.5-flash` | `/chat` | `GOOGLE_AI_STUDIO_KEY_CHAT` (keys 1-2) |
| **Artifact Generation** | `gemini-2.5-pro` | `/generate-artifact` | `GOOGLE_AI_STUDIO_KEY_FIX` (keys 5-6) |
| **Image Generation** | `gemini-2.5-flash-image` | `/generate-image` | `GOOGLE_AI_STUDIO_KEY_IMAGE` (keys 3-4) |

---

## Code Analysis Results

### ✅ 1. Regular Chat (Flash Model)

**File:** `/Users/nick/Projects/llm-chat-site/supabase/functions/chat/index.ts`

**Line 264:** API key retrieval with round-robin rotation
```typescript
const GOOGLE_AI_STUDIO_KEY = getApiKey("GOOGLE_AI_STUDIO_KEY_CHAT");
```

**Line 453:** Model endpoint (Flash model)
```typescript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${GOOGLE_AI_STUDIO_KEY}`,
```

**Expected Console Logs:**
- `"Starting chat stream for session:"`
- `"🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2"` (or #2, alternating)

**Verification:** ✅ Uses Flash model for cost-effective, fast chat responses

---

### ✅ 2. Artifact Generation (Pro Model Delegation)

**Chat Function Delegation (Lines 326-374):**
```typescript
const isArtifactRequest = lastUserMessage && shouldGenerateArtifact(lastUserMessage.content);

if (isArtifactRequest) {
  const artifactType = getArtifactType(lastUserMessage.content);
  console.log(`Artifact generation request detected (type: ${artifactType})`);

  // Call generate-artifact edge function with auth header
  const artifactResponse = await supabase.functions.invoke('generate-artifact', {
    body: { prompt: lastUserMessage.content, artifactType, sessionId },
    headers: authHeader ? { Authorization: authHeader } : {}
  });

  // Stream the artifact response back
  return new Response(
    `data: ${JSON.stringify({ choices: [{ delta: { content: artifactCode } }] })}\n\ndata: [DONE]\n\n`,
    { headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "text/event-stream" } }
  );
}
```

**Generate-Artifact Function (Lines 305-309):**
```typescript
// Call Gemini Pro API with specialized artifact prompt
const response = await callGemini("gemini-2.5-pro", contents, {
  systemInstruction: ARTIFACT_SYSTEM_PROMPT,
  temperature: 0.7,
  keyName: "GOOGLE_AI_STUDIO_KEY_FIX" // Maps to keys 5-6
});
```

**Expected Console Logs:**
- Chat function: `"Artifact generation request detected (type: react)"`
- Generate-artifact: `"🔑 Using GOOGLE_AI_STUDIO_KEY_FIX key #1 of 2"` (or #2)

**Verification:** ✅ Delegates to Pro model for high-quality artifact generation

---

### ✅ 3. Image Generation (Flash-Image Model)

**Chat Function Delegation (Lines 271-323):**
```typescript
const isImageRequest = lastUserMessage && shouldGenerateImage(lastUserMessage.content);

if (isImageRequest) {
  console.log("Image generation request detected");

  const imageResponse = await supabase.functions.invoke('generate-image', {
    body: { prompt: lastUserMessage.content, mode: 'generate', sessionId },
    headers: authHeader ? { Authorization: authHeader } : {}
  });

  // Stream the image artifact back
  return new Response(
    `data: ${JSON.stringify({ choices: [{ delta: { content: artifactResponse } }] })}\n\ndata: [DONE]\n\n`,
    { headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "text/event-stream" } }
  );
}
```

**Generate-Image Function (Lines 106-108):**
```typescript
// Call Gemini image generation API with correct API key
const response = await callGemini("gemini-2.5-flash-image", contents, {
  keyName: "GOOGLE_AI_STUDIO_KEY_IMAGE" // Maps to keys 3-4
});
```

**Expected Console Logs:**
- Chat function: `"Image generation request detected"`
- Generate-image: `"🔑 Using GOOGLE_AI_STUDIO_KEY_IMAGE key #1 of 2"` (or #2)
- Generate-image: `"Image generate successful, size: XXXX bytes"`

**Verification:** ✅ Delegates to Flash-Image model for image generation

---

### ✅ 4. Round-Robin API Key Rotation

**File:** `/Users/nick/Projects/llm-chat-site/supabase/functions/_shared/gemini-client.ts`

**Key Rotation State (Lines 8-11):**
```typescript
const keyRotationCounters: Record<string, number> = {};
```
**Closure-scoped state** persists across function invocations within the same Edge Function isolate.

**Key Mapping (Lines 24-28):**
```typescript
const keyMapping: Record<string, number[]> = {
  "GOOGLE_AI_STUDIO_KEY_CHAT": [1, 2],   // Chat uses keys 1-2
  "GOOGLE_AI_STUDIO_KEY_IMAGE": [3, 4],  // Images use keys 3-4
  "GOOGLE_AI_STUDIO_KEY_FIX": [5, 6],    // Artifacts use keys 5-6
};
```

**Rotation Logic (Lines 83-87):**
```typescript
// Get next key using round-robin
const keyIndex = keyRotationCounters[keyName] % availableKeys.length;
const selectedKey = availableKeys[keyIndex];

// Increment counter for next request
keyRotationCounters[keyName] = (keyRotationCounters[keyName] + 1) % availableKeys.length;
```

**Expected Console Logs:**
```
🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2
🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #2 of 2
🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2  // Cycles back
```

**Verification:** ✅ Round-robin rotation implemented correctly

---

## Manual Testing Checklist

### TEST 1: Regular Chat (Flash Model)
1. Navigate to http://localhost:8080
2. Click "Start New Chat" or use existing session
3. **Open browser DevTools Console** (F12 → Console tab)
4. Clear console for clean logs
5. Send message: `"What is React and why is it popular?"`
6. Wait for streaming response
7. **Verify console logs:**
   - ✅ "Starting chat stream for session"
   - ✅ "🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #X of 2"
   - ❌ No "Artifact generation request detected"
   - ❌ No "Image generation request detected"
8. **Check Network tab:**
   - ✅ POST to `/functions/v1/chat`
   - ❌ No calls to `/generate-artifact` or `/generate-image`
9. Take screenshot of response
10. Note approximate response time (should be fast, <3 seconds)

**Expected Result:** Fast response using Flash model, NO delegation

---

### TEST 2: Artifact Generation (Pro Model Delegation)
1. In same session, clear console
2. Send message: `"Create a simple todo list app with React"`
3. Wait for response (will take longer than regular chat)
4. **Verify console logs:**
   - ✅ "Artifact generation request detected (type: react)"
   - ✅ Call to `/generate-artifact` function
   - ✅ "🔑 Using GOOGLE_AI_STUDIO_KEY_FIX key #X of 2"
5. **Check Network tab:**
   - ✅ POST to `/functions/v1/chat` (initial detection)
   - ✅ POST to `/functions/v1/generate-artifact` (delegation)
6. **Verify artifact renders:**
   - ✅ Artifact container appears in UI
   - ✅ React component renders without errors
   - ❌ No "@/" import errors in console
   - ✅ Interactive functionality works (add/delete/check tasks)
7. Take screenshot of rendered artifact
8. Note response time (slower than Flash, ~5-10 seconds)

**Expected Result:** High-quality React artifact using Pro model

---

### TEST 3: Image Generation (Flash-Image Model)
1. Clear console
2. Send message: `"Generate an image of a serene mountain landscape at sunset"`
3. Wait for response
4. **Verify console logs:**
   - ✅ "Image generation request detected"
   - ✅ Call to `/generate-image` function
   - ✅ "🔑 Using GOOGLE_AI_STUDIO_KEY_IMAGE key #X of 2"
   - ✅ "Image generate successful, size: XXXX bytes"
5. **Check Network tab:**
   - ✅ POST to `/functions/v1/chat` (initial detection)
   - ✅ POST to `/functions/v1/generate-image` (delegation)
6. **Verify image displays:**
   - ✅ Image artifact appears in chat
   - ✅ Image loads (no broken image icon)
   - ✅ Image is relevant to prompt
7. Take screenshot
8. Note response time (~5-15 seconds)

**Expected Result:** Image artifact using Flash-Image model

---

### TEST 4: Round-Robin Rotation
1. Send 4 regular chat messages in sequence:
   - "What is TypeScript?"
   - "Explain React hooks"
   - "What is Tailwind CSS?"
   - "Describe Next.js"
2. **Check console logs for key rotation:**
   - Request 1: `"🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2"`
   - Request 2: `"🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #2 of 2"`
   - Request 3: `"🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2"`
   - Request 4: `"🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #2 of 2"`

**Expected Result:** Keys alternate in round-robin fashion

---

### TEST 5: Error Handling
1. **Test with invalid key (requires temporary config change):**
   - Expected: Helpful error message mentioning which secrets to configure
   - Should NOT crash the application

2. **Test with quota exceeded:**
   - Expected: 429 status with retry-after header
   - User sees friendly error message

---

## Environment Configuration

### Required Secrets (Supabase)
```bash
# Chat pool (keys 1-2)
GOOGLE_KEY_1=AIzaSy...  # Chat key 1
GOOGLE_KEY_2=AIzaSy...  # Chat key 2

# Image pool (keys 3-4)
GOOGLE_KEY_3=AIzaSy...  # Image key 1
GOOGLE_KEY_4=AIzaSy...  # Image key 2

# Artifact pool (keys 5-6)
GOOGLE_KEY_5=AIzaSy...  # Artifact key 1
GOOGLE_KEY_6=AIzaSy...  # Artifact key 2
```

### Verify Secrets Are Set
```bash
supabase secrets list
```

Should show:
- GOOGLE_KEY_1 through GOOGLE_KEY_6
- All keys start with "AIza"
- All keys are ~39 characters

---

## Known Issues / Edge Cases

### 1. Artifact Import Warnings
**Issue:** AI might still suggest `@/` imports despite system prompt restrictions
**Mitigation:** Multi-layer defense system (pre-gen validation + post-gen transformation)
**Verification:** Check console for "🔧 Auto-fixed artifact imports" logs

### 2. Image Storage Fallback
**Issue:** Image storage might fail for guests or with permissions issues
**Mitigation:** Falls back to base64 data URLs with warning
**Verification:** Check for `storageWarning` in image response

### 3. Rate Limiting
**Issue:** Free tier rate limits (2-15 RPM) can be restrictive
**Mitigation:** Round-robin rotation doubles capacity (4-30 RPM)
**Verification:** Check for 429 errors under heavy load

---

## Success Criteria

### Code Review: ✅ PASSED
- [x] Chat function uses Flash model (`gemini-2.5-flash`)
- [x] Artifact generation delegates to Pro model (`gemini-2.5-pro`)
- [x] Image generation uses Flash-Image model (`gemini-2.5-flash-image`)
- [x] Round-robin rotation implemented correctly
- [x] Key pools mapped to separate features (chat, image, artifact)
- [x] Console logging includes key rotation info
- [x] Error handling with helpful messages
- [x] Guest support maintained

### Runtime Verification: ⏳ PENDING
- [ ] Regular chat uses Flash model (verify via console logs)
- [ ] Artifact generation delegates to Pro model
- [ ] Image generation uses Flash-Image model
- [ ] Key rotation cycles correctly (1→2→1→2...)
- [ ] No console errors during any test
- [ ] Artifacts render without import errors
- [ ] Images display correctly
- [ ] Response times are reasonable (Flash <3s, Pro <10s, Image <15s)

---

## Deployment Verification

Before marking deployment complete:

1. **Start local dev server:**
   ```bash
   npm run dev
   ```

2. **Start Supabase (requires Docker):**
   ```bash
   supabase start
   ```

3. **Run manual tests** following checklist above

4. **Check console logs** match expected patterns

5. **Verify Network requests** show correct delegation

6. **Test edge cases** (rate limiting, errors, etc.)

---

## Files Modified

### Core Architecture
- ✅ `/supabase/functions/chat/index.ts` (Flash model, delegation logic)
- ✅ `/supabase/functions/generate-artifact/index.ts` (Pro model)
- ✅ `/supabase/functions/generate-image/index.ts` (Flash-Image model)
- ✅ `/supabase/functions/_shared/gemini-client.ts` (Round-robin rotation)

### Documentation
- ✅ `.claude/MODEL_ARCHITECTURE_VERIFICATION.md` (this file)
- ✅ `CLAUDE.md` (updated with rotation info)

---

## Next Steps

1. ✅ **Code review complete** - Architecture verified via static analysis
2. ⏳ **Start Docker** - Required for Supabase local development
3. ⏳ **Run manual tests** - Follow checklist above
4. ⏳ **Deploy to production** - If all tests pass
5. ⏳ **Monitor production logs** - Verify rotation in real-world usage

---

**Last Updated:** 2025-11-09
**Reviewed By:** Claude Code (Sonnet 4.5)
**Status:** Ready for runtime verification
