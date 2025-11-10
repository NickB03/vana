# Documentation Update - November 10, 2025

## Summary

Updated all project documentation to reflect the current API key rotation architecture with 10 keys distributed across 3 optimized feature pools.

---

## Files Updated

### 1. Core Documentation
- ✅ **CLAUDE.md** - Developer guide with updated environment variables and rotation strategy
- ✅ **README.md** - Public documentation with updated architecture diagram and deployment instructions
- ✅ **.env.example** - Reference configuration for API keys

### 2. Technical Documentation
- ✅ **.claude/ROUND_ROBIN_KEY_ROTATION.md** - Updated rotation implementation details
- ✅ **KEY_POOL_ARCHITECTURE.md** - New comprehensive architecture guide
- ✅ **FINAL_KEY_ROTATION_SUMMARY.md** - New quick reference summary
- ✅ **API_KEY_ROTATION_UPDATE.md** - Updated with final configuration

---

## Key Changes

### Environment Variables (Before → After)

**Before (Outdated):**
```bash
GOOGLE_AI_STUDIO_KEY_CHAT=...      # Single chat key
GOOGLE_AI_STUDIO_KEY_IMAGE=...     # Single image key
GOOGLE_AI_STUDIO_KEY_FIX=...       # Single fix key
```

**After (Current):**
```bash
# 10 keys distributed across 3 pools
GOOGLE_KEY_1=...   # Chat pool
GOOGLE_KEY_2=...   # Chat pool
GOOGLE_KEY_3=...   # Artifact pool
GOOGLE_KEY_4=...   # Artifact pool
GOOGLE_KEY_5=...   # Artifact pool
GOOGLE_KEY_6=...   # Artifact pool
GOOGLE_KEY_7=...   # Image pool
GOOGLE_KEY_8=...   # Image pool
GOOGLE_KEY_9=...   # Image pool
GOOGLE_KEY_10=...  # Image pool
```

### Architecture Changes

**Before:**
- 3 separate pools (chat, image, fix)
- Artifact generation shared chat pool
- Artifact fixing had separate pool

**After:**
- 3 optimized pools (chat, artifact, image)
- Artifact generation + fixing share dedicated pool
- Better resource utilization and capacity

### Function Mapping

| Function | Model | Key Pool | Keys | RPM |
|----------|-------|----------|------|-----|
| `chat` | gemini-2.5-flash | CHAT | 1-2 | 4 |
| `generate-artifact` | gemini-2.5-pro | ARTIFACT | 3-6 | 8 |
| `generate-artifact-fix` | gemini-2.5-pro | ARTIFACT | 3-6 | 8 |
| `generate-image` | gemini-2.5-flash-image | IMAGE | 7-10 | 60 |

---

## Rotation Strategy

### Updated Implementation

**Previous:** Simple round-robin (broken with cold starts)
**Current:** Random starting point + round-robin

**How It Works:**
1. Cold Start → Pick random key from pool
2. Subsequent Requests → Round-robin through keys
3. Next Cold Start → Pick different random key

**Why:** Edge Functions cold-start frequently, resetting state. Random starting point ensures even distribution across all keys.

---

## Documentation Structure

### Quick Reference
- **FINAL_KEY_ROTATION_SUMMARY.md** - Start here for overview
- **KEY_POOL_ARCHITECTURE.md** - Complete architecture details

### Developer Guides
- **CLAUDE.md** - Main developer instructions
- **README.md** - Public-facing documentation
- **.claude/ROUND_ROBIN_KEY_ROTATION.md** - Technical implementation

### Historical Context
- **API_KEY_ROTATION_UPDATE.md** - Change log and fixes
- **check-logs-for-rotation.md** - Verification guide

---

## Verification

### Check Deployment
```bash
# Verify all secrets are set
supabase secrets list

# Should show: GOOGLE_KEY_1 through GOOGLE_KEY_10
```

### Check Logs
```bash
# Look for rotation in Supabase Function logs
# Should see different keys being used:
🔑 Using GOOGLE_KEY_1 (position 1/2 in pool)  # Chat
🔑 Using GOOGLE_KEY_3 (position 1/4 in pool)  # Artifact
🔑 Using GOOGLE_KEY_7 (position 1/4 in pool)  # Image
```

### Monitor Usage
Visit: https://aistudio.google.com/app/apikey
- Check usage is distributed across all 10 projects
- No single project should be hitting limits

---

## Migration Notes

### For Existing Deployments

If you have the old 3-key setup, migrate to 10 keys:

1. **Generate 7 more API keys** from different Google Cloud projects
2. **Set new secrets** in Supabase (GOOGLE_KEY_1 through GOOGLE_KEY_10)
3. **Deploy updated functions** (already deployed if using latest code)
4. **Remove old secrets** (optional cleanup):
   ```bash
   supabase secrets unset GOOGLE_AI_STUDIO_KEY_CHAT
   supabase secrets unset GOOGLE_AI_STUDIO_KEY_IMAGE
   supabase secrets unset GOOGLE_AI_STUDIO_KEY_FIX
   ```

### For New Deployments

Follow the setup instructions in README.md or CLAUDE.md - they now reflect the current 10-key architecture.

---

**Last Updated:** November 10, 2025  
**Status:** ✅ All documentation current and accurate

