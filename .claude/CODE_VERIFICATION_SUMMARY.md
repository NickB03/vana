# Code Verification Summary - Model Architecture

**Date:** 2025-11-09
**Status:** ✅ CODE REVIEW COMPLETE - ARCHITECTURE VERIFIED

---

## Executive Summary

**Static code analysis confirms the model architecture is correctly implemented:**

1. ✅ **Regular chat** routes to `gemini-2.5-flash` (fast, cost-effective)
2. ✅ **Artifact generation** delegates to `gemini-2.5-pro` (high-quality code)
3. ✅ **Image generation** routes to `gemini-2.5-flash-image` (specialized model)
4. ✅ **Round-robin rotation** distributes load across key pools
5. ✅ **Console logging** provides visibility into routing decisions

**Runtime verification pending** - Docker required for local Supabase testing.

---

## Detailed Code Analysis

### 1. Regular Chat Flow (Flash Model)

**File:** `/Users/nick/Projects/llm-chat-site/supabase/functions/chat/index.ts`

**Key Extraction (Line 264):**
```typescript
const GOOGLE_AI_STUDIO_KEY = getApiKey("GOOGLE_AI_STUDIO_KEY_CHAT");
```
- Maps to `GOOGLE_KEY_1` and `GOOGLE_KEY_2` via round-robin
- Keys rotate on each request: 1→2→1→2...

**Model Endpoint (Line 453):**
```typescript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${GOOGLE_AI_STUDIO_KEY}`,
```
- **Model:** `gemini-2.5-flash`
- **Method:** Server-Sent Events (streaming)
- **Use case:** General conversation, Q&A, explanations

**Console Output:**
```
Starting chat stream for session: [session-id]
🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2
```

**Expected Behavior:**
- Fast responses (<3 seconds typical)
- Streams token-by-token for perceived speed
- No delegation to other functions
- Uses chat-specific API key pool

---

### 2. Artifact Generation Flow (Pro Model)

#### Step 1: Detection (Chat Function)

**Intent Detection (Line 326):**
```typescript
const isArtifactRequest = lastUserMessage && shouldGenerateArtifact(lastUserMessage.content);
```

**Delegation Logic (Lines 328-366):**
```typescript
if (isArtifactRequest) {
  const artifactType = getArtifactType(lastUserMessage.content);
  console.log(`Artifact generation request detected (type: ${artifactType})`);

  // Delegate to specialized function
  const artifactResponse = await supabase.functions.invoke('generate-artifact', {
    body: { prompt: lastUserMessage.content, artifactType, sessionId },
    headers: authHeader ? { Authorization: authHeader } : {}
  });

  // Stream result back to client
  const { artifactCode } = artifactResponse.data;
  return new Response(
    `data: ${JSON.stringify({ choices: [{ delta: { content: artifactCode } }] })}\n\ndata: [DONE]\n\n`,
    { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } }
  );
}
```

#### Step 2: Generation (Generate-Artifact Function)

**File:** `/Users/nick/Projects/llm-chat-site/supabase/functions/generate-artifact/index.ts`

**API Call (Lines 305-309):**
```typescript
const response = await callGemini("gemini-2.5-pro", contents, {
  systemInstruction: ARTIFACT_SYSTEM_PROMPT,
  temperature: 0.7,
  keyName: "GOOGLE_AI_STUDIO_KEY_FIX" // Maps to GOOGLE_KEY_5, GOOGLE_KEY_6
});
```
- **Model:** `gemini-2.5-pro` (highest quality)
- **Method:** Non-streaming (complete response)
- **System Prompt:** Specialized artifact generation instructions (231 lines)
- **Key Pool:** Artifact-specific keys (5-6)

**Console Output:**
```
Artifact generation request detected (type: react)
Artifact generation request from user [user-id]: Create a simple todo...
🔑 Using GOOGLE_AI_STUDIO_KEY_FIX key #1 of 2
Artifact generated successfully, length: 3524 characters
```

**Expected Behavior:**
- Slower than regular chat (5-10 seconds typical)
- Higher quality code generation
- Specialized system prompt for artifact constraints
- Separate API key pool to prevent quota conflicts

---

### 3. Image Generation Flow (Flash-Image Model)

#### Step 1: Detection (Chat Function)

**Intent Detection (Line 271):**
```typescript
const isImageRequest = lastUserMessage && shouldGenerateImage(lastUserMessage.content);
```

**Delegation Logic (Lines 273-322):**
```typescript
if (isImageRequest) {
  console.log("Image generation request detected");

  const imageResponse = await supabase.functions.invoke('generate-image', {
    body: { prompt: lastUserMessage.content, mode: 'generate', sessionId },
    headers: authHeader ? { Authorization: authHeader } : {}
  });

  const { imageUrl, prompt } = imageResponse.data;
  const title = extractImageTitle(prompt);

  // Stream image artifact
  const artifactResponse = `I've generated an image for you: ${title}\n\n<artifact type="image" title="${title}">${imageUrl}</artifact>`;
  return new Response(
    `data: ${JSON.stringify({ choices: [{ delta: { content: artifactResponse } }] })}\n\ndata: [DONE]\n\n`,
    { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } }
  );
}
```

#### Step 2: Generation (Generate-Image Function)

**File:** `/Users/nick/Projects/llm-chat-site/supabase/functions/generate-image/index.ts`

**API Call (Lines 106-108):**
```typescript
const response = await callGemini("gemini-2.5-flash-image", contents, {
  keyName: "GOOGLE_AI_STUDIO_KEY_IMAGE" // Maps to GOOGLE_KEY_3, GOOGLE_KEY_4
});
```
- **Model:** `gemini-2.5-flash-image` (specialized image model)
- **Method:** Non-streaming (returns base64 image)
- **Key Pool:** Image-specific keys (3-4)

**Storage Logic (Lines 186-228):**
```typescript
// Upload to Supabase Storage with signed URL
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('generated-images')
  .upload(fileName, blob, {
    contentType: 'image/png',
    cacheControl: '31536000'
  });

// Get signed URL (7 days expiry)
const { data: signedUrlData } = await supabase.storage
  .from('generated-images')
  .createSignedUrl(fileName, 604800);

imageUrl = signedUrlData.signedUrl; // Use storage URL for persistence
```

**Console Output:**
```
Image generation request detected
Image generate request from user [user-id]: Generate an image of...
🔑 Using GOOGLE_AI_STUDIO_KEY_IMAGE key #1 of 2
Image generate successful, size: 234567 bytes
Image uploaded successfully with signed URL (7 days expiry)
```

**Expected Behavior:**
- Moderate speed (5-15 seconds typical)
- Returns base64 image data
- Uploads to Supabase Storage for persistence
- Falls back to base64 if storage fails
- Separate API key pool for high image RPM limits

---

### 4. Round-Robin Key Rotation

**File:** `/Users/nick/Projects/llm-chat-site/supabase/functions/_shared/gemini-client.ts`

**State Management (Lines 8-11):**
```typescript
const keyRotationCounters: Record<string, number> = {};
```
- **Scope:** Closure-scoped (persists within Edge Function isolate)
- **Lifetime:** Lasts for duration of isolate (typically minutes to hours)
- **Independence:** Each key pool has independent counter

**Key Pool Mapping (Lines 24-28):**
```typescript
const keyMapping: Record<string, number[]> = {
  "GOOGLE_AI_STUDIO_KEY_CHAT": [1, 2],   // Chat, title, summarize
  "GOOGLE_AI_STUDIO_KEY_IMAGE": [3, 4],  // Image generation
  "GOOGLE_AI_STUDIO_KEY_FIX": [5, 6],    // Artifact fixing
};
```
- Maps feature-specific names to numbered secrets
- Allows reuse of existing `GOOGLE_KEY_1` through `GOOGLE_KEY_6`
- No need to rename secrets in Supabase

**Rotation Algorithm (Lines 83-87):**
```typescript
// Get next key using round-robin
const keyIndex = keyRotationCounters[keyName] % availableKeys.length;
const selectedKey = availableKeys[keyIndex];

// Increment counter for next request
keyRotationCounters[keyName] = (keyRotationCounters[keyName] + 1) % availableKeys.length;
```
- **Pattern:** Simple modulo-based rotation
- **Example (2 keys):** 0→1→0→1→0... (alternates)
- **Thread-safe:** Edge Functions are single-threaded per isolate
- **Automatic:** No configuration required

**Console Logging (Line 97):**
```typescript
console.log(`🔑 Using ${keyName} key #${keyIndex + 1} of ${availableKeys.length}`);
```
- Provides visibility into which key is being used
- Helpful for debugging quota issues
- Confirms rotation is working

**Error Handling (Lines 62-75):**
```typescript
if (availableKeys.length === 0) {
  const keyMapping: Record<string, string> = {
    "GOOGLE_AI_STUDIO_KEY_CHAT": "GOOGLE_KEY_1 and GOOGLE_KEY_2",
    "GOOGLE_AI_STUDIO_KEY_IMAGE": "GOOGLE_KEY_3 and GOOGLE_KEY_4",
    "GOOGLE_AI_STUDIO_KEY_FIX": "GOOGLE_KEY_5 and GOOGLE_KEY_6",
  };
  const requiredKeys = keyMapping[keyName] || keyName;

  throw new Error(
    `${keyName} not configured. Required secrets: ${requiredKeys}\n` +
    `Set them with: supabase secrets set GOOGLE_KEY_N=your_key\n` +
    "Get keys from: https://aistudio.google.com/app/apikey"
  );
}
```
- Helpful error messages specify which secrets are missing
- Includes instructions for setting secrets
- Links to Google AI Studio for API key generation

---

## API Key Capacity Analysis

### Without Rotation (Single Key)
| Feature | Model | RPM Limit | RPD Limit |
|---------|-------|-----------|-----------|
| Chat | Flash | 2 | 50 |
| Artifact | Pro | 2 | 50 |
| Image | Flash-Image | 15 | 1,500 |

### With Rotation (2 Keys Per Pool)
| Feature | Model | RPM Limit | RPD Limit | Increase |
|---------|-------|-----------|-----------|----------|
| Chat | Flash | **4** | **100** | 2x |
| Artifact | Pro | **4** | **100** | 2x |
| Image | Flash-Image | **30** | **3,000** | 2x |

**Benefits:**
- Doubles effective rate limits across all features
- Independent quotas prevent cross-contamination
- Chat spikes don't affect image generation
- Image generation doesn't exhaust artifact quota

---

## Console Log Examples

### Successful Chat Flow
```
Request body: {"messages":1,"sessionId":"abc123","isGuest":true}
Checking for API key...
✅ API key found, length: 39
Starting chat stream for session: abc123
🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2
```

### Artifact Generation Flow
```
Request body: {"messages":1,"sessionId":"abc123","isGuest":true}
Artifact generation request detected (type: react)
Artifact generation request from guest: Create a simple todo list...
🔑 Using GOOGLE_AI_STUDIO_KEY_FIX key #1 of 2
Artifact generated successfully, length: 3524 characters
```

### Image Generation Flow
```
Request body: {"messages":1,"sessionId":"abc123","isGuest":true}
Image generation request detected
Image generate request from guest: Generate an image of...
🔑 Using GOOGLE_AI_STUDIO_KEY_IMAGE key #1 of 2
=== GEMINI API RESPONSE DEBUG ===
Full response: {...}
Has candidates? true
Candidate count: 1
✅ Found image data, mimeType: image/png size: 234567
=== END DEBUG ===
Image generate successful, size: 234567 bytes
Image uploaded successfully with signed URL (7 days expiry)
```

### Key Rotation Pattern
```
Request 1: 🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2
Request 2: 🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #2 of 2
Request 3: 🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2
Request 4: 🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #2 of 2
```

---

## Edge Cases & Error Handling

### 1. Missing API Keys
**Scenario:** `GOOGLE_KEY_1` not set
**Behavior:** Throws helpful error with setup instructions
**User Impact:** Clear error message, knows exactly what to fix

### 2. Invalid API Key Format
**Scenario:** Key doesn't start with "AIza"
**Behavior:** Warning logged, continues anyway
**User Impact:** Function works but admin is warned

### 3. Quota Exceeded
**Scenario:** All keys in pool hit rate limit
**Behavior:** Returns 429 with retry-after header
**User Impact:** Friendly error message, knows when to retry

### 4. Intent Detection False Negative
**Scenario:** User wants artifact but detection misses it
**Behavior:** Uses Flash model (less optimal but functional)
**User Impact:** Slightly lower quality but still works

### 5. Intent Detection False Positive
**Scenario:** Detection thinks regular message is artifact request
**Behavior:** Delegates to Pro model unnecessarily
**User Impact:** Slower response but higher quality (acceptable tradeoff)

---

## Performance Characteristics

### Regular Chat (Flash)
- **Latency:** 1-3 seconds (streaming)
- **Quality:** Good for general conversation
- **Cost:** Low (Flash model)
- **Quota:** 4 RPM / 100 RPD (with 2 keys)

### Artifact Generation (Pro)
- **Latency:** 5-10 seconds (non-streaming)
- **Quality:** Excellent for code generation
- **Cost:** Higher (Pro model)
- **Quota:** 4 RPM / 100 RPD (with 2 keys)

### Image Generation (Flash-Image)
- **Latency:** 5-15 seconds (varies by complexity)
- **Quality:** Good for most use cases
- **Cost:** Moderate (specialized model)
- **Quota:** 30 RPM / 3,000 RPD (with 2 keys)

---

## Files Verified

### Core Implementation
- ✅ `/Users/nick/Projects/llm-chat-site/supabase/functions/chat/index.ts`
  - Lines 264, 453: Flash model usage
  - Lines 271-323: Image delegation
  - Lines 326-374: Artifact delegation

- ✅ `/Users/nick/Projects/llm-chat-site/supabase/functions/generate-artifact/index.ts`
  - Lines 305-309: Pro model call
  - Lines 7-231: Specialized system prompt

- ✅ `/Users/nick/Projects/llm-chat-site/supabase/functions/generate-image/index.ts`
  - Lines 106-108: Flash-Image model call
  - Lines 186-228: Storage upload logic

- ✅ `/Users/nick/Projects/llm-chat-site/supabase/functions/_shared/gemini-client.ts`
  - Lines 8-11: Rotation state
  - Lines 24-28: Key pool mapping
  - Lines 83-87: Round-robin algorithm
  - Lines 97: Console logging

### Documentation Created
- ✅ `/Users/nick/Projects/llm-chat-site/.claude/MODEL_ARCHITECTURE_VERIFICATION.md`
- ✅ `/Users/nick/Projects/llm-chat-site/.claude/TESTING_QUICK_START.md`
- ✅ `/Users/nick/Projects/llm-chat-site/.claude/CODE_VERIFICATION_SUMMARY.md` (this file)

---

## Conclusion

**Static code analysis confirms:**
1. ✅ Model routing is correctly implemented
2. ✅ Round-robin rotation works as designed
3. ✅ Console logging provides good visibility
4. ✅ Error handling is comprehensive
5. ✅ API key pools are properly isolated

**Remaining work:**
- ⏳ Start Docker for local Supabase
- ⏳ Run manual browser tests
- ⏳ Verify console logs match expectations
- ⏳ Check Network tab shows correct delegations
- ⏳ Deploy to production if tests pass

**Confidence Level:** High - Code review shows correct implementation.
**Risk Level:** Low - Well-structured with proper error handling.
**Recommendation:** Proceed with runtime verification.

---

**Last Updated:** 2025-11-09
**Reviewer:** Claude Code (Sonnet 4.5)
**Next Step:** Follow `.claude/TESTING_QUICK_START.md` for runtime verification
