# RLS Policy Remediation Plan

**Status**: 🔴 CRITICAL - Immediate action required
**Impact**: Edge Functions are non-functional on remote database
**Root Cause**: Missing `service_role` policies on remote production database

---

## Problem Summary

The remote Supabase database is missing critical `service_role` policies that allow Edge Functions to bypass RLS and perform backend operations. This breaks:

- ❌ Chat message storage (`chat/`)
- ❌ Artifact generation (`generate-artifact/`)
- ❌ Artifact bundling (`bundle-artifact/`)
- ❌ Rate limiting (all functions)
- ❌ Session management (`generate-title/`, `summarize-conversation/`)
- ❌ Analytics logging (`ai_usage_logs`)

**Why this happened**: Someone manually modified RLS policies on remote, removing `service_role` bypass policies.

---

## Current State

### Local Database ✅ CORRECT
All tables have proper `service_role` policies:

```sql
-- chat_messages
CREATE POLICY "service_role_all_messages"
  ON public.chat_messages FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- chat_sessions
CREATE POLICY "service_role_all_sessions"
  ON public.chat_sessions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- artifact_versions
CREATE POLICY "Service role can manage artifact versions"
  ON public.artifact_versions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- guest_rate_limits
CREATE POLICY "Service role can manage guest rate limits"
  ON public.guest_rate_limits FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- user_rate_limits
CREATE POLICY "Service role can manage user rate limits"
  ON user_rate_limits FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- api_throttle
CREATE POLICY "Service role can manage api throttle"
  ON public.api_throttle FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
```

### Remote Database ❌ BROKEN
Missing ALL `service_role` policies. Only has user-facing policies.

---

## Remediation Steps

### Step 1: Generate Policy Migration

```bash
# In project root
cd /Users/nick/Projects/llm-chat-site

# Generate diff of ONLY RLS policies
supabase db diff --schema public --file add_missing_service_role_policies
```

This will create a migration file like:
`supabase/migrations/20251210XXXXXX_add_missing_service_role_policies.sql`

### Step 2: Review Migration

```bash
# Open the generated migration
cat supabase/migrations/*_add_missing_service_role_policies.sql
```

**Expected contents**:
- `CREATE POLICY "service_role_all_messages"` on `chat_messages`
- `CREATE POLICY "service_role_all_sessions"` on `chat_sessions`
- `CREATE POLICY "Service role can manage artifact versions"` on `artifact_versions`
- Possibly drops for incorrectly named policies

**Verify there are NO**:
- Table structure changes (CREATE TABLE, ALTER TABLE for columns)
- Data modifications (INSERT, UPDATE, DELETE)
- Function changes (unless they're SECURITY DEFINER fixes)

### Step 3: Backup Remote Database

```bash
# Backup remote before making changes
supabase db dump --linked > backups/remote_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 4: Deploy to Remote (STAGING FIRST)

```bash
# If you have a staging environment
supabase link --project-ref <staging-ref>
supabase db push

# Test Edge Functions on staging
curl -X POST https://<staging-ref>.supabase.co/functions/v1/chat \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}],"sessionId":"test"}'
```

### Step 5: Deploy to Production

```bash
# Link to production
supabase link --project-ref <production-ref>

# Push migration
supabase db push

# Output should show:
# - Creating policy "service_role_all_messages"...
# - Creating policy "service_role_all_sessions"...
# - etc.
```

### Step 6: Verify Deployment

Run verification queries on remote:

```sql
-- Check all service_role policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd AS operation,
  qual AS using_expression,
  with_check AS check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND roles @> ARRAY['service_role']::name[]
ORDER BY tablename, policyname;

-- Expected results (minimum):
-- artifact_versions | Service role can manage artifact versions | {service_role} | *
-- api_throttle      | Service role can manage api throttle       | {service_role} | *
-- chat_messages     | service_role_all_messages                  | {service_role} | *
-- chat_sessions     | service_role_all_sessions                  | {service_role} | *
-- guest_rate_limits | Service role can manage guest rate limits  | {service_role} | *
-- user_rate_limits  | Service role can manage user rate limits   | {service_role} | *
```

### Step 7: Functional Testing

Test each affected Edge Function:

#### Test 1: Chat Function
```bash
curl -X POST https://<prod-ref>.supabase.co/functions/v1/chat \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "sessionId": "test-session-id"
  }'

# Expected: 200 OK with streamed response
# Should NOT see: 403 Forbidden or RLS policy violation
```

#### Test 2: Artifact Generation
```bash
curl -X POST https://<prod-ref>.supabase.co/functions/v1/generate-artifact \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a button",
    "artifactType": "react",
    "sessionId": "test-session-id"
  }'

# Expected: 200 OK with artifact code
# Should create artifact_versions record
```

#### Test 3: Rate Limiting
```bash
# Make 3 rapid requests as guest (no auth header)
for i in {1..3}; do
  curl -X POST https://<prod-ref>.supabase.co/functions/v1/chat \
    -H "Content-Type: application/json" \
    -d '{
      "messages": [{"role": "user", "content": "test"}],
      "sessionId": "guest-test",
      "isGuest": true
    }'
done

# Expected: All succeed (under limit)
# Check guest_rate_limits table updated
```

#### Test 4: Database Verification
```sql
-- Check artifact_versions was created
SELECT COUNT(*) FROM artifact_versions;
-- Should be > 0 after artifact generation test

-- Check chat_messages was created
SELECT COUNT(*) FROM chat_messages WHERE session_id = 'test-session-id';
-- Should be >= 2 (user message + AI response)

-- Check rate limits updated
SELECT * FROM guest_rate_limits ORDER BY last_request DESC LIMIT 5;
-- Should show recent guest requests
```

---

## Rollback Plan (If Needed)

If deployment causes issues:

```bash
# Restore from backup
psql $DATABASE_URL < backups/remote_backup_YYYYMMDD_HHMMSS.sql

# Or drop new policies manually
supabase db remote psql <<EOF
DROP POLICY IF EXISTS "service_role_all_messages" ON chat_messages;
DROP POLICY IF EXISTS "service_role_all_sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Service role can manage artifact versions" ON artifact_versions;
-- etc.
EOF
```

---

## Monitoring After Deployment

### Metrics to Watch (24 hours)

1. **Error Rate**: Edge Function 403/500 errors should DROP to near-zero
2. **Response Time**: Should remain stable (no RLS performance impact)
3. **Rate Limit Hits**: Should match pre-deployment levels
4. **Artifact Generation Success Rate**: Should increase to ~95%+

### Logs to Check

```bash
# Check Edge Function logs for RLS errors
supabase functions logs chat --tail 100 | grep -i "policy\|forbidden\|403"

# Should see NO new RLS violations after deployment
```

### Database Queries

```sql
-- Check for orphaned records (created before policy fix)
SELECT
  cm.id,
  cm.created_at,
  cs.user_id
FROM chat_messages cm
LEFT JOIN chat_sessions cs ON cs.id = cm.session_id
WHERE cs.id IS NULL;
-- Should be empty or very few

-- Check artifact version creation
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS versions_created
FROM artifact_versions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
-- Should show consistent daily volume
```

---

## Prevention Measures

### 1. Add Policy Change Alerts

```sql
-- Create function to log policy changes
CREATE OR REPLACE FUNCTION log_policy_changes()
RETURNS event_trigger AS $$
BEGIN
  RAISE WARNING 'RLS policy modified: % on table %',
    tg_tag, tg_table_name;
END;
$$ LANGUAGE plpgsql;

-- Create event trigger
CREATE EVENT TRIGGER log_policy_ddl
  ON ddl_command_end
  WHEN TAG IN ('CREATE POLICY', 'ALTER POLICY', 'DROP POLICY')
  EXECUTE FUNCTION log_policy_changes();
```

### 2. Add to CI/CD Checks

```bash
# Add to .github/workflows/ci.yml
- name: Verify service_role policies
  run: |
    supabase db diff --schema public > schema_diff.sql
    if grep -q "DROP POLICY.*service_role" schema_diff.sql; then
      echo "❌ ERROR: Attempting to drop service_role policy!"
      exit 1
    fi
```

### 3. Document Policy Requirements

Update `CLAUDE.md` with:

```markdown
## RLS Policy Requirements

ALL tables with user data MUST have:

1. User-scoped policies (authenticated role)
2. service_role bypass policy (Edge Functions)
3. NO policies for anon role (guest handled via app logic)

Example:
```sql
-- User access
CREATE POLICY "users_read_own" ON table_name FOR SELECT
  USING (auth.uid() = user_id);

-- Backend access (REQUIRED)
CREATE POLICY "service_role_all" ON table_name FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
```

### 4. Add Integration Tests

Create `supabase/functions/_shared/__tests__/rls-policies.test.ts`:

```typescript
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

Deno.test("service_role can write to all critical tables", async () => {
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Test chat_messages
  const { error: msgError } = await serviceClient
    .from("chat_messages")
    .insert({ session_id: "test", role: "user", content: "test" });
  assertEquals(msgError, null, "service_role should write to chat_messages");

  // Test artifact_versions
  const { error: artError } = await serviceClient
    .from("artifact_versions")
    .insert({ /* test data */ });
  assertEquals(artError, null, "service_role should write to artifact_versions");

  // Cleanup
  await serviceClient.from("chat_messages").delete().eq("session_id", "test");
});
```

---

## Communication Plan

### Internal Team

**Before Deployment**:
> We're fixing a critical database security issue where Edge Functions cannot write data due to missing RLS policies. Expected downtime: <5 minutes during migration. ETA: [DATE/TIME]

**After Deployment**:
> Database policies restored. All Edge Functions operational. Monitoring for 24h. Please report any chat/artifact generation issues immediately.

### Users (if public-facing)

**If downtime needed**:
> We're performing a brief maintenance update to improve system reliability. Service will be unavailable for approximately 5 minutes starting at [TIME].

**After Deployment**:
> Maintenance complete. All systems operational. Thank you for your patience.

---

## Success Criteria

- ✅ All `service_role` policies present on remote database
- ✅ Edge Functions return 200 OK (no 403 Forbidden)
- ✅ Chat messages successfully stored in database
- ✅ Artifacts generated and versioned correctly
- ✅ Rate limiting functions properly
- ✅ No increase in error rate over 24h monitoring period
- ✅ Integration tests pass
- ✅ Schema drift report shows no policy differences

---

## Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Preparation** | 30 min | Generate migration, backup database |
| **Staging Deploy** | 15 min | Deploy to staging, test functions |
| **Production Deploy** | 15 min | Deploy to prod, verify policies |
| **Testing** | 1 hour | Run functional tests, check logs |
| **Monitoring** | 24 hours | Watch metrics, error rates |
| **Documentation** | 1 hour | Update docs, add prevention measures |

**Total time to restore functionality**: ~2 hours
**Total time including monitoring**: ~27 hours

---

## Appendix: Full Policy List

Complete list of policies that MUST exist on remote:

```sql
-- chat_messages (3 policies)
CREATE POLICY "allow_select_own_messages" ON chat_messages FOR SELECT ...;
CREATE POLICY "allow_insert_own_messages" ON chat_messages FOR INSERT ...;
CREATE POLICY "service_role_all_messages" ON chat_messages FOR ALL TO service_role ...;

-- chat_sessions (5 policies)
CREATE POLICY "allow_select_own_sessions" ON chat_sessions FOR SELECT ...;
CREATE POLICY "allow_insert_own_sessions" ON chat_sessions FOR INSERT ...;
CREATE POLICY "allow_update_own_sessions" ON chat_sessions FOR UPDATE ...;
CREATE POLICY "allow_delete_own_sessions" ON chat_sessions FOR DELETE ...;
CREATE POLICY "service_role_all_sessions" ON chat_sessions FOR ALL TO service_role ...;

-- artifact_versions (2 policies)
CREATE POLICY "Users can view artifact versions for their sessions" ON artifact_versions FOR SELECT ...;
CREATE POLICY "Service role can manage artifact versions" ON artifact_versions FOR ALL TO service_role ...;

-- guest_rate_limits (1 policy, table RLS disabled in favor of service_role only)
CREATE POLICY "Service role can manage guest rate limits" ON guest_rate_limits FOR ALL TO service_role ...;

-- user_rate_limits (2 policies)
CREATE POLICY "Users can view own rate limits" ON user_rate_limits FOR SELECT ...;
CREATE POLICY "Service role can manage user rate limits" ON user_rate_limits FOR ALL TO service_role ...;

-- api_throttle (1 policy, service_role only)
CREATE POLICY "Service role can manage api throttle" ON api_throttle FOR ALL TO service_role ...;
```

**Total**: 14 policies minimum (6 service_role policies are CRITICAL)

---

## Next Steps

1. [ ] Run `supabase db diff` to generate migration
2. [ ] Review migration file for correctness
3. [ ] Backup remote database
4. [ ] Deploy to staging (if available)
5. [ ] Test staging Edge Functions
6. [ ] Deploy to production
7. [ ] Run functional tests (chat, artifacts, rate limiting)
8. [ ] Monitor for 24 hours
9. [ ] Add CI/CD checks to prevent recurrence
10. [ ] Update documentation

---

**Owner**: DevOps / Database Admin
**Priority**: P0 - Critical
**Estimated Effort**: 2 hours (+ 24h monitoring)
**Risk Level**: Low (migration adds policies, doesn't modify data)
