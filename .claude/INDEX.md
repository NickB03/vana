# Documentation Index - Round-Robin API Key Rotation Deployment

**Date:** November 9, 2025
**Status:** Implementation Complete → Awaiting Manual Secret Migration
**Time to Unblock:** 15-20 minutes

---

## Quick Navigation

### I Just Want to Deploy (Fastest Path)
Start here: **`.claude/QUICK_START.md`**
- 4 simple steps
- 15-20 minutes
- Copy values → Run script → Deploy → Test

### I Need Detailed Step-by-Step Instructions
Go to: **`.claude/SECRET_MIGRATION_GUIDE.md`**
- Manual dashboard approach (no script)
- Complete troubleshooting guide
- Alternative workflows

### I Want to Understand the Technical Details
Read: **`.claude/DEPLOYMENT_BLOCKER_ANALYSIS.md`**
- Why this couldn't be automated
- What approaches were tried
- Technical Q&A

### I Need Current Deployment Status
Check: **`.claude/DEPLOYMENT_STATUS.md`**
- What's done, what's blocked
- Verification checklist
- Timeline and risk assessment

### I Need the Original Handoff Context
See: **`.claude/HANDOFF_ROUND_ROBIN_TESTING.md`**
- Complete implementation guide
- Testing procedures
- Success criteria

---

## Document Quick Reference

| Document | Purpose | Length | Best For |
|----------|---------|--------|----------|
| **QUICK_START.md** | Deploy in 4 steps | 1 page | Getting done fast |
| **SECRET_MIGRATION_GUIDE.md** | Manual migration steps | 4 pages | If you want to avoid the script |
| **DEPLOYMENT_BLOCKER_ANALYSIS.md** | Technical deep dive | 5 pages | Understanding the constraint |
| **DEPLOYMENT_STATUS.md** | Current status & checklist | 4 pages | Tracking progress |
| **HANDOFF_ROUND_ROBIN_TESTING.md** | Original handoff | 8 pages | Full context |

---

## What Needs to Happen

### The Blocker (One Step)
6 secrets need to be renamed:
```
GOOGLE_KEY_1 → GOOGLE_AI_STUDIO_KEY_CHAT_1
GOOGLE_KEY_2 → GOOGLE_AI_STUDIO_KEY_CHAT_2
GOOGLE_KEY_3 → GOOGLE_AI_STUDIO_KEY_IMAGE_1
GOOGLE_KEY_4 → GOOGLE_AI_STUDIO_KEY_IMAGE_2
GOOGLE_KEY_5 → GOOGLE_AI_STUDIO_KEY_FIX_1
GOOGLE_KEY_6 → GOOGLE_AI_STUDIO_KEY_FIX_2
```

### How to Fix (Choose One)

**Option A: Automated (Recommended)**
```bash
./scripts/migrate-secrets.sh <value1> <value2> ... <value6>
```
See: `.claude/QUICK_START.md`

**Option B: Manual**
```bash
# Step-by-step via dashboard
# See: .claude/SECRET_MIGRATION_GUIDE.md
```

### After Migration
```bash
# Deploy functions
npx supabase functions deploy chat
npx supabase functions deploy generate-image
npx supabase functions deploy generate-artifact-fix
npx supabase functions deploy generate-title
npx supabase functions deploy summarize-conversation

# Verify rotation works
npx supabase functions logs chat --tail
```

---

## Project Structure

```
llm-chat-site/
├── .claude/
│   ├── INDEX.md (← You are here)
│   ├── QUICK_START.md
│   ├── SECRET_MIGRATION_GUIDE.md
│   ├── DEPLOYMENT_BLOCKER_ANALYSIS.md
│   ├── DEPLOYMENT_STATUS.md
│   └── HANDOFF_ROUND_ROBIN_TESTING.md
│
├── scripts/
│   └── migrate-secrets.sh (Helper script)
│
└── supabase/functions/
    ├── _shared/gemini-client.ts (Rotation logic)
    ├── chat/index.ts (Updated)
    ├── generate-image/index.ts (Updated)
    ├── generate-artifact-fix/index.ts (Updated)
    ├── generate-title/index.ts (Updated)
    └── summarize-conversation/index.ts (Updated)
```

---

## Key Concepts

### What Round-Robin Rotation Does
- Distributes API requests across multiple keys
- Increases rate limits by 2x (with 2 keys)
- Happens automatically, transparently

### Rate Limit Before/After
| Feature | Before | After |
|---------|--------|-------|
| Chat | 2 RPM | 4 RPM |
| Image | 15 RPM | 30 RPM |
| Fix | 2 RPM | 4 RPM |

### Why Manual Secret Migration?
Supabase intentionally masks secret values for security. The CLI cannot read them back to rename them. You must:
1. Get values from Supabase dashboard
2. Set them with new names via CLI

This is a security feature, not a bug.

---

## Success Checklist

After completing deployment, verify:

- [ ] New secrets are set (`npx supabase secrets list`)
- [ ] Old secrets are deleted (optional but recommended)
- [ ] All 5 functions deployed successfully
- [ ] Function logs show rotation messages
- [ ] No "not configured" errors
- [ ] No 429 "rate limit" errors during normal usage
- [ ] Chat, images, and artifacts all work

---

## Troubleshooting Quick Reference

**Q: Script says "Invalid key format"**
A: Make sure you copied the full value starting with "AIza"

**Q: Functions still failing with "not configured"**
A: Secret migration wasn't completed. Run: `npx supabase secrets list`

**Q: Only seeing "key #1 of 1" in logs**
A: Only one key detected. Ensure both _1 and _2 keys are set

**Q: Getting 429 errors after deployment**
A: Either migration incomplete, or keys are from same Google account (need different accounts for independent quotas)

For more help: `.claude/DEPLOYMENT_BLOCKER_ANALYSIS.md` (Troubleshooting section)

---

## Timeline

| Step | Time | Status |
|------|------|--------|
| Get secret values | 5 min | Pending |
| Run migration script | 2 min | Pending |
| Deploy functions | 5 min | Pending |
| Verify & test | 3-5 min | Pending |
| **Total** | **15-20 min** | **Pending** |

---

## Files You'll Use

### To Get Started
- `/Users/nick/Projects/llm-chat-site/.claude/QUICK_START.md`

### To Run Migration
- `/Users/nick/Projects/llm-chat-site/scripts/migrate-secrets.sh`

### To Deploy Functions
```bash
cd /Users/nick/Projects/llm-chat-site
npx supabase functions deploy chat
npx supabase functions deploy generate-image
npx supabase functions deploy generate-artifact-fix
npx supabase functions deploy generate-title
npx supabase functions deploy summarize-conversation
```

### To Verify
```bash
npx supabase secrets list
npx supabase functions list
npx supabase functions logs chat --tail
```

---

## Architecture Overview

```
User Request
    ↓
Edge Function (e.g., /chat)
    ↓
getApiKey("GOOGLE_AI_STUDIO_KEY_CHAT")
    ↓
getAvailableKeys() discovers: _1, _2, _3, ...
    ↓
Round-robin counter picks next key
    ↓
Log: "🔑 Using GOOGLE_AI_STUDIO_KEY_CHAT key #1 of 2"
    ↓
API Request with selected key
    ↓
Google Gemini API
    ↓
Response back to user
```

---

## Related Documentation

- **Main Project Docs:** `CLAUDE.md` (search for "Round-Robin")
- **Implementation Details:** `.claude/ROUND_ROBIN_KEY_ROTATION.md`
- **Testing Guide:** `.claude/HANDOFF_ROUND_ROBIN_TESTING.md`
- **LiteLLM Alternative:** `LITELLM_QUICKSTART.md` (if 2x isn't enough)

---

## Summary

Everything is ready to deploy. All you need to do:

1. **Get 6 secret values** from Supabase dashboard (5 min)
2. **Run migration script** with those values (2 min)
3. **Deploy 5 functions** (5 min)
4. **Verify rotation works** (3 min)

**Total time: 15-20 minutes**
**Risk level: Very Low**
**Complexity: Low**

Start with: **`.claude/QUICK_START.md`**

---

**Last Updated:** November 9, 2025
**Status:** Ready for deployment
**Contact:** Check documentation for any questions
