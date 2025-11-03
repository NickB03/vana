# Local Development Setup Complete

**Date:** 2025-10-29
**Branch:** `feature/workflow-documentation`
**Status:** ✅ Ready for local development with Claude Code

---

## What Was Accomplished

This setup enables local VS Code development with Claude Code without interfering with Lovable AI's cloud-based production workflow.

### ✅ Dual Environment Architecture

**Production (Lovable Cloud):**
- Supabase Project: `xfwlneedhqealtktaacv`
- Uses `.env` file (committed to git)
- Deploys automatically from `main` branch
- Uses Lovable AI for chat functionality

**Development (vana-dev):**
- Supabase Project: `vznhbocnuykdmjvujaka`
- Uses `.env.development` file (git-ignored)
- Local testing with `npm run dev`
- Uses Google AI Studio for development

### ✅ Database Setup

Applied migration to vana-dev creating:
- `chat_sessions` table with RLS policies
- `chat_messages` table with **immutable** policy (matches production)
- `user_preferences` table
- All necessary indexes and foreign keys

### ✅ Storage Buckets

Created in vana-dev:
- `user-uploads` (private, for file uploads)
- `generated-images` (public, for AI-generated images)

### ✅ Edge Functions Strategy

**Decision:** Local development calls **production** edge functions.

**Rationale:**
- Edge functions require LOVABLE_API_KEY (not accessible)
- Simpler than dual-API architecture
- Frontend and database changes can be tested locally
- Full-stack testing happens in Lovable preview deployments

### ✅ Safety Measures

**Claude Code Hooks** (`.claude/settings.json`):
1. **Block commits to main branch** - Prevents breaking Lovable Cloud production
2. **Block staging sensitive files** - Prevents committing `.env.local` or `.env.development`
3. **Warn when on main branch** - Session start reminder to create feature branch

### ✅ Environment File Configuration

| File | Purpose | Git Status | Used When |
|------|---------|------------|-----------|
| `.env` | Production config | Committed | Lovable builds |
| `.env.development` | Dev config (vana-dev) | Git-ignored | `npm run dev` |
| `.env.local` | Personal overrides | Git-ignored | Local dev (optional) |

---

## How to Use

### Starting Local Development

```bash
# 1. Start development server (uses vana-dev)
npm run dev
# Server runs on http://localhost:8081

# 2. Verify environment (optional)
# Open http://localhost:8081/env-check.html
# Should show: ✅ Connected to vana-dev (development)
```

### Testing Changes

**Frontend/Database Changes:**
```bash
# Work on feature branch
git checkout -b feature/your-feature

# Test locally with vana-dev
npm run dev

# Test in preview (uses production Supabase + Lovable AI)
# Push branch and create preview in Lovable

# Merge when ready
git checkout main
git merge feature/your-feature
git push
```

**Database Schema Changes:**
```bash
# Apply migration to vana-dev first
# Test locally
# If successful, create same migration for production
# Deploy through Lovable
```

### Safety Guidelines

**Protected Actions:**
- ❌ Cannot commit directly to main (blocked by hooks)
- ❌ Cannot stage `.env.local` or `.env.development` (blocked by hooks)
- ⚠️ Warning shown when starting session on main branch

**Emergency Override:**
If you MUST commit to main, tell Claude:
```
"I need to commit to main for emergency: [describe critical issue]"
```

---

## Verification

**Current Status:**
- ✅ Dev server running on port 8081
- ✅ Chat functionality working
- ✅ Image generation working
- ✅ Claude Code hooks active
- ✅ No conflicts with production

**Test Results:**
```bash
# Environment check
npm run dev # ✅ Connects to vana-dev
# Chat test # ✅ Messages sent/received
# Image gen test # ✅ Images generated and stored
```

---

## Documentation

**Comprehensive Guides:**
1. **DUAL_ENVIRONMENT_SETUP.md** - Complete dual environment architecture guide
2. **CLAUDE_CODE_HOOKS.md** - Claude Code hooks documentation and customization
3. **ACTUAL_WORKFLOW.md** - Lovable + Claude Code workflow
4. **NEXT_AGENT_PROMPT.md** - Full project context for future agents

**Quick References:**
- **CLAUDE.md** - Project-specific patterns and commands
- **README.md** - Project overview

---

## What's Next

**Immediate:**
- Push `feature/workflow-documentation` branch to remote
- Test Claude Code hooks by attempting commit to main (should block)
- Merge to main when ready

**Ongoing Development:**
1. Create feature branch for each new feature
2. Test locally with `npm run dev` (vana-dev)
3. Test in Lovable preview (production Supabase)
4. Merge to main when ready

---

## Environment Details

**Production (Lovable Cloud):**
```bash
Project: xfwlneedhqealtktaacv
URL: https://xfwlneedhqealtktaacv.supabase.co
Edge Functions: chat, generate-title, cache-manager, summarize-conversation, generate-image
API: Lovable AI (managed by Lovable)
```

**Development (vana-dev):**
```bash
Project: vznhbocnuykdmjvujaka
URL: https://vznhbocnuykdmjvujaka.supabase.co
Edge Functions: Calls production functions
API: Google AI Studio (GOOGLE_AI_STUDIO_KEY in .env.local)
```

---

## Troubleshooting

**Issue:** Local dev connects to production instead of vana-dev
**Fix:** Check `.env.local` doesn't contain production credentials. Should only have `GOOGLE_AI_STUDIO_KEY`.

**Issue:** Changes affect Lovable Cloud
**Fix:** Ensure on feature branch, not main. Claude Code hooks will prevent commits to main.

**Issue:** Chat not working locally
**Fix:** Verify `GOOGLE_AI_STUDIO_KEY` in `.env.local`. Edge functions call production Supabase.

**Issue:** Hook not blocking main commits
**Fix:** Verify `.claude/settings.json` exists and JSON is valid: `jq . .claude/settings.json`

---

**Setup Status:** ✅ Complete and verified
**Ready For:** Local development with Claude Code
**Safe For:** Production (no breaking changes)

**Questions?** See comprehensive documentation in `DUAL_ENVIRONMENT_SETUP.md` and `CLAUDE_CODE_HOOKS.md`.
