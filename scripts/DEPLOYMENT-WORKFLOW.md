# Deployment Workflow Guide

## Overview

This project uses a **two-environment** deployment model:
1. **Local Development** — Local Supabase via `supabase start`
2. **Production** — vana-dev Supabase project + Cloudflare Pages

```
┌─────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Local Dev                              Production             │
│   ─────────                              ──────────             │
│   .env (local)                    →      Cloudflare env         │
│   localhost:8080                         domain.com             │
│   supabase start (local)                 vana-dev               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Reference

| Task | Command |
|------|---------|
| Start local Supabase | `supabase start` |
| Test Edge Functions locally | `supabase functions serve <function-name>` |
| Deploy to production | **PR to `main`** → Auto-deploy via CI/CD |
| View production logs | `supabase functions logs --project-ref vznhbocnuykdmjvujaka` |
| Emergency hotfix | Create `hotfix/*` branch → PR with `[HOTFIX]` prefix |

---

## How Environment Variables Work

### Local Development (Your Machine)

Create `.env` file (gitignored, never committed):

```bash
# .env (for local development)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local-anon-key-from-supabase-start>
VITE_SUPABASE_PROJECT_ID=local
```

Or point to production for testing:

```bash
# .env (pointing to production)
VITE_SUPABASE_URL=https://vznhbocnuykdmjvujaka.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...your-anon-key...
VITE_SUPABASE_PROJECT_ID=vznhbocnuykdmjvujaka
```

### Production (Cloudflare Pages)

Set in Cloudflare Dashboard → Pages → your-project → Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://vznhbocnuykdmjvujaka.supabase.co` | Production |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJ...prod-anon-key...` | Production |
| `VITE_SUPABASE_PROJECT_ID` | `vznhbocnuykdmjvujaka` | Production |

---

## Cloudflare Pages Setup

### Option A: Automatic Deployments (Recommended)

1. Connect repo to Cloudflare Pages
2. Configure build settings:
   - **Production branch**: `main`
   - **Preview branches**: `*` (all other branches)
3. Set environment variables for production

**Result**:
- Push to `main` → deploys to production
- Push to any other branch → deploys to preview (still uses production Supabase)

### Option B: Manual with `wrangler`

```bash
# Deploy to production
npx wrangler pages deploy dist --project-name=vana --branch=main

# Deploy preview for testing
npx wrangler pages deploy dist --project-name=vana --branch=preview
```

---

## Recommended Workflow

### 1. Develop Locally

```bash
# Start local Supabase
supabase start

# Start dev server
npm run dev  # Test locally against local supabase
```

### 2. Test Changes

```bash
# Run tests
npm run test

# Build and verify
npm run build
```

### 3. Deploy to Production

**⚠️ CRITICAL**: ALL production deployments go through PR process.

```bash
# Create feature branch
git checkout -b feat/my-feature

# Make changes and test locally
npm run test
npm run test:integration
npm run build

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feat/my-feature
gh pr create --title "Add new feature" --body "Description of changes"

# Automated CI checks run:
# - Unit tests
# - Integration tests
# - E2E critical tests
# - Build verification

# Get code review from team

# Merge PR → Auto-deploy triggers:
# - Database migrations (if supabase/migrations/** changed)
# - Edge Functions (if supabase/functions/** changed)
# - Frontend (Cloudflare auto-deploys main branch)
```

---

## Environment Isolation

| Component | Local | Production |
|-----------|-------|------------|
| Supabase | `supabase start` | vana-dev (`vznhbocnuykdmjvujaka`) |
| Database | Local PostgreSQL | Production PostgreSQL |
| Edge Functions | Local (via `supabase functions serve`) | Deployed to vana-dev |
| API Keys | Local defaults | Production secrets |
| Frontend | localhost:8080 | Production URL |

**Key Point**: Your local `.env` file is NEVER used in deployments. Cloudflare uses its own environment variables.

---

## FAQ

### Q: How do I test Edge Functions locally?

```bash
# Start local Supabase (includes Edge Functions runtime)
supabase start

# Or serve functions separately with hot reload
supabase functions serve
```

### Q: What if broken code reaches production?

**Frontend Rollback** (Cloudflare Pages):
- Dashboard → Deployments → Click on previous deployment → "Rollback"

**Edge Functions/Database Rollback**:
1. Create hotfix branch from last known good commit:
   ```bash
   git checkout main
   git pull
   git checkout -b hotfix/revert-broken-changes
   git revert <bad-commit>  # Or cherry-pick fixes
   ```

2. Test locally:
   ```bash
   npm run test
   npm run test:integration
   npm run build
   ```

3. Create emergency hotfix PR:
   ```bash
   gh pr create --title "[HOTFIX] Revert broken deployment" \
                --body "Reverts commit <hash> that caused production issue"
   ```

4. Fast-track review → Merge → Auto-deploy

**Note**: Direct production deployments are prohibited. All fixes go through PR process.

### Q: How do I test against production database locally?

Update your `.env` to point to production:

```bash
VITE_SUPABASE_URL=https://vznhbocnuykdmjvujaka.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-prod-anon-key>
VITE_SUPABASE_PROJECT_ID=vznhbocnuykdmjvujaka
```

**Warning**: Be careful with writes — you're affecting real data!

---

## Supabase Project References

| Environment | Project | Reference ID |
|-------------|---------|--------------|
| Local | N/A (supabase start) | N/A |
| Production | vana-dev | `vznhbocnuykdmjvujaka` |

## Cloudflare Environment Variables

Copy these to your Cloudflare Pages settings:

### Production Environment
```
VITE_SUPABASE_URL=https://vznhbocnuykdmjvujaka.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-prod-anon-key>
VITE_SUPABASE_PROJECT_ID=vznhbocnuykdmjvujaka
```
