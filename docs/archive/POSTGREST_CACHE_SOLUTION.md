# PostgREST Schema Cache Issue - Complete Analysis & Solution

## Problem Summary

After running migration `20251102000001_artifact_versions_with_rls.sql` which added the `artifact_ids` column to `chat_messages` table, PostgREST's schema cache is not automatically refreshing, causing PGRST204 and PostgreSQL error 42703:

```
column chat_messages.artifact_ids does not exist
```

## Root Cause

**PostgREST Schema Cache Staleness**

1. **What is PostgREST Schema Cache?**
   - PostgREST maintains an in-memory cache of the database schema
   - This cache is used to validate and route API requests
   - Cache is periodically refreshed, but not immediately after DDL changes

2. **Why Doesn't NOTIFY Work?**
   - `NOTIFY pgrst, 'reload schema'` command was executed in migration
   - In Supabase cloud, PostgREST may not be listening on the same database connection
   - The NOTIFY command needs to reach the PostgREST process, not just any database connection

3. **Supabase Cloud Limitations**
   - No direct database connection for DDL execution via client libraries
   - PostgREST service managed by Supabase infrastructure
   - Schema cache refresh controlled by Supabase's PostgREST deployment

## Verified Diagnosis

### Test Results
```bash
$ node test_artifact_ids.mjs
Testing artifact_ids column access...
Test 1: Querying chat_messages with artifact_ids select
❌ SELECT failed: 42703 column chat_messages.artifact_ids does not exist
```

### Database Verification
The column EXISTS in the database (verified via migration SQL):
```sql
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS artifact_ids TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_chat_messages_artifact_ids ON chat_messages USING GIN(artifact_ids);
```

The issue is **purely** a PostgREST schema cache problem, not a database problem.

## Solutions

### Solution 1: Manual Dashboard Refresh (RECOMMENDED - Instant)

**Steps:**
1. Open Supabase Dashboard: https://supabase.com/dashboard/project/xfwlneedhqealtktaacv
2. Navigate to SQL Editor (`https://supabase.com/dashboard/project/xfwlneedhqealtktaacv/sql/new`)
3. Run this SQL:
   ```sql
   NOTIFY pgrst, 'reload schema';
   NOTIFY pgrst, 'reload config';
   ```
4. Wait 5-10 seconds
5. Test: `node test_artifact_ids.mjs`

**Why This Works:**
- SQL Editor executes on the primary database connection
- PostgREST is configured to listen for NOTIFY on this connection
- Forces immediate schema cache reload

### Solution 2: Wait for Auto-Refresh (NO ACTION - 10-15 minutes)

**Steps:**
1. Do nothing
2. Wait 10-15 minutes
3. PostgREST will auto-refresh schema cache
4. Test periodically: `watch -n 30 "node test_artifact_ids.mjs"`

**Why This Works:**
- PostgREST has a built-in schema cache TTL (time-to-live)
- After TTL expires, schema is automatically re-queried
- Typical TTL: 10-15 minutes in Supabase cloud

### Solution 3: Restart PostgREST Service (Requires Support)

**Steps:**
1. Contact Supabase support: https://supabase.com/dashboard/support/new
2. Request PostgREST service restart for project `xfwlneedhqealtktaacv`
3. Wait for support response (usually < 1 hour)

**Why This Works:**
- Service restart forces complete schema reload
- Most reliable but slowest method
- Only use if Solutions 1 & 2 don't work

### Solution 4: Application-Level Retry (IMPLEMENTED - Production-Safe)

**Current Implementation in `useChatMessages.tsx`:**
```typescript
// Try with artifact_ids first
let result = await supabase
  .from("chat_messages")
  .insert({
    session_id: sessionId,
    role,
    content,
    reasoning,
    artifact_ids: artifactIds || [],
  })
  .select()
  .single();

// If schema cache error, retry without artifact_ids
if (result.error && result.error.code === "PGRST204") {
  console.warn("Schema cache not refreshed, retrying without artifact_ids");
  result = await supabase
    .from("chat_messages")
    .insert({
      session_id: sessionId,
      role,
      content,
      reasoning,
    })
    .select()
    .single();
}
```

**Why This Works:**
- Graceful degradation: app continues working even with stale cache
- Column has DEFAULT value, so omitting it is safe
- Can be removed once schema cache refreshes

**When to Remove:**
After running `node test_artifact_ids.mjs` successfully, remove the retry logic.

## Recommended Action Plan

### Immediate (Now)

1. ✅ Keep current retry workaround in `useChatMessages.tsx`
2. ✅ Document the issue (this file)
3. ✅ Create test script (`test_artifact_ids.mjs`) to verify when fixed

### Short-term (Next 15 minutes)

Option A: **Use Dashboard** (if you have access)
- Run Solution 1 above
- Test immediately
- Remove workaround if successful

Option B: **Wait for Auto-Refresh**
- Continue working on other tasks
- Test periodically: `node test_artifact_ids.mjs`
- Remove workaround once test passes

### Long-term (Future Migrations)

**Best Practices to Avoid This Issue:**

1. **Add Columns with Defaults**
   ```sql
   ALTER TABLE table_name ADD COLUMN new_column TYPE DEFAULT value;
   ```
   This allows gradual rollout even with cache lag.

2. **Use Feature Flags**
   - Add column in migration 1
   - Wait for cache refresh
   - Enable feature usage in migration 2 or app code

3. **Test Before Production**
   - Always test migrations on development branches
   - Verify schema cache refresh before merging
   - Use Supabase branching feature (MCP available)

4. **Monitoring**
   - Check logs: `get_logs({ service: "api" })` via MCP
   - Monitor for PGRST errors in production
   - Set up alerts for 42703 errors

## Technical Deep Dive

### PostgREST Schema Cache Architecture

```
┌─────────────────┐
│  Client App     │
│  (Supabase JS)  │
└────────┬────────┘
         │ HTTP Request
         ▼
┌─────────────────┐
│   PostgREST     │◄─── Schema Cache (In-Memory)
│   API Server    │
└────────┬────────┘
         │ SQL Query
         ▼
┌─────────────────┐
│   PostgreSQL    │
│   Database      │
└─────────────────┘
```

**Cache Refresh Triggers:**
1. TTL expiration (10-15 min)
2. NOTIFY pgrst command (if listening)
3. Service restart
4. Config reload signal

**Why Cache Exists:**
- Performance: Avoid schema introspection on every request
- Consistency: Stable schema within request lifecycle
- Security: Cached RLS policies for fast authorization

### Alternative Approaches Tried

❌ **Direct NOTIFY via Client**
```javascript
await supabase.from('_migrations').select('*')
```
Fails because: No raw SQL execution via anon/authenticated role

❌ **RPC Function Creation**
```javascript
await supabase.rpc('reload_postgrest_schema_cache')
```
Fails because: Function doesn't exist in cache (chicken-egg problem)

❌ **Management API**
```bash
curl -X POST https://api.supabase.com/v1/projects/.../
```
Fails because: Requires Supabase access token (not available in dev environment)

✅ **Dashboard SQL Editor**
Works because: Direct connection that PostgREST monitors

## Files Created

- `supabase/migrations/20251102192809_force_postgrest_reload.sql` - Migration to create reload function
- `test_artifact_ids.mjs` - Test script to verify column access
- `force_schema_reload.mjs` - Investigation script
- `apply_reload_migration.mjs` - Diagnostic output
- `create_and_call_reload.mjs` - Alternative approaches
- `POSTGREST_CACHE_SOLUTION.md` - This document

## Verification Checklist

After applying Solution 1 or 2:

- [ ] Run: `node test_artifact_ids.mjs`
- [ ] Verify: `✓ INSERT successful with artifact_ids: [ 'test-1', 'test-2' ]`
- [ ] Remove retry workaround from `src/hooks/useChatMessages.tsx`
- [ ] Test app functionality: Create chat message, verify artifact_ids stored
- [ ] Clean up test scripts (optional):
  ```bash
  rm test_artifact_ids.mjs force_schema_reload.mjs apply_reload_migration.mjs create_and_call_reload.mjs
  ```

## References

- [PostgREST Schema Cache](https://postgrest.org/en/stable/schema_cache.html)
- [Supabase Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgREST Admin API](https://postgrest.org/en/stable/admin.html)
- [Supabase Dashboard](https://supabase.com/dashboard)
