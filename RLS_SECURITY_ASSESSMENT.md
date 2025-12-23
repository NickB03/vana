# RLS Policy Security Assessment: Local vs Remote

**Date**: 2025-12-10
**Severity**: 🔴 **CRITICAL** - Missing service_role policies will break Edge Functions

---

## Executive Summary

**CRITICAL FINDING**: Remote database is missing essential `service_role` policies that are required for Edge Functions to operate. This represents a complete breakage of core functionality.

**Recommendation**: **DO NOT SYNC** remote policies to local. Instead, **PUSH LOCAL POLICIES TO REMOTE** immediately.

---

## Detailed Analysis

### 1. artifact_versions Table

#### Local Policies ✅ CORRECT
```sql
-- Users can view (read-only, authenticated users only)
CREATE POLICY "Users can view artifact versions for their sessions"
  ON public.artifact_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chat_sessions cs ON cs.id = cm.session_id
      WHERE cm.id = artifact_versions.message_id
      AND cs.user_id = auth.uid()
    )
  );

-- Edge Functions can do everything via service_role
CREATE POLICY "Service role can manage artifact versions"
  ON public.artifact_versions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

#### Remote Policies ❌ BROKEN
- "Users can create versions in own messages" - **WRONG**: Users should NOT create versions directly
- "Users can view versions from own messages" - Less restrictive naming
- **MISSING**: `service_role` policy entirely

**Security Impact**:
- 🔴 **CRITICAL**: Edge Functions cannot write artifact versions
- ⚠️ **HIGH**: Users might be able to create artifact versions directly (privilege escalation)
- Functions affected: `generate-artifact/`, `bundle-artifact/`

---

### 2. chat_messages Table

#### Local Policies ✅ CORRECT
```sql
-- Users can read their own messages
CREATE POLICY "allow_select_own_messages"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Users can insert messages in their own sessions
CREATE POLICY "allow_insert_own_messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Edge Functions have full access via service_role
CREATE POLICY "service_role_all_messages"
  ON public.chat_messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

#### Remote Policies ❌ BROKEN
- "Chat messages are immutable - no deletes" - **Incomplete**: Only blocks deletes
- "Chat messages are immutable - no updates" - **Incomplete**: Only blocks updates
- "Users can insert messages in own sessions" - Equivalent to local INSERT policy
- "Users can view messages in own sessions" - Equivalent to local SELECT policy
- **MISSING**: `service_role_all_messages` policy entirely

**Security Impact**:
- 🔴 **CRITICAL**: Edge Functions cannot update/delete messages (breaks conversation summarization)
- 🔴 **CRITICAL**: Functions affected: `chat/`, `summarize-conversation/`, `generate-title/`
- ⚠️ **MEDIUM**: Immutability policies are good for audit trails BUT missing service_role bypass

**Why Immutability is Problematic**:
- Conversation summarization needs to update `chat_messages.content` with summarized text
- Token counting needs to update `chat_messages.token_count` field
- Edge Functions MUST have UPDATE/DELETE capabilities via `service_role`

---

### 3. chat_sessions Table

#### Local Policies ✅ CORRECT
```sql
CREATE POLICY "allow_select_own_sessions"
  ON public.chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "allow_insert_own_sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "allow_update_own_sessions"
  ON public.chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "allow_delete_own_sessions"
  ON public.chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Edge Functions have full access
CREATE POLICY "service_role_all_sessions"
  ON public.chat_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

#### Remote Policies ⚠️ INCOMPLETE
- "Users can delete own chat sessions" - Equivalent to local DELETE policy
- "Users can insert own chat sessions" - Equivalent to local INSERT policy
- "Users can update own chat sessions" - Equivalent to local UPDATE policy
- "Users can view own chat sessions" - Equivalent to local SELECT policy
- **MISSING**: `service_role_all_sessions` policy entirely

**Security Impact**:
- 🔴 **CRITICAL**: Edge Functions cannot manage sessions on behalf of users
- Functions affected: `chat/`, `generate-title/`, `summarize-conversation/`

---

## Critical Missing Patterns

### Service Role Pattern (Essential for Edge Functions)

All Edge Functions use the `service_role` key to bypass RLS:

```typescript
// From generate-artifact/index.ts line 88-91
const serviceClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);
```

**Usage across codebase**:
- `chat/index.ts` - Creates/updates messages and sessions
- `generate-artifact/index.ts` - Writes artifact versions, rate limiting
- `generate-image/index.ts` - Rate limiting, session validation
- `bundle-artifact/index.ts` - Guest session bundling
- All `_shared/` utilities - Rate limiting, logging, storage

**Why service_role policies are CRITICAL**:
1. **Rate Limiting**: Functions must write to `guest_rate_limits`, `user_rate_limits`, `api_throttle`
2. **Message Storage**: Functions must insert AI responses into `chat_messages`
3. **Session Management**: Functions must update `chat_sessions.title`, `conversation_summary`
4. **Artifact Versioning**: Functions must create `artifact_versions` records
5. **Analytics**: Functions must write to `ai_usage_logs`

Without `service_role` policies:
- ❌ All rate limiting breaks (403 Forbidden)
- ❌ Chat responses cannot be saved (403 Forbidden)
- ❌ Artifact generation completely fails (403 Forbidden)
- ❌ Session titles cannot be generated (403 Forbidden)

---

## Security Comparison Matrix

| Aspect | Local Policies | Remote Policies | Winner |
|--------|---------------|-----------------|--------|
| **service_role access** | ✅ Present on all tables | ❌ Missing entirely | **LOCAL** |
| **User permissions** | ✅ Principle of least privilege | ⚠️ Some over-permissive | **LOCAL** |
| **Edge Function support** | ✅ Full support | ❌ Completely broken | **LOCAL** |
| **Audit trail** | ⚠️ Allows updates/deletes via service_role | ✅ Immutability for users | **TIE** |
| **artifact_versions** | ✅ Read-only for users | ❌ Users can create | **LOCAL** |
| **Defense-in-depth** | ✅ Multi-layer validation | ⚠️ Relies on app logic | **LOCAL** |

---

## Threat Model Analysis

### Remote Policies Vulnerabilities

1. **Privilege Escalation** (artifact_versions)
   - Remote allows users to create artifact versions
   - Attacker could forge version history
   - **Mitigation in local**: Only SELECT allowed, service_role creates versions

2. **Service Degradation** (Missing service_role)
   - All Edge Functions fail with 403 Forbidden
   - Complete application breakage
   - **Mitigation in local**: service_role policies exist

3. **Data Integrity** (Incomplete immutability)
   - Remote prevents user updates BUT also prevents service_role updates
   - Cannot implement conversation summarization
   - **Mitigation in local**: service_role bypasses all restrictions

### Local Policies Strengths

1. **Defense-in-Depth**:
   - RLS policies (database layer)
   - Application validation (Edge Functions)
   - Input validation (Zod schemas)
   - XSS protection (DOMPurify)

2. **Least Privilege**:
   - Users: Read-only on artifact_versions
   - Users: CRUD on own sessions/messages only
   - service_role: Full access for backend operations

3. **Auditability**:
   - All service_role actions logged in `ai_usage_logs`
   - Message creation tracked with timestamps
   - Rate limit violations logged

---

## Compliance Considerations

### GDPR Right to Deletion
- **Local**: ✅ Users can delete own sessions, service_role can purge
- **Remote**: ✅ Users can delete sessions BUT service_role cannot assist

### Data Minimization
- **Local**: ✅ Users only see their own data
- **Remote**: ✅ Same principle

### Audit Logging
- **Local**: ✅ service_role can write to audit logs
- **Remote**: ❌ Cannot write logs (no service_role policy)

---

## Recommendations

### IMMEDIATE ACTION REQUIRED

1. **DO NOT sync remote policies to local** - This will break the application entirely

2. **Push local policies to remote**:
   ```bash
   # Generate migration from local schema
   supabase db diff --schema public --file fix_rls_policies

   # Review the migration
   cat supabase/migrations/*_fix_rls_policies.sql

   # Deploy to remote
   supabase db push --linked
   ```

3. **Verify service_role policies on remote**:
   ```sql
   -- Run this query on remote to verify
   SELECT
     schemaname,
     tablename,
     policyname,
     roles,
     cmd
   FROM pg_policies
   WHERE tablename IN ('artifact_versions', 'chat_messages', 'chat_sessions')
   ORDER BY tablename, policyname;
   ```

4. **Test Edge Functions after deployment**:
   - Create a test chat session
   - Generate an artifact
   - Verify rate limiting works
   - Check artifact versioning

### Long-term Security Hardening

1. **Add security monitoring**:
   ```sql
   -- Audit log for service_role operations
   CREATE TABLE service_role_audit (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     table_name TEXT NOT NULL,
     operation TEXT NOT NULL,
     user_id UUID,
     session_id UUID,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

2. **Implement rate limiting on service_role**:
   - Even service_role should have rate limits (per-IP, per-function)
   - Prevents abuse if service_role key leaks

3. **Add query performance monitoring**:
   - Track slow queries that might indicate RLS issues
   - Alert on excessive EXISTS() subquery scans

4. **Regular security audits**:
   - Monthly review of RLS policies
   - Penetration testing of authentication bypass attempts
   - Review service_role key rotation schedule

---

## Test Cases for Verification

After deploying local policies to remote, run these tests:

### Test 1: User Cannot Create Artifact Versions
```typescript
// Should fail with 403
const { error } = await supabase
  .from('artifact_versions')
  .insert({
    message_id: 'some-uuid',
    artifact_id: 'test',
    version_number: 1,
    artifact_type: 'react',
    artifact_title: 'Test',
    artifact_content: 'console.log("hack")',
    content_hash: 'abc123'
  });

assert(error !== null); // Must fail
```

### Test 2: service_role Can Create Artifact Versions
```typescript
// Should succeed
const { error } = await serviceRoleClient
  .from('artifact_versions')
  .insert({ /* same data */ });

assert(error === null); // Must succeed
```

### Test 3: User Can Only See Own Sessions
```typescript
const { data } = await supabase
  .from('chat_sessions')
  .select('*');

// Must only return sessions where user_id = auth.uid()
assert(data.every(s => s.user_id === currentUserId));
```

### Test 4: service_role Can See All Sessions
```typescript
const { data } = await serviceRoleClient
  .from('chat_sessions')
  .select('*');

// Should return all sessions (for admin operations)
assert(data.length > userSessionCount);
```

---

## Conclusion

**Security Verdict**: Local policies are significantly more secure and functional.

**Risk Level of Using Remote Policies**: 🔴 **CRITICAL** - Application-breaking

**Action Required**: Push local policies to remote immediately to restore functionality and security.

The remote policies appear to have been manually modified outside of the migration system, removing critical `service_role` policies that Edge Functions depend on. This is a dangerous state that must be corrected.

**Timeline**:
- ⏰ **Immediate**: Deploy local policies to remote (< 1 hour)
- 🔍 **24 hours**: Verify all Edge Functions working
- 📊 **1 week**: Monitor for any RLS-related errors
- 🔒 **1 month**: Security audit and penetration testing

---

## Appendix: RLS Policy Best Practices

### 1. Always Include service_role Bypass
```sql
CREATE POLICY "service_role_bypass"
  ON table_name FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### 2. Use Explicit Role Targeting
```sql
-- Good: Explicit role
CREATE POLICY "users_read_own" ... TO authenticated ...

-- Bad: Implicit (applies to all roles)
CREATE POLICY "users_read_own" ... -- No TO clause
```

### 3. Prefer EXISTS() Over Joins in USING()
```sql
-- Good: Efficient subquery
USING (EXISTS (
  SELECT 1 FROM chat_sessions
  WHERE id = chat_messages.session_id
  AND user_id = auth.uid()
))

-- Bad: Implicit join (harder to optimize)
USING (auth.uid() IN (
  SELECT user_id FROM chat_sessions ...
))
```

### 4. Test Both Positive and Negative Cases
- User CAN access own data
- User CANNOT access other's data
- service_role CAN access all data
- Anonymous CANNOT access anything (if applicable)

### 5. Document Security Rationale
```sql
-- SECURITY: Users must not create artifact versions directly
-- Only Edge Functions (via service_role) can create versions
-- This prevents version history tampering
CREATE POLICY ...
```
