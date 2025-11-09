# Round-Robin API Key Rotation - Production Implementation

**Status:** ✅ Implemented (November 2025)  
**Deployment:** Production-ready, no external dependencies

---

## 🎯 Overview

Lightweight round-robin API key rotation built directly into Supabase Edge Functions. Automatically distributes requests across multiple Google AI Studio API keys to increase rate limits without requiring external infrastructure like LiteLLM.

---

## 📊 Key Pool Configuration

### **Current Setup (6 Keys Total)**

| Key Pool | Keys | Models | Total RPM | Functions |
|----------|------|--------|-----------|-----------|
| `GOOGLE_AI_STUDIO_KEY_CHAT` | 2 keys | gemini-2.5-pro<br>gemini-2.5-flash-lite | 4 RPM (pro)<br>30 RPM (flash) | chat<br>generate-title<br>summarize-conversation |
| `GOOGLE_AI_STUDIO_KEY_IMAGE` | 2 keys | gemini-2.5-flash-image | 30 RPM | generate-image |
| `GOOGLE_AI_STUDIO_KEY_FIX` | 2 keys | gemini-2.5-pro | 4 RPM | generate-artifact-fix |

### **Capacity Increase**

| Feature | Before | After | Improvement |
|---------|--------|-------|-------------|
| Chat | 2 RPM | 4 RPM | 2x |
| Image Generation | 15 RPM | 30 RPM | 2x |
| Artifact Fixing | 2 RPM | 4 RPM | 2x |
| Title/Summary | 15 RPM | 30 RPM | 2x (shared pool) |

---

## 🔧 How It Works

### **1. Key Naming Convention**

Keys are organized into pools with numbered suffixes:

```bash
# Chat pool (2 keys)
GOOGLE_AI_STUDIO_KEY_CHAT_1=AIzaSy...
GOOGLE_AI_STUDIO_KEY_CHAT_2=AIzaSy...

# Image pool (2 keys)
GOOGLE_AI_STUDIO_KEY_IMAGE_1=AIzaSy...
GOOGLE_AI_STUDIO_KEY_IMAGE_2=AIzaSy...

# Fix pool (2 keys)
GOOGLE_AI_STUDIO_KEY_FIX_1=AIzaSy...
GOOGLE_AI_STUDIO_KEY_FIX_2=AIzaSy...
```

### **2. Automatic Rotation**

The `getApiKey()` function in `_shared/gemini-client.ts`:
1. Discovers all keys in a pool (base key + numbered keys)
2. Maintains a counter per pool
3. Returns next key using modulo arithmetic
4. Logs which key is being used

```typescript
// Example: First 4 requests to chat pool
Request 1 → GOOGLE_AI_STUDIO_KEY_CHAT_1
Request 2 → GOOGLE_AI_STUDIO_KEY_CHAT_2
Request 3 → GOOGLE_AI_STUDIO_KEY_CHAT_1
Request 4 → GOOGLE_AI_STUDIO_KEY_CHAT_2
```

### **3. Per-Isolate State**

Rotation counters persist within each Deno isolate (Edge Function instance). This means:
- ✅ Efficient (no database lookups)
- ✅ Automatic load distribution
- ✅ No coordination needed between instances
- ⚠️ Not perfectly round-robin across all instances (acceptable trade-off)

---

## 🚀 Deployment Instructions

### **Step 1: Generate API Keys**

Create 6 API keys from different Google accounts:
1. Visit https://aistudio.google.com/app/apikey
2. Create 2 keys for chat (from 2 different accounts)
3. Create 2 keys for images (from 2 different accounts)
4. Create 2 keys for fixing (from 2 different accounts)

### **Step 2: Set Supabase Secrets**

```bash
# Chat pool
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_CHAT_1=AIzaSy...your_first_chat_key
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_CHAT_2=AIzaSy...your_second_chat_key

# Image pool
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_IMAGE_1=AIzaSy...your_first_image_key
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_IMAGE_2=AIzaSy...your_second_image_key

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

