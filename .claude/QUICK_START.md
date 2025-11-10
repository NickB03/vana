# Quick Start - Deploy Round-Robin API Key Rotation

**Status:** Blocked on manual secret migration (not code)
**Time to Complete:** 15-20 minutes
**Complexity:** Low (copy values + run commands)

---

## The One Thing You Need to Do

The 6 API keys are already set in Supabase, but their names must be updated:

```
BEFORE (current):    GOOGLE_KEY_1, GOOGLE_KEY_2, ...
AFTER (needed):      GOOGLE_AI_STUDIO_KEY_CHAT_1, GOOGLE_AI_STUDIO_KEY_IMAGE_1, ...
```

**Why?** Functions look for the new names to enable rotation.

---

## Steps to Deploy

### Step 1: Get Secret Values (5 min)

1. Go to dashboard: https://supabase.com/dashboard/project/uznhbocnuykdmjvujaka/settings/functions
2. Click "Secrets" tab
3. Copy values for: GOOGLE_KEY_1, GOOGLE_KEY_2, ..., GOOGLE_KEY_6
4. Keep them handy (you'll paste them in next step)

### Step 2: Run Migration Script (2 min)

```bash
cd /Users/nick/Projects/llm-chat-site
./scripts/migrate-secrets.sh <value1> <value2> <value3> <value4> <value5> <value6>
```

Example:
```bash
./scripts/migrate-secrets.sh AIzaSy...abc AIzaSy...def AIzaSy...ghi AIzaSy...jkl AIzaSy...mno AIzaSy...pqr
```

The script will:
- ✅ Validate all values
- ✅ Set 6 new secrets
- ✅ Verify they're set
- ✅ Ask if you want to delete old secrets

### Step 3: Deploy Functions (3 min)

```bash
npx supabase functions deploy chat
npx supabase functions deploy generate-image
npx supabase functions deploy generate-artifact-fix
npx supabase functions deploy generate-title
npx supabase functions deploy summarize-conversation
```

### Step 4: Verify (2 min)

```bash
# Check secrets
npx supabase secrets list

# Check deployments
npx supabase functions list

# Monitor rotation (open in separate terminal)
npx supabase functions logs chat --tail
```

Expected logs:
```
🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2
🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #2 of 2
🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2  (cycles)
```

---

## That's It!

Once complete, your app gets:
- 2x rate limit increase (no more 429 errors)
- Automatic load balancing across keys
- Zero code changes needed

---

## Help

- **More details:** `.claude/DEPLOYMENT_BLOCKER_ANALYSIS.md`
- **Manual steps:** `.claude/SECRET_MIGRATION_GUIDE.md`
- **Full guide:** `.claude/HANDOFF_ROUND_ROBIN_TESTING.md`
