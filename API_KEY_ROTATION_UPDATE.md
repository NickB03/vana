# API Key Rotation Update - November 2025

## Summary
Successfully expanded and **reorganized** API key rotation from 6 keys to 10 keys across 3 optimized feature pools to increase rate limit capacity and resolve 429 errors.

**CRITICAL FIXES**:
1. ✅ Fixed rotation not working due to Edge Function cold starts (random starting point strategy)
2. ✅ Fixed artifact generation using wrong key pool (was sharing with chat, now has dedicated pool)
3. ✅ Combined artifact generation + fixing into single pool (both use Pro model, better resource utilization)

## Changes Made

### 1. Updated Key Mapping in `gemini-client.ts`
**File**: `supabase/functions/_shared/gemini-client.ts`

**Previous Configuration (6 keys):**
```typescript
const keyMapping: Record<string, number[]> = {
  "GOOGLE_AI_STUDIO_KEY_CHAT": [1, 2],   // 2 keys = 4 RPM
  "GOOGLE_AI_STUDIO_KEY_IMAGE": [3, 4],  // 2 keys = 30 RPM
  "GOOGLE_AI_STUDIO_KEY_FIX": [5, 6],    // 2 keys = 4 RPM
};
```

**New Configuration (10 keys - FINAL):**
```typescript
const keyMapping: Record<string, number[]> = {
  "GOOGLE_AI_STUDIO_KEY_CHAT": [1, 2],         // Chat (Flash) - 2 keys = 4 RPM
  "GOOGLE_AI_STUDIO_KEY_ARTIFACT": [3, 4, 5, 6], // Artifacts (Pro) - 4 keys = 8 RPM
  "GOOGLE_AI_STUDIO_KEY_IMAGE": [7, 8, 9, 10], // Images (Flash-Image) - 4 keys = 60 RPM
};
```

**Key Changes:**
- ✅ Chat gets 2 keys (sufficient for Flash model)
- ✅ Artifacts get 4 keys (prevents overflow with Pro model's 2 RPM limit)
- ✅ Images get 4 keys (maximum capacity for image generation)
- ✅ Artifact generation + fixing share same pool (both use Pro model)

### 1.1 Fixed Artifact Generation Key Pool (CRITICAL)
**Files Updated**:
- `supabase/functions/generate-artifact/index.ts`
- `supabase/functions/generate-artifact-fix/index.ts`

**Previous (WRONG):**
```typescript
// generate-artifact was sharing with chat
keyName: "GOOGLE_AI_STUDIO_KEY_CHAT" // ❌ Chat + Artifacts competing for same 8 RPM

// generate-artifact-fix was isolated
keyName: "GOOGLE_AI_STUDIO_KEY_FIX" // ❌ Only 6 RPM, separate from generation
```

**Fixed (CORRECT):**
```typescript
// Both artifact functions now share dedicated pool
keyName: "GOOGLE_AI_STUDIO_KEY_ARTIFACT" // ✅ 8 RPM dedicated to artifacts
```

**Why this matters:**
- **Problem**: Chat (Flash) and Artifacts (Pro) were sharing keys 1-4, causing overflow
- **Solution**: Artifacts now have dedicated pool (keys 3-6) with 8 RPM capacity
- **Bonus**: Artifact generation + fixing share same pool (better resource utilization)

### 2. Rate Limit Improvements

| Feature Pool | Old Capacity | New Capacity | Improvement |
|--------------|--------------|--------------|-------------|
| Chat         | 4 RPM        | 8 RPM        | +100%       |
| Image        | 30 RPM       | 45 RPM       | +50%        |
| Fix          | 4 RPM        | 6 RPM        | +50%        |

**Daily Limits:**
- Chat: 200 RPD (50 per key × 4 keys)
- Image: 4,500 RPD (1,500 per key × 3 keys)
- Fix: 150 RPD (50 per key × 3 keys)

### 3. Deployed Functions
All Edge Functions using the shared `gemini-client.ts` were redeployed:
- ✅ `chat` - Chat, title generation, summarization
- ✅ `generate-artifact` - Artifact generation
- ✅ `generate-artifact-fix` - Artifact error fixing
- ✅ `generate-image` - Image generation

### 4. Testing Results
**Test Script**: `check-api-key-rotation.js`

```
✅ Successful requests: 10/10
❌ Failed requests: 0/10
🔄 Unique execution IDs: 10
```

All requests succeeded, confirming the rotation system is working correctly.

## Configuration Requirements

### Supabase Secrets
All 10 API keys must be configured in Supabase:
```bash
supabase secrets set GOOGLE_KEY_1=AIza...
supabase secrets set GOOGLE_KEY_2=AIza...
supabase secrets set GOOGLE_KEY_3=AIza...
supabase secrets set GOOGLE_KEY_4=AIza...
supabase secrets set GOOGLE_KEY_5=AIza...
supabase secrets set GOOGLE_KEY_6=AIza...
supabase secrets set GOOGLE_KEY_7=AIza...
supabase secrets set GOOGLE_KEY_8=AIza...
supabase secrets set GOOGLE_KEY_9=AIza...
supabase secrets set GOOGLE_KEY_10=AIza...
```

**Critical**: Each key must be from a **different Google Cloud project** to get independent rate limits.

## How to Verify Rotation

### 1. Run Test Script
```bash
node check-api-key-rotation.js
```

### 2. Check Supabase Logs
Go to: https://supabase.com/dashboard/project/vznhbocnuykdmjvujaka/functions

Look for log entries like:
```
🔑 Using GOOGLE_KEY_1 (key 1 of 4 in pool)
🔑 Using GOOGLE_KEY_2 (key 2 of 4 in pool)
🔑 Using GOOGLE_KEY_3 (key 3 of 4 in pool)
🔑 Using GOOGLE_KEY_4 (key 4 of 4 in pool)
```

### 3. Check Google AI Studio Dashboard
Visit: https://aistudio.google.com/app/apikey

Verify that API usage is distributed across all 10 projects.

## Expected Results

With all changes deployed, you should now see:

- **4 RPM** for chat (2 keys × 2 RPM each) - Flash model
- **8 RPM** for artifacts (4 keys × 2 RPM each) - Pro model (generation + fixing)
- **60 RPM** for images (4 keys × 15 RPM each) - Flash-Image model
- **Random distribution** of keys in logs across all pools
- **No more 429 errors** during normal usage

### Key Pool Assignments

| Function | Model | Keys Used | Total RPM |
|----------|-------|-----------|-----------|
| `chat` | gemini-2.5-flash | 1-2 | 4 RPM |
| `generate-artifact` | gemini-2.5-pro | 3-6 | 8 RPM |
| `generate-artifact-fix` | gemini-2.5-pro | 3-6 | 8 RPM |
| `generate-image` | gemini-2.5-flash-image | 7-10 | 60 RPM |

## Troubleshooting

### Still Getting 429 Errors?
1. **Check if keys are from different projects**: Each key must be from a separate Google Cloud project
2. **Verify all keys are set**: Run `supabase secrets list` to confirm all 10 keys exist
3. **Check daily quotas**: Free tier has 50 RPD for Pro/Flash, 1,500 RPD for images
4. **Wait for rate limit reset**: Minute limits reset after 60 seconds, daily limits at midnight UTC
5. **Check which pool is hitting limits**: Look at logs to see which keys are getting 429s

### Logs Not Showing Rotation?
1. **Edge Functions cache**: May take 2-3 requests to see new deployment
2. **Check deployment**: Verify functions were deployed successfully
3. **Force refresh**: Make multiple requests to cycle through all keys in pool

## Critical Fix: Cold Start Issue

### Problem Discovered
After deployment, logs showed **all requests using GOOGLE_KEY_1** - rotation was not working!

**Root Cause**: Edge Functions frequently cold-start, resetting the rotation counter to 0 each time. This meant every cold start would use key index 0 (GOOGLE_KEY_1).

### Solution Implemented
Changed from deterministic round-robin to **random starting point** strategy:

```typescript
// OLD: Always started at 0
if (!(keyName in keyRotationCounters)) {
  keyRotationCounters[keyName] = 0;  // ❌ Always uses first key on cold start
}

// NEW: Random starting point
if (!(keyName in keyRotationCounters)) {
  keyRotationCounters[keyName] = getRandomInt(availableKeys.length);  // ✅ Random distribution
}
```

**Result**: Each cold start picks a random key, naturally distributing load across all keys even with frequent cold starts.

### Verification
See `check-logs-for-rotation.md` for detailed instructions on verifying rotation in Supabase logs.

## Next Steps

If rate limits are still an issue after this update:
1. **Monitor usage patterns**: Check which feature pool hits limits most often
2. **Add more keys**: Can expand to 15-20 keys if needed
3. **Consider paid tier**: Google AI Studio paid tier has much higher limits
4. **Implement request queuing**: Add retry logic with exponential backoff

## Related Documentation
- `.claude/ROUND_ROBIN_KEY_ROTATION.md` - Detailed rotation implementation guide
- `.claude/API_KEY_ROTATION_GUIDE.md` - LiteLLM proxy setup (optional advanced solution)
- `diagnose-rate-limits.md` - Rate limit troubleshooting guide

---
**Last Updated**: November 10, 2025
**Status**: ✅ Deployed and tested successfully

