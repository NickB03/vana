# Deployment Blocker Analysis - Round-Robin API Key Rotation

**Date:** November 9, 2025
**Status:** BLOCKED - Waiting for Manual Secret Migration
**Blocker Type:** Infrastructure Configuration (not code)

---

## Summary

The round-robin API key rotation system is **fully implemented and ready for deployment**, but deployment is **blocked by a single manual step** that cannot be automated due to Supabase security design:

**Blocker:** 6 existing API secrets need to be renamed from `GOOGLE_KEY_1..6` to the new naming structure `GOOGLE_AI_STUDIO_KEY_CHAT_1/2`, `GOOGLE_AI_STUDIO_KEY_IMAGE_1/2`, `GOOGLE_AI_STUDIO_KEY_FIX_1/2`.

**Why Manual?** Supabase intentionally masks secret values for security. The CLI cannot read them back, so we cannot programmatically rename them.

**Solution:** Get values from Supabase dashboard, then use our helper script to set them with new names.

**Time to Unblock:** 15-20 minutes

---

## Technical Analysis

### What We Cannot Automate

| Task | Reason | Impact |
|------|--------|--------|
| Read secret values from Supabase | Masked by design (security) | Must get from dashboard |
| Rename secrets programmatically | No API token available | Cannot batch rename |
| Set new secrets without values | Values required by CLI | Must provide them |

### What We CAN Automate

| Task | Status | Impact |
|------|--------|--------|
| Validate key format | ✅ Done (in helper script) | Catches errors early |
| Set multiple secrets at once | ✅ Done (in helper script) | Batch operation |
| Delete old secrets after migration | ✅ Done (in helper script) | Cleanup |
| Deploy functions | ✅ Ready (just commands) | One-liner for each |

---

## The Blocker: Secret Migration

### Current State
```
GOOGLE_KEY_1          (some_api_key_value_1)
GOOGLE_KEY_2          (some_api_key_value_2)
GOOGLE_KEY_3          (some_api_key_value_3)
GOOGLE_KEY_4          (some_api_key_value_4)
GOOGLE_KEY_5          (some_api_key_value_5)
GOOGLE_KEY_6          (some_api_key_value_6)
```

### Needed State
```
GOOGLE_AI_STUDIO_KEY_CHAT_1   (some_api_key_value_1)
GOOGLE_AI_STUDIO_KEY_CHAT_2   (some_api_key_value_2)
GOOGLE_AI_STUDIO_KEY_IMAGE_1  (some_api_key_value_3)
GOOGLE_AI_STUDIO_KEY_IMAGE_2  (some_api_key_value_4)
GOOGLE_AI_STUDIO_KEY_FIX_1    (some_api_key_value_5)
GOOGLE_AI_STUDIO_KEY_FIX_2    (some_api_key_value_6)
```

### Why This Matters

The Edge Functions use `getApiKey("GOOGLE_AI_STUDIO_KEY_CHAT")` which:
1. Looks for base name: `GOOGLE_AI_STUDIO_KEY_CHAT`
2. Then discovers suffixes: `_1`, `_2`, `_3`, etc.
3. Implements round-robin rotation across discovered keys

**Current Issue:** `GOOGLE_KEY_1` doesn't match the pattern, so functions fail with "not configured" error.

---

## Solution Workflow

### Option A: Automated (Recommended)

```bash
# 1. Get 6 secret values from Supabase dashboard
# 2. Run one command with all values:
./scripts/migrate-secrets.sh AIzaSy...key1 AIzaSy...key2 ... AIzaSy...key6

# 3. Verify migration:
npx supabase secrets list

# 4. Deploy functions:
npx supabase functions deploy chat
npx supabase functions deploy generate-image
npx supabase functions deploy generate-artifact-fix
npx supabase functions deploy generate-title
npx supabase functions deploy summarize-conversation
```

**Pros:**
- Single command after getting values
- Built-in validation
- Shows what's being changed
- Option to delete old secrets
- Safe (asks for confirmation)

**Cons:**
- Requires manual copy-paste of values
- 6 values to handle

### Option B: Manual

See `.claude/SECRET_MIGRATION_GUIDE.md` for step-by-step dashboard instructions.

**Pros:**
- Gives you full control
- Can visually verify each step

**Cons:**
- More tedious (6 individual CLI commands)
- Higher risk of typos

---

## Attempted Automation Approaches

During deployment setup, we explored multiple approaches to automate this:

### Approach 1: Supabase CLI
**Status:** ❌ Failed
**Reason:** CLI masks secret values (security feature)
```bash
npx supabase secrets list
# Output shows digest hashes, not actual values
# NAME            | DIGEST
# --------------- | ------
# GOOGLE_KEY_1    | ee96ef9... (masked)
```

### Approach 2: Supabase Management API
**Status:** ❌ Failed
**Reason:** No authentication token available
```bash
curl https://api.supabase.com/v1/projects/...
# Requires: Authorization: Bearer <token>
# We don't have a valid token
```

### Approach 3: Supabase JavaScript Client
**Status:** ❌ Failed
**Reason:** Secrets stored in separate secure vault, not accessible via regular API
```typescript
supabase.from('secrets').select()  // NOT POSSIBLE
// Secrets are in a separate vault, not in database tables
```

### Approach 4: Temporary Edge Function to Read Secrets
**Status:** ✅ Possible but impractical
**Why Impractical:**
- Would expose secrets in logs/response
- Security anti-pattern
- Only works after secrets are already set
- Still can't write them back with new names

### Approach 5: Environment Variable Passthrough
**Status:** ❌ Not Applicable
**Reason:** Supabase doesn't provide a "pass environment variables" feature for secret reading

---

## Why We Can't Work Around This

**Supabase's Design (Intentional Security Feature):**
1. Secrets are encrypted and stored in a secure vault
2. Never exposed through APIs, SDKs, or CLI
3. Only accessible to Edge Functions at runtime
4. Even the Supabase dashboard shows a digest hash, not the actual value (based on behavior)

**This is correct** - secrets should never be readable programmatically. But it means renaming them requires getting values from somewhere they're stored.

---

## The Fix (What You Need to Do)

### 1. Get the Values (5 minutes)
```
Go to: https://supabase.com/dashboard/project/uznhbocnuykdmjvujaka/settings/functions
Click "Secrets" tab
Copy each GOOGLE_KEY_1..6 value
Paste into script: ./scripts/migrate-secrets.sh <key1> <key2> ... <key6>
```

### 2. Run Migration Script (2 minutes)
```bash
./scripts/migrate-secrets.sh AIzaSy...abc AIzaSy...def AIzaSy...ghi ...
# Script validates, sets, and verifies
```

### 3. Deploy Functions (5 minutes)
```bash
npx supabase functions deploy chat
npx supabase functions deploy generate-image
npx supabase functions deploy generate-artifact-fix
npx supabase functions deploy generate-title
npx supabase functions deploy summarize-conversation
```

**Total Time: 12-20 minutes**

---

## Verification Checklist

After completing the migration:

- [ ] `npx supabase secrets list` shows new names
- [ ] Old secrets are deleted (optional but recommended)
- [ ] All 5 functions deployed successfully
- [ ] No deployment errors
- [ ] Function logs show rotation messages: `🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2`
- [ ] No "not configured" errors in logs

---

## Prevention for Future Deployments

To avoid this in future deployments:

1. **Document secret values securely** (e.g., 1Password, LastPass)
   - Store the actual key value (not just the name)
   - Include the new name they should be set as

2. **Create migration script from the start**
   - We've done this: `scripts/migrate-secrets.sh`
   - Reusable for future key rotations

3. **Use environment files for secrets** (for local testing)
   - Store in `.env` file locally
   - Never commit to git
   - Use for `npx supabase secrets set --env-file` approach

---

## Alternative: LiteLLM Approach

If you want external management of keys instead of managing them in Supabase:

- **Setup:** `LITELLM_QUICKSTART.md`
- **Benefits:** 3-5x capacity, response caching, monitoring
- **Trade-off:** Requires Docker container running
- **Timeline:** 30-45 minutes to set up
- **Recommended if:** Heavy usage or need caching

---

## Rollback Plan

If anything goes wrong:

```bash
# Revert to old secrets
npx supabase secrets set GOOGLE_KEY_1=<original_value>
# ... repeat for all 6

# Or deploy previous code (without rotation)
git checkout HEAD~1 -- supabase/functions/
npx supabase functions deploy chat
```

---

## Summary

| Item | Status | Blocker |
|------|--------|---------|
| Code Implementation | ✅ Complete | No |
| API Keys Stored | ✅ In Supabase | No |
| Secret Names Updated | ❌ Pending Manual | **YES** |
| Functions Ready | ✅ Ready | No |
| Documentation | ✅ Complete | No |

**To unblock:** Follow the 3-step solution above (12-20 minutes)

---

**Last Updated:** November 9, 2025
