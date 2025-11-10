# Deployment Status - Round-Robin API Key Rotation

**Date:** November 9, 2025
**Branch:** `feature/litellm-api-key-rotation`
**Current Stage:** BLOCKED - Awaiting Manual Secret Migration

---

## Executive Summary

The round-robin API key rotation system is **fully implemented and ready for deployment**, but requires one manual step before functions can be deployed:

✅ Code is complete and tested
✅ All 6 API keys are set in Supabase secrets
✅ Edge Functions are ready to deploy
❌ Secret names must be migrated (requires manual action)

---

## Current Blockers

### Task 1: Secret Name Migration (BLOCKED - MANUAL)

**Status:** ❌ Requires Manual Action

**What's Needed:**
- 6 existing secrets must be renamed from `GOOGLE_KEY_1..6` to `GOOGLE_AI_STUDIO_KEY_CHAT_1/2`, `GOOGLE_AI_STUDIO_KEY_IMAGE_1/2`, `GOOGLE_AI_STUDIO_KEY_FIX_1/2`

**Why Manual?**
- Supabase CLI masks secret values for security (cannot read them programmatically)
- Must obtain values from dashboard and set new names via CLI

**How to Fix:**
1. **Option A: Use automated helper script**
   ```bash
   # Get secret values from dashboard, then run:
   ./scripts/migrate-secrets.sh AIzaSy...key1 AIzaSy...key2 ... AIzaSy...key6
   ```

2. **Option B: Manual via dashboard**
   - See: `.claude/SECRET_MIGRATION_GUIDE.md` (detailed steps)

**Estimated Time:** 10-15 minutes

---

### Task 2: Function Deployment (READY - BLOCKED ON TASK 1)

**Status:** 🟡 Ready to Deploy (after Task 1)

**Functions to Deploy:**
```
supabase/functions/chat
supabase/functions/generate-image
supabase/functions/generate-artifact-fix
supabase/functions/generate-title
supabase/functions/summarize-conversation
```

**Deployment Command:**
```bash
npx supabase functions deploy chat
npx supabase functions deploy generate-image
npx supabase functions deploy generate-artifact-fix
npx supabase functions deploy generate-title
npx supabase functions deploy summarize-conversation
```

---

### Task 3: Testing & Verification (READY - BLOCKED ON TASK 1)

**Status:** 🟡 Ready to Execute (after Task 1 & 2)

**What to Test:**
- [ ] Chat rotation works (logs show `key #1 of 2`, then `key #2 of 2`)
- [ ] Image generation rotation works
- [ ] Artifact fix rotation works
- [ ] No 429 rate limit errors
- [ ] App functions normally

**Test Commands:**
```bash
# Monitor chat function logs
npx supabase functions logs chat --tail

# Monitor image function logs
npx supabase functions logs generate-image --tail

# Test chat (should see rotation messages)
curl -X POST https://uznhbocnuykdmjvujaka.supabase.co/functions/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
```

---

## Implementation Details

### Round-Robin Rotation Logic

All Edge Functions use the `getApiKey()` function from `supabase/functions/_shared/gemini-client.ts`:

```typescript
// Automatically discovers and rotates through available keys
const chatKey = getApiKey("GOOGLE_AI_STUDIO_KEY_CHAT");  // Gets _1, _2, etc.
```

**Key Features:**
- Per-isolate rotation counters (independent per function instance)
- Automatic discovery of `_1`, `_2`, `_3` suffixes
- Logging of which key is being used
- Works with 1, 2, 3+ keys (scales automatically)

### Expected Load Distribution

| Feature | Keys | Before | After |
|---------|------|--------|-------|
| Chat | 2 | 2 RPM | 4 RPM |
| Image | 2 | 15 RPM | 30 RPM |
| Fix | 2 | 2 RPM | 4 RPM |

---

## File Guide

- **Migration Guide:** `.claude/SECRET_MIGRATION_GUIDE.md`
- **Handoff Docs:** `.claude/HANDOFF_ROUND_ROBIN_TESTING.md`
- **Implementation:** `.claude/ROUND_ROBIN_KEY_ROTATION.md`
- **Helper Script:** `scripts/migrate-secrets.sh`
- **Code:** `supabase/functions/_shared/gemini-client.ts` (lines 7-88)

---

## Quick Start (Once Secrets Are Migrated)

```bash
# 1. Migrate secrets (see SECRET_MIGRATION_GUIDE.md)
./scripts/migrate-secrets.sh AIzaSy...key1 ... AIzaSy...key6

# 2. Deploy functions
npx supabase functions deploy chat
npx supabase functions deploy generate-image
npx supabase functions deploy generate-artifact-fix
npx supabase functions deploy generate-title
npx supabase functions deploy summarize-conversation

# 3. Verify deployment
npx supabase functions list

# 4. Test rotation (monitor logs)
npx supabase functions logs chat --tail

# 5. Make requests and verify logs show rotation
```

---

## Rollback Plan

If something goes wrong:

1. **Revert secrets to old names:**
   ```bash
   # Keep the new names, but can keep old names as aliases if needed
   npx supabase secrets set GOOGLE_KEY_1=<value>
   ```

2. **Redeploy previous version:**
   ```bash
   git checkout main -- supabase/functions/
   npx supabase functions deploy <function-name>
   ```

---

## Notes for Next Engineer

1. **Security:** Don't expose secret values in logs or error messages (already handled)
2. **Scalability:** Can add `_3` keys later without code changes (auto-discovery)
3. **Monitoring:** Check logs regularly for rotation pattern and errors
4. **Optional Enhancement:** Consider LiteLLM proxy if 2x capacity isn't enough (see `LITELLM_QUICKSTART.md`)

---

**Last Updated:** November 9, 2025
**Next Action:** Migrate secrets using `SECRET_MIGRATION_GUIDE.md`
