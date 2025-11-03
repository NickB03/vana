# PostgREST Schema Cache Issue - Quick Fix Guide

## Problem
After adding `artifact_ids` column to `chat_messages` table, PostgREST returns error:
```
Error 42703: column chat_messages.artifact_ids does not exist
```

The column EXISTS in the database, but PostgREST's schema cache is stale.

## Quick Fix (Choose One)

### Option 1: Manual Refresh (Recommended - 2 minutes)

1. **Run the helper script:**
   ```bash
   ./manual_refresh_instructions.sh
   ```
   This will open your browser to the Supabase SQL Editor

2. **Or manually open:**
   https://supabase.com/dashboard/project/xfwlneedhqealtktaacv/sql/new

3. **Paste and run this SQL:**
   ```sql
   NOTIFY pgrst, 'reload schema';
   NOTIFY pgrst, 'reload config';
   ```

4. **Wait 10 seconds, then verify:**
   ```bash
   node test_artifact_ids.mjs
   ```

5. **If successful, remove the workaround:**
   - Open `src/hooks/useChatMessages.tsx`
   - Remove lines 94-114 (the WORKAROUND comment block and retry logic)

### Option 2: Auto Refresh (No Action - 15 minutes)

1. **Just wait 10-15 minutes** - PostgREST will auto-refresh

2. **Monitor progress:**
   ```bash
   node monitor_schema_refresh.mjs
   ```
   This will test every 30 seconds and notify you when ready

3. **Remove workaround once test passes** (see step 5 above)

## Current Status

✅ **Working with workaround** - The app continues to function normally
- Workaround: Retries without `artifact_ids` if schema cache error occurs
- Location: `src/hooks/useChatMessages.tsx` lines 94-114
- Safe to keep until cache refreshes

## Files Created

**Testing:**
- `test_artifact_ids.mjs` - Verify schema cache status
- `monitor_schema_refresh.mjs` - Auto-monitor until fixed

**Documentation:**
- `POSTGREST_CACHE_SOLUTION.md` - Complete technical analysis
- `README_SCHEMA_CACHE_FIX.md` - This quick guide

**Helper Scripts:**
- `manual_refresh_instructions.sh` - Opens browser with instructions
- `force_schema_reload.mjs` - Investigation script
- `apply_reload_migration.mjs` - Diagnostic output

**Migrations:**
- `supabase/migrations/20251102192809_force_postgrest_reload.sql` - Reload function

## Verification

After applying fix, this command should succeed:
```bash
node test_artifact_ids.mjs
```

Expected output:
```
Testing artifact_ids column access...
Test 1: Querying chat_messages with artifact_ids select
✓ SELECT successful

Test 2: Get a test session
Test 3: Inserting message with artifact_ids
✓ INSERT successful with artifact_ids: [ 'test-1', 'test-2' ]
✓ Test message cleaned up
```

## Why This Happens

PostgREST caches database schema for performance. After DDL changes (like adding columns), the cache needs to refresh. In Supabase cloud:

- **Cache TTL:** 10-15 minutes
- **Manual refresh:** NOTIFY command via SQL Editor
- **Automatic refresh:** Happens periodically

This is a known behavior of PostgREST and not a bug.

## Technical Details

See `POSTGREST_CACHE_SOLUTION.md` for complete technical analysis including:
- Root cause explanation
- Architecture diagrams
- All attempted solutions
- Best practices for future migrations
- References and links

## Need Help?

1. Check `POSTGREST_CACHE_SOLUTION.md` for detailed troubleshooting
2. Run `node monitor_schema_refresh.mjs` to track progress
3. If still issues after 30 minutes, contact Supabase support

## Cleanup (After Fix)

Optional - remove test files:
```bash
rm test_artifact_ids.mjs
rm monitor_schema_refresh.mjs
rm force_schema_reload.mjs
rm apply_reload_migration.mjs
rm create_and_call_reload.mjs
rm manual_refresh_instructions.sh
```

Keep for documentation:
```bash
# These are useful for future reference
# POSTGREST_CACHE_SOLUTION.md
# README_SCHEMA_CACHE_FIX.md
```
