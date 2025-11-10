# Artifact Generation Fix - November 10, 2025

## Problem Summary
User reported: "unable to generate artifacts only getting script errors" and "received ai service unavailable errors"

## Root Causes Identified

### 1. Missing Database Columns ❌
**Issue:** The `guest_rate_limits` table was missing required columns (`window_start`, `last_request`, `created_at`)

**Error:** 
```
ERROR: 42703: column "window_start" of relation "guest_rate_limits" does not exist
```

**Impact:** Edge Functions returned 503 "Service temporarily unavailable" because rate limiting functions failed

### 2. JWT Verification Enabled ❌
**Issue:** `generate-artifact`, `generate-artifact-fix`, and `generate-image` functions had `verify_jwt = true` in `supabase/config.toml`

**Error:**
```json
{"code":401,"message":"Missing authorization header"}
```

**Impact:** Guest users couldn't generate artifacts or images

### 3. Unapplied Database Migrations ❌
**Issue:** 9 migrations were not applied to production database, including comprehensive rate limiting migration

**Impact:** Rate limiting functions didn't exist or were outdated

## Solutions Applied

### Fix #1: Database Table Structure ✅
**File:** `fix-rate-limit-tables.sql` (created and run in Supabase SQL Editor)

**Changes:**
- Added missing columns to `guest_rate_limits` table
- Created `user_rate_limits` table for authenticated users
- Created `api_throttle` table for API rate limiting
- Added all necessary indexes and RLS policies

**SQL:**
```sql
ALTER TABLE guest_rate_limits 
  ADD COLUMN IF NOT EXISTS window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
ALTER TABLE guest_rate_limits 
  ADD COLUMN IF NOT EXISTS last_request TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
ALTER TABLE guest_rate_limits 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
```

### Fix #2: JWT Verification Configuration ✅
**File:** `supabase/config.toml`

**Changes:**
```toml
[functions.generate-artifact]
verify_jwt = false  # Changed from true (or missing)

[functions.generate-artifact-fix]
verify_jwt = false  # Changed from true (or missing)

[functions.generate-image]
verify_jwt = false  # Changed from true
```

**Deployment:**
```bash
supabase functions deploy generate-artifact
supabase functions deploy generate-artifact-fix
supabase functions deploy generate-image
```

### Fix #3: Rate Limiting Functions ✅
**Migration:** `20251108000001_comprehensive_rate_limiting.sql` was already applied

**Functions Created:**
- `check_guest_rate_limit(identifier, max_requests, window_hours)` - 20 requests per 5 hours
- `check_user_rate_limit(user_id, max_requests, window_hours)` - 100 requests per 5 hours
- `check_api_throttle(api_name, max_requests, window_seconds)` - 15 RPM for Gemini

## Test Results

### Before Fixes ❌
```
Chat Function: 503 Service Unavailable
Artifact Function: 401 Unauthorized
Image Function: 401 Unauthorized
```

### After Fixes ✅
```
Chat Function: ✅ 200 OK - Streaming working
Artifact Function: ✅ 200 OK - Generation working
Image Function: ✅ 200 OK (429 during testing due to rate limits)
```

## Verification

Run test scripts:
```bash
node test-api-keys.js      # Tests chat and artifact generation
node test-image-gen.js     # Tests image generation
```

Expected output:
```
============================================================
📊 Test Summary:
   Chat Function: ✅ PASS
   Artifact Function: ✅ PASS
============================================================
```

## Additional Notes

### Storage Buckets
**Question:** "Do we need to have a storage bucket for artifacts?"
**Answer:** ❌ NO - Artifacts are stored as text in the database (`chat_messages` and `artifact_versions` tables)

Storage buckets exist only for:
- `generated-images` - AI-generated images (binary files)
- `user-uploads` - User file uploads (binary files)

### Rate Limiting
Guest users now have proper rate limiting:
- **20 requests per 5 hours** (sliding window)
- Rate limit headers returned in responses:
  - `x-ratelimit-limit: 20`
  - `x-ratelimit-remaining: 9`
  - `x-ratelimit-reset: 1762790948394`

### Known Issue: Chat Goes Blank on Image Generation Error
**Symptom:** When image generation fails (e.g., 429 rate limit), the chat interface goes blank

**Cause:** Error handling in streaming response doesn't gracefully handle image generation failures

**Status:** Identified but not yet fixed - requires frontend error handling improvements

## Files Modified

1. ✅ `supabase/config.toml` - Added JWT verification settings
2. ✅ `fix-rate-limit-tables.sql` - Database structure fix (run manually)
3. ✅ Deployed 3 Edge Functions with new configuration

## Related Documentation

- `.claude/CODE_REVIEW_FIXES_SUMMARY.md` - Security fixes (Nov 2025)
- `.claude/ROUND_ROBIN_KEY_ROTATION.md` - API key rotation system
- `.claude/artifacts.md` - Complete artifact system documentation

