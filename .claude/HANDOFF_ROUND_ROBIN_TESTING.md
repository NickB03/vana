# 🔄 Handoff: Round-Robin API Key Rotation - Testing & Deployment

**Date:** November 9, 2025  
**Branch:** `feature/litellm-api-key-rotation`  
**Status:** ✅ Code Complete - Ready for Testing & Deployment

---

## 📋 Context

We've implemented lightweight round-robin API key rotation directly in Supabase Edge Functions to increase Google Gemini API rate limits by 2x without requiring external infrastructure.

**What's Done:**
- ✅ Round-robin rotation logic implemented in `_shared/gemini-client.ts`
- ✅ All 5 functions updated to use rotation
- ✅ 6 API keys already set in Supabase secrets (`GOOGLE_KEY_1` through `GOOGLE_KEY_6`)
- ✅ Code committed to feature branch
- ✅ Documentation complete

**What's Needed:**
- 🔲 Map the 6 existing keys to correct key pools
- 🔲 Deploy functions to production
- 🔲 Test rotation is working
- 🔲 Verify 2x capacity increase

---

## 🎯 Your Mission

### **Step 1: Map Existing Keys to Pools**

The 6 keys are currently named `GOOGLE_KEY_1` through `GOOGLE_KEY_6`. We need to rename them to match our key pool structure:

**Required Mapping:**
```bash
# Chat pool (2 keys) - For chat, title, summary
GOOGLE_AI_STUDIO_KEY_CHAT_1 = GOOGLE_KEY_1
GOOGLE_AI_STUDIO_KEY_CHAT_2 = GOOGLE_KEY_2

# Image pool (2 keys) - For image generation
GOOGLE_AI_STUDIO_KEY_IMAGE_1 = GOOGLE_KEY_3
GOOGLE_AI_STUDIO_KEY_IMAGE_2 = GOOGLE_KEY_4

# Fix pool (2 keys) - For artifact fixing
GOOGLE_AI_STUDIO_KEY_FIX_1 = GOOGLE_KEY_5
GOOGLE_AI_STUDIO_KEY_FIX_2 = GOOGLE_KEY_6
```

**Commands to Run:**
```bash
# Get the actual key values (you'll need these)
npx supabase secrets list

# For each key, get the value and set with new name
# Example workflow:
# 1. Get GOOGLE_KEY_1 value from Supabase dashboard or CLI
# 2. Set it with new name:
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_CHAT_1=AIzaSy...actual_key_value
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_CHAT_2=AIzaSy...actual_key_value
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_IMAGE_1=AIzaSy...actual_key_value
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_IMAGE_2=AIzaSy...actual_key_value
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_FIX_1=AIzaSy...actual_key_value
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_FIX_2=AIzaSy...actual_key_value

# Optional: Delete old keys after verification
# npx supabase secrets unset GOOGLE_KEY_1
# npx supabase secrets unset GOOGLE_KEY_2
# ... etc
```

---

### **Step 2: Deploy Functions**

Deploy all 5 functions that use the rotation logic:

```bash
# Deploy all functions
npx supabase functions deploy chat
npx supabase functions deploy generate-image
npx supabase functions deploy generate-artifact-fix
npx supabase functions deploy generate-title
npx supabase functions deploy summarize-conversation

# Verify deployments
npx supabase functions list
```

**Expected Output:**
- All 5 functions should show as deployed
- No deployment errors

---

### **Step 3: Test Rotation is Working**

#### **Test 1: Chat Function (CHAT pool)**

```bash
# Start tailing logs
npx supabase functions logs chat --tail

# In another terminal, test the chat endpoint
# (Use your production URL or test locally)
```

**What to Look For:**
```
🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2
🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #2 of 2
🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2  # Should rotate back
```

#### **Test 2: Image Generation (IMAGE pool)**

```bash
# Tail image generation logs
npx supabase functions logs generate-image --tail

# Test image generation through the app
# Ask: "generate an image of a sunset"
```

**What to Look For:**
```
🔑 Using GOOGLE_AI_STUDIO_KEY_IMAGE key #1 of 2
🔑 Using GOOGLE_AI_STUDIO_KEY_IMAGE key #2 of 2
```

#### **Test 3: Artifact Fixing (FIX pool)**

```bash
# Tail artifact fix logs
npx supabase functions logs generate-artifact-fix --tail

# Test by generating an artifact with an error and requesting a fix
```

**What to Look For:**
```
🔑 Using GOOGLE_AI_STUDIO_KEY_FIX key #1 of 2
🔑 Using GOOGLE_AI_STUDIO_KEY_FIX key #2 of 2
```

---

### **Step 4: Verify Capacity Increase**

**Before Rotation:**
- Chat: 2 RPM (requests per minute)
- Image: 15 RPM
- Fix: 2 RPM

**After Rotation (Expected):**
- Chat: 4 RPM (2x increase)
- Image: 30 RPM (2x increase)
- Fix: 4 RPM (2x increase)

**How to Test:**
1. Send rapid requests to chat (5-10 in quick succession)
2. Check for 429 errors (should be rare or none)
3. Verify logs show rotation between keys
4. Compare to previous behavior (should handle more load)

---

### **Step 5: Production Verification**

**Checklist:**
- [ ] All 6 keys renamed to correct pool names
- [ ] All 5 functions deployed successfully
- [ ] Chat rotation working (logs show key #1 and #2)
- [ ] Image rotation working (logs show key #1 and #2)
- [ ] Fix rotation working (logs show key #1 and #2)
- [ ] No 429 errors during normal usage
- [ ] App functions normally (chat, images, artifacts all work)

---

## 🐛 Troubleshooting

### **Issue: "GOOGLE_AI_STUDIO_KEY_CHAT not configured"**

**Cause:** Keys not renamed yet  
**Fix:** Complete Step 1 (rename keys)

### **Issue: "key #1 of 1" (only 1 key detected)**

**Cause:** Only base key set, numbered keys missing  
**Fix:** Ensure both `_1` and `_2` keys are set for each pool

### **Issue: No rotation logs appearing**

**Cause:** Old function code still deployed  
**Fix:** Redeploy functions (Step 2)

### **Issue: 429 errors still occurring**

**Possible Causes:**
1. Keys from same Google account (not independent quotas)
2. Keys not properly rotated
3. Extremely high traffic exceeding even doubled limits

**Fix:** Verify keys are from different Google accounts

---

## 📚 Reference Documentation

- **Implementation Guide:** `.claude/ROUND_ROBIN_KEY_ROTATION.md`
- **Deployment Checklist:** `.claude/ROUND_ROBIN_IMPLEMENTATION_SUMMARY.md`
- **Main Docs:** `CLAUDE.md` (search for "Round-Robin")
- **Code:** `supabase/functions/_shared/gemini-client.ts` (lines 7-88)

---

## 🎯 Success Criteria

**You're done when:**
1. ✅ All 6 keys renamed to pool structure
2. ✅ All 5 functions deployed
3. ✅ Logs show rotation messages for all 3 pools
4. ✅ No 429 errors during testing
5. ✅ App works normally in production

---

## 📝 Notes for Next Agent

**Key Insights:**
- The rotation logic is **per-isolate**, not global. Each Edge Function instance maintains its own counter. This is fine - it still distributes load effectively.
- Keys must be from **different Google accounts** to get independent quotas.
- The `getApiKey()` function automatically discovers keys with `_1`, `_2`, `_3` suffixes - no hardcoding needed.
- If you need more capacity later, just add `_3` keys and redeploy - automatic discovery!

**Optional Enhancements:**
- Add retry logic for 429 errors (currently not implemented)
- Add metrics tracking for rotation effectiveness
- Consider LiteLLM if you need response caching (see `LITELLM_QUICKSTART.md`)

---

**Good luck! The hard part is done - just need to wire up the keys and test! 🚀**

