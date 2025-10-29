# Dual Environment Setup Guide

**Status:** ✅ Fully Configured and Operational

This document explains how the project is configured for **dual environment development** where Claude Code works locally with a development database (vana-dev) while Lovable AI works with the production database - all without interference.

---

## 📊 Environment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  LOCAL DEVELOPMENT (Claude Code + VS Code)                  │
│  ├─ npm run dev → Port 8080                                 │
│  ├─ Uses: .env.development                                  │
│  ├─ Connects to: vana-dev Supabase (vznhbocnuykdmjvujaka)  │
│  └─ Purpose: Safe local testing, no production impact       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  LOVABLE AI DEPLOYMENTS                                      │
│  ├─ Lovable Cloud builds & deploys                          │
│  ├─ Uses: .env (committed to repo)                          │
│  ├─ Connects to: Production Supabase (xfwlneedhqealtktaacv) │
│  └─ Purpose: Production & preview deployments                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  MCP SERVER (Supabase Integration)                          │
│  ├─ Claude Code MCP connection                              │
│  ├─ Connected to: vana-dev (vznhbocnuykdmjvujaka)           │
│  ├─ Tools: list_tables, execute_sql, apply_migration, etc.  │
│  └─ Purpose: Direct database operations during development   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ File Structure

### Environment Files

| File | Purpose | Git Tracked | Used By |
|------|---------|-------------|---------|
| `.env` | Production credentials | ✅ Yes | Lovable AI deployments |
| `.env.local` | Local overrides (optional) | ❌ No | Manual local overrides |
| `.env.development` | Development credentials | ❌ No | `npm run dev` |
| `.env.production` | Future production overrides | ❌ No | Future use |

### Current Configuration

**`.env`** (Production - Lovable AI)
```bash
VITE_SUPABASE_PROJECT_ID="xfwlneedhqealtktaacv"
VITE_SUPABASE_URL="https://xfwlneedhqealtktaacv.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGci..."
```

**`.env.development`** (Development - Claude Code)
```bash
VITE_SUPABASE_PROJECT_ID="vznhbocnuykdmjvujaka"
VITE_SUPABASE_URL="https://vznhbocnuykdmjvujaka.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGci..."
```

---

## 🚀 How It Works

### Vite Environment Loading

Vite automatically loads environment files based on the mode:

```javascript
// vite.config.ts already configured
export default defineConfig(({ mode }) => ({
  // mode = "development" when running `npm run dev`
  // mode = "production" when running `npm run build`
}));
```

**Loading Priority (higher = wins):**
1. `.env.[mode].local` (highest priority, git-ignored)
2. `.env.[mode]` (mode-specific: `.env.development` or `.env.production`)
3. `.env.local` (git-ignored)
4. `.env` (lowest priority, committed)

### Development Mode (`npm run dev`)

```bash
npm run dev
# Loads: .env.development
# Connects to: vana-dev (vznhbocnuykdmjvujaka)
# Safe for: Local testing, schema changes, data experiments
```

### Lovable AI Builds

```bash
# Lovable Cloud runs: npm run build
# Loads: .env (production)
# Connects to: Production Supabase (xfwlneedhqealtktaacv)
# Used for: Preview deployments & production
```

---

## 🛠️ Database Setup

### vana-dev (Development Database)

**Schema Status:** ✅ Fully Synchronized with Production

**Tables:**
- `chat_sessions` - User chat sessions with RLS
- `chat_messages` - Messages in sessions with RLS
- `user_preferences` - User settings with RLS

**Features:**
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Proper indexes for performance
- ✅ Foreign key constraints
- ✅ Automatic `updated_at` triggers
- ✅ All migrations applied

**Access:**
- Direct via MCP server tools
- Frontend via `.env.development`

### Production (Lovable Cloud Database)

**Schema Status:** ✅ Production-ready

**Access:**
- Frontend via `.env`
- Lovable AI deployments
- DO NOT access from local dev

---

## 📋 Development Workflows

### Workflow 1: Frontend-Only Changes (Claude Code)

**When:** UI changes, component updates, styling

```bash
# 1. Start local dev server
npm run dev  # Connects to vana-dev automatically

# 2. Make frontend changes in VS Code with Claude Code

# 3. Test locally at http://localhost:8080

# 4. Commit and push to feature branch

# 5. Test in Lovable preview (free!)

# 6. Merge to main when ready
```

**Environment:** vana-dev (dev database, safe to test)

---

### Workflow 2: Database Changes (Claude Code + MCP)

**When:** Schema changes, new tables, migrations

```bash
# 1. Use MCP tools to make schema changes
mcp__supabase__apply_migration
# Creates migration in vana-dev

# 2. Test migration locally
mcp__supabase__get_advisors (type: "security")
mcp__supabase__get_advisors (type: "performance")

# 3. Test with local frontend
npm run dev  # Connects to vana-dev with new schema

# 4. When confident, apply same migration to production
# Option A: Use Lovable AI (ask it to apply migration)
# Option B: Use Supabase Dashboard directly
# Option C: Use supabase CLI (if configured)

# 5. Commit code changes (not migration files)
git add src/
git commit -m "feat: add new feature with database changes"
```

**Environment:** vana-dev first, then production after testing

---

### Workflow 3: Full-Stack Features (Hybrid)

**When:** New feature needs both frontend + backend

**Backend-First Approach:**

```bash
# STEP 1: Database Design (Claude Code + MCP)
# - Design schema in vana-dev
# - Create migrations with MCP tools
# - Test with mcp__supabase__execute_sql

# STEP 2: Local Frontend Development (Claude Code)
npm run dev  # Test with vana-dev
# - Build UI components
# - Connect to vana-dev backend
# - Test end-to-end locally

# STEP 3: Apply to Production Database
# - Use Lovable AI to apply same migration
# - Or use Supabase Dashboard

# STEP 4: Deploy Frontend
# - Push to feature branch
# - Test in Lovable preview
# - Merge to main
```

**Frontend-First Approach:**

```bash
# STEP 1: Build UI with Mocks (Claude Code)
npm run dev
# - Create components with mock data
# - Test UX and interactions

# STEP 2: Add Backend (Lovable AI or MCP)
# - Create database tables
# - Connect real data

# STEP 3: Integration Testing
# - Local: npm run dev (vana-dev)
# - Preview: Lovable preview (production)
```

---

### Workflow 4: Lovable AI Only

**When:** Using Lovable AI for rapid backend development

```bash
# 1. Set Lovable working branch to your feature branch
# Lovable Dashboard → Settings → Working Branch → feature/your-branch

# 2. Ask Lovable AI to create backend features
# - It will use production Supabase (xfwlneedhqealtktaacv)
# - Changes applied directly to production database

# 3. Pull changes locally
git pull

# 4. Test with preview deployment (automatic)
# - Preview URL uses production database
# - Safe because it's on feature branch

# 5. Merge to main when ready
```

**Environment:** Production (but on feature branch preview)

---

## 🧪 Testing Strategy

### Local Testing (Free, Fast, Safe)

```bash
# Development environment (vana-dev)
npm run dev
# → http://localhost:8080
# → Connects to vana-dev
# → Test everything locally first
```

**Advantages:**
- ✅ FREE - No Lovable credits used
- ✅ FAST - Instant hot reload
- ✅ SAFE - No production impact
- ✅ DEBUGGING - Full browser DevTools access

---

### Preview Testing (Free, Production-Like)

```bash
# 1. Push to feature branch
git push origin feature/your-feature

# 2. Wait 30-60 seconds for Lovable preview deployment

# 3. Test at preview URL
# → https://feature-your-feature--project.lovable.app
# → Connects to PRODUCTION database (on feature branch)
```

**Advantages:**
- ✅ FREE - No cost for preview deployments
- ✅ REALISTIC - Same as production environment
- ✅ SHAREABLE - Give URL to others for testing

**⚠️ Important:** Preview uses production database. Be careful with:
- Creating test data (might need cleanup)
- Testing destructive operations
- Sharing preview URLs (may contain real user data)

---

### Production Testing

```bash
# After merging to main
# 1. Switch Lovable working branch to main
# 2. Click "Publish" in Lovable Dashboard (costs credits)
# 3. Test at www.vana.bot
```

---

## 🔒 Security Considerations

### Environment File Security

**Git-Tracked Files:**
- `.env` - Contains production credentials (safe to commit, public anon key only)

**Git-Ignored Files:**
- `.env.local` - Personal overrides (NEVER commit)
- `.env.development` - Dev credentials (NEVER commit)
- `.env.production` - Future overrides (NEVER commit)

**.gitignore Configuration:**
```gitignore
# Environment files
*.local
.env.development
.env.production
```

### Database Security

**vana-dev (Development):**
- ✅ Row Level Security (RLS) enabled
- ✅ Separate from production
- ✅ Safe for testing
- ⚠️ Can be reset/wiped if needed

**Production:**
- ✅ Row Level Security (RLS) enabled
- ✅ Protected by Lovable Cloud
- ⚠️ Only modify via tested migrations
- 🚨 Never test destructive operations here

---

## 🔧 Troubleshooting

### Issue: Local dev connects to wrong database

**Check:**
```bash
# Verify .env.development exists
ls -la .env.development

# Check which env file is being used
npm run dev
# Look for Supabase URL in console/network tab
```

**Fix:**
```bash
# Create .env.development if missing
cp .env.development.example .env.development
# Or create manually with vana-dev credentials
```

---

### Issue: MCP tools not working

**Symptoms:** MCP commands timeout or fail

**Fix:**
```bash
# 1. Restart VS Code (MCP connection refresh)
# 2. Check MCP configuration
cat ~/.claude.json | grep supabase
# 3. Verify you're connected to vana-dev
```

---

### Issue: Lovable AI creates tables in wrong database

**Check:**
- Verify `.env` contains production credentials
- Lovable always uses `.env` (not `.env.development`)

**This is CORRECT behavior** - Lovable AI should use production.

---

### Issue: Preview deployment shows errors

**Possible Causes:**
1. Frontend expects schema that's only in vana-dev
2. RLS policies blocking access
3. Migration not applied to production

**Fix:**
```bash
# 1. Apply migrations to production first
# 2. Then push frontend code
# 3. Test preview again
```

---

### Issue: Need to reset vana-dev database

**When:** Database got into bad state, want fresh start

```bash
# Option 1: Use MCP to drop and recreate tables
mcp__supabase__execute_sql
Query: "DROP TABLE IF EXISTS chat_messages CASCADE;"
# Then rerun initial migration

# Option 2: Use Supabase Dashboard
# → Go to vana-dev project
# → Table Editor → Delete tables
# → Rerun migrations
```

---

## 📊 Quick Reference

### Commands

| Command | Environment | Database | Purpose |
|---------|-------------|----------|---------|
| `npm run dev` | Development | vana-dev | Local development |
| `npm run build` | Production | N/A | Build for deployment |
| `npm run preview` | Production | N/A | Test production build |

### Database Access

| Method | Database | Use Case |
|--------|----------|----------|
| Local dev (npm run dev) | vana-dev | Frontend testing |
| MCP tools | vana-dev | Schema changes, queries |
| Lovable AI | Production | Rapid backend development |
| Preview deployment | Production | Integration testing |

### Environment Variables

| Variable | Local Dev | Lovable AI |
|----------|-----------|------------|
| `VITE_SUPABASE_PROJECT_ID` | vznhbocnuykdmjvujaka | xfwlneedhqealtktaacv |
| `VITE_SUPABASE_URL` | https://vznhbocnuykdmjvujaka.supabase.co | https://xfwlneedhqealtktaacv.supabase.co |
| Source | `.env.development` | `.env` |

---

## ✅ Setup Checklist

Before starting development:

- [x] `.env` exists with production credentials
- [x] `.env.development` exists with vana-dev credentials
- [x] `.gitignore` excludes `.env.development`
- [x] vana-dev schema matches production schema
- [x] MCP server connected to vana-dev
- [x] RLS policies enabled on all tables
- [x] Local dev server works (`npm run dev`)
- [x] Can access http://localhost:8080

---

## 🎯 Next Steps

1. **Start Local Development:**
   ```bash
   npm run dev
   # Opens http://localhost:8080
   # Connected to vana-dev automatically
   ```

2. **Make Changes:**
   - Use Claude Code for frontend work
   - Use MCP tools for database work
   - Test everything locally first

3. **Deploy:**
   - Push to feature branch
   - Test in preview (free!)
   - Merge to main when ready

4. **Monitor:**
   - Check Lovable Dashboard for deployments
   - Review Supabase logs if issues arise
   - Use MCP advisors for security/performance checks

---

**Status:** ✅ Dual environment setup complete and operational

**Last Updated:** 2025-10-29

**Questions?** Refer to ACTUAL_WORKFLOW.md and NEXT_AGENT_PROMPT.md for comprehensive guidance.
