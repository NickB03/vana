# Deployment Workflow Guide

## Overview

This project uses a **single repository** with **environment-based deployments**. You don't need separate repos or branches for staging vs production.

```
┌─────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Local Dev           Staging              Production           │
│   ─────────           ───────              ──────────           │
│   .env (local)   →    Cloudflare env   →   Cloudflare env      │
│   localhost:8080      staging.domain       domain.com           │
│   vana-dev*           vana-staging         vana-dev             │
│                                                                 │
│   * or supabase start for full local                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Reference

| Task | Command |
|------|---------|
| Deploy to staging | `./scripts/deploy-simple.sh staging` |
| Deploy to production | `./scripts/deploy-simple.sh prod` |
| Promote staging → prod | Merge PR to main, then deploy prod |

---

## How Environment Variables Work

### Local Development (Your Machine)

Create `.env` file (gitignored, never committed):

```bash
# .env (for local development)
VITE_SUPABASE_URL=https://vznhbocnuykdmjvujaka.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...your-anon-key...
VITE_SUPABASE_PROJECT_ID=vznhbocnuykdmjvujaka
```

### Staging (Cloudflare Pages)

Set in Cloudflare Dashboard → Pages → your-project → Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://tkqubuaqzqjvrcnlipts.supabase.co` | Preview |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJ...staging-anon-key...` | Preview |
| `VITE_SUPABASE_PROJECT_ID` | `tkqubuaqzqjvrcnlipts` | Preview |

### Production (Cloudflare Pages)

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
3. Set environment variables for each environment

**Result**:
- Push to `main` → deploys to production
- Push to any other branch → deploys to staging/preview

### Option B: Manual with `wrangler`

```bash
# Deploy to staging (preview)
npx wrangler pages deploy dist --project-name=vana --branch=staging

# Deploy to production
npx wrangler pages deploy dist --project-name=vana --branch=main
```

---

## Recommended Workflow

### 1. Develop on Feature Branch

```bash
git checkout -b feat/my-feature
# ... make changes ...
npm run dev  # Test locally against vana-dev (or local supabase)
```

### 2. Deploy to Staging for Testing

```bash
# Deploy Edge Functions to staging Supabase
export STAGING_REF=tkqubuaqzqjvrcnlipts
./scripts/deploy-simple.sh staging

# Push branch to trigger Cloudflare preview deployment
git push origin feat/my-feature
# Cloudflare auto-deploys to: feat-my-feature.vana.pages.dev
```

### 3. Test on Staging

- Visit preview URL from Cloudflare
- Test all features against staging Supabase
- Fix issues, push again (auto-redeploys)

### 4. Promote to Production

```bash
# Create PR: feat/my-feature → main
# Get review, merge PR

# Deploy Edge Functions to production
./scripts/deploy-simple.sh prod

# Cloudflare auto-deploys main branch to production
```

---

## Environment Isolation

| Component | Staging | Production |
|-----------|---------|------------|
| Supabase Project | `tkqubuaqzqjvrcnlipts` | `vznhbocnuykdmjvujaka` |
| Database | Separate (staging) | Separate (prod) |
| Edge Functions | Deployed separately | Deployed separately |
| API Keys | Staging keys | Production keys |
| Storage | Separate bucket | Separate bucket |
| Frontend | Preview URL | Production URL |

**Key Point**: Your local `.env` file is NEVER used in deployments. Cloudflare (or Vercel) uses its own environment variables.

---

## FAQ

### Q: Do I need to change my local `.env` to test staging?

**No.** Your local `.env` is for local development only. To test staging:
1. Deploy to staging Supabase: `./scripts/deploy-simple.sh staging`
2. Push branch to trigger Cloudflare preview
3. Visit the preview URL (uses staging Supabase via Cloudflare env vars)

### Q: How do I test staging locally?

Create a separate `.env.staging` file (also gitignored):

```bash
# .env.staging
VITE_SUPABASE_URL=https://tkqubuaqzqjvrcnlipts.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...staging-key...
VITE_SUPABASE_PROJECT_ID=tkqubuaqzqjvrcnlipts
```

Then run:
```bash
# Load staging env and run dev server
cp .env.staging .env && npm run dev
# Remember to restore: cp .env.backup .env
```

### Q: What if I accidentally deploy broken code to production?

1. **Rollback Edge Functions**: Re-deploy from a known-good commit
   ```bash
   git checkout <good-commit>
   ./scripts/deploy-simple.sh prod
   ```

2. **Rollback Frontend**: Cloudflare Pages has automatic rollbacks
   - Dashboard → Deployments → Click on previous deployment → "Rollback"

### Q: Can staging and production share the same database?

**No, and you shouldn't want to.** Staging should have:
- Test data you can freely modify
- Lower rate limits
- Separate API keys
- No risk of affecting real users

---

## Supabase Project References

| Environment | Project | Reference ID |
|-------------|---------|--------------|
| Production | vana-dev | `vznhbocnuykdmjvujaka` |
| Staging | vana-staging | `tkqubuaqzqjvrcnlipts` |

## Cloudflare Environment Variables

Copy these to your Cloudflare Pages settings:

### Production Environment
```
VITE_SUPABASE_URL=https://vznhbocnuykdmjvujaka.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-prod-anon-key>
VITE_SUPABASE_PROJECT_ID=vznhbocnuykdmjvujaka
```

### Preview Environment (Staging)
```
VITE_SUPABASE_URL=https://tkqubuaqzqjvrcnlipts.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-staging-anon-key>
VITE_SUPABASE_PROJECT_ID=tkqubuaqzqjvrcnlipts
```
