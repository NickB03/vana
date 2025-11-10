# API Key Rotation - Production Implementation

**Status:** ✅ Implemented and Optimized (November 2025)
**Deployment:** Production-ready, no external dependencies
**Strategy:** Random starting point + round-robin rotation

---

## 🎯 Overview

Lightweight API key rotation built directly into Supabase Edge Functions. Uses **random starting point + round-robin** strategy to automatically distribute requests across multiple Google AI Studio API keys, handling Edge Function cold starts gracefully.

---

## 📊 Key Pool Configuration

### **Current Setup (10 Keys Total)**

| Key Pool | Keys | Model | RPM per Key | Total RPM | Functions |
|----------|------|-------|-------------|-----------|-----------|
| `CHAT` | 1-2 | gemini-2.5-flash | 2 | **4 RPM** | chat |
| `ARTIFACT` | 3-6 | gemini-2.5-pro | 2 | **8 RPM** | generate-artifact<br>generate-artifact-fix |
| `IMAGE` | 7-10 | gemini-2.5-flash-image | 15 | **60 RPM** | generate-image |

### **Capacity Summary**

| Feature | Keys | Total RPM | Total RPD | Notes |
|---------|------|-----------|-----------|-------|
| Chat | 2 | 4 RPM | 100 RPD | Fast Flash model |
| Artifacts | 4 | 8 RPM | 200 RPD | Pro model (generation + fixing) |
| Images | 4 | 60 RPM | 6,000 RPD | High-capacity image generation |

**Total System Capacity:** 72 RPM, 6,300 RPD

---

## 🔧 How It Works

### **1. Key Naming Convention**

Keys are numbered sequentially and mapped to feature pools:

```bash
# Chat pool (Flash model) - Keys 1-2
GOOGLE_KEY_1=AIzaSy...
GOOGLE_KEY_2=AIzaSy...

# Artifact pool (Pro model) - Keys 3-6
GOOGLE_KEY_3=AIzaSy...
GOOGLE_KEY_4=AIzaSy...
GOOGLE_KEY_5=AIzaSy...
GOOGLE_KEY_6=AIzaSy...

# Image pool (Flash-Image model) - Keys 7-10
GOOGLE_KEY_7=AIzaSy...
GOOGLE_KEY_8=AIzaSy...
GOOGLE_KEY_9=AIzaSy...
GOOGLE_KEY_10=AIzaSy...
```

### **2. Random Starting Point + Round-Robin**

The rotation strategy in `_shared/gemini-client.ts`:

1. **Cold Start**: Pick random key from pool
   ```typescript
   keyRotationCounters[keyName] = getRandomInt(availableKeys.length);
   ```

2. **Subsequent Requests**: Round-robin through keys
   ```typescript
   const keyIndex = keyRotationCounters[keyName] % availableKeys.length;
   keyRotationCounters[keyName] = (keyRotationCounters[keyName] + 1) % availableKeys.length;
   ```

3. **Next Cold Start**: Pick different random key (stateless)

**Example: Chat pool (keys 1-2)**
```
Cold Start 1 → Random pick: KEY_2
Request 1 → KEY_2 (position 2/2)
Request 2 → KEY_1 (position 1/2)
Request 3 → KEY_2 (position 2/2)

Cold Start 2 → Random pick: KEY_1
Request 4 → KEY_1 (position 1/2)
Request 5 → KEY_2 (position 2/2)
```

### **3. Why Random Starting Point?**

**Problem**: Edge Functions cold-start frequently, resetting counter to 0
**Solution**: Random starting point ensures distribution even with cold starts
**Result**: All keys get used evenly over time, no single key is overused

---

## 🚀 Deployment Instructions

### **Step 1: Generate API Keys**

Create 10 API keys from different Google Cloud projects:
1. Visit https://aistudio.google.com/app/apikey
2. Create keys from 10 different Google accounts/projects
3. **CRITICAL**: Each key must be from a separate project for independent rate limits

### **Step 2: Set Supabase Secrets**

```bash
# Chat pool (Flash model) - Keys 1-2
supabase secrets set GOOGLE_KEY_1=AIzaSy...your_chat_key_1
supabase secrets set GOOGLE_KEY_2=AIzaSy...your_chat_key_2

# Artifact pool (Pro model) - Keys 3-6
supabase secrets set GOOGLE_KEY_3=AIzaSy...your_artifact_key_1
supabase secrets set GOOGLE_KEY_4=AIzaSy...your_artifact_key_2
supabase secrets set GOOGLE_KEY_5=AIzaSy...your_artifact_key_3
supabase secrets set GOOGLE_KEY_6=AIzaSy...your_artifact_key_4

# Image pool (Flash-Image model) - Keys 7-10
supabase secrets set GOOGLE_KEY_7=AIzaSy...your_image_key_1
supabase secrets set GOOGLE_KEY_8=AIzaSy...your_image_key_2
supabase secrets set GOOGLE_KEY_9=AIzaSy...your_image_key_3
supabase secrets set GOOGLE_KEY_10=AIzaSy...your_image_key_4

# Fix pool
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_FIX_1=AIzaSy...your_first_fix_key
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_FIX_2=AIzaSy...your_second_fix_key
```

### **Step 3: Deploy Functions**

```bash
# Deploy all functions with new rotation logic
npx supabase functions deploy chat
npx supabase functions deploy generate-image
npx supabase functions deploy generate-artifact-fix
npx supabase functions deploy generate-title
npx supabase functions deploy summarize-conversation
```

### **Step 4: Verify**

Check function logs for rotation messages:
```
🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2
🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #2 of 2
🔑 Using GOOGLE_AI_STUDIO_KEY_IMAGE key #1 of 2
```

---

## 📝 Code Changes

### **Modified Files**

1. **`supabase/functions/_shared/gemini-client.ts`**
   - Added `getAvailableKeys()` - Discovers keys with _1, _2, _3 suffixes
   - Added `keyRotationCounters` - Per-pool rotation state
   - Modified `getValidatedApiKey()` - Implements round-robin logic
   - Added `getApiKey()` - Public API for key rotation

2. **`supabase/functions/chat/index.ts`**
   - Changed from `Deno.env.get()` to `getApiKey("GOOGLE_AI_STUDIO_KEY_CHAT")`

3. **`supabase/functions/generate-title/index.ts`**
   - Added `keyName: "GOOGLE_AI_STUDIO_KEY_CHAT"` to share chat pool

4. **`supabase/functions/summarize-conversation/index.ts`**
   - Added `keyName: "GOOGLE_AI_STUDIO_KEY_CHAT"` to share chat pool

5. **`supabase/functions/generate-image/index.ts`**
   - Already uses `keyName: "GOOGLE_AI_STUDIO_KEY_IMAGE"` (no changes needed)

6. **`supabase/functions/generate-artifact-fix/index.ts`**
   - Already uses `keyName: "GOOGLE_AI_STUDIO_KEY_FIX"` (no changes needed)

---

## 🎯 Benefits vs. LiteLLM

| Feature | Round-Robin (This) | LiteLLM Proxy |
|---------|-------------------|---------------|
| **Setup Complexity** | ⭐⭐⭐⭐⭐ Simple | ⭐⭐⭐ Moderate |
| **Infrastructure** | ✅ None | ❌ Requires VPS/serverless |
| **Latency** | ✅ Zero overhead | ⚠️ +50-100ms per request |
| **Cost** | ✅ Free | ⚠️ $6-20/month |
| **Maintenance** | ✅ Zero | ⚠️ Updates, monitoring |
| **Response Caching** | ❌ No | ✅ Yes (Redis) |
| **Monitoring Dashboard** | ❌ No | ✅ Yes |
| **Automatic Failover** | ⚠️ Basic | ✅ Advanced (429 retry) |
| **Load Balancing** | ✅ Round-robin | ✅ Multiple strategies |

**Recommendation:** Start with round-robin. Add LiteLLM later if you need caching or advanced monitoring.

---

## 📈 Monitoring

### **Check Rotation in Logs**

```bash
# View recent function logs
npx supabase functions logs chat --tail

# Look for rotation messages
🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2
🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #2 of 2
```

### **Monitor Rate Limits**

Visit https://ai.google.dev/gemini-api/docs/quota to check usage per project.

---

## 🔄 Scaling Up

To add more keys (e.g., 3 keys per pool):

```bash
# Add third key to chat pool
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_CHAT_3=AIzaSy...

# Redeploy (automatic discovery)
npx supabase functions deploy chat
```

The rotation logic automatically detects and uses the new key!

---

**Last Updated:** 2025-11-09  
**Author:** Claude Code (Augment Agent)

