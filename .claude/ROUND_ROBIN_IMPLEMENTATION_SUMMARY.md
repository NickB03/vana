# Round-Robin API Key Rotation - Implementation Summary

**Date:** November 9, 2025  
**Status:** ✅ Complete - Ready for Production Deployment

---

## 🎯 What Was Implemented

Built lightweight round-robin API key rotation directly into Supabase Edge Functions to increase Google Gemini API rate limits without requiring external infrastructure.

---

## 📊 Model-to-Function Mapping (Optimized)

| Function | Model | Rate Limit | Key Pool | Keys | Total RPM |
|----------|-------|------------|----------|------|-----------|
| **chat** | gemini-2.5-pro | 2 RPM | CHAT | 2 | **4 RPM** |
| **generate-title** | gemini-2.5-flash-lite | 15 RPM | CHAT | 2 | **30 RPM** |
| **summarize-conversation** | gemini-2.5-flash-lite | 15 RPM | CHAT | 2 | **30 RPM** |
| **generate-image** | gemini-2.5-flash-image | 15 RPM | IMAGE | 2 | **30 RPM** |
| **generate-artifact-fix** | gemini-2.5-pro | 2 RPM | FIX | 2 | **4 RPM** |

### **Key Optimization Decisions:**

1. **Chat Pool (2 keys)** - Shared by chat, title, and summary functions
   - Chat uses gemini-2.5-pro (2 RPM per key)
   - Title/Summary use gemini-2.5-flash-lite (15 RPM per key)
   - Low-volume title/summary won't exhaust the pool

2. **Image Pool (2 keys)** - Dedicated to image generation
   - High-volume feature that previously hit rate limits
   - 2x capacity increase (15 → 30 RPM)

3. **Fix Pool (2 keys)** - Dedicated to artifact fixing
   - Low-volume feature (occasional use)
   - 2x capacity increase (2 → 4 RPM)

---

## 🔧 Code Changes

### **1. Core Rotation Logic (`_shared/gemini-client.ts`)**

**Added:**
- `keyRotationCounters` - Per-pool rotation state (persists per isolate)
- `getAvailableKeys(baseKeyName)` - Discovers keys with _1, _2, _3 suffixes
- `getApiKey(keyName)` - Public API for round-robin key selection

**Modified:**
- `getValidatedApiKey()` - Now implements round-robin logic with logging

**Key Features:**
- Automatic key discovery (checks for base key + _1, _2, _3, etc.)
- Round-robin rotation using modulo arithmetic
- Per-pool counters (independent rotation for chat, image, fix)
- Logging: `🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2`

### **2. Function Updates**

**chat/index.ts:**
- Changed: `Deno.env.get("GOOGLE_AI_STUDIO_KEY_CHAT")` → `getApiKey("GOOGLE_AI_STUDIO_KEY_CHAT")`
- Added import: `getApiKey` from gemini-client

**generate-title/index.ts:**
- Added: `keyName: "GOOGLE_AI_STUDIO_KEY_CHAT"` to share chat pool

**summarize-conversation/index.ts:**
- Added: `keyName: "GOOGLE_AI_STUDIO_KEY_CHAT"` to share chat pool

**generate-image/index.ts:**
- No changes needed (already uses `keyName: "GOOGLE_AI_STUDIO_KEY_IMAGE"`)

**generate-artifact-fix/index.ts:**
- No changes needed (already uses `keyName: "GOOGLE_AI_STUDIO_KEY_FIX"`)

---

## 🚀 Deployment Instructions

### **Step 1: Generate API Keys**

Create 6 API keys from different Google accounts:
- 2 keys for chat pool (from 2 different Google accounts)
- 2 keys for image pool (from 2 different Google accounts)
- 2 keys for fix pool (from 2 different Google accounts)

Visit: https://aistudio.google.com/app/apikey

### **Step 2: Set Supabase Secrets**

```bash
# Chat pool (2 keys)
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_CHAT_1=AIzaSy...
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_CHAT_2=AIzaSy...

# Image pool (2 keys)
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_IMAGE_1=AIzaSy...
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_IMAGE_2=AIzaSy...

# Fix pool (2 keys)
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_FIX_1=AIzaSy...
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_FIX_2=AIzaSy...
```

### **Step 3: Deploy Functions**

```bash
npx supabase functions deploy chat
npx supabase functions deploy generate-image
npx supabase functions deploy generate-artifact-fix
npx supabase functions deploy generate-title
npx supabase functions deploy summarize-conversation
```

### **Step 4: Verify**

Check function logs for rotation messages:
```bash
npx supabase functions logs chat --tail
```

Look for:
```
🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2
🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #2 of 2
```

---

## 📈 Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Chat RPM | 2 | 4 | 2x |
| Image RPM | 15 | 30 | 2x |
| Fix RPM | 2 | 4 | 2x |
| 429 Errors | Frequent | Rare | ~50% reduction |

---

## 📝 Documentation Created

1. **`.claude/ROUND_ROBIN_KEY_ROTATION.md`** - Complete implementation guide
2. **`.claude/ROUND_ROBIN_IMPLEMENTATION_SUMMARY.md`** - This file
3. **Updated `CLAUDE.md`** - Added round-robin section to main docs

---

## 🎯 Benefits vs. LiteLLM

| Feature | Round-Robin | LiteLLM |
|---------|-------------|---------|
| Setup | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Infrastructure | None | VPS/Serverless |
| Latency | Zero | +50-100ms |
| Cost | Free | $6-20/month |
| Capacity | 2x | 3x-5x |
| Caching | No | Yes |
| Monitoring | Logs only | Dashboard |

**Recommendation:** Start with round-robin. Add LiteLLM later if you need caching or advanced monitoring.

---

## ✅ Checklist for Deployment

- [ ] Generate 6 API keys from different Google accounts
- [ ] Set all 6 Supabase secrets (CHAT_1, CHAT_2, IMAGE_1, IMAGE_2, FIX_1, FIX_2)
- [ ] Deploy all 5 functions
- [ ] Verify rotation in logs
- [ ] Test chat feature (should see key rotation)
- [ ] Test image generation (should see key rotation)
- [ ] Monitor for 429 errors (should be rare)

---

**Implementation Time:** ~2 hours  
**Production Ready:** Yes  
**External Dependencies:** None  
**Maintenance Required:** None (automatic key discovery)

